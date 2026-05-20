import { resolveReferenceRate } from '@/lib/marketplace/reference-rate'
import { NextResponse } from 'next/server'

/**
 * @route GET /api/cron/refresh-bcv-rate
 * @description Vercel Cron Job — refresca tasa BCV. Schedule definido en vercel.json.
 *              La cadena de fallbacks de resolveReferenceRate maneja la resiliencia:
 *              Live → File → DB Snapshot (Fallback 3) → Unavailable.
 * @access Cron (Authorization header requerido si CRON_SECRET está configurado)
 */
export async function GET(request: Request) {
  const startTime = Date.now()

  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  console.log('[BCV-CRON] Triggered')

  try {
    const result = await resolveReferenceRate()

    console.log(`[BCV-CRON] rate=${result.rate} mode=${result.mode} source=${result.source}`)

    return NextResponse.json({
      status: 'ok',
      rate: result.rate,
      mode: result.mode,
      source: result.source,
      fechaValor: result.fechaValor,
      snapshotId: result.snapshotId,
      elapsedMs: Date.now() - startTime,
    })
  } catch (error) {
    console.error('[BCV-CRON] Error:', error)
    return NextResponse.json(
      {
        status: 'error',
        error: (error as Error).message,
        elapsedMs: Date.now() - startTime,
      },
      { status: 500 },
    )
  }
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
