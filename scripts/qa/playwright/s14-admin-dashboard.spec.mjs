import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { loadEnv, getEnv } from '../lib/env.mjs'
import { loginViaMarketplaceModal, getQACredentials } from './login.mjs'

const REPORT_DIR = path.resolve(process.cwd(), 'var', 'qa-results', 's14-admin-dashboard')
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

async function main() {
  console.log('=== S14 — Admin Dashboard + Payment Closure Playwright Test ===')
  console.log('')

  const appUrl = getEnv('APP_URL') || 'http://localhost:3002'
  console.log(`APP_URL: ${appUrl}`)
  console.log('')

  const creds = getQACredentials()
  console.log('Credenciales QA cargadas:')
  console.log(`  BUYER: ${creds.buyer.identifier}`)
  console.log(`  SELLER: ${creds.seller.identifier}`)
  console.log(`  ADMIN: ${creds.admin.identifier}`)
  console.log('')

  const results = {
    login: null,
    dashboardLoad: null,
    tabs: {},
    transactions: null,
    screenshots: [],
  }

  ensureDirs()

  const browser = await chromium.launch({ headless: true })

  const contextOpts = {
    viewport: { width: 1280, height: 720 },
    locale: 'es-VE',
  }

  const context = await browser.newContext(contextOpts)
  const page = await context.newPage()

  try {
    // ─── STEP 1: Login as admin ──────────────────────────────────────────────
    console.log('--- STEP 1: Login as admin ---')
    try {
      const loginResult = await loginViaMarketplaceModal(page, creds.admin.identifier, creds.admin.password)
      results.login = { status: 'PASS', ...loginResult }
      console.log('  Login: OK')
    } catch (err) {
      results.login = { status: 'FAIL', error: err.message }
      console.log(`  Login: FAIL — ${err.message}`)
    }

    await ss(page, '01-login')

    // ─── STEP 2: Navigate to admin dashboard ─────────────────────────────────
    console.log('--- STEP 2: Navigate to /marketplace/admin ---')
    await page.goto(`${appUrl}/marketplace/admin`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    const adminHeadings = page.locator('text=Panel Administrativo, text=Turpial Sound - Admin, text=Admin')
    try {
      await adminHeadings.first().waitFor({ state: 'visible', timeout: 15000 })
      results.dashboardLoad = { status: 'PASS', foundHeading: true }
      console.log('  Dashboard loaded: OK')
    } catch {
      results.dashboardLoad = { status: 'WARN', foundHeading: false }
      console.log('  Dashboard loaded: WARN — no admin heading found')
    }

    await ss(page, '02-dashboard')

    // ─── STEP 3: Screenshot each tab ─────────────────────────────────────────
    const tabs = [
      { id: 'validations', label: 'Revision pagos', searchText: 'Aprobar pago' },
      { id: 'escrow', label: 'En proceso', searchText: 'Liberar para pago' },
      { id: 'payouts', label: 'Pagos vendedores', searchText: 'PAGO' },
    ]

    for (const tab of tabs) {
      console.log(`--- STEP 3.${tabs.indexOf(tab) + 1}: Tab "${tab.label}" ---`)
      results.tabs[tab.id] = { status: null, hasButtons: false, hasRows: false }

      try {
        const tabBtn = page.locator(`button:has-text("${tab.label}")`).first()
        await tabBtn.waitFor({ state: 'visible', timeout: 10000 })
        await tabBtn.click()
        await page.waitForTimeout(2000)
        console.log(`  Tab "${tab.label}": clicked OK`)
        results.tabs[tab.id].tabFound = true
      } catch {
        console.log(`  Tab "${tab.label}": NOT FOUND — skipping`)
        results.tabs[tab.id].tabFound = false
        await ss(page, `03-${tab.id}-tab`)
        continue
      }

      await ss(page, `03-${tab.id}-tab`)

      // Check for action buttons
      const actionBtns = page.locator(`button:has-text("${tab.searchText}")`)
      const btnCount = await actionBtns.count()
      if (btnCount > 0) {
        results.tabs[tab.id].hasButtons = true
        results.tabs[tab.id].buttonText = tab.searchText
        console.log(`  Found "${tab.searchText}" button(s): ${btnCount}`)
      }

      // Check for transaction rows
      const rowTexts = ['PAYMENT_RECEIVED', 'PENDING_PAYMENT', 'IN_ESCROW', 'PAGO ENVIADO']
      for (const rt of rowTexts) {
        const row = page.locator(`text=${rt}`).first()
        try {
          await row.waitFor({ state: 'visible', timeout: 3000 })
          results.tabs[tab.id].hasRows = true
          results.tabs[tab.id].foundStatus = rt
          console.log(`  Found status: ${rt}`)
          break
        } catch {
          // try next status
        }
      }
    }

    // ─── STEP 4: Look specifically for actionable transactions ───────────────
    console.log('--- STEP 4: Search for actionable transactions ---')

    let foundActionable = false

    // Go to "Revision pagos" (validations) tab and look for PAYMENT_RECEIVED or PENDING_PAYMENT
    try {
      const validationsTab = page.locator('button:has-text("Revision pagos")').first()
      await validationsTab.click()
      await page.waitForTimeout(2000)

      const approvable = page.locator('button:has-text("Aprobar pago")').first()
      const hasApprovable = await approvable.isVisible().catch(() => false)

      if (hasApprovable) {
        console.log('  Found transaction with "Aprobar pago" button')
        foundActionable = true
      }

      await ss(page, '04-validations-actionable')
    } catch {
      console.log('  No actionable transactions in validations tab')
    }

    // Go to "En proceso" (escrow) tab and look for IN_ESCROW
    try {
      const escrowTab = page.locator('button:has-text("En proceso")').first()
      await escrowTab.click()
      await page.waitForTimeout(2000)

      const releasable = page.locator('button:has-text("Liberar para pago")').first()
      const hasReleasable = await releasable.isVisible().catch(() => false)

      if (hasReleasable) {
        console.log('  Found transaction with "Liberar para pago" button')
        foundActionable = true
      }

      await ss(page, '04-escrow-actionable')
    } catch {
      console.log('  No actionable transactions in escrow tab')
    }

    results.transactions = {
      status: foundActionable ? 'PASS' : 'WARN',
      foundActionable,
    }

    // ─── STEP 5: Determine overall result ────────────────────────────────────
    console.log('')
    console.log('=== RESUMEN FINAL ===')

    const loginPassed = results.login?.status === 'PASS'
    const dashboardPassed = results.dashboardLoad?.status === 'PASS'
    const tabsOk = Object.values(results.tabs).some(t => t.tabFound)
    const hasData = Object.values(results.tabs).some(t => t.hasRows || t.hasButtons)

    let overallStatus
    if (loginPassed && dashboardPassed && tabsOk && hasData) {
      overallStatus = 'PASS'
    } else if (loginPassed && dashboardPassed && tabsOk) {
      overallStatus = 'WARN'
    } else {
      overallStatus = 'FAIL'
    }

    console.log(`Login: ${results.login?.status || 'N/A'}`)
    console.log(`Dashboard: ${results.dashboardLoad?.status || 'N/A'}`)
    console.log(`Tabs navigable: ${tabsOk}`)
    console.log(`Has data: ${hasData}`)
    console.log(`Transactions actionable: ${results.transactions?.foundActionable || false}`)
    console.log(`Overall: ${overallStatus}`)

    // ─── Generate report ─────────────────────────────────────────────────────
    let reportMd = `# S14 — Admin Dashboard + Payment Closure Report\n\n`
    reportMd += `**Fecha:** ${new Date().toISOString()}\n`
    reportMd += `**APP_URL:** ${appUrl}\n`
    reportMd += `**Status:** ${overallStatus}\n\n`

    reportMd += `## Resultados\n\n`

    reportMd += `### 1. Login Admin\n`
    reportMd += `- Estado: ${results.login?.status || 'N/A'}\n`
    reportMd += `- Identificador: ${creds.admin.identifier}\n`
    if (results.login?.error) reportMd += `- Error: ${results.login.error}\n`
    reportMd += `\n`

    reportMd += `### 2. Carga del Dashboard\n`
    reportMd += `- Estado: ${results.dashboardLoad?.status || 'N/A'}\n`
    reportMd += `- Encabezado admin encontrado: ${results.dashboardLoad?.foundHeading ? 'Si' : 'No'}\n`
    reportMd += `\n`

    reportMd += `### 3. Pestañas\n`
    for (const [tabId, tabResult] of Object.entries(results.tabs)) {
      reportMd += `- **${tabId}**: `
      if (tabResult.tabFound) {
        reportMd += `Cargada | Botones: ${tabResult.hasButtons ? tabResult.buttonText : 'Ninguno'} | Datos: ${tabResult.hasRows ? tabResult.foundStatus : 'Sin datos visibles'}`
      } else {
        reportMd += 'NO ENCONTRADA'
      }
      reportMd += `\n`
    }
    reportMd += `\n`

    reportMd += `### 4. Transacciones accionables\n`
    reportMd += `- Estado: ${results.transactions?.status || 'N/A'}\n`
    reportMd += `- Encontradas: ${results.transactions?.foundActionable ? 'Si' : 'No'}\n`
    reportMd += `\n`

    reportMd += `## Screenshots\n\n`
    const screenshots = fs.readdirSync(REPORT_DIR).filter(f => f.endsWith('.png'))
    if (screenshots.length > 0) {
      for (const s of screenshots.sort()) {
        reportMd += `- ![](${s})\n`
      }
    }
    reportMd += `\n`

    reportMd += `## Credenciales usadas\n\n`
    reportMd += `| Rol | Identificador |\n`
    reportMd += `|-----|---------------|\n`
    reportMd += `| ADMIN | ${creds.admin.identifier} |\n`

    fs.writeFileSync(REPORT_FILE, reportMd, 'utf8')
    console.log(`\nReporte guardado: ${REPORT_FILE}`)

    // ─── Save JSON results ────────────────────────────────────────────────────
    const resultsJsonFile = path.join(REPORT_DIR, 'results.json')
    fs.writeFileSync(resultsJsonFile, JSON.stringify({
      overallStatus,
      results,
      appUrl,
      timestamp: new Date().toISOString(),
    }, null, 2), 'utf8')
    console.log(`Resultados JSON: ${resultsJsonFile}`)

    const exitCode = overallStatus === 'PASS' ? 0 : overallStatus === 'WARN' ? 0 : 1
    process.exit(exitCode)

  } catch (err) {
    console.error('FATAL:', err)
    try { await ss(page, '99-fatal-error'); } catch {}
    process.exit(2)
  } finally {
    await page.close()
    await context.close()
    await browser.close()
  }
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(2)
})
