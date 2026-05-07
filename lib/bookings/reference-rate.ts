import 'server-only'

import {
  getLastGoodConsensusFromDb,
  saveLastGoodConsensusToDbIfNeeded,
  type StoredReferenceRateConsensus,
} from '@/lib/bookings/reference-rate-store'

export type RateMode = 'live' | 'stale_last_good' | 'emergency_fallback'

export interface RateProviderAttempt {
  name: string
  status: 'ok' | 'error' | 'skipped'
  rate?: number
  error?: string
}

export interface ReferenceRateResult {
  rate: number
  mode: RateMode
  source: string
  asOf: string
  providersTried: RateProviderAttempt[]
}

interface ProviderConfig {
  slot: 'A' | 'B' | 'C'
  name: string
  url: string
  format: 'csv' | 'json'
  path?: string
  asOfPath?: string
}

interface ProviderFetchResult extends RateProviderAttempt {
  slot: 'A' | 'B' | 'C'
  asOf?: string
}

interface CsvRowRate {
  rate: number
  asOf: string
}

interface ConsensusResult {
  rate: number
  source: string
  providersUsed: string[]
  asOf: string
}

const DEFAULT_DELTA_PCT = 0.005
const DEFAULT_MAX_JUMP_PCT = 0.05
const DEFAULT_TIMEOUT_MS = 4000
const DEFAULT_EMERGENCY_FALLBACK_RATE = 50
const DEFAULT_PERSIST_MIN_INTERVAL_SECONDS = 300
const DEFAULT_MAX_PROVIDER_AGE_HOURS = 72

const DEFAULT_SOURCE_A_NAME = 'GoogleSheets-BCV'
const DEFAULT_SOURCE_A_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSJogl8OrOxNFvrHAcLNtBQsjLswfYkjD_VwxyAju71rC-IDMaoId_As_RCBjRSr--CmBqVjXFqsVUB/pub?gid=0&single=true&output=csv'
const DEFAULT_SOURCE_B_NAME = 'DolarApi-Oficial'
const DEFAULT_SOURCE_B_URL = 'https://ve.dolarapi.com/v1/dolares/oficial'
const DEFAULT_SOURCE_B_PATH = 'promedio'
const DEFAULT_SOURCE_B_AS_OF_PATH = 'fechaActualizacion'

let inMemoryLastGoodConsensus: StoredReferenceRateConsensus | null = null

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

function getByPath(payload: unknown, dotPath: string): unknown {
  const normalizedPath = dotPath.replace(/\[(\d+)\]/g, '.$1')
  const segments = normalizedPath
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean)

  let cursor: unknown = payload
  for (const segment of segments) {
    if (cursor === null || cursor === undefined) return undefined
    if (typeof cursor !== 'object') return undefined
    cursor = (cursor as Record<string, unknown>)[segment]
  }

  return cursor
}

function relativeDifference(a: number, b: number): number {
  const baseline = (Math.abs(a) + Math.abs(b)) / 2
  if (baseline === 0) return 0
  return Math.abs(a - b) / baseline
}

function normalizeUrl(value: string | undefined, fallback: string): string {
  const normalized = value?.trim()
  return normalized && normalized.length > 0 ? normalized : fallback
}

function normalizeName(value: string | undefined, fallback: string): string {
  const normalized = value?.trim()
  return normalized && normalized.length > 0 ? normalized : fallback
}

function normalizePath(value: string | undefined, fallback: string): string {
  const normalized = value?.trim()
  return normalized && normalized.length > 0 ? normalized : fallback
}

function buildProvidersFromEnv(): ProviderConfig[] {
  const sourceA: ProviderConfig = {
    slot: 'A',
    name: normalizeName(process.env.RATE_SOURCE_A_NAME, DEFAULT_SOURCE_A_NAME),
    url: normalizeUrl(process.env.RATE_SOURCE_A_URL, DEFAULT_SOURCE_A_URL),
    format: 'csv',
  }

  const sourceB: ProviderConfig = {
    slot: 'B',
    name: normalizeName(process.env.RATE_SOURCE_B_NAME, DEFAULT_SOURCE_B_NAME),
    url: normalizeUrl(process.env.RATE_SOURCE_B_URL, DEFAULT_SOURCE_B_URL),
    format: 'json',
    path: normalizePath(process.env.RATE_SOURCE_B_PATH, DEFAULT_SOURCE_B_PATH),
    asOfPath: normalizePath(process.env.RATE_SOURCE_B_AS_OF_PATH, DEFAULT_SOURCE_B_AS_OF_PATH),
  }

  const sourceCFormat = process.env.RATE_SOURCE_C_FORMAT?.trim().toLowerCase() === 'csv' ? 'csv' : 'json'
  const sourceC: ProviderConfig = {
    slot: 'C',
    name: normalizeName(process.env.RATE_SOURCE_C_NAME, 'Provider C'),
    url: process.env.RATE_SOURCE_C_URL?.trim() ?? '',
    format: sourceCFormat,
    path: sourceCFormat === 'json' ? process.env.RATE_SOURCE_C_PATH?.trim() ?? '' : undefined,
    asOfPath: sourceCFormat === 'json' ? process.env.RATE_SOURCE_C_AS_OF_PATH?.trim() ?? '' : undefined,
  }

  return [sourceA, sourceB, sourceC]
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      fields.push(current)
      current = ''
      continue
    }

    current += char
  }

  fields.push(current)
  return fields
}

function parseCaracasDateToIso(value: string): string | null {
  const normalized = value.trim()
  const match = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/)
  if (!match) return null

  const [, dd, mm, yyyy, hh, min, sec] = match
  const isoWithOffset = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T${hh.padStart(2, '0')}:${min}:${sec}-04:00`
  const parsed = new Date(isoWithOffset)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

function parseLatestCsvRate(csvText: string): CsvRowRate | null {
  const rows = csvText
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter((row) => row.length > 0)

  if (rows.length < 2) {
    return null
  }

  let latest: CsvRowRate | null = null

  for (let i = 1; i < rows.length; i += 1) {
    const fields = parseCsvLine(rows[i])
    if (fields.length < 2) {
      continue
    }

    const dateRaw = fields[0]?.trim() ?? ''
    const bcvRaw = fields[1]?.trim() ?? ''
    const asOf = parseCaracasDateToIso(dateRaw)
    const rate = parseNumberishRate(bcvRaw)

    if (!asOf || !rate) {
      continue
    }

    if (!latest || new Date(asOf).getTime() > new Date(latest.asOf).getTime()) {
      latest = { rate, asOf }
    }
  }

  return latest
}

async function fetchCsvProviderRate(provider: ProviderConfig): Promise<ProviderFetchResult> {
  if (!provider.url) {
    return {
      slot: provider.slot,
      name: provider.name,
      status: 'skipped',
      error: 'missing_url',
    }
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

    const response = await fetch(provider.url, {
      method: 'GET',
      headers: {
        Accept: 'text/csv,text/plain;q=0.9,*/*;q=0.8',
      },
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
      slot: provider.slot,
      name: provider.name,
      status: 'ok',
      rate: latestRow.rate,
      asOf: latestRow.asOf,
    }
  } catch (error) {
    return {
      slot: provider.slot,
      name: provider.name,
      status: 'error',
      error: (error as Error).message,
    }
  }
}

async function fetchJsonProviderRate(
  provider: ProviderConfig,
  adminApiToken: string | null,
): Promise<ProviderFetchResult> {
  if (!provider.url) {
    return {
      slot: provider.slot,
      name: provider.name,
      status: 'skipped',
      error: 'missing_url',
    }
  }

  if (!provider.path) {
    return {
      slot: provider.slot,
      name: provider.name,
      status: 'skipped',
      error: 'missing_path',
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

    const rawAsOf = provider.asOfPath ? getByPath(payload, provider.asOfPath) : null
    const parsedAsOf =
      typeof rawAsOf === 'string' && !Number.isNaN(new Date(rawAsOf).getTime())
        ? new Date(rawAsOf).toISOString()
        : undefined

    return {
      slot: provider.slot,
      name: provider.name,
      status: 'ok',
      rate: parsedRate,
      asOf: parsedAsOf,
    }
  } catch (error) {
    return {
      slot: provider.slot,
      name: provider.name,
      status: 'error',
      error: (error as Error).message,
    }
  }
}

async function fetchProviderRate(
  provider: ProviderConfig,
  adminApiToken: string | null,
): Promise<ProviderFetchResult> {
  if (provider.format === 'csv') {
    return fetchCsvProviderRate(provider)
  }

  return fetchJsonProviderRate(provider, adminApiToken)
}

function buildConsensusFromAandB(
  sourceA: ProviderFetchResult | undefined,
  sourceB: ProviderFetchResult | undefined,
  tolerancePct: number,
  fallbackAsOf: string,
): ConsensusResult | null {
  if (!sourceA || !sourceB) {
    return null
  }

  if (sourceA.status !== 'ok' || sourceB.status !== 'ok') {
    return null
  }

  if (typeof sourceA.rate !== 'number' || typeof sourceB.rate !== 'number') {
    return null
  }

  if (relativeDifference(sourceA.rate, sourceB.rate) > tolerancePct) {
    return null
  }

  return {
    rate: (sourceA.rate + sourceB.rate) / 2,
    source: `${sourceA.name} + ${sourceB.name}`,
    providersUsed: [sourceA.name, sourceB.name],
    asOf: sourceA.asOf ?? fallbackAsOf,
  }
}

async function readLastGoodConsensus(): Promise<StoredReferenceRateConsensus | null> {
  if (inMemoryLastGoodConsensus) {
    return inMemoryLastGoodConsensus
  }

  const fromDb = await getLastGoodConsensusFromDb()
  if (fromDb) {
    inMemoryLastGoodConsensus = fromDb
  }

  return fromDb
}

function toProviderAttemptList(results: ProviderFetchResult[]): RateProviderAttempt[] {
  return results.map((item) => ({
    name: item.name,
    status: item.status,
    rate: item.rate,
    error: item.error,
  }))
}

function isProviderFresh(
  provider: ProviderFetchResult,
  maxProviderAgeHours: number,
  nowMs: number,
): boolean {
  if (provider.status !== 'ok') return false
  if (typeof provider.rate !== 'number' || !Number.isFinite(provider.rate) || provider.rate <= 0) {
    return false
  }

  if (!provider.asOf) {
    return true
  }

  const asOfMs = new Date(provider.asOf).getTime()
  if (Number.isNaN(asOfMs)) {
    return false
  }

  const maxAgeMs = Math.max(1, maxProviderAgeHours) * 60 * 60 * 1000
  return nowMs - asOfMs <= maxAgeMs
}

function pickBestFreshProvider(
  providerResults: ProviderFetchResult[],
  maxProviderAgeHours: number,
  nowMs: number,
): ProviderFetchResult | null {
  const freshProviders = providerResults.filter((provider) =>
    isProviderFresh(provider, maxProviderAgeHours, nowMs),
  )

  if (freshProviders.length === 0) return null

  return freshProviders.sort((a, b) => {
    const aAsOf = a.asOf ? new Date(a.asOf).getTime() : Number.NEGATIVE_INFINITY
    const bAsOf = b.asOf ? new Date(b.asOf).getTime() : Number.NEGATIVE_INFINITY
    return bAsOf - aAsOf
  })[0]
}

export async function resolveReferenceRate(): Promise<ReferenceRateResult> {
  const providers = buildProvidersFromEnv()
  const deltaPct = parseEnvNumber(process.env.RATE_DELTA_PCT, DEFAULT_DELTA_PCT)
  const maxJumpPct = parseEnvNumber(process.env.RATE_MAX_JUMP_PCT, DEFAULT_MAX_JUMP_PCT)
  const minPersistIntervalSeconds = parseEnvNumber(
    process.env.RATE_LAST_GOOD_MIN_PERSIST_SECONDS,
    DEFAULT_PERSIST_MIN_INTERVAL_SECONDS,
  )
  const maxProviderAgeHours = parseEnvNumber(
    process.env.RATE_MAX_PROVIDER_AGE_HOURS,
    DEFAULT_MAX_PROVIDER_AGE_HOURS,
  )
  const emergencyFallbackRate = parseEnvNumber(
    process.env.BCV_EMERGENCY_FALLBACK_RATE ?? process.env.BCV_FALLBACK_RATE,
    DEFAULT_EMERGENCY_FALLBACK_RATE,
  )
  const adminApiToken = process.env.ADMIN_API_TOKEN?.trim() || null
  const nowIso = new Date().toISOString()

  const providerResults = await Promise.all(providers.map((provider) => fetchProviderRate(provider, adminApiToken)))
  const providersTried = toProviderAttemptList(providerResults)

  const sourceA = providerResults.find((item) => item.slot === 'A')
  const sourceB = providerResults.find((item) => item.slot === 'B')
  const consensus = buildConsensusFromAandB(sourceA, sourceB, deltaPct, nowIso)
  const lastGood = await readLastGoodConsensus()
  const bestFreshProvider = pickBestFreshProvider(
    providerResults,
    maxProviderAgeHours,
    new Date(nowIso).getTime(),
  )

  let candidate: ConsensusResult | null = consensus
  if (!candidate && bestFreshProvider?.rate) {
    candidate = {
      rate: bestFreshProvider.rate,
      source: `${bestFreshProvider.name} (single_provider_fresh)`,
      providersUsed: [bestFreshProvider.name],
      asOf: bestFreshProvider.asOf ?? nowIso,
    }
  }

  if (candidate) {
    const jumpVsLastGood =
      lastGood && lastGood.rate > 0 ? Math.abs(candidate.rate - lastGood.rate) / lastGood.rate : 0

    if (!lastGood || jumpVsLastGood <= maxJumpPct) {
      const livePayload: StoredReferenceRateConsensus = {
        rate: candidate.rate,
        source: candidate.source,
        asOf: candidate.asOf,
        providersUsed: candidate.providersUsed,
        persistedAt: nowIso,
      }

      inMemoryLastGoodConsensus = livePayload
      await saveLastGoodConsensusToDbIfNeeded(livePayload, minPersistIntervalSeconds)

      return {
        rate: livePayload.rate,
        mode: 'live',
        source: livePayload.source,
        asOf: livePayload.asOf,
        providersTried,
      }
    }
  }

  if (lastGood) {
    return {
      rate: lastGood.rate,
      mode: 'stale_last_good',
      source: lastGood.source,
      asOf: lastGood.asOf,
      providersTried,
    }
  }

  return {
    rate: emergencyFallbackRate,
    mode: 'emergency_fallback',
    source: 'emergency_fallback',
    asOf: nowIso,
    providersTried,
  }
}
