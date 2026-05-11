import { loadEnv } from '../lib/env.mjs'
import { getPrisma, disconnectPrisma } from '../lib/db-read.mjs'

const APP_URL = 'https://turpialsound-qc6k39eh1-bkgs-projects-829c67c1.vercel.app'
const LISTING_SLUG = 'qa-e2e-s03f-selleria-discovery'

async function run() {
  const checks = []
  loadEnv()
  console.log('=== S09 Discovery Publico & SEO (Manuel) ===\n')

  // 1. Marketplace home page
  let homeHtml = ''
  const homeResp = await fetch(`${APP_URL}/marketplace`).catch(() => null)
  const homeOk = homeResp?.ok
  if (homeResp) homeHtml = await homeResp.text()
  checks.push({ check: 'homePage', ok: homeOk, detail: `HTTP ${homeResp?.status}, ${homeHtml.length}B` })
  console.log(`[${homeOk ? 'PASS' : 'FAIL'}] Home: ${homeOk}`)

  // 2. SEO
  const seoTitle = homeHtml.includes('<title>')
  const seoLd = homeHtml.includes('application/ld+json')
  const seoMeta = homeHtml.includes('name="description"')
  checks.push({ check: 'seoTitle', ok: seoTitle, detail: 'title' })
  checks.push({ check: 'seoJsonLd', ok: seoLd, detail: 'ld+json' })
  checks.push({ check: 'seoMeta', ok: seoMeta, detail: 'description' })
  console.log(`[${seoTitle ? 'PASS' : 'FAIL'}] Title [${seoLd ? 'PASS' : 'FAIL'}] JSON-LD [${seoMeta ? 'PASS' : 'FAIL'}] Meta`)

  // 3. Listing detail
  const detailResp = await fetch(`${APP_URL}/marketplace/${LISTING_SLUG}`).catch(() => null)
  const detailOk = detailResp?.ok
  checks.push({ check: 'listingDetail', ok: detailOk, detail: `HTTP ${detailResp?.status}` })
  console.log(`[${detailOk ? 'PASS' : 'FAIL'}] Detail: ${detailOk}`)

  // 4. Categories
  const catResp = await fetch(`${APP_URL}/marketplace?category=instrumentos-nuevos`).catch(() => null)
  checks.push({ check: 'categoryPage', ok: catResp?.ok, detail: `HTTP ${catResp?.status}` })

  // 5. DB stats
  const prisma = await getPrisma()
  const total = await prisma.mpListing.count()
  const active = await prisma.mpListing.count({ where: { status: 'ACTIVE' } })
  const sold = await prisma.mpListing.count({ where: { status: 'SOLD_OUT' } })
  checks.push({ check: 'dbListings', ok: total > 0, detail: `${total}T / ${active}A / ${sold}S` })
  console.log(`[PASS] DB: ${total} total, ${active} active, ${sold} sold`)

  const cats = await prisma.mpListing.groupBy({ by: ['category'], _count: true })
  console.log(`[INFO] Categories: ${cats.map(c => `${c.category}=${c._count}`).join(', ')}`)

  // 6. Public access
  const pub = homeOk && detailOk
  checks.push({ check: 'publicAccess', ok: pub, detail: pub ? 'Open' : 'Restricted' })
  console.log(`[${pub ? 'PASS' : 'FAIL'}] Public: ${pub}`)

  // 7. Listing on home
  const onHome = homeHtml.includes(LISTING_SLUG)
  checks.push({ check: 'listingOnHome', ok: onHome, detail: onHome ? 'Visible' : 'Client-rendered' })
  console.log(`[${onHome ? 'PASS' : 'FAIL'}] On home: ${onHome}`)

  await disconnectPrisma()

  const passed = checks.filter(c => c.ok).length
  console.log(`\n${passed}/${checks.length} PASS`)
  console.log(passed === checks.length ? 'S09 PASS' : 'S09 PARTIAL')
}

run().catch(console.error)
