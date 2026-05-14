import { loadEnv, getEnv } from '../lib/env.mjs'
import { getPrisma, disconnectPrisma, findActiveListingsBySlug } from '../lib/db-read.mjs'
import { FailureCode } from '../lib/failures.mjs'

export const MODULE_ID = 'QA-03'
export const MODULE_NAME = 'Home Discovery'
export const LAYER = 'C'

const QA_LISTING_SLUG = 'qa-e2e-s03f-selleria-discovery'

async function checkViaHttp(appUrl, slug, title) {
  const checks = []
  const urls = [
    `${appUrl}/marketplace`,
    `${appUrl}/marketplace/${slug}`,
  ]

  for (const url of urls) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        redirect: 'follow',
        headers: { 'Accept': 'text/html' },
      })
      clearTimeout(timeout)

      if (!response.ok) {
        checks.push({
          check: `http_${url}`,
          status: 'FAIL',
          detail: `HTTP ${response.status}`,
        })
        continue
      }

      const html = await response.text()
      const foundBySlug = html.includes(slug)
      const foundByTitle = html.includes(title)

      if (foundBySlug || foundByTitle) {
        checks.push({
          check: `http_${url}`,
          status: 'PASS',
          detail: `UI_PASS: listing found in HTML${foundBySlug ? ' (by slug)' : ' (by title)'}`,
          foundBySlug,
          foundByTitle,
        })
      } else {
        checks.push({
          check: `http_${url}`,
          status: 'FAIL',
          detail: 'Listing not found in server-rendered HTML (may be client-rendered)',
          htmlLength: html.length,
        })
      }
    } catch (error) {
      checks.push({
        check: `http_${url}`,
        status: 'FAIL',
        detail: error.message,
      })
    }
  }

  return checks
}

async function checkViaDb(slug) {
  const prisma = await getPrisma()
  try {
    const listings = await findActiveListingsBySlug(slug)
    const exact = listings.find(l => l.slug === slug)

    if (exact) {
      const locationOk = exact.city && exact.state
      return {
        check: 'dbDiscovery',
        status: 'PASS',
        detail: `DATA_DISCOVERY_PASS: ${listings.length} active listing(s) found for slug pattern '${slug}'`,
        exactMatch: { id: exact.id, slug: exact.slug, status: exact.status, title: exact.title, category: exact.category, city: exact.city, state: exact.state, isLocationPublic: exact.isLocationPublic, inventory: exact.inventory },
        totalActive: listings.length,
        locationOk,
        locationDetail: locationOk ? `Location: ${exact.city}, ${exact.state}` : 'Location fields missing/empty',
      }
    }

    return {
      check: 'dbDiscovery',
      status: 'FAIL',
      detail: `No active listing found for slug '${slug}'. ${listings.length} similar listings found.`,
      totalActive: listings.length,
    }
  } catch (error) {
    return {
      check: 'dbDiscovery',
      status: 'FAIL',
      detail: error.message,
    }
  }
}

export async function run(report) {
  const startedAt = new Date().toISOString()
  report.addModule(MODULE_ID, 'RUNNING', { startedAt })
  const checks = []

  loadEnv()

  const appUrl = getEnv('APP_URL', 'http://localhost:3002')
  const listingSlug = QA_LISTING_SLUG
  const listingTitle = 'QA S03F sellerIA Discovery'

  // ── 1. Verify listing exists in DB (Layer B - data discovery) ─────────────
  let dbCheck
  try {
    dbCheck = await checkViaDb(listingSlug)
    checks.push(dbCheck)
  } catch (error) {
    dbCheck = { check: 'dbDiscovery', status: 'FAIL', detail: error.message }
    checks.push(dbCheck)
  }

  // ── 2. Try HTTP fetch for server-rendered discovery (Layer C - UI) ────────
  let httpChecks = []
  try {
    httpChecks = await checkViaHttp(appUrl, listingSlug, listingTitle)
    checks.push(...httpChecks)
  } catch (error) {
    checks.push({
      check: 'httpFetch',
      status: 'FAIL',
      detail: `HTTP fetch error: ${error.message}`,
    })
  }

  // ── 3. Classify result ────────────────────────────────────────────────────
  const dataPass = dbCheck && dbCheck.status === 'PASS'
  const uiPass = httpChecks.some(c => c.status === 'PASS')
  const browserRequired = httpChecks.some(c =>
    c.status === 'FAIL' && c.detail && c.detail.includes('client-rendered')
  )

  if (browserRequired && !uiPass) {
    checks.push({
      check: 'classification',
      status: 'PARTIAL',
      detail: 'BROWSER_REQUIRED — listing exists in DB (DATA_PASS) but not in server-rendered HTML. UI validation needs browser (Playwright/CDP).',
    })
  } else if (dataPass && uiPass) {
    checks.push({
      check: 'classification',
      status: 'PASS',
      detail: 'UI_PASS — listing visible in both DB and server-rendered HTML',
    })
  } else if (dataPass && !uiPass) {
    checks.push({
      check: 'classification',
      status: 'PASS',
      detail: 'DATA_DISCOVERY_PASS — listing confirmed in DB. UI check not conclusive (client-rendered or not reachable).',
    })
  } else {
    checks.push({
      check: 'classification',
      status: 'FAIL',
      detail: 'Listing not found in DB or UI',
    })
  }

  await disconnectPrisma()

  // ── Final status ──────────────────────────────────────────────────────────
  const hasFailures = checks.some(c => c.status === 'FAIL')
  const isPartial = browserRequired && !uiPass

  const finishedAt = new Date().toISOString()
  report.addModule(MODULE_ID, hasFailures ? 'FAIL' : 'PASS', {
    startedAt,
    finishedAt,
    durationMs: new Date(finishedAt).getTime() - new Date(startedAt).getTime(),
    failureCode: hasFailures ? FailureCode.LISTING_NOT_VISIBLE_HOME : null,
    failureDetail: hasFailures
      ? checks.find(c => c.status === 'FAIL')?.detail || 'Listing not visible'
      : null,
    checks,
  })

  return {
    ok: !hasFailures,
    dataPass,
    uiPass,
    browserRequired,
    classification:
      dataPass && uiPass ? 'UI_PASS'
        : dataPass && !uiPass ? 'DATA_DISCOVERY_PASS'
          : browserRequired ? 'BROWSER_REQUIRED'
            : 'NOT_FOUND',
  }
}
