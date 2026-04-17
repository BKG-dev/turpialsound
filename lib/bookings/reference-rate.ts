import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'

export type RateMode = 'live' | 'stale' | 'fallback'

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
  name: string
  url: string
  path: string
}

interface PersistedRate {
  rate: number
  source: string
  asOf: string
}

const DEFAULT_FALLBACK_RATE = 50
const DEFAULT_DELTA_PCT = 0.005
const DEFAULT_MAX_JUMP_PCT = 0.05
const DEFAULT_STORAGE_FILE = path.join(process.cwd(), '.cache', 'reference-rate.json')
const DEFAULT_TIMEOUT_MS = 4000

let inMemoryLastValidRate: PersistedRate | null = null

function parseEnvNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeStorageMode(value: string | undefined): 'memory' | 'file' {
  return value?.toLowerCase() === 'file' ? 'file' : 'memory'
}

function buildProvidersFromEnv(): ProviderConfig[] {
  const providerSlots = ['A', 'B', 'C'] as const
  const providers: ProviderConfig[] = []

  for (const slot of providerSlots) {
    const name = process.env[`RATE_${slot}_NAME`]?.trim()
    const url = process.env[`RATE_${slot}_URL`]?.trim()
    const jsonPath = process.env[`RATE_${slot}_PATH`]?.trim()

    if (!name || !url || !jsonPath) {
      providers.push({
        name: name || `Provider ${slot}`,
        url: url || '',
        path: jsonPath || '',
      })
      continue
    }

    providers.push({ name, url, path: jsonPath })
  }

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

  const normalized = compact.replace(/\./g, '').replace(',', '.')
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

async function fetchProviderRate(
  provider: ProviderConfig,
  adminApiToken: string | null,
): Promise<RateProviderAttempt> {
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

    return {
      name: provider.name,
      status: 'ok',
      rate: parsedRate,
    }
  } catch (error) {
    return {
      name: provider.name,
      status: 'error',
      error: (error as Error).message,
    }
  }
}

export async function resolveReferenceRate(): Promise<ReferenceRateResult> {
  const providers = buildProvidersFromEnv()
  const fallbackRate = parseEnvNumber(process.env.BCV_FALLBACK_RATE, DEFAULT_FALLBACK_RATE)
  const deltaPct = parseEnvNumber(process.env.RATE_DELTA_PCT, DEFAULT_DELTA_PCT)
  const maxJumpPct = parseEnvNumber(process.env.RATE_MAX_JUMP_PCT, DEFAULT_MAX_JUMP_PCT)
  const storageMode = normalizeStorageMode(process.env.RATE_STORAGE)
  const storageFile = process.env.RATE_STORAGE_FILE || DEFAULT_STORAGE_FILE
  const adminApiToken = process.env.ADMIN_API_TOKEN?.trim() || null
  const nowIso = new Date().toISOString()

  const providersTried = await Promise.all(
    providers.map((provider) => fetchProviderRate(provider, adminApiToken)),
  )

  const successfulRates = providersTried
    .filter((attempt): attempt is RateProviderAttempt & { rate: number } => attempt.status === 'ok' && typeof attempt.rate === 'number')
    .map((attempt) => ({ name: attempt.name, rate: attempt.rate }))

  const consensus = findConsensus(successfulRates, deltaPct)
  const lastValid = await readPersistedRate(storageMode, storageFile)

  if (consensus) {
    const jumpVsLastValid =
      lastValid && lastValid.rate > 0
        ? Math.abs(consensus.rate - lastValid.rate) / lastValid.rate
        : 0

    if (!lastValid || jumpVsLastValid <= maxJumpPct) {
      const livePayload: PersistedRate = {
        rate: consensus.rate,
        source: consensus.sources.join(' + '),
        asOf: nowIso,
      }

      await writePersistedRate(storageMode, storageFile, livePayload)

      return {
        rate: livePayload.rate,
        mode: 'live',
        source: livePayload.source,
        asOf: livePayload.asOf,
        providersTried,
      }
    }
  }

  if (lastValid) {
    return {
      rate: lastValid.rate,
      mode: 'stale',
      source: lastValid.source,
      asOf: lastValid.asOf,
      providersTried,
    }
  }

  return {
    rate: fallbackRate,
    mode: 'fallback',
    source: 'configured_fallback',
    asOf: nowIso,
    providersTried,
  }
}
