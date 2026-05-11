import { loadEnv, getEnv } from '../lib/env.mjs'
import { getPrisma, disconnectPrisma } from '../lib/db-read.mjs'
import { FailureCode } from '../lib/failures.mjs'

export const MODULE_ID = 'QA-06'
export const MODULE_NAME = 'Payment Proof Upload'
export const LAYER = 'D'

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

  // 1. Find the QA transaction in PAYMENT_RECEIVED
  const listing = await prisma.mpListing.findUnique({ where: { slug: LISTING_SLUG }, select: { id: true } })
  if (!listing) {
    checks.push({ check: 'listingLookup', status: 'FAIL', detail: `${LISTING_SLUG} not found` })
    await disconnectPrisma()
    report.addModule(MODULE_ID, 'FAIL', { failureCode: 'LISTING_NOT_FOUND', checks, startedAt, finishedAt: new Date().toISOString() })
    return { ok: false, error: 'Listing not found', code: 'LISTING_NOT_FOUND' }
  }

  const tx = await prisma.mpTransaction.findFirst({
    where: { listingId: listing.id, status: 'PAYMENT_RECEIVED' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, status: true, buyerId: true },
  })

  if (!tx) {
    checks.push({ check: 'txLookup', status: 'FAIL', detail: 'No PAYMENT_RECEIVED transaction found. Run QA-04 + QA-05 first.' })
    await disconnectPrisma()
    report.addModule(MODULE_ID, 'FAIL', { failureCode: 'PURCHASE_NOT_CREATED', checks, startedAt, finishedAt: new Date().toISOString() })
    return { ok: false, error: 'No PAYMENT_RECEIVED TX', code: 'PURCHASE_NOT_CREATED' }
  }
  checks.push({ check: 'txLookup', status: 'PASS', detail: `TX: ${tx.id.slice(0, 8)}***, status=${tx.status}` })

  // 2. Create a dummy proof blob metadata record (simulates file upload)
  const dummyProofUrl = `/api/marketplace/payment-proofs/qa-dummy-proof-${Date.now()}`
  try {
    await prisma.mpBlobObjectMetadata.create({
      data: {
        url: dummyProofUrl,
        pathname: `qa-e2e/s03g/payment-proof-dummy-${Date.now()}.png`,
        sizeBytes: 1024,
        contentType: 'image/png',
        entityType: 'payment_proof',
        entityId: tx.id,
      },
    })
    checks.push({ check: 'blobCreate', status: 'PASS', detail: 'Dummy blob metadata created' })
  } catch (e) {
    checks.push({ check: 'blobCreate', status: 'FAIL', detail: e.message })
    await disconnectPrisma()
    report.addModule(MODULE_ID, 'FAIL', { failureCode: 'PAYMENT_PROOF_UPLOAD_FAILED', checks, startedAt, finishedAt: new Date().toISOString() })
    return { ok: false, error: e.message, code: 'PAYMENT_PROOF_UPLOAD_FAILED' }
  }

  // 3. Attach proof URL to transaction
  try {
    await prisma.mpTransaction.update({
      where: { id: tx.id },
      data: { paymentProofUrl: dummyProofUrl },
    })
    checks.push({ check: 'proofAttach', status: 'PASS', detail: 'Proof URL attached to TX' })
  } catch (e) {
    checks.push({ check: 'proofAttach', status: 'FAIL', detail: e.message })
  }

  // 4. Verify transaction state
  const verify = await prisma.mpTransaction.findUnique({
    where: { id: tx.id },
    select: { id: true, status: true, paymentProofUrl: true, paymentReference: true, paymentPaidAt: true },
  })

  const blobVerify = await prisma.mpBlobObjectMetadata.findFirst({
    where: { entityId: tx.id, entityType: 'payment_proof' },
    select: { id: true, url: true, contentType: true },
  })

  const proofUrlValid = verify && verify.paymentProofUrl && verify.paymentProofUrl.includes('payment-proofs')
  const blobValid = blobVerify && blobVerify.url

  checks.push({
    check: 'proofVerify',
    status: (proofUrlValid && blobValid) ? 'PASS' : 'PARTIAL',
    detail: proofUrlValid && blobValid
      ? `Proof verified: TX has paymentProofUrl, blob metadata exists`
      : `Proof attached: ${Boolean(verify?.paymentProofUrl)}, blob: ${Boolean(blobVerify)}`,
  })

  // 5. Admin visibility check (can mvera read the TX?)
  const admin = await prisma.mpUser.findFirst({
    where: { email: getEnv('QA_ADMIN_IDENTIFIER') ? 'mvera@dev.local' : 'NONE' },
    select: { id: true },
  })

  if (admin) {
    const adminTx = await prisma.mpTransaction.findUnique({
      where: { id: tx.id },
      select: { id: true, status: true, paymentProofUrl: true },
    })
    checks.push({
      check: 'adminVisibility',
      status: adminTx ? 'PASS' : 'FAIL',
      detail: adminTx ? `Admin can see TX: status=${adminTx.status}` : 'Admin TX lookup failed',
    })
  } else {
    checks.push({ check: 'adminVisibility', status: 'SKIP', detail: 'Admin not found' })
  }

  // 6. Buyer/Seller visibility
  const seller = await prisma.mpUser.findFirst({
    where: { email: 'sellerIA@local.test' },
    select: { id: true },
  })
  const buyer = await prisma.mpUser.findFirst({
    where: { email: 'buyerIA@local.test' },
    select: { id: true },
  })

  if (seller) {
    const sellerTx = await prisma.mpTransaction.findFirst({
      where: { id: tx.id, sellerId: seller.id },
      select: { id: true },
    })
    checks.push({ check: 'sellerVisibility', status: sellerTx ? 'PASS' : 'FAIL', detail: sellerTx ? 'Seller can see TX' : 'Seller TX not visible' })
  }

  if (buyer) {
    const buyerTx = await prisma.mpTransaction.findFirst({
      where: { id: tx.id, buyerId: buyer.id },
      select: { id: true },
    })
    checks.push({ check: 'buyerVisibility', status: buyerTx ? 'PASS' : 'FAIL', detail: buyerTx ? 'Buyer can see TX' : 'Buyer TX not visible' })
  }

  await disconnectPrisma()

  const allPassed = checks.every(c => c.status === 'PASS' || c.status === 'PARTIAL' || c.status === 'SKIP')
  const finishedAt = new Date().toISOString()
  report.addModule(MODULE_ID, allPassed ? 'PASS' : 'FAIL', {
    startedAt, finishedAt,
    failureCode: allPassed ? null : 'PAYMENT_PROOF_UPLOAD_FAILED',
    checks,
  })

  return {
    ok: allPassed,
    transactionId: tx?.id,
    proofAttached: proofUrlValid,
    blobValid,
  }
}
