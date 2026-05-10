import { NextRequest, NextResponse } from 'next/server'
import { parseEvolutionInboundMessage } from '@/lib/whatsapp/evolution-parser'
import { processWhatsappLabInboundMessage } from '@/lib/whatsapp/lab-token-store'

function isEvolutionWebhookEnabled(): boolean {
  return process.env.EVOLUTION_WEBHOOK_ENABLED?.trim().toLowerCase() === 'true'
}

export async function POST(request: NextRequest) {
  if (!isEvolutionWebhookEnabled()) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const expectedSecret = process.env.EVOLUTION_WEBHOOK_SECRET?.trim() ?? ''
  const receivedSecret = request.headers.get('x-evolution-secret')?.trim() ?? ''

  if (!expectedSecret || receivedSecret !== expectedSecret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = parseEvolutionInboundMessage(payload)
  if (!parsed) {
    return NextResponse.json({ ok: true, processedMessages: 0 }, { status: 200 })
  }

  const expectedInstance = process.env.EVOLUTION_INSTANCE_NAME?.trim() ?? ''
  if (expectedInstance && parsed.instance && parsed.instance !== expectedInstance) {
    return NextResponse.json({ ok: true, processedMessages: 0 }, { status: 200 })
  }

  await processWhatsappLabInboundMessage({
    provider: 'evolution',
    messageId: parsed.messageId,
    fromNormalized: parsed.fromNormalized,
    textNormalized: parsed.textNormalized,
    phoneNumberIdOrInstance: parsed.instance,
    timestamp: parsed.timestamp,
  })

  return NextResponse.json({ ok: true, processedMessages: 1 }, { status: 200 })
}
