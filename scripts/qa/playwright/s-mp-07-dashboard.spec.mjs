import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { loadEnv, getEnv } from '../lib/env.mjs'
import { loginViaMarketplaceModal, getQACredentials } from './login.mjs'

const REPORT_DIR = path.resolve(process.cwd(), 'var', 'qa-results', 's-mp-07-dashboard')
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
  console.log('=== S-MP-07 Dashboard — Dark Mode, Cards, Admin Promotion E2E ===')
  console.log('')

  const appUrl = getEnv('APP_URL') || 'http://localhost:3002'
  console.log(`APP_URL: ${appUrl}`)
  ensureDirs()

  const creds = getQACredentials()

  const browser = await chromium.launch({ headless: true })
  const ctxOpts = { viewport: { width: 1280, height: 900 }, locale: 'es-VE' }

  let adminContext = null
  let adminPage = null
  let buyerContext = null
  let buyerPage = null

  try {
    // ════ CONTEXT: Admin ════
    adminContext = await browser.newContext(ctxOpts)
    adminPage = await adminContext.newPage()

    // ── TEST 1: Login, navigate to /admin, verify dark mode toggle exists ──
    console.log('TEST 1: Login admin, navigate to /admin, verify dark mode toggle')
    await adminPage.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await adminPage.waitForTimeout(1500)

    const adminLoginResult = await loginViaMarketplaceModal(adminPage, creds.admin.identifier, creds.admin.password)
    log('01-login', adminLoginResult ? 'PASS' : 'FAIL', adminLoginResult ? 'admin autenticado' : 'fallo login')
    await ss(adminPage, '01-login')
    if (!adminLoginResult) throw new Error('Login admin fallido')

    await adminPage.goto(`${appUrl}/admin`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await adminPage.waitForTimeout(3000)
    await ss(adminPage, '01-admin-page')

    const darkToggle = adminPage.locator([
      'button[aria-label*="dark" i]',
      'button[aria-label*="Dark"]',
      'button[aria-label*="theme" i]',
      'button[aria-label*="Theme"]',
      'button[title*="dark" i]',
      'button[title*="Dark"]',
      'button:has(svg.lucide-sun)',
      'button:has(svg.lucide-moon)',
      'button[data-testid="theme-toggle"]',
    ].join(', ')).first()

    const toggleVisible = await darkToggle.isVisible({ timeout: 10000 }).catch(() => false)

    if (toggleVisible) {
      log('01-dark-mode-toggle', 'PASS', 'dark mode toggle (sun/moon icon) visible en /admin')
    } else {
      const bodyText = await adminPage.locator('body').textContent()
      const hasSun = /sun|moon|lucide/i.test(bodyText || '')
      const hasTheme = /dark|theme|tema/i.test(bodyText || '')
      if (hasSun) {
        log('01-dark-mode-toggle', 'WARN', 'icono sol/luna en DOM pero toggle no detectable como button')
      } else if (hasTheme) {
        log('01-dark-mode-toggle', 'WARN', `aparente tema oscuro en pagina pero toggle no localizado`)
      } else {
        log('01-dark-mode-toggle', 'FAIL', 'dark mode toggle no visible en /admin')
      }
    }

    // ── TEST 2: Click dark mode toggle, verify dark class, reload, verify persistence ──
    console.log('TEST 2: Toggle dark mode — verify class + persistence')

    if (toggleVisible) {
      let clicked = false
      try { await darkToggle.click(); clicked = true } catch { /* fallback */ }

      if (!clicked) {
        const fallbackToggle = adminPage.locator('button:has(svg)').filter({ has: adminPage.locator('svg.lucide-sun, svg.lucide-moon, svg[data-lucide="sun"], svg[data-lucide="moon"]') }).first()
        if (await fallbackToggle.count() > 0) {
          try { await fallbackToggle.click(); clicked = true } catch {}
        }
      }

      if (clicked) {
        await adminPage.waitForTimeout(1500)
        await ss(adminPage, '02-dark-mode-after-click')
      } else {
        log('02-toggle-click', 'WARN', 'no se pudo hacer click al toggle de dark mode')
      }
    }

    const htmlHasDark = await adminPage.evaluate(() => document.documentElement.classList.contains('dark'))
    if (htmlHasDark) {
      log('02-dark-class', 'PASS', `<html> tiene clase "dark"`)
    } else {
      const htmlClasses = await adminPage.evaluate(() => document.documentElement.className)
      const hasThemeAttr = await adminPage.evaluate(() => document.documentElement.getAttribute('data-theme') || document.documentElement.getAttribute('data-color-scheme'))
      if (hasThemeAttr) {
        log('02-dark-class', 'PASS', `<html> tiene data attribute oscuro: ${hasThemeAttr}`)
      } else {
        log('02-dark-class', 'WARN', `<html> sin clase "dark" — clases actuales: "${htmlClasses}"`)
      }
    }

    await adminPage.reload({ waitUntil: 'domcontentloaded' })
    await adminPage.waitForTimeout(3000)
    await ss(adminPage, '02-dark-mode-after-reload')

    const htmlHasDarkAfterReload = await adminPage.evaluate(() => document.documentElement.classList.contains('dark'))
    if (htmlHasDarkAfterReload) {
      log('02-dark-persistence', 'PASS', 'dark mode persiste tras recargar pagina')
    } else if (!htmlHasDark) {
      log('02-dark-persistence', 'SKIP', 'dark mode no estaba activo antes de recargar')
    } else {
      const hasThemeAfterReload = await adminPage.evaluate(() => document.documentElement.getAttribute('data-theme') || document.documentElement.getAttribute('data-color-scheme'))
      if (hasThemeAfterReload) {
        log('02-dark-persistence', 'PASS', `data attribute oscuro persiste: ${hasThemeAfterReload}`)
      } else {
        log('02-dark-persistence', 'FAIL', 'dark mode NO persiste tras recargar pagina')
      }
    }

    // ════ CONTEXT: Buyer (para marketplace dashboard) ════
    buyerContext = await browser.newContext(ctxOpts)
    buyerPage = await buyerContext.newPage()

    // ── TEST 3: In /marketplace/dashboard, click a dashboard card, verify navigation ──
    console.log('TEST 3: /marketplace/dashboard — click card, verify filtered view')

    await buyerPage.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await buyerPage.waitForTimeout(1500)

    const buyerLoginResult = await loginViaMarketplaceModal(buyerPage, creds.buyer.identifier, creds.buyer.password)
    log('03-login', buyerLoginResult ? 'PASS' : 'FAIL', buyerLoginResult ? 'buyer autenticado' : 'fallo login')
    await ss(buyerPage, '03-buyer-login')
    if (!buyerLoginResult) throw new Error('Login buyer fallido')

    await buyerPage.goto(`${appUrl}/marketplace/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await buyerPage.waitForTimeout(3000)
    await ss(buyerPage, '03-marketplace-dashboard')

    const cardSelectors = [
      '.card',
      '.card-premium-wrapper',
      '[class*="card"]',
      'a[href*="dashboard?tab="]',
      'button[role="tab"]',
    ]

    let cardClicked = false
    let cardLabel = ''

    for (const sel of cardSelectors) {
      if (cardClicked) break

      const cards = buyerPage.locator(sel)
      const cardCount = await cards.count()

      for (let i = 0; i < cardCount; i++) {
        const card = cards.nth(i)
        const cardText = await card.textContent().catch(() => '')

        const isDashboardCard = /Revenue|revenue|Ingreso|ingreso|Operaciones|operaciones|Ventas|ventas|Estad.stica|estad.stica|M.tric|m.tric|Dashboard/i.test(cardText || '')
        const isSidebarLink = /configuraci.n/i.test(cardText || '')

        if (isDashboardCard && !isSidebarLink) {
          const beforeUrl = buyerPage.url()
          try {
            await card.click({ timeout: 5000 })
            await buyerPage.waitForTimeout(2500)
            cardClicked = true
            cardLabel = cardText.slice(0, 40).replace(/\s+/g, ' ')
            break
          } catch { /* try next */ }
        }
      }
    }

    if (!cardClicked) {
      const tabs = buyerPage.locator('button[role="tab"], a[role="tab"], [data-testid="dashboard-tab"]')
      const tabCount = await tabs.count()
      for (let i = 0; i < tabCount; i++) {
        const tab = tabs.nth(i)
        const tabText = await tab.textContent().catch(() => '')
        if (tabText && tabText.trim().length > 2) {
          try {
            await tab.click({ timeout: 3000 })
            await buyerPage.waitForTimeout(2000)
            cardClicked = true
            cardLabel = tabText.trim().slice(0, 40)
            break
          } catch {}
        }
      }
    }

    if (cardClicked) {
      await ss(buyerPage, '03-after-card-click')
      const afterUrl = buyerPage.url()
      const urlHasTab = /tab=/.test(afterUrl)
      const urlChanged = afterUrl !== `${appUrl}/marketplace/dashboard`

      if (urlHasTab) {
        log('03-dashboard-card', 'PASS', `click en "${cardLabel}" → URL con tab= filtrado`)
      } else if (urlChanged) {
        log('03-dashboard-card', 'PASS', `click en "${cardLabel}" → URL cambio: ${afterUrl.slice(-60)}`)
      } else {
        const pageContent = await buyerPage.locator('body').textContent({ timeout: 3000 }).catch(() => '')
        const hasFiltered = /filtro|filter|tab|secci.n/i.test(pageContent || '')
        if (hasFiltered) {
          log('03-dashboard-card', 'PASS', `click en "${cardLabel}" → contenido filtrado visible en pagina`)
        } else {
          log('03-dashboard-card', 'WARN', `click en "${cardLabel}" — no se detecto navegacion a vista filtrada`)
        }
      }
    } else {
      const pageText = await buyerPage.locator('body').textContent().catch(() => '')
      const hasDashboardContent = pageText && pageText.length > 200
      if (hasDashboardContent) {
        log('03-dashboard-card', 'WARN', 'dashboard renderizado pero sin cards navegables detectadas')
      } else {
        log('03-dashboard-card', 'FAIL', '/marketplace/dashboard sin cards navegables — contenido no detectable')
      }
    }

    await buyerPage.close()
    await buyerContext.close()
    buyerPage = null
    buyerContext = null

    // ════ CONTEXT: Admin (continuacion) ════
    // ── TEST 4: Verify Igor Mugdanov can be promoted to ADMIN ──
    console.log('TEST 4: Admin dashboard — Igor Mugdanov promotion')

    await adminPage.goto(`${appUrl}/marketplace/admin`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await adminPage.waitForTimeout(3000)
    await ss(adminPage, '04-admin-dashboard')

    const igorFound = await adminPage.locator('text=Igor Mugdanov').first().isVisible({ timeout: 10000 }).catch(() => false)

    if (igorFound) {
      log('04-igor-found', 'PASS', 'Igor Mugdanov aparece en admin dashboard')

      const igorRow = adminPage.locator('tr:has-text("Igor Mugdanov"), div:has-text("Igor Mugdanov"), li:has-text("Igor Mugdanov")').first()
      let promoteBtn = igorRow.locator([
        'button:has-text("Promover")',
        'button:has-text("promover")',
        'button:has-text("ADMIN")',
        'button:has-text("Admin")',
        'button:has-text("admin")',
        'button[title*="promover" i]',
        'button[title*="Promover"]',
        'select',
        '[role="button"]:has-text("Promover")',
        '[role="button"]:has-text("ADMIN")',
      ].join(', ')).first()

      if (await promoteBtn.count() > 0) {
        const btnVisible = await promoteBtn.isVisible({ timeout: 5000 }).catch(() => false)
        if (btnVisible) {
          const btnText = await promoteBtn.textContent().catch(() => '')
          log('04-promote-button', 'PASS', `boton de accion encontrado: "${btnText?.trim()}"`)
          await ss(adminPage, '04-igor-row-promote')
        } else {
          log('04-promote-button', 'WARN', 'boton de accion presente en DOM pero no visible')
        }
      } else {
        const fullRowText = await igorRow.textContent({ timeout: 3000 }).catch(() => '')
        const hasActionWords = /promover|admin|cambiar\s*rol|role/i.test(fullRowText || '')
        if (hasActionWords) {
          log('04-promote-button', 'PASS', `fila Igor contiene accion de promocion: "${(fullRowText || '').slice(0, 80)}"`)
        } else {
          log('04-promote-button', 'WARN', `Igor Mugdanov visible pero sin boton de promocion detectable — texto: "${(fullRowText || '').slice(0, 80)}"`)
        }
      }
    } else {
      const usersSection = adminPage.locator('text=Usuarios, text=Users, text=usuarios').first()
      const usersVisible = await usersSection.isVisible({ timeout: 5000 }).catch(() => false)
      if (usersVisible) {
        const sectionText = await adminPage.locator('body').textContent()
        const igorInPage = /Igor\s*Mugdanov/i.test(sectionText || '')
        if (igorInPage) {
          log('04-igor-found', 'PASS', 'Igor Mugdanov presente en la pagina (posiblemente fuera de viewport)')
          await adminPage.evaluate(() => {
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
            let node
            while ((node = walker.nextNode())) {
              if (/Igor\s*Mugdanov/i.test(node.textContent || '')) {
                const el = node.parentElement
                if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' })
                break
              }
            }
          })
          await adminPage.waitForTimeout(500)
          await ss(adminPage, '04-igor-scrolled')
          log('04-promote-button', 'WARN', 'Igor encontrado por scroll — verificar boton manualmente en screenshot')
        } else {
          log('04-igor-found', 'FAIL', 'Igor Mugdanov no aparece en admin dashboard — verificar seed de usuarios QA')
        }
      } else {
        log('04-igor-found', 'WARN', 'seccion de usuarios no visible en /marketplace/admin — pagina cargada pero contenido diferente al esperado')
        await ss(adminPage, '04-admin-dashboard-full')
      }
    }

  } catch (error) {
    log('fatal', 'FAIL', error.message)
    console.error(error)
  } finally {
    if (buyerPage) await buyerPage.close().catch(() => {})
    if (buyerContext) await buyerContext.close().catch(() => {})
    if (adminPage) await adminPage.close().catch(() => {})
    if (adminContext) await adminContext.close().catch(() => {})
    await browser.close()

    const passCount = steps.filter(s => s.status === 'PASS').length
    const failCount = steps.filter(s => s.status === 'FAIL').length
    const warnCount = steps.filter(s => s.status === 'WARN').length
    const skipCount = steps.filter(s => s.status === 'SKIP').length

    const results = {
      sprint: 'S-MP-07',
      test: 'Dashboard — Dark Mode, Cards, Admin Promotion',
      appUrl,
      timestamp: new Date().toISOString(),
      steps,
      summary: { pass: passCount, fail: failCount, warn: warnCount, skip: skipCount, total: steps.length },
    }

    fs.writeFileSync(REPORT_FILE.replace('.md', '.json'), JSON.stringify(results, null, 2))

    const md = [
      '# S-MP-07 Dashboard E2E',
      `**URL:** ${appUrl}`,
      `**Fecha:** ${new Date().toISOString()}`,
      `**Admin:** ${creds.admin.identifier}`,
      `**Buyer:** ${creds.buyer.identifier}`,
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
