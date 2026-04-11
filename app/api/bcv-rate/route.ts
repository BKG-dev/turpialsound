/**
 * BCV Rate Route Handler
 *
 * Fetches the official USD→Bs rate from bcv.org.ve.
 * Uses Node.js `https` module (not global fetch) because the BCV server
 * has an incomplete SSL certificate chain that triggers
 * UNABLE_TO_VERIFY_LEAF_SIGNATURE in Node.js's strict TLS verifier.
 * curl and browsers accept it; Node.js fetch/undici do not.
 * rejectUnauthorized:false is safe here — we only READ a public number.
 *
 * Cache strategy: module-level variable (1 h TTL).
 * Fallback: stale cache → hardcoded constant.
 */

import https from 'https'

const CACHE_TTL_MS    = 60 * 60 * 1000  // 1 hour
const FETCH_TIMEOUT_MS = 7_000
const FALLBACK_RATE    = 50              // update periodically if BCV is persistently down

interface RateCache {
  rate: number
  fetchedAt: number
}

let cache: RateCache | null = null

/* ── Fetch raw HTML from BCV ──────────────────────────────────── */
function fetchBcvHtml(): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      'https://www.bcv.org.ve/',
      {
        rejectUnauthorized: false, // BCV cert chain incomplete — intentional bypass
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,text/plain',
          'Accept-Language': 'es-VE,es;q=0.9',
          Connection: 'close',
        },
      },
      (res) => {
        if (!res.statusCode || res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}`))
          res.resume()
          return
        }
        const chunks: Buffer[] = []
        res.on('data', (chunk: Buffer) => chunks.push(chunk))
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
        res.on('error', reject)
      },
    )

    req.setTimeout(FETCH_TIMEOUT_MS, () => {
      req.destroy(new Error('BCV request timed out'))
    })

    req.on('error', reject)
  })
}

/* ── Parse USD rate from HTML ─────────────────────────────────── */
function parseRate(html: string): number {
  /**
   * BCV HTML structure (confirmed April 2026):
   * <div id="dolar" class="col-sm-12 col-xs-12 ">
   *   <div class="field-content">
   *     <div class="row recuadrotsmc">
   *       <div class="col-sm-6 col-xs-6">
   *         <img ...> <span> USD</span>
   *       </div>
   *       <div class="col-sm-6 col-xs-6 centrado">
   *         <strong> 474,05980000 </strong>   ← target
   *       </div>
   *     </div>
   *   </div>
   * </div>
   */
  const match = html.match(/id="dolar"[\s\S]*?<strong[^>]*>\s*([\d.,]+)\s*<\/strong>/)
  if (!match) throw new Error('USD rate pattern not found in BCV HTML')

  // Venezuelan locale: comma = decimal separator, dot = thousands separator
  const raw = match[1].trim().replace(/\./g, '').replace(',', '.')
  const rate = parseFloat(raw)
  if (!isFinite(rate) || rate < 1) throw new Error(`Invalid parsed rate: "${raw}"`)
  return rate
}

/* ── Route Handler ────────────────────────────────────────────── */
export async function GET() {
  // Serve from module-level cache if still fresh
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return Response.json(
      { rate: cache.rate, isFallback: false, source: 'cache' },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300' } },
    )
  }

  try {
    const html = await fetchBcvHtml()
    const rate = parseRate(html)
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
