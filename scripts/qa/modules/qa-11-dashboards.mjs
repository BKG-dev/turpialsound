import { loadEnv, getEnv } from '../lib/env.mjs'
import { getPrisma, disconnectPrisma } from '../lib/db-read.mjs'
import { FailureCode } from '../lib/failures.mjs'

export const MODULE_ID = 'QA-11'
export const MODULE_NAME = 'Dashboards'
export const LAYER = 'C/D'

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
  if (!listing) { await disconnectPrisma(); return { ok: false } }

  const tx = await prisma.mpTransaction.findFirst({
    where: { listingId: listing.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, status: true, buyerId: true, sellerId: true, amount: true, paymentProofUrl: true },
  })
  if (!tx) {
    checks.push({ check: 'txLookup', status: 'FAIL' })
    await disconnectPrisma()
    report.addModule(MODULE_ID, 'FAIL', { failureCode: 'PURCHASE_NOT_CREATED', checks, startedAt, finishedAt: new Date().toISOString() })
    return { ok: false }
  }
  checks.push({ check: 'txLookup', status: 'PASS', detail: `TX ${tx.id.slice(0, 8)}***, status=${tx.status}` })

  // Buyer dashboard: can find the TX
  const buyerTx = await prisma.mpTransaction.findFirst({
    where: { buyerId: tx.buyerId, listingId: listing.id },
    select: { id: true, status: true },
  })
  checks.push({
    check: 'buyerDashboard',
    status: buyerTx ? 'PASS' : 'FAIL',
    detail: buyerTx ? `Buyer sees TX: ${buyerTx.status}` : 'Buyer dashboard empty',
  })

  // Buyer stats
  const buyerTxCount = await prisma.mpTransaction.count({ where: { buyerId: tx.buyerId } })
  checks.push({
    check: 'buyerStats',
    status: buyerTxCount > 0 ? 'PASS' : 'FAIL',
    detail: `Buyer has ${buyerTxCount} transaction(s)`,
  })

  // Seller dashboard
  const sellerTxCount = await prisma.mpTransaction.count({ where: { sellerId: tx.sellerId } })
  checks.push({
    check: 'sellerDashboard',
    status: sellerTxCount > 0 ? 'PASS' : 'FAIL',
    detail: `Seller has ${sellerTxCount} transaction(s)`,
  })

  // Seller listing status
  const sellerListings = await prisma.mpListing.count({
    where: { sellerId: tx.sellerId, status: { in: ['ACTIVE', 'SOLD_OUT', 'PAUSED'] } },
  })
  checks.push({
    check: 'sellerListings',
    status: sellerListings > 0 ? 'PASS' : 'FAIL',
    detail: `Seller listings: ${sellerListings}`,
  })

  // Admin: overall stats
  const totalTx = await prisma.mpTransaction.count()
  const releasedTx = await prisma.mpTransaction.count({ where: { status: 'RELEASED' } })
  const inEscrowTx = await prisma.mpTransaction.count({ where: { status: 'IN_ESCROW' } })
  const totalPayouts = await prisma.mpPayout.count()
  const totalUsers = await prisma.mpUser.count()
  checks.push({
    check: 'adminStats',
    status: totalTx > 0 ? 'PASS' : 'FAIL',
    detail: `Total TX=${totalTx}, RELEASED=${releasedTx}, IN_ESCROW=${inEscrowTx}, Payouts=${totalPayouts}, Users=${totalUsers}`,
  })

  await disconnectPrisma()

  const allPassed = checks.every(c => c.status === 'PASS')
  report.addModule(MODULE_ID, allPassed ? 'PASS' : 'FAIL', { startedAt, finishedAt: new Date().toISOString(), checks })
  return { ok: allPassed, transactionId: tx?.id }
}
