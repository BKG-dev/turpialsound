import { resolveReferenceRate } from '@/lib/marketplace/reference-rate'
import { NextResponse } from 'next/server'

/**
 * @route GET /api/bcv-rate
 * @description Returns the current BCV reference rate
 * @access Public
 */
export async function GET() {
  try {
    const result = await resolveReferenceRate()
    
    return NextResponse.json({
      rate: result.rate,
      mode: result.mode,
      source: result.source,
      asOf: result.asOf,
      isFallback: result.mode === 'fallback'
    }, {
      headers: {
        // Cache for 15 minutes, revalidate every minute
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=60'
      }
    })
  } catch (error) {
    console.error('[BCV-RATE]', error)
    return NextResponse.json(
      { error: 'Error retrieving BCV rate', isFallback: true, rate: Number(process.env.BCV_FALLBACK_RATE) || 50 },
      { status: 500 }
    )
  }
}
