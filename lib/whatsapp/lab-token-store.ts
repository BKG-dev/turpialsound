import crypto from 'node:crypto'
import { prisma } from '@/lib/db'
import { normalizeVePhoneCandidates, normalizeWhatsappText, phonesMatchVe } from '@/lib/whatsapp/normalize'

const ACTION_CHALLENGE_CREATED = 'whatsapp_reserva_token.challenge_created'
const ACTION_MESSAGE_RECEIVED = 'whatsapp_reserva_token.message_received'
const ACTION_CHALLENGE_VERIFIED = 'whatsapp_reserva_token.challenge_verified'
const ACTION_CHALLENGE_FAILED = 'whatsapp_reserva_token.challenge_failed'
const ACTION_CHALLENGE_EXPIRED = 'whatsapp_reserva_token.challenge_expired'
const CHALLENGE_TTL_MINUTES = 10

type ChallengeStatus = 'not_found' | 'pending' | 'verified' | 'failed' | 'expired'

interface ChallengeCreatedState {
  challengeId: string
  phoneE164: string
  codeHash: string
  codePreviewLast2: string
  expiresAt: string
  status: 'pending'
  createdAt: string
}

interface ChallengeStatusView {
  status: ChallengeStatus
  challengeId: string
  expiresAt: string | null
  verifiedAt: string | null
  failedReason: string | null
}

interface MessageEventInput {
  messageId: string
  fromRaw: string
  textRaw: string
  phoneNumberId: string | null
  timestamp: string | null
}

interface ProcessWhatsappLabInboundMessageInput {
  provider: 'meta' | 'evolution'
  messageId: string
  fromNormalized: string
  textNormalized: string
  phoneNumberIdOrInstance: string | null
  timestamp: string | null
}

function randomCode(): string {
  const numeric = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0')
  return `TS-${numeric}`
}

export function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex')
}

function parseCreatedState(nextState: unknown): ChallengeCreatedState | null {
  if (!nextState || typeof nextState !== 'object') return null
  const value = nextState as Record<string, unknown>

  const challengeId = typeof value.challengeId === 'string' ? value.challengeId : null
  const phoneE164 = typeof value.phoneE164 === 'string' ? value.phoneE164 : null
  const codeHash = typeof value.codeHash === 'string' ? value.codeHash : null
  const codePreviewLast2 = typeof value.codePreviewLast2 === 'string' ? value.codePreviewLast2 : null
  const expiresAt = typeof value.expiresAt === 'string' ? value.expiresAt : null
  const status = value.status === 'pending' ? 'pending' : null
  const createdAt = typeof value.createdAt === 'string' ? value.createdAt : null

  if (!challengeId || !phoneE164 || !codeHash || !codePreviewLast2 || !expiresAt || !status || !createdAt) {
    return null
  }

  return {
    challengeId,
    phoneE164,
    codeHash,
    codePreviewLast2,
    expiresAt,
    status,
    createdAt,
  }
}

export async function createLabChallenge(phoneRaw: string): Promise<{
  challengeId: string
  code: string
  expiresAt: string
}> {
  const normalizedCandidates = normalizeVePhoneCandidates(phoneRaw)
  const canonicalPhone = normalizedCandidates.find((candidate) => candidate.startsWith('58')) ?? normalizedCandidates[0]
  if (!canonicalPhone) {
    throw new Error('invalid_phone')
  }

  const code = randomCode()
  const normalizedCode = normalizeWhatsappText(code)
  const codeHash = sha256Hex(normalizedCode)
  const challengeId = crypto.randomUUID()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + CHALLENGE_TTL_MINUTES * 60 * 1000)

  await prisma.auditLog.create({
    data: {
      bookingRequestId: null,
      action: ACTION_CHALLENGE_CREATED,
      nextState: {
        challengeId,
        phoneE164: canonicalPhone,
        codeHash,
        codePreviewLast2: normalizedCode.slice(-2),
        expiresAt: expiresAt.toISOString(),
        status: 'pending',
        createdAt: now.toISOString(),
      },
    },
  })

  return {
    challengeId,
    code,
    expiresAt: expiresAt.toISOString(),
  }
}

async function loadChallengeTimeline(challengeId: string) {
  const records = await prisma.auditLog.findMany({
    where: {
      bookingRequestId: null,
      action: {
        in: [
          ACTION_CHALLENGE_CREATED,
          ACTION_CHALLENGE_VERIFIED,
          ACTION_CHALLENGE_FAILED,
          ACTION_CHALLENGE_EXPIRED,
        ],
      },
    },
    orderBy: { createdAt: 'asc' },
    select: {
      action: true,
      createdAt: true,
      nextState: true,
    },
  })

  return records.filter((record) => {
    if (!record.nextState || typeof record.nextState !== 'object') return false
    const state = record.nextState as Record<string, unknown>
    return state.challengeId === challengeId
  })
}

export async function getLabChallengeStatus(challengeId: string): Promise<ChallengeStatusView> {
  const timeline = await loadChallengeTimeline(challengeId)
  if (timeline.length === 0) {
    return {
      status: 'not_found',
      challengeId,
      expiresAt: null,
      verifiedAt: null,
      failedReason: null,
    }
  }

  const created = timeline.find((entry) => entry.action === ACTION_CHALLENGE_CREATED)
  const createdState = created ? parseCreatedState(created.nextState) : null
  const expiresAt = createdState?.expiresAt ?? null

  const verified = [...timeline].reverse().find((entry) => entry.action === ACTION_CHALLENGE_VERIFIED)
  if (verified) {
    const state = (verified.nextState ?? {}) as Record<string, unknown>
    return {
      status: 'verified',
      challengeId,
      expiresAt,
      verifiedAt: typeof state.verifiedAt === 'string' ? state.verifiedAt : verified.createdAt.toISOString(),
      failedReason: null,
    }
  }

  const failed = [...timeline].reverse().find((entry) => entry.action === ACTION_CHALLENGE_FAILED)
  if (failed) {
    const state = (failed.nextState ?? {}) as Record<string, unknown>
    return {
      status: 'failed',
      challengeId,
      expiresAt,
      verifiedAt: null,
      failedReason: typeof state.reason === 'string' ? state.reason : 'UNKNOWN',
    }
  }

  const now = Date.now()
  if (expiresAt && new Date(expiresAt).getTime() < now) {
    const alreadyExpired = timeline.some((entry) => entry.action === ACTION_CHALLENGE_EXPIRED)
    if (!alreadyExpired) {
      await prisma.auditLog.create({
        data: {
          bookingRequestId: null,
          action: ACTION_CHALLENGE_EXPIRED,
          nextState: {
            challengeId,
            expiredAt: new Date(now).toISOString(),
          },
        },
      })
    }

    return {
      status: 'expired',
      challengeId,
      expiresAt,
      verifiedAt: null,
      failedReason: null,
    }
  }

  return {
    status: 'pending',
    challengeId,
    expiresAt,
    verifiedAt: null,
    failedReason: null,
  }
}

interface PendingChallenge {
  challengeId: string
  phoneE164: string
  codeHash: string
  expiresAt: string
}

async function findPendingChallengesByCodeHash(codeHash: string): Promise<PendingChallenge[]> {
  const since = new Date(Date.now() - 15 * 60 * 1000)
  const createdLogs = await prisma.auditLog.findMany({
    where: {
      bookingRequestId: null,
      action: ACTION_CHALLENGE_CREATED,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      nextState: true,
    },
    take: 200,
  })

  const results: PendingChallenge[] = []
  for (const log of createdLogs) {
    const createdState = parseCreatedState(log.nextState)
    if (!createdState) continue
    if (createdState.codeHash !== codeHash) continue

    const status = await getLabChallengeStatus(createdState.challengeId)
    if (status.status === 'pending' || status.status === 'expired') {
      results.push({
        challengeId: createdState.challengeId,
        phoneE164: createdState.phoneE164,
        codeHash: createdState.codeHash,
        expiresAt: createdState.expiresAt,
      })
    }
  }
  return results
}

async function messageAlreadyReceived(messageId: string): Promise<boolean> {
  const existing = await prisma.auditLog.findMany({
    where: {
      bookingRequestId: null,
      action: ACTION_MESSAGE_RECEIVED,
    },
    orderBy: { createdAt: 'desc' },
    select: { nextState: true },
    take: 500,
  })

  return existing.some((entry) => {
    if (!entry.nextState || typeof entry.nextState !== 'object') return false
    const state = entry.nextState as Record<string, unknown>
    return state.messageId === messageId
  })
}

async function recordChallengeFailure(input: {
  challengeId: string
  messageId: string
  fromNormalized: string
  reason: string
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      bookingRequestId: null,
      action: ACTION_CHALLENGE_FAILED,
      nextState: {
        challengeId: input.challengeId,
        messageId: input.messageId,
        fromNormalized: input.fromNormalized,
        reason: input.reason,
        failedAt: new Date().toISOString(),
      },
    },
  })
}

export async function processInboundTextMessage(input: MessageEventInput): Promise<void> {
  const fromNormalized = normalizeVePhoneCandidates(input.fromRaw)[0] ?? ''
  const textNormalized = normalizeWhatsappText(input.textRaw)

  if (!fromNormalized || !textNormalized) return

  await processWhatsappLabInboundMessage({
    provider: 'meta',
    messageId: input.messageId,
    fromNormalized,
    textNormalized,
    phoneNumberIdOrInstance: input.phoneNumberId,
    timestamp: input.timestamp,
  })
}

export async function processWhatsappLabInboundMessage(input: ProcessWhatsappLabInboundMessageInput): Promise<void> {
  if (!input.messageId || !input.fromNormalized || !input.textNormalized) return

  const duplicate = await messageAlreadyReceived(input.messageId)
  if (duplicate) return

  await prisma.auditLog.create({
    data: {
      bookingRequestId: null,
      action: ACTION_MESSAGE_RECEIVED,
      nextState: {
        messageId: input.messageId,
        fromNormalized: input.fromNormalized,
        textNormalized: input.textNormalized,
        phoneNumberId: input.provider === 'meta' ? input.phoneNumberIdOrInstance : null,
        instance: input.provider === 'evolution' ? input.phoneNumberIdOrInstance : null,
        provider: input.provider,
        timestamp: input.timestamp,
        receivedAt: new Date().toISOString(),
      },
    },
  })

  const codeHash = sha256Hex(input.textNormalized)
  const candidates = await findPendingChallengesByCodeHash(codeHash)
  if (candidates.length === 0) return

  for (const challenge of candidates) {
    if (new Date(challenge.expiresAt).getTime() < Date.now()) {
      await recordChallengeFailure({
        challengeId: challenge.challengeId,
        messageId: input.messageId,
        fromNormalized: input.fromNormalized,
        reason: 'EXPIRED',
      })
      continue
    }

    if (!phonesMatchVe(challenge.phoneE164, input.fromNormalized)) {
      await recordChallengeFailure({
        challengeId: challenge.challengeId,
        messageId: input.messageId,
        fromNormalized: input.fromNormalized,
        reason: 'PHONE_MISMATCH',
      })
      continue
    }

    await prisma.auditLog.create({
      data: {
        bookingRequestId: null,
        action: ACTION_CHALLENGE_VERIFIED,
        nextState: {
          challengeId: challenge.challengeId,
          messageId: input.messageId,
          fromNormalized: input.fromNormalized,
          verifiedAt: new Date().toISOString(),
        },
      },
    })
  }
}
