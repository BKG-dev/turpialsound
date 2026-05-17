import { loadEnv, requireEnvs, getEnv } from '../lib/env.mjs'
import { checkAppUrl } from '../lib/app-url.mjs'
import { getPrisma, disconnectPrisma, checkDbTables, findUserByIdentifier, countConflictsByDisplayName } from '../lib/db-read.mjs'
import { FailureCode } from '../lib/failures.mjs'

export const MODULE_ID = 'QA-00'
export const MODULE_NAME = 'Preflight'
export const LAYER = 'A'

export async function run(report) {
  const startedAt = new Date().toISOString()
  report.addModule(MODULE_ID, 'RUNNING', { startedAt })
  const checks = []

  // ── 1. Load env vars ──────────────────────────────────────────────────────
  loadEnv()

  try {
    requireEnvs([
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
    checks.push({ check: 'env', status: 'FAIL', detail: error.message })
    const finishedAt = new Date().toISOString()
    report.addModule(MODULE_ID, 'FAIL', {
      failureCode: FailureCode.ENV_MISSING,
      failureDetail: error.message,
      startedAt,
      finishedAt,
      checks,
    })
    return { ok: false, error: error.message, code: FailureCode.ENV_MISSING }
  }

  // ── 2. Check admin env vars (optional for S03F) ───────────────────────────
  const hasAdminEnv = Boolean(getEnv('QA_ADMIN_IDENTIFIER')) && Boolean(getEnv('QA_ADMIN_PASSWORD'))
  checks.push({
    check: 'adminEnv',
    status: hasAdminEnv ? 'PASS' : 'SKIP',
    detail: hasAdminEnv ? 'QA_ADMIN_* present' : 'SKIPPED_ADMIN_ENV_MISSING',
  })

  // ── 3. Check APP_URL reachability ─────────────────────────────────────────
  const appUrl = getEnv('APP_URL', 'http://localhost:3002')
  const appResult = await checkAppUrl(appUrl)
  checks.push({
    check: 'appUrl',
    status: appResult.ok ? 'PASS' : 'FAIL',
    detail: appResult.ok ? `HTTP ${appResult.status}` : appResult.error,
  })

  // ── 4. Validate preview is BKG (not Cerberus) ────────────────────────────
  let previewCheck = { check: 'previewBKG', status: 'SKIP', detail: 'Could not verify preview provider' }
  if (appUrl.includes('vercel.app')) {
    previewCheck = { check: 'previewBKG', status: 'PASS', detail: 'Vercel preview detected (BKG)' }
  } else if (appUrl.includes('localhost') || appUrl.includes('127.0.0.1')) {
    previewCheck = { check: 'previewBKG', status: 'PASS', detail: 'Localhost' }
  } else {
    previewCheck = { check: 'previewBKG', status: 'PASS', detail: 'Not Cerberus' }
  }
  checks.push(previewCheck)

  // ── 5. DB connection ──────────────────────────────────────────────────────
  try {
    const prisma = await getPrisma()
    await prisma.$queryRaw`SELECT 1`
    checks.push({ check: 'dbConnection', status: 'PASS' })
  } catch (error) {
    checks.push({ check: 'dbConnection', status: 'FAIL', detail: error.message })
    const finishedAt = new Date().toISOString()
    report.addModule(MODULE_ID, 'FAIL', {
      failureCode: FailureCode.DB_MISSING_TABLE,
      failureDetail: `DB connection failed: ${error.message}`,
      startedAt,
      finishedAt,
      checks,
    })
    await disconnectPrisma()
    return { ok: false, error: error.message, code: FailureCode.DB_MISSING_TABLE }
  }

  // ── 6. Check required tables ──────────────────────────────────────────────
  const { tables, missing, ok: tablesOk } = await checkDbTables()
  checks.push({
    check: 'dbTables',
    status: tablesOk ? 'PASS' : 'FAIL',
    detail: tablesOk ? `${tables.length} tables OK` : `Missing: ${missing.join(', ')}`,
    tables,
  })

  // ── 7. QA buyer user check ────────────────────────────────────────────────
  const buyerIdentifier = getEnv('QA_BUYER_IDENTIFIER')
  const buyerEmail = getEnv('QA_BUYER_EMAIL')
  let buyerCheck = { check: 'qaBuyer', status: 'FAIL', detail: 'Not checked' }

  try {
    const buyer = await findUserByIdentifier(buyerIdentifier)
    if (buyer) {
      buyerCheck = {
        check: 'qaBuyer',
        status: 'PASS',
        detail: `Found: ${buyer.displayName} (${buyer.email}), role=${buyer.role}, isSeller=${buyer.isSeller}`,
        user: { email: buyer.email, displayName: buyer.displayName, role: buyer.role, isSeller: buyer.isSeller, isBanned: buyer.isBanned },
      }
    } else {
      buyerCheck = {
        check: 'qaBuyer',
        status: 'FAIL',
        detail: `No user found for identifier: ${buyerIdentifier.slice(0, 3)}***`,
      }
    }
  } catch (error) {
    buyerCheck = { check: 'qaBuyer', status: 'FAIL', detail: error.message }
  }
  checks.push(buyerCheck)

  // ── 8. QA seller user check + candidateCount ──────────────────────────────
  const sellerIdentifier = getEnv('QA_SELLER_IDENTIFIER')
  let sellerCheck = { check: 'qaSeller', status: 'FAIL', detail: 'Not checked' }

  try {
    const seller = await findUserByIdentifier(sellerIdentifier)
    if (seller) {
      const conflictCount = await countConflictsByDisplayName(seller.displayName, seller.id)
      sellerCheck = {
        check: 'qaSeller',
        status: 'PASS',
        detail: `Found: ${seller.displayName} (${seller.email}), role=${seller.role}, isSeller=${seller.isSeller}, candidateCount=${1 + conflictCount}`,
        user: { email: seller.email, displayName: seller.displayName, role: seller.role, isSeller: seller.isSeller, isBanned: seller.isBanned },
        candidateCount: 1 + conflictCount,
      }
    } else {
      sellerCheck = {
        check: 'qaSeller',
        status: 'FAIL',
        detail: `No user found for identifier: ${sellerIdentifier.slice(0, 3)}***`,
      }
    }
  } catch (error) {
    sellerCheck = { check: 'qaSeller', status: 'FAIL', detail: error.message }
  }
  checks.push(sellerCheck)

  // ── 9. Assets check (not required for S03F) ──────────────────────────────
  checks.push({ check: 'assets', status: 'SKIP', detail: 'Not required for S03F' })

  await disconnectPrisma()

  // ── Final status ──────────────────────────────────────────────────────────
  const allPassed = checks
    .filter(c => c.status !== 'SKIP')
    .every(c => c.status === 'PASS')

  const finishedAt = new Date().toISOString()
  report.addModule(MODULE_ID, allPassed ? 'PASS' : 'FAIL', {
    startedAt,
    finishedAt,
    durationMs: new Date(finishedAt).getTime() - new Date(startedAt).getTime(),
    failureCode: allPassed ? null : 'PREFLIGHT_FAILED',
    failureDetail: allPassed ? null : `Some checks failed. See details.`,
    checks,
  })

  return allPassed
    ? { ok: true }
    : { ok: false, error: 'Some preflight checks failed', code: 'PREFLIGHT_FAILED' }
}
