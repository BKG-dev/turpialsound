import { resolveReferenceRate } from '@/lib/bookings/reference-rate'

export async function GET() {
  const result = await resolveReferenceRate()
  const cacheControl =
    result.mode === 'live'
      ? 'public, s-maxage=300, stale-while-revalidate=120'
      : 'public, s-maxage=60, stale-while-revalidate=60'

  return Response.json(result, { headers: { 'Cache-Control': cacheControl } })
}
