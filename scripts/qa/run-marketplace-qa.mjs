import { loadEnv } from './lib/env.mjs'
import { ReportBuilder } from './lib/report.mjs'

const MODULES = [
  { id: 'QA-00', name: 'Preflight', path: './modules/qa-00-preflight.mjs', layer: 'A' },
  { id: 'QA-01', name: 'Login', path: './modules/qa-01-login.mjs', layer: 'B' },
  { id: 'QA-02', name: 'Publish', path: './modules/qa-02-publish.mjs', layer: 'B' },
  { id: 'QA-03', name: 'Discovery', path: './modules/qa-03-discovery.mjs', layer: 'C' },
  { id: 'QA-04', name: 'Q&A', path: './modules/qa-04-qa.mjs', layer: 'B' },
  { id: 'QA-05', name: 'Purchase', path: './modules/qa-05-purchase.mjs', layer: 'B' },
  { id: 'QA-06', name: 'Payment Proof', path: './modules/qa-06-proof.mjs', layer: 'D' },
  { id: 'QA-07', name: 'Admin Review', path: './modules/qa-07-admin.mjs', layer: 'B/C' },
  { id: 'QA-08', name: 'Seller Delivery', path: './modules/qa-08-delivery.mjs', layer: 'B' },
  { id: 'QA-09', name: 'Buyer Receipt', path: './modules/qa-09-receipt.mjs', layer: 'B' },
  { id: 'QA-10', name: 'Admin Payout', path: './modules/qa-10-payout.mjs', layer: 'B/D' },
  { id: 'QA-11', name: 'Dashboards', path: './modules/qa-11-dashboards.mjs', layer: 'C/D' },
  { id: 'QA-12', name: 'Final Regression', path: './modules/qa-12-regression.mjs', layer: 'A-D' },
]

async function runModule(mod, report) {
  const started = Date.now()
  console.log(`[${mod.id}] ${mod.name} ...`)

  try {
    const imported = await import(mod.path)
    if (!imported.run) {
      console.log(`[${mod.id}] SKIP — no run() export`)
      report.addModule(mod.id, 'SKIP', {
        failureDetail: 'No run() export found in module',
        startedAt: new Date(started).toISOString(),
        finishedAt: new Date().toISOString(),
        durationMs: Date.now() - started,
      })
      return
    }

    const result = await imported.run(report)
    const duration = Date.now() - started

    if (result.skipped) {
      console.log(`[${mod.id}] SKIP — ${result.reason || 'not implemented'}`)
      report.addModule(mod.id, 'SKIP', {
        failureDetail: result.reason || 'STUB',
        startedAt: new Date(started).toISOString(),
        finishedAt: new Date().toISOString(),
        durationMs: duration,
      })
    } else if (result.ok) {
      console.log(`[${mod.id}] PASS (${duration}ms)`)
    } else {
      console.log(`[${mod.id}] FAIL — ${result.code || result.error || 'unknown'} (${duration}ms)`)
    }
  } catch (error) {
    const duration = Date.now() - started
    console.log(`[${mod.id}] FAIL — ${error.message} (${duration}ms)`)
    report.addModule(mod.id, 'FAIL', {
      failureCode: 'UNKNOWN',
      failureDetail: error.message,
      startedAt: new Date(started).toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: duration,
    })
  }
}

async function main() {
  loadEnv()

  const env = process.env.NODE_ENV || 'development'
  if (env !== 'development') {
    console.log('QA harness solo corre en entorno development (NODE_ENV=development)')
    console.log(`NODE_ENV actual: ${env}`)
    process.exit(1)
  }

  const report = new ReportBuilder({ appUrl: process.env.APP_URL || 'http://localhost:3002' })
  report.start()

  console.log(`Turpial Marketplace QA Harness`)
  console.log(`App URL: ${report.appUrl}`)
  console.log(`Run ID: ${report.runId}`)
  console.log(`Modules: ${MODULES.length}\n`)

  const runOnly = process.argv.find((arg) => arg.startsWith('--module='))
  const selectedModules = runOnly
    ? MODULES.filter((m) => m.id === runOnly.replace('--module=', ''))
    : MODULES

  if (runOnly && selectedModules.length === 0) {
    console.log(`Module not found: ${runOnly.replace('--module=', '')}`)
    process.exit(1)
  }

  for (const mod of selectedModules) {
    await runModule(mod, report)
  }

  console.log(`\n--- Summary ---`)
  const summary = report.summary()
  console.log(`PASS: ${summary.passed}  FAIL: ${summary.failed}  SKIP: ${summary.skipped}  TOTAL: ${summary.total}`)

  const jsonPath = report.writeJSON()
  const mdPath = report.writeMD()
  console.log(`\nReport JSON: ${jsonPath}`)
  console.log(`Report MD: ${mdPath}`)

  if (summary.failed > 0) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
