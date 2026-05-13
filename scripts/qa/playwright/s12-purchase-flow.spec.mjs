import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { loadEnv, getEnv, requireEnv } from '../lib/env.mjs'
import { loginViaMarketplaceModal, getQACredentials } from './login.mjs'

const REPORT_DIR = path.resolve(process.cwd(), 'var', 'qa-results', 's12-purchase-flow')
const REPORT_FILE = path.join(REPORT_DIR, 'report.md')
const SCREENSHOT_DIR = path.join(REPORT_DIR, 'screenshots')

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

async function main() {
  console.log('=== S12 — Purchase Flow Browser E2E ===\n')

  const appUrl = getEnv('APP_URL') || 'http://localhost:3002'
  const creds = getQACredentials()
  console.log(`APP_URL: ${appUrl}`)
  console.log(`BUYER: ${creds.buyer.identifier}\n`)

  ensureDirs()
  const browser = await chromium.launch({ headless: true })
  const ctxOpts = { viewport: { width: 1280, height: 720 }, locale: 'es-VE' }
  const steps = []
  const screenshots = []
  let txCreated = false

  const buyerCtx = await browser.newContext(ctxOpts)
  const page = await buyerCtx.newPage()

  try {
    // Step 1: Login as buyer
    console.log('1. Login as buyer...')
    await loginViaMarketplaceModal(page, creds.buyer.identifier, creds.buyer.password)
    await page.waitForTimeout(1000)
    const s1 = await ss(page, '01-logged-in')
    screenshots.push(s1)
    steps.push({ step: 1, action: 'Login buyer', result: 'OK' })
    console.log('   OK')

    // Step 2: Go to marketplace and wait for cards to render
    console.log('2. Navigate to marketplace...')
    await page.goto(`${appUrl}/marketplace`, { waitUntil: 'domcontentloaded' })
    // Wait for the card wrapper class to appear (client-side rendering)
    try {
      await page.waitForSelector('.card-premium-wrapper', { state: 'visible', timeout: 20000 })
    } catch {
      console.log('   WARNING: .card-premium-wrapper not found after 20s. Trying body text...')
      await page.waitForTimeout(5000)
    }
    await page.waitForTimeout(2000)
    const s2 = await ss(page, '02-marketplace')
    screenshots.push(s2)
    console.log('   Loaded')

    // Step 3: Check for listings
    console.log('3. Finding listings...')
    const cards = page.locator('.card-premium-wrapper')
    const cardCount = await cards.count()
    console.log(`   Found ${cardCount} listings`)

    if (cardCount === 0) {
      console.log('   No listings found. Checking page content...')
      const pageTitle = await page.title()
      const bodyText = await page.locator('body').textContent()
      console.log(`   Page title: "${pageTitle}"`)
      console.log(`   Body snippet: "${bodyText?.substring(0, 300)}"`)

      // Check for "No hay" or empty state messages
      const emptyMsg = page.locator('text=No hay, text=sin resultados, text=vacío, text=vacio').first()
      try {
        await emptyMsg.waitFor({ state: 'visible', timeout: 3000 })
        console.log('   Marketplace appears EMPTY - no active listings in preview')
      } catch {
        console.log('   No empty state message found either')
      }

      await ss(page, '03-no-listings')
      throw new Error('NO_LISTINGS: Marketplace has zero listings. QA listing needs to be published first.')
    }

    // Step 4: Click first listing
    console.log('4. Opening first listing...')
    await cards.first().click()
    await page.waitForTimeout(2000)
    await page.waitForURL(/\/marketplace\//, { timeout: 15000 }).catch(() => {})
    const s4 = await ss(page, '04-listing-detail')
    screenshots.push(s4)
    steps.push({ step: 4, action: 'Listing detail page', result: 'OK' })
    console.log(`   URL: ${page.url()}`)

    // Step 5: Click Comprar
    console.log('5. Click Comprar...')
    // Try multiple selectors for the purchase button
    let clicked = false
    for (const sel of [
      'button:has-text("Comprar")',
      'button:has-text("Comprar ahora")',
      'button:has-text("Iniciar compra")',
      '[data-testid="buy-button"]',
      'button:has-text("Comprar por")',
    ]) {
      const btn = page.locator(sel).first()
      if (await btn.count() > 0) {
        try {
          await btn.click({ timeout: 5000 })
          clicked = true
          console.log(`   Clicked: "${sel}"`)
          break
        } catch {}
      }
    }
    if (!clicked) {
      throw new Error('NO_BUY_BUTTON: Could not find purchase button on listing detail page')
    }
    await page.waitForTimeout(1500)
    const s5 = await ss(page, '05-after-click-comprar')
    screenshots.push(s5)

    // Step 6: In checkout modal, select Pago Movil
    console.log('6. Select Pago Móvil...')
    await page.waitForTimeout(1500)
    const pmSelectors = [
      'text=Pago Móvil',
      'label:has-text("Pago Móvil")',
      'text=Pago Movil',
      'input[value="PAGO_MOVIL"]',
      '[data-testid="payment-method-pago-movil"]',
    ]
    for (const sel of pmSelectors) {
      const el = page.locator(sel).first()
      if (await el.count() > 0) {
        try {
          await el.click({ timeout: 3000 })
          console.log(`   Selected: "${sel}"`)
          break
        } catch {}
      }
    }
    await page.waitForTimeout(1000)
    const s6 = await ss(page, '06-payment-selected')
    screenshots.push(s6)
    steps.push({ step: 6, action: 'Payment method selected', result: 'OK' })

    // Step 7: Fill payment form
    console.log('7. Fill payment form...')
    // Fill operation number (reference field)
    const refInputs = page.locator('input[type="text"]')
    const refCount = await refInputs.count()
    console.log(`   Found ${refCount} text inputs`)
    // Reference is the last non-readonly text input before the date field
    // Try index 2 or 1 depending on number of inputs
    const refIdx = refCount >= 4 ? 2 : (refCount >= 3 ? 1 : 2)
    try {
      await refInputs.nth(refIdx).fill('PAGO-REF-' + Date.now())
      console.log(`   Filled reference at index ${refIdx}`)
    } catch {
      // Fallback: find any visible text input that is not readonly
      const allTextInputs = page.locator('input[type="text"]:not([readonly])')
      const visCount = await allTextInputs.count()
      if (visCount > 0) {
        await allTextInputs.first().fill('PAGO-REF-' + Date.now())
        console.log('   Filled first editable text input')
      }
    }

    // Select bank
    const bankSelect = page.locator('select, #marketplace-payment-sender-bank').first()
    if (await bankSelect.count() > 0) {
      try {
        await bankSelect.selectOption({ index: 1 })
        console.log('   Selected first bank option')
      } catch (err) {
        console.log(`   Bank select: ${err.message}`)
      }
    }

    // Fill payment date
    const dateInput = page.locator('input[type="date"]').first()
    if (await dateInput.count() > 0) {
      const today = new Date().toISOString().split('T')[0]
      await dateInput.fill(today)
      console.log(`   Filled date: ${today}`)
    }

    await page.waitForTimeout(1000)
    const s7 = await ss(page, '07-form-filled')
    screenshots.push(s7)
    steps.push({ step: 7, action: 'Payment form filled', result: 'OK' })

    // Step 8: Confirm payment — scroll to bottom of modal first
    console.log('8. Confirm payment...')
    // Scroll the modal content to reveal the confirm button
    const scrollableArea = page.locator('.max-h-\\[55vh\\], .overflow-y-auto').first()
    if (await scrollableArea.count() > 0) {
      await scrollableArea.evaluate(el => el.scrollTop = el.scrollHeight)
      await page.waitForTimeout(500)
    }
    const confirmSelectors = [
      'button:has-text("Confirmar pago")',
      'button:has-text("Confirmar")',
      'button[type="submit"]',
    ]
    clicked = false
    for (const sel of confirmSelectors) {
      const el = page.locator(sel).first()
      if (await el.count() > 0) {
        try {
          await el.click({ timeout: 5000 })
          clicked = true
          console.log(`   Clicked: "${sel}"`)
          break
        } catch {}
      }
    }
    if (!clicked) {
      throw new Error('NO_CONFIRM_BUTTON: Could not find confirm/submit button')
    }
    await page.waitForTimeout(4000)
    const s8 = await ss(page, '08-confirmation')
    screenshots.push(s8)

    // Step 9: Verify confirmation
    console.log('9. Check confirmation...')
    const url = page.url()
    const body = await page.locator('body').textContent()
    const confirms = ['Esperando comprobante', 'comprobante de pago', 'Pago pendiente', 'PENDING_PAYMENT', 'compra realizada', 'en revisión', 'en revision', 'Pago procesado', 'validado']
    const found = confirms.filter(c => body?.toLowerCase().includes(c.toLowerCase()))
    console.log(`   URL: ${url}`)
    console.log(`   Found keywords: ${found.join(', ') || 'NONE'}`)

    if (found.length > 0) {
      txCreated = true
      steps.push({ step: 9, action: 'Purchase confirmed', result: 'PASS', detail: found.join(', ') })
    } else {
      steps.push({ step: 9, action: 'Purchase confirmation', result: 'WARN', detail: 'No confirmation keywords found on page' })
    }
  } catch (err) {
    console.log(`\nERROR: ${err.message}`)
    steps.push({ step: 'X', action: 'Error', result: 'FAIL', detail: err.message })
  }

  await page.close()
  await buyerCtx.close()
  await browser.close()

  // Write report
  const ts = new Date().toISOString()
  const passed = txCreated
  let md = `# S12 — Purchase Flow Browser E2E Report\n\n`
  md += `**Fecha:** ${ts}\n`
  md += `**APP_URL:** ${appUrl}\n`
  md += `**Branch:** Manuel/s12-purchase-flow-browser-2026-05-12\n`
  md += `**Resultado:** ${passed ? '✅ PASS' : '❌ FAIL'}\n\n`
  md += `## Steps\n\n`
  md += `| Step | Action | Result | Detail |\n`
  md += `|------|--------|--------|--------|\n`
  for (const s of steps) {
    md += `| ${s.step} | ${s.action} | ${s.result} | ${s.detail || '—'} |\n`
  }
  md += `\n## Screenshots\n\n`
  for (const s of screenshots) {
    const name = path.basename(s)
    md += `- ![](${name})\n`
  }
  fs.writeFileSync(REPORT_FILE, md, 'utf8')
  console.log(`\nReporte: ${REPORT_FILE}`)
  console.log(`Resultado: ${passed ? '✅ PASS' : '❌ FAIL'}`)
  process.exit(passed ? 0 : 1)
}

main().catch(err => { console.error('FATAL:', err); process.exit(2) })
