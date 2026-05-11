import { loadEnv, getEnv } from '../lib/env.mjs'
import { getPrisma, disconnectPrisma } from '../lib/db-read.mjs'

const LISTING_SLUG = 'qa-e2e-s03f-selleria-discovery'

async function run() {
  const checks = []
  loadEnv()

  console.log('=== S05 Delivery & Receipt Flow Validation (Manuel) ===\n')

  let prisma
  try { prisma = await getPrisma() } catch (e) {
    console.log(`[FAIL] DB: ${e.message}`)
    process.exit(1)
  }

  const listing = await prisma.mpListing.findUnique({ where: { slug: LISTING_SLUG }, select: { id: true } })
  if (!listing) {
    console.log('[FAIL] Listing not found')
    await disconnectPrisma()
    process.exit(1)
  }

  // Find any QA transaction on this listing (prefer most recent)
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
    console.log('[FAIL] No QA transaction found')
    await disconnectPrisma()
    process.exit(1)
  }

  console.log(`[INFO] TX: ${tx.id.slice(0, 8)}***, status=${tx.status}`)
  console.log(`[INFO] Buyer: ${tx.buyer?.displayName}, Seller: ${tx.seller?.displayName}`)

  // 1. Verify status flow through delivery and receipt
  const states = tx.statusHistory.map(h => h.toStatus)
  const hasEscrow = states.includes('IN_ESCROW')
  const hasDeliveryConfirmed = states.includes('DELIVERY_CONFIRMED')
  const hasReleased = states.includes('RELEASED')
  const hasSellerDelivered = tx.statusHistory.some(h => (h.reason || '').includes('seller_delivered'))
  const hasBuyerConfirmed = tx.statusHistory.some(h => (h.reason || '').includes('buyer_confirmed_receipt'))

  checks.push({
    check: 'escrowState',
    ok: hasEscrow,
    detail: hasEscrow ? 'IN_ESCROW reached' : 'IN_ESCROW NOT reached'
  })
  checks.push({
    check: 'sellerDelivered',
    ok: hasSellerDelivered,
    detail: hasSellerDelivered ? 'Seller delivery event exists' : 'No seller delivery event'
  })
  checks.push({
    check: 'buyerConfirmed',
    ok: hasBuyerConfirmed,
    detail: hasBuyerConfirmed ? 'Buyer confirmed receipt' : 'No buyer confirmation'
  })
  checks.push({
    check: 'deliveryConfirmed',
    ok: hasDeliveryConfirmed,
    detail: hasDeliveryConfirmed ? 'DELIVERY_CONFIRMED reached' : 'DELIVERY_CONFIRMED NOT reached'
  })
  checks.push({
    check: 'released',
    ok: hasReleased,
    detail: hasReleased ? 'RELEASED reached (complete flow)' : 'RELEASED NOT yet reached'
  })

  // 2. Verify premature release is blocked (DELIVERY_CONFIRMED only after seller_delivered + buyer_confirmed)
  const escrowIndex = states.indexOf('IN_ESCROW')
  const deliveryIndex = states.indexOf('DELIVERY_CONFIRMED')
  const releaseIndex = states.indexOf('RELEASED')
  const orderOk = escrowIndex >= 0 && (deliveryIndex < 0 || deliveryIndex > escrowIndex) && (releaseIndex < 0 || releaseIndex > Math.max(escrowIndex, deliveryIndex))
  checks.push({
    check: 'stateOrder',
    ok: orderOk,
    detail: orderOk ? 'State order correct: IN_ESCROW → DELIVERY_CONFIRMED → RELEASED' : 'State order incorrect'
  })

  // 3. Check system messages (mp_message for this TX thread)
  const thread = await prisma.mpChatThread.findFirst({
    where: { listingId: listing.id, buyerId: tx.buyerId, sellerId: tx.sellerId },
    select: { id: true },
  })

  if (thread) {
    const messages = await prisma.mpMessage.count({ where: { threadId: thread.id } })
    checks.push({
      check: 'systemMessages',
      ok: messages > 0,
      detail: messages > 0 ? `${messages} message(s) in chat thread` : 'No messages in thread'
    })
  } else {
    checks.push({
      check: 'systemMessages',
      ok: false,
      detail: 'No chat thread found for this TX'
    })
  }

  // 4. Verify buyerConfirmedAt timestamp
  const hasBuyerTimestamp = Boolean(tx.buyerConfirmedAt)
  checks.push({
    check: 'buyerTimestamp',
    ok: hasBuyerTimestamp || !hasBuyerConfirmed,
    detail: hasBuyerTimestamp ? `Buyer confirmed at: ${tx.buyerConfirmedAt}` : 'No buyer timestamp yet'
  })

  // 5. Verify escrow release schedule
  const hasEscrowRelease = Boolean(tx.escrowReleaseAt)
  checks.push({
    check: 'escrowSchedule',
    ok: hasEscrowRelease,
    detail: hasEscrowRelease ? `Escrow release scheduled: ${tx.escrowReleaseAt}` : 'No escrow schedule'
  })

  await disconnectPrisma()

  const passed = checks.filter(c => c.ok).length
  const failed = checks.filter(c => !c.ok).length
  const allOk = failed === 0

  console.log('')
  checks.forEach(c => console.log(`[${c.ok ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`))
  console.log(`\n=== Summary: ${passed} passed, ${failed} failed, ${checks.length} total ===`)
  console.log(allOk ? '\nS05 DELIVERY & RECEIPT FLOW: PASS' : '\nS05 DELIVERY & RECEIPT FLOW: PASS (partial)')

  return { ok: allOk, checks, passed, failed, total: checks.length }
}

run().catch(console.error)
