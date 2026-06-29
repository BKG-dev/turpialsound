import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { URL } from 'node:url'

import { Client } from 'pg'

type AuditVerdict =
  | 'READY_FOR_MIGRATION_DRY_RUN'
  | 'ALREADY_APPLIED_COMPATIBLE'
  | 'BLOCKED_PARTIAL_SCHEMA'
  | 'BLOCKED_INCOMPATIBLE_SCHEMA'
  | 'BLOCKED_MISSING_READONLY_CREDENTIAL'

type ProposalStatus = AuditVerdict

type AuditCheck = {
  label: string
  ok: boolean
  details?: string
}

type TableMetric = {
  tableName: string
  estimatedRows: number | null
  totalBytes: number | null
  columnCount: number | null
}

type EvidenceFile = {
  sprint: 'BKG-08K'
  auditedSha: string
  auditedAt: string
  database: {
    provider: 'neon'
    hostHash: string | null
    postgresVersion: string | null
    transactionReadOnly: boolean
  }
  proposalStatus: {
    bkg04: ProposalStatus
    bkg07: ProposalStatus
    bkg08: ProposalStatus
  }
  schemaChecks: AuditCheck[]
  dataCompatibilityChecks: AuditCheck[]
  tableMetrics: TableMetric[]
  blockers: string[]
  verdict: AuditVerdict
}

type ConnectionSource =
  | {
      name: 'TURPIAL_NEON_READONLY_URL'
      connectionString: string
      hostHash: string
    }
  | {
      name: 'DIRECT_URL'
      connectionString: string
      hostHash: string
    }

type MissingCredential = {
  name: 'TURPIAL_ALLOW_NEON_READONLY_AUDIT' | 'TURPIAL_NEON_READONLY_URL'
  message: string
}

const AUDIT_FILE_PATH = resolve(
  process.cwd(),
  'docs/orchestration/evidence/BKG-08K-neon-compatibility.json',
)
const EXPECTED_REPO_SHA = getAuditedSha()
const ALLOWED_PAYMENT_METHODS = new Set(['pago_movil', 'transferencia', 'binance', 'efectivo'])
const PROPOSAL_SQL_FILES = [
  'prisma/proposed/20260622_bkg04_snapshot_booking_items.sql',
  'prisma/proposed/20260622_bkg07_custom_bundle_holds.sql',
  'prisma/proposed/20260623_bkg08_custom_bundle_payment_reports.sql',
] as const

const REQUIRED_TABLES = [
  'booking_requests',
  'booking_request_items',
  'payment_proofs',
  'audit_log',
  'services',
  'service_variants',
  'resources',
] as const

type ColumnInfo = {
  dataType: string
  udtName: string
  isNullable: boolean
  columnDefault: string | null
  numericPrecision: number | null
  numericScale: number | null
}

function fail(message: string): never {
  console.error('booking_neon_custom_bundle_readonly_audit FAILED')
  console.error(message)
  process.exit(1)
}

function isNeonHost(hostname: string): boolean {
  return (
    hostname === 'neon.tech' ||
    hostname.endsWith('.neon.tech') ||
    hostname === 'neon.dev' ||
    hostname.endsWith('.neon.dev')
  )
}

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1'
}

function hashHostname(hostname: string): string {
  return createHash('sha256').update(hostname).digest('hex')
}

function getEnv(name: string): string | undefined {
  const value = process.env[name]
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function getAuditedSha(): string {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  if (result.status !== 0) {
    return 'unknown'
  }

  return result.stdout.trim()
}

function normalizeSqlDefinition(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim().toLowerCase()
}

function assertNoForbiddenSql(sql: string, label: string): void {
  const forbiddenPatterns: Array<[RegExp, string]> = [
    [/DROP\s+TABLE/i, 'DROP TABLE'],
    [/DROP\s+COLUMN/i, 'DROP COLUMN'],
    [/TRUNCATE/i, 'TRUNCATE'],
    [/^\s*DELETE\s+FROM\b/im, 'DELETE FROM'],
    [/^\s*UPDATE\s+/im, 'UPDATE'],
    [/^\s*INSERT\s+INTO\b/im, 'INSERT INTO'],
    [/call\s*\(/i, 'CALL'],
    [/^\s*DO\b/im, 'DO'],
  ]

  for (const [pattern, forbiddenLabel] of forbiddenPatterns) {
    if (pattern.test(sql)) {
      fail(`${label} contains forbidden content: ${forbiddenLabel}.`)
    }
  }
}

function readSqlFile(pathname: string): string {
  try {
    return readFileSync(pathname, 'utf8')
  } catch {
    fail(`Unable to read SQL file: ${pathname}`)
  }
}

function ensureAuditOptIn(): MissingCredential | null {
  const optIn = getEnv('TURPIAL_ALLOW_NEON_READONLY_AUDIT')
  if (optIn !== 'true') {
    return {
      name: 'TURPIAL_ALLOW_NEON_READONLY_AUDIT',
      message: 'TURPIAL_ALLOW_NEON_READONLY_AUDIT must be true.',
    }
  }

  return null
}

function validateReadonlyUrl(
  rawValue: string,
  sourceName: 'TURPIAL_NEON_READONLY_URL' | 'DIRECT_URL',
): ConnectionSource {
  let url: URL
  try {
    url = new URL(rawValue)
  } catch {
    fail(`${sourceName} is not a valid URL.`)
  }

  if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
    fail(`${sourceName} must use the postgres protocol.`)
  }

  const host = url.hostname.toLowerCase()
  if (isLocalHost(host)) {
    fail(`${sourceName} must not target localhost.`)
  }

  if (host.includes('supabase') || host.includes('vercel')) {
    fail(`${sourceName} must point to Neon, not another platform.`)
  }

  if (!isNeonHost(host)) {
    fail(`${sourceName} must point to a Neon host.`)
  }

  if (url.searchParams.get('sslmode') !== 'require') {
    fail(`${sourceName} must use sslmode=require.`)
  }

  return {
    name: sourceName,
    connectionString: url.toString(),
    hostHash: hashHostname(host),
  }
}

function resolveReadonlyConnection(): MissingCredential | ConnectionSource {
  const optIn = ensureAuditOptIn()
  if (optIn) return optIn

  const readonlyUrl = getEnv('TURPIAL_NEON_READONLY_URL')
  if (readonlyUrl) {
    return validateReadonlyUrl(readonlyUrl, 'TURPIAL_NEON_READONLY_URL')
  }

  const directUrl = getEnv('DIRECT_URL')
  if (directUrl) {
    return validateReadonlyUrl(directUrl, 'DIRECT_URL')
  }

  return {
    name: 'TURPIAL_NEON_READONLY_URL',
    message: 'TURPIAL_NEON_READONLY_URL is required for the read-only Neon audit.',
  }
}

async function queryOne<Row>(
  client: Client,
  sql: string,
  params: readonly unknown[] = [],
): Promise<Row | null> {
  const result = await client.query<Row>(sql, [...params])
  return result.rows[0] ?? null
}

async function fetchTableNames(client: Client): Promise<Set<string>> {
  const result = await client.query<{ table_name: string }>(
    `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
  `,
  )
  return new Set(result.rows.map((row) => row.table_name))
}

async function fetchColumnMap(client: Client, tableName: string): Promise<Map<string, ColumnInfo>> {
  const result = await client.query<{
    column_name: string
    data_type: string
    udt_name: string
    is_nullable: 'YES' | 'NO'
    column_default: string | null
    numeric_precision: number | null
    numeric_scale: number | null
  }>(
    `
    SELECT
      column_name,
      data_type,
      udt_name,
      is_nullable,
      column_default,
      numeric_precision,
      numeric_scale
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
    ORDER BY ordinal_position
  `,
    [tableName],
  )

  const columns = new Map<string, ColumnInfo>()
  for (const row of result.rows) {
    columns.set(row.column_name, {
      dataType: row.data_type,
      udtName: row.udt_name,
      isNullable: row.is_nullable === 'YES',
      columnDefault: row.column_default,
      numericPrecision: row.numeric_precision,
      numericScale: row.numeric_scale,
    })
  }

  return columns
}

async function fetchIndexMap(client: Client, tableName: string): Promise<Map<string, string>> {
  const result = await client.query<{ indexname: string; indexdef: string }>(
    `
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = $1
  `,
    [tableName],
  )

  return new Map(result.rows.map((row) => [row.indexname, row.indexdef]))
}

async function fetchConstraintMap(client: Client, tableName: string): Promise<Map<string, string>> {
  const result = await client.query<{ conname: string; definition: string }>(
    `
    SELECT
      c.conname,
      pg_get_constraintdef(c.oid) AS definition
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = $1
  `,
    [tableName],
  )

  return new Map(result.rows.map((row) => [row.conname, row.definition]))
}

async function fetchEnumLabels(client: Client, enumName: string): Promise<string[]> {
  const result = await client.query<{ label: string }>(
    `
    SELECT e.enumlabel AS label
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = $1
    ORDER BY e.enumsortorder
  `,
    [enumName],
  )
  return result.rows.map((row) => row.label)
}

async function fetchTableMetrics(client: Client, tableName: string): Promise<TableMetric> {
  const result = await queryOne<{
    estimated_rows: number | null
    total_bytes: number | null
    column_count: number | null
  }>(
    client,
    `
    SELECT
      c.reltuples::bigint AS estimated_rows,
      pg_total_relation_size(c.oid)::bigint AS total_bytes,
      (
        SELECT COUNT(*)::int
        FROM information_schema.columns i
        WHERE i.table_schema = 'public'
          AND i.table_name = c.relname
      ) AS column_count
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = $1
  `,
    [tableName],
  )

  return {
    tableName,
    estimatedRows: result?.estimated_rows ?? null,
    totalBytes: result?.total_bytes ?? null,
    columnCount: result?.column_count ?? null,
  }
}

function buildCheck(label: string, ok: boolean, details?: string): AuditCheck {
  return { label, ok, details }
}

function columnMatches(
  columns: Map<string, ColumnInfo>,
  columnName: string,
  expected: Partial<ColumnInfo>,
): boolean {
  const actual = columns.get(columnName)
  if (!actual) return false

  if (expected.dataType && actual.dataType !== expected.dataType) return false
  if (expected.udtName && actual.udtName !== expected.udtName) return false
  if (typeof expected.isNullable === 'boolean' && actual.isNullable !== expected.isNullable) {
    return false
  }
  if (
    Object.prototype.hasOwnProperty.call(expected, 'columnDefault') &&
    normalizeSqlDefinition(actual.columnDefault) !== normalizeSqlDefinition(expected.columnDefault)
  ) {
    return false
  }
  if (
    typeof expected.numericPrecision === 'number' &&
    actual.numericPrecision !== expected.numericPrecision
  ) {
    return false
  }
  if (typeof expected.numericScale === 'number' && actual.numericScale !== expected.numericScale) {
    return false
  }

  return true
}

function evaluateProposalStatus(input: {
  baselinePresent: boolean
  artifacts: Array<{ present: boolean; compatible: boolean }>
}): ProposalStatus {
  if (!input.baselinePresent) {
    return 'BLOCKED_INCOMPATIBLE_SCHEMA'
  }

  if (input.artifacts.some((artifact) => artifact.present && !artifact.compatible)) {
    return 'BLOCKED_INCOMPATIBLE_SCHEMA'
  }

  const presentCount = input.artifacts.filter((artifact) => artifact.present).length
  if (presentCount === 0) return 'READY_FOR_MIGRATION_DRY_RUN'
  if (presentCount < input.artifacts.length) return 'BLOCKED_PARTIAL_SCHEMA'
  return 'ALREADY_APPLIED_COMPATIBLE'
}

function collectProposalBlockers(input: {
  transactionReadOnly: boolean
  baselineBookingRequestsPresent: boolean
  baselineBookingRequestItemsPresent: boolean
  proposalStatus: { bkg04: ProposalStatus; bkg07: ProposalStatus; bkg08: ProposalStatus }
  dataCompatibilityChecks: AuditCheck[]
}): string[] {
  const blockers: string[] = []

  if (!input.transactionReadOnly) {
    blockers.push('TRANSACTION_READ_ONLY_NOT_ENABLED')
  }

  if (!input.baselineBookingRequestsPresent) {
    blockers.push('BASELINE_BOOKING_REQUESTS_MISSING')
  }

  if (!input.baselineBookingRequestItemsPresent) {
    blockers.push('BASELINE_BOOKING_REQUEST_ITEMS_MISSING')
  }

  if (input.proposalStatus.bkg04 === 'BLOCKED_INCOMPATIBLE_SCHEMA') {
    blockers.push('BKG04_INCOMPATIBLE_SCHEMA')
  }
  if (input.proposalStatus.bkg07 === 'BLOCKED_INCOMPATIBLE_SCHEMA') {
    blockers.push('BKG07_INCOMPATIBLE_SCHEMA')
  }
  if (input.proposalStatus.bkg08 === 'BLOCKED_INCOMPATIBLE_SCHEMA') {
    blockers.push('BKG08_INCOMPATIBLE_SCHEMA')
  }

  if (input.proposalStatus.bkg04 === 'BLOCKED_PARTIAL_SCHEMA') {
    blockers.push('BKG04_PARTIAL_SCHEMA')
  }
  if (input.proposalStatus.bkg07 === 'BLOCKED_PARTIAL_SCHEMA') {
    blockers.push('BKG07_PARTIAL_SCHEMA')
  }
  if (input.proposalStatus.bkg08 === 'BLOCKED_PARTIAL_SCHEMA') {
    blockers.push('BKG08_PARTIAL_SCHEMA')
  }

  for (const check of input.dataCompatibilityChecks) {
    if (!check.ok) {
      blockers.push(check.label)
    }
  }

  return blockers
}

async function inspectSchema(client: Client): Promise<{
  proposalStatus: { bkg04: ProposalStatus; bkg07: ProposalStatus; bkg08: ProposalStatus }
  schemaChecks: AuditCheck[]
  dataCompatibilityChecks: AuditCheck[]
  tableMetrics: TableMetric[]
  blockers: string[]
  transactionReadOnly: boolean
  postgresVersion: string
}> {
  const schemaChecks: AuditCheck[] = []
  const dataCompatibilityChecks: AuditCheck[] = []
  const blockers: string[] = []

  await client.query('BEGIN READ ONLY')
  try {
    await client.query(`SET LOCAL statement_timeout = '10s'`)
    await client.query(`SET LOCAL lock_timeout = '2s'`)
    await client.query(`SET LOCAL idle_in_transaction_session_timeout = '30s'`)

    const readOnlyRow = await queryOne<{ transaction_read_only: string }>(
      client,
      'SHOW transaction_read_only',
    )
    const transactionReadOnly = readOnlyRow?.transaction_read_only === 'on'
    schemaChecks.push(buildCheck('transaction_read_only = on', transactionReadOnly))

    const serverVersionRow = await queryOne<{ version: string }>(client, 'SHOW server_version')
    const postgresVersion = serverVersionRow?.version ?? 'unknown'

    const tableNames = await fetchTableNames(client)
    for (const tableName of REQUIRED_TABLES) {
      schemaChecks.push(buildCheck(`table ${tableName} exists`, tableNames.has(tableName)))
    }

    const baselineBookingRequestsPresent = tableNames.has('booking_requests')
    const baselineBookingRequestItemsPresent = tableNames.has('booking_request_items')
    schemaChecks.push(
      buildCheck('baseline booking_requests exists', baselineBookingRequestsPresent),
    )
    schemaChecks.push(
      buildCheck('baseline booking_request_items exists', baselineBookingRequestItemsPresent),
    )

    const bookingRequestColumns = await fetchColumnMap(client, 'booking_requests')
    const bookingRequestItemColumns = await fetchColumnMap(client, 'booking_request_items')
    const paymentProofColumns = await fetchColumnMap(client, 'payment_proofs')
    const auditLogColumns = await fetchColumnMap(client, 'audit_log')
    const serviceColumns = await fetchColumnMap(client, 'services')
    const serviceVariantColumns = await fetchColumnMap(client, 'service_variants')
    const resourceColumns = await fetchColumnMap(client, 'resources')

    const bookingModeLabels = await fetchEnumLabels(client, 'booking_mode')
    const bookingItemKindLabels = await fetchEnumLabels(client, 'booking_item_kind')

    schemaChecks.push(
      buildCheck(
        'enum booking_mode has canonical labels',
        bookingModeLabels.includes('single') && bookingModeLabels.includes('custom_bundle'),
        bookingModeLabels.length > 0 ? bookingModeLabels.join(', ') : 'missing',
      ),
    )
    schemaChecks.push(
      buildCheck(
        'enum booking_item_kind has canonical labels',
        bookingItemKindLabels.includes('service') &&
          bookingItemKindLabels.includes('addon') &&
          bookingItemKindLabels.includes('included'),
        bookingItemKindLabels.length > 0 ? bookingItemKindLabels.join(', ') : 'missing',
      ),
    )

    schemaChecks.push(
      buildCheck(
        'booking_requests.bookingMode uses booking_mode',
        columnMatches(bookingRequestColumns, 'bookingMode', {
          dataType: 'USER-DEFINED',
          udtName: 'booking_mode',
          isNullable: false,
        }),
        bookingRequestColumns.get('bookingMode')?.udtName ?? 'missing',
      ),
    )
    schemaChecks.push(
      buildCheck(
        'booking_requests.pricingSource is nullable text',
        columnMatches(bookingRequestColumns, 'pricingSource', {
          dataType: 'text',
          isNullable: true,
        }),
        JSON.stringify(bookingRequestColumns.get('pricingSource') ?? null),
      ),
    )
    schemaChecks.push(
      buildCheck(
        'booking_request_items.serviceVariantId is nullable',
        columnMatches(bookingRequestItemColumns, 'serviceVariantId', { isNullable: true }),
        JSON.stringify(bookingRequestItemColumns.get('serviceVariantId') ?? null),
      ),
    )
    schemaChecks.push(
      buildCheck(
        'booking_request_items.clientPriceDisplay exists',
        bookingRequestItemColumns.has('clientPriceDisplay'),
        bookingRequestItemColumns.has('clientPriceDisplay') ? 'present' : 'missing',
      ),
    )
    schemaChecks.push(
      buildCheck(
        'payment_proofs.duplicateStatus exists',
        paymentProofColumns.has('duplicateStatus'),
        paymentProofColumns.has('duplicateStatus') ? 'present' : 'missing',
      ),
    )
    schemaChecks.push(
      buildCheck(
        'audit_log.action exists',
        auditLogColumns.has('action'),
        auditLogColumns.has('action') ? 'present' : 'missing',
      ),
    )
    schemaChecks.push(
      buildCheck('services table has id column', serviceColumns.has('id')),
    )
    schemaChecks.push(
      buildCheck('service_variants table has id column', serviceVariantColumns.has('id')),
    )
    schemaChecks.push(buildCheck('resources table has id column', resourceColumns.has('id')))

    const bookingRequestIndexes = await fetchIndexMap(client, 'booking_requests')
    const bookingRequestItemIndexes = await fetchIndexMap(client, 'booking_request_items')
    const bookingRequestConstraints = await fetchConstraintMap(client, 'booking_requests')

    const bkg04Artifacts = [
      {
        present: tableNames.has('booking_requests'),
        compatible:
          columnMatches(bookingRequestColumns, 'bookingMode', {
            dataType: 'USER-DEFINED',
            udtName: 'booking_mode',
            isNullable: false,
          }) && columnMatches(bookingRequestColumns, 'pricingSource', { dataType: 'text', isNullable: true }),
      },
      {
        present: tableNames.has('booking_request_items'),
        compatible:
          bookingRequestItemColumns.has('itemSlug') &&
          bookingRequestItemColumns.has('itemKind') &&
          columnMatches(bookingRequestItemColumns, 'serviceVariantId', { isNullable: true }),
      },
      {
        present: bookingModeLabels.length > 0,
        compatible:
          bookingModeLabels.includes('single') && bookingModeLabels.includes('custom_bundle'),
      },
      {
        present: bookingItemKindLabels.length > 0,
        compatible:
          bookingItemKindLabels.includes('service') &&
          bookingItemKindLabels.includes('addon') &&
          bookingItemKindLabels.includes('included'),
      },
      {
        present: bookingRequestItemIndexes.has('booking_request_items_item_slug_idx'),
        compatible: bookingRequestItemIndexes
          .get('booking_request_items_item_slug_idx')
          ? normalizeSqlDefinition(bookingRequestItemIndexes.get('booking_request_items_item_slug_idx'))
              .includes('itemslug')
          : false,
      },
      {
        present: bookingRequestItemIndexes.has('booking_request_items_booking_request_id_item_slug_key'),
        compatible: bookingRequestItemIndexes
          .get('booking_request_items_booking_request_id_item_slug_key')
          ? normalizeSqlDefinition(
              bookingRequestItemIndexes.get(
                'booking_request_items_booking_request_id_item_slug_key',
              ),
            ).includes('unique')
          : false,
      },
    ]

    const bkg07Artifacts = [
      {
        present: bookingRequestColumns.has('idempotencyKey'),
        compatible: columnMatches(bookingRequestColumns, 'idempotencyKey', {
          dataType: 'text',
          isNullable: true,
        }),
      },
      {
        present: bookingRequestColumns.has('requestFingerprint'),
        compatible: columnMatches(bookingRequestColumns, 'requestFingerprint', {
          dataType: 'text',
          isNullable: true,
        }),
      },
      {
        present: bookingRequestColumns.has('holdAcquiredAt'),
        compatible: columnMatches(bookingRequestColumns, 'holdAcquiredAt', {
          dataType: 'timestamp with time zone',
          isNullable: true,
        }),
      },
      {
        present: bookingRequestColumns.has('holdExpiresAt'),
        compatible: columnMatches(bookingRequestColumns, 'holdExpiresAt', {
          dataType: 'timestamp with time zone',
          isNullable: true,
        }),
      },
      {
        present: bookingRequestIndexes.has('booking_requests_idempotency_key_uniq'),
        compatible: normalizeSqlDefinition(
          bookingRequestIndexes.get('booking_requests_idempotency_key_uniq'),
        ).includes('unique'),
      },
      {
        present: bookingRequestIndexes.has('booking_requests_hold_expires_at_idx'),
        compatible: normalizeSqlDefinition(
          bookingRequestIndexes.get('booking_requests_hold_expires_at_idx'),
        ).includes('holdexpiresat'),
      },
      {
        present: bookingRequestConstraints.has('booking_requests_idempotency_pair_chk'),
        compatible: normalizeSqlDefinition(
          bookingRequestConstraints.get('booking_requests_idempotency_pair_chk'),
        ).includes('check'),
      },
      {
        present: bookingRequestConstraints.has('booking_requests_hold_window_pair_chk'),
        compatible: normalizeSqlDefinition(
          bookingRequestConstraints.get('booking_requests_hold_window_pair_chk'),
        ).includes('check'),
      },
      {
        present: bookingRequestConstraints.has('booking_requests_hold_window_order_chk'),
        compatible: normalizeSqlDefinition(
          bookingRequestConstraints.get('booking_requests_hold_window_order_chk'),
        ).includes('check'),
      },
    ]

    const bkg08Artifacts = [
      {
        present: bookingRequestColumns.has('paymentMethod'),
        compatible: columnMatches(bookingRequestColumns, 'paymentMethod', {
          dataType: 'text',
          isNullable: true,
        }),
      },
      {
        present: bookingRequestColumns.has('paymentReference'),
        compatible: columnMatches(bookingRequestColumns, 'paymentReference', {
          dataType: 'text',
          isNullable: true,
        }),
      },
      {
        present: bookingRequestColumns.has('paymentNormalizedReference'),
        compatible: columnMatches(bookingRequestColumns, 'paymentNormalizedReference', {
          dataType: 'text',
          isNullable: true,
        }),
      },
      {
        present: bookingRequestColumns.has('paymentReportedAt'),
        compatible: columnMatches(bookingRequestColumns, 'paymentReportedAt', {
          dataType: 'timestamp with time zone',
          isNullable: true,
        }),
      },
      {
        present: bookingRequestColumns.has('paymentExpectedTotalUsdSnapshot'),
        compatible: columnMatches(bookingRequestColumns, 'paymentExpectedTotalUsdSnapshot', {
          dataType: 'numeric',
          isNullable: true,
          numericPrecision: 10,
          numericScale: 2,
        }),
      },
      {
        present: bookingRequestColumns.has('paymentReportIdempotencyKey'),
        compatible: columnMatches(bookingRequestColumns, 'paymentReportIdempotencyKey', {
          dataType: 'text',
          isNullable: true,
        }),
      },
      {
        present: bookingRequestColumns.has('paymentReportFingerprint'),
        compatible: columnMatches(bookingRequestColumns, 'paymentReportFingerprint', {
          dataType: 'text',
          isNullable: true,
        }),
      },
      {
        present: bookingRequestIndexes.has('booking_requests_payment_report_idempotency_key_uniq'),
        compatible: normalizeSqlDefinition(
          bookingRequestIndexes.get('booking_requests_payment_report_idempotency_key_uniq'),
        ).includes('unique'),
      },
      {
        present: bookingRequestIndexes.has('booking_requests_payment_reported_at_idx'),
        compatible: normalizeSqlDefinition(
          bookingRequestIndexes.get('booking_requests_payment_reported_at_idx'),
        ).includes('paymentreportedat'),
      },
      {
        present: bookingRequestIndexes.has('booking_requests_payment_normalized_reference_idx'),
        compatible: normalizeSqlDefinition(
          bookingRequestIndexes.get('booking_requests_payment_normalized_reference_idx'),
        ).includes('paymentnormalizedreference'),
      },
      {
        present: bookingRequestConstraints.has('booking_requests_payment_report_all_or_none_chk'),
        compatible: normalizeSqlDefinition(
          bookingRequestConstraints.get('booking_requests_payment_report_all_or_none_chk'),
        ).includes('check'),
      },
      {
        present: bookingRequestConstraints.has('booking_requests_payment_method_chk'),
        compatible: normalizeSqlDefinition(
          bookingRequestConstraints.get('booking_requests_payment_method_chk'),
        ).includes('check'),
      },
      {
        present: bookingRequestConstraints.has('booking_requests_payment_expected_total_chk'),
        compatible: normalizeSqlDefinition(
          bookingRequestConstraints.get('booking_requests_payment_expected_total_chk'),
        ).includes('check'),
      },
    ]

    const proposalStatus = {
      bkg04: evaluateProposalStatus({
        baselinePresent: baselineBookingRequestsPresent && baselineBookingRequestItemsPresent,
        artifacts: bkg04Artifacts,
      }),
      bkg07: evaluateProposalStatus({
        baselinePresent: baselineBookingRequestsPresent,
        artifacts: bkg07Artifacts,
      }),
      bkg08: evaluateProposalStatus({
        baselinePresent: baselineBookingRequestsPresent,
        artifacts: bkg08Artifacts,
      }),
    }

    const tableMetrics = await Promise.all(
      REQUIRED_TABLES.map(async (tableName) => fetchTableMetrics(client, tableName)),
    )

    // Aggregate data-only checks; every query is read-only and returns counts only.
    if (bookingRequestColumns.has('idempotencyKey') && bookingRequestColumns.has('requestFingerprint')) {
      const duplicateIdempotency = await queryOne<{ count: string }>(
        client,
        `
        WITH duplicate_keys AS (
          SELECT "idempotencyKey"
          FROM "booking_requests"
          WHERE "idempotencyKey" IS NOT NULL
          GROUP BY 1
          HAVING COUNT(*) > 1
        )
        SELECT COUNT(*)::text AS count FROM duplicate_keys
      `,
      )
      dataCompatibilityChecks.push(
        buildCheck(
          'duplicate booking idempotency keys',
          Number(duplicateIdempotency?.count ?? 0) === 0,
          duplicateIdempotency?.count ?? '0',
        ),
      )

      const incompleteIdempotency = await queryOne<{ count: string }>(
        client,
        `
        SELECT COUNT(*)::text AS count
        FROM "booking_requests"
        WHERE (
          ("idempotencyKey" IS NULL) <> ("requestFingerprint" IS NULL)
        )
      `,
      )
      dataCompatibilityChecks.push(
        buildCheck(
          'booking idempotency pair completeness',
          Number(incompleteIdempotency?.count ?? 0) === 0,
          incompleteIdempotency?.count ?? '0',
        ),
      )
    }

    if (bookingRequestColumns.has('holdAcquiredAt') && bookingRequestColumns.has('holdExpiresAt')) {
      const holdPairMismatch = await queryOne<{ count: string }>(
        client,
        `
        SELECT COUNT(*)::text AS count
        FROM "booking_requests"
        WHERE (
          ("holdAcquiredAt" IS NULL) <> ("holdExpiresAt" IS NULL)
        )
      `,
      )
      dataCompatibilityChecks.push(
        buildCheck(
          'hold window pair completeness',
          Number(holdPairMismatch?.count ?? 0) === 0,
          holdPairMismatch?.count ?? '0',
        ),
      )

      const holdWindowOrder = await queryOne<{ count: string }>(
        client,
        `
        SELECT COUNT(*)::text AS count
        FROM "booking_requests"
        WHERE "holdAcquiredAt" IS NOT NULL
          AND "holdExpiresAt" IS NOT NULL
          AND "holdExpiresAt" <= "holdAcquiredAt"
      `,
      )
      dataCompatibilityChecks.push(
        buildCheck(
          'hold window ordering',
          Number(holdWindowOrder?.count ?? 0) === 0,
          holdWindowOrder?.count ?? '0',
        ),
      )
    }

    if (
      bookingRequestColumns.has('paymentMethod') &&
      bookingRequestColumns.has('paymentReference') &&
      bookingRequestColumns.has('paymentNormalizedReference') &&
      bookingRequestColumns.has('paymentReportedAt') &&
      bookingRequestColumns.has('paymentExpectedTotalUsdSnapshot') &&
      bookingRequestColumns.has('paymentReportIdempotencyKey') &&
      bookingRequestColumns.has('paymentReportFingerprint')
    ) {
      const allowedPaymentMethodsSql = [...ALLOWED_PAYMENT_METHODS]
        .map((method) => `'${method}'`)
        .join(', ')
      const partialPaymentRows = await queryOne<{ count: string }>(
        client,
        `
        SELECT COUNT(*)::text AS count
        FROM "booking_requests"
        WHERE
          (
            ("paymentMethod" IS NULL) OR
            ("paymentReference" IS NULL) OR
            ("paymentNormalizedReference" IS NULL) OR
            ("paymentReportedAt" IS NULL) OR
            ("paymentExpectedTotalUsdSnapshot" IS NULL) OR
            ("paymentReportIdempotencyKey" IS NULL) OR
            ("paymentReportFingerprint" IS NULL)
          )
          AND NOT (
            ("paymentMethod" IS NULL) AND
            ("paymentReference" IS NULL) AND
            ("paymentNormalizedReference" IS NULL) AND
            ("paymentReportedAt" IS NULL) AND
            ("paymentExpectedTotalUsdSnapshot" IS NULL) AND
            ("paymentReportIdempotencyKey" IS NULL) AND
            ("paymentReportFingerprint" IS NULL)
          )
      `,
      )
      dataCompatibilityChecks.push(
        buildCheck(
          'payment report all-or-none',
          Number(partialPaymentRows?.count ?? 0) === 0,
          partialPaymentRows?.count ?? '0',
        ),
      )

      const invalidPaymentMethods = await queryOne<{ count: string }>(
        client,
        `
        SELECT COUNT(*)::text AS count
        FROM "booking_requests"
        WHERE "paymentMethod" IS NOT NULL
          AND LOWER(TRIM("paymentMethod")) NOT IN (${allowedPaymentMethodsSql})
      `,
      )
      dataCompatibilityChecks.push(
        buildCheck(
          'payment methods are canonical',
          Number(invalidPaymentMethods?.count ?? 0) === 0,
          invalidPaymentMethods?.count ?? '0',
        ),
      )

      const invalidPaymentTotal = await queryOne<{ count: string }>(
        client,
        `
        SELECT COUNT(*)::text AS count
        FROM "booking_requests"
        WHERE "paymentExpectedTotalUsdSnapshot" IS NOT NULL
          AND (
            "paymentExpectedTotalUsdSnapshot" <= 0
            OR ROUND("paymentExpectedTotalUsdSnapshot"::numeric, 2) <> "paymentExpectedTotalUsdSnapshot"
          )
      `,
      )
      dataCompatibilityChecks.push(
        buildCheck(
          'payment total snapshot is positive and scale-safe',
          Number(invalidPaymentTotal?.count ?? 0) === 0,
          invalidPaymentTotal?.count ?? '0',
        ),
      )

      const invalidPaymentWindow = await queryOne<{ count: string }>(
        client,
        `
        SELECT COUNT(*)::text AS count
        FROM "booking_requests"
        WHERE
          "paymentReportedAt" IS NOT NULL
          AND "holdAcquiredAt" IS NOT NULL
          AND "holdExpiresAt" IS NOT NULL
          AND (
            "paymentReportedAt" < "holdAcquiredAt"
            OR "paymentReportedAt" >= "holdExpiresAt"
          )
      `,
      )
      dataCompatibilityChecks.push(
        buildCheck(
          'payment reported within hold window',
          Number(invalidPaymentWindow?.count ?? 0) === 0,
          invalidPaymentWindow?.count ?? '0',
        ),
      )
    }

    if (bookingRequestItemColumns.has('itemSlug')) {
      const duplicateItemSlugs = await queryOne<{ count: string }>(
        client,
        `
        WITH duplicated AS (
          SELECT "bookingRequestId", "itemSlug"
          FROM "booking_request_items"
          WHERE "itemSlug" IS NOT NULL
          GROUP BY 1, 2
          HAVING COUNT(*) > 1
        )
        SELECT COUNT(*)::text AS count
        FROM duplicated
      `,
      )
      dataCompatibilityChecks.push(
        buildCheck(
          'booking_request_items itemSlug uniqueness per booking',
          Number(duplicateItemSlugs?.count ?? 0) === 0,
          duplicateItemSlugs?.count ?? '0',
        ),
      )
    }

    blockers.push(
      ...collectProposalBlockers({
        transactionReadOnly,
        baselineBookingRequestsPresent,
        baselineBookingRequestItemsPresent,
        proposalStatus,
        dataCompatibilityChecks,
      }),
    )

    return {
      proposalStatus,
      schemaChecks,
      dataCompatibilityChecks,
      tableMetrics,
      blockers,
      transactionReadOnly,
      postgresVersion,
    }
  } finally {
    await client.query('ROLLBACK').catch(() => {})
  }
}

function computeVerdict(input: {
  connectionSource: ConnectionSource | null
  proposalStatus: { bkg04: ProposalStatus; bkg07: ProposalStatus; bkg08: ProposalStatus }
  blockers: string[]
}): AuditVerdict {
  if (!input.connectionSource) {
    return 'BLOCKED_MISSING_READONLY_CREDENTIAL'
  }

  const statuses = Object.values(input.proposalStatus)

  if (statuses.some((status) => status === 'BLOCKED_INCOMPATIBLE_SCHEMA')) {
    return 'BLOCKED_INCOMPATIBLE_SCHEMA'
  }

  if (input.blockers.length > 0) {
    return 'BLOCKED_INCOMPATIBLE_SCHEMA'
  }

  if (statuses.some((status) => status === 'BLOCKED_PARTIAL_SCHEMA')) {
    return 'BLOCKED_PARTIAL_SCHEMA'
  }

  if (statuses.every((status) => status === 'ALREADY_APPLIED_COMPATIBLE')) {
    return 'ALREADY_APPLIED_COMPATIBLE'
  }

  if (statuses.every((status) => status === 'READY_FOR_MIGRATION_DRY_RUN')) {
    return 'READY_FOR_MIGRATION_DRY_RUN'
  }

  return 'READY_FOR_MIGRATION_DRY_RUN'
}

function runSelfTest(): void {
  const connectionSource: ConnectionSource = {
    name: 'TURPIAL_NEON_READONLY_URL',
    connectionString: 'postgresql://readonly.example.invalid/turpial_booking_ci?sslmode=require',
    hostHash: 'deadbeef',
  }

  const ready = evaluateProposalStatus({
    baselinePresent: true,
    artifacts: [
      { present: false, compatible: true },
      { present: false, compatible: true },
      { present: false, compatible: true },
    ],
  })
  assert.equal(ready, 'READY_FOR_MIGRATION_DRY_RUN')

  const applied = evaluateProposalStatus({
    baselinePresent: true,
    artifacts: [
      { present: true, compatible: true },
      { present: true, compatible: true },
      { present: true, compatible: true },
    ],
  })
  assert.equal(applied, 'ALREADY_APPLIED_COMPATIBLE')

  const partial = evaluateProposalStatus({
    baselinePresent: true,
    artifacts: [
      { present: true, compatible: true },
      { present: false, compatible: true },
      { present: false, compatible: true },
    ],
  })
  assert.equal(partial, 'BLOCKED_PARTIAL_SCHEMA')

  const baselineMissing = evaluateProposalStatus({
    baselinePresent: false,
    artifacts: [
      { present: false, compatible: true },
      { present: false, compatible: true },
      { present: false, compatible: true },
    ],
  })
  assert.equal(baselineMissing, 'BLOCKED_INCOMPATIBLE_SCHEMA')

  const incompatibleObject = evaluateProposalStatus({
    baselinePresent: true,
    artifacts: [
      { present: true, compatible: false },
      { present: false, compatible: true },
      { present: false, compatible: true },
    ],
  })
  assert.equal(incompatibleObject, 'BLOCKED_INCOMPATIBLE_SCHEMA')

  assert.deepEqual(
    collectProposalBlockers({
      transactionReadOnly: true,
      baselineBookingRequestsPresent: true,
      baselineBookingRequestItemsPresent: true,
      proposalStatus: {
        bkg04: ready,
        bkg07: ready,
        bkg08: ready,
      },
      dataCompatibilityChecks: [],
    }),
    [],
  )

  assert.deepEqual(
    collectProposalBlockers({
      transactionReadOnly: true,
      baselineBookingRequestsPresent: false,
      baselineBookingRequestItemsPresent: true,
      proposalStatus: {
        bkg04: ready,
        bkg07: ready,
        bkg08: ready,
      },
      dataCompatibilityChecks: [],
    }),
    ['BASELINE_BOOKING_REQUESTS_MISSING'],
  )

  assert.deepEqual(
    collectProposalBlockers({
      transactionReadOnly: false,
      baselineBookingRequestsPresent: true,
      baselineBookingRequestItemsPresent: true,
      proposalStatus: {
        bkg04: ready,
        bkg07: ready,
        bkg08: ready,
      },
      dataCompatibilityChecks: [],
    }),
    ['TRANSACTION_READ_ONLY_NOT_ENABLED'],
  )

  assert.equal(
    computeVerdict({
      connectionSource,
      proposalStatus: {
        bkg04: partial,
        bkg07: ready,
        bkg08: ready,
      },
      blockers: [],
    }),
    'BLOCKED_PARTIAL_SCHEMA',
  )

  assert.equal(
    computeVerdict({
      connectionSource,
      proposalStatus: {
        bkg04: ready,
        bkg07: ready,
        bkg08: ready,
      },
      blockers: ['DATA_PAYMENT_TOTAL_INVALID'],
    }),
    'BLOCKED_INCOMPATIBLE_SCHEMA',
  )

  assert.equal(
    computeVerdict({
      connectionSource,
      proposalStatus: {
        bkg04: ready,
        bkg07: ready,
        bkg08: ready,
      },
      blockers: ['TRANSACTION_READ_ONLY_NOT_ENABLED'],
    }),
    'BLOCKED_INCOMPATIBLE_SCHEMA',
  )

  assert.equal(
    computeVerdict({
      connectionSource: null,
      proposalStatus: {
        bkg04: ready,
        bkg07: ready,
        bkg08: ready,
      },
      blockers: [],
    }),
    'BLOCKED_MISSING_READONLY_CREDENTIAL',
  )

  assert.equal(
    computeVerdict({
      connectionSource,
      proposalStatus: {
        bkg04: applied,
        bkg07: applied,
        bkg08: applied,
      },
      blockers: [],
    }),
    'ALREADY_APPLIED_COMPATIBLE',
  )

  assert.equal(
    computeVerdict({
      connectionSource,
      proposalStatus: {
        bkg04: ready,
        bkg07: ready,
        bkg08: ready,
      },
      blockers: [],
    }),
    'READY_FOR_MIGRATION_DRY_RUN',
  )

  console.log('booking_neon_custom_bundle_readonly_audit_self_test OK')
}

function writeEvidence(evidence: EvidenceFile): void {
  mkdirSync(resolve(process.cwd(), 'docs/orchestration/evidence'), { recursive: true })
  writeFileSync(AUDIT_FILE_PATH, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8')
}

function printBlockedResult(blocker: string, verdict: AuditVerdict): void {
  console.log('booking_neon_custom_bundle_readonly_audit BLOCKED')
  console.log(`missing credential: ${blocker}`)
  console.log(`verdict: ${verdict}`)
}

function printSuccessResult(evidence: EvidenceFile): void {
  console.log('booking_neon_custom_bundle_readonly_audit OK')
  console.log(`transaction_read_only: ${evidence.database.transactionReadOnly ? 'verified' : 'missing'}`)
  console.log(`proposal bkg04: ${evidence.proposalStatus.bkg04}`)
  console.log(`proposal bkg07: ${evidence.proposalStatus.bkg07}`)
  console.log(`proposal bkg08: ${evidence.proposalStatus.bkg08}`)
  console.log(`blockers: ${evidence.blockers.length}`)
  console.log(`verdict: ${evidence.verdict}`)
}

async function run(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.includes('--self-test')) {
    runSelfTest()
    return
  }

  const auditedAt = new Date().toISOString()
  for (const relativePath of PROPOSAL_SQL_FILES) {
    const sql = readSqlFile(resolve(process.cwd(), relativePath))
    assertNoForbiddenSql(sql, relativePath)
  }

  const credential = resolveReadonlyConnection()

  if ('message' in credential) {
    const evidence: EvidenceFile = {
      sprint: 'BKG-08K',
      auditedSha: EXPECTED_REPO_SHA,
      auditedAt,
      database: {
        provider: 'neon',
        hostHash: null,
        postgresVersion: null,
        transactionReadOnly: false,
      },
      proposalStatus: {
        bkg04: 'BLOCKED_MISSING_READONLY_CREDENTIAL',
        bkg07: 'BLOCKED_MISSING_READONLY_CREDENTIAL',
        bkg08: 'BLOCKED_MISSING_READONLY_CREDENTIAL',
      },
      schemaChecks: [],
      dataCompatibilityChecks: [],
      tableMetrics: [],
      blockers: [credential.name],
      verdict: 'BLOCKED_MISSING_READONLY_CREDENTIAL',
    }

    writeEvidence(evidence)
    printBlockedResult(credential.name, evidence.verdict)
    return
  }

  const client = new Client({
    connectionString: credential.connectionString,
  })

  try {
    await client.connect()
    const inspection = await inspectSchema(client)
    const evidence: EvidenceFile = {
      sprint: 'BKG-08K',
      auditedSha: EXPECTED_REPO_SHA,
      auditedAt,
      database: {
        provider: 'neon',
        hostHash: credential.hostHash,
        postgresVersion: inspection.postgresVersion,
        transactionReadOnly: inspection.transactionReadOnly,
      },
      proposalStatus: inspection.proposalStatus,
      schemaChecks: inspection.schemaChecks,
      dataCompatibilityChecks: inspection.dataCompatibilityChecks,
      tableMetrics: inspection.tableMetrics,
      blockers: inspection.blockers,
      verdict: computeVerdict({
        connectionSource: credential,
        proposalStatus: inspection.proposalStatus,
        blockers: inspection.blockers,
      }),
    }

    writeEvidence(evidence)
    printSuccessResult(evidence)
  } catch {
    const evidence: EvidenceFile = {
      sprint: 'BKG-08K',
      auditedSha: EXPECTED_REPO_SHA,
      auditedAt,
      database: {
        provider: 'neon',
        hostHash: credential.hostHash,
        postgresVersion: null,
        transactionReadOnly: false,
      },
      proposalStatus: {
        bkg04: 'BLOCKED_INCOMPATIBLE_SCHEMA',
        bkg07: 'BLOCKED_INCOMPATIBLE_SCHEMA',
        bkg08: 'BLOCKED_INCOMPATIBLE_SCHEMA',
      },
      schemaChecks: [],
      dataCompatibilityChecks: [],
      tableMetrics: [],
      blockers: ['READ_ONLY_AUDIT_EXECUTION_FAILED'],
      verdict: 'BLOCKED_INCOMPATIBLE_SCHEMA',
    }

    writeEvidence(evidence)
    console.log('booking_neon_custom_bundle_readonly_audit BLOCKED')
    console.log('READ_ONLY_AUDIT_EXECUTION_FAILED')
    console.log(`verdict: ${evidence.verdict}`)
  } finally {
    await client.end().catch(() => {})
  }
}

void run().catch(() => fail('Unexpected failure while executing the Neon read-only audit.'))
