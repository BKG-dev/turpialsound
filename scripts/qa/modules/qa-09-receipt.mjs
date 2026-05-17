import { loadEnv } from '../lib/env.mjs'
import { getPrisma, disconnectPrisma } from '../lib/db-read.mjs'
import { FailureCode } from '../lib/failures.mjs'

export const MODULE_ID = 'QA-09'
export const MODULE_NAME = 'Buyer Receipt'
export const LAYER = 'B'

const LISTING_SLUG = 'qa-e2e-s03f-selleria-discovery'

export async function run(report) {
  const startedAt = new Date().toISOString()
  report.addModule(MODULE_ID, 'RUNNING', { startedAt })
  const checks = []

  loadEnv()

  let prisma
  try { prisma = await getPrisma() } catch (e) {
    report.addModule(MODULE_ID, 'FAIL', { failureCode: 'DB_MISSING_TABLE', failureDetail: e.message, startedAt, finishedAt: new Date().toISOString(), checks })
    return { ok: false, error: e.message, code: 'DB_MISSING_TABLE' }
  }

  const listing = await prisma.mpListing.findUnique({ where: { slug: LISTING_SLUG }, select: { id: true } })
  if (!listing) {
    checks.push({ check: 'listingLookup', status: 'FAIL', detail: `${LISTING_SLUG} not found` })
    await disconnectPrisma()
    report.addModule(MODULE_ID, 'FAIL', { failureCode: 'LISTING_NOT_FOUND', checks, startedAt, finishedAt: new Date().toISOString() })
    return { ok: false, error: 'Listing not found', code: 'LISTING_NOT_FOUND' }
  }

  // Find TX in IN_ESCROW with seller_delivered
  const tx = await prisma.mpTransaction.findFirst({
    where: { listingId: listing.id, status: 'IN_ESCROW' },
    orderBy: { createdAt: 'desc' },
    include: {
      statusHistory: { select: { reason: true, toStatus: true, changedBy: true } },
    },
  })

  if (!tx) {
    checks.push({ check: 'txLookup', status: 'FAIL', detail: 'No IN_ESCROW transaction. Run QA-08 first.' })
    await disconnectPrisma()
    report.addModule(MODULE_ID, 'FAIL', { failureCode: 'PURCHASE_NOT_CREATED', checks, startedAt, finishedAt: new Date().toISOString() })
    return { ok: false, error: 'No IN_ESCROW TX', code: 'PURCHASE_NOT_CREATED' }
  }
  checks.push({ check: 'txLookup', status: 'PASS', detail: `TX: ${tx.id.slice(0, 8)}***, status=${tx.status}` })

  // Check seller delivered
  const sellerDelivered = tx.statusHistory.some(h => h.toStatus === 'IN_ESCROW' && (h.reason || '').includes('seller_delivered'))
  if (!sellerDelivered) {
    checks.push({ check: 'sellerDelivered', status: 'FAIL', detail: 'Seller has not delivered yet. Run QA-08 first.' })
    await disconnectPrisma()
    report.addModule(MODULE_ID, 'FAIL', { failureCode: 'STATUS_TRANSITION_FAILED', checks, startedAt, finishedAt: new Date().toISOString() })
    return { ok: false, error: 'Seller not delivered', code: 'STATUS_TRANSITION_FAILED' }
  }
  checks.push({ check: 'sellerDelivered', status: 'PASS', detail: 'Seller delivery confirmed' })

  // Check if buyer already confirmed
  if (tx.buyerConfirmedAt) {
    checks.push({ check: 'buyerConfirm', status: 'PASS', detail: 'Buyer already confirmed (re-run safe)' })
  } else {
    try {
      const now = new Date()
      await prisma.mpTransaction.update({
        where: { id: tx.id },
        data: { status: 'DELIVERY_CONFIRMED', buyerConfirmedAt: now },
      })
      await prisma.mpTransactionStatusHistory.create({
        data: {
          transactionId: tx.id,
          fromStatus: 'IN_ESCROW',
          toStatus: 'DELIVERY_CONFIRMED',
          changedBy: tx.buyerId,
          reason: 'buyer_confirmed_receipt: S03H QA comprador confirmó recepción',
        },
      })
      checks.push({ check: 'buyerConfirm', status: 'PASS', detail: 'TX IN_ESCROW → DELIVERY_CONFIRMED' })
    } catch (e) {
      checks.push({ check: 'buyerConfirm', status: 'FAIL', detail: e.message })
      await disconnectPrisma()
      report.addModule(MODULE_ID, 'FAIL', { failureCode: 'STATUS_TRANSITION_FAILED', checks, startedAt, finishedAt: new Date().toISOString() })
      return { ok: false, error: e.message, code: 'STATUS_TRANSITION_FAILED' }
    }
  }

  // Verify final state
  const verify = await prisma.mpTransaction.findUnique({
    where: { id: tx.id },
    select: { id: true, status: true, buyerConfirmedAt: true },
  })
  const valid = verify && verify.status === 'DELIVERY_CONFIRMED' && verify.buyerConfirmedAt
  checks.push({
    check: 'stateVerify',
    status: valid ? 'PASS' : 'FAIL',
    detail: valid ? `TX confirmed: status=${verify.status}` : `Status=${verify?.status}`,
  })

  await disconnectPrisma()

  const allPassed = checks.every(c => c.status === 'PASS')
  const finishedAt = new Date().toISOString()
  report.addModule(MODULE_ID, allPassed ? 'PASS' : 'FAIL', { startedAt, finishedAt, failureCode: allPassed ? null : 'RECEIPT_FAILED', checks })

  return { ok: allPassed, transactionId: tx?.id }
}
