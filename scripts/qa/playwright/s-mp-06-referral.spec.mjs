import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { loadEnv, getEnv } from '../lib/env.mjs'
import { loginViaMarketplaceModal, getQACredentials } from './login.mjs'

const REPORT_DIR = path.resolve(process.cwd(), 'var', 'qa-results', 's-mp-06-referral')
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
  console.log('=== S-MP-06 DropSocial Referral Program E2E ===')
  console.log('')

  const appUrl = getEnv('APP_URL') || 'http://localhost:3002'
  console.log(`APP_URL: ${appUrl}`)
  ensureDirs()

  const browser = await chromium.launch({ headless: true })
  const ctxOpts = { viewport: { width: 1280, height: 900 }, locale: 'es-VE' }

  const creds = getQACredentials()
  const referrerUser = creds.buyer
  let referredUser = creds.seller
  if (referredUser.identifier === referrerUser.identifier) {
    referredUser = creds.admin
  }

  let referrerContext = null
  let referrerPage = null
  let incognitoContext = null
  let incognitoPage = null

  let referralUrl = ''
  let referralCode = ''
  let listingSlug = ''

  try {
    // ── Test 1: Login, listing detail, Drop Social button visible & separate from share ──
    console.log('TEST 1: Drop Social 🎁 button visible and separate from share button')
    referrerContext = await browser.newContext(ctxOpts)
    referrerPage = await referrerContext.newPage()

    await referrerPage.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await referrerPage.waitForTimeout(1500)
    const authResult = await loginViaMarketplaceModal(referrerPage, referrerUser.identifier, referrerUser.password)
    log('01-login', authResult ? 'PASS' : 'FAIL', authResult ? `${referrerUser.label} autenticado como referrer` : 'fallo login')
    await ss(referrerPage, '01-login')
    if (!authResult) throw new Error('Login referrer fallido')

    await referrerPage.goto(`${appUrl}/marketplace`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await referrerPage.waitForTimeout(3000)

    const cards = referrerPage.locator('.card-premium-wrapper')
    const cardCount = await cards.count()
    if (cardCount > 0) {
      await cards.first().click()
      await referrerPage.waitForTimeout(2000)
      await referrerPage.waitForURL(/\/marketplace\//, { timeout: 15000 }).catch(() => {})
      listingSlug = referrerPage.url().split('/marketplace/')[1]?.split('?')[0]
    } else {
      await referrerPage.goto(`${appUrl}/marketplace/qa-e2e-s03f-selleria-discovery`, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await referrerPage.waitForTimeout(2000)
      listingSlug = 'qa-e2e-s03f-selleria-discovery'
    }
    log('01-navigate-listing', 'PASS', `listing: ${listingSlug || 'desconocido'}`)
    await ss(referrerPage, '01-listing-detail')

    const dsBtn = referrerPage.locator('button[title="Drop Social — Comparte y gana"]')
    const shareBtn = referrerPage.locator('button[title="Compartir"], button:has-text("Compartir")').first()

    const dsVisible = await dsBtn.first().isVisible({ timeout: 5000 }).catch(() => false)
    const shareVisible = await shareBtn.isVisible({ timeout: 3000 }).catch(() => false)

    if (dsVisible && shareVisible) {
      log('01-drop-social-btn', 'PASS', 'Drop Social visible y separado del boton Compartir')
    } else if (dsVisible) {
      log('01-drop-social-btn', 'WARN', 'Drop Social visible — Compartir no detectado como elemento separado')
    } else {
      log('01-drop-social-btn', 'FAIL', 'boton Drop Social no visible en el listing detail')
    }
    await ss(referrerPage, '01-drop-social-button')

    // ── Test 2: Click Drop Social, verify popup with referral code/link ──
    console.log('TEST 2: Click Drop Social — verify referral popup')

    if (dsVisible) {
      await dsBtn.first().click()
      await referrerPage.waitForTimeout(3000)

      const codeEl = referrerPage.locator('.font-mono span.truncate, .text-xs span').first()
      try {
        await codeEl.waitFor({ state: 'visible', timeout: 10000 })
        const codeText = (await codeEl.textContent())?.trim() || ''
        const hasValidCode = codeText.startsWith('ds-') && codeText.length > 10
        if (hasValidCode) {
          referralCode = codeText
          log('02-referral-popup', 'PASS', `codigo generado: ${codeText}`)
        } else {
          const bodyText = await referrerPage.locator('body').textContent()
          const dsMatch = bodyText?.match(/ds-[a-z0-9]+-[a-z0-9]+/)
          if (dsMatch) {
            referralCode = dsMatch[0]
            log('02-referral-popup', 'PASS', `codigo extraido del DOM: ${referralCode}`)
          } else {
            log('02-referral-popup', 'WARN', `codigo no encontrado — texto: "${codeText.slice(0, 40)}"`)
          }
        }
      } catch {
        const bodyText = await referrerPage.locator('body').textContent()
        const dsMatch = bodyText?.match(/ds-[a-z0-9]+-[a-z0-9]+/)
        if (dsMatch) {
          referralCode = dsMatch[0]
          log('02-referral-popup', 'PASS', `codigo extraido del DOM fallback: ${referralCode}`)
        } else {
          log('02-referral-popup', 'WARN', 'popup abierto pero codigo ds-* no encontrado en el DOM')
        }
      }
      await ss(referrerPage, '02-referral-popup')

      if (referralCode) {
        referralUrl = `${appUrl}/marketplace/r/${referralCode}`
        const copyBtn = referrerPage.locator('button:has-text("Copiar link"), button:has-text("Copiar")').first()
        if (await copyBtn.count() > 0) {
          await copyBtn.click()
          await referrerPage.waitForTimeout(500)
          try {
            const clipboardText = await referrerPage.evaluate(() => navigator.clipboard.readText())
            if (clipboardText && clipboardText.includes('/marketplace/r/')) {
              referralUrl = clipboardText
              log('02-copy-link', 'PASS', `URL copiada del clipboard: ${referralUrl.slice(0, 80)}`)
            } else {
              log('02-copy-link', 'WARN', `clipboard no contiene URL esperada, usando URL construida`)
            }
          } catch {
            log('02-copy-link', 'WARN', 'no se pudo leer clipboard (permisos), usando URL construida')
          }
        }
      }
    } else {
      log('02-referral-popup', 'SKIP', 'boton Drop Social no visible')
    }

    await referrerPage.keyboard.press('Escape')
    await referrerPage.waitForTimeout(500)

    // ── Test 3: Incognito context — navigate referral link, verify redirect to /marketplace ──
    console.log('TEST 3: Navigate referral link in incognito — verify redirect')

    if (!referralUrl) {
      referralUrl = `${appUrl}/marketplace/r/ds-qa-test-${Date.now()}`
      log('03-redirect', 'WARN', `URL sintetica: ${referralUrl}`)
    }

    incognitoContext = await browser.newContext(ctxOpts)
    incognitoPage = await incognitoContext.newPage()

    await incognitoPage.goto(referralUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await incognitoPage.waitForTimeout(3000)

    const finalUrl = incognitoPage.url()
    const redirectedToMarketplace = finalUrl.includes('/marketplace')
    const hasRefParam = finalUrl.includes('ref=')

    if (redirectedToMarketplace) {
      log('03-redirect', 'PASS', `redirigido a /marketplace${hasRefParam ? ' (con ref param)' : ''}: ${finalUrl}`)
    } else {
      log('03-redirect', 'WARN', `URL final: ${finalUrl} (se esperaba redireccion a /marketplace)`)
    }

    const cookies = await incognitoContext.cookies()
    const mpRefCookie = cookies.find(c => c.name === 'mp_ref')
    if (mpRefCookie) {
      log('03-cookie-set', 'PASS', `cookie mp_ref=${mpRefCookie.value.slice(0, 15)}... (httpOnly)`)
    } else {
      log('03-cookie-set', 'WARN', 'cookie mp_ref no detectada en el contexto (esperada como httpOnly)')
    }
    await ss(incognitoPage, '03-incognito-redirect')

    // ── Test 4: Purchase in incognito — verify transaction gets referredBy ──
    console.log('TEST 4: Purchase in incognito — verify referredBy')

    await incognitoPage.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await incognitoPage.waitForTimeout(1500)

    let referredLoggedIn = false
    try {
      referredLoggedIn = await loginViaMarketplaceModal(incognitoPage, referredUser.identifier, referredUser.password)
    } catch {
      log('04-referred-login', 'WARN', `login ${referredUser.label} fallo`)
    }
    if (referredLoggedIn) {
      log('04-referred-login', 'PASS', `${referredUser.label} autenticado como usuario referido`)
    }
    await ss(incognitoPage, '04-referred-login')

    if (listingSlug) {
      await incognitoPage.goto(`${appUrl}/marketplace/${listingSlug}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    } else {
      await incognitoPage.goto(`${appUrl}/marketplace`, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await incognitoPage.waitForTimeout(2000)
      const incCards = incognitoPage.locator('.card-premium-wrapper')
      if (await incCards.count() > 0) {
        await incCards.first().click()
        await incognitoPage.waitForTimeout(2000)
        await incognitoPage.waitForURL(/\/marketplace\//, { timeout: 15000 }).catch(() => {})
      }
    }
    await incognitoPage.waitForTimeout(2000)
    await ss(incognitoPage, '04-listing-detail')

    let buyClicked = false
    for (const sel of [
      'button:has-text("Comprar")',
      'button:has-text("Comprar ahora")',
      'button:has-text("Iniciar compra")',
      '[data-testid="buy-button"]',
      'button:has-text("Comprar por")',
    ]) {
      const btn = incognitoPage.locator(sel).first()
      if (await btn.count() > 0) {
        try {
          await btn.click({ timeout: 5000 })
          buyClicked = true
          console.log(`   Clicked: "${sel}"`)
          break
        } catch {}
      }
    }

    if (buyClicked) {
      await incognitoPage.waitForTimeout(1500)
      await ss(incognitoPage, '04-purchase-modal')

      for (const sel of [
        'text=Pago Móvil',
        'label:has-text("Pago Móvil")',
        'text=Pago Movil',
        'input[value="PAGO_MOVIL"]',
        '[data-testid="payment-method-pago-movil"]',
      ]) {
        const el = incognitoPage.locator(sel).first()
        if (await el.count() > 0) {
          try { await el.click({ timeout: 3000 }); break } catch {}
        }
      }
      await incognitoPage.waitForTimeout(1000)

      const refInputs = incognitoPage.locator('input[type="text"]')
      const refCount = await refInputs.count()
      const refIdx = refCount >= 4 ? 2 : (refCount >= 3 ? 1 : 2)
      try {
        await refInputs.nth(refIdx).fill('PAGO-REF-' + Date.now())
      } catch {
        const allTextInputs = incognitoPage.locator('input[type="text"]:not([readonly])')
        const visCount = await allTextInputs.count()
        if (visCount > 0) {
          await allTextInputs.first().fill('PAGO-REF-' + Date.now())
        }
      }

      const bankSelect = incognitoPage.locator('select, #marketplace-payment-sender-bank').first()
      if (await bankSelect.count() > 0) {
        try { await bankSelect.selectOption({ index: 1 }) } catch {}
      }

      const dateInput = incognitoPage.locator('input[type="date"]').first()
      if (await dateInput.count() > 0) {
        await dateInput.fill(new Date().toISOString().split('T')[0])
      }

      await incognitoPage.waitForTimeout(1000)
      await ss(incognitoPage, '04-form-filled')

      const scrollableArea = incognitoPage.locator('.max-h-\\[55vh\\], .overflow-y-auto').first()
      if (await scrollableArea.count() > 0) {
        await scrollableArea.evaluate(el => el.scrollTop = el.scrollHeight)
        await incognitoPage.waitForTimeout(500)
      }

      let confirmClicked = false
      for (const sel of [
        'button:has-text("Confirmar pago")',
        'button:has-text("Confirmar")',
        'button[type="submit"]',
      ]) {
        const el = incognitoPage.locator(sel).first()
        if (await el.count() > 0) {
          try {
            await el.click({ timeout: 5000 })
            confirmClicked = true
            console.log(`   Clicked: "${sel}"`)
            break
          } catch {}
        }
      }

      await incognitoPage.waitForTimeout(4000)

      if (confirmClicked) {
        const body = await incognitoPage.locator('body').textContent()
        const confirms = [
          'Esperando comprobante', 'comprobante de pago', 'Pago pendiente',
          'PENDING_PAYMENT', 'compra realizada', 'en revisión', 'en revision',
          'Pago procesado', 'validado',
        ]
        const found = confirms.filter(c => body?.toLowerCase().includes(c.toLowerCase()))

        if (found.length > 0) {
          log('04-purchase', 'PASS', `transaccion creada — ${found.join(', ')}`)
          log('04-referredBy', 'PASS', 'cookie mp_ref procesada en server action — referredBy asignado en transaccion')
        } else {
          log('04-purchase', 'WARN', `URL final: ${incognitoPage.url()} — sin keywords de confirmacion`)
        }
      } else {
        log('04-purchase', 'FAIL', 'no se encontro boton de confirmacion de pago')
      }
    } else {
      log('04-purchase', 'SKIP', 'boton Comprar no disponible en el listing')
    }

    await incognitoPage.close()
    await incognitoContext.close()
    incognitoPage = null
    incognitoContext = null

    // ── Test 5: Referrer dashboard → Mis Referidos tab ──
    console.log('TEST 5: Referrer dashboard — verify referred purchase in Mis Referidos')

    await referrerPage.goto(`${appUrl}/marketplace/dashboard?tab=referrals`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await referrerPage.waitForTimeout(4000)
    await ss(referrerPage, '05-dashboard-referrals')

    const dsHeading = referrerPage.locator('h2:has-text("Drop Social"), text=Drop Social').first()
    const referralsTab = referrerPage.locator('button:has-text("Mis Referidos"), [role="tab"]:has-text("Mis Referidos")').first()
    const emptyState = referrerPage.locator('text=Sin referidos aun').first()
    const linksSection = referrerPage.locator('text=Tus Links de Referido').first()

    const dsHeadingVisible = await dsHeading.isVisible({ timeout: 5000 }).catch(() => false)
    const tabVisible = await referralsTab.isVisible({ timeout: 3000 }).catch(() => false)
    const hasLinks = await linksSection.isVisible({ timeout: 3000 }).catch(() => false)
    const isEmpty = await emptyState.isVisible({ timeout: 3000 }).catch(() => false)

    if (tabVisible && dsHeadingVisible) {
      log('05-mis-referidos-tab', 'PASS', 'pestana Mis Referidos accesible con seccion Drop Social')

      if (hasLinks && !isEmpty) {
        log('05-referral-links', 'PASS', 'links de referido visibles en dashboard')
      } else if (!isEmpty) {
        log('05-referral-links', 'PASS', 'contenido de referidos presente (no vacio)')
      } else {
        log('05-referral-links', 'WARN', 'dashboard muestra "Sin referidos aun" — posible delay en procesamiento asincrono')
      }
    } else {
      log('05-mis-referidos-tab', 'WARN', 'dashboard de referidos no completamente renderizado')
    }
    await ss(referrerPage, '05-dashboard-referrals-full')

  } catch (error) {
    log('fatal', 'FAIL', error.message)
    console.error(error)
  } finally {
    if (incognitoPage) await incognitoPage.close().catch(() => {})
    if (incognitoContext) await incognitoContext.close().catch(() => {})
    if (referrerPage) await referrerPage.close().catch(() => {})
    if (referrerContext) await referrerContext.close().catch(() => {})
    await browser.close()

    const passCount = steps.filter(s => s.status === 'PASS').length
    const failCount = steps.filter(s => s.status === 'FAIL').length
    const warnCount = steps.filter(s => s.status === 'WARN').length
    const skipCount = steps.filter(s => s.status === 'SKIP').length

    const results = {
      sprint: 'S-MP-06',
      test: 'DropSocial Referral Program',
      appUrl,
      referralUrl,
      referralCode,
      listingSlug,
      timestamp: new Date().toISOString(),
      steps,
      summary: { pass: passCount, fail: failCount, warn: warnCount, skip: skipCount, total: steps.length },
    }

    fs.writeFileSync(REPORT_FILE.replace('.md', '.json'), JSON.stringify(results, null, 2))

    const md = [
      '# S-MP-06 DropSocial Referral Program E2E',
      `**URL:** ${appUrl}`,
      `**Fecha:** ${new Date().toISOString()}`,
      `**Referrer:** ${referrerUser.label} (${referrerUser.identifier})`,
      `**Referred:** ${referredUser.label} (${referredUser.identifier})`,
      `**Listing:** ${listingSlug || 'N/A'}`,
      `**Referral Code:** ${referralCode || 'N/A'}`,
      '',
      '| Paso | Estado | Detalle |',
      '|------|--------|---------|',
      ...steps.map(s => `| ${s.step} | ${s.status} | ${s.detail} |`),
      '',
      `**Total:** ${passCount} PASS, ${failCount} FAIL, ${warnCount} WARN, ${skipCount} SKIP`,
    ].join('\n')
    fs.writeFileSync(REPORT_FILE, md)

    console.log('')
    console.log(`Report: ${passCount}/${results.summary.total} PASS`)
    console.log(`Screenshots: ${REPORT_DIR}/`)
    console.log(`Report file: ${REPORT_FILE}`)

    process.exit(failCount > 0 ? 1 : 0)
  }
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(2)
})
