export interface ParsedWhatsappTextMessage {
  messageId: string
  from: string
  timestamp: string | null
  textBody: string
  phoneNumberId: string | null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function parseWhatsappTextMessages(payload: unknown): ParsedWhatsappTextMessage[] {
  const root = asRecord(payload)
  if (!root) return []

  const entries = asArray(root.entry)
  const result: ParsedWhatsappTextMessage[] = []

  for (const entry of entries) {
    const entryRecord = asRecord(entry)
    if (!entryRecord) continue

    const changes = asArray(entryRecord.changes)
    for (const change of changes) {
      const changeRecord = asRecord(change)
      if (!changeRecord) continue

      const value = asRecord(changeRecord.value)
      if (!value) continue

      const phoneNumberId = asString(asRecord(value.metadata)?.phone_number_id) ?? null
      const messages = asArray(value.messages)
      for (const message of messages) {
        const messageRecord = asRecord(message)
        if (!messageRecord) continue

        const messageId = asString(messageRecord.id)
        const from = asString(messageRecord.from)
        const timestamp = asString(messageRecord.timestamp)
        const textBody = asString(asRecord(messageRecord.text)?.body)

        if (!messageId || !from || !textBody) continue
        result.push({
          messageId,
          from,
          timestamp,
          textBody,
          phoneNumberId,
        })
      }
    }
  }

  return result
}
