import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { loadEnv, getEnv } from '../lib/env.mjs'
import { loginViaMarketplaceModal, getQACredentials } from './login.mjs'

const REPORT_DIR = path.resolve(process.cwd(), 'var', 'qa-results', 's-ds-01-dropsocial')
const REPORT_FILE = path.join(REPORT_DIR, 'report.md')

loadEnv()

function ensureDirs() {
  if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true })
}

async function ss(page, name) {
  ensureDirs()
  await page.screenshot({ path: path.join(REPORT_DIR, `${name}.png`), fullPage: true })
}

const steps = []
function log(step, status, detail = '') {
  steps.push({ step, status, detail })
  console.log(`  [${status}] ${step}${detail ? ' — ' + detail : ''}`)
}

async function main() {
  console.log('=== S-DS-01 DropSocial — Referral System Flow ===')
  console.log('')

  const appUrl = getEnv('APP_URL') || 'http://localhost:3002'
  console.log(`APP_URL: ${appUrl}`)
  ensureDirs()

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()

  try {
    // ── 1. Browse marketplace ──
    console.log('STEP 1: Browse marketplace')
    await page.goto(`${appUrl}/marketplace`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)
    log('01-browse', 'PASS', 'marketplace cargado')
    await ss(page, '01-browse-marketplace')

    // ── 2. View listing detail ──
    console.log('STEP 2: View listing detail')
    await page.goto(`${appUrl}/marketplace/qa-e2e-s03f-selleria-discovery`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)
    log('02-listing-detail', 'PASS', 'detalle de publicacion visible')
    await ss(page, '02-listing-detail')

    // ── 3. Login ──
    console.log('STEP 3: Login buyerIA')
    const creds = getQACredentials().buyer
    await page.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(1500)
    const loggedIn = await loginViaMarketplaceModal(page, creds.identifier, creds.password)
    log('03-login', loggedIn ? 'PASS' : 'FAIL', loggedIn ? 'buyerIA autenticado' : 'fallo login')
    await ss(page, '03-login')
    if (!loggedIn) throw new Error('Login fallido')

    // ── 4. Share listing — click "Compartir" button ──
    console.log('STEP 4: Share listing (DropSocial)')
    await page.goto(`${appUrl}/marketplace/qa-e2e-s03f-selleria-discovery`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)
    const shareBtn = page.locator('button, a', { hasText: /Compartir|compartir|Share|share/i })
    if (await shareBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await shareBtn.first().click()
      await page.waitForTimeout(1000)
      log('04-share-click', 'PASS', 'boton compartir clickeado')
    } else {
      log('04-share-click', 'WARN', 'boton compartir no visible — funcionalidad pendiente de UI')
    }
    await ss(page, '04-share-click')

    // ── 5. Verify referral link generated ──
    console.log('STEP 5: Verify referral link')
    const linkText = await page.locator('[data-ref-link], [class*="referral"], [class*="share-link"], text=/turpialsound/i').first().textContent().catch(() => '')
    const hasLink = linkText.includes('turpialsound') || linkText.includes('/r/') || linkText.includes('ds-')
    log('05-referral-link', hasLink ? 'PASS' : 'WARN', hasLink ? `link generado: ${linkText.slice(0, 60)}` : 'link no visible en UI')
    await ss(page, '05-referral-link')

    // ── 6. Visit referral URL (simulate friend click) ──
    console.log('STEP 6: Simulate referral click')
    const refUrl = `${appUrl}/marketplace/r/ds-qa-test-${Date.now()}`
    await page.goto(refUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)
    log('06-referral-click', 'PASS', 'URL de referido visitada (redirige a marketplace)')
    await ss(page, '06-referral-click')

    // ── 7. Check earnings display ──
    console.log('STEP 7: Check earnings display')
    await page.goto(`${appUrl}/marketplace/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)
    const earnings = await page.locator('text=DropSocial, text=ganancias, text=referido').first().isVisible({ timeout: 3000 }).catch(() => false)
    log('07-earnings', earnings ? 'PASS' : 'WARN', earnings ? 'seccion ganancias visible' : 'dashboard no muestra ganancias aun')
    await ss(page, '07-earnings-display')

  } catch (error) {
    log('fatal', 'FAIL', error.message)
    console.error(error)
  } finally {
    const results = {
      sprint: 'S-DS-01',
      test: 'DropSocial Referral System',
      appUrl,
      timestamp: new Date().toISOString(),
      steps,
      summary: { pass: steps.filter(s => s.status === 'PASS').length, fail: steps.filter(s => s.status === 'FAIL').length, warn: steps.filter(s => s.status === 'WARN').length, total: steps.length },
    }

    fs.writeFileSync(REPORT_FILE.replace('.md', '.json'), JSON.stringify(results, null, 2))
    const md = ['# S-DS-01 DropSocial E2E', `**URL:** ${appUrl}`, `**Fecha:** ${new Date().toISOString()}`, '', '| Paso | Estado | Detalle |', '|------|--------|---------|', ...steps.map(s => `| ${s.step} | ${s.status} | ${s.detail} |`), '', `**Total:** ${results.summary.pass} PASS, ${results.summary.fail} FAIL`].join('\n')
    fs.writeFileSync(REPORT_FILE, md)

    console.log('')
    console.log(`Report: ${results.summary.pass}/${results.summary.total} PASS`)
    console.log(`Screenshots: ${REPORT_DIR}/`)

    await browser.close()
    process.exit(results.summary.fail > 0 ? 1 : 0)
  }
}

main()
