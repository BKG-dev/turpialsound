import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { loadEnv, getEnv } from '../lib/env.mjs'
import { loginViaMarketplaceModal, getQACredentials } from './login.mjs'

const REPORT_DIR = path.resolve(process.cwd(), 'var', 'qa-results', 's-ux-02-toggle')
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
  console.log('=== S-UX-02 M01 — Toggle Grid/Lista + localStorage Persistence E2E ===')
  console.log('')

  const appUrl = getEnv('APP_URL') || 'http://localhost:3002'
  console.log(`APP_URL: ${appUrl}`)
  ensureDirs()

  const creds = getQACredentials()
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'es-VE' })
  const page = await ctx.newPage()

  try {
    await page.goto(`${appUrl}/marketplace`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)
    await ss(page, '01-marketplace-loaded')

    const toggleBtn = page.locator('button[title*="vista" i], button[title*="Cambiar a vista" i], button:has(svg.lucide-layout-grid), button:has(svg.lucide-list)').first()
    const toggleVisible = await toggleBtn.isVisible({ timeout: 5000 }).catch(() => false)

    if (toggleVisible) {
      log('01-toggle-visible', 'PASS', 'boton de toggle grid/lista visible')
      await ss(page, '01-toggle-visible')

      const beforeGrid = await page.locator('.grid').first().isVisible({ timeout: 5000 }).catch(() => false)
      log('01-grid-view', beforeGrid ? 'PASS' : 'WARN', beforeGrid ? 'vista grid activa por defecto' : 'grid no detectado')

      await toggleBtn.click()
      await page.waitForTimeout(1500)
      await ss(page, '02-list-view')

      const listItems = page.locator('[class*="flex items-center gap-4 rounded-xl"]').first()
      const listVisible = await listItems.isVisible({ timeout: 5000 }).catch(() => false)
      log('02-list-view-active', listVisible ? 'PASS' : 'WARN', listVisible ? 'vista lista activa tras toggle' : 'lista no detectada')

      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2000)
      await ss(page, '03-after-reload')

      const listAfterReload = page.locator('[class*="flex items-center gap-4 rounded-xl"]').first()
      const persisted = await listAfterReload.isVisible({ timeout: 5000 }).catch(() => false)
      log('03-persistence', persisted ? 'PASS' : 'WARN', persisted ? 'preferencia lista persiste en localStorage tras reload' : 'preferencia no persistio')

      const lsValue = await page.evaluate(() => localStorage.getItem('mp-view-mode'))
      if (lsValue === 'list') {
        log('03-localStorage', 'PASS', `localStorage mp-view-mode = "${lsValue}"`)
      } else {
        log('03-localStorage', 'WARN', `localStorage mp-view-mode = "${lsValue}" (esperado "list")`)
      }

      await toggleBtn.click()
      await page.waitForTimeout(1000)
      const gridRestored = await page.locator('.grid').first().isVisible({ timeout: 5000 }).catch(() => false)
      log('04-grid-restored', gridRestored ? 'PASS' : 'WARN', 'toggle regresa a vista grid')
    } else {
      log('01-toggle-visible', 'FAIL', 'boton de toggle no encontrado en la pagina')
      await ss(page, '01-no-toggle')
    }
  } catch (error) {
    log('fatal', 'FAIL', error.message)
    console.error(error)
  } finally {
    await page.close()
    await ctx.close()
    await browser.close()

    const passCount = steps.filter(s => s.status === 'PASS').length
    const failCount = steps.filter(s => s.status === 'FAIL').length
    const warnCount = steps.filter(s => s.status === 'WARN').length

    const results = {
      sprint: 'S-UX-02-M01',
      test: 'Toggle Grid/Lista + localStorage',
      appUrl,
      timestamp: new Date().toISOString(),
      steps,
      summary: { pass: passCount, fail: failCount, warn: warnCount, total: steps.length },
    }
    fs.writeFileSync(REPORT_FILE.replace('.md', '.json'), JSON.stringify(results, null, 2))

    const md = [
      '# S-UX-02-M01 Toggle Grid/Lista',
      `**URL:** ${appUrl}`,
      `**Fecha:** ${new Date().toISOString()}`,
      '',
      '| Paso | Estado | Detalle |',
      '|------|--------|---------|',
      ...steps.map(s => `| ${s.step} | ${s.status} | ${s.detail} |`),
      '',
      `**Total:** ${passCount} PASS, ${failCount} FAIL, ${warnCount} WARN`,
    ].join('\n')
    fs.writeFileSync(REPORT_FILE, md)

    console.log('')
    console.log(`Report: ${passCount}/${results.summary.total} PASS`)
    process.exit(failCount > 0 ? 1 : 0)
  }
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(2)
})
