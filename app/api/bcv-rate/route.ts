/**
 * BCV Rate Route Handler — uses pydolarvenezuela as the data source.
 * Module-level cache with 1h TTL; hardcoded fallback if API fails.
 */

const CACHE_TTL_MS  = 60 * 60 * 1000
const FALLBACK_RATE = 50
const API_URL = 'https://pydolarvenezuela-api.vercel.app/api/v1/dollar/page?page=bcv'

interface RateCache { rate: number; fetchedAt: number }

let cache: RateCache | null = null

async function fetchBcvRate(): Promise<number> {
  const res = await fetch(API_URL, { cache: 'no-store' })
  if (!res.ok) throw new Error(`pydolarvenezuela HTTP ${res.status}`)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json = await res.json() as any

  // Shape: { monitors: { bcv|BCV: { price: number } } }
  const monitor = json?.monitors?.bcv ?? json?.monitors?.BCV
  const price = monitor?.price ?? json?.price
  if (typeof price !== 'number' || !isFinite(price) || price < 1) {
    throw new Error(`Unexpected response shape: ${JSON.stringify(json).slice(0, 120)}`)
  }
  return price
}

export async function GET() {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return Response.json(
      { rate: cache.rate, isFallback: false, source: 'cache' },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300' } },
    )
  }

  try {
    const rate = await fetchBcvRate()
    cache = { rate, fetchedAt: Date.now() }
    return Response.json(
      { rate, isFallback: false, source: 'live' },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300' } },
    )
  } catch (err) {
    const fallbackRate = cache?.rate ?? FALLBACK_RATE
    const source = cache ? 'stale-cache' : 'hardcoded'
    console.error('[bcv-rate] fetch failed, using', source, '—', (err as Error).message)
    return Response.json(
      { rate: fallbackRate, isFallback: true, source },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60' } },
    )
  }
}
