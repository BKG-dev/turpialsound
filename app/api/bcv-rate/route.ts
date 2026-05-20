import { resolveReferenceRate, readLastValidReferenceSnapshot } from '@/lib/marketplace/reference-rate'
import { NextResponse } from 'next/server'

const STALE_THRESHOLD_MS = 60 * 60 * 1000 // 1 hour

/**
 * @route GET /api/bcv-rate
 * @description Returns the current BCV reference rate.
 *              Fast path: if last DB snapshot is < 1h old, returns it directly.
 *              Slow path: if stale, fetches fresh rate from providers.
 * @access Public
 */
export async function GET() {
  try {
    const lastSnapshot = await readLastValidReferenceSnapshot()

    if (lastSnapshot && lastSnapshot.rate > 0) {
      const ageMs = Date.now() - new Date(lastSnapshot.fechaValor).getTime()
      if (ageMs < STALE_THRESHOLD_MS) {
        return NextResponse.json({
          rate: lastSnapshot.rate,
          mode: 'live',
          source: lastSnapshot.source,
          asOf: lastSnapshot.asOf,
          isFallback: false,
        }, {
          headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=120' },
        })
      }
    }

    const result = await resolveReferenceRate()

    const cacheControl =
      result.mode === 'live'
        ? 'public, s-maxage=300, stale-while-revalidate=120'
        : 'public, s-maxage=60, stale-while-revalidate=60'

    return NextResponse.json({
      rate: result.rate,
      mode: result.mode,
      source: result.source,
      asOf: result.asOf,
      isFallback: result.mode !== 'live',
    }, {
      headers: { 'Cache-Control': cacheControl },
    })
  } catch (error) {
    console.error('[BCV-RATE]', error)
    return NextResponse.json(
      { error: 'Error retrieving BCV rate', isFallback: true, rate: Number(process.env.BCV_FALLBACK_RATE) || 50 },
      { status: 500 },
    )
  }
}
