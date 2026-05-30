import { loadEnv, getEnv } from '../lib/env.mjs'
import { ReportBuilder } from '../lib/report.mjs'

export const MODULE_ID = 'QA-12'
export const MODULE_NAME = 'Final Regression'
export const LAYER = 'A-D'

const ALL_MODULES = [
  'qa-00-preflight', 'qa-01-login', 'qa-02-publish', 'qa-03-discovery',
  'qa-04-purchase', 'qa-05-payment', 'qa-06-proof',
  'qa-07-admin', 'qa-08-delivery', 'qa-09-receipt',
  'qa-10-payout', 'qa-11-dashboards',
  'qa-smp01-cart-consolidated',
]

export async function run(report) {
  const startedAt = new Date().toISOString()
  report.addModule(MODULE_ID, 'RUNNING', { startedAt })
  const checks = []

  loadEnv()

  const results = []

  for (const name of ALL_MODULES) {
    try {
      const mod = await import(`./${name}.mjs`)
      if (!mod.run) {
        results.push({ module: name, status: 'SKIP', detail: 'no run()' })
        continue
      }
      const result = await mod.run(report)
      results.push({
        module: name,
        ok: result.ok,
        status: result.ok ? 'PASS' : result.skipped ? 'SKIP' : 'FAIL',
        detail: result.ok ? 'OK' : result.error || result.reason || 'FAIL',
      })
    } catch (e) {
      results.push({ module: name, status: 'FAIL', detail: e.message })
    }
  }

  const passed = results.filter(r => r.status === 'PASS').length
  const failed = results.filter(r => r.status === 'FAIL').length
  const skipped = results.filter(r => r.status === 'SKIP').length
  const allPassed = failed === 0

  checks.push({
    check: 'regression',
    status: allPassed ? 'PASS' : 'FAIL',
    detail: `${passed} passed, ${failed} failed, ${skipped} skipped of ${results.length} modules`,
    results,
  })

  const finishedAt = new Date().toISOString()
  report.addModule(MODULE_ID, allPassed ? 'PASS' : 'FAIL', {
    startedAt, finishedAt,
    failureCode: allPassed ? null : 'REGRESSION_FAILED',
    checks,
  })

  return { ok: allPassed, passed, failed, skipped, total: results.length }
}
