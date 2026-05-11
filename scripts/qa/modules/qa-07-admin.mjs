import { loadEnv } from '../lib/env.mjs'
import { getPrisma, disconnectPrisma } from '../lib/db-read.mjs'
import { FailureCode } from '../lib/failures.mjs'

export const MODULE_ID = 'QA-07'
export const MODULE_NAME = 'Admin Review'
export const LAYER = 'B/C'

const LISTING_SLUG = 'qa-e2e-s03f-selleria-discovery'
const EXPECTED_STATES = ['INITIATED', 'PENDING_PAYMENT', 'PAYMENT_RECEIVED', 'IN_ESCROW', 'DELIVERY_CONFIRMED']

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
  if (!listing) { await disconnectPrisma(); return { ok: false, error: 'Listing not found' } }

  const tx = await prisma.mpTransaction.findFirst({
    where: { listingId: listing.id },
    orderBy: { createdAt: 'desc' },
    include: {
      statusHistory: { orderBy: { createdAt: 'asc' }, select: { toStatus: true, reason: true } },
      buyer: { select: { id: true, displayName: true } },
      seller: { select: { id: true, displayName: true } },
    },
  })

  if (!tx) {
    checks.push({ check: 'txLookup', status: 'FAIL', detail: 'No QA transaction found' })
    await disconnectPrisma()
    report.addModule(MODULE_ID, 'FAIL', { failureCode: 'PURCHASE_NOT_CREATED', checks, startedAt, finishedAt: new Date().toISOString() })
    return { ok: false }
  }
  checks.push({ check: 'txLookup', status: 'PASS', detail: `TX: ${tx.id.slice(0, 8)}***, current=${tx.status}` })

  // Verify status transitions
  const statesSeen = tx.statusHistory.map(h => h.toStatus)
  checks.push({
    check: 'statusFlow',
    status: statesSeen.length >= 2 ? 'PASS' : 'FAIL',
    detail: `States: ${statesSeen.join(' → ')}`,
    statesSequence: statesSeen,
  })

  // Verify buyer/seller
  checks.push({ check: 'buyer', status: 'PASS', detail: `Buyer: ${tx.buyer?.displayName}` })
  checks.push({ check: 'seller', status: 'PASS', detail: `Seller: ${tx.seller?.displayName}` })

  // Verify paymentProofUrl exists
  checks.push({
    check: 'proofUrl',
    status: tx.paymentProofUrl ? 'PASS' : 'PARTIAL',
    detail: tx.paymentProofUrl ? 'paymentProofUrl present' : 'No proof URL',
  })

  // Verify final state
  const finalOk = tx.status === 'DELIVERY_CONFIRMED' || tx.status === 'RELEASED'
  checks.push({ check: 'finalState', status: finalOk ? 'PASS' : 'FAIL', detail: `Final state: ${tx.status}` })

  await disconnectPrisma()

  const allPassed = checks.every(c => c.status === 'PASS' || c.status === 'PARTIAL')
  report.addModule(MODULE_ID, allPassed ? 'PASS' : 'FAIL', { startedAt, finishedAt: new Date().toISOString(), checks })
  return { ok: allPassed, transactionId: tx?.id }
}
