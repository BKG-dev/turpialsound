import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import { Client } from 'pg'

const EXPECTED_HOSTS = new Set(['127.0.0.1', 'localhost'])
const EXPECTED_PORT = '5432'
const EXPECTED_DATABASE = 'turpial_booking_ci'
const EXPECTED_USER = 'turpial_ci'
const EXPECTED_PASSWORD = 'turpial_ci_only'
const EXPECTED_OPT_IN = 'true'

const ALLOWED_PROPOSED_SQL_PATTERNS = [
  /CREATE\s+TYPE\s+"booking_mode"/i,
  /CREATE\s+TYPE\s+"booking_item_kind"/i,
  /ALTER\s+TABLE\s+"booking_requests"/i,
  /ALTER\s+TABLE\s+"booking_request_items"/i,
  /CREATE\s+INDEX\s+"booking_request_items_item_slug_idx"/i,
  /CREATE\s+UNIQUE\s+INDEX\s+"booking_request_items_booking_request_id_item_slug_key"/i,
]

function fail(message) {
  console.error('booking_isolated_snapshot_schema_gate FAILED')
  console.error(message)
  process.exit(1)
}

function isRemoteIpHost(hostname) {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)
}

function validateConnectionUrl(rawValue) {
  if (typeof rawValue !== 'string' || rawValue.trim().length === 0) {
    fail('TURPIAL_ISOLATED_DATABASE_URL is required.')
  }

  let url
  try {
    url = new URL(rawValue)
  } catch {
    fail('TURPIAL_ISOLATED_DATABASE_URL is not a valid URL.')
  }

  if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
    fail('TURPIAL_ISOLATED_DATABASE_URL must use the postgres protocol.')
  }

  const host = url.hostname.toLowerCase()
  if (host.includes('neon') || host.includes('supabase') || host.includes('vercel')) {
    fail('Remote platform hosts are not allowed for this gate.')
  }

  if (!EXPECTED_HOSTS.has(host)) {
    if (isRemoteIpHost(host)) {
      fail('Remote IP hosts are not allowed for this gate.')
    }

    fail('TURPIAL_ISOLATED_DATABASE_URL must target 127.0.0.1 or localhost.')
  }

  if (url.port !== EXPECTED_PORT) {
    fail('TURPIAL_ISOLATED_DATABASE_URL must use port 5432.')
  }

  if (url.pathname.replace(/^\//, '') !== EXPECTED_DATABASE) {
    fail('TURPIAL_ISOLATED_DATABASE_URL must target the isolated booking database.')
  }

  if (url.username !== EXPECTED_USER) {
    fail('TURPIAL_ISOLATED_DATABASE_URL must use the isolated gate user.')
  }

  if (url.password !== EXPECTED_PASSWORD) {
    fail('TURPIAL_ISOLATED_DATABASE_URL must use the isolated gate password.')
  }

  return url.toString()
}

function ensureAllowedProposedSql(sql) {
  for (const pattern of ALLOWED_PROPOSED_SQL_PATTERNS) {
    if (!pattern.test(sql)) {
      fail(`Proposed SQL is missing the expected pattern: ${pattern}.`)
    }
  }

  const forbiddenPatterns = [
    [/DROP\s+TABLE/i, 'DROP TABLE'],
    [/DROP\s+COLUMN/i, 'DROP COLUMN'],
    [/TRUNCATE/i, 'TRUNCATE'],
    [/^\s*DELETE\s+FROM\b/im, 'DELETE FROM'],
    [/^\s*INSERT\s+INTO\b/im, 'INSERT INTO'],
    [/^\s*UPDATE\s+\S+\s+SET\b/im, 'UPDATE ... SET'],
    [/marketplace/i, 'marketplace'],
    [/\bmp_/i, 'marketplace table prefix'],
    [/neon/i, 'neon'],
    [/supabase/i, 'supabase'],
    [/vercel/i, 'vercel'],
  ]

  for (const [pattern, label] of forbiddenPatterns) {
    if (pattern.test(sql)) {
      fail(`Proposed SQL contains forbidden content: ${label}.`)
    }
  }
}

function readSqlFile(pathname) {
  try {
    return readFileSync(pathname, 'utf8')
  } catch {
    fail(`Unable to read SQL file: ${pathname}`)
  }
}

function assertColumn(columns, tableName, columnName, expectations) {
  const key = `${tableName}.${columnName}`
  const column = columns.get(key)
  assert.ok(column, `Missing column: ${key}`)

  if ('dataType' in expectations) {
    assert.equal(column.data_type, expectations.dataType, `${key} data_type`)
  }

  if ('udtName' in expectations) {
    assert.equal(column.udt_name, expectations.udtName, `${key} udt_name`)
  }

  if ('isNullable' in expectations) {
    assert.equal(column.is_nullable, expectations.isNullable ? 'YES' : 'NO', `${key} is_nullable`)
  }

  if ('defaultIncludes' in expectations) {
    assert.ok(
      String(column.column_default ?? '').includes(expectations.defaultIncludes),
      `${key} default`,
    )
  }
}

async function queryRows(client, text, values = []) {
  const result = await client.query(text, values)
  return result.rows
}

async function main() {
  if (process.env.TURPIAL_ALLOW_ISOLATED_DB_TESTS !== EXPECTED_OPT_IN) {
    fail('TURPIAL_ALLOW_ISOLATED_DB_TESTS must be true.')
  }

  const baselinePath = process.argv[2]
  const proposedPath = process.argv[3]
  if (!baselinePath || !proposedPath) {
    fail(
      'Usage: node scripts/qa/bookings/isolated-snapshot-schema-gate.mjs <baseline.sql> <proposed.sql>',
    )
  }

  const connectionString = validateConnectionUrl(process.env.TURPIAL_ISOLATED_DATABASE_URL)
  const baselineSql = readSqlFile(baselinePath)
  const proposedSql = readSqlFile(proposedPath)

  if (baselineSql.trim().length === 0) {
    fail('Baseline SQL is empty.')
  }

  if (proposedSql.trim().length === 0) {
    fail('Proposed SQL is empty.')
  }

  for (const pattern of [/DROP\s+TABLE/i, /DROP\s+COLUMN/i, /TRUNCATE/i, /^\s*DELETE\s+FROM\b/im]) {
    if (pattern.test(baselineSql)) {
      fail(`Baseline SQL contains forbidden content: ${pattern}.`)
    }
  }

  ensureAllowedProposedSql(proposedSql)

  const client = new Client({
    connectionString,
    ssl: false,
  })

  const ids = {
    serviceId: 'svc_sala_ensayo',
    serviceVariantId: 'svc_var_sala_premium',
    oldRequestId: 'br_old_001',
    oldRequestItemId: 'bri_old_001',
    oldRequestItemNullSlugId: 'bri_old_002',
    customRequestId: 'br_custom_001',
    customRequestDuplicateRequestId: 'br_custom_002',
    foreignKeyFailureRequestId: 'br_fk_001',
  }

  try {
    await client.connect()

    const identityRows = await queryRows(
      client,
      'SELECT current_database() AS database_name, current_user AS user_name',
    )
    assert.equal(identityRows[0].database_name, EXPECTED_DATABASE)
    assert.equal(identityRows[0].user_name, EXPECTED_USER)

    await client.query(baselineSql)

    await client.query(
      `
      INSERT INTO "services" ("id", "slug", "name", "description", "isActive")
      VALUES ($1, $2, $3, $4, $5)
      `,
      [ids.serviceId, 'sala-ensayo', 'Sala de ensayo', 'Servicio base para pruebas', true],
    )

    await client.query(
      `
      INSERT INTO "service_variants" ("id", "slug", "name", "description", "isActive", "serviceId")
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        ids.serviceVariantId,
        'sala-ensayo-premium',
        'Sala Premium',
        'Variante base para pruebas snapshot',
        true,
        ids.serviceId,
      ],
    )

    await client.query(
      `
      INSERT INTO "booking_requests" (
        "id",
        "publicCode",
        "status",
        "priorityLevel",
        "source",
        "requesterName",
        "requesterEmail",
        "requesterPhone",
        "eventTitle",
        "eventDate",
        "eventEndDate",
        "notes",
        "internalNotes",
        "estimatedTotal",
        "currency",
        "calendarEventId",
        "submittedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
      )
      `,
      [
        ids.oldRequestId,
        'BR-OLD-001',
        'draft',
        'normal',
        'web',
        'Legacy Request',
        'legacy@example.com',
        null,
        'Legacy booking',
        '2026-06-22T12:00:00.000Z',
        null,
        null,
        null,
        '120.00',
        'USD',
        null,
        null,
      ],
    )

    await client.query(
      `
      INSERT INTO "booking_request_items" (
        "id",
        "bookingRequestId",
        "serviceVariantId",
        "quantity",
        "notes"
      ) VALUES ($1, $2, $3, $4, $5)
      `,
      [ids.oldRequestItemId, ids.oldRequestId, ids.serviceVariantId, 1, 'legacy item'],
    )

    await client.query(proposedSql)

    const enumRows = await queryRows(
      client,
      `
      SELECT t.typname AS enum_name, e.enumlabel AS enum_label, e.enumsortorder
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE t.typname IN ('booking_mode', 'booking_item_kind')
      ORDER BY t.typname, e.enumsortorder
      `,
    )

    const enumMap = new Map()
    for (const row of enumRows) {
      const current = enumMap.get(row.enum_name) ?? []
      current.push(row.enum_label)
      enumMap.set(row.enum_name, current)
    }
    assert.deepEqual(enumMap.get('booking_mode'), ['single', 'custom_bundle'])
    assert.deepEqual(enumMap.get('booking_item_kind'), ['service', 'addon', 'included'])

    const columnsRows = await queryRows(
      client,
      `
      SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('booking_requests', 'booking_request_items')
        AND column_name IN (
          'bookingMode',
          'pricingSource',
          'serviceVariantId',
          'itemSlug',
          'itemName',
          'itemKind',
          'sessionDurationMinutes',
          'durationMinutes',
          'unitPriceUsdSnapshot',
          'lineTotalUsdSnapshot',
          'clientPriceDisplay'
        )
      `,
    )
    const columns = new Map(columnsRows.map((row) => [`${row.table_name}.${row.column_name}`, row]))

    assertColumn(columns, 'booking_requests', 'bookingMode', {
      dataType: 'USER-DEFINED',
      udtName: 'booking_mode',
      isNullable: false,
      defaultIncludes: 'single',
    })
    assertColumn(columns, 'booking_requests', 'pricingSource', {
      dataType: 'text',
      isNullable: true,
    })
    assertColumn(columns, 'booking_request_items', 'serviceVariantId', {
      isNullable: true,
    })
    assertColumn(columns, 'booking_request_items', 'itemSlug', {
      dataType: 'text',
      isNullable: true,
    })
    assertColumn(columns, 'booking_request_items', 'itemName', {
      dataType: 'text',
      isNullable: true,
    })
    assertColumn(columns, 'booking_request_items', 'itemKind', {
      dataType: 'USER-DEFINED',
      udtName: 'booking_item_kind',
      isNullable: true,
    })
    assertColumn(columns, 'booking_request_items', 'sessionDurationMinutes', {
      dataType: 'integer',
      isNullable: true,
    })
    assertColumn(columns, 'booking_request_items', 'durationMinutes', {
      dataType: 'integer',
      isNullable: true,
    })
    assertColumn(columns, 'booking_request_items', 'unitPriceUsdSnapshot', {
      dataType: 'numeric',
      isNullable: true,
    })
    assertColumn(columns, 'booking_request_items', 'lineTotalUsdSnapshot', {
      dataType: 'numeric',
      isNullable: true,
    })
    assertColumn(columns, 'booking_request_items', 'clientPriceDisplay', {
      dataType: 'text',
      isNullable: true,
    })

    const indexRows = await queryRows(
      client,
      `
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'booking_request_items'
      `,
    )
    const indexMap = new Map(indexRows.map((row) => [row.indexname, row.indexdef]))
    assert.ok(indexMap.has('booking_request_items_item_slug_idx'))
    assert.ok(indexMap.has('booking_request_items_booking_request_id_item_slug_key'))
    assert.match(
      indexMap.get('booking_request_items_item_slug_idx'),
      /ON public\.booking_request_items USING btree \("itemSlug"\)/,
    )
    assert.match(
      indexMap.get('booking_request_items_booking_request_id_item_slug_key'),
      /UNIQUE.*\("bookingRequestId", "itemSlug"\)/,
    )

    const oldRequestRows = await queryRows(
      client,
      `
      SELECT br.id AS request_id, br."bookingMode", br."pricingSource",
             bri.id AS item_id,
             bri."serviceVariantId",
             bri."itemSlug",
             bri."itemName",
             bri."itemKind",
             bri."sessionDurationMinutes",
             bri."durationMinutes",
             bri."unitPriceUsdSnapshot",
             bri."lineTotalUsdSnapshot",
             bri."clientPriceDisplay"
      FROM "booking_requests" br
      JOIN "booking_request_items" bri ON bri."bookingRequestId" = br.id
      WHERE br.id = $1
      ORDER BY bri.createdAt ASC
      `,
      [ids.oldRequestId],
    )

    assert.equal(oldRequestRows.length, 1)
    const legacyRow = oldRequestRows[0]
    assert.equal(legacyRow.bookingMode, 'single')
    assert.equal(legacyRow.pricingSource, null)
    assert.equal(legacyRow.serviceVariantId, ids.serviceVariantId)
    assert.equal(legacyRow.itemSlug, null)
    assert.equal(legacyRow.itemName, null)
    assert.equal(legacyRow.itemKind, null)
    assert.equal(legacyRow.sessionDurationMinutes, null)
    assert.equal(legacyRow.durationMinutes, null)
    assert.equal(legacyRow.unitPriceUsdSnapshot, null)
    assert.equal(legacyRow.lineTotalUsdSnapshot, null)
    assert.equal(legacyRow.clientPriceDisplay, null)

    await client.query(
      `
      INSERT INTO "booking_requests" (
        "id",
        "publicCode",
        "bookingMode",
        "pricingSource",
        "status",
        "priorityLevel",
        "source",
        "requesterName",
        "requesterEmail",
        "requesterPhone",
        "eventTitle",
        "eventDate",
        "eventEndDate",
        "notes",
        "internalNotes",
        "estimatedTotal",
        "currency",
        "calendarEventId",
        "submittedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
      )
      `,
      [
        ids.customRequestId,
        'BR-CUSTOM-001',
        'custom_bundle',
        'server_catalog_v1',
        'draft',
        'normal',
        'web',
        'Custom Bundle',
        'bundle@example.com',
        '+584121234567',
        'Custom bundle snapshot',
        '2026-06-22T12:00:00.000Z',
        null,
        null,
        null,
        '280.00',
        'USD',
        null,
        null,
      ],
    )

    const customBundleItems = [
      {
        id: 'bri_cb_001',
        bookingRequestId: ids.customRequestId,
        serviceVariantId: ids.serviceVariantId,
        itemSlug: 'sala-premium',
        itemName: 'Sala Premium',
        itemKind: 'service',
        quantity: 2,
        sessionDurationMinutes: 120,
        durationMinutes: 120,
        unitPriceUsdSnapshot: '25.00',
        lineTotalUsdSnapshot: '50.00',
        clientPriceDisplay: 'itemized',
      },
      {
        id: 'bri_cb_002',
        bookingRequestId: ids.customRequestId,
        serviceVariantId: null,
        itemSlug: 'combo-percusion',
        itemName: 'Combo de percusion',
        itemKind: 'addon',
        quantity: 1,
        sessionDurationMinutes: 0,
        durationMinutes: 0,
        unitPriceUsdSnapshot: '150.00',
        lineTotalUsdSnapshot: '150.00',
        clientPriceDisplay: 'aggregate_only',
      },
      {
        id: 'bri_cb_003',
        bookingRequestId: ids.customRequestId,
        serviceVariantId: null,
        itemSlug: 'grabaciones-voces',
        itemName: 'Grabaciones de voces',
        itemKind: 'addon',
        quantity: 2,
        sessionDurationMinutes: 0,
        durationMinutes: 0,
        unitPriceUsdSnapshot: '40.00',
        lineTotalUsdSnapshot: '80.00',
        clientPriceDisplay: 'aggregate_only',
      },
      {
        id: 'bri_cb_004',
        bookingRequestId: ids.customRequestId,
        serviceVariantId: null,
        itemSlug: 'tecnico-sonido',
        itemName: 'Tecnico de sonido',
        itemKind: 'included',
        quantity: 1,
        sessionDurationMinutes: 0,
        durationMinutes: 0,
        unitPriceUsdSnapshot: '0.00',
        lineTotalUsdSnapshot: '0.00',
        clientPriceDisplay: 'included',
      },
      {
        id: 'bri_cb_005',
        bookingRequestId: ids.customRequestId,
        serviceVariantId: null,
        itemSlug: 'backline-equipamiento',
        itemName: 'Backline / equipamiento',
        itemKind: 'included',
        quantity: 1,
        sessionDurationMinutes: 0,
        durationMinutes: 0,
        unitPriceUsdSnapshot: '0.00',
        lineTotalUsdSnapshot: '0.00',
        clientPriceDisplay: 'included',
      },
    ]

    for (const item of customBundleItems) {
      await client.query(
        `
        INSERT INTO "booking_request_items" (
          "id",
          "bookingRequestId",
          "serviceVariantId",
          "itemSlug",
          "itemName",
          "itemKind",
          "quantity",
          "sessionDurationMinutes",
          "durationMinutes",
          "unitPriceUsdSnapshot",
          "lineTotalUsdSnapshot",
          "clientPriceDisplay"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
        )
        `,
        [
          item.id,
          item.bookingRequestId,
          item.serviceVariantId,
          item.itemSlug,
          item.itemName,
          item.itemKind,
          item.quantity,
          item.sessionDurationMinutes,
          item.durationMinutes,
          item.unitPriceUsdSnapshot,
          item.lineTotalUsdSnapshot,
          item.clientPriceDisplay,
        ],
      )
    }

    const customBundleRows = await queryRows(
      client,
      `
      SELECT COUNT(*)::int AS item_count,
             SUM("lineTotalUsdSnapshot")::numeric(10,2) AS total_snapshot
      FROM "booking_request_items"
      WHERE "bookingRequestId" = $1
      `,
      [ids.customRequestId],
    )

    assert.equal(customBundleRows[0].item_count, 5)
    assert.equal(String(customBundleRows[0].total_snapshot), '280.00')

    const snapshotRows = await queryRows(
      client,
      `
      SELECT
        "itemSlug",
        "itemKind",
        "serviceVariantId",
        "quantity",
        "durationMinutes",
        "unitPriceUsdSnapshot",
        "lineTotalUsdSnapshot",
        "clientPriceDisplay"
      FROM "booking_request_items"
      WHERE "bookingRequestId" = $1
      ORDER BY "createdAt" ASC
      `,
      [ids.customRequestId],
    )

    const snapshotBySlug = new Map(snapshotRows.map((row) => [row.itemSlug, row]))
    assert.equal(snapshotBySlug.size, 5)
    assert.deepEqual(
      [...snapshotBySlug.keys()],
      [
        'sala-premium',
        'combo-percusion',
        'grabaciones-voces',
        'tecnico-sonido',
        'backline-equipamiento',
      ],
    )
    assert.equal(snapshotBySlug.get('sala-premium').itemKind, 'service')
    assert.equal(snapshotBySlug.get('sala-premium').serviceVariantId, ids.serviceVariantId)
    assert.equal(snapshotBySlug.get('sala-premium').quantity, 2)
    assert.equal(snapshotBySlug.get('sala-premium').durationMinutes, 120)
    assert.equal(String(snapshotBySlug.get('sala-premium').unitPriceUsdSnapshot), '25.00')
    assert.equal(String(snapshotBySlug.get('sala-premium').lineTotalUsdSnapshot), '50.00')
    assert.equal(snapshotBySlug.get('sala-premium').clientPriceDisplay, 'itemized')

    assert.equal(snapshotBySlug.get('combo-percusion').itemKind, 'addon')
    assert.equal(snapshotBySlug.get('combo-percusion').serviceVariantId, null)
    assert.equal(snapshotBySlug.get('combo-percusion').quantity, 1)
    assert.equal(snapshotBySlug.get('combo-percusion').durationMinutes, 0)
    assert.equal(String(snapshotBySlug.get('combo-percusion').unitPriceUsdSnapshot), '150.00')
    assert.equal(String(snapshotBySlug.get('combo-percusion').lineTotalUsdSnapshot), '150.00')
    assert.equal(snapshotBySlug.get('combo-percusion').clientPriceDisplay, 'aggregate_only')

    assert.equal(snapshotBySlug.get('grabaciones-voces').itemKind, 'addon')
    assert.equal(snapshotBySlug.get('grabaciones-voces').serviceVariantId, null)
    assert.equal(snapshotBySlug.get('grabaciones-voces').quantity, 2)
    assert.equal(snapshotBySlug.get('grabaciones-voces').durationMinutes, 0)
    assert.equal(String(snapshotBySlug.get('grabaciones-voces').unitPriceUsdSnapshot), '40.00')
    assert.equal(String(snapshotBySlug.get('grabaciones-voces').lineTotalUsdSnapshot), '80.00')
    assert.equal(snapshotBySlug.get('grabaciones-voces').clientPriceDisplay, 'aggregate_only')

    assert.equal(snapshotBySlug.get('tecnico-sonido').itemKind, 'included')
    assert.equal(snapshotBySlug.get('tecnico-sonido').serviceVariantId, null)
    assert.equal(snapshotBySlug.get('tecnico-sonido').quantity, 1)
    assert.equal(snapshotBySlug.get('tecnico-sonido').durationMinutes, 0)
    assert.equal(String(snapshotBySlug.get('tecnico-sonido').unitPriceUsdSnapshot), '0.00')
    assert.equal(String(snapshotBySlug.get('tecnico-sonido').lineTotalUsdSnapshot), '0.00')
    assert.equal(snapshotBySlug.get('tecnico-sonido').clientPriceDisplay, 'included')

    assert.equal(snapshotBySlug.get('backline-equipamiento').itemKind, 'included')
    assert.equal(snapshotBySlug.get('backline-equipamiento').serviceVariantId, null)
    assert.equal(snapshotBySlug.get('backline-equipamiento').quantity, 1)
    assert.equal(snapshotBySlug.get('backline-equipamiento').durationMinutes, 0)
    assert.equal(String(snapshotBySlug.get('backline-equipamiento').unitPriceUsdSnapshot), '0.00')
    assert.equal(String(snapshotBySlug.get('backline-equipamiento').lineTotalUsdSnapshot), '0.00')
    assert.equal(snapshotBySlug.get('backline-equipamiento').clientPriceDisplay, 'included')

    await client.query(
      `
      INSERT INTO "booking_requests" (
        "id",
        "publicCode",
        "bookingMode",
        "pricingSource",
        "status",
        "priorityLevel",
        "source",
        "requesterName",
        "requesterEmail",
        "requesterPhone",
        "eventTitle",
        "eventDate",
        "eventEndDate",
        "notes",
        "internalNotes",
        "estimatedTotal",
        "currency",
        "calendarEventId",
        "submittedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
      )
      `,
      [
        ids.customRequestDuplicateRequestId,
        'BR-CUSTOM-002',
        'custom_bundle',
        'server_catalog_v1',
        'draft',
        'normal',
        'web',
        'Custom Bundle 2',
        'bundle2@example.com',
        '+584121234567',
        'Custom bundle snapshot 2',
        '2026-06-22T12:00:00.000Z',
        null,
        null,
        null,
        '280.00',
        'USD',
        null,
        null,
      ],
    )

    await client.query(
      `
      INSERT INTO "booking_request_items" (
        "id",
        "bookingRequestId",
        "serviceVariantId",
        "itemSlug",
        "itemName",
        "itemKind",
        "quantity",
        "sessionDurationMinutes",
        "durationMinutes",
        "unitPriceUsdSnapshot",
        "lineTotalUsdSnapshot",
        "clientPriceDisplay"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
      )
      `,
      [
        'bri_cb_006',
        ids.customRequestDuplicateRequestId,
        ids.serviceVariantId,
        'sala-premium',
        'Sala Premium',
        'service',
        1,
        60,
        60,
        '25.00',
        '25.00',
        'itemized',
      ],
    )

    await client.query(
      `
      INSERT INTO "booking_request_items" (
        "id",
        "bookingRequestId",
        "serviceVariantId",
        "itemSlug",
        "itemName",
        "itemKind",
        "quantity",
        "sessionDurationMinutes",
        "durationMinutes",
        "unitPriceUsdSnapshot",
        "lineTotalUsdSnapshot",
        "clientPriceDisplay"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
      )
      `,
      [
        ids.oldRequestItemNullSlugId,
        ids.oldRequestId,
        ids.serviceVariantId,
        null,
        'Legacy duplicate allowed',
        'service',
        1,
        null,
        null,
        null,
        null,
        null,
      ],
    )

    const duplicateSlugAllowedRows = await queryRows(
      client,
      `
      SELECT COUNT(*)::int AS item_count
      FROM "booking_request_items"
      WHERE "bookingRequestId" = $1
        AND "itemSlug" IS NULL
      `,
      [ids.oldRequestId],
    )
    assert.equal(duplicateSlugAllowedRows[0].item_count, 2)

    let duplicateSlugFailed = false
    try {
      await client.query(
        `
        INSERT INTO "booking_request_items" (
          "id",
          "bookingRequestId",
          "serviceVariantId",
          "itemSlug",
          "itemName",
          "itemKind",
          "quantity",
          "sessionDurationMinutes",
          "durationMinutes",
          "unitPriceUsdSnapshot",
          "lineTotalUsdSnapshot",
          "clientPriceDisplay"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
        )
        `,
        [
          'bri_cb_007',
          ids.customRequestId,
          null,
          'sala-premium',
          'Sala Premium duplicate',
          'service',
          1,
          60,
          60,
          '25.00',
          '25.00',
          'itemized',
        ],
      )
    } catch (error) {
      duplicateSlugFailed = true
      assert.ok(error instanceof Error)
    }
    assert.equal(duplicateSlugFailed, true)

    const duplicateSlugAllowedRequestRows = await queryRows(
      client,
      `
      SELECT COUNT(*)::int AS item_count
      FROM "booking_request_items"
      WHERE "bookingRequestId" = $1
        AND "itemSlug" = 'sala-premium'
      `,
      [ids.customRequestDuplicateRequestId],
    )
    assert.equal(duplicateSlugAllowedRequestRows[0].item_count, 1)

    const duplicateSlugAcrossRequestsRows = await queryRows(
      client,
      `
      SELECT COUNT(DISTINCT "bookingRequestId")::int AS request_count
      FROM "booking_request_items"
      WHERE "itemSlug" = 'sala-premium'
      `,
    )
    assert.equal(duplicateSlugAcrossRequestsRows[0].request_count, 2)

    let foreignKeyFailed = false
    try {
      await client.query(
        `
        INSERT INTO "booking_request_items" (
          "id",
          "bookingRequestId",
          "serviceVariantId",
          "itemSlug",
          "itemName",
          "itemKind",
          "quantity",
          "sessionDurationMinutes",
          "durationMinutes",
          "unitPriceUsdSnapshot",
          "lineTotalUsdSnapshot",
          "clientPriceDisplay"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
        )
        `,
        [
          'bri_fk_fail',
          ids.customRequestId,
          'missing-service-variant',
          'unknown-item',
          'Foreign key failure',
          'service',
          1,
          60,
          60,
          '10.00',
          '10.00',
          'itemized',
        ],
      )
    } catch (error) {
      foreignKeyFailed = true
      assert.ok(error instanceof Error)
    }
    assert.equal(foreignKeyFailed, true)

    const marketplaceBeforeCleanup = await queryRows(
      client,
      `
      SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name LIKE 'mp_%'
      ORDER BY table_name, ordinal_position
      `,
    )

    await client.query(
      `
      DELETE FROM "booking_request_items"
      WHERE "bookingRequestId" IN ($1, $2, $3, $4)
      `,
      [
        ids.oldRequestId,
        ids.customRequestId,
        ids.customRequestDuplicateRequestId,
        ids.foreignKeyFailureRequestId,
      ],
    )
    await client.query(
      `
      DELETE FROM "booking_requests"
      WHERE id IN ($1, $2, $3, $4)
      `,
      [
        ids.oldRequestId,
        ids.customRequestId,
        ids.customRequestDuplicateRequestId,
        ids.foreignKeyFailureRequestId,
      ],
    )
    await client.query(
      `
      DELETE FROM "service_variants"
      WHERE id IN ($1)
      `,
      [ids.serviceVariantId],
    )
    await client.query(
      `
      DELETE FROM "services"
      WHERE id IN ($1)
      `,
      [ids.serviceId],
    )

    const cleanupCounts = await queryRows(
      client,
      `
      SELECT
        (SELECT COUNT(*)::int FROM "booking_request_items" WHERE id IN ($1, $2, $3, $4, $5, $6, $7, $8)) AS items,
        (SELECT COUNT(*)::int FROM "booking_requests" WHERE id IN ($9, $10, $11, $12)) AS requests,
        (SELECT COUNT(*)::int FROM "service_variants" WHERE id = $13) AS variants,
        (SELECT COUNT(*)::int FROM "services" WHERE id = $14) AS services
      `,
      [
        ids.oldRequestItemId,
        ids.oldRequestItemNullSlugId,
        'bri_cb_001',
        'bri_cb_002',
        'bri_cb_003',
        'bri_cb_004',
        'bri_cb_005',
        'bri_cb_006',
        ids.oldRequestId,
        ids.customRequestId,
        ids.customRequestDuplicateRequestId,
        ids.foreignKeyFailureRequestId,
        ids.serviceVariantId,
        ids.serviceId,
      ],
    )

    assert.equal(cleanupCounts[0].items, 0)
    assert.equal(cleanupCounts[0].requests, 0)
    assert.equal(cleanupCounts[0].variants, 0)
    assert.equal(cleanupCounts[0].services, 0)

    const marketplaceAfterCleanup = await queryRows(
      client,
      `
      SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name LIKE 'mp_%'
      ORDER BY table_name, ordinal_position
      `,
    )

    assert.deepEqual(marketplaceAfterCleanup, marketplaceBeforeCleanup)

    console.log('booking_isolated_snapshot_schema_gate OK')
    console.log('legacy compatibility: verified')
    console.log('snapshot items: verified')
    console.log('unique slug: verified')
    console.log('foreign key: verified')
    console.log('cleanup: verified')
  } catch (error) {
    console.error('booking_isolated_snapshot_schema_gate FAILED')
    if (error instanceof Error) {
      console.error(error.message)
    } else {
      console.error(error)
    }
    process.exitCode = 1
  } finally {
    await client.end().catch(() => {})
  }
}

await main()
