import { loadEnv, getEnv } from '../lib/env.mjs'
import { getPrisma, disconnectPrisma, findUserByIdentifier, findListingBySlug } from '../lib/db-read.mjs'
import { FailureCode } from '../lib/failures.mjs'

export const MODULE_ID = 'QA-04'
export const MODULE_NAME = 'Purchase Initiation'
export const LAYER = 'B'

const MINI_PRICING = { platformFeePercent: '6.00', platformFeeAmount: '7.50', sellerNetAmount: '117.50' }

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

  const LISTING_SLUG = 'qa-e2e-s03f-selleria-discovery'

  // 1. Lookup buyer
  const buyer = await findUserByIdentifier(buyerIdentifier)
  if (!buyer) {
    checks.push({ check: 'buyerLookup', status: 'FAIL', detail: 'Buyer not found' })
  } else {
    checks.push({ check: 'buyerLookup', status: 'PASS', detail: `Buyer: ${buyer.displayName} (${buyer.email})` })
  }

  // 2. Lookup listing
  const listing = await findListingBySlug(LISTING_SLUG)
  if (!listing) {
    checks.push({ check: 'listingLookup', status: 'FAIL', detail: `Listing ${LISTING_SLUG} not found` })
    report.addModule(MODULE_ID, 'FAIL', { failureCode: FailureCode.LISTING_CREATE_FAILED, failureDetail: `Listing ${LISTING_SLUG} not found`, startedAt, finishedAt: new Date().toISOString(), checks })
    await disconnectPrisma()
    return { ok: false, error: 'Listing not found', code: FailureCode.LISTING_CREATE_FAILED }
  }

  if (listing.status !== 'ACTIVE') {
    checks.push({ check: 'listingStatus', status: 'FAIL', detail: `Listing status=${listing.status}, expected ACTIVE` })
    report.addModule(MODULE_ID, 'FAIL', { failureCode: 'LISTING_NOT_ACTIVE', failureDetail: `status=${listing.status}`, startedAt, finishedAt: new Date().toISOString(), checks })
    await disconnectPrisma()
    return { ok: false, error: 'Listing not ACTIVE', code: 'LISTING_NOT_ACTIVE' }
  }

  checks.push({ check: 'listingLookup', status: 'PASS', detail: `Listing: ${listing.title}, status=${listing.status}, price=${listing.price}` })

  // 3. Check for existing QA transaction
  const existingTx = await prisma.mpTransaction.findFirst({
    where: { listingId: listing.id, buyerId: buyer.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, status: true },
  })

  let transaction
  let txAction = 'created'

  if (existingTx && ['PENDING_PAYMENT', 'INITIATED'].includes(existingTx.status)) {
    transaction = existingTx
    txAction = 'reused'
    checks.push({ check: 'txCreate', status: 'PASS', detail: `Reused existing QA TX: ${transaction.id.slice(0, 8)}***, status=${transaction.status}` })
  } else {
    const idempotencyKey = `qa-${buyer.id.slice(0, 8)}-${listing.id.slice(0, 8)}-${Date.now()}`
    try {
      transaction = await prisma.$transaction(async (txn) => {
        const record = await txn.mpTransaction.create({
          data: {
            idempotencyKey,
            buyerId: buyer.id,
            sellerId: listing.sellerId,
            listingId: listing.id,
            paymentMethod: 'MERCANTIL_PAGO_MOVIL',
            status: 'PENDING_PAYMENT',
            amount: String(listing.price),
            currency: listing.currency || 'USD',
            platformFeePercent: MINI_PRICING.platformFeePercent,
            platformFeeAmount: MINI_PRICING.platformFeeAmount,
            sellerNetAmount: MINI_PRICING.sellerNetAmount,
          },
          select: { id: true },
        })
        await txn.mpTransactionStatusHistory.create({
          data: {
            transactionId: record.id,
            toStatus: 'PENDING_PAYMENT',
            changedBy: buyer.id,
            reason: 'S03G QA purchase initiation',
          },
        })
        return record
      })
      checks.push({ check: 'txCreate', status: 'PASS', detail: `TX created: ${transaction.id.slice(0, 8)}***, status=PENDING_PAYMENT` })
    } catch (e) {
      checks.push({ check: 'txCreate', status: 'FAIL', detail: e.message })
      report.addModule(MODULE_ID, 'FAIL', { failureCode: FailureCode.PURCHASE_NOT_CREATED, failureDetail: e.message, startedAt, finishedAt: new Date().toISOString(), checks })
      await disconnectPrisma()
      return { ok: false, error: e.message, code: FailureCode.PURCHASE_NOT_CREATED }
    }
  }

  // 4. Verify TX in DB
  const verify = await prisma.mpTransaction.findUnique({
    where: { id: transaction.id },
    select: { id: true, status: true, buyerId: true, sellerId: true, listingId: true, amount: true },
  })
  const txValid = verify && verify.status === 'PENDING_PAYMENT' && verify.buyerId === buyer.id
  checks.push({ check: 'txVerify', status: txValid ? 'PASS' : 'FAIL', detail: txValid ? `TX verified: status=${verify.status}` : 'TX verification failed' })

  await disconnectPrisma()

  const allPassed = checks.every(c => c.status === 'PASS')
  const finishedAt = new Date().toISOString()
  report.addModule(MODULE_ID, allPassed ? 'PASS' : 'FAIL', { startedAt, finishedAt, failureCode: allPassed ? null : FailureCode.PURCHASE_NOT_CREATED, checks })

  return {
    ok: allPassed,
    transactionId: transaction?.id,
    listingSlug: LISTING_SLUG,
    action: txAction,
  }
}
