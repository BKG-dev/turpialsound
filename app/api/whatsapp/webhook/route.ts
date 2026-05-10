import { NextRequest, NextResponse } from 'next/server'
import { verifyMetaSignature } from '@/lib/whatsapp/meta-signature'
import { parseWhatsappTextMessages } from '@/lib/whatsapp/webhook-parser'
import { processInboundTextMessage } from '@/lib/whatsapp/lab-token-store'

function isLabEnabled(): boolean {
  return process.env.WHATSAPP_LAB_ENABLED?.trim().toLowerCase() === 'true'
}

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('hub.mode')?.trim()
  const verifyToken = request.nextUrl.searchParams.get('hub.verify_token')?.trim()
  const challenge = request.nextUrl.searchParams.get('hub.challenge')?.trim() ?? ''
  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim() ?? ''

  if (mode === 'subscribe' && expectedToken && verifyToken === expectedToken) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  }

  return NextResponse.json({ error: 'forbidden' }, { status: 403 })
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const appSecret = process.env.WHATSAPP_APP_SECRET?.trim() ?? ''
  const signatureHeader = request.headers.get('x-hub-signature-256')

  if (appSecret) {
    const valid = verifyMetaSignature({
      appSecret,
      rawBody,
      signatureHeader,
    })
    if (!valid) {
      return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })
    }
  } else if (!isLabEnabled()) {
    return NextResponse.json({ error: 'missing_app_secret' }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  const messages = parseWhatsappTextMessages(payload)

  await Promise.all(
    messages.map((message) =>
      processInboundTextMessage({
        messageId: message.messageId,
        fromRaw: message.from,
        textRaw: message.textBody,
        phoneNumberId: message.phoneNumberId,
        timestamp: message.timestamp,
      }),
    ),
  )

  return NextResponse.json(
    {
      ok: true,
      processedMessages: messages.length,
      warning: appSecret ? null : 'WHATSAPP_APP_SECRET missing; allowed only in lab mode.',
    },
    { status: 200 },
  )
}
