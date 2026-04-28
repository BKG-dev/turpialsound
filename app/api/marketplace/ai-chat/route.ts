import { generateText } from 'ai'
import { google } from '@ai-sdk/google'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// ─── Rate limiting ─────────────────────────────────────────────────────────────
// Cookie-based: max 8 AI calls per hour per browser session (demo protection).

const MAX_CALLS = 8
const WINDOW_MS = 60 * 60 * 1000

interface RateLimitState {
  count: number
  resetAt: number
}

// ─── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Eres "Turpial Assistant", el asistente virtual oficial de Turpial Market, el marketplace de equipos musicales y servicios de audio de Venezuela. Tu misión es ayudar a los compradores a conocer los productos y servicios disponibles en la plataforma.

IDENTIDAD: Tu nombre es Turpial Assistant. Eres amable, profesional y conciso. Siempre respondes en español.

REGLAS ABSOLUTAS — sin excepción alguna:

1. TEMÁTICA EXCLUSIVA: Solo hablas de equipos musicales (instrumentos, audio profesional, consolas, micrófonos, guitarras, bajos, baterías, sintetizadores, etc.), servicios musicales (grabación, mezcla, masterización, producción, músicos de sesión, bandas para eventos), y el funcionamiento de Turpial Market.

2. DATOS DE CONTACTO PROHIBIDOS: Nunca compartes ni solicitas teléfonos, correos electrónicos, redes sociales, WhatsApp u otras formas de contacto externo. Si alguien te pide esto, declinas amablemente y explicas que toda comunicación debe hacerse dentro de la plataforma por seguridad.

3. TRANSACCIONES INTERNAS: Nunca sugieres, facilitas ni validas transacciones fuera de Turpial Market. Si alguien lo propone, explicas que el sistema de escrow de la plataforma protege tanto al comprador como al vendedor.

4. TEMAS PROHIBIDOS TOTALES: Política, religión, conflictos sociales, programación informática (salvo equipos de audio/MIDI), medicamentos, finanzas especulativas, contenido adulto. Ante cualquier pregunta fuera de tema, dices cortésmente: "Lo siento, ese tema está fuera de mi área. ¿Puedo ayudarte con algún equipo o servicio musical?"

5. HONESTIDAD SOBRE LIMITACIONES: Si no conoces el stock exacto o detalles específicos de un artículo, dices: "Para información específica sobre este producto, te recomiendo contactar al vendedor directamente a través del chat de la plataforma."

6. BREVEDAD: Máximo 2-3 oraciones por respuesta. Directo y útil.`

// ─── POST handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── Rate limit check ─────────────────────────────────────────────────────────
  const cookieStore = await cookies()
  const raw = cookieStore.get('mp_ai_rl')?.value
  let rl: RateLimitState = { count: 0, resetAt: Date.now() + WINDOW_MS }

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as RateLimitState
      if (Date.now() < parsed.resetAt) {
        rl = parsed
      }
    } catch {
      // ignore malformed cookie
    }
  }

  if (rl.count >= MAX_CALLS) {
    return NextResponse.json(
      { error: 'Has alcanzado el límite de mensajes del demo. Regístrate para chatear sin límites.' },
      { status: 429 },
    )
  }

  // ── Parse body ───────────────────────────────────────────────────────────────
  let message = ''
  try {
    const body = (await req.json()) as { message?: unknown }
    message = String(body.message ?? '').trim().slice(0, 400)
  } catch {
    return NextResponse.json({ error: 'Request inválido' }, { status: 400 })
  }

  if (!message) {
    return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 })
  }

  // ── Guard: API key must exist ────────────────────────────────────────────────
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json({
      reply: 'El asistente AI no está configurado en este momento. Contáctanos directamente a través del chat de la plataforma.',
    })
  }

  // ── Generate response ────────────────────────────────────────────────────────
  try {
    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      system: SYSTEM_PROMPT,
      prompt: message,
      maxOutputTokens: 150,
      temperature: 0.6,
    })

    // Increment rate limit counter and set cookie
    rl.count += 1
    const response = NextResponse.json({ reply: text })
    response.cookies.set('mp_ai_rl', JSON.stringify(rl), {
      httpOnly: true,
      maxAge: 3600,
      path: '/',
      sameSite: 'strict',
    })
    return response
  } catch (err) {
    console.error('[Turpial Assistant]', err)
    return NextResponse.json({
      reply: 'No pude generar una respuesta en este momento. Por favor contacta al vendedor directamente a través del chat de la plataforma.',
    })
  }
}
