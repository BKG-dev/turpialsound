import { loadEnv, getEnv } from './lib/env.mjs'
import { ReportBuilder } from './lib/report.mjs'

const MODULES = [
  { id: 'QA-00', name: 'Preflight', path: './modules/qa-00-preflight.mjs', layer: 'A', aliases: ['qa-00', 'qa00', 'preflight', 'qa_preflight'] },
  { id: 'QA-01', name: 'Login', path: './modules/qa-01-login.mjs', layer: 'B', aliases: ['qa-01', 'qa01', 'login', 'qa_login_server_side'] },
  { id: 'QA-02', name: 'Publish', path: './modules/qa-02-publish.mjs', layer: 'B', aliases: ['qa-02', 'qa02', 'publish', 'qa_publish_listing'] },
  { id: 'QA-03', name: 'Discovery', path: './modules/qa-03-discovery.mjs', layer: 'C', aliases: ['qa-03', 'qa03', 'discovery', 'qa_home_discovery'] },
  { id: 'QA-04', name: 'Q&A', path: './modules/qa-04-qa.mjs', layer: 'B', aliases: ['qa-04', 'qa04', 'qa', 'qa_questions'] },
  { id: 'QA-05', name: 'Purchase', path: './modules/qa-05-purchase.mjs', layer: 'B', aliases: ['qa-05', 'qa05', 'purchase', 'qa_purchase'] },
  { id: 'QA-06', name: 'Payment Proof', path: './modules/qa-06-proof.mjs', layer: 'D', aliases: ['qa-06', 'qa06', 'proof', 'qa_payment_proof'] },
  { id: 'QA-07', name: 'Admin Review', path: './modules/qa-07-admin.mjs', layer: 'B/C', aliases: ['qa-07', 'qa07', 'admin', 'qa_admin_review'] },
  { id: 'QA-08', name: 'Seller Delivery', path: './modules/qa-08-delivery.mjs', layer: 'B', aliases: ['qa-08', 'qa08', 'delivery', 'qa_seller_delivery'] },
  { id: 'QA-09', name: 'Buyer Receipt', path: './modules/qa-09-receipt.mjs', layer: 'B', aliases: ['qa-09', 'qa09', 'receipt', 'qa_buyer_receipt'] },
  { id: 'QA-10', name: 'Admin Payout', path: './modules/qa-10-payout.mjs', layer: 'B/D', aliases: ['qa-10', 'qa10', 'payout', 'qa_admin_payout'] },
  { id: 'QA-11', name: 'Dashboards', path: './modules/qa-11-dashboards.mjs', layer: 'C/D', aliases: ['qa-11', 'qa11', 'dashboards', 'qa_dashboards'] },
  { id: 'QA-12', name: 'Final Regression', path: './modules/qa-12-regression.mjs', layer: 'A-D', aliases: ['qa-12', 'qa12', 'regression', 'qa_full_regression'] },
]

function resolveModuleId(input) {
  if (!input) return null
  const needle = input.trim().toLowerCase()
  return MODULES.find(m =>
    m.id.toLowerCase() === needle ||
    (m.aliases && m.aliases.some(a => a.toLowerCase() === needle))
  ) || null
}

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'APP_URL',
  'QA_BUYER_EMAIL',
  'QA_BUYER_IDENTIFIER',
  'QA_BUYER_PASSWORD',
  'QA_SELLER_EMAIL',
  'QA_SELLER_IDENTIFIER',
  'QA_SELLER_PASSWORD',
]

function validateEnv() {
  const missing = []
  for (const name of REQUIRED_ENV_VARS) {
    if (!getEnv(name)) missing.push(name)
  }
  return { ok: missing.length === 0, missing }
}

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

  if (args.appUrl) {
    process.env.APP_URL = args.appUrl
  }

  const env = process.env.NODE_ENV || 'development'
  if (env !== 'development') {
    console.log('QA harness solo corre en entorno development (NODE_ENV=development)')
    console.log(`NODE_ENV actual: ${env}`)
    process.exit(1)
  }

  // Pre-validation: check env
  const envCheck = validateEnv()
  if (!envCheck.ok) {
    console.log('ENV CHECK FAILED')
    console.log(`Missing vars: ${envCheck.missing.join(', ')}`)
    console.log('')
    console.log('Action required:')
    console.log('  powershell -ExecutionPolicy Bypass -File scripts/qa/ensure-marketplace-qa-env.ps1')
    console.log('')
    console.log('Or verify with:')
    console.log('  npx tsx scripts/qa/doctor-marketplace-qa-env.mjs')
    process.exit(1)
  }

  const appUrl = process.env.APP_URL || 'http://localhost:3002'
  const report = new ReportBuilder({ appUrl })
  report.start()

  console.log(`Turpial Marketplace QA Harness`)
  console.log(`App URL: ${appUrl}`)
  console.log(`Run ID: ${report.runId}`)
  console.log(`Modules: ${MODULES.length}\n`)

  let selectedModules
  if (args.module) {
    const mod = resolveModuleId(args.module)
    if (!mod) {
      console.log(`Module not found: "${args.module}"`)
      console.log(`Available IDs: ${MODULES.map(m => m.id).join(', ')}`)
      console.log(`Available aliases: qa-00, qa-01, ..., preflight, login, publish, discovery, ...`)
      console.log(`Example: --modules=qa-00,qa-01,qa-02,qa-03`)
      process.exit(1)
    }
    selectedModules = [mod]
  } else if (args.modules) {
    selectedModules = args.modules.map(id => resolveModuleId(id)).filter(Boolean)
    if (selectedModules.length === 0) {
      console.log(`No valid modules found.`)
      console.log(`Requested: ${args.modules.join(', ')}`)
      console.log(`Available IDs: ${MODULES.map(m => m.id).join(', ')}`)
      console.log(`Example: --modules=qa-00,qa-01,qa-02,qa-03`)
      process.exit(1)
    }
    if (selectedModules.length < args.modules.length) {
      const unresolved = args.modules.filter(id => !resolveModuleId(id))
      console.log(`Warning: ${unresolved.length} module(s) not resolved: ${unresolved.join(', ')}`)
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
