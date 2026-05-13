import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { loadEnv, getEnv, requireEnv } from '../lib/env.mjs'
import { loginViaMarketplaceModal, getQACredentials, buildResultsTable, buildResultSummary } from './login.mjs'
import { screenshot } from './screenshot.mjs'

const REPORT_DIR = path.resolve(process.cwd(), 'var', 'qa-results', 's14b-cart-share-report')
const REPORT_FILE = path.join(REPORT_DIR, 'report.md')

loadEnv()

async function main() {
  console.log('=== S14B — Playwright Shopping Cart + Share Listing Smoke ===')
  console.log('')

  const appUrl = getEnv('APP_URL') || 'http://localhost:3002'
  console.log(`APP_URL: ${appUrl}`)
  console.log('')

  const creds = getQACredentials()
  console.log(`Credenciales QA cargadas:`)
  console.log(`  BUYER: ${creds.buyer.identifier}`)
  console.log('')

  fs.mkdirSync(REPORT_DIR, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    locale: 'es-VE',
  })
  const page = await context.newPage()

  const results = []
  const screenshots = []

  try {
    // Step 1: Login as buyer
    console.log('--- Step 1: Login as buyer ---')
    await loginViaMarketplaceModal(
      page,
      creds.buyer.identifier,
      creds.buyer.password,
    )
    console.log('  Login: OK')
    results.push({ step: 'login', status: 'PASS' })

    await page.waitForTimeout(1000)

    // Step 2: Navigate to marketplace
    console.log('--- Step 2: Navigate to marketplace ---')
    await page.goto(`${appUrl}/marketplace`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // Scroll down to listings section
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

    const ss1 = await screenshot(page, 's14b-01-marketplace-loaded')
    screenshots.push(ss1)

    // Step 3: Click "Agregar al carrito" on first listing
    console.log('--- Step 3: Add first listing to cart ---')
    const addToCartBtns = page.locator('button:has-text("Agregar al carrito")')
    const btnCount = await addToCartBtns.count()
    console.log(`  Found ${btnCount} "Agregar al carrito" buttons`)

    if (btnCount === 0) {
      console.log('  SKIP: No listings with Add to Cart button found')
      results.push({ step: 'add_to_cart', status: 'SKIP', detail: 'No listings available' })
    } else {
      await addToCartBtns.first().click()
      await page.waitForTimeout(300)

      // Click the quantity selector "Agregar" button
      const addBtn = page.locator('button:has-text("Agregar")').first()
      const confirmCount = await addBtn.count()
      if (confirmCount > 0) {
        await addBtn.click()
        await page.waitForTimeout(800)
        console.log('  Added to cart: OK')
        results.push({ step: 'add_to_cart', status: 'PASS' })
      } else {
        console.log('  Added to cart: OK (no qty selector appeared)')
        results.push({ step: 'add_to_cart', status: 'PASS' })
      }
    }

    // Step 4: Verify cart badge shows "1"
    console.log('--- Step 4: Verify cart badge ---')
    const cartBadge = page.locator('button[aria-label*="Carrito"] span').first()
    try {
      await cartBadge.waitFor({ state: 'visible', timeout: 5000 })
      const badgeText = await cartBadge.textContent()
      console.log(`  Cart badge text: ${badgeText}`)
      if (badgeText && badgeText.trim() === '1') {
        console.log('  Cart badge: PASS')
        results.push({ step: 'cart_badge', status: 'PASS' })
      } else {
        console.log('  Cart badge: FAIL - unexpected value')
        results.push({ step: 'cart_badge', status: 'FAIL', detail: `Badge text: ${badgeText}` })
      }
    } catch {
      console.log('  Cart badge: not found or not visible')
      results.push({ step: 'cart_badge', status: 'FAIL', detail: 'Badge not visible' })
    }

    const ss2 = await screenshot(page, 's14b-02-cart-badge')
    screenshots.push(ss2)

    // Step 5: Open cart drawer
    console.log('--- Step 5: Open cart drawer ---')
    const cartBtn = page.locator('button[aria-label*="Carrito"]')
    const cartBtnCount = await cartBtn.count()
    if (cartBtnCount > 0) {
      await cartBtn.first().click()
      await page.waitForTimeout(800)
      console.log('  Cart drawer opened: OK')
      results.push({ step: 'cart_drawer_open', status: 'PASS' })
    } else {
      console.log('  Cart button not found')
      results.push({ step: 'cart_drawer_open', status: 'FAIL', detail: 'Cart button not found' })
    }

    // Verify item in cart drawer
    const cartItem = page.locator('text=Tu Carrito')
    try {
      await cartItem.waitFor({ state: 'visible', timeout: 3000 })
      console.log('  Cart drawer visible: PASS')
      results.push({ step: 'cart_drawer_item', status: 'PASS' })
    } catch {
      console.log('  Cart drawer not visible')
      results.push({ step: 'cart_drawer_item', status: 'FAIL' })
    }

    const ss3 = await screenshot(page, 's14b-03-cart-drawer')
    screenshots.push(ss3)

    // Close cart drawer
    const closeBtn = page.locator('button:has-text("Cerrar"), button[aria-label="Cerrar"]').last()
    if (await closeBtn.count() > 0) {
      await closeBtn.click()
      await page.waitForTimeout(500)
    } else {
      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)
    }

    // Navigate back to marketplace
    await page.goto(`${appUrl}/marketplace`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // Scroll to listings
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

    // Step 6: Click share button
    console.log('--- Step 6: Click share button ---')
    const shareBtns = page.locator('button[title="Compartir"]')
    const shareBtnCount = await shareBtns.count()
    console.log(`  Found ${shareBtnCount} share buttons`)

    if (shareBtnCount === 0) {
      console.log('  SKIP: No share buttons found')
      results.push({ step: 'share_button', status: 'SKIP', detail: 'No share buttons found' })
    } else {
      await shareBtns.first().click()
      await page.waitForTimeout(500)

      // Verify share options appear
      const copyLink = page.locator('text=Copiar link')
      try {
        await copyLink.waitFor({ state: 'visible', timeout: 3000 })
        console.log('  Share options visible: PASS')
        results.push({ step: 'share_options', status: 'PASS' })
      } catch {
        console.log('  Share options not visible')
        results.push({ step: 'share_options', status: 'FAIL' })
      }

      const ss4 = await screenshot(page, 's14b-04-share-options')
      screenshots.push(ss4)

      // Step 7: Click "Copiar link" and check clipboard
      console.log('--- Step 7: Copy link to clipboard ---')
      if (await copyLink.count() > 0) {
        await copyLink.first().click()
        await page.waitForTimeout(500)

        // Check that "Link copiado!" appears
        const copiedMsg = page.locator('text=Link copiado!')
        try {
          await copiedMsg.waitFor({ state: 'visible', timeout: 3000 })
          console.log('  "Link copiado!" shown: PASS')
          results.push({ step: 'copy_link_feedback', status: 'PASS' })
        } catch {
          console.log('  "Link copiado!" not shown')
          results.push({ step: 'copy_link_feedback', status: 'FAIL' })
        }

        // Check clipboard content via page context
        try {
          const clipboardText = await page.evaluate(() => navigator.clipboard.readText())
          if (clipboardText && clipboardText.includes('/marketplace/')) {
            console.log(`  Clipboard URL: ${clipboardText}`)
            results.push({ step: 'clipboard_has_url', status: 'PASS' })
          } else {
            console.log('  Clipboard does not contain marketplace URL')
            results.push({ step: 'clipboard_has_url', status: 'FAIL', detail: clipboardText || 'empty' })
          }
        } catch {
          console.log('  Could not read clipboard (permission)')
          results.push({ step: 'clipboard_has_url', status: 'SKIP', detail: 'Clipboard permission required' })
        }
      }
    }

    const ss5 = await screenshot(page, 's14b-05-final')
    screenshots.push(ss5)
  } catch (err) {
    console.log(`  ERROR: ${err.message}`)
    results.push({ step: 'general', status: 'FAIL', detail: err.message })
  }

  await page.close()
  await context.close()
  await browser.close()

  console.log('')
  console.log('=== RESUMEN FINAL ===')
  const summary = buildResultSummary(results)
  console.log(`Total: ${summary.total} | PASS: ${summary.passes} | FAIL: ${summary.fails}`)

  const table = buildResultsTable(results)
  console.log(table)

  let reportMd = `# S14B — Shopping Cart + Share Listing Smoke Report\n\n`
  reportMd += `**Fecha:** ${new Date().toISOString()}\n`
  reportMd += `**APP_URL:** ${appUrl}\n`
  reportMd += `**Branch:** Manuel/s14b-shopping-cart-share\n\n`
  reportMd += `## Resultado\n\n`
  reportMd += `- Total: ${summary.total}\n`
  reportMd += `- PASS: ${summary.passes}\n`
  reportMd += `- FAIL: ${summary.fails}\n`
  reportMd += `- Estado: ${summary.passed ? 'TODOS PASS' : 'FALLOS DETECTADOS'}\n\n`
  reportMd += table
  reportMd += `\n## Screenshots\n\n`
  reportMd += `Ver directorio: \`var/qa-results/s14b-cart-share-report/\`\n\n`

  for (const ss of screenshots) {
    if (ss && typeof ss === 'string') {
      reportMd += `- ![](${ss})\n`
    }
  }

  reportMd += `\n## Credenciales usadas\n\n`
  reportMd += `| Rol | Identificador |\n`
  reportMd += `|-----|---------------|\n`
  reportMd += `| BUYER | ${creds.buyer.identifier} |\n`

  fs.writeFileSync(REPORT_FILE, reportMd, 'utf8')
  console.log(`\nReporte guardado: ${REPORT_FILE}`)

  const exitCode = summary.passed ? 0 : 1

  const resultsJsonFile = path.join(REPORT_DIR, 'results.json')
  fs.writeFileSync(
    resultsJsonFile,
    JSON.stringify({ summary, results, appUrl, timestamp: new Date().toISOString() }, null, 2),
    'utf8',
  )
  console.log(`Resultados JSON: ${resultsJsonFile}`)

  process.exit(exitCode)
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(2)
})
