import { loadEnv, requireEnvs } from '../lib/env.mjs'
import { checkAppUrl } from '../lib/app-url.mjs'
import { ReportBuilder } from '../lib/report.mjs'

export const MODULE_ID = 'QA-00'
export const MODULE_NAME = 'Preflight'
export const LAYER = 'A'

export async function run(report) {
  const checks = []

  const startedAt = new Date().toISOString()
  report.addModule(MODULE_ID, 'RUNNING', { startedAt })

  try {
    loadEnv()
    const envs = requireEnvs([
      'DATABASE_URL',
      'APP_URL',
      'QA_BUYER_EMAIL',
      'QA_BUYER_IDENTIFIER',
      'QA_BUYER_PASSWORD',
      'QA_SELLER_EMAIL',
      'QA_SELLER_IDENTIFIER',
      'QA_SELLER_PASSWORD',
    ])
    checks.push({ check: 'env', status: 'PASS' })
  } catch (error) {
    const finishedAt = new Date().toISOString()
    report.addModule(MODULE_ID, 'FAIL', {
      failureCode: 'ENV_MISSING',
      failureDetail: error.message,
      startedAt,
      finishedAt,
      checks,
    })
    return { ok: false, error: error.message, code: 'ENV_MISSING' }
  }

  const appResult = await checkAppUrl()
  checks.push({
    check: 'appUrl',
    status: appResult.ok ? 'PASS' : 'FAIL',
  })

  const finishedAt = new Date().toISOString()
  const status = appResult.ok ? 'PASS' : 'FAIL'
  report.addModule(MODULE_ID, status, {
    startedAt,
    finishedAt,
    durationMs: new Date(finishedAt).getTime() - new Date(startedAt).getTime(),
    failureCode: appResult.ok ? null : appResult.failureCode,
    failureDetail: appResult.ok ? null : appResult.error,
    checks,
  })

  return appResult.ok
    ? { ok: true }
    : { ok: false, error: appResult.error, code: appResult.failureCode }
}
