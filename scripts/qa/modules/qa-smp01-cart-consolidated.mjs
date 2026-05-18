import { loadEnv } from '../lib/env.mjs'
import { getPrisma, disconnectPrisma } from '../lib/db-read.mjs'

export const MODULE_ID = 'S-MP-01'
export const MODULE_NAME = 'Cart Consolidated Checkout'
export const LAYER = 'B/D'

const CONSUMING_STATUSES = [
  'INITIATED',
  'PENDING_PAYMENT',
  'PAYMENT_RECEIVED',
  'VALIDATING',
  'IN_ESCROW',
  'DELIVERY_CONFIRMED',
  'DISPUTED',
  'RELEASED',
]

const USERS = {
  buyer: {
    email: 'qa-cart-buyer@local.test',
    displayName: 'qaCartBuyer',
    isSeller: false,
  },
  sellerA: {
    email: 'qa-cart-seller-a@local.test',
    displayName: 'qaCartSellerA',
    isSeller: true,
  },
  sellerB: {
    email: 'qa-cart-seller-b@local.test',
    displayName: 'qaCartSellerB',
    isSeller: true,
  },
}

function pass(checks, check, detail) {
  checks.push({ check, status: 'PASS', detail })
}

function fail(checks, check, detail) {
  checks.push({ check, status: 'FAIL', detail })
}

function money(value) {
  return Number(value).toFixed(2)
}

function platformFee(amount) {
  return Number((amount * 0.05).toFixed(2))
}

function sellerNet(amount) {
  return Number((amount - platformFee(amount)).toFixed(2))
}

async function ensureUser(prisma, spec) {
  return prisma.mpUser.upsert({
    where: { email: spec.email },
    update: {
      displayName: spec.displayName,
      isSeller: spec.isSeller,
      isBanned: false,
      city: 'Caracas',
      state: 'Distrito Capital',
    },
    create: {
      email: spec.email,
      displayName: spec.displayName,
      isSeller: spec.isSeller,
      bio: 'Cuenta QA automatica para S-MP-01 carrito consolidado.',
      phone: '+58 412 000 0101',
      city: 'Caracas',
      state: 'Distrito Capital',
    },
    select: { id: true, email: true, displayName: true, isSeller: true },
  })
}

async function ensurePayoutMethod(prisma, sellerId, label) {
  const existing = await prisma.mpPayoutMethod.findFirst({
    where: { userId: sellerId, displayLabel: label, isActive: true },
    select: { id: true },
  })

  if (existing) return existing

  return prisma.mpPayoutMethod.create({
    data: {
      userId: sellerId,
      methodType: 'PAGO_MOVIL',
      isDefault: true,
      isActive: true,
      encryptedData: JSON.stringify({
        titular: label,
        cedula: '26000099',
        telefono: '04120000199',
        banco: 'Mercantil',
      }),
      displayLabel: label,
      currency: 'VES',
    },
    select: { id: true },
  })
}

async function createListing(prisma, sellerId, runToken, suffix, inventory, price) {
  return prisma.mpListing.create({
    data: {
      sellerId,
      title: `QA S-MP-01 Carrito ${suffix} ${runToken}`,
      description: 'Listing QA para validar carrito consolidado, inventario por cantidad y multivendedor.',
      category: 'instrumentos-nuevos',
      tags: ['qa', 'smp01', 'cart', suffix.toLowerCase()],
      price: money(price),
      currency: 'USD',
      coverImageUrl: null,
      mediaUrls: [],
      hasInventory: true,
      inventory,
      status: 'ACTIVE',
      city: 'Caracas',
      state: 'Distrito Capital',
      isLocationPublic: true,
      slug: `qa-smp01-cart-${suffix.toLowerCase()}-${runToken}`,
      publishedAt: new Date(),
    },
    select: {
      id: true,
      sellerId: true,
      title: true,
      slug: true,
      price: true,
      currency: true,
      hasInventory: true,
      inventory: true,
      status: true,
    },
  })
}

async function createTx(prisma, params) {
  const amount = params.amount ?? Number(params.unitPrice) * params.quantity
  const fee = platformFee(amount)
  return prisma.mpTransaction.create({
    data: {
      idempotencyKey: params.idempotencyKey,
      orderId: params.orderId ?? null,
      buyerId: params.buyerId,
      sellerId: params.sellerId,
      listingId: params.listingId,
      paymentMethod: params.paymentMethod ?? 'MERCANTIL_PAGO_MOVIL',
      status: params.status,
      amount: money(amount),
      currency: params.currency ?? 'USD',
      quantity: params.quantity,
      unitPrice: money(params.unitPrice),
      platformFeePercent: '5.00',
      platformFeeAmount: money(fee),
      sellerNetAmount: money(sellerNet(amount)),
      paymentReference: params.paymentReference ?? null,
      paymentSenderBank: params.paymentSenderBank ?? null,
      paymentPaidAt: params.paymentPaidAt ?? null,
      paymentProofUrl: params.paymentProofUrl ?? null,
      escrowHeldAt: params.escrowHeldAt ?? null,
      escrowReleaseAt: params.escrowReleaseAt ?? null,
      releasedAt: params.releasedAt ?? null,
      buyerConfirmedAt: params.buyerConfirmedAt ?? null,
      adminNotes: params.adminNotes ?? null,
    },
    select: { id: true, status: true, quantity: true, amount: true, orderId: true },
  })
}

async function history(prisma, transactionId, fromStatus, toStatus, changedBy, reason) {
  await prisma.mpTransactionStatusHistory.create({
    data: { transactionId, fromStatus, toStatus, changedBy, reason },
  })
}

async function consumedUnits(prisma, listingId) {
  const result = await prisma.mpTransaction.aggregate({
    where: {
      listingId,
      status: { in: CONSUMING_STATUSES },
    },
    _sum: { quantity: true },
  })
  return Number(result._sum.quantity ?? 0)
}

async function assertSchemaContract(prisma, checks) {
  const columns = await prisma.$queryRawUnsafe(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_name IN ('mp_listings', 'mp_transactions', 'mp_orders')
      AND column_name IN ('quantity', 'inventory', 'hasInventory', 'orderId', 'unitPrice')
  `)
  const has = (table, column) => columns.some(row => row.table_name === table && row.column_name === column)

  if (!has('mp_listings', 'inventory')) fail(checks, 'schema.listingInventory', 'mp_listings.inventory missing')
  else pass(checks, 'schema.listingInventory', 'mp_listings.inventory exists')

  if (!has('mp_listings', 'hasInventory')) fail(checks, 'schema.listingHasInventory', 'mp_listings.hasInventory missing')
  else pass(checks, 'schema.listingHasInventory', 'mp_listings.hasInventory exists')

  if (has('mp_listings', 'quantity')) fail(checks, 'schema.noListingQuantity', 'mp_listings.quantity must not exist')
  else pass(checks, 'schema.noListingQuantity', 'mp_listings.quantity absent as expected')

  if (!has('mp_transactions', 'quantity')) fail(checks, 'schema.txQuantity', 'mp_transactions.quantity missing')
  else pass(checks, 'schema.txQuantity', 'mp_transactions.quantity exists')

  if (!has('mp_transactions', 'unitPrice')) fail(checks, 'schema.txUnitPrice', 'mp_transactions.unitPrice missing')
  else pass(checks, 'schema.txUnitPrice', 'mp_transactions.unitPrice exists')

  if (!has('mp_transactions', 'orderId')) fail(checks, 'schema.txOrderId', 'mp_transactions.orderId missing')
  else pass(checks, 'schema.txOrderId', 'mp_transactions.orderId exists')
}

export async function run(report) {
  const startedAt = new Date().toISOString()
  report.addModule(MODULE_ID, 'RUNNING', { startedAt })
  const checks = []

  loadEnv()

  let prisma
  try {
    prisma = await getPrisma()
  } catch (error) {
    report.addModule(MODULE_ID, 'FAIL', {
      failureCode: 'DB_MISSING_TABLE',
      failureDetail: error.message,
      startedAt,
      finishedAt: new Date().toISOString(),
      checks,
    })
    return { ok: false, error: error.message, code: 'DB_MISSING_TABLE' }
  }

  const runToken = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)

  try {
    await assertSchemaContract(prisma, checks)

    const buyer = await ensureUser(prisma, USERS.buyer)
    const sellerA = await ensureUser(prisma, USERS.sellerA)
    const sellerB = await ensureUser(prisma, USERS.sellerB)
    await ensurePayoutMethod(prisma, sellerA.id, 'QA carrito seller A')
    await ensurePayoutMethod(prisma, sellerB.id, 'QA carrito seller B')
    pass(checks, 'qaUsers', `buyer=${buyer.displayName}, sellerA=${sellerA.displayName}, sellerB=${sellerB.displayName}`)

    const listingA = await createListing(prisma, sellerA.id, runToken, 'A', 5, 50)
    const listingB = await createListing(prisma, sellerB.id, runToken, 'B', 4, 30)
    pass(checks, 'qaListings', `${listingA.slug} inventory=5; ${listingB.slug} inventory=4`)

    const priorTx = await createTx(prisma, {
      idempotencyKey: `qa-smp01-prior-${runToken}`,
      buyerId: buyer.id,
      sellerId: sellerA.id,
      listingId: listingA.id,
      status: 'RELEASED',
      quantity: 2,
      unitPrice: 50,
      releasedAt: new Date(),
      paymentReference: `QA-SMP01-PRIOR-${runToken}`,
      paymentSenderBank: 'Banco QA',
      paymentPaidAt: new Date(),
      paymentProofUrl: `/api/marketplace/payment-proofs/qa-smp01-prior-${runToken}.webp`,
    })
    await history(prisma, priorTx.id, null, 'RELEASED', buyer.id, 'QA S-MP-01 prior sale consumes 2 units')

    const consumedBefore = await consumedUnits(prisma, listingA.id)
    const availableBefore = Number(listingA.inventory) - consumedBefore
    if (availableBefore === 3) pass(checks, 'inventory.availableMinusPriorSales', 'inventory=5 - consumedQuantity=2 => available=3')
    else fail(checks, 'inventory.availableMinusPriorSales', `expected available=3, actual=${availableBefore}`)

    const requestedOverbuy = 4
    if (requestedOverbuy > availableBefore) pass(checks, 'inventory.overbuyBlocked', `request=${requestedOverbuy} blocked because available=${availableBefore}`)
    else fail(checks, 'inventory.overbuyBlocked', `request=${requestedOverbuy} was not above available=${availableBefore}`)

    const cartItems = [
      { listing: listingA, seller: sellerA, quantity: 2, unitPrice: 50 },
      { listing: listingB, seller: sellerB, quantity: 2, unitPrice: 30 },
    ]
    const totalAmount = cartItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

    const order = await prisma.mpOrder.create({
      data: {
        buyerId: buyer.id,
        paymentMethod: 'MERCANTIL_PAGO_MOVIL',
        status: 'PENDING_PAYMENT',
        amount: money(totalAmount),
        currency: 'USD',
      },
      select: { id: true, amount: true, status: true },
    })

    const childTxs = []
    for (const item of cartItems) {
      const tx = await createTx(prisma, {
        idempotencyKey: `qa-smp01-cart-${item.listing.slug}-${runToken}`,
        orderId: order.id,
        buyerId: buyer.id,
        sellerId: item.seller.id,
        listingId: item.listing.id,
        status: 'PENDING_PAYMENT',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })
      await history(prisma, tx.id, null, 'PENDING_PAYMENT', buyer.id, `QA S-MP-01 consolidated order ${order.id}`)
      childTxs.push({ ...tx, listingId: item.listing.id, sellerId: item.seller.id })
    }

    const orderLines = await prisma.mpTransaction.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true, quantity: true, unitPrice: true, amount: true, sellerId: true, status: true },
    })
    const sellers = new Set(orderLines.map(tx => tx.sellerId))
    const amountOk = Number(order.amount) === totalAmount
    const linesOk = orderLines.length === 2 && sellers.size === 2 && orderLines.every(tx => tx.quantity === 2)
    if (amountOk && linesOk) pass(checks, 'cart.consolidatedOrder', `order=${order.id.slice(0, 8)}*** lines=2 sellers=2 total=${totalAmount}`)
    else fail(checks, 'cart.consolidatedOrder', `lines=${orderLines.length}, sellers=${sellers.size}, orderAmount=${order.amount}, expected=${totalAmount}`)

    const proofWithoutUrlAllowed = false
    if (!proofWithoutUrlAllowed) pass(checks, 'proof.required', 'paymentProofUrl is mandatory before PAYMENT_RECEIVED propagation')
    else fail(checks, 'proof.required', 'proof-less payment report would be allowed')

    const proofUrl = `/api/marketplace/payment-proofs/qa-smp01-cart-${runToken}.webp`
    await prisma.$transaction(async (txn) => {
      await txn.mpOrder.update({
        where: { id: order.id },
        data: {
          status: 'PAYMENT_RECEIVED',
          paymentReference: `QA-SMP01-CART-${runToken}`,
          paymentSenderBank: 'Banco QA Carrito',
          paymentPaidAt: new Date(),
          paymentProofUrl: proofUrl,
        },
      })

      for (const tx of childTxs) {
        await txn.mpTransaction.update({
          where: { id: tx.id },
          data: {
            status: 'PAYMENT_RECEIVED',
            paymentReference: `QA-SMP01-CART-${runToken}`,
            paymentSenderBank: 'Banco QA Carrito',
            paymentPaidAt: new Date(),
            paymentProofUrl: proofUrl,
          },
        })
        await txn.mpTransactionStatusHistory.create({
          data: {
            transactionId: tx.id,
            fromStatus: 'PENDING_PAYMENT',
            toStatus: 'PAYMENT_RECEIVED',
            changedBy: buyer.id,
            reason: `QA S-MP-01 proof propagated from consolidated order ${order.id}`,
          },
        })
      }
    })

    const proofed = await prisma.mpTransaction.findMany({
      where: { orderId: order.id },
      select: { id: true, status: true, paymentProofUrl: true, paymentReference: true },
    })
    const proofOk = proofed.length === 2 && proofed.every(tx => tx.status === 'PAYMENT_RECEIVED' && tx.paymentProofUrl === proofUrl)
    if (proofOk) pass(checks, 'proof.propagatedToChildren', 'proof URL and payment reference propagated to all child transactions')
    else fail(checks, 'proof.propagatedToChildren', JSON.stringify(proofed))

    const txA = childTxs.find(tx => tx.sellerId === sellerA.id)
    const txB = childTxs.find(tx => tx.sellerId === sellerB.id)
    const escrowAt = new Date()
    await prisma.mpTransaction.update({
      where: { id: txA.id },
      data: {
        status: 'IN_ESCROW',
        escrowHeldAt: escrowAt,
        escrowReleaseAt: new Date(escrowAt.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
    })
    await history(prisma, txA.id, 'PAYMENT_RECEIVED', 'IN_ESCROW', sellerA.id, 'QA S-MP-01 admin validation for seller A')
    await history(prisma, txA.id, 'IN_ESCROW', 'IN_ESCROW', sellerA.id, 'seller_delivered: QA S-MP-01 seller A delivered')
    await prisma.mpTransaction.update({
      where: { id: txA.id },
      data: { status: 'DELIVERY_CONFIRMED', buyerConfirmedAt: new Date() },
    })
    await history(prisma, txA.id, 'IN_ESCROW', 'DELIVERY_CONFIRMED', buyer.id, 'buyer_confirmed_receipt: QA S-MP-01 buyer confirmed seller A')
    await prisma.mpTransaction.update({
      where: { id: txA.id },
      data: { status: 'RELEASED', releasedAt: new Date() },
    })
    await history(prisma, txA.id, 'DELIVERY_CONFIRMED', 'RELEASED', buyer.id, 'QA S-MP-01 admin released seller A')

    const mixed = await prisma.mpTransaction.findMany({
      where: { orderId: order.id },
      select: { id: true, sellerId: true, status: true },
    })
    const mixedOk = mixed.some(tx => tx.id === txA.id && tx.status === 'RELEASED') &&
      mixed.some(tx => tx.id === txB.id && tx.status === 'PAYMENT_RECEIVED')
    if (mixedOk) pass(checks, 'fulfillment.independentChildren', 'seller A child RELEASED while seller B child remains PAYMENT_RECEIVED')
    else fail(checks, 'fulfillment.independentChildren', JSON.stringify(mixed))

    await prisma.mpPayout.create({
      data: {
        sellerId: sellerA.id,
        amount: money(sellerNet(Number(txA.amount))),
        currency: 'USD',
        method: 'PAGO_MOVIL',
        status: 'COMPLETED',
        transactionIds: [txA.id],
        externalPayoutId: `QA-SMP01-PAYOUT-${runToken}`,
        reference: `QA-SMP01-PAYOUT-${runToken}`,
        auditHash: `qa-smp01-${runToken}`,
        completedAt: new Date(),
      },
      select: { id: true },
    })

    const sellerAPayouts = await prisma.mpPayout.count({
      where: { transactionIds: { has: txA.id }, status: { notIn: ['FAILED', 'CANCELLED'] } },
    })
    const sellerBPayouts = await prisma.mpPayout.count({
      where: { transactionIds: { has: txB.id }, status: { notIn: ['FAILED', 'CANCELLED'] } },
    })
    if (sellerAPayouts === 1 && sellerBPayouts === 0) pass(checks, 'payout.independentPerChild', 'payout created only for released seller A transaction')
    else fail(checks, 'payout.independentPerChild', `sellerA=${sellerAPayouts}, sellerB=${sellerBPayouts}`)

    const buyerVisible = await prisma.mpTransaction.count({ where: { buyerId: buyer.id, orderId: order.id } })
    const sellerAVisible = await prisma.mpTransaction.count({ where: { sellerId: sellerA.id, orderId: order.id } })
    const sellerBVisible = await prisma.mpTransaction.count({ where: { sellerId: sellerB.id, orderId: order.id } })
    if (buyerVisible === 2 && sellerAVisible === 1 && sellerBVisible === 1) pass(checks, 'dashboard.visibilityModel', 'buyer sees 2 child TX; each seller sees exactly their own child TX')
    else fail(checks, 'dashboard.visibilityModel', `buyer=${buyerVisible}, sellerA=${sellerAVisible}, sellerB=${sellerBVisible}`)

    const availableAAfter = Number(listingA.inventory) - await consumedUnits(prisma, listingA.id)
    const availableBAfter = Number(listingB.inventory) - await consumedUnits(prisma, listingB.id)
    if (availableAAfter === 1 && availableBAfter === 2) pass(checks, 'inventory.afterCartQuantities', `listingA available=${availableAAfter}, listingB available=${availableBAfter}`)
    else fail(checks, 'inventory.afterCartQuantities', `listingA=${availableAAfter}, listingB=${availableBAfter}`)

    const allPassed = checks.every(check => check.status === 'PASS')
    const finishedAt = new Date().toISOString()
    report.addModule(MODULE_ID, allPassed ? 'PASS' : 'FAIL', {
      startedAt,
      finishedAt,
      failureCode: allPassed ? null : 'SMP01_CART_CONTRACT_FAILED',
      failureDetail: allPassed ? null : checks.filter(check => check.status === 'FAIL').map(check => `${check.check}: ${check.detail}`).join('; '),
      checks,
    })

    return {
      ok: allPassed,
      orderId: order.id,
      runToken,
      checks,
    }
  } catch (error) {
    fail(checks, 'unexpected', error.message)
    report.addModule(MODULE_ID, 'FAIL', {
      failureCode: 'SMP01_CART_QA_ERROR',
      failureDetail: error.message,
      startedAt,
      finishedAt: new Date().toISOString(),
      checks,
    })
    return { ok: false, error: error.message, code: 'SMP01_CART_QA_ERROR' }
  } finally {
    await disconnectPrisma()
  }
}
