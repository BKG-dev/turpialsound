import 'server-only'

import { prisma } from '@/lib/db'

const LAST_GOOD_CONSENSUS_ACTION = 'reference_rate.last_good_consensus'

export interface StoredReferenceRateConsensus {
  rate: number
  asOf: string
  source: string
  providersUsed: string[]
  persistedAt: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parsePositiveNumber(value: unknown): number | null {
  if (typeof value !== 'number') return null
  if (!Number.isFinite(value) || value <= 0) return null
  return value
}

function parseString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

function parseStoredConsensus(
  nextState: unknown,
  fallbackPersistedAtIso: string,
): StoredReferenceRateConsensus | null {
  if (!isRecord(nextState)) return null

  const rate = parsePositiveNumber(nextState.rate)
  const asOf = parseString(nextState.asOf)
  const source = parseString(nextState.source)
  const providersUsed = parseStringArray(nextState.providersUsed)
  const persistedAt = parseString(nextState.persistedAt) ?? fallbackPersistedAtIso

  if (!rate || !asOf || !source) {
    return null
  }

  return {
    rate,
    asOf,
    source,
    providersUsed,
    persistedAt,
  }
}

export async function getLastGoodConsensusFromDb(): Promise<StoredReferenceRateConsensus | null> {
  const latest = await prisma.auditLog.findFirst({
    where: {
      action: LAST_GOOD_CONSENSUS_ACTION,
      bookingRequestId: null,
    },
    orderBy: { createdAt: 'desc' },
    select: {
      createdAt: true,
      nextState: true,
    },
  })

  if (!latest) return null
  return parseStoredConsensus(latest.nextState, latest.createdAt.toISOString())
}

export async function saveLastGoodConsensusToDbIfNeeded(
  payload: Omit<StoredReferenceRateConsensus, 'persistedAt'>,
  minPersistIntervalSeconds: number,
): Promise<{ saved: boolean; reason: 'saved' | 'unchanged' | 'throttled' }> {
  const latest = await getLastGoodConsensusFromDb()
  const now = Date.now()

  if (latest) {
    const unchanged = latest.rate === payload.rate && latest.asOf === payload.asOf
    if (unchanged) {
      return { saved: false, reason: 'unchanged' }
    }

    const persistedAtMs = new Date(latest.persistedAt).getTime()
    if (!Number.isNaN(persistedAtMs)) {
      const ageSeconds = (now - persistedAtMs) / 1000
      if (ageSeconds < minPersistIntervalSeconds) {
        return { saved: false, reason: 'throttled' }
      }
    }
  }

  const persistedAt = new Date(now).toISOString()
  await prisma.auditLog.create({
    data: {
      bookingRequestId: null,
      action: LAST_GOOD_CONSENSUS_ACTION,
      nextState: {
        rate: payload.rate,
        asOf: payload.asOf,
        source: payload.source,
        providersUsed: payload.providersUsed,
        persistedAt,
      },
    },
  })

  return { saved: true, reason: 'saved' }
}
