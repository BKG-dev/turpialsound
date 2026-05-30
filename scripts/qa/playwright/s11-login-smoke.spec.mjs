import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { loadEnv, getEnv, requireEnv } from '../lib/env.mjs'
import { loginSmokeSequence, getQACredentials, buildResultsTable, buildResultSummary } from './login.mjs'
import { screenshot, ensureScreenshotDir } from './screenshot.mjs'

const REPORT_DIR = path.resolve(process.cwd(), 'var', 'qa-results', 's11-login-report')
const REPORT_FILE = path.join(REPORT_DIR, 'report.md')

loadEnv()

async function main() {
  console.log('=== S11 — Playwright Login UI Smoke ===')
  console.log('')

  const appUrl = getEnv('APP_URL') || 'http://localhost:3002'
  console.log(`APP_URL: ${appUrl}`)
  console.log('')

  const creds = getQACredentials()
  console.log(`Credenciales QA cargadas:`)
  console.log(`  BUYER: ${creds.buyer.identifier}`)
  console.log(`  SELLER: ${creds.seller.identifier}`)
  console.log(`  ADMIN: ${creds.admin.identifier}`)
  console.log('')

  ensureScreenshotDir()

  const browser = await chromium.launch({ headless: true })

  const results = []

  const contextOpts = {
    viewport: { width: 1280, height: 720 },
    locale: 'es-VE',
  }

  for (const userKey of ['buyer', 'seller', 'admin']) {
    const user = creds[userKey]
    const context = await browser.newContext(contextOpts)
    const page = await context.newPage()

    console.log(`--- Smoke ${user.label} ---`)
    try {
      const result = await loginSmokeSequence(page, user)
      results.push(result)
      console.log(`  Login: ${result.loggedIn ? 'OK' : 'FAIL'}, Header: ${result.headerText || 'N/A'}`)
    } catch (err) {
      console.log(`  ERROR: ${err.message}`)
      results.push({ label: user.label, identifier: user.identifier, expectedName: user.expectedName, loggedIn: false, headerText: null, error: err.message })
    }

    await page.close()
    await context.close()
  }

  await browser.close()

  console.log('')
  console.log('=== RESUMEN FINAL ===')
  const summary = buildResultSummary(results)
  console.log(`Total: ${summary.total} | PASS: ${summary.passes} | FAIL: ${summary.fails}`)

  const table = buildResultsTable(results)
  console.log(table)

  let reportMd = `# S11 — Playwright Login UI Smoke Report\n\n`
  reportMd += `**Fecha:** ${new Date().toISOString()}\n`
  reportMd += `**APP_URL:** ${appUrl}\n`
  reportMd += `**Branch:** Manuel/s11-playwright-login-ui-2026-05-12\n\n`
  reportMd += `## Resultado\n\n`
  reportMd += `- Total: ${summary.total}\n`
  reportMd += `- PASS: ${summary.passes}\n`
  reportMd += `- FAIL: ${summary.fails}\n`
  reportMd += `- Estado: ${summary.passed ? 'TODOS PASS' : 'FALLOS DETECTADOS'}\n\n`
  reportMd += table
  reportMd += `\n## Screenshots\n\n`
  reportMd += `Ver directorio: \`var/qa-results/s11-login-report/\`\n\n`

  const screenshots = fs.readdirSync(REPORT_DIR).filter(f => f.endsWith('.png'))
  if (screenshots.length > 0) {
    for (const ss of screenshots) {
      reportMd += `- ![](${ss})\n`
    }
  }

  reportMd += `\n## Credenciales usadas\n\n`
  reportMd += `| Rol | Identificador |\n`
  reportMd += `|-----|---------------|\n`
  reportMd += `| BUYER | ${creds.buyer.identifier} |\n`
  reportMd += `| SELLER | ${creds.seller.identifier} |\n`
  reportMd += `| ADMIN | ${creds.admin.identifier} |\n`

  fs.writeFileSync(REPORT_FILE, reportMd, 'utf8')
  console.log(`\nReporte guardado: ${REPORT_FILE}`)

  const exitCode = summary.passed ? 0 : 1

  const resultsJsonFile = path.join(REPORT_DIR, 'results.json')
  fs.writeFileSync(resultsJsonFile, JSON.stringify({ summary, results, appUrl, timestamp: new Date().toISOString() }, null, 2), 'utf8')
  console.log(`Resultados JSON: ${resultsJsonFile}`)

  process.exit(exitCode)
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(2)
})
