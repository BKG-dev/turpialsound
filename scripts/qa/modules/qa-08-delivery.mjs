import { loadEnv, getEnv } from '../lib/env.mjs'
import { getPrisma, disconnectPrisma, findUserByIdentifier } from '../lib/db-read.mjs'
import { FailureCode } from '../lib/failures.mjs'

export const MODULE_ID = 'QA-08'
export const MODULE_NAME = 'Seller Delivery'
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

  // Find the QA transaction
  const listing = await prisma.mpListing.findUnique({ where: { slug: LISTING_SLUG }, select: { id: true } })
  if (!listing) {
    checks.push({ check: 'listingLookup', status: 'FAIL', detail: `${LISTING_SLUG} not found` })
    await disconnectPrisma()
    report.addModule(MODULE_ID, 'FAIL', { failureCode: 'LISTING_NOT_FOUND', checks, startedAt, finishedAt: new Date().toISOString() })
    return { ok: false, error: 'Listing not found', code: 'LISTING_NOT_FOUND' }
  }
  checks.push({ check: 'listingLookup', status: 'PASS', detail: `Found: ${listing.id.slice(0, 8)}***` })

  // Find TX — prefer PAYMENT_RECEIVED, then IN_ESCROW (re-run)
  let tx = await prisma.mpTransaction.findFirst({
    where: { listingId: listing.id, status: 'PAYMENT_RECEIVED' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, status: true, sellerId: true, buyerId: true },
  })

  // If already in IN_ESCROW, reuse
  if (!tx) {
    tx = await prisma.mpTransaction.findFirst({
      where: { listingId: listing.id, status: 'IN_ESCROW' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true, sellerId: true, buyerId: true },
    })
  }

  if (!tx) {
    checks.push({ check: 'txLookup', status: 'FAIL', detail: 'No PAYMENT_RECEIVED or IN_ESCROW transaction' })
    await disconnectPrisma()
    report.addModule(MODULE_ID, 'FAIL', { failureCode: 'PURCHASE_NOT_CREATED', checks, startedAt, finishedAt: new Date().toISOString() })
    return { ok: false, error: 'No eligible TX', code: 'PURCHASE_NOT_CREATED' }
  }
  checks.push({ check: 'txLookup', status: 'PASS', detail: `TX: ${tx.id.slice(0, 8)}***, status=${tx.status}` })

  // Find admin (SUPER) and seller
  const admin = await findUserByIdentifier(getEnv('QA_ADMIN_IDENTIFIER'))
  const seller = await prisma.mpUser.findUnique({ where: { id: tx.sellerId }, select: { id: true, displayName: true } })

  if (!seller) {
    checks.push({ check: 'sellerLookup', status: 'FAIL', detail: 'Seller not found' })
    await disconnectPrisma()
    report.addModule(MODULE_ID, 'FAIL', { failureCode: 'QA_USER_MISSING', checks, startedAt, finishedAt: new Date().toISOString() })
    return { ok: false, error: 'Seller not found', code: 'QA_USER_MISSING' }
  }
  checks.push({ check: 'sellerLookup', status: 'PASS', detail: `Seller: ${seller.displayName}` })

  // Step 1: Admin validates payment (if still PAYMENT_RECEIVED)
  if (tx.status === 'PAYMENT_RECEIVED') {
    try {
      const now = new Date()
      await prisma.mpTransaction.update({
        where: { id: tx.id },
        data: {
          status: 'IN_ESCROW',
          escrowHeldAt: now,
          escrowReleaseAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          adminNotes: 'S03H QA admin validation (inline mock)',
        },
      })
      await prisma.mpTransactionStatusHistory.create({
        data: {
          transactionId: tx.id,
          fromStatus: 'PAYMENT_RECEIVED',
          toStatus: 'IN_ESCROW',
          changedBy: admin?.id || 'SYSTEM',
          reason: 'S03H QA pago aprobado por admin; fondos en escrow',
        },
      })
      checks.push({ check: 'adminValidate', status: 'PASS', detail: 'TX PAYMENT_RECEIVED → IN_ESCROW' })
    } catch (e) {
      checks.push({ check: 'adminValidate', status: 'FAIL', detail: e.message })
      await disconnectPrisma()
      report.addModule(MODULE_ID, 'FAIL', { failureCode: 'STATUS_TRANSITION_FAILED', checks, startedAt, finishedAt: new Date().toISOString() })
      return { ok: false, error: e.message, code: 'STATUS_TRANSITION_FAILED' }
    }
  } else {
    checks.push({ check: 'adminValidate', status: 'PASS', detail: 'TX already IN_ESCROW (re-run safe)' })
  }

  // Step 2: Check if seller already delivered
  const existingDelivery = await prisma.mpTransactionStatusHistory.findFirst({
    where: { transactionId: tx.id, reason: { contains: 'seller_delivered' } },
  })

  if (existingDelivery) {
    checks.push({ check: 'sellerDeliver', status: 'PASS', detail: 'Seller already delivered (re-run safe)' })
  } else {
    try {
      await prisma.mpTransactionStatusHistory.create({
        data: {
          transactionId: tx.id,
          fromStatus: 'IN_ESCROW',
          toStatus: 'IN_ESCROW',
          changedBy: seller.id,
          reason: 'seller_delivered: S03H QA seller registró entrega electrónica',
        },
      })
      checks.push({ check: 'sellerDeliver', status: 'PASS', detail: `Seller ${seller.displayName} registered delivery` })
    } catch (e) {
      checks.push({ check: 'sellerDeliver', status: 'FAIL', detail: e.message })
      await disconnectPrisma()
      report.addModule(MODULE_ID, 'FAIL', { failureCode: 'STATUS_TRANSITION_FAILED', checks, startedAt, finishedAt: new Date().toISOString() })
      return { ok: false, error: e.message, code: 'STATUS_TRANSITION_FAILED' }
    }
  }

  // Verify final state
  const verify = await prisma.mpTransaction.findUnique({
    where: { id: tx.id },
    select: { id: true, status: true },
  })
  checks.push({ check: 'stateVerify', status: verify?.status === 'IN_ESCROW' ? 'PASS' : 'FAIL', detail: `Final state: ${verify?.status}` })

  await disconnectPrisma()

  const allPassed = checks.every(c => c.status === 'PASS')
  const finishedAt = new Date().toISOString()
  report.addModule(MODULE_ID, allPassed ? 'PASS' : 'FAIL', { startedAt, finishedAt, failureCode: allPassed ? null : 'DELIVERY_FAILED', checks })

  return { ok: allPassed, transactionId: tx?.id }
}
