import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { loadEnv, getEnv } from '../lib/env.mjs'
import { loginViaMarketplaceModal, getQACredentials } from './login.mjs'

const REPORT_DIR = path.resolve(process.cwd(), 'var', 'qa-results', 's-mp-02-search')
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

function createTestImage() {
  ensureDirs()
  const imgPath = path.join(REPORT_DIR, 'test-image.png')
  if (!fs.existsSync(imgPath)) {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
    fs.writeFileSync(imgPath, png)
  }
  return imgPath
}

async function main() {
  console.log('=== S-MP-02 — Search + Filters Playwright Test ===')
  console.log('')

  const appUrl = getEnv('APP_URL') || 'http://localhost:3002'
  console.log(`APP_URL: ${appUrl}`)
  ensureDirs()

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()

  try {
    // ── Login como sellerIA ──
    console.log('1. Login como sellerIA...')
    const creds = getQACredentials()
    const sellerCreds = creds.seller
    await page.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)
    const loggedIn = await loginViaMarketplaceModal(page, sellerCreds.identifier, sellerCreds.password)
    log('login', loggedIn ? 'PASS' : 'FAIL', loggedIn ? 'sellerIA autenticado' : 'no se pudo autenticar')
    await ss(page, '01-logged-in')
    if (!loggedIn) throw new Error('Login fallido')

    // ── Navigate to /marketplace ──
    console.log('2. Navegar a /marketplace...')
    await page.goto(`${appUrl}/marketplace`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)
    await ss(page, '02-marketplace-loaded')

    // ─────────────────────────────────────────────────────────────────────────
    //  TEST 1: Fuzzy search — "guitara" (typo with missing 'u')
    // ─────────────────────────────────────────────────────────────────────────
    console.log('3. TEST 1 — Fuzzy search "guitara" (typo)...')
    const searchInput = page.locator('input[placeholder*="Buscar por titulo"]')
    await searchInput.waitFor({ state: 'visible', timeout: 10000 })
    await searchInput.fill('guitara')
    await page.waitForTimeout(2000)
    await ss(page, '03-search-guitara')

    const listingCards = page.locator('[class*="card"], a[href*="/marketplace/"]').filter({ hasText: /./ })
    const hasResults = await listingCards.count().then(c => c > 0).catch(() => false)
    log('fuzzy-search-guitara', hasResults ? 'PASS' : 'FAIL',
      hasResults ? `${await listingCards.count()} resultados visibles` : 'sin resultados')

    if (hasResults) {
      const guitarraText = page.locator('text=/guitar|guitarr/i').first()
      const guitarraVisible = await guitarraText.isVisible().catch(() => false)
      log('fuzzy-guitar-match', guitarraVisible ? 'PASS' : 'FAIL',
        guitarraVisible ? 'resultados relacionados con guitarra' : 'sin coincidencias de guitarra')
    } else {
      log('fuzzy-guitar-match', 'FAIL', 'sin resultados para verificar')
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  TEST 2: Prefix search — "prod"
    // ─────────────────────────────────────────────────────────────────────────
    console.log('4. TEST 2 — Prefix search "prod"...')
    await searchInput.fill('')
    await page.waitForTimeout(500)
    await searchInput.fill('prod')
    await page.waitForTimeout(2000)
    await ss(page, '04-search-prod')

    const prodMatch = page.locator('text=/produccion|producto|productor|produccion|product/i').first()
    const prodVisible = await prodMatch.isVisible().catch(() => false)
    const prodHasResults = await listingCards.count().then(c => c > 0).catch(() => false)

    log('prefix-search-prod', prodVisible ? 'PASS' : 'FAIL',
      prodVisible ? 'resultados incluyen produccion/producto/etc' : 'sin coincidencias "prod"')
    log('prefix-search-prod-results', prodHasResults ? 'PASS' : 'FAIL',
      prodHasResults ? `${await listingCards.count()} resultados` : 'sin resultados')

    // ── Clear search ──
    await searchInput.fill('')
    await page.waitForTimeout(500)

    // ─────────────────────────────────────────────────────────────────────────
    //  TEST 3: Filtros panel — search is OUTSIDE the filter panel
    // ─────────────────────────────────────────────────────────────────────────
    console.log('5. TEST 3 — Filtros: search bar outside filter panel...')

    const searchBeforeVisible = await searchInput.isVisible().catch(() => false)
    log('search-visible-before-filters', searchBeforeVisible ? 'PASS' : 'FAIL')
    await ss(page, '05-before-filters')

    const filtrosBtn = page.locator('button', { hasText: 'Filtros' })
    const filtrosBtnVisible = await filtrosBtn.isVisible().catch(() => false)
    if (filtrosBtnVisible) {
      await filtrosBtn.click()
      await page.waitForTimeout(1000)
      log('filtros-open', 'PASS', 'panel de filtros abierto')
    } else {
      log('filtros-open', 'FAIL', 'boton Filtros no visible')
    }
    await ss(page, '06-filters-open')

    const searchStillVisible = await searchInput.isVisible().catch(() => false)
    log('search-outside-filters', searchStillVisible ? 'PASS' : 'FAIL',
      searchStillVisible ? 'buscador visible en la barra de tabs (fuera del panel)' : 'buscador oculto')

    // Close filters before next test
    if (filtrosBtnVisible) {
      await filtrosBtn.click()
      await page.waitForTimeout(500)
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  TEST 4: Publish form — state/city dropdowns + location validation error
    // ─────────────────────────────────────────────────────────────────────────
    console.log('6. TEST 4 — Publish form: location dropdowns + validation...')

    const quieroVenderBtn = page.locator('button', { hasText: 'Quiero Vender' })
    await quieroVenderBtn.waitFor({ state: 'visible', timeout: 10000 })
    await quieroVenderBtn.click()
    await page.waitForTimeout(1500)
    await ss(page, '07-publish-modal-category')
    log('publish-modal-open', 'PASS', 'modal "Quiero Vender" abierto en paso categoria')

    // Select a category to advance to form step
    const instrumentosBtn = page.locator('button', { hasText: 'Instrumentos Nuevos' }).first()
    const categoryVisible = await instrumentosBtn.isVisible().catch(() => false)
    if (categoryVisible) {
      await instrumentosBtn.click()
      await page.waitForTimeout(1000)
      log('category-select', 'PASS', 'categoria seleccionada: Instrumentos Nuevos')
    } else {
      const anyCategory = page.locator('button', { hasText: /Instrumentos|Audio Pro|Consumibles|Alquiler/ }).first()
      if (await anyCategory.isVisible().catch(() => false)) {
        await anyCategory.click()
        await page.waitForTimeout(1000)
        const text = await anyCategory.textContent().catch(() => '')
        log('category-select', 'PASS', `categoria seleccionada: ${text?.trim() || 'categoria'}`)
      } else {
        log('category-select', 'FAIL', 'no se pudo seleccionar categoria')
      }
    }
    await ss(page, '08-publish-form')

    // Verify state and city <select> elements exist
    const stateLabel = page.locator('label', { hasText: 'Estado' }).first()
    const cityLabel = page.locator('label', { hasText: 'Ciudad' }).first()
    const stateVisible = await stateLabel.isVisible().catch(() => false)
    const cityVisible = await cityLabel.isVisible().catch(() => false)
    log('state-select-visible', stateVisible ? 'PASS' : 'FAIL',
      stateVisible ? 'selector de estado visible' : 'selector de estado no visible')
    log('city-select-visible', cityVisible ? 'PASS' : 'FAIL',
      cityVisible ? 'selector de ciudad visible' : 'selector de ciudad no visible')

    // Upload a minimal test image (required before location validation kicks in)
    const testImgPath = createTestImage()
    const fileInput = page.locator('input[type="file"]').first()
    if (await fileInput.isVisible().catch(() => false)) {
      await fileInput.setInputFiles(testImgPath)
      await page.waitForTimeout(1500)
      log('image-upload', 'PASS', 'imagen de prueba subida')
    } else {
      log('image-upload', 'WARN', 'input file no visible — error de imagen puede dispararse primero')
    }

    // Fill minimal required text fields
    const titleInput = page.locator('input[placeholder*="Stratocaster"]').first()
    if (await titleInput.isVisible().catch(() => false)) {
      await titleInput.fill('QA Test Listing S-MP-02')
      await page.waitForTimeout(300)
    }
    const priceInput = page.locator('input[type="number"]').first()
    if (await priceInput.isVisible().catch(() => false)) {
      await priceInput.fill('100')
      await page.waitForTimeout(300)
    }
    await ss(page, '09-form-filled-without-location')

    // Click "Publicar Producto" without selecting location → expect error
    const publishBtn = page.locator('button', { hasText: 'Publicar Producto' })
    if (await publishBtn.isVisible().catch(() => false)) {
      await publishBtn.click()
      await page.waitForTimeout(1500)

      const errorMsg = page.locator('text=Debes seleccionar estado y ciudad para publicar').first()
      const errorVisible = await errorMsg.isVisible().catch(() => false)
      log('location-validation-error', errorVisible ? 'PASS' : 'FAIL',
        errorVisible ? 'error "Debes seleccionar estado y ciudad para publicar" mostrado' : 'error de ubicacion no visible')
      await ss(page, '10-location-error')
    } else {
      log('location-validation-error', 'FAIL', 'boton Publicar Producto no visible')
    }

  } catch (error) {
    log('fatal', 'FAIL', error.message)
    console.error(error)
  } finally {
    // ── Report ──
    const results = {
      sprint: 'S-MP-02',
      test: 'Search + Filters Playwright E2E',
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
      `# S-MP-02 Playwright Test — Search + Filters`,
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
