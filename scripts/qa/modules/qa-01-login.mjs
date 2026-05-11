import { loadEnv, getEnv } from '../lib/env.mjs'
import { disconnectPrisma } from '../lib/db-read.mjs'
import { validateUserCredentials, validateUserProfile } from '../lib/session.mjs'
import { FailureCode } from '../lib/failures.mjs'

export const MODULE_ID = 'QA-01'
export const MODULE_NAME = 'Login Validation'
export const LAYER = 'B'

export async function run(report) {
  const startedAt = new Date().toISOString()
  report.addModule(MODULE_ID, 'RUNNING', { startedAt })
  const checks = []

  loadEnv()

  // ── 1. Validate buyerIA credentials ────────────────────────────────────────
  const buyerIdentifier = getEnv('QA_BUYER_IDENTIFIER')
  const buyerPassword = getEnv('QA_BUYER_PASSWORD')

  if (!buyerIdentifier || !buyerPassword) {
    checks.push({ check: 'buyer', status: 'FAIL', detail: 'QA_BUYER_IDENTIFIER or QA_BUYER_PASSWORD missing' })
    report.addModule(MODULE_ID, 'FAIL', {
      failureCode: FailureCode.ENV_MISSING,
      failureDetail: 'QA_BUYER_IDENTIFIER or QA_BUYER_PASSWORD missing',
      startedAt,
      finishedAt: new Date().toISOString(),
      checks,
    })
    await disconnectPrisma()
    return { ok: false, skipped: false, error: 'QA_BUYER_* env missing', code: FailureCode.ENV_MISSING }
  }

  const buyerCreds = await validateUserCredentials(buyerIdentifier, buyerPassword)
  if (buyerCreds.ok) {
    const buyerProfile = await validateUserProfile(buyerCreds, { isSeller: false, role: 'USER' })
    checks.push({
      check: 'buyer',
      status: buyerProfile.ok ? 'PASS' : 'FAIL',
      detail: buyerProfile.ok
        ? `AUTH_DATA_PASS: ${buyerCreds.user.displayName} (${buyerCreds.user.email})`
        : `Profile issues: ${buyerProfile.issues.join('; ')}`,
      result: buyerProfile.ok ? buyerProfile.details : null,
      sessionNote: 'SESSION_BROWSER_REQUIRED — session cookie validation needs browser/HTTP context',
    })
  } else {
    checks.push({
      check: 'buyer',
      status: 'FAIL',
      code: buyerCreds.code,
      detail: buyerCreds.detail,
    })
  }

  // ── 2. Validate sellerIA credentials ──────────────────────────────────────
  const sellerIdentifier = getEnv('QA_SELLER_IDENTIFIER')
  const sellerPassword = getEnv('QA_SELLER_PASSWORD')

  if (!sellerIdentifier || !sellerPassword) {
    checks.push({ check: 'seller', status: 'FAIL', detail: 'QA_SELLER_IDENTIFIER or QA_SELLER_PASSWORD missing' })
  } else {
    const sellerCreds = await validateUserCredentials(sellerIdentifier, sellerPassword)
    if (sellerCreds.ok) {
      const sellerProfile = await validateUserProfile(sellerCreds, { isSeller: true, role: 'USER' })
      checks.push({
        check: 'seller',
        status: sellerProfile.ok ? 'PASS' : 'FAIL',
        detail: sellerProfile.ok
          ? `AUTH_DATA_PASS: ${sellerCreds.user.displayName} (${sellerCreds.user.email})`
          : `Profile issues: ${sellerProfile.issues.join('; ')}`,
        result: sellerProfile.ok ? sellerProfile.details : null,
        sessionNote: 'SESSION_BROWSER_REQUIRED — session cookie validation needs browser/HTTP context',
      })
    } else {
      checks.push({
        check: 'seller',
        status: 'FAIL',
        code: sellerCreds.code,
        detail: sellerCreds.detail,
      })
    }
  }

  // ── 3. Validate admin/Super credentials (optional for S03F) ───────────────
  const adminIdentifier = getEnv('QA_ADMIN_IDENTIFIER')
  const adminPassword = getEnv('QA_ADMIN_PASSWORD')

  if (!adminIdentifier || !adminPassword) {
    checks.push({
      check: 'admin',
      status: 'SKIP',
      detail: 'SKIPPED_ADMIN_ENV_MISSING — QA_ADMIN_IDENTIFIER or QA_ADMIN_PASSWORD not set',
    })
  } else {
    const adminCreds = await validateUserCredentials(adminIdentifier, adminPassword)
    if (adminCreds.ok) {
      const adminProfile = await validateUserProfile(adminCreds, { role: 'SUPER' })
      checks.push({
        check: 'admin',
        status: adminProfile.ok ? 'PASS' : 'FAIL',
        detail: adminProfile.ok
          ? `AUTH_DATA_PASS: ${adminCreds.user.displayName} (${adminCreds.user.email}), role=${adminCreds.user.role}`
          : `Profile issues: ${adminProfile.issues.join('; ')}`,
        result: adminProfile.ok ? adminProfile.details : null,
        sessionNote: 'SESSION_BROWSER_REQUIRED — session cookie validation needs browser/HTTP context',
      })
    } else {
      checks.push({
        check: 'admin',
        status: 'FAIL',
        code: adminCreds.code,
        detail: adminCreds.detail,
      })
    }
  }

  await disconnectPrisma()

  // ── Final status ──────────────────────────────────────────────────────────
  const requiredChecks = checks.filter(c => c.check !== 'admin' || c.status !== 'SKIP')
  const passedRequired = requiredChecks.every(c => c.status === 'PASS')

  const finishedAt = new Date().toISOString()
  const hasFailures = checks.some(c => c.status === 'FAIL')

  report.addModule(MODULE_ID, hasFailures ? 'FAIL' : 'PASS', {
    startedAt,
    finishedAt,
    durationMs: new Date(finishedAt).getTime() - new Date(startedAt).getTime(),
    failureCode: hasFailures
      ? checks.find(c => c.status === 'FAIL')?.code || FailureCode.LOGIN_FAILED
      : null,
    failureDetail: hasFailures
      ? checks.find(c => c.status === 'FAIL')?.detail || 'Some credentials failed'
      : null,
    checks,
  })

  return passedRequired
    ? { ok: true }
    : { ok: false, error: 'Login validation failed', code: FailureCode.LOGIN_FAILED }
}
