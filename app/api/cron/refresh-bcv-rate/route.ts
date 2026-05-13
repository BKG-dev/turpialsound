import { resolveReferenceRate } from '@/lib/marketplace/reference-rate'
import { isPeakWindow, markRefreshed, shouldRefresh, getScheduleDescription } from '@/lib/marketplace/bcv-scheduler'
import { NextResponse } from 'next/server'

/**
 * @route GET /api/cron/refresh-bcv-rate
 * @description Vercel Cron Job — refresca la tasa BCV según política dual (peak/off-peak)
 * @access Cron (Authorization header requerido en producción)
 */
export async function GET(request: Request) {
  const startTime = Date.now()

  // En producción, verificar CRON_SECRET para seguridad
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const schedule = getScheduleDescription()
  console.log(`[BCV-CRON] Triggered — ${schedule}`)

  if (!shouldRefresh()) {
    console.log('[BCV-CRON] Skipped — within refresh interval')
    return NextResponse.json({
      status: 'skipped',
      reason: 'within_refresh_interval',
      schedule,
      elapsedMs: Date.now() - startTime,
    })
  }

  try {
    const result = await resolveReferenceRate()

    markRefreshed()

    console.log(`[BCV-CRON] Refreshed — rate=${result.rate} mode=${result.mode} source=${result.source}`)

    return NextResponse.json({
      status: 'refreshed',
      rate: result.rate,
      mode: result.mode,
      source: result.source,
      fechaValor: result.fechaValor,
      snapshotId: result.snapshotId,
      schedule,
      elapsedMs: Date.now() - startTime,
    })
  } catch (error) {
    console.error('[BCV-CRON] Error:', error)
    return NextResponse.json(
      {
        status: 'error',
        error: (error as Error).message,
        schedule,
        elapsedMs: Date.now() - startTime,
      },
      { status: 500 },
    )
  }
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
