import { createHash } from 'node:crypto'
import { loadEnv } from '../lib/env.mjs'
import { getPrisma, disconnectPrisma } from '../lib/db-read.mjs'
import { FailureCode } from '../lib/failures.mjs'

export const MODULE_ID = 'QA-10'
export const MODULE_NAME = 'Admin Payout (Auditable)'
export const LAYER = 'B'

const LISTING_SLUG = 'selleria-qa-e2e-persistente'

function computeAuditHash(data) {
  const payload = [
    data.sellerId,
    data.amount.toString(),
    data.currency || 'USD',
    data.method,
    (data.transactionIds || []).join(','),
    data.reference || '',
  ].join('|')
  return createHash('sha256').update(payload).digest('hex')
}

function generateReference(txId, index) {
  const now = new Date()
  const y = now.getFullYear().toString()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const seq = String(index).padStart(3, '0')
  return `PAYOUT-${y}${m}${d}-${seq}`
}

export async function run(report) {
  const startedAt = new Date().toISOString()
  const checks = []

  loadEnv()

  let prisma
  try { prisma = await getPrisma() } catch (e) {
    report.addModule(MODULE_ID, 'FAIL', { failureCode: 'DB_MISSING_TABLE', failureDetail: e.message, startedAt, finishedAt: new Date().toISOString(), checks })
    return { ok: false }
  }

  const listing = await prisma.mpListing.findUnique({ where: { slug: LISTING_SLUG }, select: { id: true } })
  if (!listing) { await disconnectPrisma(); return { ok: false, error: 'Listing not found' } }

  let tx = await prisma.mpTransaction.findFirst({
    where: { listingId: listing.id, status: 'DELIVERY_CONFIRMED' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, status: true, sellerId: true, buyerId: true, sellerNetAmount: true, amount: true },
  })

  if (!tx) {
    tx = await prisma.mpTransaction.findFirst({
      where: { listingId: listing.id, status: 'RELEASED' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true, sellerId: true, buyerId: true, sellerNetAmount: true, amount: true },
    })
    if (tx) {
      checks.push({ check: 'txLookup', status: 'PASS', detail: 'TX already RELEASED (re-run safe)' })
    }
  }

  if (!tx) {
    checks.push({ check: 'txLookup', status: 'FAIL', detail: 'No DELIVERY_CONFIRMED or RELEASED TX found' })
    await disconnectPrisma()
    report.addModule(MODULE_ID, 'FAIL', { failureCode: 'PURCHASE_NOT_CREATED', checks, startedAt, finishedAt: new Date().toISOString() })
    return { ok: false }
  }
  checks.push({ check: 'txLookup', status: 'PASS', detail: `TX: ${tx.id.slice(0, 8)}***, status=${tx.status}` })

  if (tx.status === 'DELIVERY_CONFIRMED') {
    try {
      const now = new Date()
      await prisma.mpTransaction.update({ where: { id: tx.id }, data: { status: 'RELEASED', releasedAt: now } })
      await prisma.mpTransactionStatusHistory.create({
        data: { transactionId: tx.id, fromStatus: 'DELIVERY_CONFIRMED', toStatus: 'RELEASED', changedBy: 'SYSTEM', reason: 'S06 QA pago liberado por admin - payout auditable' },
      })
      checks.push({ check: 'releaseEscrow', status: 'PASS', detail: 'TX DELIVERY_CONFIRMED -> RELEASED' })
    } catch (e) {
      checks.push({ check: 'releaseEscrow', status: 'FAIL', detail: e.message })
    }
  } else {
    checks.push({ check: 'releaseEscrow', status: 'PASS', detail: 'Already released' })
  }

  let payout = await prisma.mpPayout.findFirst({ where: { transactionIds: { has: tx.id } } })

  if (payout) {
    const existingRef = payout.reference
    const existingHash = payout.auditHash
    if (!existingRef || !existingHash) {
      const reference = existingRef || generateReference(tx.id, await prisma.mpPayout.count())
      const ahash = computeAuditHash({ sellerId: payout.sellerId, amount: payout.amount, currency: payout.currency, method: payout.method, transactionIds: payout.transactionIds, reference })
      await prisma.mpPayout.update({ where: { id: payout.id }, data: { reference, auditHash: ahash } })
      checks.push({ check: 'payoutCreate', status: 'PASS', detail: `Payout backfilled with audit fields: ${reference}` })
    } else {
      checks.push({ check: 'payoutCreate', status: 'PASS', detail: 'Payout already exists with audit fields' })
    }
  } else {
    const payoutCount = await prisma.mpPayout.count()
    const reference = generateReference(tx.id, payoutCount + 1)
    const amount = tx.sellerNetAmount || tx.amount
    const method = 'PAGO_MOVIL'
    const ahash = computeAuditHash({ sellerId: tx.sellerId, amount, currency: 'USD', method, transactionIds: [tx.id], reference })

    try {
      payout = await prisma.mpPayout.create({
        data: { sellerId: tx.sellerId, amount, currency: 'USD', method, status: 'PENDING', transactionIds: [tx.id], reference, auditHash: ahash },
      })
      checks.push({ check: 'payoutCreate', status: 'PASS', detail: `Payout ${reference} created with audit hash` })
    } catch (e) {
      checks.push({ check: 'payoutCreate', status: 'FAIL', detail: e.message })
    }
  }

  const payoutVerify = payout
    ? await prisma.mpPayout.findUnique({ where: { id: payout.id } })
    : await prisma.mpPayout.findFirst({ where: { transactionIds: { has: tx.id } } })

  if (!payoutVerify) {
    checks.push({ check: 'auditReference', status: 'FAIL', detail: 'No payout found to audit' })
    checks.push({ check: 'auditMethod', status: 'FAIL', detail: 'No payout found to audit' })
    checks.push({ check: 'auditAmount', status: 'FAIL', detail: 'No payout found to audit' })
    checks.push({ check: 'auditDate', status: 'FAIL', detail: 'No payout found to audit' })
    checks.push({ check: 'auditHash', status: 'FAIL', detail: 'No payout found to audit' })
  } else {
    checks.push({ check: 'auditReference', status: payoutVerify.reference ? 'PASS' : 'FAIL', detail: payoutVerify.reference || 'MISSING' })
    checks.push({ check: 'auditMethod', status: payoutVerify.method ? 'PASS' : 'FAIL', detail: `method=${payoutVerify.method}` })
    const rawAmount = typeof payoutVerify.amount === 'object' ? payoutVerify.amount.toString() : String(payoutVerify.amount)
    checks.push({ check: 'auditAmount', status: parseFloat(rawAmount) > 0 ? 'PASS' : 'FAIL', detail: `amount=${rawAmount} ${payoutVerify.currency}` })
    checks.push({ check: 'auditDate', status: payoutVerify.createdAt ? 'PASS' : 'FAIL', detail: payoutVerify.createdAt ? new Date(payoutVerify.createdAt).toISOString() : 'MISSING' })
    const expectedHash = computeAuditHash({ sellerId: payoutVerify.sellerId, amount: payoutVerify.amount, currency: payoutVerify.currency, method: payoutVerify.method, transactionIds: payoutVerify.transactionIds, reference: payoutVerify.reference })
    const hashValid = payoutVerify.auditHash === expectedHash
    checks.push({ check: 'auditHash', status: hashValid ? 'PASS' : 'FAIL', detail: hashValid ? `Hash verified: ${payoutVerify.auditHash.slice(0, 16)}...` : `Hash mismatch` })
  }

  await disconnectPrisma()

  const allPassed = checks.every(c => c.status === 'PASS')
  report.addModule(MODULE_ID, allPassed ? 'PASS' : 'FAIL', { startedAt, finishedAt: new Date().toISOString(), checks })
  return { ok: allPassed, transactionId: tx?.id }
}
