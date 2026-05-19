import crypto from 'node:crypto'
import { prisma } from '@/lib/db'
import { phonesMatchVe } from '@/lib/whatsapp/normalize'
import { Prisma } from '@/generated/prisma/client'
import {
  resolveBookingsPublicBaseUrl,
  getWhatsappSecureLinkTtlMinutesFromEnv,
  type BookingsBaseUrlSource,
} from '@/lib/bookings/whatsapp-verify-config'

const ACTION_SECURE_LINK_CREATED = 'whatsapp_secure_link.requested'
const ACTION_SECURE_LINK_SENT_OK = 'whatsapp_secure_link.sent_ok'
const ACTION_SECURE_LINK_SENT_FAILED = 'whatsapp_secure_link.sent_failed'
const ACTION_SECURE_LINK_OPENED = 'whatsapp_secure_link.opened'
const ACTION_SECURE_LINK_VERIFIED = 'whatsapp_secure_link.verified'
const ACTION_SECURE_LINK_EXPIRED = 'whatsapp_secure_link.expired'

const LOOKBACK_HOURS = 24

export interface SecureLinkDraftData {
  currentStep: number
  furthestStep: number
  data: {
    selectedItems: Array<{
      serviceSlug: string
      variantSlug: string | null
      quantity: number
    }>
    eventDate: string | null
    startTime: string | null
    durationMinutes: number | null
    extrasNotes: string
    extrasTechnician: boolean
    extrasBackline: boolean
    requesterName: string
    requesterEmail: string
    requesterPhone: string
    whatsappConsentAccepted: boolean
  }
}

interface SecureLinkCreatedState {
  secureLinkId: string
  tokenHash: string
  phoneE164: string
  requesterName: string
  requesterEmail: string
  expiresAt: string
  createdAt: string
  verificationMethod: 'secure_link'
  draft: SecureLinkDraftData
}

interface SecureLinkStatusView {
  status: 'not_found' | 'pending' | 'verified' | 'expired'
  secureLinkId: string | null
  expiresAt: string | null
  verifiedAt: string | null
  phoneE164: string | null
  draft: SecureLinkDraftData | null
}

function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function maskPhone(phone: string | null | undefined): string {
  const raw = phone ?? ''
  const digits = raw.replace(/[^\d+]/g, '')
  if (!digits) return 'n/a'
  if (digits.length <= 4) return digits
  return `${digits.slice(0, 4)}***${digits.slice(-2)}`
}

function parseCreatedState(nextState: unknown): SecureLinkCreatedState | null {
  if (!nextState || typeof nextState !== 'object') return null
  const value = nextState as Record<string, unknown>

  const secureLinkId = typeof value.secureLinkId === 'string' ? value.secureLinkId : null
  const tokenHash = typeof value.tokenHash === 'string' ? value.tokenHash : null
  const phoneE164 = typeof value.phoneE164 === 'string' ? value.phoneE164 : null
  const requesterName = typeof value.requesterName === 'string' ? value.requesterName : null
  const requesterEmail = typeof value.requesterEmail === 'string' ? value.requesterEmail : null
  const expiresAt = typeof value.expiresAt === 'string' ? value.expiresAt : null
  const createdAt = typeof value.createdAt === 'string' ? value.createdAt : null
  const verificationMethod = value.verificationMethod === 'secure_link' ? 'secure_link' : null
  const draft = value.draft as SecureLinkDraftData | undefined

  if (
    !secureLinkId ||
    !tokenHash ||
    !phoneE164 ||
    !requesterName ||
    !requesterEmail ||
    !expiresAt ||
    !createdAt ||
    !verificationMethod ||
    !draft
  ) {
    return null
  }

  return {
    secureLinkId,
    tokenHash,
    phoneE164,
    requesterName,
    requesterEmail,
    expiresAt,
    createdAt,
    verificationMethod,
    draft,
  }
}

async function loadCreatedSecureLinkRecords() {
  const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000)
  const logs = await prisma.auditLog.findMany({
    where: {
      bookingRequestId: null,
      action: ACTION_SECURE_LINK_CREATED,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      nextState: true,
    },
    take: 400,
  })

  return logs
    .map((entry) => parseCreatedState(entry.nextState))
    .filter((entry): entry is SecureLinkCreatedState => entry !== null)
}

async function loadSecureLinkTimeline(secureLinkId: string) {
  const logs = await prisma.auditLog.findMany({
    where: {
      bookingRequestId: null,
      action: {
        in: [
          ACTION_SECURE_LINK_CREATED,
          ACTION_SECURE_LINK_SENT_OK,
          ACTION_SECURE_LINK_SENT_FAILED,
          ACTION_SECURE_LINK_OPENED,
          ACTION_SECURE_LINK_VERIFIED,
          ACTION_SECURE_LINK_EXPIRED,
        ],
      },
    },
    orderBy: { createdAt: 'asc' },
    select: {
      action: true,
      createdAt: true,
      nextState: true,
    },
    take: 1000,
  })

  return logs.filter((entry) => {
    if (!entry.nextState || typeof entry.nextState !== 'object') return false
    const state = entry.nextState as Record<string, unknown>
    return state.secureLinkId === secureLinkId
  })
}

async function resolveSecureLinkStatusByCreatedRecord(
  created: SecureLinkCreatedState,
): Promise<SecureLinkStatusView> {
  const timeline = await loadSecureLinkTimeline(created.secureLinkId)
  const verifiedEntry = [...timeline].reverse().find((entry) => entry.action === ACTION_SECURE_LINK_VERIFIED)
  if (verifiedEntry) {
    const state = (verifiedEntry.nextState ?? {}) as Record<string, unknown>
    return {
      status: 'verified',
      secureLinkId: created.secureLinkId,
      expiresAt: created.expiresAt,
      verifiedAt:
        typeof state.verifiedAt === 'string'
          ? state.verifiedAt
          : verifiedEntry.createdAt.toISOString(),
      phoneE164: created.phoneE164,
      draft: created.draft,
    }
  }

  if (new Date(created.expiresAt).getTime() < Date.now()) {
    const alreadyExpired = timeline.some((entry) => entry.action === ACTION_SECURE_LINK_EXPIRED)
    if (!alreadyExpired) {
      await prisma.auditLog.create({
        data: {
          bookingRequestId: null,
          action: ACTION_SECURE_LINK_EXPIRED,
          nextState: {
            secureLinkId: created.secureLinkId,
            expiredAt: new Date().toISOString(),
            phoneMasked: maskPhone(created.phoneE164),
          },
        },
      })
      console.info('[secure_link_expired]', {
        event: 'secure_link_expired',
        secureLinkId: created.secureLinkId,
        phoneMasked: maskPhone(created.phoneE164),
      })
    }

    return {
      status: 'expired',
      secureLinkId: created.secureLinkId,
      expiresAt: created.expiresAt,
      verifiedAt: null,
      phoneE164: created.phoneE164,
      draft: created.draft,
    }
  }

  return {
    status: 'pending',
    secureLinkId: created.secureLinkId,
    expiresAt: created.expiresAt,
    verifiedAt: null,
    phoneE164: created.phoneE164,
    draft: created.draft,
  }
}

export async function createSecureLinkRequest(input: {
  phoneE164: string
  requesterName: string
  requesterEmail: string
  draft: SecureLinkDraftData
  ttlMinutes?: number
}): Promise<{
  secureLinkId: string
  token: string
  expiresAt: string
  url: string
  baseUrlSource: BookingsBaseUrlSource
  baseHost: string
}> {
  const ttlMinutes = input.ttlMinutes ?? getWhatsappSecureLinkTtlMinutesFromEnv()
  const secureLinkId = crypto.randomUUID()
  const token = crypto.randomBytes(24).toString('base64url')
  const tokenHash = sha256Hex(token)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000)

  await prisma.auditLog.create({
    data: {
      bookingRequestId: null,
      action: ACTION_SECURE_LINK_CREATED,
      nextState: {
        secureLinkId,
        tokenHash,
        phoneE164: input.phoneE164,
        requesterName: input.requesterName,
        requesterEmail: input.requesterEmail,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        verificationMethod: 'secure_link',
        draft: input.draft as unknown as Prisma.InputJsonValue,
      } as Prisma.InputJsonValue,
    },
  })

  const baseUrlResolution = resolveBookingsPublicBaseUrl()
  const url = `${baseUrlResolution.baseUrl}/reservas/continuar?token=${encodeURIComponent(token)}`
  return {
    secureLinkId,
    token,
    expiresAt: expiresAt.toISOString(),
    url,
    baseUrlSource: baseUrlResolution.source,
    baseHost: baseUrlResolution.host,
  }
}

export async function logSecureLinkSentResult(input: {
  secureLinkId: string
  ok: boolean
  reason: string | null
  provider: string
  messageId: string | null
  phoneE164: string
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      bookingRequestId: null,
      action: input.ok ? ACTION_SECURE_LINK_SENT_OK : ACTION_SECURE_LINK_SENT_FAILED,
      nextState: {
        secureLinkId: input.secureLinkId,
        sentAt: new Date().toISOString(),
        ok: input.ok,
        reason: input.reason,
        provider: input.provider,
        messageId: input.messageId,
        phoneMasked: maskPhone(input.phoneE164),
      },
    },
  })
}

export async function consumeSecureLinkToken(token: string): Promise<SecureLinkStatusView> {
  const normalized = token.trim()
  if (!normalized) {
    return {
      status: 'not_found',
      secureLinkId: null,
      expiresAt: null,
      verifiedAt: null,
      phoneE164: null,
      draft: null,
    }
  }

  const tokenHash = sha256Hex(normalized)
  const createdRecords = await loadCreatedSecureLinkRecords()
  const created = createdRecords.find((record) => record.tokenHash === tokenHash)

  if (!created) {
    return {
      status: 'not_found',
      secureLinkId: null,
      expiresAt: null,
      verifiedAt: null,
      phoneE164: null,
      draft: null,
    }
  }

  const status = await resolveSecureLinkStatusByCreatedRecord(created)
  if (status.status === 'expired' || status.status === 'not_found') {
    return status
  }

  await prisma.auditLog.create({
    data: {
      bookingRequestId: null,
      action: ACTION_SECURE_LINK_OPENED,
      nextState: {
        secureLinkId: created.secureLinkId,
        openedAt: new Date().toISOString(),
        phoneMasked: maskPhone(created.phoneE164),
      },
    },
  })

  if (status.status !== 'verified') {
    await prisma.auditLog.create({
      data: {
        bookingRequestId: null,
        action: ACTION_SECURE_LINK_VERIFIED,
        nextState: {
          secureLinkId: created.secureLinkId,
          phoneE164: created.phoneE164,
          verifiedAt: new Date().toISOString(),
        },
      },
    })
  }

  const verifiedStatus = await resolveSecureLinkStatusByCreatedRecord(created)
  return verifiedStatus
}

export async function isSecureLinkPhoneVerifiedRecently(phoneRaw: string): Promise<{
  ok: boolean
  reason: 'not_found' | 'not_verified' | 'expired' | null
}> {
  const ttlMinutes = getWhatsappSecureLinkTtlMinutesFromEnv()
  const since = new Date(Date.now() - ttlMinutes * 60 * 1000)
  const verifiedLogs = await prisma.auditLog.findMany({
    where: {
      bookingRequestId: null,
      action: ACTION_SECURE_LINK_VERIFIED,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      createdAt: true,
      nextState: true,
    },
    take: 200,
  })

  for (const log of verifiedLogs) {
    if (!log.nextState || typeof log.nextState !== 'object') continue
    const state = log.nextState as Record<string, unknown>
    const phoneE164 = typeof state.phoneE164 === 'string' ? state.phoneE164 : null
    if (!phoneE164) continue
    if (!phonesMatchVe(phoneE164, phoneRaw)) continue

    return { ok: true, reason: null }
  }

  const createdRecords = await loadCreatedSecureLinkRecords()
  const matchingCreated = createdRecords.find((record) => phonesMatchVe(record.phoneE164, phoneRaw))
  if (!matchingCreated) {
    return { ok: false, reason: 'not_found' }
  }

  const status = await resolveSecureLinkStatusByCreatedRecord(matchingCreated)
  if (status.status === 'expired') {
    return { ok: false, reason: 'expired' }
  }

  return { ok: false, reason: 'not_verified' }
}
