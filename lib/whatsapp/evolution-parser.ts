import { normalizeVePhoneCandidates, normalizeWhatsappText } from '@/lib/whatsapp/normalize'

export interface ParsedEvolutionInboundMessage {
  event: string | null
  instance: string | null
  messageId: string
  fromNormalized: string
  textNormalized: string
  timestamp: string | null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function normalizeRemoteJid(remoteJid: string | null): string {
  if (!remoteJid) return ''
  const beforeAt = remoteJid.split('@', 1)[0] ?? ''
  return normalizeVePhoneCandidates(beforeAt)[0] ?? ''
}

function normalizeMessageText(message: Record<string, unknown> | null): string {
  if (!message) return ''
  const conversation = asString(message.conversation) ?? ''
  const extendedText = asString(asRecord(message.extendedTextMessage)?.text) ?? ''
  const rawText = conversation || extendedText
  return normalizeWhatsappText(rawText)
}

export function parseEvolutionInboundMessage(payload: unknown): ParsedEvolutionInboundMessage | null {
  const root = asRecord(payload)
  if (!root) return null

  const data = asRecord(root.data)
  const key = asRecord(data?.key)
  const message = asRecord(data?.message)

  const messageId = asString(key?.id)
  const fromNormalized = normalizeRemoteJid(asString(key?.remoteJid))
  const textNormalized = normalizeMessageText(message)

  if (!messageId || !fromNormalized || !textNormalized) return null

  return {
    event: asString(root.event),
    instance: asString(root.instance),
    messageId,
    fromNormalized,
    textNormalized,
    timestamp: asString(data?.messageTimestamp),
  }
}
