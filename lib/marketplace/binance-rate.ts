import { getDb } from '@/lib/marketplace/db'

export type BinanceRateMode = 'live' | 'sheet' | 'stale'

export interface BinanceRateAttempt {
  name: string
  status: 'ok' | 'error' | 'skipped'
  rate?: number
  error?: string
}

export interface BinanceRateResult {
  rate: number
  mode: BinanceRateMode
  source: string
  asOf: string
  fechaValor: string
  snapshotId: string | null
  attempts: BinanceRateAttempt[]
}

interface BinanceRateSnapshot {
  id?: string | null
  rate: number
  fechaValor: string
  source: string
  mode: BinanceRateMode
  metadata?: Record<string, unknown>
  createdAt?: string
}

interface SheetRateSnapshot {
  rate: number
  fechaValor: string
  source: string
  metadata: Record<string, unknown>
}

const BINANCE_P2P_URL = 'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search'
const DEFAULT_TIMEOUT_MS = 5000
const DEFAULT_SNAPSHOT_MIN_INTERVAL_MINUTES = 15

function parseEnvNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseNumberishRate(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : null
  }

  if (typeof value !== 'string') {
    return null
  }

  const compact = value.trim().replace(/[^\d.,-]/g, '')
  if (!compact) return null

  const lastComma = compact.lastIndexOf(',')
  const lastDot = compact.lastIndexOf('.')
  let normalized = compact

  if (lastComma >= 0 && lastDot >= 0) {
    normalized =
      lastComma > lastDot
        ? compact.replace(/\./g, '').replace(',', '.')
        : compact.replace(/,/g, '')
  } else if (lastComma >= 0) {
    normalized = compact.replace(',', '.')
  }

  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middleIndex = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) {
    return sorted[middleIndex]
  }
  return (sorted[middleIndex - 1] + sorted[middleIndex]) / 2
}

function getGoogleSheetsCsvUrl(): string | null {
  return (
    process.env.MP_RATES_GOOGLE_SHEETS_CSV_URL?.trim() ||
    process.env.MARKETPLACE_RATES_GOOGLE_SHEETS_CSV_URL?.trim() ||
    process.env.RATE_GOOGLE_SHEETS_CSV_URL?.trim() ||
    process.env.RATE_SHEET_CSV_URL?.trim() ||
    null
  )
}

function detectCsvDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim().length > 0) ?? ''
  const candidates = [',', ';', '\t']
  return candidates.reduce((best, candidate) => {
    const bestCount = firstLine.split(best).length
    const candidateCount = firstLine.split(candidate).length
    return candidateCount > bestCount ? candidate : best
  }, ',')
}

function parseCsv(text: string): string[][] {
  const delimiter = detectCsvDelimiter(text)
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    const next = text[index + 1]

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"'
        index++
      } else if (char === '"') {
        quoted = false
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      quoted = true
    } else if (char === delimiter) {
      row.push(field.trim())
      field = ''
    } else if (char === '\n') {
      row.push(field.trim())
      rows.push(row)
      row = []
      field = ''
    } else if (char !== '\r') {
      field += char
    }
  }

  row.push(field.trim())
  rows.push(row)

  return rows.filter((csvRow) => csvRow.some((cell) => cell.trim().length > 0))
}

function normalizeCsvLabel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

function parseCsvDate(value: string): Date | null {
  const cleanValue = value.trim()
  if (!cleanValue) return null

  const excelSerial = Number.parseFloat(cleanValue)
  if (Number.isFinite(excelSerial) && excelSerial > 30000 && excelSerial < 100000) {
    return new Date(Date.UTC(1899, 11, 30 + Math.trunc(excelSerial), 16, 0, 0))
  }

  const isoMatch = cleanValue.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
  if (isoMatch) {
    return new Date(Date.UTC(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]), 16, 0, 0))
  }

  const dateParts = cleanValue.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/)
  if (dateParts) {
    const first = Number(dateParts[1])
    const second = Number(dateParts[2])
    const yearRaw = Number(dateParts[3])
    const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw
    const day = first > 12 ? first : second > 12 ? second : first
    const month = first > 12 ? second : second > 12 ? first : second
    return new Date(Date.UTC(year, month - 1, day, 16, 0, 0))
  }

  const parsed = new Date(cleanValue)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function extractLatestSheetBinanceSnapshot(csvText: string): SheetRateSnapshot | null {
  const rows = parseCsv(csvText)
  if (rows.length === 0) return null

  const firstRow = rows[0]
  const normalizedHeader = firstRow.map(normalizeCsvLabel)
  const hasHeader = normalizedHeader.some(
    (label) => label.includes('fecha') || label.includes('date') || label.includes('binance') || label.includes('usdt'),
  )

  const dateIndex = hasHeader
    ? normalizedHeader.findIndex((label) => label === 'fecha' || label === 'date' || label === 'fechavalor')
    : 0
  const binanceIndex = hasHeader
    ? normalizedHeader.findIndex((label) => label.includes('binance') || label.includes('usdt'))
    : 2

  if (dateIndex < 0 || binanceIndex < 0) {
    return null
  }

  const dataRows = hasHeader ? rows.slice(1) : rows
  const parsedRows = dataRows
    .map((row, rowIndex) => {
      const fechaValor = parseCsvDate(row[dateIndex] ?? '')
      const rate = parseNumberishRate(row[binanceIndex])

      return {
        rowIndex: hasHeader ? rowIndex + 2 : rowIndex + 1,
        fechaValor,
        rate,
      }
    })
    .filter((row): row is { rowIndex: number; fechaValor: Date; rate: number } => Boolean(row.fechaValor && row.rate))
    .sort((a, b) => b.fechaValor.getTime() - a.fechaValor.getTime())

  const latest = parsedRows[0]
  if (!latest) return null

  return {
    rate: latest.rate,
    fechaValor: latest.fechaValor.toISOString(),
    source: 'google_sheets_csv',
    metadata: {
      csvShape: hasHeader ? 'header' : 'columns_a_d',
      headers: hasHeader ? firstRow : null,
      selectedRow: latest.rowIndex,
      parsedRows: parsedRows.length,
    },
  }
}

async function fetchBinanceP2PRate(): Promise<{ attempt: BinanceRateAttempt; snapshot: BinanceRateSnapshot | null }> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

    const response = await fetch(BINANCE_P2P_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        proMerchantAds: false,
        page: 1,
        rows: 10,
        payTypes: [],
        countries: [],
        publisherType: null,
        asset: 'USDT',
        fiat: 'VES',
        tradeType: 'BUY',
      }),
      cache: 'no-store',
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      throw new Error(`http_${response.status}`)
    }

    const payload = (await response.json()) as { data?: Array<{ adv?: { price?: unknown } }> }
    const prices = (payload.data ?? [])
      .map((row) => parseNumberishRate(row.adv?.price))
      .filter((price): price is number => typeof price === 'number' && price > 0)
      .slice(0, 10)

    if (prices.length === 0) {
      throw new Error('no_valid_prices')
    }

    const rate = median(prices)
    const fechaValor = new Date().toISOString()

    return {
      attempt: {
        name: 'BinanceP2P',
        status: 'ok',
        rate,
      },
      snapshot: {
        rate,
        fechaValor,
        source: 'binance_p2p_median_top_10',
        mode: 'live',
        metadata: {
          asset: 'USDT',
          fiat: 'VES',
          tradeType: 'BUY',
          rowsRequested: 10,
          validPrices: prices.length,
        },
      },
    }
  } catch (error) {
    return {
      attempt: {
        name: 'BinanceP2P',
        status: 'error',
        error: (error as Error).message,
      },
      snapshot: null,
    }
  }
}

async function fetchGoogleSheetsBinanceRate(): Promise<{ attempt: BinanceRateAttempt; snapshot: BinanceRateSnapshot | null }> {
  const url = getGoogleSheetsCsvUrl()
  if (!url) {
    return {
      attempt: {
        name: 'GoogleSheetsCSV',
        status: 'skipped',
        error: 'missing_csv_url',
      },
      snapshot: null,
    }
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'text/csv,text/plain,*/*' },
      cache: 'no-store',
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      throw new Error(`http_${response.status}`)
    }

    const csvText = await response.text()
    const snapshot = extractLatestSheetBinanceSnapshot(csvText)
    if (!snapshot) {
      throw new Error('invalid_csv_shape_or_empty_binance_rate')
    }

    return {
      attempt: {
        name: 'GoogleSheetsCSV',
        status: 'ok',
        rate: snapshot.rate,
      },
      snapshot: {
        ...snapshot,
        mode: 'sheet',
      },
    }
  } catch (error) {
    return {
      attempt: {
        name: 'GoogleSheetsCSV',
        status: 'error',
        error: (error as Error).message,
      },
      snapshot: null,
    }
  }
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function rowToSnapshot(row: Record<string, unknown>): BinanceRateSnapshot | null {
  const rate = toNumberOrNull(row.rate)
  if (!rate) return null

  const fechaValor =
    row.fechaValor instanceof Date
      ? row.fechaValor.toISOString()
      : typeof row.fechaValor === 'string'
        ? new Date(row.fechaValor).toISOString()
        : null

  if (!fechaValor) return null

  const createdAt =
    row.createdAt instanceof Date
      ? row.createdAt.toISOString()
      : typeof row.createdAt === 'string'
        ? new Date(row.createdAt).toISOString()
        : undefined

  const mode = row.mode === 'live' || row.mode === 'sheet' ? row.mode : 'stale'

  return {
    id: typeof row.id === 'string' ? row.id : null,
    rate,
    fechaValor,
    source: typeof row.source === 'string' ? row.source : 'db_snapshot',
    mode,
    metadata: typeof row.metadata === 'object' && row.metadata !== null ? (row.metadata as Record<string, unknown>) : undefined,
    createdAt,
  }
}

async function readLastValidDbSnapshot(): Promise<BinanceRateSnapshot | null> {
  const db = await getDb()
  if (!db) return null

  try {
    const row = await db.mpBinanceRateSnapshot.findFirst({
      orderBy: [{ fechaValor: 'desc' }, { createdAt: 'desc' }],
    })

    return row ? rowToSnapshot(row) : null
  } catch {
    return null
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

function shouldReuseLatestSnapshot(
  latest: BinanceRateSnapshot | null,
  candidate: BinanceRateSnapshot,
  minIntervalMinutes: number,
): boolean {
  if (!latest?.createdAt) return false
  if (latest.source !== candidate.source || latest.mode !== candidate.mode) return false
  if (latest.fechaValor !== candidate.fechaValor) return false
  if (Math.abs(latest.rate - candidate.rate) >= 0.0001) return false

  const latestCreatedAt = new Date(latest.createdAt).getTime()
  if (Number.isNaN(latestCreatedAt)) return false

  const ageMs = Date.now() - latestCreatedAt
  return ageMs >= 0 && ageMs < minIntervalMinutes * 60 * 1000
}

async function persistSnapshot(candidate: BinanceRateSnapshot): Promise<BinanceRateSnapshot> {
  const db = await getDb()
  if (!db) return candidate

  try {
    const minIntervalMinutes = parseEnvNumber(
      process.env.MP_BINANCE_RATE_SNAPSHOT_MIN_INTERVAL_MINUTES,
      DEFAULT_SNAPSHOT_MIN_INTERVAL_MINUTES,
    )
    const latestRow = await db.mpBinanceRateSnapshot.findFirst({
      orderBy: [{ createdAt: 'desc' }],
    })
    const latest = latestRow ? rowToSnapshot(latestRow) : null

    if (shouldReuseLatestSnapshot(latest, candidate, minIntervalMinutes)) {
      return latest ?? candidate
    }

    const created = await db.mpBinanceRateSnapshot.create({
      data: {
        rate: String(candidate.rate),
        fechaValor: new Date(candidate.fechaValor),
        source: candidate.source,
        mode: candidate.mode,
        metadata: candidate.metadata ?? {},
      },
    })

    return rowToSnapshot(created) ?? candidate
  } catch {
    return candidate
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

function buildResult(snapshot: BinanceRateSnapshot, mode: BinanceRateMode, attempts: BinanceRateAttempt[]): BinanceRateResult {
  return {
    rate: snapshot.rate,
    mode,
    source: snapshot.source,
    asOf: snapshot.createdAt ?? new Date().toISOString(),
    fechaValor: snapshot.fechaValor,
    snapshotId: snapshot.id ?? null,
    attempts,
  }
}

export async function resolveBinanceRate(): Promise<BinanceRateResult> {
  const binanceResult = await fetchBinanceP2PRate()
  const attempts = [binanceResult.attempt]

  if (binanceResult.snapshot) {
    const persisted = await persistSnapshot(binanceResult.snapshot)
    return buildResult(persisted, 'live', attempts)
  }

  const sheetResult = await fetchGoogleSheetsBinanceRate()
  attempts.push(sheetResult.attempt)

  if (sheetResult.snapshot) {
    const persisted = await persistSnapshot(sheetResult.snapshot)
    return buildResult(persisted, 'sheet', attempts)
  }

  const lastValid = await readLastValidDbSnapshot()
  if (lastValid) {
    return buildResult(
      {
        ...lastValid,
        source: `${lastValid.source} (last_valid_db_snapshot)`,
        mode: 'stale',
      },
      'stale',
      attempts,
    )
  }

  throw new Error('no_valid_binance_rate_snapshot')
}
