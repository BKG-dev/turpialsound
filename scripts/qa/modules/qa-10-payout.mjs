import { loadEnv } from '../lib/env.mjs'
import { getPrisma, disconnectPrisma } from '../lib/db-read.mjs'
import { FailureCode } from '../lib/failures.mjs'

export const MODULE_ID = 'QA-10'
export const MODULE_NAME = 'Admin Payout'
export const LAYER = 'B/D'

const LISTING_SLUG = 'qa-e2e-s03f-selleria-discovery'

export async function run(report) {
  const startedAt = new Date().toISOString()
  report.addModule(MODULE_ID, 'RUNNING', { startedAt })
  const checks = []

  loadEnv()

  let prisma
  try { prisma = await getPrisma() } catch (e) {
    report.addModule(MODULE_ID, 'FAIL', { failureCode: 'DB_MISSING_TABLE', failureDetail: e.message, startedAt, finishedAt: new Date().toISOString(), checks })
    return { ok: false }
  }

  const listing = await prisma.mpListing.findUnique({ where: { slug: LISTING_SLUG }, select: { id: true } })
  if (!listing) { await disconnectPrisma(); return { ok: false, error: 'Listing not found' } }

  // Find TX ready for release
  let tx = await prisma.mpTransaction.findFirst({
    where: { listingId: listing.id, status: 'DELIVERY_CONFIRMED' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, status: true, sellerId: true, buyerId: true, sellerNetAmount: true, amount: true },
  })

  if (!tx) {
    tx = await prisma.mpTransaction.findFirst({
      where: { listingId: listing.id, status: 'RELEASED' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true, sellerId: true, sellerNetAmount: true },
    })
    if (tx) {
      checks.push({ check: 'txLookup', status: 'PASS', detail: 'TX already RELEASED (re-run safe)' })
    }
  }

  if (!tx) {
    checks.push({ check: 'txLookup', status: 'FAIL', detail: 'No DELIVERY_CONFIRMED or RELEASED TX' })
    await disconnectPrisma()
    report.addModule(MODULE_ID, 'FAIL', { failureCode: 'PURCHASE_NOT_CREATED', checks, startedAt, finishedAt: new Date().toISOString() })
    return { ok: false }
  }
  checks.push({ check: 'txLookup', status: 'PASS', detail: `TX: ${tx.id.slice(0, 8)}***, status=${tx.status}` })

  // Release escrow if in DELIVERY_CONFIRMED
  if (tx.status === 'DELIVERY_CONFIRMED') {
    try {
      const now = new Date()
      await prisma.mpTransaction.update({
        where: { id: tx.id },
        data: { status: 'RELEASED', releasedAt: now },
      })
      await prisma.mpTransactionStatusHistory.create({
        data: {
          transactionId: tx.id,
          fromStatus: 'DELIVERY_CONFIRMED',
          toStatus: 'RELEASED',
          changedBy: 'SYSTEM',
          reason: 'S03I QA pago liberado por admin',
        },
      })
      checks.push({ check: 'releaseEscrow', status: 'PASS', detail: 'TX DELIVERY_CONFIRMED → RELEASED' })
    } catch (e) {
      checks.push({ check: 'releaseEscrow', status: 'FAIL', detail: e.message })
    }
  } else {
    checks.push({ check: 'releaseEscrow', status: 'PASS', detail: 'Already released' })
  }

  // Create QA payout record
  const existingPayout = await prisma.mpPayout.findFirst({
    where: { transactionIds: { has: tx.id } },
  })

  if (existingPayout) {
    checks.push({ check: 'payoutCreate', status: 'PASS', detail: 'Payout already exists (re-run safe)' })
  } else {
    try {
      await prisma.mpPayout.create({
        data: {
          sellerId: tx.sellerId,
          amount: tx.sellerNetAmount || tx.amount,
          currency: 'USD',
          method: 'PAGO_MOVIL',
          status: 'PENDING',
          transactionIds: [tx.id],
        },
      })
      checks.push({ check: 'payoutCreate', status: 'PASS', detail: 'Payout record created for seller' })
    } catch (e) {
      checks.push({ check: 'payoutCreate', status: 'FAIL', detail: e.message })
    }
  }

  // Verify final state
  const verify = await prisma.mpTransaction.findUnique({
    where: { id: tx.id },
    select: { id: true, status: true, releasedAt: true },
  })
  const payoutVerify = await prisma.mpPayout.findFirst({
    where: { transactionIds: { has: tx.id } },
    select: { id: true, status: true },
  })
  checks.push({
    check: 'stateVerify',
    status: verify?.status === 'RELEASED' && payoutVerify ? 'PASS' : 'FAIL',
    detail: `TX=${verify?.status}, Payout=${payoutVerify?.status || 'NONE'}`,
  })

  await disconnectPrisma()

  const allPassed = checks.every(c => c.status === 'PASS')
  report.addModule(MODULE_ID, allPassed ? 'PASS' : 'FAIL', { startedAt, finishedAt: new Date().toISOString(), checks })
  return { ok: allPassed, transactionId: tx?.id }
}
