'use server'

import { getDb } from '@/lib/marketplace/db'
import { getSession } from '@/lib/marketplace/auth'
import type { ActionResult } from '@/lib/validations/marketplace'

// ─── COMMISSION CALCULATOR ────────────────────────────────────────────────────
// SOCIO and SUPER roles are exempt from the 5% platform fee.

function calcFee(amount: number, sellerRole: string) {
  const exempt = sellerRole === 'SOCIO' || sellerRole === 'SUPER'
  const feePercent = exempt ? 0 : 5
  const feeAmount = Math.round(amount * feePercent) / 100
  return {
    platformFeePercent: feePercent,
    platformFeeAmount: feeAmount,
    sellerNetAmount: Math.round((amount - feeAmount) * 100) / 100,
  }
}

// ─── INITIATE PURCHASE ────────────────────────────────────────────────────────
// Creates a transaction in INITIATED state. Buyer selects payment method.
// Valid payment methods: MERCANTIL_C2P | MERCANTIL_PAGO_MOVIL | MERCANTIL_BOTON_PAGO
//                        BINANCE_PAY | ZELLE | CRYPTO_WALLET_MANUAL

export async function initiatePurchase(
  listingId: string,
  paymentMethod: string,
): Promise<ActionResult<{ transactionId: string; idempotencyKey: string }>> {
  const session = await getSession()
  if (!session) return { success: false, message: 'Debes iniciar sesión para comprar' }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    const listing = await db.mpListing.findUnique({
      where: { id: listingId },
      include: { seller: true },
    })

    if (!listing) return { success: false, message: 'Listing no encontrado' }
    if (listing.status !== 'ACTIVE') return { success: false, message: 'Este listing no está disponible' }
    if (listing.sellerId === session.userId) return { success: false, message: 'No puedes comprar tu propio listing' }

    const amount = Number(listing.price)
    const fee = calcFee(amount, listing.seller.role)
    const idempotencyKey = `${session.userId}_${listingId}_${Date.now()}`

    const [tx] = await db.$transaction([
      db.mpTransaction.create({
        data: {
          idempotencyKey,
          buyerId: session.userId,
          sellerId: listing.sellerId,
          listingId,
          paymentMethod,
          status: 'INITIATED',
          amount: String(amount),
          currency: listing.currency,
          platformFeePercent: String(fee.platformFeePercent),
          platformFeeAmount: String(fee.platformFeeAmount),
          sellerNetAmount: String(fee.sellerNetAmount),
        },
        select: { id: true },
      }),
      db.mpListing.update({
        where: { id: listingId },
        data: { status: 'SOLD_OUT' },
      }),
    ])

    await db.mpTransactionStatusHistory.create({
      data: {
        transactionId: tx.id,
        toStatus: 'INITIATED',
        changedBy: session.userId,
        reason: 'Compra iniciada por el comprador',
      },
    })

    await db.$disconnect()
    return { success: true, data: { transactionId: tx.id, idempotencyKey }, message: 'Transacción iniciada' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error al iniciar transacción' }
  }
}

// ─── SUBMIT PAYMENT PROOF ─────────────────────────────────────────────────────
// Buyer submits payment reference / proof screenshot URL.
// Moves INITIATED or PENDING_PAYMENT → PAYMENT_RECEIVED.

export async function submitPaymentProof(
  transactionId: string,
  reference: string,
  proofUrl?: string,
): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, message: 'No autenticado' }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    const tx = await db.mpTransaction.findUnique({ where: { id: transactionId } })
    if (!tx) return { success: false, message: 'Transacción no encontrada' }
    if (tx.buyerId !== session.userId) return { success: false, message: 'Sin permiso' }
    if (tx.status !== 'INITIATED' && tx.status !== 'PENDING_PAYMENT') {
      return { success: false, message: `Estado inválido para enviar comprobante: ${tx.status}` }
    }

    await db.mpTransaction.update({
      where: { id: transactionId },
      data: { status: 'PAYMENT_RECEIVED', paymentReference: reference, paymentProofUrl: proofUrl ?? null },
    })

    await db.mpTransactionStatusHistory.create({
      data: {
        transactionId,
        fromStatus: tx.status,
        toStatus: 'PAYMENT_RECEIVED',
        changedBy: session.userId,
        reason: `Comprobante enviado. Referencia: ${reference}`,
      },
    })

    await db.$disconnect()
    return { success: true, data: undefined, message: 'Comprobante registrado. El equipo revisará el pago.' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

// ─── VALIDATE PAYMENT (ADMIN ONLY) ───────────────────────────────────────────
// Admin reviews the payment proof and approves or rejects.
// Approved → IN_ESCROW (T+7 release date set). Rejected → PAYMENT_FAILED.

export async function validatePayment(
  transactionId: string,
  approved: boolean,
  adminNotes?: string,
): Promise<ActionResult> {
  const session = await getSession()
  if (!session || session.role !== 'SUPER') {
    return { success: false, message: 'Solo administradores pueden validar pagos' }
  }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    const tx = await db.mpTransaction.findUnique({ where: { id: transactionId } })
    if (!tx) return { success: false, message: 'Transacción no encontrada' }
    if (tx.status !== 'PAYMENT_RECEIVED' && tx.status !== 'VALIDATING') {
      return { success: false, message: `Estado inválido para validar: ${tx.status}` }
    }

    const toStatus = approved ? 'IN_ESCROW' : 'PAYMENT_FAILED'
    const now = new Date()

    await db.mpTransaction.update({
      where: { id: transactionId },
      data: {
        status: toStatus,
        adminNotes: adminNotes ?? null,
        ...(approved
          ? {
              escrowHeldAt: now,
              escrowReleaseAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // T+7
            }
          : {}),
      },
    })

    await db.mpTransactionStatusHistory.create({
      data: {
        transactionId,
        fromStatus: tx.status,
        toStatus,
        changedBy: session.userId,
        reason: approved ? 'Pago aprobado por admin' : `Pago rechazado: ${adminNotes ?? ''}`,
      },
    })

    await db.$disconnect()
    return {
      success: true,
      data: undefined,
      message: approved ? 'Pago aprobado. Fondos en escrow hasta confirmación de entrega.' : 'Pago rechazado.',
    }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

// ─── CONFIRM DELIVERY (BUYER) ─────────────────────────────────────────────────
// Buyer confirms they received the product/service.
// Moves IN_ESCROW → RELEASED immediately (funds go to seller).

export async function confirmDelivery(transactionId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, message: 'No autenticado' }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    const tx = await db.mpTransaction.findUnique({ where: { id: transactionId } })
    if (!tx) return { success: false, message: 'Transacción no encontrada' }
    if (tx.buyerId !== session.userId) return { success: false, message: 'Solo el comprador puede confirmar la entrega' }
    if (tx.status !== 'IN_ESCROW') {
      return { success: false, message: `No se puede confirmar desde el estado: ${tx.status}` }
    }

    const now = new Date()
    await db.mpTransaction.update({
      where: { id: transactionId },
      data: { status: 'RELEASED', buyerConfirmedAt: now, releasedAt: now },
    })

    // Two-hop history: IN_ESCROW → DELIVERY_CONFIRMED → RELEASED
    await db.mpTransactionStatusHistory.create({
      data: {
        transactionId,
        fromStatus: 'IN_ESCROW',
        toStatus: 'DELIVERY_CONFIRMED',
        changedBy: session.userId,
        reason: 'Comprador confirmó la entrega',
      },
    })
    await db.mpTransactionStatusHistory.create({
      data: {
        transactionId,
        fromStatus: 'DELIVERY_CONFIRMED',
        toStatus: 'RELEASED',
        changedBy: 'SYSTEM',
        reason: 'Fondos liberados automáticamente al confirmar entrega',
      },
    })

    await db.$disconnect()
    return { success: true, data: undefined, message: 'Entrega confirmada. Los fondos fueron liberados al vendedor.' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

// ─── RELEASE ESCROW (ADMIN / T+7 SYSTEM) ─────────────────────────────────────
// Manual release by admin, or called by a cron job after T+7 auto-release window.
// Valid from IN_ESCROW or DELIVERY_CONFIRMED.

export async function releaseEscrow(transactionId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session || session.role !== 'SUPER') {
    return { success: false, message: 'Solo administradores pueden liberar el escrow manualmente' }
  }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    const tx = await db.mpTransaction.findUnique({ where: { id: transactionId } })
    if (!tx) return { success: false, message: 'Transacción no encontrada' }
    if (tx.status !== 'IN_ESCROW' && tx.status !== 'DELIVERY_CONFIRMED') {
      return { success: false, message: `No se puede liberar desde el estado: ${tx.status}` }
    }

    const now = new Date()
    await db.mpTransaction.update({
      where: { id: transactionId },
      data: { status: 'RELEASED', releasedAt: now },
    })

    await db.mpTransactionStatusHistory.create({
      data: {
        transactionId,
        fromStatus: tx.status,
        toStatus: 'RELEASED',
        changedBy: session.userId,
        reason: 'Escrow liberado manualmente (T+7 o admin)',
      },
    })

    await db.$disconnect()
    return { success: true, data: undefined, message: 'Escrow liberado. Fondos transferidos al vendedor.' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

// ─── OPEN DISPUTE ─────────────────────────────────────────────────────────────
// Either buyer or seller can open a dispute while funds are IN_ESCROW.

export async function openDispute(
  transactionId: string,
  reason: string,
  description: string,
): Promise<ActionResult<{ disputeId: string }>> {
  const session = await getSession()
  if (!session) return { success: false, message: 'No autenticado' }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    const tx = await db.mpTransaction.findUnique({ where: { id: transactionId } })
    if (!tx) return { success: false, message: 'Transacción no encontrada' }

    const isParticipant = tx.buyerId === session.userId || tx.sellerId === session.userId
    if (!isParticipant) return { success: false, message: 'Sin permiso para disputar esta transacción' }
    if (tx.status !== 'IN_ESCROW' && tx.status !== 'DELIVERY_CONFIRMED') {
      return { success: false, message: `No se puede disputar desde el estado: ${tx.status}` }
    }

    const dispute = await db.mpDispute.create({
      data: { transactionId, openedById: session.userId, reason, description, status: 'OPEN' },
      select: { id: true },
    })

    await db.mpTransaction.update({
      where: { id: transactionId },
      data: { status: 'DISPUTED', disputeReason: reason, disputeOpenedAt: new Date() },
    })

    await db.mpTransactionStatusHistory.create({
      data: {
        transactionId,
        fromStatus: tx.status,
        toStatus: 'DISPUTED',
        changedBy: session.userId,
        reason: `Disputa abierta: ${reason}`,
      },
    })

    await db.$disconnect()
    return { success: true, data: { disputeId: dispute.id }, message: 'Disputa abierta. El equipo revisará el caso en 24–48 h.' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

// ─── RESOLVE DISPUTE (ADMIN ONLY) ────────────────────────────────────────────
// Admin resolves a dispute in favor of buyer (REFUNDED) or seller (RELEASED).

export async function resolveDispute(
  disputeId: string,
  inFavorOf: 'buyer' | 'seller',
  resolution: string,
  refundAmount?: number,
): Promise<ActionResult> {
  const session = await getSession()
  if (!session || session.role !== 'SUPER') {
    return { success: false, message: 'Solo administradores pueden resolver disputas' }
  }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    const dispute = await db.mpDispute.findUnique({ where: { id: disputeId } })
    if (!dispute) return { success: false, message: 'Disputa no encontrada' }

    const disputeStatus = inFavorOf === 'buyer' ? 'RESOLVED_BUYER' : 'RESOLVED_SELLER'
    const txStatus = inFavorOf === 'buyer' ? 'REFUNDED' : 'RELEASED'
    const now = new Date()

    await db.mpDispute.update({
      where: { id: disputeId },
      data: {
        status: disputeStatus,
        resolution,
        resolvedAt: now,
        refundAmount: refundAmount != null ? String(refundAmount) : null,
      },
    })

    await db.mpTransaction.update({
      where: { id: dispute.transactionId },
      data: {
        status: txStatus,
        ...(inFavorOf === 'seller' ? { releasedAt: now } : {}),
      },
    })

    await db.mpTransactionStatusHistory.create({
      data: {
        transactionId: dispute.transactionId,
        fromStatus: 'DISPUTED',
        toStatus: txStatus,
        changedBy: session.userId,
        reason: `Disputa resuelta a favor del ${inFavorOf === 'buyer' ? 'comprador' : 'vendedor'}: ${resolution}`,
      },
    })

    await db.$disconnect()
    return {
      success: true,
      data: undefined,
      message: `Disputa resuelta a favor del ${inFavorOf === 'buyer' ? 'comprador' : 'vendedor'}.`,
    }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

// ─── CANCEL TRANSACTION ───────────────────────────────────────────────────────
// Buyer, seller, or admin can cancel before funds are RELEASED.

export async function cancelTransaction(
  transactionId: string,
  reason?: string,
): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, message: 'No autenticado' }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    const tx = await db.mpTransaction.findUnique({ where: { id: transactionId } })
    if (!tx) return { success: false, message: 'Transacción no encontrada' }

    const isParticipant = tx.buyerId === session.userId || tx.sellerId === session.userId
    const isAdmin = session.role === 'SUPER'
    if (!isParticipant && !isAdmin) return { success: false, message: 'Sin permiso' }

    const nonCancellable = ['RELEASED', 'REFUNDED', 'CANCELLED']
    if (nonCancellable.includes(tx.status)) {
      return { success: false, message: `No se puede cancelar desde el estado: ${tx.status}` }
    }

    await db.mpTransaction.update({ where: { id: transactionId }, data: { status: 'CANCELLED' } })

    await db.mpTransactionStatusHistory.create({
      data: {
        transactionId,
        fromStatus: tx.status,
        toStatus: 'CANCELLED',
        changedBy: session.userId,
        reason: reason ?? 'Cancelado por el usuario',
      },
    })

    await db.$disconnect()
    return { success: true, data: undefined, message: 'Transacción cancelada.' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

// ─── GET TRANSACTION ──────────────────────────────────────────────────────────
// Returns full transaction with buyer, seller, listing, status history and disputes.

export async function getTransaction(transactionId: string): Promise<ActionResult<object>> {
  const session = await getSession()
  if (!session) return { success: false, message: 'No autenticado' }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    const tx = await db.mpTransaction.findUnique({
      where: { id: transactionId },
      include: {
        buyer: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
        seller: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
        listing: { select: { id: true, title: true, slug: true, coverImageUrl: true, price: true, currency: true } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        disputes: true,
      },
    })

    if (!tx) return { success: false, message: 'Transacción no encontrada' }

    const isParticipant = tx.buyerId === session.userId || tx.sellerId === session.userId
    const isAdmin = session.role === 'SUPER'
    if (!isParticipant && !isAdmin) return { success: false, message: 'Sin permiso' }

    await db.$disconnect()
    return { success: true, data: tx, message: 'OK' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

// ─── GET MY TRANSACTIONS ──────────────────────────────────────────────────────

export async function getMyTransactions(
  role: 'buyer' | 'seller' | 'all' = 'all',
): Promise<ActionResult<object[]>> {
  const session = await getSession()
  if (!session) return { success: false, message: 'No autenticado' }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    const where =
      role === 'buyer'
        ? { buyerId: session.userId }
        : role === 'seller'
        ? { sellerId: session.userId }
        : { OR: [{ buyerId: session.userId }, { sellerId: session.userId }] }

    const txs = await db.mpTransaction.findMany({
      where,
      include: {
        buyer: { select: { id: true, displayName: true, avatarUrl: true } },
        seller: { select: { id: true, displayName: true, avatarUrl: true } },
        listing: { select: { id: true, title: true, slug: true, coverImageUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    await db.$disconnect()
    return { success: true, data: txs, message: 'OK' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
  }
}
