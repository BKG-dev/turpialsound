import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import { NextRequest, NextResponse } from 'next/server'
import {
  AssistantMessage,
  buildMarketplaceAssistantPrompt,
  MARKETPLACE_ASSISTANT_SYSTEM_PROMPT,
  SAFE_REFUSAL,
  shouldRefuseMarketplaceAssistantInput,
} from '@/lib/marketplace/assistant-knowledge'

const MAX_INPUT_LENGTH = 700
const MAX_MESSAGES = 8
const MAX_TOTAL_CHARS = 2400
const MAX_CALLS = 12
const WINDOW_MS = 60 * 60 * 1000
const RATE_LIMIT_COOKIE = 'mp_public_assistant_rl'
const MODEL_TIMEOUT_MS = 8000
const SAFE_FALLBACK_REPLY =
  'Puedo ayudarte con compras, ventas, ubicacion publica y uso del marketplace. Si quieres, preguntame por filtros visibles, flujo de compra o alcance del marketplace.'

type RateLimitState = {
  count: number
  resetAt: number
}

type IncomingMessage = {
  role?: unknown
  content?: unknown
}

const inMemoryRateLimit = new Map<string, RateLimitState>()

function isAssistantEnabled(): boolean {
  return process.env.MARKETPLACE_ASSISTANT_ENABLED?.trim().toLowerCase() !== 'false'
}

function getClientKey(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const realIp = req.headers.get('x-real-ip')?.trim()
  return forwarded || realIp || 'anonymous'
}

function parseRateLimit(raw: string | undefined): RateLimitState | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as RateLimitState
    if (
      typeof parsed.count === 'number' &&
      typeof parsed.resetAt === 'number' &&
      Number.isFinite(parsed.count) &&
      Number.isFinite(parsed.resetAt)
    ) {
      return parsed
    }
  } catch {
    return null
  }
  return null
}

function readRateLimit(req: NextRequest): RateLimitState {
  const now = Date.now()
  const cookieState = parseRateLimit(req.cookies.get(RATE_LIMIT_COOKIE)?.value)
  if (cookieState && cookieState.resetAt > now) {
    return cookieState
  }

  const memoryState = inMemoryRateLimit.get(getClientKey(req))
  if (memoryState && memoryState.resetAt > now) {
    return memoryState
  }

  return { count: 0, resetAt: now + WINDOW_MS }
}

function writeRateLimit(req: NextRequest, response: NextResponse, state: RateLimitState) {
  inMemoryRateLimit.set(getClientKey(req), state)
  response.cookies.set(RATE_LIMIT_COOKIE, JSON.stringify(state), {
    httpOnly: true,
    maxAge: Math.ceil((state.resetAt - Date.now()) / 1000),
    path: '/',
    sameSite: 'strict',
  })
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, MAX_INPUT_LENGTH) : ''
}

function normalizeMessages(body: unknown): AssistantMessage[] | null {
  if (!body || typeof body !== 'object') return null
  const payload = body as { text?: unknown; message?: unknown; messages?: unknown }
  const rawText = normalizeText(payload.text ?? payload.message)

  if (rawText) {
    return [{ role: 'user', content: rawText }]
  }

  if (!Array.isArray(payload.messages)) return null

  const incoming = payload.messages.slice(-MAX_MESSAGES) as IncomingMessage[]
  const messages: AssistantMessage[] = []

  for (const message of incoming) {
    const role = message.role
    const content = normalizeText(message.content)
    if ((role !== 'user' && role !== 'assistant') || !content) {
      return null
    }
    messages.push({ role, content })
  }

  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    return null
  }

  const totalChars = messages.reduce((sum, message) => sum + message.content.length, 0)
  return totalChars <= MAX_TOTAL_CHARS ? messages : null
}

function jsonError(message: string, status: number, code: string) {
  return NextResponse.json({ error: message, code }, { status })
}

function logAssistantError(stage: string, error: unknown) {
  if (error instanceof Error) {
    console.error(`[marketplace-assistant] ${stage}: ${error.name}: ${error.message}`)
    return
  }

  console.error(`[marketplace-assistant] ${stage}: unknown error`)
}

export async function POST(req: NextRequest) {
  if (!isAssistantEnabled()) {
    return jsonError('El asistente publico no esta disponible en este momento.', 503, 'ASSISTANT_DISABLED')
  }

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return jsonError('El asistente publico no esta configurado en este momento.', 503, 'ASSISTANT_NOT_CONFIGURED')
  }

  const rateLimit = readRateLimit(req)
  if (rateLimit.count >= MAX_CALLS) {
    const response = NextResponse.json(
      {
        error: 'Has alcanzado el limite de mensajes por ahora. Intenta mas tarde.',
        code: 'RATE_LIMITED',
        retryAfter: Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
      },
      { status: 429 },
    )
    writeRateLimit(req, response, rateLimit)
    return response
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonError('Solicitud invalida.', 400, 'INVALID_JSON')
  }

  const messages = normalizeMessages(body)
  if (!messages) {
    return jsonError('Mensaje invalido o demasiado largo.', 400, 'INVALID_PAYLOAD')
  }

  const userText = messages
    .filter((message) => message.role === 'user')
    .map((message) => message.content)
    .join('\n')

  if (shouldRefuseMarketplaceAssistantInput(userText)) {
    const response = NextResponse.json({ reply: SAFE_REFUSAL, kind: 'refusal' })
    writeRateLimit(req, response, { ...rateLimit, count: rateLimit.count + 1 })
    return response
  }

  try {
    const model = process.env.MARKETPLACE_ASSISTANT_MODEL?.trim() || 'gemini-2.5-flash'
    const abortController = new AbortController()
    const timeoutId = setTimeout(() => abortController.abort(), MODEL_TIMEOUT_MS)

    let text = ''
    try {
      const result = await generateText({
        model: google(model),
        system: MARKETPLACE_ASSISTANT_SYSTEM_PROMPT,
        prompt: buildMarketplaceAssistantPrompt(messages),
        maxOutputTokens: 900,
        temperature: 0.3,
        abortSignal: abortController.signal,
      })
      text = result.text
    } finally {
      clearTimeout(timeoutId)
    }

    const response = NextResponse.json({
      reply: text.trim() || 'Puedo ayudarte con el funcionamiento general del marketplace.',
      kind: 'answer',
    })
    writeRateLimit(req, response, { ...rateLimit, count: rateLimit.count + 1 })
    return response
  } catch (error) {
    logAssistantError('generation_failed', error)
    const response = NextResponse.json({
      reply: SAFE_FALLBACK_REPLY,
      kind: 'answer',
      code: 'ASSISTANT_FALLBACK',
    })
    writeRateLimit(req, response, { ...rateLimit, count: rateLimit.count + 1 })
    return response
  }
}
