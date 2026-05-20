import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import { getDb } from '@/lib/marketplace/db'

export type RateMode = 'live' | 'stale' | 'fallback' | 'unavailable'

export interface RateProviderAttempt {
  name: string
  status: 'ok' | 'error' | 'skipped'
  rate?: number
  asOf?: string
  error?: string
}

export interface ReferenceRateResult {
  rate: number | null // null cuando mode === 'unavailable' (sin tasa válida disponible)
  mode: RateMode
  source: string
  asOf: string
  fechaValor: string
  snapshotId: string | null
  providersTried: RateProviderAttempt[]
}

interface ProviderConfig {
  name: string
  url: string
  path: string
  format: 'json' | 'csv'
  asOfPath?: string
}

interface PersistedRate {
  rate: number
  source: string
  asOf: string
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DEFAULT_DELTA_PCT = 0.005
const DEFAULT_MAX_JUMP_PCT = 0.05
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DEFAULT_STORAGE_FILE = path.join(process.cwd(), '.cache', 'reference-rate.json')
const DEFAULT_TIMEOUT_MS = 4000
const DEFAULT_GOOGLE_SHEETS_BCV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQhM4CaccFvhOqWRfmRj3Cx_0B_oxwq45OT0YnJs6PGKpf60vcPMwshac6Wvk0hzhxPH_nZt4ILSt_i/pub?gid=0&single=true&output=csv'

let inMemoryLastValidRate: PersistedRate | null = null

function parseEnvNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function normalizeStorageMode(value: string | undefined): 'memory' | 'file' {
  return value?.toLowerCase() === 'file' ? 'file' : 'memory'
}

function buildProvidersFromEnv(): ProviderConfig[] {
  const providers: ProviderConfig[] = []

  // Slots A, B, C — JSON providers via RATE_A_URL/RATE_A_PATH etc.
  const providerSlots = ['A', 'B', 'C'] as const
  for (const slot of providerSlots) {
    const name = process.env[`RATE_${slot}_NAME`]?.trim()
    const url = process.env[`RATE_${slot}_URL`]?.trim()
    const jsonPath = process.env[`RATE_${slot}_PATH`]?.trim()
    const asOfPath = process.env[`RATE_${slot}_AS_OF_PATH`]?.trim()

    if (!name || !url || !jsonPath) {
      providers.push({
        name: name || `Provider ${slot}`,
        url: url || '',
        path: jsonPath || '',
        format: 'json',
      })
      continue
    }

    providers.push({ name, url, path: jsonPath, format: 'json', asOfPath: asOfPath || undefined })
  }

  // Google Sheets CSV provider — same URL used by booking & binance-rate
  const googleSheetsUrl =
    process.env.RATE_GOOGLE_SHEETS_CSV_URL?.trim() ||
    process.env.MP_RATES_GOOGLE_SHEETS_CSV_URL?.trim() ||
    process.env.MARKETPLACE_RATES_GOOGLE_SHEETS_CSV_URL?.trim() ||
    process.env.RATE_SHEET_CSV_URL?.trim() ||
    DEFAULT_GOOGLE_SHEETS_BCV_URL

  providers.push({
    name: 'GoogleSheets-BCV',
    url: googleSheetsUrl,
    path: '',
    format: 'csv',
  })

  return providers
}

function parseNumberishRate(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : null
  }

  if (typeof value !== 'string') {
    return null
  }

  const compact = value.trim()
  if (!compact) return null

  const cleaned = compact.replace(/[^0-9,.-]/g, '')
  if (!cleaned) return null

  const lastComma = cleaned.lastIndexOf(',')
  const lastDot = cleaned.lastIndexOf('.')

  let normalized = cleaned
  if (lastComma >= 0 && lastDot >= 0) {
    if (lastComma > lastDot) {
      normalized = cleaned.replace(/\./g, '').replace(',', '.')
    } else {
      normalized = cleaned.replace(/,/g, '')
    }
  } else if (lastComma >= 0) {
    normalized = cleaned.replace(',', '.')
  }

  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function parseCaracasDateToIso(value: string): string | null {
  const normalized = value.trim()
  const match = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/)
  if (!match) return null
  const [, dd, mm, yyyy, hh, min, sec] = match
  const isoWithOffset = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T${hh.padStart(2, '0')}:${min}:${sec}-04:00`
  const parsed = new Date(isoWithOffset)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else { inQuotes = !inQuotes }
      continue
    }
    if (char === ',' && !inQuotes) { fields.push(current); current = ''; continue }
    current += char
  }
  fields.push(current)
  return fields
}

function parseLatestCsvRate(csvText: string): { rate: number; asOf: string } | null {
  const rows = csvText.split(/\r?\n/).map((r) => r.trim()).filter((r) => r.length > 0)
  if (rows.length < 2) return null
  let latest: { rate: number; asOf: string } | null = null
  for (let i = 1; i < rows.length; i++) {
    const fields = parseCsvLine(rows[i])
    if (fields.length < 2) continue
    const dateRaw = fields[0]?.trim() ?? ''
    const bcvRaw = fields[1]?.trim() ?? ''
    const asOf = parseCaracasDateToIso(dateRaw)
    const rate = parseNumberishRate(bcvRaw)
    if (!asOf || !rate) continue
    if (!latest || new Date(asOf).getTime() > new Date(latest.asOf).getTime()) {
      latest = { rate, asOf }
    }
  }
  return latest
}

function getByPath(payload: unknown, dotPath: string): unknown {
  const normalizedPath = dotPath.replace(/\[(\d+)\]/g, '.$1')
  const segments = normalizedPath
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean)

  let cursor: unknown = payload
  for (const segment of segments) {
    if (cursor === null || cursor === undefined) {
      return undefined
    }

    if (typeof cursor !== 'object') {
      return undefined
    }

    const nextCursor = (cursor as Record<string, unknown>)[segment]
    cursor = nextCursor
  }

  return cursor
}

function relativeDifference(a: number, b: number): number {
  const baseline = (Math.abs(a) + Math.abs(b)) / 2
  if (baseline === 0) return 0
  return Math.abs(a - b) / baseline
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middleIndex = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) {
    return sorted[middleIndex]
  }
  return (sorted[middleIndex - 1] + sorted[middleIndex]) / 2
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function findConsensus(
  attempts: Array<{ name: string; rate: number }>,
  tolerancePct: number,
): { rate: number; sources: string[] } | null {
  if (attempts.length < 2) {
    return null
  }

  let bestGroup: Array<{ name: string; rate: number }> = []

  for (const candidate of attempts) {
    const group = attempts.filter(
      (probe) => relativeDifference(candidate.rate, probe.rate) <= tolerancePct,
    )

    if (group.length > bestGroup.length) {
      bestGroup = group
      continue
    }

    if (group.length === bestGroup.length && group.length > 0) {
      const groupSpread = Math.max(...group.map((item) => item.rate)) - Math.min(...group.map((item) => item.rate))
      const bestSpread =
        Math.max(...bestGroup.map((item) => item.rate)) - Math.min(...bestGroup.map((item) => item.rate))
      if (groupSpread < bestSpread) {
        bestGroup = group
      }
    }
  }

  if (bestGroup.length < 2) {
    return null
  }

  return {
    rate: median(bestGroup.map((item) => item.rate)),
    sources: bestGroup.map((item) => item.name),
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function readPersistedRate(storageMode: 'memory' | 'file', storageFile: string): Promise<PersistedRate | null> {
  if (inMemoryLastValidRate) {
    return inMemoryLastValidRate
  }

  if (storageMode !== 'file') {
    return null
  }

  try {
    const raw = await readFile(storageFile, 'utf-8')
    const parsed = JSON.parse(raw) as PersistedRate
    if (!Number.isFinite(parsed.rate) || parsed.rate <= 0 || !parsed.source || !parsed.asOf) {
      return null
    }
    inMemoryLastValidRate = parsed
    return parsed
  } catch {
    return null
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function writePersistedRate(
  storageMode: 'memory' | 'file',
  storageFile: string,
  payload: PersistedRate,
): Promise<void> {
  inMemoryLastValidRate = payload

  if (storageMode !== 'file') {
    return
  }

  await mkdir(path.dirname(storageFile), { recursive: true })
  await writeFile(storageFile, JSON.stringify(payload, null, 2), 'utf-8')
}

async function fetchCsvProviderRate(provider: ProviderConfig): Promise<RateProviderAttempt> {
  if (!provider.url) {
    return { name: provider.name, status: 'skipped', error: 'missing_url' }
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

    const response = await fetch(provider.url, {
      method: 'GET',
      headers: { Accept: 'text/csv,text/plain;q=0.9,*/*;q=0.8' },
      cache: 'no-store',
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      throw new Error(`http_${response.status}`)
    }

    const csvText = await response.text()
    const latestRow = parseLatestCsvRate(csvText)
    if (!latestRow) {
      throw new Error('invalid_csv_payload')
    }

    return {
      name: provider.name,
      status: 'ok',
      rate: latestRow.rate,
      asOf: latestRow.asOf,
    }
  } catch (error) {
    return {
      name: provider.name,
      status: 'error',
      error: (error as Error).message,
    }
  }
}

async function fetchProviderRate(
  provider: ProviderConfig,
  adminApiToken: string | null,
): Promise<RateProviderAttempt> {
  if (provider.format === 'csv') {
    return fetchCsvProviderRate(provider)
  }

  if (!provider.url || !provider.path) {
    return {
      name: provider.name,
      status: 'skipped',
      error: 'missing_url_or_path',
    }
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

    const headers: Record<string, string> = {
      Accept: 'application/json',
    }

    if (adminApiToken) {
      headers.Authorization = `Bearer ${adminApiToken}`
      headers['x-api-key'] = adminApiToken
    }

    const response = await fetch(provider.url, {
      method: 'GET',
      headers,
      cache: 'no-store',
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      throw new Error(`http_${response.status}`)
    }

    const payload = (await response.json()) as unknown
    const rawRate = getByPath(payload, provider.path)
    const parsedRate = parseNumberishRate(rawRate)

    if (parsedRate === null) {
      throw new Error('invalid_rate_value')
    }

    // Extraer asOf: configurado vía RATE_X_AS_OF_PATH, o buscar campos comunes
    let asOf: string | undefined
    const asOfPath = provider.asOfPath || 'fechaActualizacion'
    const rawAsOf = getByPath(payload, asOfPath)
    if (typeof rawAsOf === 'string') {
      const d = new Date(rawAsOf)
      if (!Number.isNaN(d.getTime())) {
        asOf = d.toISOString()
      }
    }

    return {
      name: provider.name,
      status: 'ok',
      rate: parsedRate,
      asOf,
    }
  } catch (error) {
    return {
      name: provider.name,
      status: 'error',
      error: (error as Error).message,
    }
  }
}

async function persistReferenceSnapshot(rate: number, source: string, mode: RateMode, metadata?: Record<string, unknown>): Promise<{ id: string | null }> {
  const db = await getDb()
  if (!db) return { id: null }

  try {
    const created = await db.mpReferenceRateSnapshot.create({
      data: {
        rate: String(rate),
        fechaValor: new Date(),
        source,
        mode,
        metadata: metadata ?? {},
      },
    })

    return { id: typeof created.id === 'string' ? created.id : null }
  } catch {
    return { id: null }
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

interface DbReferenceSnapshot {
  rate: number
  source: string
  asOf: string
  fechaValor: string
  snapshotId: string | null
}

async function readLastValidReferenceSnapshot(): Promise<DbReferenceSnapshot | null> {
  const db = await getDb()
  if (!db) return null

  try {
    const row = await db.mpReferenceRateSnapshot.findFirst({
      orderBy: [{ fechaValor: 'desc' }, { createdAt: 'desc' }],
    })

    if (!row) return null

    const rate = Number(row.rate)
    if (!Number.isFinite(rate) || rate <= 0) return null

    return {
      rate,
      source: typeof row.source === 'string' ? row.source : 'db_snapshot',
      asOf: row.createdAt instanceof Date ? row.createdAt.toISOString() : new Date().toISOString(),
      fechaValor: row.fechaValor instanceof Date ? row.fechaValor.toISOString() : new Date().toISOString(),
      snapshotId: typeof row.id === 'string' ? row.id : null,
    }
  } catch {
    return null
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function resolveReferenceRate(): Promise<ReferenceRateResult> {
  const providers = buildProvidersFromEnv()
  const maxJumpPct = parseEnvNumber(process.env.RATE_MAX_JUMP_PCT, DEFAULT_MAX_JUMP_PCT)
  const adminApiToken = process.env.ADMIN_API_TOKEN?.trim() || null
  const nowIso = new Date().toISOString()
  const lastDbSnapshot = await readLastValidReferenceSnapshot()

  // ── Consultar todos en paralelo ──
  const providersTried = await Promise.all(
    providers.map((p) => fetchProviderRate(p, adminApiToken)),
  )

  // ── Recolectar éxitos con timestamp → elegir el más reciente ──
  const successes = providersTried.filter(
    (a): a is RateProviderAttempt & { rate: number } =>
      a.status === 'ok' && typeof a.rate === 'number',
  )

  // Ordenar por asOf descendente (más reciente primero)
  successes.sort((a, b) => {
    const aTs = a.asOf ? new Date(a.asOf).getTime() : 0
    const bTs = b.asOf ? new Date(b.asOf).getTime() : 0
    return bTs - aTs
  })

  for (const winner of successes) {
    // Validar anti-pump: no saltos > maxJumpPct vs último DB,
    // a menos que el último snapshot tenga > 24h (la tasa pudo moverse legítimamente)
    if (lastDbSnapshot && lastDbSnapshot.rate > 0) {
      const lastSnapshotAgeMs = Date.now() - new Date(lastDbSnapshot.fechaValor).getTime()
      const isLastSnapshotOld = lastSnapshotAgeMs > 24 * 60 * 60 * 1000

      if (!isLastSnapshotOld) {
        const jump = Math.abs(winner.rate - lastDbSnapshot.rate) / lastDbSnapshot.rate
        if (jump > maxJumpPct) {
          continue // saltar este, probar el siguiente más reciente
        }
      }
    }

    // Persistir en DB → alimenta el Fallback 3 para futuras consultas
    const dbSnapshot = await persistReferenceSnapshot(
      winner.rate,
      winner.name,
      'live',
      { providersTried: providersTried.map((p) => ({ name: p.name, status: p.status, rate: p.rate })) },
    )

    return {
      rate: winner.rate,
      mode: 'live',
      source: winner.name,
      asOf: winner.asOf || nowIso,
      fechaValor: winner.asOf || nowIso,
      snapshotId: dbSnapshot.id,
      providersTried,
    }
  }

  // ── Todos fallaron → último snapshot en DB ──
  if (lastDbSnapshot) {
    return {
      rate: lastDbSnapshot.rate,
      mode: 'stale',
      source: lastDbSnapshot.source,
      asOf: lastDbSnapshot.asOf,
      fechaValor: lastDbSnapshot.fechaValor,
      snapshotId: lastDbSnapshot.snapshotId,
      providersTried,
    }
  }

  // ── Nada disponible ──
  return {
    rate: null,
    mode: 'unavailable',
    source: 'none',
    asOf: nowIso,
    fechaValor: nowIso,
    snapshotId: null,
    providersTried,
  }
}
