'use server'

import { randomUUID } from 'node:crypto'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/marketplace/db'
import { getSession } from '@/lib/marketplace/auth'
import { processReferralConversion } from '@/actions/marketplace/referrals'
import { sendMarketplaceEmail } from '@/lib/email/send'
import { sendMarketplaceWhatsapp } from '@/lib/whatsapp/marketplace-notifications'
import {
  BANK_FEE,
  calculateSellerPayout,
  PLATFORM_FEE,
  roundMoney,
  type BuyerPaymentMethod,
  type SellerPayoutMethod,
} from '@/lib/marketplace/finance'
import { resolveBinanceRate, type BinanceRateResult } from '@/lib/marketplace/binance-rate'
import { resolveReferenceRate } from '@/lib/marketplace/reference-rate'
import type { ActionResult } from '@/lib/validations/marketplace'
import { sendSystemMessage } from '@/actions/marketplace/chat'

type CheckoutPaymentMethod =
  | 'PAGO_MOVIL'
  | 'TRANSFERENCIA_BANCARIA'
  | 'ZELLE'
  | 'CRYPTO_WALLET'
  | 'BINANCE_PAY'
type TxPaymentMethod = 'MERCANTIL_PAGO_MOVIL' | 'ZELLE' | 'CRYPTO_WALLET_MANUAL'
const SELLER_DELIVERED_EVENT = 'seller_delivered'
const REFERRAL_COOKIE = 'mp_ref'
const LEGACY_CART_ORDER_PREFIX = 'legacy-cart:'

function getMarketplaceBaseUrl(): string {
  return process.env.APP_URL?.replace(/\/+$/, '') ?? 'https://turpialsong.com'
}

function buildMarketplaceTransactionUrl(transactionId: string): string {
  const baseUrl = getMarketplaceBaseUrl()
  return `${baseUrl}/marketplace/dashboard/transactions/${encodeURIComponent(transactionId)}`
}

function buildTxCode(transactionId: string): string {
  return transactionId.slice(-8).toUpperCase()
}

async function notifyMarketplacePurchaseInitiated(params: {
  transactionId: string
  listingTitle: string
  amount: number
  currency: string
  buyer: { email?: string | null; displayName?: string | null }
  seller: { email?: string | null; phone?: string | null; displayName?: string | null }
}): Promise<void> {
  const txCode = buildTxCode(params.transactionId)
  const txUrl = buildMarketplaceTransactionUrl(params.transactionId)
  const buyerName = params.buyer.displayName?.trim() || 'Comprador'
  const sellerName = params.seller.displayName?.trim() || 'Vendedor'
  const listingTitle = params.listingTitle?.trim() || 'Producto Marketplace'
  const notifications: Array<Promise<unknown>> = []

  if (params.buyer.email?.trim()) {
    notifications.push(
      sendMarketplaceEmail(
        'purchase_confirmation',
        { email: params.buyer.email, name: buyerName },
        {
          buyerName,
          listingTitle,
          amount: params.amount,
          currency: params.currency,
          txCode,
          txUrl,
        },
      ),
    )
  }

  if (params.seller.email?.trim()) {
    notifications.push(
      sendMarketplaceEmail(
        'new_sale',
        { email: params.seller.email, name: sellerName },
        {
          sellerName,
          listingTitle,
          amount: params.amount,
          currency: params.currency,
          txCode,
          txUrl,
        },
      ),
    )
  }

  if (params.seller.phone?.trim()) {
    notifications.push(
      sendMarketplaceWhatsapp(
        'mp_new_sale',
        { phone: params.seller.phone, name: sellerName },
        {
          txCode,
          listingTitle,
          amount: params.amount,
          currency: params.currency,
        },
      ),
    )
  }

  if (notifications.length > 0) {
    await Promise.allSettled(notifications)
  }
}

async function notifyMarketplacePaymentReceived(params: {
  transactionId: string
  amount: number
  currency: string
  buyer: { email?: string | null; phone?: string | null; displayName?: string | null }
}): Promise<void> {
  const txCode = buildTxCode(params.transactionId)
  const txUrl = buildMarketplaceTransactionUrl(params.transactionId)
  const buyerName = params.buyer.displayName?.trim() || 'Comprador'
  const notifications: Array<Promise<unknown>> = []

  if (params.buyer.email?.trim()) {
    notifications.push(
      sendMarketplaceEmail(
        'payment_received',
        { email: params.buyer.email, name: buyerName },
        {
          buyerName,
          txCode,
          amount: params.amount,
          currency: params.currency,
          txUrl,
        },
      ),
    )
  }

  if (params.buyer.phone?.trim()) {
    notifications.push(
      sendMarketplaceWhatsapp(
        'mp_payment_received',
        { phone: params.buyer.phone, name: buyerName },
        {
          txCode,
          amount: params.amount,
          currency: params.currency,
        },
      ),
    )
  }

  if (notifications.length > 0) {
    await Promise.allSettled(notifications)
  }
}

async function notifyMarketplacePaymentApproved(params: {
  transactionId: string
  listingTitle: string
  buyer: { email?: string | null; phone?: string | null; displayName?: string | null }
  seller: { email?: string | null; phone?: string | null; displayName?: string | null }
}): Promise<void> {
  const txCode = buildTxCode(params.transactionId)
  const txUrl = buildMarketplaceTransactionUrl(params.transactionId)
  const listingTitle = params.listingTitle?.trim() || 'Producto Marketplace'
  const buyerName = params.buyer.displayName?.trim() || 'Comprador'
  const sellerName = params.seller.displayName?.trim() || 'Vendedor'
  const notifications: Array<Promise<unknown>> = []

  if (params.buyer.email?.trim()) {
    notifications.push(
      sendMarketplaceEmail(
        'payment_approved',
        { email: params.buyer.email, name: buyerName },
        {
          recipientName: buyerName,
          recipientRole: 'buyer',
          listingTitle,
          txCode,
          txUrl,
        },
      ),
    )
  }

  if (params.buyer.phone?.trim()) {
    notifications.push(
      sendMarketplaceWhatsapp(
        'mp_payment_approved',
        { phone: params.buyer.phone, name: buyerName },
        { txCode, listingTitle },
      ),
    )
  }

  if (params.seller.email?.trim()) {
    notifications.push(
      sendMarketplaceEmail(
        'payment_approved',
        { email: params.seller.email, name: sellerName },
        {
          recipientName: sellerName,
          recipientRole: 'seller',
          listingTitle,
          txCode,
          txUrl,
        },
      ),
    )
  }

  if (params.seller.phone?.trim()) {
    notifications.push(
      sendMarketplaceWhatsapp(
        'mp_payment_approved',
        { phone: params.seller.phone, name: sellerName },
        { txCode, listingTitle },
      ),
    )
  }

  if (notifications.length > 0) {
    await Promise.allSettled(notifications)
  }
}

async function notifyMarketplaceSellerDelivered(params: {
  transactionId: string
  listingTitle: string
  buyer: { email?: string | null; phone?: string | null; displayName?: string | null }
}): Promise<void> {
  const txCode = buildTxCode(params.transactionId)
  const txUrl = buildMarketplaceTransactionUrl(params.transactionId)
  const listingTitle = params.listingTitle?.trim() || 'Producto Marketplace'
  const buyerName = params.buyer.displayName?.trim() || 'Comprador'
  const notifications: Array<Promise<unknown>> = []

  if (params.buyer.email?.trim()) {
    notifications.push(
      sendMarketplaceEmail(
        'seller_delivered',
        { email: params.buyer.email, name: buyerName },
        {
          buyerName,
          listingTitle,
          txCode,
          txUrl,
        },
      ),
    )
  }

  if (params.buyer.phone?.trim()) {
    notifications.push(
      sendMarketplaceWhatsapp(
        'mp_seller_delivered',
        { phone: params.buyer.phone, name: buyerName },
        { txCode, listingTitle },
      ),
    )
  }

  if (notifications.length > 0) {
    await Promise.allSettled(notifications)
  }
}

async function notifyMarketplaceDeliveryConfirmed(params: {
  transactionId: string
  listingTitle: string
  seller: { email?: string | null; phone?: string | null; displayName?: string | null }
}): Promise<void> {
  const txCode = buildTxCode(params.transactionId)
  const txUrl = buildMarketplaceTransactionUrl(params.transactionId)
  const listingTitle = params.listingTitle?.trim() || 'Producto Marketplace'
  const sellerName = params.seller.displayName?.trim() || 'Vendedor'
  const notifications: Array<Promise<unknown>> = []

  if (params.seller.email?.trim()) {
    notifications.push(
      sendMarketplaceEmail(
        'delivery_confirmed',
        { email: params.seller.email, name: sellerName },
        {
          sellerName,
          listingTitle,
          txCode,
          txUrl,
        },
      ),
    )
  }

  if (params.seller.phone?.trim()) {
    notifications.push(
      sendMarketplaceWhatsapp(
        'mp_delivery_confirmed',
        { phone: params.seller.phone, name: sellerName },
        { txCode, listingTitle },
      ),
    )
  }

  if (notifications.length > 0) {
    await Promise.allSettled(notifications)
  }
}

async function notifyMarketplacePayoutReleased(params: {
  transactionId: string
  amount: number
  currency: string
  seller: { email?: string | null; phone?: string | null; displayName?: string | null }
}): Promise<void> {
  const txCode = buildTxCode(params.transactionId)
  const txUrl = buildMarketplaceTransactionUrl(params.transactionId)
  const sellerName = params.seller.displayName?.trim() || 'Vendedor'
  const notifications: Array<Promise<unknown>> = []

  if (params.seller.email?.trim()) {
    notifications.push(
      sendMarketplaceEmail(
        'payout_released',
        { email: params.seller.email, name: sellerName },
        {
          sellerName,
          amount: params.amount,
          currency: params.currency,
          txCode,
          txUrl,
        },
      ),
    )
  }

  if (params.seller.phone?.trim()) {
    notifications.push(
      sendMarketplaceWhatsapp(
        'mp_payout_released',
        { phone: params.seller.phone, name: sellerName },
        {
          txCode,
          amount: params.amount,
          currency: params.currency,
        },
      ),
    )
  }

  if (notifications.length > 0) {
    await Promise.allSettled(notifications)
  }
}

async function notifyMarketplaceDisputeOpened(params: {
  transactionId: string
  buyer: { phone?: string | null; displayName?: string | null }
  seller: { phone?: string | null; displayName?: string | null }
}): Promise<void> {
  const txCode = buildTxCode(params.transactionId)
  const notifications: Array<Promise<unknown>> = []

  if (params.buyer.phone?.trim()) {
    notifications.push(
      sendMarketplaceWhatsapp(
        'mp_dispute_opened',
        { phone: params.buyer.phone, name: params.buyer.displayName?.trim() || 'Comprador' },
        { txCode },
      ),
    )
  }

  if (params.seller.phone?.trim()) {
    notifications.push(
      sendMarketplaceWhatsapp(
        'mp_dispute_opened',
        { phone: params.seller.phone, name: params.seller.displayName?.trim() || 'Vendedor' },
        { txCode },
      ),
    )
  }

  if (notifications.length > 0) {
    await Promise.allSettled(notifications)
  }
}
type PurchaseRateContext = {
  bcvRate: number
  binanceRate: number
  frozenRate: string | null
  frozenRateSource: string | null
  frozenRateFechaValor: Date | null
  rateSnapshotId: string | null
  adminNotes: string
}
type CheckoutListingRow = {
  id: string
  status: string
  sellerId: string
  price: unknown
  currency: string
  hasInventory: boolean
  inventory: number | null
  seller: { payoutMethods: Array<{ methodType: string | null }> }
}
type ReferralPurchaseContext = {
  referralCode: string
  referredBy: string
}
type MarketplaceSchemaCapabilities = {
  hasOrders: boolean
  hasTransactionQuantity: boolean
  hasTransactionUnitPrice: boolean
  hasTransactionOrderId: boolean
}
type CreateMarketplaceTransactionInput = {
  idempotencyKey: string
  orderId?: string | null
  buyerId: string
  sellerId: string
  listingId: string
  paymentMethod: TxPaymentMethod
  status: 'PENDING_PAYMENT'
  amount: string
  currency: string
  quantity: number
  unitPrice: string
  platformFeePercent: string
  platformFeeAmount: string
  sellerNetAmount: string
  frozenRate: string | null
  frozenRateSource: string | null
  frozenRateFechaValor: Date | null
  rateSnapshotId: string | null
  adminNotes: string | null
  referredBy: string | null
}
function getAvailableInventory(
  listing: { hasInventory: boolean; inventory: number | null },
  consumedUnits: number,
) {
  if (!listing.hasInventory || listing.inventory == null) return null
  return listing.inventory - consumedUnits
}

async function getConsumedInventoryUnits(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  listingId: string,
) {
  void db
  void listingId
  // Inventory is now decremented atomically on purchase initiation.
  // Counting transactions here would double-subtract remaining stock.
  return 0
}

function hasSellerDelivered(
  statusHistory: Array<{ reason: string | null; toStatus: string; changedBy: string | null }>,
  sellerId: string,
) {
  return statusHistory.some(entry =>
    entry.toStatus === 'IN_ESCROW' &&
    entry.changedBy === sellerId &&
    (entry.reason ?? '').includes(SELLER_DELIVERED_EVENT),
  )
}

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

function calcFee(amount: number, paymentMethod: TxPaymentMethod, sellerPayoutMethod: SellerPayoutMethod, bcvRate: number, binanceRate: number) {
  const buyerMethod = mapBuyerPaymentMethod(paymentMethod)
  const payout = calculateSellerPayout({
    amountUSD: amount,
    buyerPaymentMethod: buyerMethod,
    sellerPayoutMethod,
    bcvRate,
    binanceRate,
  })
  const bankPercent = payout.bankFeeBS > 0 ? BANK_FEE * 100 : 0

  return {
    platformFeePercent: PLATFORM_FEE * 100 + bankPercent,
    platformFeeAmount: Math.max(0, roundMoney(amount - payout.netUSD)),
    sellerNetAmount: payout.netUSD,
    appliedRateType: payout.appliedRateType,
    appliedRate: payout.appliedRateType === 'BINANCE' ? binanceRate : payout.appliedRateType === 'BCV' ? bcvRate : null,
    sellerNetBS: payout.netBS,
    breakdown: payout.breakdown,
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

async function getMarketplaceSchemaCapabilities(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
): Promise<MarketplaceSchemaCapabilities> {
  try {
    const tables = await db.$queryRaw`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name = 'mp_orders'
    ` as Array<{ table_name: string }>
    const columns = await db.$queryRaw`
      select column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'mp_transactions'
        and column_name in ('quantity', 'unitPrice', 'orderId')
    ` as Array<{ column_name: string }>
    const names = new Set(columns.map((row) => row.column_name))
    return {
      hasOrders: tables.length > 0,
      hasTransactionQuantity: names.has('quantity'),
      hasTransactionUnitPrice: names.has('unitPrice'),
      hasTransactionOrderId: names.has('orderId'),
    }
  } catch {
    return {
      hasOrders: false,
      hasTransactionQuantity: false,
      hasTransactionUnitPrice: false,
      hasTransactionOrderId: false,
    }
  }
}

async function getReferralPurchaseContext(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  buyerId: string,
  listingId: string,
): Promise<ReferralPurchaseContext | null> {
  try {
    const referralCode = cookies().get(REFERRAL_COOKIE)?.value?.trim()
    if (!referralCode) return null

    const refLink = await db.mpReferralLink.findUnique({
      where: { code: referralCode },
      select: { referrerId: true, listingId: true, isActive: true },
    })

    if (!refLink?.isActive) return null
    if (refLink.referrerId === buyerId) return null
    if (refLink.listingId !== listingId) return null

    return { referralCode, referredBy: refLink.referrerId }
  } catch {
    return null
  }
}

function clearReferralCookie() {
  try {
    cookies().set(REFERRAL_COOKIE, '', {
      path: '/',
      maxAge: 0,
      sameSite: 'lax',
    })
  } catch {}
}

function createLegacyTransactionId() {
  return `tx_${Date.now().toString(36)}_${randomUUID().replace(/-/g, '').slice(0, 16)}`
}

async function safeUpdateTransaction(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any,
  schemaCapabilities: MarketplaceSchemaCapabilities,
  where: { id: string },
  data: Record<string, any>,
) {
  if (!schemaCapabilities.hasTransactionOrderId) {
    const setClauses: string[] = []
    const values: any[] = []
    let paramIndex = 1
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue
      setClauses.push(`"${key}" = $${paramIndex++}`)
      values.push(value === null ? null : String(value))
    }
    if (setClauses.length === 0) return
    values.push(where.id)
    await prisma.$executeRawUnsafe(
      `UPDATE "mp_transactions" SET ${setClauses.join(', ')} WHERE "id" = $${paramIndex}`,
      ...values,
    )
    return
  }
  await prisma.mpTransaction.update({ where, data })
}

async function createMarketplaceTransaction(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any,
  schemaCapabilities: MarketplaceSchemaCapabilities,
  data: CreateMarketplaceTransactionInput,
): Promise<{ id: string }> {
  const canUsePrismaCreate =
    schemaCapabilities.hasTransactionQuantity &&
    schemaCapabilities.hasTransactionUnitPrice &&
    (!data.orderId || schemaCapabilities.hasTransactionOrderId)

  if (canUsePrismaCreate) {
    return await prisma.mpTransaction.create({
      data: {
        idempotencyKey: data.idempotencyKey,
        ...(data.orderId ? { orderId: data.orderId } : {}),
        buyerId: data.buyerId,
        sellerId: data.sellerId,
        listingId: data.listingId,
        paymentMethod: data.paymentMethod,
        status: data.status,
        amount: data.amount,
        currency: data.currency,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        platformFeePercent: data.platformFeePercent,
        platformFeeAmount: data.platformFeeAmount,
        sellerNetAmount: data.sellerNetAmount,
        frozenRate: data.frozenRate,
        frozenRateSource: data.frozenRateSource,
        frozenRateFechaValor: data.frozenRateFechaValor,
        rateSnapshotId: data.rateSnapshotId,
        adminNotes: data.adminNotes,
        referredBy: data.referredBy,
      },
      select: { id: true },
    })
  }

  const id = createLegacyTransactionId()
  const rows = data.orderId && schemaCapabilities.hasTransactionOrderId
    ? await prisma.$queryRaw`
        insert into "mp_transactions" (
          "id", "idempotencyKey", "orderId", "buyerId", "sellerId", "listingId",
          "paymentMethod", "status", "amount", "currency",
          "platformFeePercent", "platformFeeAmount", "sellerNetAmount",
          "frozenRate", "frozenRateSource", "frozenRateFechaValor", "rateSnapshotId",
          "adminNotes", "referredBy", "createdAt", "updatedAt"
        )
        values (
          ${id}, ${data.idempotencyKey}, ${data.orderId}, ${data.buyerId}, ${data.sellerId}, ${data.listingId},
          ${data.paymentMethod}::mp_payment_method_type, ${data.status}::mp_transaction_status, ${data.amount}::numeric, ${data.currency},
          ${data.platformFeePercent}::numeric, ${data.platformFeeAmount}::numeric, ${data.sellerNetAmount}::numeric,
          ${data.frozenRate}::numeric, ${data.frozenRateSource}, ${data.frozenRateFechaValor}, ${data.rateSnapshotId},
          ${data.adminNotes}, ${data.referredBy}, now(), now()
        )
        returning "id"
      ` as Array<{ id: string }>
    : await prisma.$queryRaw`
        insert into "mp_transactions" (
          "id", "idempotencyKey", "buyerId", "sellerId", "listingId",
          "paymentMethod", "status", "amount", "currency",
          "platformFeePercent", "platformFeeAmount", "sellerNetAmount",
          "frozenRate", "frozenRateSource", "frozenRateFechaValor", "rateSnapshotId",
          "adminNotes", "referredBy", "createdAt", "updatedAt"
        )
        values (
          ${id}, ${data.idempotencyKey}, ${data.buyerId}, ${data.sellerId}, ${data.listingId},
          ${data.paymentMethod}::mp_payment_method_type, ${data.status}::mp_transaction_status, ${data.amount}::numeric, ${data.currency},
          ${data.platformFeePercent}::numeric, ${data.platformFeeAmount}::numeric, ${data.sellerNetAmount}::numeric,
          ${data.frozenRate}::numeric, ${data.frozenRateSource}, ${data.frozenRateFechaValor}, ${data.rateSnapshotId},
          ${data.adminNotes}, ${data.referredBy}, now(), now()
        )
        returning "id"
      ` as Array<{ id: string }>

  return rows[0] ?? { id }
}

async function resolvePurchaseRateContext(
  mappedPaymentMethod: TxPaymentMethod,
  sellerPayoutMethod: SellerPayoutMethod,
): Promise<ActionResult<PurchaseRateContext>> {
  const buyerMethod = mapBuyerPaymentMethod(mappedPaymentMethod)
  const isBinanceBuyer = buyerMethod === 'BINANCE'
  const isBinanceSeller = sellerPayoutMethod === 'BINANCE'
  const isUSDTDirect = isBinanceBuyer && isBinanceSeller

  if (isUSDTDirect) {
    return {
      success: true,
      data: {
        bcvRate: 0,
        binanceRate: 0,
        frozenRate: null,
        frozenRateSource: null,
        frozenRateFechaValor: null,
        rateSnapshotId: null,
        adminNotes: 'USDT directo - sin conversion de tasa',
      },
      message: 'OK',
    }
  }

  if (!isBinanceBuyer) {
    const bcvResult = await resolveReferenceRate()
    if (bcvResult.rate === null || bcvResult.rate <= 0) {
      return { success: false, message: 'No pudimos obtener la tasa de pago (BCV). Intenta nuevamente en unos minutos o contacta soporte.' }
    }

    return {
      success: true,
      data: {
        bcvRate: bcvResult.rate,
        binanceRate: 0,
        frozenRate: String(bcvResult.rate),
        frozenRateSource: 'BCV',
        frozenRateFechaValor: bcvResult.fechaValor ? new Date(bcvResult.fechaValor) : null,
        rateSnapshotId: bcvResult.snapshotId,
        adminNotes: `Tasa BCV: ${bcvResult.rate} Bs/USD | fuente: ${bcvResult.source} | modo: ${bcvResult.mode}`,
      },
      message: 'OK',
    }
  }

  try {
    const binanceResult = await resolveBinanceRate()
    return {
      success: true,
      data: {
        bcvRate: 0,
        binanceRate: binanceResult.rate,
        frozenRate: String(binanceResult.rate),
        frozenRateSource: 'BINANCE',
        frozenRateFechaValor: binanceResult.fechaValor ? new Date(binanceResult.fechaValor) : null,
        rateSnapshotId: binanceResult.snapshotId,
        adminNotes: `Tasa Binance: ${binanceResult.rate} Bs/USD | snapshotId: ${binanceResult.snapshotId ?? 'N/D'} | modo: ${binanceResult.mode}`,
      },
      message: 'OK',
    }
  } catch {
    return { success: false, message: 'No pudimos obtener la tasa de pago (Binance). Intenta nuevamente en unos minutos o contacta soporte.' }
  }
}

export async function initiatePurchase(
  listingId: string,
  paymentMethod: string,
  quantity = 1,
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
    const requestedQuantity = Math.max(1, Math.floor(quantity))

    const [listing, buyerProfile] = await Promise.all([
      db.mpListing.findUnique({
        where: { id: listingId },
        select: {
          id: true,
          title: true,
          status: true,
          sellerId: true,
          price: true,
          currency: true,
          hasInventory: true,
          inventory: true,
          seller: {
            select: {
              phone: true,
              email: true,
              displayName: true,
              payoutMethods: {
                where: { isActive: true },
                orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
                take: 1,
                select: { methodType: true },
              },
            },
          },
        },
      }),
      db.mpUser.findUnique({
        where: { id: session.userId },
        select: {
          email: true,
          displayName: true,
        },
      }),
    ])

    if (!listing) return { success: false, message: 'Listing no encontrado' }
    if (listing.status !== 'ACTIVE') return { success: false, message: 'Este listing no esta disponible' }
    if (listing.sellerId === session.userId) return { success: false, message: 'No puedes comprar tu propio listing' }

    // Double-check inside transaction — uses atomic decrement (not unreliable count())

    const sellerPayoutMethod = mapSellerPayoutMethod(listing.seller.payoutMethods[0]?.methodType)
    const buyerMethod = mapBuyerPaymentMethod(mappedPaymentMethod)
    const isBinanceBuyer = buyerMethod === 'BINANCE'
    const isBinanceSeller = sellerPayoutMethod === 'BINANCE'
    const isUSDTDirect = isBinanceBuyer && isBinanceSeller

    const unitPrice = Number(listing.price)
    const amount = unitPrice * requestedQuantity
    const idempotencyKey = `${session.userId}_${listingId}_${requestedQuantity}_${Date.now()}`
    const schemaCapabilities = await getMarketplaceSchemaCapabilities(db)

    // ─── Referral tracking ───
    let referredBy: string | null = null
    let referralCode: string | null = null
    try {
      const cookieStore = cookies()
      referralCode = cookieStore.get('mp_ref')?.value ?? null
      if (referralCode) {
        const refLink = await db.mpReferralLink.findUnique({
          where: { code: referralCode },
          select: { referrerId: true, isActive: true },
        })
        if (refLink?.isActive && refLink.referrerId !== session.userId) {
          referredBy = refLink.referrerId
        }
      }
    } catch {
      // cookie read failed — continue without referral
    }

    // ─── Rate resolution & frozen-column persistence ───
    // Three mutually exclusive paths; each sets frozenRate columns or blocks with a clear error.
    // No silent fallback to USD_REFERENCE_RATE=1.
    const referral = await getReferralPurchaseContext(db, session.userId, listingId)
    referredBy = referral?.referredBy ?? null
    referralCode = referral?.referralCode ?? null

    let bcvRate = 0
    let binanceRate = 0
    let frozenRate: string | null = null
    let frozenRateSource: string | null = null
    let frozenRateFechaValor: Date | null = null
    let rateSnapshotId: string | null = null
    let adminNotes = ''

    if (isUSDTDirect) {
      // USDT direct: buyer pays USDT, seller receives USDT — no conversion needed
      adminNotes = 'USDT directo — sin conversion de tasa'
    } else if (!isBinanceBuyer) {
      // BCV route: buyer pays via PagoMovil / Bank / Zelle → seller receives BS
      const bcvResult = await resolveReferenceRate()
      if (bcvResult.rate === null || bcvResult.rate <= 0) {
        await db.$disconnect()
        return { success: false, message: 'No pudimos obtener la tasa de pago (BCV). Intenta nuevamente en unos minutos o contacta soporte.' }
      }
      bcvRate = bcvResult.rate
      frozenRate = String(bcvResult.rate)
      frozenRateSource = 'BCV'
      frozenRateFechaValor = bcvResult.fechaValor ? new Date(bcvResult.fechaValor) : null
      rateSnapshotId = bcvResult.snapshotId
      adminNotes = `Tasa BCV: ${bcvResult.rate} Bs/USD | fuente: ${bcvResult.source} | modo: ${bcvResult.mode}`
    } else {
      // Binance route: buyer pays via Binance → seller receives BS
      let binanceResult: BinanceRateResult
      try {
        binanceResult = await resolveBinanceRate()
      } catch (binanceErr) {
        await db.$disconnect()
        return { success: false, message: 'No pudimos obtener la tasa de pago (Binance). Intenta nuevamente en unos minutos o contacta soporte.' }
      }
      binanceRate = binanceResult.rate
      frozenRate = String(binanceResult.rate)
      frozenRateSource = 'BINANCE'
      frozenRateFechaValor = binanceResult.fechaValor ? new Date(binanceResult.fechaValor) : null
      rateSnapshotId = binanceResult.snapshotId
      adminNotes = `Tasa Binance: ${binanceResult.rate} Bs/USD | snapshotId: ${binanceResult.snapshotId ?? 'N/D'} | modo: ${binanceResult.mode}`
    }

    const fee = calcFee(amount, mappedPaymentMethod, sellerPayoutMethod, bcvRate, binanceRate)

    const tx = await db.$transaction(async (prisma: any) => {
      const latestListing = await prisma.mpListing.findUnique({
        where: { id: listingId },
        select: { hasInventory: true, inventory: true },
      })
      if (!latestListing) throw new Error('Listing no encontrado')

      // Decremento directo del inventory (mas fiable que count() con pg-adapter)
      if (latestListing.hasInventory && latestListing.inventory != null) {
        if (latestListing.inventory < requestedQuantity) {
          throw new Error(latestListing.inventory <= 0 ? 'Este articulo esta agotado' : `Solo quedan ${latestListing.inventory} disponibles`)
        }
        await prisma.mpListing.update({
          where: { id: listingId },
          data: { inventory: { decrement: requestedQuantity } },
        })
      }

      const record = await createMarketplaceTransaction(prisma, schemaCapabilities, {
        idempotencyKey,
        buyerId: session.userId,
        sellerId: listing.sellerId,
        listingId,
        paymentMethod: mappedPaymentMethod,
        status: 'PENDING_PAYMENT',
        amount: String(amount),
        currency: listing.currency,
        quantity: requestedQuantity,
        unitPrice: String(unitPrice),
        platformFeePercent: String(fee.platformFeePercent),
        platformFeeAmount: String(fee.platformFeeAmount),
        sellerNetAmount: String(fee.sellerNetAmount),
        frozenRate,
        frozenRateSource,
        frozenRateFechaValor,
        rateSnapshotId,
        adminNotes: requestedQuantity > 1 ? `Cantidad: ${requestedQuantity}. ${adminNotes}` : adminNotes,
        referredBy,
      })

      await prisma.mpTransactionStatusHistory.create({
        data: {
          transactionId: record.id,
          toStatus: 'PENDING_PAYMENT',
          changedBy: session.userId,
          reason: 'Compra iniciada por el comprador. Esperando comprobante de pago.',
        },
      })

      return record
    })

    await db.$disconnect()

    // Process referral conversion if applicable (fire-and-forget)
    if (referredBy && referralCode) {
      clearReferralCookie()
      void processReferralConversion(tx.id, referralCode, amount).catch(() => {})
    }

    void notifyMarketplacePurchaseInitiated({
      transactionId: tx.id,
      listingTitle: listing.title,
      amount,
      currency: listing.currency,
      buyer: {
        email: buyerProfile?.email ?? session.email,
        displayName: buyerProfile?.displayName ?? session.displayName,
      },
      seller: {
        email: listing.seller.email,
        phone: listing.seller.phone,
        displayName: listing.seller.displayName,
      },
    }).catch(() => {})

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
    const tx = await db.mpTransaction.findUnique({
      where: { id: transactionId },
      select: {
        id: true,
        buyerId: true,
        status: true,
        paymentMethod: true,
        amount: true,
        currency: true,
        buyer: { select: { email: true, phone: true, displayName: true } },
      },
    })
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
    void notifyMarketplacePaymentReceived({
      transactionId,
      amount: Number(tx.amount),
      currency: tx.currency,
      buyer: {
        email: tx.buyer?.email,
        phone: tx.buyer?.phone,
        displayName: tx.buyer?.displayName,
      },
    }).catch(() => {})
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
    const tx = await db.mpTransaction.findUnique({
      where: { id: transactionId },
      select: {
        id: true,
        status: true,
        listingId: true,
        buyer: { select: { email: true, phone: true, displayName: true } },
        seller: { select: { email: true, phone: true, displayName: true } },
        listing: { select: { title: true } },
      },
    })
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
      const listing = await db.mpListing.findUnique({
        where: { id: tx.listingId },
        select: { hasInventory: true, inventory: true },
      })
      if (listing?.hasInventory && listing.inventory != null) {
        const consumedUnits = await getConsumedInventoryUnits(db, tx.listingId)
        const availableInventory = getAvailableInventory(listing, consumedUnits)
        if (availableInventory != null && availableInventory <= 0) {
          await db.mpListing.update({
            where: { id: tx.listingId },
            data: { status: 'SOLD_OUT' },
          })
        }
      }
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
    if (approved) {
      void notifyMarketplacePaymentApproved({
        transactionId,
        listingTitle: tx.listing?.title ?? 'Producto Marketplace',
        buyer: {
          email: tx.buyer?.email,
          phone: tx.buyer?.phone,
          displayName: tx.buyer?.displayName,
        },
        seller: {
          email: tx.seller?.email,
          phone: tx.seller?.phone,
          displayName: tx.seller?.displayName,
        },
      }).catch(() => {})
    }
    return {
      success: true,
      data: undefined,
      message: approved ? 'Pago aprobado. Fondos en escrow hasta confirmacion de entrega.' : 'Pago rechazado.',
    }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

export async function sellerDeliver(transactionId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, message: 'No autenticado' }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    const tx = await db.mpTransaction.findUnique({
      where: { id: transactionId },
      select: {
        id: true,
        buyerId: true,
        sellerId: true,
        listingId: true,
        status: true,
        buyer: { select: { email: true, phone: true, displayName: true } },
        listing: { select: { title: true } },
        statusHistory: {
          select: { reason: true, toStatus: true, changedBy: true },
        },
      },
    })
    if (!tx) return { success: false, message: 'Transaccion no encontrada' }
    if (tx.sellerId !== session.userId) return { success: false, message: 'Solo el vendedor puede registrar la entrega' }
    if (tx.status !== 'IN_ESCROW') {
      return { success: false, message: `No se puede registrar entrega desde el estado: ${tx.status}` }
    }
    if (hasSellerDelivered(tx.statusHistory, tx.sellerId)) {
      return { success: false, message: 'La entrega ya fue registrada. Espera la confirmacion del comprador.' }
    }

    await db.mpTransactionStatusHistory.create({
      data: {
        transactionId,
        fromStatus: 'IN_ESCROW',
        toStatus: 'IN_ESCROW',
        changedBy: session.userId,
        reason: `${SELLER_DELIVERED_EVENT}: vendedor registro entrega; espera confirmacion del comprador`,
      },
    })

    // Fire-and-forget: notify buyer that seller has delivered
    void sendSystemMessage({
      buyerId: tx.buyerId,
      sellerId: tx.sellerId,
      listingId: tx.listingId,
      senderId: tx.sellerId,
      receiverId: tx.buyerId,
      content: 'El vendedor registro la entrega. Revisa el producto o servicio y confirma la recepcion solo si estas conforme. Los fondos siguen protegidos.',
    })

    await db.$disconnect()
    void notifyMarketplaceSellerDelivered({
      transactionId,
      listingTitle: tx.listing?.title ?? 'Producto Marketplace',
      buyer: {
        email: tx.buyer?.email,
        phone: tx.buyer?.phone,
        displayName: tx.buyer?.displayName,
      },
    }).catch(() => {})
    return { success: true, data: undefined, message: 'Entrega registrada. Los fondos siguen protegidos hasta la confirmacion del comprador y liberacion admin.' }
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
    const tx = await db.mpTransaction.findUnique({
      where: { id: transactionId },
      select: {
        id: true,
        buyerId: true,
        sellerId: true,
        listingId: true,
        status: true,
        seller: { select: { email: true, phone: true, displayName: true } },
        listing: { select: { title: true } },
        disputes: { where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } }, select: { id: true } },
        statusHistory: { select: { reason: true, toStatus: true, changedBy: true } },
      },
    })
    if (!tx) return { success: false, message: 'Transaccion no encontrada' }
    if (tx.buyerId !== session.userId) return { success: false, message: 'Solo el comprador puede confirmar la entrega' }
    if (tx.status !== 'IN_ESCROW') {
      return { success: false, message: `No se puede confirmar desde el estado: ${tx.status}` }
    }

    // Dispute guard: if there is an active dispute, block buyer confirmation
    if (tx.disputes && tx.disputes.length > 0) {
      await db.$disconnect()
      return { success: false, message: 'Existe una disputa activa. No se puede confirmar la entrega mientras la disputa este abierta.' }
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
        reason: 'buyer_confirmed_receipt: comprador confirmo la recepcion del articulo; pendiente liberacion admin',
      },
    })

    // Fire-and-forget: notify seller that buyer confirmed; admin still releases later
    void sendSystemMessage({
      buyerId: tx.buyerId,
      sellerId: tx.sellerId,
      listingId: tx.listingId,
      senderId: tx.buyerId,
      receiverId: tx.sellerId,
      content: 'El comprador confirmo la recepcion. La operacion queda lista para liberacion admin si no hay disputa activa.',
    })

    await db.$disconnect()
    void notifyMarketplaceDeliveryConfirmed({
      transactionId,
      listingTitle: tx.listing?.title ?? 'Producto Marketplace',
      seller: {
        email: tx.seller?.email,
        phone: tx.seller?.phone,
        displayName: tx.seller?.displayName,
      },
    }).catch(() => {})
    return { success: true, data: undefined, message: 'Recepcion confirmada. El admin debe liberar el pago al vendedor.' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

export async function releaseEscrow(transactionId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session || session.role !== 'SUPER') {
    return { success: false, message: 'Solo administradores pueden liberar el pago manualmente' }
  }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    const tx = await db.mpTransaction.findUnique({
      where: { id: transactionId },
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        buyerConfirmedAt: true,
        seller: { select: { email: true, phone: true, displayName: true } },
        disputes: { where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } }, select: { id: true } },
      },
    })
    if (!tx) return { success: false, message: 'Transaccion no encontrada' }
    // DELIVERY_CONFIRMED only: la operacion aun espera conformidad del comprador si esta en IN_ESCROW
    if (tx.status !== 'DELIVERY_CONFIRMED') {
      return { success: false, message: `No se puede liberar desde el estado: ${tx.status}. ${tx.status === 'IN_ESCROW' ? 'La operacion aun espera conformidad del comprador.' : 'Solo se puede liberar cuando el comprador ha confirmado la recepcion.'}` }
    }
    if (!tx.buyerConfirmedAt) {
      return { success: false, message: 'No se puede liberar sin confirmacion del comprador.' }
    }
    if (tx.disputes.length > 0) {
      return { success: false, message: 'No se puede liberar con una disputa activa.' }
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
        reason: 'Pago liberado manualmente por administrador',
      },
    })

    await db.$disconnect()
    void notifyMarketplacePayoutReleased({
      transactionId,
      amount: Number(tx.amount),
      currency: tx.currency,
      seller: {
        email: tx.seller?.email,
        phone: tx.seller?.phone,
        displayName: tx.seller?.displayName,
      },
    }).catch(() => {})
    return { success: true, data: undefined, message: 'Fondos liberados para pago al vendedor.' }
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
    const tx = await db.mpTransaction.findUnique({
      where: { id: transactionId },
      select: {
        id: true,
        buyerId: true,
        sellerId: true,
        status: true,
        buyer: { select: { phone: true, displayName: true } },
        seller: { select: { phone: true, displayName: true } },
      },
    })
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
    void notifyMarketplaceDisputeOpened({
      transactionId,
      buyer: {
        phone: tx.buyer?.phone,
        displayName: tx.buyer?.displayName,
      },
      seller: {
        phone: tx.seller?.phone,
        displayName: tx.seller?.displayName,
      },
    }).catch(() => {})
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
    const tx = await db.mpTransaction.findUnique({
      where: { id: transactionId },
      select: { id: true, buyerId: true, sellerId: true, status: true },
    })
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
      select: {
        id: true,
        buyerId: true,
        sellerId: true,
        listingId: true,
        paymentMethod: true,
        status: true,
        amount: true,
        currency: true,
        platformFeePercent: true,
        platformFeeAmount: true,
        sellerNetAmount: true,
        frozenRate: true,
        frozenRateSource: true,
        frozenRateFechaValor: true,
        rateSnapshotId: true,
        externalTxId: true,
        paymentReference: true,
        paymentSenderBank: true,
        paymentPaidAt: true,
        paymentProofUrl: true,
        escrowHeldAt: true,
        escrowReleaseAt: true,
        releasedAt: true,
        buyerConfirmedAt: true,
        referredBy: true,
        disputeReason: true,
        disputeOpenedAt: true,
        adminNotes: true,
        createdAt: true,
        updatedAt: true,
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

    const completedPayout = await db.mpPayout.findFirst({
      where: {
        status: 'COMPLETED',
        transactionIds: { has: transactionId },
      },
      select: { id: true },
    })

    await db.$disconnect()
    return {
      success: true,
      data: {
        ...tx,
        hasSellerPayoutSent: Boolean(completedPayout),
      },
      message: 'OK',
    }
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
      select: {
        id: true,
        status: true,
        amount: true,
        currency: true,
        paymentMethod: true,
        platformFeeAmount: true,
        sellerNetAmount: true,
        paymentReference: true,
        paymentProofUrl: true,
        createdAt: true,
        escrowReleaseAt: true,
        frozenRate: true,
        frozenRateSource: true,
        frozenRateFechaValor: true,
        rateSnapshotId: true,
        statusHistory: {
          select: { id: true, fromStatus: true, toStatus: true, reason: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
        buyer: { select: { id: true, displayName: true, avatarUrl: true } },
        seller: { select: { id: true, displayName: true, avatarUrl: true } },
        listing: { select: { id: true, title: true, slug: true, coverImageUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const txIds = txs.map((tx: { id: string }) => tx.id)
    const completedPayouts = txIds.length
      ? await db.mpPayout.findMany({
        where: {
          status: 'COMPLETED',
          transactionIds: { hasSome: txIds },
        },
        select: { transactionIds: true },
      })
      : []

    const txIdSet = new Set(txIds)
    const payoutSentTxIds = new Set(
      completedPayouts
        .flatMap((payout: { transactionIds: string[] }) => payout.transactionIds)
        .filter((id: string): id is string => txIdSet.has(id)),
    )

    const txsWithPayoutFlag = txs.map((tx: { id: string }) => ({
      ...tx,
      hasSellerPayoutSent: payoutSentTxIds.has(tx.id),
    }))

    await db.$disconnect()
    return { success: true, data: txsWithPayoutFlag, message: 'OK' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

export async function checkoutCart(
  items: Array<{ listingId: string; paymentMethod: string; quantity?: number }>,
): Promise<ActionResult<{ orderId: string; transactions: Array<{ transactionId: string; listingId: string; idempotencyKey: string }>; totalAmount: number }>> {
  const session = await getSession()
  if (!session) return { success: false, message: 'Debes iniciar sesion para comprar' }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  const transactions: Array<{ transactionId: string; listingId: string; idempotencyKey: string }> = []
  const errorMessages: string[] = []
  const totalRequested = items.reduce(
    (sum, item) => sum + Math.max(1, Math.floor(item.quantity ?? 1)),
    0,
  )

  try {
    if (items.length === 0) {
      return { success: false, message: 'El carrito esta vacio' }
    }

    const mappedPaymentMethod = mapCheckoutPaymentMethod(items[0]?.paymentMethod ?? '')
    if (!mappedPaymentMethod) {
      return { success: false, message: 'Metodo de pago no soportado por el checkout actual' }
    }

    const normalizedItems = items.map(item => ({
      listingId: item.listingId,
      quantity: Math.max(1, Math.floor(item.quantity ?? 1)),
    }))
    const schemaCapabilities = await getMarketplaceSchemaCapabilities(db)
    const listingIds = [...new Set(normalizedItems.map(item => item.listingId))]
    const listings = await db.mpListing.findMany({
      where: { id: { in: listingIds } },
      select: {
        id: true,
        status: true,
        sellerId: true,
        price: true,
        currency: true,
        hasInventory: true,
        inventory: true,
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
    }) as CheckoutListingRow[]
    const byId = new Map<string, CheckoutListingRow>(listings.map((listing) => [listing.id, listing]))
    const currency = listings[0]?.currency ?? 'USD'

    for (const item of normalizedItems) {
      const listing = byId.get(item.listingId)
      if (!listing) {
        errorMessages.push(`Listing no encontrado: ${item.listingId}`)
        continue
      }
      if (listing.status !== 'ACTIVE') {
        errorMessages.push(`${item.listingId}: listing no disponible`)
        continue
      }
      if (listing.sellerId === session.userId) {
        errorMessages.push(`${item.listingId}: no puedes comprar tu propio listing`)
        continue
      }
      if (listing.currency !== currency) {
        errorMessages.push(`${item.listingId}: moneda distinta no soportada en una orden consolidada`)
        continue
      }

      // Pre-check: si listing tiene inventory, al menos debe haber 1 disponible (el in-transaction es definitive)
      if (listing.hasInventory && listing.inventory != null && listing.inventory < 1) {
        errorMessages.push(`${item.listingId}: agotado`)
      }
    }

    if (errorMessages.length > 0) {
      return { success: false, message: errorMessages.join('; ') }
    }

    const prepared = await Promise.all(normalizedItems.map(async item => {
      const listing = byId.get(item.listingId)!
      const sellerPayoutMethod = mapSellerPayoutMethod(listing.seller.payoutMethods[0]?.methodType)
      const rateContext = await resolvePurchaseRateContext(mappedPaymentMethod, sellerPayoutMethod)
      if (!rateContext.success || !rateContext.data) {
        throw new Error(rateContext.message)
      }
      const unitPrice = Number(listing.price)
      const amount = unitPrice * item.quantity
      const fee = calcFee(amount, mappedPaymentMethod, sellerPayoutMethod, rateContext.data.bcvRate, rateContext.data.binanceRate)
      const referralContext = await getReferralPurchaseContext(db, session.userId, item.listingId)
      return { item, listing, unitPrice, amount, fee, rateContext: rateContext.data, referralContext }
    }))
    const totalAmount = prepared.reduce((sum, row) => sum + row.amount, 0)

    const result = await db.$transaction(async (prisma: any) => {
      for (const row of prepared) {
        const latestListing = await prisma.mpListing.findUnique({
          where: { id: row.item.listingId },
          select: { hasInventory: true, inventory: true },
        })
        if (!latestListing) throw new Error(`Listing no encontrado: ${row.item.listingId}`)
        // Atomic decrement — mas fiable que count() con pg-adapter
        if (latestListing.hasInventory && latestListing.inventory != null) {
          if (latestListing.inventory < row.item.quantity) {
            throw new Error(latestListing.inventory <= 0 ? `${row.item.listingId}: agotado` : `${row.item.listingId}: solo quedan ${latestListing.inventory} disponibles`)
          }
          await prisma.mpListing.update({
            where: { id: row.item.listingId },
            data: { inventory: { decrement: row.item.quantity } },
          })
        }
      }

      const order = schemaCapabilities.hasOrders
        ? await prisma.mpOrder.create({
            data: {
              buyerId: session.userId,
              paymentMethod: mappedPaymentMethod,
              status: 'PENDING_PAYMENT',
              amount: String(totalAmount),
              currency,
            },
            select: { id: true },
          })
        : null

      for (const row of prepared) {
        const idempotencyKey = `${session.userId}_${row.item.listingId}_${row.item.quantity}_${Date.now()}`
        const record = await createMarketplaceTransaction(prisma, schemaCapabilities, {
          idempotencyKey,
          orderId: order?.id ?? null,
          buyerId: session.userId,
          sellerId: row.listing.sellerId,
          listingId: row.item.listingId,
          paymentMethod: mappedPaymentMethod,
          status: 'PENDING_PAYMENT',
          amount: String(row.amount),
          currency,
          quantity: row.item.quantity,
          unitPrice: String(row.unitPrice),
          platformFeePercent: String(row.fee.platformFeePercent),
          platformFeeAmount: String(row.fee.platformFeeAmount),
          sellerNetAmount: String(row.fee.sellerNetAmount),
          frozenRate: row.rateContext.frozenRate,
          frozenRateSource: row.rateContext.frozenRateSource,
          frozenRateFechaValor: row.rateContext.frozenRateFechaValor,
          rateSnapshotId: row.rateContext.rateSnapshotId,
          adminNotes: row.item.quantity > 1
            ? `Cantidad: ${row.item.quantity}. ${row.rateContext.adminNotes}`
            : row.rateContext.adminNotes,
          referredBy: row.referralContext?.referredBy ?? null,
        })

        await prisma.mpTransactionStatusHistory.create({
          data: {
            transactionId: record.id,
            toStatus: 'PENDING_PAYMENT',
            changedBy: session.userId,
            reason: order
              ? `Orden consolidada ${order.id}. Cantidad: ${row.item.quantity}. Esperando comprobante de pago.`
              : `Checkout carrito legacy. Cantidad: ${row.item.quantity}. Esperando comprobante de pago.`,
          },
        })

        transactions.push({ transactionId: record.id, listingId: row.item.listingId, idempotencyKey })
      }

      return {
        orderId: order?.id ?? `${LEGACY_CART_ORDER_PREFIX}${transactions.map(transaction => transaction.transactionId).join(',')}`,
      }
    })

    await db.$disconnect()

    const convertedRows = prepared.filter(row => row.referralContext)
    if (convertedRows.length > 0) {
      clearReferralCookie()
      for (const row of convertedRows) {
        const transaction = transactions.find(tx => tx.listingId === row.item.listingId)
        if (transaction && row.referralContext) {
          void processReferralConversion(transaction.transactionId, row.referralContext.referralCode, row.amount).catch(() => {})
        }
      }
    }

    return {
      success: true,
      data: { orderId: result.orderId, transactions, totalAmount },
      message: `${transactions.length} de ${normalizedItems.length} lineas preparadas (${totalRequested} articulos)`,
    }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'No se pudo iniciar la orden consolidada' }
  }
}

async function submitLegacyCartPaymentProof(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  session: { userId: string },
  orderId: string,
  reference: string,
  details: {
    senderBank?: string | null
    paymentDate: string
  },
  proofUrl?: string,
): Promise<ActionResult<{ orderId: string }>> {
  try {
    const transactionIds = orderId
      .slice(LEGACY_CART_ORDER_PREFIX.length)
      .split(',')
      .map(id => id.trim())
      .filter(Boolean)

    if (transactionIds.length === 0) {
      return { success: false, message: 'Orden legacy sin transacciones' }
    }

    const transactions = await db.mpTransaction.findMany({
      where: { id: { in: transactionIds } },
      select: { id: true, buyerId: true, status: true, paymentMethod: true },
    })

    if (transactions.length !== transactionIds.length) return { success: false, message: 'Una o mas transacciones no existen' }
    if (transactions.some((tx: { buyerId: string }) => tx.buyerId !== session.userId)) return { success: false, message: 'Sin permiso' }

    const invalidTx = transactions.find((tx: { status: string }) => tx.status !== 'INITIATED' && tx.status !== 'PENDING_PAYMENT')
    if (invalidTx) return { success: false, message: `Estado invalido para reportar pago: ${invalidTx.status}` }

    const cleanReference = reference.trim()
    if (!cleanReference) return { success: false, message: 'La referencia de pago es obligatoria' }

    const isBinancePayment = transactions[0]?.paymentMethod === 'CRYPTO_WALLET_MANUAL'
    const cleanSenderBank = details.senderBank?.trim() ?? ''
    if (!isBinancePayment && !cleanSenderBank) return { success: false, message: 'El banco emisor es obligatorio' }
    if (!proofUrl?.trim()) return { success: false, message: 'El comprobante de pago es obligatorio' }
    if (!details.paymentDate.trim()) return { success: false, message: 'La fecha de pago es obligatoria' }

    const paidAt = new Date(`${details.paymentDate}T12:00:00-04:00`)
    if (Number.isNaN(paidAt.getTime())) return { success: false, message: 'La fecha de pago no es valida' }

    await db.$transaction(async (prisma: any) => {
      for (const tx of transactions) {
        await prisma.mpTransaction.update({
          where: { id: tx.id },
          data: {
            status: 'PAYMENT_RECEIVED',
            paymentReference: cleanReference,
            paymentSenderBank: isBinancePayment ? null : cleanSenderBank,
            paymentPaidAt: paidAt,
            paymentProofUrl: proofUrl ?? null,
          },
        })

        await prisma.mpTransactionStatusHistory.create({
          data: {
            transactionId: tx.id,
            fromStatus: tx.status,
            toStatus: 'PAYMENT_RECEIVED',
            changedBy: session.userId,
            reason: isBinancePayment
              ? `Comprobante Binance enviado para checkout legacy. Operacion: ${cleanReference}. Fecha: ${details.paymentDate}`
              : `Comprobante enviado para checkout legacy. Banco: ${cleanSenderBank}. Operacion: ${cleanReference}. Fecha: ${details.paymentDate}`,
          },
        })
      }
    })

    return {
      success: true,
      data: { orderId },
      message: 'Pago reportado. Cada vendedor avanzara su entrega por separado.',
    }
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function submitOrderPaymentProof(
  orderId: string,
  reference: string,
  details: {
    senderBank?: string | null
    paymentDate: string
  },
  proofUrl?: string,
): Promise<ActionResult<{ orderId: string }>> {
  const session = await getSession()
  if (!session) return { success: false, message: 'No autenticado' }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    if (orderId.startsWith(LEGACY_CART_ORDER_PREFIX)) {
      return await submitLegacyCartPaymentProof(db, session, orderId, reference, details, proofUrl)
    }

    const order = await db.mpOrder.findUnique({
      where: { id: orderId },
      include: {
        transactions: {
          select: { id: true, status: true, paymentMethod: true },
        },
      },
    })

    if (!order) return { success: false, message: 'Orden no encontrada' }
    if (order.buyerId !== session.userId) return { success: false, message: 'Sin permiso' }
    if (order.transactions.length === 0) return { success: false, message: 'La orden no tiene transacciones' }

    const invalidTx = order.transactions.find((tx: { status: string }) => tx.status !== 'INITIATED' && tx.status !== 'PENDING_PAYMENT')
    if (invalidTx) {
      return { success: false, message: `Estado invalido para reportar pago: ${invalidTx.status}` }
    }

    const cleanReference = reference.trim()
    if (!cleanReference) return { success: false, message: 'La referencia de pago es obligatoria' }

    const isBinancePayment = order.paymentMethod === 'CRYPTO_WALLET_MANUAL'
    const cleanSenderBank = details.senderBank?.trim() ?? ''
    if (!isBinancePayment && !cleanSenderBank) return { success: false, message: 'El banco emisor es obligatorio' }
    if (!proofUrl?.trim()) return { success: false, message: 'El comprobante de pago es obligatorio' }
    if (!details.paymentDate.trim()) return { success: false, message: 'La fecha de pago es obligatoria' }

    const paidAt = new Date(`${details.paymentDate}T12:00:00-04:00`)
    if (Number.isNaN(paidAt.getTime())) {
      return { success: false, message: 'La fecha de pago no es valida' }
    }

    await db.$transaction(async (prisma: any) => {
      await prisma.mpOrder.update({
        where: { id: orderId },
        data: {
          status: 'PAYMENT_RECEIVED',
          paymentReference: cleanReference,
          paymentSenderBank: isBinancePayment ? null : cleanSenderBank,
          paymentPaidAt: paidAt,
          paymentProofUrl: proofUrl ?? null,
        },
      })

      for (const tx of order.transactions) {
        await prisma.mpTransaction.update({
          where: { id: tx.id },
          data: {
            status: 'PAYMENT_RECEIVED',
            paymentReference: cleanReference,
            paymentSenderBank: isBinancePayment ? null : cleanSenderBank,
            paymentPaidAt: paidAt,
            paymentProofUrl: proofUrl ?? null,
          },
        })

        await prisma.mpTransactionStatusHistory.create({
          data: {
            transactionId: tx.id,
            fromStatus: tx.status,
            toStatus: 'PAYMENT_RECEIVED',
            changedBy: session.userId,
            reason: isBinancePayment
              ? `Comprobante Binance enviado para orden ${orderId}. Operacion: ${cleanReference}. Fecha: ${details.paymentDate}`
              : `Comprobante enviado para orden ${orderId}. Banco: ${cleanSenderBank}. Operacion: ${cleanReference}. Fecha: ${details.paymentDate}`,
          },
        })
      }
    })

    await db.$disconnect()
    return {
      success: true,
      data: { orderId },
      message: 'Pago de orden reportado. Cada vendedor avanzara por su entrega independiente.',
    }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'No se pudo reportar el pago de la orden' }
  }
}
