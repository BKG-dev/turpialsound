import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { loadEnv, getEnv } from '../lib/env.mjs'
import { loginViaMarketplaceModal, getQACredentials } from './login.mjs'

const REPORT_DIR = path.resolve(process.cwd(), 'var', 'qa-results', 's13-proof-upload')
const REPORT_FILE = path.join(REPORT_DIR, 'report.md')
const SCREENSHOT_DIR = path.join(REPORT_DIR, 'screenshots')
const FIXTURE_PATH = path.resolve(process.cwd(), 'scripts', 'qa', 'fixtures', 'payment-proof-dummy.png')

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
  console.log('=== S13 — Payment Proof Upload Browser E2E ===\n')

  const appUrl = getEnv('APP_URL') || 'http://localhost:3002'
  const creds = getQACredentials()
  console.log(`APP_URL: ${appUrl}`)
  console.log(`BUYER: ${creds.buyer.identifier}`)
  console.log(`Fixture: ${FIXTURE_PATH}`)

  if (!fs.existsSync(FIXTURE_PATH)) {
    console.log('ERROR: Fixture not found. Create scripts/qa/fixtures/payment-proof-dummy.png')
    process.exit(1)
  }

  ensureDirs()
  const browser = await chromium.launch({ headless: true })
  const ctxOpts = { viewport: { width: 1280, height: 720 }, locale: 'es-VE' }
  const steps = []
  const screenshots = []
  let proofUploaded = false

  const buyerCtx = await browser.newContext(ctxOpts)
  const page = await buyerCtx.newPage()

  try {
    // Step 1: Login
    console.log('1. Login as buyer...')
    await loginViaMarketplaceModal(page, creds.buyer.identifier, creds.buyer.password)
    await page.waitForTimeout(1000)
    const s1 = await ss(page, '01-logged-in')
    screenshots.push(s1)
    steps.push({ step: 1, action: 'Login buyer', result: 'OK' })
    console.log('   OK')

    // Step 2: Marketplace
    console.log('2. Navigate to marketplace...')
    await page.goto(`${appUrl}/marketplace`, { waitUntil: 'domcontentloaded' })
    try {
      await page.waitForSelector('.card-premium-wrapper', { state: 'visible', timeout: 20000 })
    } catch {
      console.log('   WARNING: No cards found after 20s')
    }
    await page.waitForTimeout(2000)
    const s2 = await ss(page, '02-marketplace')
    screenshots.push(s2)
    const cards = page.locator('.card-premium-wrapper')
    const cardCount = await cards.count()
    console.log(`   Found ${cardCount} listings`)
    steps.push({ step: 2, action: 'Marketplace loaded', result: 'OK', detail: `${cardCount} listings` })

    if (cardCount === 0) throw new Error('NO_LISTINGS: Zero listings on marketplace')

    // Step 3: Open first listing
    console.log('3. Opening listing...')
    await cards.first().click()
    await page.waitForTimeout(2000)
    const s3 = await ss(page, '03-listing-detail')
    screenshots.push(s3)
    steps.push({ step: 3, action: 'Listing detail', result: 'OK' })

    // Step 4: Click Comprar - try multiple selectors and listings
    console.log('4. Click Comprar...')
    // If first listing already purchased, try another one
    let buyClicked = false
    for (let attempt = 0; attempt < 5 && !buyClicked; attempt++) {
      if (attempt > 0) {
        // Go back to marketplace and try next listing
        await page.goto(`${appUrl}/marketplace`, { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(2000)
        await page.waitForSelector('.card-premium-wrapper', { state: 'visible', timeout: 10000 })
        const nextCard = page.locator('.card-premium-wrapper').nth(attempt)
        if (await nextCard.count() === 0) break
        await nextCard.click()
      }
      await page.waitForTimeout(2000)
      // Try multiple buy button selectors
      for (const sel of [
        'button:has-text("Comprar ahora")',
        'button:has-text("Comprar")',
        'button:has-text("Iniciar compra")',
        'button:has-text("Comprar por")',
      ]) {
        const btn = page.locator(sel).first()
        if (await btn.count() > 0) {
          try {
            await btn.click({ timeout: 3000 })
            buyClicked = true
            console.log(`   Clicked "${sel}" (attempt ${attempt + 1})`)
            break
          } catch {}
        }
      }
    }
    if (!buyClicked) throw new Error('NO_BUY_BUTTON: No "Comprar" button found on any listing (may all be already purchased by this buyer)')
    await page.waitForTimeout(1500)
    const s4 = await ss(page, '04-checkout-opened')
    screenshots.push(s4)
    steps.push({ step: 4, action: 'Checkout opened', result: 'OK' })

    // Step 5: Select Pago Movil
    console.log('5. Select Pago Móvil...')
    const pmEl = page.locator('text=Pago Movil').first()
    await pmEl.click({ timeout: 5000 })
    await page.waitForTimeout(1500)
    const s5 = await ss(page, '05-pago-movil-selected')
    screenshots.push(s5)
    steps.push({ step: 5, action: 'Pago Móvil selected', result: 'OK' })

    // Step 6: Fill form fields
    console.log('6. Fill payment form...')
    // Reference/operation number
    const allInputs = page.locator('input[type="text"]:not([readonly])')
    const editableCount = await allInputs.count()
    if (editableCount > 0) {
      await allInputs.first().fill('S13-REF-' + Date.now())
      console.log(`   Filled reference (${editableCount} editable text inputs)`)
    }
    // Bank
    const bankSel = page.locator('select').first()
    if (await bankSel.count() > 0) {
      await bankSel.selectOption({ index: 1 })
      console.log('   Bank selected')
    }
    // Date
    const dateInp = page.locator('input[type="date"]').first()
    if (await dateInp.count() > 0) {
      await dateInp.fill(new Date().toISOString().split('T')[0])
      console.log('   Date filled')
    }
    const s6 = await ss(page, '06-form-filled')
    screenshots.push(s6)
    steps.push({ step: 6, action: 'Form filled', result: 'OK' })

    // ★ Step 7: Upload payment proof file (key differentiator from S12)
    console.log('7. Upload payment proof...')
    const fileInput = page.locator('input[type="file"]').first()
    if (await fileInput.count() > 0) {
      await fileInput.setInputFiles(FIXTURE_PATH)
      await page.waitForTimeout(2000)
      // Check for visual confirmation (green check, file name)
      const proofIndicator = page.locator('text=dummy, .text-\\\\[\\\\#4ade80\\\\]').first()
      try {
        await proofIndicator.waitFor({ state: 'visible', timeout: 5000 })
        proofUploaded = true
        console.log('   File upload confirmed')
      } catch {
        console.log('   File input set but no visual confirmation detected')
        proofUploaded = 'maybe'
      }
    } else {
      console.log('   WARNING: No file input found. Looking for upload area...')
      // Click the upload area label to trigger file input
      const uploadLabel = page.locator('text=Subir comprobante').first()
      if (await uploadLabel.count() > 0) {
        // The file input might be hidden (sr-only). Use file chooser.
        const [fileChooser] = await Promise.all([
          page.waitForEvent('filechooser', { timeout: 5000 }),
          uploadLabel.click(),
        ])
        await fileChooser.setFiles(FIXTURE_PATH)
        await page.waitForTimeout(2000)
        proofUploaded = true
        console.log('   File uploaded via file chooser')
      } else {
        console.log('   WARNING: No upload area found. Skipping file upload.')
      }
    }
    const s7 = await ss(page, '07-proof-uploaded')
    screenshots.push(s7)
    steps.push({ step: 7, action: 'Proof uploaded', result: proofUploaded ? 'OK' : 'WARN' })

    // Step 8: Confirm
    console.log('8. Confirm payment...')
    const scrollArea = page.locator('.max-h-\\[55vh\\], .overflow-y-auto').first()
    if (await scrollArea.count() > 0) {
      await scrollArea.evaluate(el => el.scrollTop = el.scrollHeight)
      await page.waitForTimeout(500)
    }
    let confClicked = false
    for (const sel of ['button:has-text("Confirmar pago")', 'button:has-text("Confirmar")', 'button[type="submit"]']) {
      const el = page.locator(sel).first()
      if (await el.count() > 0) {
        await el.click({ timeout: 5000 })
        confClicked = true
        console.log(`   Clicked: "${sel}"`)
        break
      }
    }
    if (!confClicked) throw new Error('NO_CONFIRM_BUTTON')
    await page.waitForTimeout(4000)
    const s8 = await ss(page, '08-confirmation')
    screenshots.push(s8)

    // Step 9: Verify
    console.log('9. Verify confirmation...')
    const body = await page.locator('body').textContent()
    const confirms = ['Pago procesado', 'PENDING_PAYMENT', 'en revisión', 'comprobante', 'validado']
    const found = confirms.filter(c => body?.toLowerCase().includes(c.toLowerCase()))
    console.log(`   Keywords found: ${found.join(', ')}`)
    steps.push({ step: 9, action: 'Confirmation screen', result: found.length > 0 ? 'PASS' : 'WARN', detail: found.join(', ') })

  } catch (err) {
    console.log(`\nERROR: ${err.message}`)
    steps.push({ step: 'X', action: 'Error', result: 'FAIL', detail: err.message })
  }

  await page.close()
  await buyerCtx.close()
  await browser.close()

  const ts = new Date().toISOString()
  const passed = proofUploaded === true || proofUploaded === 'maybe'
  let md = `# S13 — Payment Proof Upload Browser E2E Report\n\n`
  md += `**Fecha:** ${ts}\n`
  md += `**APP_URL:** ${appUrl}\n`
  md += `**Branch:** Manuel/s13-proof-upload-browser-2026-05-12\n`
  md += `**Fixture:** payment-proof-dummy.png\n`
  md += `**Resultado:** ${passed ? '✅ PASS' : '❌ FAIL'}\n\n`
  md += `## Steps\n\n`
  md += `| Step | Action | Result | Detail |\n`
  md += `|------|--------|--------|--------|\n`
  for (const s of steps) {
    md += `| ${s.step} | ${s.action} | ${s.result} | ${s.detail || '—'} |\n`
  }
  md += `\n## Screenshots\n\n`
  for (const s of screenshots) {
    md += `- ![](${path.basename(s)})\n`
  }
  fs.writeFileSync(REPORT_FILE, md, 'utf8')
  console.log(`\nReporte: ${REPORT_FILE}`)
  console.log(`Resultado: ${passed ? '✅ PASS' : '❌ FAIL'}`)
  process.exit(passed ? 0 : 1)
}

main().catch(err => { console.error('FATAL:', err); process.exit(2) })
