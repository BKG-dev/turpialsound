import { loadEnv, getEnv } from '../lib/env.mjs'
import { getPrisma, disconnectPrisma } from '../lib/db-read.mjs'
import { FailureCode } from '../lib/failures.mjs'

export const MODULE_ID = 'QA-05'
export const MODULE_NAME = 'Payment Report'
export const LAYER = 'B'

const LISTING_SLUG = 'qa-e2e-s03f-selleria-discovery'

export async function run(report) {
  const startedAt = new Date().toISOString()
  report.addModule(MODULE_ID, 'RUNNING', { startedAt })
  const checks = []

  loadEnv()

  const buyerIdentifier = getEnv('QA_BUYER_IDENTIFIER')
  if (!buyerIdentifier) {
    report.addModule(MODULE_ID, 'FAIL', { failureCode: FailureCode.ENV_MISSING, failureDetail: 'QA_BUYER_IDENTIFIER missing', startedAt, finishedAt: new Date().toISOString(), checks })
    return { ok: false, error: 'QA_BUYER_IDENTIFIER missing', code: FailureCode.ENV_MISSING }
  }

  let prisma
  try { prisma = await getPrisma() } catch (e) {
    report.addModule(MODULE_ID, 'FAIL', { failureCode: 'DB_MISSING_TABLE', failureDetail: e.message, startedAt, finishedAt: new Date().toISOString(), checks })
    return { ok: false, error: e.message, code: 'DB_MISSING_TABLE' }
  }

  // 1. Find the QA listing
  const listing = await prisma.mpListing.findUnique({ where: { slug: LISTING_SLUG }, select: { id: true } })
  if (!listing) {
    checks.push({ check: 'listingLookup', status: 'FAIL', detail: `Listing ${LISTING_SLUG} not found` })
    report.addModule(MODULE_ID, 'FAIL', { failureCode: 'LISTING_NOT_FOUND', failureDetail: `${LISTING_SLUG}`, startedAt, finishedAt: new Date().toISOString(), checks })
    await disconnectPrisma()
    return { ok: false, error: 'Listing not found', code: 'LISTING_NOT_FOUND' }
  }
  checks.push({ check: 'listingLookup', status: 'PASS', detail: `Listing found: ${listing.id.slice(0, 8)}***` })

  // 2. Find buyer
  const buyer = await prisma.mpUser.findFirst({
    where: { email: 'buyerIA@local.test' },
    select: { id: true, displayName: true },
  })
  if (!buyer) {
    checks.push({ check: 'buyerLookup', status: 'FAIL', detail: 'Buyer not found' })
    report.addModule(MODULE_ID, 'FAIL', { failureCode: 'QA_USER_MISSING', failureDetail: 'buyerIA', startedAt, finishedAt: new Date().toISOString(), checks })
    await disconnectPrisma()
    return { ok: false, error: 'Buyer not found', code: 'QA_USER_MISSING' }
  }
  checks.push({ check: 'buyerLookup', status: 'PASS', detail: `Buyer: ${buyer.displayName}` })

  // 3. Find PENDING_PAYMENT TX for this listing/buyer
  const tx = await prisma.mpTransaction.findFirst({
    where: { listingId: listing.id, buyerId: buyer.id, status: 'PENDING_PAYMENT' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, status: true },
  })

  if (!tx) {
    checks.push({ check: 'txLookup', status: 'FAIL', detail: 'No PENDING_PAYMENT transaction found. Run QA-04 first.' })
    report.addModule(MODULE_ID, 'FAIL', { failureCode: 'PURCHASE_NOT_CREATED', failureDetail: 'No PENDING_PAYMENT TX', startedAt, finishedAt: new Date().toISOString(), checks })
    await disconnectPrisma()
    return { ok: false, error: 'No PENDING_PAYMENT TX', code: 'PURCHASE_NOT_CREATED' }
  }
  checks.push({ check: 'txLookup', status: 'PASS', detail: `TX found: ${tx.id.slice(0, 8)}***, status=${tx.status}` })

  // 4. Report payment: update TX to PAYMENT_RECEIVED
  try {
    await prisma.mpTransaction.update({
      where: { id: tx.id },
      data: {
        status: 'PAYMENT_RECEIVED',
        paymentReference: 'QA-S03G-REF-001',
        paymentSenderBank: 'Banco QA Test',
        paymentPaidAt: new Date(),
      },
    })
    await prisma.mpTransactionStatusHistory.create({
      data: {
        transactionId: tx.id,
        fromStatus: 'PENDING_PAYMENT',
        toStatus: 'PAYMENT_RECEIVED',
        changedBy: buyer.id,
        reason: 'S03G QA payment report — comprobante enviado',
      },
    })
    checks.push({ check: 'paymentReport', status: 'PASS', detail: `TX ${tx.id.slice(0, 8)}*** -> PAYMENT_RECEIVED` })
  } catch (e) {
    checks.push({ check: 'paymentReport', status: 'FAIL', detail: e.message })
    report.addModule(MODULE_ID, 'FAIL', { failureCode: 'STATUS_TRANSITION_FAILED', failureDetail: e.message, startedAt, finishedAt: new Date().toISOString(), checks })
    await disconnectPrisma()
    return { ok: false, error: e.message, code: 'STATUS_TRANSITION_FAILED' }
  }

  // 5. Verify final state
  const verify = await prisma.mpTransaction.findUnique({
    where: { id: tx.id },
    select: { id: true, status: true, paymentReference: true, paymentPaidAt: true },
  })
  const valid = verify && verify.status === 'PAYMENT_RECEIVED'
  checks.push({ check: 'txVerify', status: valid ? 'PASS' : 'FAIL', detail: valid ? `TX verified: status=${verify.status}, ref=${verify.paymentReference}` : 'Verification failed' })

  await disconnectPrisma()

  const allPassed = checks.every(c => c.status === 'PASS')
  const finishedAt = new Date().toISOString()
  report.addModule(MODULE_ID, allPassed ? 'PASS' : 'FAIL', { startedAt, finishedAt, failureCode: allPassed ? null : 'PAYMENT_REPORT_FAILED', checks })

  return {
    ok: allPassed,
    transactionId: tx?.id,
    action: 'payment_reported',
  }
}
