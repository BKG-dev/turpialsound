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

function parseArgv() {
  const args = {}
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--module=')) {
      args.module = arg.replace('--module=', '')
    } else if (arg.startsWith('--modules=')) {
      args.modules = arg.replace('--modules=', '').split(',').map(s => s.trim()).filter(Boolean)
    } else if (arg.startsWith('--app-url=')) {
      args.appUrl = arg.replace('--app-url=', '')
    } else if (arg.startsWith('--')) {
      const eq = arg.indexOf('=')
      if (eq > 0) {
        args[arg.slice(2, eq)] = arg.slice(eq + 1)
      } else {
        args[arg.slice(2)] = true
      }
    }
  }
  return args
}

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

  const args = parseArgv()

  // Override APP_URL from CLI if provided
  if (args.appUrl) {
    process.env.APP_URL = args.appUrl
  }

  const env = process.env.NODE_ENV || 'development'
  if (env !== 'development') {
    console.log('QA harness solo corre en entorno development (NODE_ENV=development)')
    console.log(`NODE_ENV actual: ${env}`)
    process.exit(1)
  }

  const appUrl = process.env.APP_URL || 'http://localhost:3002'
  const report = new ReportBuilder({ appUrl })
  report.start()

  console.log(`Turpial Marketplace QA Harness`)
  console.log(`App URL: ${appUrl}`)
  console.log(`Run ID: ${report.runId}`)
  console.log(`Modules: ${MODULES.length}\n`)

  // Resolve which modules to run
  let selectedModules
  if (args.module) {
    selectedModules = MODULES.filter((m) => m.id === args.module)
    if (selectedModules.length === 0) {
      console.log(`Module not found: ${args.module}`)
      process.exit(1)
    }
  } else if (args.modules) {
    selectedModules = args.modules.map(id => MODULES.find(m => m.id === id)).filter(Boolean)
    if (selectedModules.length === 0) {
      console.log(`No valid modules found for: ${args.modules.join(',')}`)
      process.exit(1)
    }
  } else {
    selectedModules = MODULES
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
