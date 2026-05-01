'use server'

import { getDb } from '@/lib/marketplace/db'
import { getSession } from '@/lib/marketplace/auth'
import { resolveBinanceRate } from '@/lib/marketplace/binance-rate'
import {
  BANK_FEE,
  calculateSellerPayout,
  PLATFORM_FEE,
  roundMoney,
  type MarketplaceExchangeContext,
  type BuyerPaymentMethod,
  type SellerPayoutMethod,
} from '@/lib/marketplace/finance'
import { resolveReferenceRate } from '@/lib/marketplace/reference-rate'
import type { ActionResult } from '@/lib/validations/marketplace'

type CheckoutPaymentMethod =
  | 'PAGO_MOVIL'
  | 'TRANSFERENCIA_BANCARIA'
  | 'ZELLE'
  | 'CRYPTO_WALLET'
  | 'BINANCE_PAY'
type TxPaymentMethod = 'MERCANTIL_PAGO_MOVIL' | 'ZELLE' | 'CRYPTO_WALLET_MANUAL'

function mapBuyerPaymentMethod(paymentMethod: TxPaymentMethod): BuyerPaymentMethod {
  if (paymentMethod === 'CRYPTO_WALLET_MANUAL') return 'BINANCE'
  if (paymentMethod === 'MERCANTIL_PAGO_MOVIL') return 'PAGO_MOVIL'
  return 'BANK'
}

function mapSellerPayoutMethod(methodType: string | null | undefined): SellerPayoutMethod {
  if (methodType === 'BINANCE_PAY' || methodType === 'CRYPTO_WALLET') return 'BINANCE'
  if (methodType === 'PAGO_MOVIL' || methodType === 'BANK_TRANSFER') return 'BANK'
  return 'NONE'
}

async function resolveMarketplaceExchangeContext(params: {
  amountUSD: number
  buyerPaymentMethod: BuyerPaymentMethod
  sellerPayoutMethod: SellerPayoutMethod
}): Promise<MarketplaceExchangeContext> {
  const capturedAt = new Date().toISOString()

  if (params.buyerPaymentMethod === 'BINANCE') {
    const result = await resolveBinanceRate()
    if (!result.snapshotId) {
      throw new Error('Tasa Binance no disponible para persistencia DB')
    }

    return {
      kind: 'BINANCE',
      rateValue: result.rate,
      source: result.source,
      fechaValor: result.fechaValor,
      capturedAt,
      buyerAmountBs: params.sellerPayoutMethod === 'BINANCE' ? null : roundMoney(params.amountUSD * result.rate),
      snapshotId: result.snapshotId,
    }
  }

  const result = await resolveReferenceRate()
  if (!result.snapshotId || result.mode === 'fallback') {
    throw new Error('Tasa BCV no disponible para persistencia DB')
  }

  return {
    kind: 'BCV',
    rateValue: result.rate,
    source: result.source,
    fechaValor: result.fechaValor,
    capturedAt,
    buyerAmountBs: roundMoney(params.amountUSD * result.rate),
    snapshotId: result.snapshotId,
  }
}

function calcFee(
  amount: number,
  paymentMethod: TxPaymentMethod,
  sellerPayoutMethod: SellerPayoutMethod,
  exchangeRateValue: number,
) {
  const payout = calculateSellerPayout({
    amountUSD: amount,
    buyerPaymentMethod: mapBuyerPaymentMethod(paymentMethod),
    sellerPayoutMethod,
    bcvRate: exchangeRateValue,
    binanceRate: exchangeRateValue,
  })
  const bankPercent = payout.bankFeeBS > 0 ? BANK_FEE * 100 : 0

  return {
    platformFeePercent: PLATFORM_FEE * 100 + bankPercent,
    platformFeeAmount: Math.max(0, roundMoney(amount - payout.netUSD)),
    sellerNetAmount: payout.netUSD,
  }
}

function mapCheckoutPaymentMethod(method: string): TxPaymentMethod | null {
  if (method === 'PAGO_MOVIL') return 'MERCANTIL_PAGO_MOVIL'
  if (method === 'TRANSFERENCIA_BANCARIA') return 'MERCANTIL_PAGO_MOVIL'
  if (method === 'ZELLE') return 'ZELLE'
  if (method === 'BINANCE_PAY') return 'CRYPTO_WALLET_MANUAL'
  if (method === 'CRYPTO_WALLET') return 'CRYPTO_WALLET_MANUAL'
  return null
}

export async function initiatePurchase(
  listingId: string,
  paymentMethod: string,
): Promise<ActionResult<{ transactionId: string; idempotencyKey: string }>> {
  const session = await getSession()
  if (!session) return { success: false, message: 'Debes iniciar sesion para comprar' }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    const mappedPaymentMethod = mapCheckoutPaymentMethod(paymentMethod)
    if (!mappedPaymentMethod) {
      return { success: false, message: 'Metodo de pago no soportado por el checkout actual' }
    }

    const listing = await db.mpListing.findUnique({
      where: { id: listingId },
      include: {
        seller: {
          select: {
            payoutMethods: {
              where: { isActive: true },
              orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
              take: 1,
              select: { methodType: true },
            },
          },
        },
      },
    })

    if (!listing) return { success: false, message: 'Listing no encontrado' }
    if (listing.status !== 'ACTIVE') return { success: false, message: 'Este listing no esta disponible' }
    if (listing.sellerId === session.userId) return { success: false, message: 'No puedes comprar tu propio listing' }

    // Check for active transactions
    const activeTx = await db.mpTransaction.findFirst({
      where: {
        listingId,
        status: {
          in: [
            'PENDING_PAYMENT',
            'PAYMENT_RECEIVED',
            'VALIDATING',
            'IN_ESCROW',
            'DELIVERY_CONFIRMED',
            'DISPUTED',
          ],
        },
      },
    })

    if (activeTx) {
      return { success: false, message: 'Este articulo ya tiene una operacion en curso y no esta disponible para la compra' }
    }

    const amount = Number(listing.price)
    const sellerPayoutMethod = mapSellerPayoutMethod(listing.seller.payoutMethods[0]?.methodType)
    let exchangeContext
    try {
      exchangeContext = await resolveMarketplaceExchangeContext({
        amountUSD: amount,
        buyerPaymentMethod: mapBuyerPaymentMethod(mappedPaymentMethod),
        sellerPayoutMethod,
      })
    } catch {
      return { success: false, message: 'Tasa no disponible, intenta nuevamente' }
    }

    const fee = calcFee(amount, mappedPaymentMethod, sellerPayoutMethod, exchangeContext.rateValue)
    const idempotencyKey = `${session.userId}_${listingId}_${Date.now()}`

    const tx = await db.mpTransaction.create({
      data: {
        idempotencyKey,
        buyerId: session.userId,
        sellerId: listing.sellerId,
        listingId,
        paymentMethod: mappedPaymentMethod,
        status: 'PENDING_PAYMENT',
        amount: String(amount),
        currency: listing.currency,
        exchangeRateValue: String(exchangeContext.rateValue),
        exchangeRateSource: exchangeContext.source,
        exchangeRateKind: exchangeContext.kind,
        exchangeRateFechaValor: new Date(exchangeContext.fechaValor),
        exchangeRateCapturedAt: new Date(exchangeContext.capturedAt),
        buyerAmountBs: exchangeContext.buyerAmountBs == null ? null : String(exchangeContext.buyerAmountBs),
        platformFeePercent: String(fee.platformFeePercent),
        platformFeeAmount: String(fee.platformFeeAmount),
        sellerNetAmount: String(fee.sellerNetAmount),
      },
      select: { id: true },
    })

    await db.mpTransactionStatusHistory.create({
      data: {
        transactionId: tx.id,
        toStatus: 'PENDING_PAYMENT',
        changedBy: session.userId,
        reason: 'Compra iniciada por el comprador. Esperando comprobante de pago.',
      },
    })

    await db.$disconnect()
    return { success: true, data: { transactionId: tx.id, idempotencyKey }, message: 'Transaccion iniciada' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error al iniciar transaccion' }
  }
}

export async function submitPaymentProof(
  transactionId: string,
  reference: string,
  details: {
    senderBank?: string | null
    paymentDate: string
  },
  proofUrl?: string,
): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, message: 'No autenticado' }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    const tx = await db.mpTransaction.findUnique({ where: { id: transactionId } })
    if (!tx) return { success: false, message: 'Transaccion no encontrada' }
    if (tx.buyerId !== session.userId) return { success: false, message: 'Sin permiso' }
    if (tx.status !== 'INITIATED' && tx.status !== 'PENDING_PAYMENT') {
      return { success: false, message: `Estado invalido para enviar comprobante: ${tx.status}` }
    }

    const cleanReference = reference.trim()
    if (!cleanReference) return { success: false, message: 'La referencia de pago es obligatoria' }
    const isBinancePayment = tx.paymentMethod === 'CRYPTO_WALLET_MANUAL'
    const cleanSenderBank = details.senderBank?.trim() ?? ''
    if (!isBinancePayment && !cleanSenderBank) return { success: false, message: 'El banco emisor es obligatorio' }
    if (isBinancePayment && !proofUrl) return { success: false, message: 'El comprobante Binance es obligatorio' }
    if (!details.paymentDate.trim()) return { success: false, message: 'La fecha de pago es obligatoria' }

    const paidAt = new Date(`${details.paymentDate}T12:00:00-04:00`)
    if (Number.isNaN(paidAt.getTime())) {
      return { success: false, message: 'La fecha de pago no es valida' }
    }

    await db.mpTransaction.update({
      where: { id: transactionId },
      data: {
        status: 'PAYMENT_RECEIVED',
        paymentReference: cleanReference,
        paymentSenderBank: isBinancePayment ? null : cleanSenderBank,
        paymentPaidAt: paidAt,
        paymentProofUrl: proofUrl ?? null,
      },
    })

    await db.mpTransactionStatusHistory.create({
      data: {
        transactionId,
        fromStatus: tx.status,
        toStatus: 'PAYMENT_RECEIVED',
        changedBy: session.userId,
        reason: isBinancePayment
          ? `Comprobante Binance enviado. Operacion: ${cleanReference}. Fecha: ${details.paymentDate}`
          : `Comprobante enviado. Banco: ${cleanSenderBank}. Operacion: ${cleanReference}. Fecha: ${details.paymentDate}`,
      },
    })

    await db.$disconnect()
    return { success: true, data: undefined, message: 'Comprobante registrado. El equipo revisara el pago.' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

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
    if (!tx) return { success: false, message: 'Transaccion no encontrada' }
    if (tx.status !== 'PAYMENT_RECEIVED' && tx.status !== 'VALIDATING') {
      return { success: false, message: `Estado invalido para validar: ${tx.status}` }
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
              escrowReleaseAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
            }
          : {}),
      },
    })

    if (approved) {
      await db.mpListing.update({
        where: { id: tx.listingId },
        data: { status: 'SOLD_OUT' },
      })
    }

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
      message: approved ? 'Pago aprobado. Operacion protegida hasta confirmacion de entrega.' : 'Pago rechazado.',
    }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

export async function confirmDelivery(transactionId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, message: 'No autenticado' }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    const tx = await db.mpTransaction.findUnique({ where: { id: transactionId } })
    if (!tx) return { success: false, message: 'Transaccion no encontrada' }
    if (tx.buyerId !== session.userId) return { success: false, message: 'Solo el comprador puede confirmar la entrega' }
    if (tx.status !== 'IN_ESCROW') {
      return { success: false, message: `No se puede confirmar desde el estado: ${tx.status}` }
    }

    const now = new Date()
    await db.mpTransaction.update({
      where: { id: transactionId },
      data: { status: 'DELIVERY_CONFIRMED', buyerConfirmedAt: now },
    })

    await db.mpTransactionStatusHistory.create({
      data: {
        transactionId,
        fromStatus: 'IN_ESCROW',
        toStatus: 'DELIVERY_CONFIRMED',
        changedBy: session.userId,
        reason: 'Comprador confirmo la entrega. Operacion movida a fondos por liberar.',
      },
    })

    await db.$disconnect()
    return { success: true, data: undefined, message: 'Entrega confirmada. El equipo gestionara el pago al vendedor.' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

export async function releaseEscrow(transactionId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session || session.role !== 'SUPER') {
    return { success: false, message: 'Solo administradores pueden liberar el pago protegido.' }
  }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    const tx = await db.mpTransaction.findUnique({ where: { id: transactionId } })
    if (!tx) return { success: false, message: 'Transaccion no encontrada' }
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
        reason: 'Pago protegido liberado por el equipo (T+7 o admin)',
      },
    })

    await db.$disconnect()
    return { success: true, data: undefined, message: 'Pago del vendedor liberado.' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

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
    if (!tx) return { success: false, message: 'Transaccion no encontrada' }

    const isParticipant = tx.buyerId === session.userId || tx.sellerId === session.userId
    if (!isParticipant) return { success: false, message: 'Sin permiso para disputar esta transaccion' }
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
    return { success: true, data: { disputeId: dispute.id }, message: 'Disputa abierta. El equipo revisara el caso en 24-48 h.' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

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
    if (!tx) return { success: false, message: 'Transaccion no encontrada' }

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
    return { success: true, data: undefined, message: 'Transaccion cancelada.' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

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

    if (!tx) return { success: false, message: 'Transaccion no encontrada' }

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
