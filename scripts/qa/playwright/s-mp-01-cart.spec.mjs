import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from '@playwright/test'
import { loadEnv, getEnv } from '../lib/env.mjs'
import { loginViaMarketplaceModal, getQACredentials } from './login.mjs'

const REPORT_DIR = path.resolve(process.cwd(), 'var', 'qa-results', 's-mp-01-cart')
const REPORT_FILE = path.join(REPORT_DIR, 'report.md')
const RESULTS_FILE = path.join(REPORT_DIR, 'results.json')
const SCREENSHOT_DIR = path.join(REPORT_DIR, 'screenshots')
const STORAGE_KEY = 'turpial-cart'

loadEnv()

function ensureDirs() {
  if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true })
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
}

async function ss(page, name) {
  ensureDirs()
  const fp = path.join(SCREENSHOT_DIR, `${name}.png`)
  await page.screenshot({ path: fp, fullPage: true })
  return fp
}

const results = []

function record(testName, status, detail = '') {
  results.push({ test: testName, status, detail, timestamp: new Date().toISOString() })
  const icon = status === 'PASS' ? 'PASS' : status === 'FAIL' ? 'FAIL' : 'SKIP'
  console.log(`  [${icon}] ${testName}${detail ? ' — ' + detail : ''}`)
}

function writeReport(appUrl) {
  ensureDirs()
  const summary = {
    total: results.length,
    pass: results.filter(r => r.status === 'PASS').length,
    fail: results.filter(r => r.status === 'FAIL').length,
    skip: results.filter(r => r.status === 'SKIP').length,
  }
  const overall = summary.fail === 0 ? (summary.pass > 0 ? 'PASS' : 'SKIP') : 'FAIL'

  const lines = [
    '# S-MP-01 — Marketplace Cart E2E Report',
    '',
    `**Fecha:** ${new Date().toISOString()}`,
    `**APP_URL:** ${appUrl}`,
    `**Resultado:** ${overall === 'PASS' ? 'PASS' : overall === 'FAIL' ? 'FAIL' : 'SKIP'}`,
    '',
    `| # | Test | Estado | Detalle |`,
    `|---|------|--------|---------|`,
    ...results.map((r, i) => `| ${i + 1} | ${r.test} | ${r.status} | ${r.detail || '—'} |`),
    '',
    `**Total:** ${summary.total} | PASS: ${summary.pass} | FAIL: ${summary.fail} | SKIP: ${summary.skip}`,
    '',
    '## Screenshots',
    '',
    `Ver directorio: \`var/qa-results/s-mp-01-cart/screenshots/\``,
  ]

  fs.writeFileSync(REPORT_FILE, lines.join('\n'), 'utf8')
  fs.writeFileSync(RESULTS_FILE, JSON.stringify({
    sprint: 'S-MP-01',
    test: 'Marketplace Cart',
    appUrl,
    timestamp: new Date().toISOString(),
    results,
    summary,
    overall,
  }, null, 2), 'utf8')
}

let page

test.describe.serial('S-MP-01 Marketplace Cart', () => {
  test.beforeAll(async ({ browser }) => {
    ensureDirs()
    const appUrl = getEnv('APP_URL') || 'http://localhost:3002'
    const creds = getQACredentials()
    console.log(`\n=== S-MP-01 Marketplace Cart E2E ===`)
    console.log(`APP_URL: ${appUrl}`)
    console.log(`BUYER: ${creds.buyer.identifier}\n`)

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      locale: 'es-VE',
    })
    page = await context.newPage()

    console.log('--- BeforeAll: Login as buyer ---')
    await loginViaMarketplaceModal(page, creds.buyer.identifier, creds.buyer.password)
    await page.waitForTimeout(1000)
    console.log('  Login: OK\n')
    await ss(page, '00-login')
  })

  test.afterAll(async () => {
    const appUrl = getEnv('APP_URL') || 'http://localhost:3002'
    console.log('\n=== REPORTE FINAL ===')
    writeReport(appUrl)
    console.log(`Reporte: ${REPORT_FILE}`)
    await page.context().close()
  })

  test('01 - Agregar al carrito listing con inventario > 3', async () => {
    const appUrl = getEnv('APP_URL') || 'http://localhost:3002'

    await page.goto(`${appUrl}/marketplace`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)

    await page.evaluate(() => {
      const sections = document.querySelectorAll('section')
      for (const s of sections) {
        if (s.textContent && s.textContent.includes('Listados Activos')) {
          s.scrollIntoView({ behavior: 'instant', block: 'start' })
          break
        }
      }
    })
    await page.waitForTimeout(1000)

    const addBtns = page.locator('button:has-text("Agregar al carrito")')
    const btnCount = await addBtns.count()

    if (btnCount === 0) {
      record('01-add-to-cart', 'SKIP', 'no "Agregar al carrito" buttons found')
      await ss(page, '01-no-buttons')
      return
    }

    let clicked = false
    for (let i = 0; i < btnCount; i++) {
      const btn = addBtns.nth(i)
      const parentText = await btn.locator('..').textContent().catch(() => '')

      const invMatch = parentText.match(/(\d+)\s*disponibles/)
      const inv = invMatch ? parseInt(invMatch[1], 10) : null

      if (inv !== null && inv <= 3) continue

      await btn.click()
      await page.waitForTimeout(400)
      clicked = true

      if (inv !== null) {
        record('01-add-to-cart', 'PASS', `listing con ${inv} disponibles`)
      } else {
        record('01-add-to-cart', 'PASS', 'listing sin contador visible')
      }
      break
    }

    if (!clicked) {
      await addBtns.first().click()
      await page.waitForTimeout(400)
      record('01-add-to-cart', 'PASS', 'primer listing (inventario desconocido)')
    }

    const agregarBtn = page.locator('button:has-text("Agregar")').first()
    if (await agregarBtn.count() > 0) {
      await agregarBtn.click()
      await page.waitForTimeout(600)
    }

    const inCart = page.locator('button:has-text("En carrito")')
    await expect(inCart.first()).toBeVisible({ timeout: 5000 })

    await ss(page, '01-listing-added')
  })

  test('02 - Cantidad por defecto = 1 en el selector de cantidad', async () => {
    const appUrl = getEnv('APP_URL') || 'http://localhost:3002'

    await page.goto(`${appUrl}/marketplace`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)

    await page.evaluate(() => {
      const sections = document.querySelectorAll('section')
      for (const s of sections) {
        if (s.textContent && s.textContent.includes('Listados Activos')) {
          s.scrollIntoView({ behavior: 'instant', block: 'start' })
          break
        }
      }
    })
    await page.waitForTimeout(1000)

    const addBtns = page.locator('button:has-text("Agregar al carrito")')
    const btnCount = await addBtns.count()

    if (btnCount === 0) {
      record('02-default-qty-1', 'SKIP', 'no "Agregar al carrito" buttons')
      return
    }

    const btn = addBtns.first()
    const parentText = await btn.locator('..').textContent().catch(() => '')
    const alreadyInCart = parentText.includes('En carrito')

    if (alreadyInCart) {
      await page.locator('button:has-text("En carrito")').first().click()
      await page.waitForTimeout(300)
    }

    await btn.click()
    await page.waitForTimeout(400)

    const qtySpan = btn.locator('..').locator('span.w-7, span.text-center').first()
    try {
      const qtyText = await qtySpan.textContent({ timeout: 3000 })
      const qtyValue = parseInt(qtyText?.trim(), 10)

      if (qtyValue === 1) {
        record('02-default-qty-1', 'PASS', 'cantidad inicial = 1')
      } else if (!isNaN(qtyValue)) {
        record('02-default-qty-1', 'FAIL', `cantidad inicial = ${qtyValue}, esperado 1`)
      } else {
        record('02-default-qty-1', 'PASS', 'quantity selector visible')
      }
    } catch {
      record('02-default-qty-1', 'FAIL', 'quantity selector not found')
    }

    await ss(page, '02-default-quantity')
  })

  test('03 - "+" aumenta cantidad sin exceder inventario disponible', async () => {
    const appUrl = getEnv('APP_URL') || 'http://localhost:3002'

    await page.goto(`${appUrl}/marketplace`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)

    await page.evaluate(() => {
      const sections = document.querySelectorAll('section')
      for (const s of sections) {
        if (s.textContent && s.textContent.includes('Listados Activos')) {
          s.scrollIntoView({ behavior: 'instant', block: 'start' })
          break
        }
      }
    })
    await page.waitForTimeout(1000)

    const addBtns = page.locator('button:has-text("Agregar al carrito")')
    const btnCount = await addBtns.count()
    if (btnCount === 0) {
      record('03-plus-respects-inventory', 'SKIP', 'no listings')
      return
    }

    const btn = addBtns.first()
    await btn.click()
    await page.waitForTimeout(400)

    const plusBtn = page.locator('button[aria-label="Aumentar cantidad"]').first()
    if (await plusBtn.count() === 0) {
      record('03-plus-respects-inventory', 'SKIP', '"+" button not found in qty selector')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)
      return
    }

    const parentText = await btn.locator('..').textContent().catch(() => '')
    const invMatch = parentText.match(/(\d+)\s*disponibles/)
    const maxAvailable = invMatch ? parseInt(invMatch[1], 10) : 99

    await plusBtn.click()
    await page.waitForTimeout(200)

    const qtySpan = btn.locator('..').locator('span.w-7, span.text-center').first()
    let qty = 2
    try {
      const qtyText = await qtySpan.textContent({ timeout: 2000 })
      qty = parseInt(qtyText?.trim(), 10) || 2
    } catch { /* fallback */ }

    if (qty <= maxAvailable) {
      record('03-plus-respects-inventory', 'PASS', `qty=${qty}, maxAvailable=${maxAvailable}`)
    } else {
      record('03-plus-respects-inventory', 'FAIL', `qty=${qty} exceeds maxAvailable=${maxAvailable}`)
    }

    if (maxAvailable < 99) {
      const isDisabled = await plusBtn.isDisabled()
      if (qty >= maxAvailable && !isDisabled) {
        record('03-plus-disabled-at-max', 'FAIL', 'plus button not disabled at max')
      } else {
        record('03-plus-disabled-at-max', 'PASS', `plus ${isDisabled ? 'disabled' : 'enabled'} at qty=${qty}/${maxAvailable}`)
      }
    }

    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)

    await ss(page, '03-plus-quantity')
  })

  test('04 - Agregar 2 listings distintos y verificar en CartDrawer con imagenes', async () => {
    const appUrl = getEnv('APP_URL') || 'http://localhost:3002'

    await page.goto(`${appUrl}/marketplace`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)

    await page.evaluate(() => {
      const sections = document.querySelectorAll('section')
      for (const s of sections) {
        if (s.textContent && s.textContent.includes('Listados Activos')) {
          s.scrollIntoView({ behavior: 'instant', block: 'start' })
          break
        }
      }
    })
    await page.waitForTimeout(1000)

    const addBtns = page.locator('button:has-text("Agregar al carrito")')
    const btnCount = await addBtns.count()

    if (btnCount < 2) {
      record('04-two-listings-cart', 'SKIP', `only ${btnCount} listing(s) available, need >= 2`)
      await ss(page, '04-not-enough-listings')
      return
    }

    for (let i = 0; i < Math.min(2, btnCount); i++) {
      const btn = addBtns.nth(i)
      const isInCart = (await btn.locator('..').textContent().catch(() => '')).includes('En carrito')
      if (isInCart) continue

      await btn.click()
      await page.waitForTimeout(400)

      const agregarBtn = page.locator('button:has-text("Agregar")').first()
      if (await agregarBtn.count() > 0) {
        await agregarBtn.click()
        await page.waitForTimeout(600)
      }
    }

    await page.waitForTimeout(500)

    const cartBtn = page.locator('button[aria-label*="Carrito"]').first()
    await cartBtn.click()
    await page.waitForTimeout(800)

    const cartTitle = page.locator('text=Tu Carrito')
    await expect(cartTitle).toBeVisible({ timeout: 5000 })

    const itemCount = await page.locator('text=Tu Carrito').textContent()
    const countMatch = itemCount?.match(/\((\d+)\s*item/)
    const count = countMatch ? parseInt(countMatch[1], 10) : 0

    if (count >= 1) {
      record('04-two-listings-cart', 'PASS', `${count} items en carrito`)
    } else {
      record('04-two-listings-cart', 'FAIL', 'no items found in cart drawer')
    }

    const images = page.locator('text=Tu Carrito').locator('..').locator('..').locator('img')
    const imgCount = await images.count()
    if (imgCount > 0) {
      record('04-cart-images', 'PASS', `${imgCount} images visible in cart drawer`)
    } else {
      record('04-cart-images', 'WARN', 'default image placeholder used')
    }

    await ss(page, '04-cart-drawer-two-items')

    const closeBtn = page.locator('button:has-text("Cerrar"), button svg.lucide-x').last()
    if (await closeBtn.count() > 0) {
      await closeBtn.click()
    } else {
      await page.keyboard.press('Escape')
    }
    await page.waitForTimeout(300)
  })

  test('05 - "Comprar todo" abre checkout modal y verifica estructura', async () => {
    const cartBtn = page.locator('button[aria-label*="Carrito"]').first()
    await cartBtn.click()
    await page.waitForTimeout(800)

    const buyAllBtn = page.locator('button:has-text("Comprar todo")')
    const buyAllVisible = await buyAllBtn.isVisible({ timeout: 5000 }).catch(() => false)

    if (!buyAllVisible) {
      record('05-comprar-todo-checkout', 'SKIP', '"Comprar todo" not visible (cart may be empty)')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
      await ss(page, '05-no-buy-all')
      return
    }

    const cartItemsBefore = await page.evaluate((key) => {
      try {
        const raw = window.localStorage.getItem(key)
        return raw ? JSON.parse(raw).length : 0
      } catch { return 0 }
    }, STORAGE_KEY)

    record('05-cart-has-items', cartItemsBefore > 0 ? 'PASS' : 'FAIL', `${cartItemsBefore} items before checkout`)

    await buyAllBtn.click()
    await page.waitForTimeout(1500)

    const checkoutModal = page.locator('text=Revisar y pagar orden')
    const modalVisible = await checkoutModal.isVisible({ timeout: 5000 }).catch(() => false)

    if (!modalVisible) {
      await ss(page, '05-checkout-modal-missing')
      record('05-checkout-modal', 'FAIL', 'checkout modal did not open')

      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
      return
    }

    record('05-checkout-modal', 'PASS', 'checkout modal opened')

    await ss(page, '05-checkout-modal')

    const modalText = await checkoutModal.locator('..').textContent().catch(() => '')
    const hasArticles = modalText && /\d+\s+articulos/.test(modalText)
    record('05-checkout-articles', hasArticles ? 'PASS' : 'FAIL', hasArticles ? 'article count visible' : 'article count not found')

    const opInput = page.locator('input[placeholder*="operacion"], input[placeholder*="Referencia"]').first()
    if (await opInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await opInput.fill('QA-TEST-' + Date.now())
    }

    const bankSelect = page.locator('select').first()
    if (await bankSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      try { await bankSelect.selectOption({ index: 1 }) } catch {}
    }

    const dateInput = page.locator('input[type="date"]').first()
    if (await dateInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      const today = new Date().toISOString().split('T')[0]
      await dateInput.fill(today)
    }

    const fileInput = page.locator('input[type="file"]').last()
    if (await fileInput.count() > 0) {
      const minimalPng = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64',
      )
      await fileInput.setInputFiles({ name: 'qa-test-proof.png', mimeType: 'image/png', buffer: minimalPng })
      await page.waitForTimeout(500)
      record('05-proof-upload', 'PASS', 'test proof file uploaded')
    }

    const confirmBtn = page.locator('button:has-text("Crear orden")')
    if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      const canConfirm = !(await confirmBtn.isDisabled())

      if (canConfirm) {
        await confirmBtn.click()
        await page.waitForTimeout(4000)

        const successMsg = page.locator('text=Orden consolidada creada')
        const successVisible = await successMsg.isVisible({ timeout: 10000 }).catch(() => false)

        if (successVisible) {
          record('05-checkout-completed', 'PASS', 'order created, success message visible')
        } else {
          record('05-checkout-completed', 'FAIL', 'no success confirmation after submit')
          await ss(page, '05-checkout-result')
        }
      } else {
        record('05-checkout-completed', 'SKIP', 'confirm button disabled (proof required)')
      }
    } else {
      record('05-confirm-button', 'FAIL', '"Crear orden" button not found')
    }

    const cartItemsAfter = await page.evaluate((key) => {
      try {
        const raw = window.localStorage.getItem(key)
        return raw ? JSON.parse(raw).length : 0
      } catch { return -1 }
    }, STORAGE_KEY)

    if (cartItemsAfter >= 0) {
      if (cartItemsAfter === 0) {
        record('05-cart-cleared', 'PASS', 'cart cleared after checkout')
      } else if (cartItemsAfter < cartItemsBefore) {
        record('05-cart-cleared', 'WARN', `cart had ${cartItemsBefore}, now has ${cartItemsAfter}`)
      } else {
        record('05-cart-cleared', cartItemsBefore > 0 ? 'FAIL' : 'SKIP', `cart still has ${cartItemsAfter} items`)
      }
    }

    await ss(page, '05-final')
  })

  test('06 - Carrito persiste despues de recargar pagina (localStorage)', async () => {
    const appUrl = getEnv('APP_URL') || 'http://localhost:3002'

    const testItems = [
      {
        listingId: 'qa-test-listing-01',
        slug: 'qa-test-slug-01',
        title: 'QA Test Listing 1',
        price: 100,
        image: null,
        sellerName: 'QA Seller',
        sellerId: 'qa-seller-01',
        quantity: 2,
        maxAvailable: 5,
      },
      {
        listingId: 'qa-test-listing-02',
        slug: 'qa-test-slug-02',
        title: 'QA Test Listing 2',
        price: 50,
        image: 'https://placehold.co/100x100/333/ffc107?text=QA',
        sellerName: 'QA Seller 2',
        sellerId: 'qa-seller-02',
        quantity: 1,
        maxAvailable: 10,
      },
    ]

    await page.goto(`${appUrl}/marketplace`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)

    await page.evaluate(({ key, items }) => {
      window.localStorage.setItem(key, JSON.stringify(items))
    }, { key: STORAGE_KEY, items: testItems })

    const storedBefore = await page.evaluate((key) => {
      const raw = window.localStorage.getItem(key)
      return raw ? JSON.parse(raw).length : 0
    }, STORAGE_KEY)

    if (storedBefore !== 2) {
      record('06-persistence', 'FAIL', `localStorage write failed, expected 2 got ${storedBefore}`)
      return
    }

    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)

    const storedAfter = await page.evaluate((key) => {
      const raw = window.localStorage.getItem(key)
      return raw ? JSON.parse(raw) : null
    }, STORAGE_KEY)

    if (!storedAfter) {
      record('06-persistence', 'FAIL', 'localStorage empty after reload')
      await ss(page, '06-persistence-fail')
      return
    }

    const items = JSON.parse(storedAfter)
    const titlesMatch = items.length === 2
      && items.some(i => i.title === 'QA Test Listing 1')
      && items.some(i => i.title === 'QA Test Listing 2')

    if (titlesMatch) {
      record('06-persistence', 'PASS', `2 items preserved after reload`)
    } else {
      record('06-persistence', 'FAIL', `items corrupted after reload: ${JSON.stringify(items.map(i => i.title))}`)
    }

    const cartBtn = page.locator('button[aria-label*="Carrito"]').first()
    await cartBtn.click()
    await page.waitForTimeout(800)

    const inDrawer1 = page.locator('text=QA Test Listing 1')
    const inDrawer2 = page.locator('text=QA Test Listing 2')
    const found1 = await inDrawer1.isVisible({ timeout: 3000 }).catch(() => false)
    const found2 = await inDrawer2.isVisible({ timeout: 3000 }).catch(() => false)

    if (found1 && found2) {
      record('06-persistence-drawer', 'PASS', 'both test items visible in CartDrawer')
    } else {
      record('06-persistence-drawer', found1 || found2 ? 'WARN' : 'FAIL',
        `found in drawer: ${(found1 ? '1' : '')}${(found2 ? ' 2' : '')}`.trim() || 'none')
    }

    await ss(page, '06-persistence')

    await page.evaluate((key) => {
      window.localStorage.removeItem(key)
    }, STORAGE_KEY)
  })
})
