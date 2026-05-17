import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { loadEnv, getEnv } from '../lib/env.mjs'
import { loginViaMarketplaceModal, getQACredentials } from './login.mjs'

const REPORT_DIR = path.resolve(process.cwd(), 'var', 'qa-results', 's15-location-filters')
const REPORT_FILE = path.join(REPORT_DIR, 'report.md')

loadEnv()

function ensureDirs() {
  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true })
  }
}

async function ss(page, name) {
  ensureDirs()
  const filePath = path.join(REPORT_DIR, `${name}.png`)
  await page.screenshot({ path: filePath, fullPage: true })
  return filePath
}

const steps = []
function log(step, status, detail = '') {
  steps.push({ step, status, detail })
  const icon = status === 'PASS' ? 'PASS' : status === 'FAIL' ? 'FAIL' : '--'
  console.log(`  [${icon}] ${step}${detail ? ` — ${detail}` : ''}`)
}

async function main() {
  console.log('=== S15 — Location Filters + Inventory Playwright Test ===')
  console.log('')

  const appUrl = getEnv('APP_URL') || 'http://localhost:3002'
  console.log(`APP_URL: ${appUrl}`)
  ensureDirs()

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()

  try {
    // ── 1. Login como seller ──
    console.log('1. Login sellerIA...')
    const creds = getQACredentials().seller
    await page.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)
    const loggedIn = await loginViaMarketplaceModal(page, creds.identifier, creds.password)
    log('sellerLogin', loggedIn ? 'PASS' : 'FAIL', loggedIn ? 'sellerIA autenticado' : 'no se pudo autenticar')
    await ss(page, '01-logged-in')
    if (!loggedIn) throw new Error('Login fallido')

    // ── 2. Navegar a /marketplace ──
    console.log('2. Navegar a /marketplace...')
    await page.goto(`${appUrl}/marketplace`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)
    const marketplaceVisible = await page.locator('text=Marketplace').first().isVisible().catch(() => false)
    log('marketplaceLoad', marketplaceVisible ? 'PASS' : 'FAIL', marketplaceVisible ? 'pagina cargada' : 'no visible')
    await ss(page, '02-marketplace')

    // ── 3. Probar filtro de estado ──
    console.log('3. Probar filtro de estado...')
    const filtersBtn = page.locator('button', { hasText: /Filtros|filtros/i })
    if (await filtersBtn.isVisible().catch(() => false)) {
      await filtersBtn.click()
      await page.waitForTimeout(500)
      log('filterPanel', 'PASS', 'panel de filtros abierto')
    } else {
      log('filterPanel', 'FAIL', 'boton filtros no visible')
    }

    const stateInput = page.locator('input[placeholder*="Estado"]')
    if (await stateInput.isVisible().catch(() => false)) {
      await stateInput.fill('Caracas')
      await page.waitForTimeout(1000)
      log('stateFilter', 'PASS', 'filtro estado aplicado: Caracas')
    } else {
      log('stateFilter', 'FAIL', 'input estado no visible')
    }
    await ss(page, '03-state-filter')

    // ── 4. Probar filtro de ciudad ──
    console.log('4. Probar filtro de ciudad...')
    const cityInput = page.locator('input[placeholder*="Ciudad"]')
    if (await cityInput.isVisible().catch(() => false)) {
      await cityInput.fill('Caracas')
      await page.waitForTimeout(1000)
      log('cityFilter', 'PASS', 'filtro ciudad aplicado: Caracas')
    } else {
      log('cityFilter', 'FAIL', 'input ciudad no visible')
    }
    await ss(page, '04-city-filter')

    // ── 5. Navegar a SEO route ──
    console.log('5. SEO route /marketplace/venezuela/distrito-capital/caracas...')
    await page.goto(`${appUrl}/marketplace/venezuela/distrito-capital/caracas`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)
    const seoVisible = await page.locator('text=Caracas').first().isVisible().catch(() => false)
    const seoLoading = await page.locator('text=Distrito Capital').first().isVisible().catch(() => false)
    log('seoRoute', (seoVisible || seoLoading) ? 'PASS' : 'FAIL', seoVisible ? 'pagina SEO cargada con Caracas' : 'metadata visible')
    await ss(page, '05-seo-route')

    // ── 6. Verificar metadatos SEO ──
    console.log('6. Verificar metadatos SEO...')
    const title = await page.title()
    const hasLocation = title.toLowerCase().includes('caracas')
    log('seoTitle', hasLocation ? 'PASS' : 'FAIL', `titulo: "${title}"`)
    log('seoTitleHasLocation', hasLocation ? 'PASS' : 'FAIL', hasLocation ? 'Caracas en titulo' : 'no encontrado')

  } catch (error) {
    log('fatal', 'FAIL', error.message)
    console.error(error)
  } finally {
    // ── Report ──
    const results = {
      sprint: 'S15',
      test: 'Location Filters + Inventory Playwright',
      appUrl,
      timestamp: new Date().toISOString(),
      steps,
      summary: {
        pass: steps.filter(s => s.status === 'PASS').length,
        fail: steps.filter(s => s.status === 'FAIL').length,
        total: steps.length,
      },
    }

    fs.writeFileSync(REPORT_FILE.replace('.md', '.json'), JSON.stringify(results, null, 2))
    const md = [
      `# S15 Playwright Test — Location Filters`,
      `**URL:** ${appUrl}`,
      `**Fecha:** ${new Date().toISOString()}`,
      `**Resultado:** ${results.summary.pass}/${results.summary.total} PASS`,
      '',
      '| Paso | Estado | Detalle |',
      '|------|--------|---------|',
      ...steps.map(s => `| ${s.step} | ${s.status} | ${s.detail} |`),
      '',
      `**Total:** ${results.summary.pass} PASS, ${results.summary.fail} FAIL`,
    ].join('\n')
    fs.writeFileSync(REPORT_FILE, md)

    console.log('')
    console.log(`Report: ${results.summary.pass}/${results.summary.total} PASS`)
    console.log(`Report JSON: ${REPORT_FILE.replace('.md', '.json')}`)
    console.log(`Report MD:   ${REPORT_FILE}`)

    await browser.close()
    process.exit(results.summary.fail > 0 ? 1 : 0)
  }
}

main()
