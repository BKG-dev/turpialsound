import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { loadEnv, getEnv } from '../lib/env.mjs'
import { loginViaMarketplaceModal, getQACredentials } from './login.mjs'

const REPORT_DIR = path.resolve(process.cwd(), 'var', 'qa-results', 's16-chat-notifications')
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
  console.log('=== S16 — Chat + Notifications Playwright Test ===')
  console.log('')

  const appUrl = getEnv('APP_URL') || 'http://localhost:3002'
  console.log(`APP_URL: ${appUrl}`)
  ensureDirs()

  const LISTING_SLUG = 'qa-e2e-s03f-selleria-discovery'

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()

  try {
    // ── 1. Login como buyerIA ──
    console.log('1. Login como buyerIA...')
    const creds = getQACredentials()
    const buyerCreds = creds.buyer
    await page.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)
    const buyerLoggedIn = await loginViaMarketplaceModal(page, buyerCreds.identifier, buyerCreds.password)
    log('buyerLogin', buyerLoggedIn ? 'PASS' : 'FAIL', buyerLoggedIn ? 'buyerIA autenticado' : 'no se pudo autenticar')
    await ss(page, '01-buyer-logged-in')
    if (!buyerLoggedIn) throw new Error('Login buyerIA fallido')

    // ── 2. Navegar al listing QA persistente y abrir chat ──
    console.log('2. Navegar a listing QA y abrir chat...')
    await page.goto(`${appUrl}/marketplace/${LISTING_SLUG}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)

    const listingVisible = await page.locator('text=Contactar Vendedor').first().isVisible().catch(() => false)
    log('listingDetailLoad', listingVisible ? 'PASS' : 'FAIL', listingVisible ? 'pagina listing cargada con boton Contactar' : 'boton Contactar no visible')

    let chatOpened = false
    try {
      const contactBtn = page.locator('button:has-text("Contactar Vendedor")').first()
      await contactBtn.waitFor({ state: 'visible', timeout: 10000 })
      await contactBtn.click()
      await page.waitForTimeout(2000)
      chatOpened = true
      log('chatOpen', 'PASS', 'chat modal abierto')
    } catch {
      log('chatOpen', 'FAIL', 'no se pudo abrir el chat')
    }
    await ss(page, '02-chat-opened')

    // ── 3. Enviar mensaje ──
    console.log('3. Enviar mensaje "QA S16 test message"...')
    let messageSent = false
    if (chatOpened) {
      try {
        const textarea = page.locator('textarea[placeholder*="Escribe un mensaje"]').first()
        await textarea.waitFor({ state: 'visible', timeout: 10000 })
        await textarea.fill('QA S16 test message')
        await page.waitForTimeout(300)

        const sendBtn = page.locator('textarea[placeholder*="Escribe un mensaje"]').locator('..').locator('..').locator('button:last-child').first()
        await sendBtn.waitFor({ state: 'visible', timeout: 5000 })
        await sendBtn.click()
        await page.waitForTimeout(3000)
        messageSent = true
        log('messageSend', 'PASS', 'mensaje "QA S16 test message" enviado')
      } catch {
        log('messageSend', 'FAIL', 'no se pudo enviar el mensaje')
      }
    } else {
      log('messageSend', 'FAIL', 'chat no abierto, no se pudo enviar')
    }
    await ss(page, '03-message-sent')

    // ── 4. Cerrar sesion buyerIA ──
    console.log('4. Cerrar sesion buyerIA...')
    try {
      const salirBtn = page.locator('[title="Salir"], [aria-label="Salir"]').first()
      await salirBtn.waitFor({ state: 'visible', timeout: 10000 })
      await salirBtn.click()
      await page.waitForTimeout(2000)
      log('buyerLogout', 'PASS', 'sesion buyerIA cerrada')
    } catch {
      log('buyerLogout', 'FAIL', 'no se pudo cerrar sesion')
    }
    await ss(page, '04-buyer-logged-out')

    // ── 5. Login como sellerIA ──
    console.log('5. Login como sellerIA...')
    const sellerCreds = creds.seller
    await page.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)
    const sellerLoggedIn = await loginViaMarketplaceModal(page, sellerCreds.identifier, sellerCreds.password)
    log('sellerLogin', sellerLoggedIn ? 'PASS' : 'FAIL', sellerLoggedIn ? 'sellerIA autenticado' : 'no se pudo autenticar')
    await ss(page, '05-seller-logged-in')
    if (!sellerLoggedIn) throw new Error('Login sellerIA fallido')

    // ── 6. Verificar unread count en badge de Mensajes ──
    console.log('6. Verificar badge de mensajes no leidos...')
    let unreadCount = 0
    let badgeVerified = false

    try {
      const unreadSpan = page.locator('a[href*="dashboard?tab=messages"] span.tabular-nums, button[aria-label*="sin leer"] span.tabular-nums').first()
      const unreadVisible = await unreadSpan.isVisible().catch(() => false)
      if (unreadVisible) {
        const text = await unreadSpan.textContent().catch(() => '0')
        const parsed = parseInt(text?.replace('99+', '99') || '0', 10)
        unreadCount = isNaN(parsed) ? 0 : parsed
        badgeVerified = unreadCount > 0
        log('unreadBadge', badgeVerified ? 'PASS' : 'FAIL', `unread count = ${unreadCount}`)
      } else {
        const mensajesBtn = page.locator('a[href*="dashboard?tab=messages"], button[aria-label]').filter({ hasText: /sin leer/ }).first()
        const mensajesVisible = await mensajesBtn.isVisible().catch(() => false)
        if (mensajesVisible) {
          const label = await mensajesBtn.getAttribute('aria-label').catch(() => '')
          const match = label?.match(/(\d+)/)
          if (match) {
            unreadCount = parseInt(match[1], 10)
            badgeVerified = unreadCount > 0
            log('unreadBadge', badgeVerified ? 'PASS' : 'FAIL', `unread count = ${unreadCount} (aria-label)`)
          } else {
            log('unreadBadge', 'WARN', 'badge visible pero sin conteo numerico')
          }
        } else {
          log('unreadBadge', 'FAIL', 'badge de mensajes no leidos no visible')
        }
      }
    } catch {
      log('unreadBadge', 'FAIL', 'error al verificar badge')
    }
    await ss(page, '06-unread-badge')

    // ── 7. Navegar al dashboard messages para ver el mensaje ──
    console.log('7. Navegar a dashboard messages para verificar mensaje...')
    try {
      await page.goto(`${appUrl}/marketplace/dashboard?tab=messages&focus=unread`, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(3000)

      const messageText = page.locator(`text=QA S16 test message`).first()
      const messageVisible = await messageText.isVisible().catch(() => false)
      log('messageDelivery', messageVisible ? 'PASS' : 'FAIL', messageVisible ? 'mensaje QA S16 visible en dashboard' : 'mensaje no visible en dashboard')
    } catch {
      log('messageDelivery', 'FAIL', 'no se pudo navegar al dashboard de mensajes')
    }
    await ss(page, '07-seller-dashboard-message')

  } catch (error) {
    log('fatal', 'FAIL', error.message)
    console.error(error)
  } finally {
    // ── Report ──
    const results = {
      sprint: 'S16',
      test: 'Chat + Notifications Playwright E2E',
      appUrl,
      listingSlug: LISTING_SLUG,
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
      `# S16 Playwright Test — Chat + Notifications`,
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
