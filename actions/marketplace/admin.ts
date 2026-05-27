'use server'

import { getDb } from '@/lib/marketplace/db'
import { getSession } from '@/lib/marketplace/auth'
import type { ActionResult } from '@/lib/validations/marketplace'
import { sendSystemMessage } from '@/actions/marketplace/chat'
import { sendMarketplaceEmail } from '@/lib/email/send'
import { sendMarketplaceWhatsapp } from '@/lib/whatsapp/marketplace-notifications'

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
  // Inventory is decremented at purchase initiation; do not sum legacy TX columns.
  return 0
}

function getMarketplaceBaseUrl(): string {
  return process.env.APP_URL?.replace(/\/+$/, '') ?? 'https://turpialsong.com'
}

function buildMarketplaceTransactionUrl(transactionId: string): string {
  const baseUrl = getMarketplaceBaseUrl()
  return `${baseUrl}/marketplace/dashboard?txId=${encodeURIComponent(transactionId)}`
}

function buildTxCode(transactionId: string): string {
  return transactionId.slice(-8).toUpperCase()
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
        { recipientName: buyerName, recipientRole: 'buyer', listingTitle, txCode, txUrl },
      ),
    )
  }

  if (params.buyer.phone?.trim()) {
    notifications.push(
      sendMarketplaceWhatsapp(
        'mp_payment_approved',
        { phone: params.buyer.phone, name: buyerName },
        { txId: params.transactionId, txCode, listingTitle },
      ),
    )
  }

  if (params.seller.email?.trim()) {
    notifications.push(
      sendMarketplaceEmail(
        'payment_approved',
        { email: params.seller.email, name: sellerName },
        { recipientName: sellerName, recipientRole: 'seller', listingTitle, txCode, txUrl },
      ),
    )
  }

  if (params.seller.phone?.trim()) {
    notifications.push(
      sendMarketplaceWhatsapp(
        'mp_payment_approved',
        { phone: params.seller.phone, name: sellerName },
        { txId: params.transactionId, txCode, listingTitle },
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
}): Promise<{
  hasEmail: boolean
  hasPhone: boolean
  emailSent: boolean
  whatsappSent: boolean
  emailReason: string | null
  whatsappReason: string | null
}> {
  const txCode = buildTxCode(params.transactionId)
  const txUrl = buildMarketplaceTransactionUrl(params.transactionId)
  const sellerName = params.seller.displayName?.trim() || 'Vendedor'
  const hasEmail = Boolean(params.seller.email?.trim())
  const hasPhone = Boolean(params.seller.phone?.trim())
  let emailSent = false
  let whatsappSent = false
  let emailReason: string | null = hasEmail ? 'not_sent' : 'missing_email'
  let whatsappReason: string | null = hasPhone ? 'not_sent' : 'missing_phone'

  if (hasEmail) {
    const emailResult = await sendMarketplaceEmail(
      'payout_released',
      { email: params.seller.email!, name: sellerName },
      {
        sellerName,
        amount: params.amount,
        currency: params.currency,
        txCode,
        txUrl,
      },
    )
    emailSent = emailResult.sent
    emailReason = emailResult.reason ?? (emailResult.sent ? 'sent' : 'not_sent')
  }

  if (hasPhone) {
    const whatsappResult = await sendMarketplaceWhatsapp(
      'mp_payout_released',
      { phone: params.seller.phone!, name: sellerName },
      {
        txId: params.transactionId,
        txCode,
        amount: params.amount,
        currency: params.currency,
      },
    )
    whatsappSent = whatsappResult.sent
    whatsappReason = whatsappResult.reason ?? (whatsappResult.sent ? 'sent' : 'not_sent')
  }

  return { hasEmail, hasPhone, emailSent, whatsappSent, emailReason, whatsappReason }
}

async function notifyMarketplacePayoutSent(params: {
  transactionId: string
  amount: number
  currency: string
  seller: { email?: string | null; phone?: string | null; displayName?: string | null }
}): Promise<{
  hasEmail: boolean
  hasPhone: boolean
  emailSent: boolean
  whatsappSent: boolean
  emailReason: string | null
  whatsappReason: string | null
}> {
  const txCode = buildTxCode(params.transactionId)
  const txUrl = buildMarketplaceTransactionUrl(params.transactionId)
  const sellerName = params.seller.displayName?.trim() || 'Vendedor'
  const hasEmail = Boolean(params.seller.email?.trim())
  const hasPhone = Boolean(params.seller.phone?.trim())
  let emailSent = false
  let whatsappSent = false
  let emailReason: string | null = hasEmail ? 'not_sent' : 'missing_email'
  let whatsappReason: string | null = hasPhone ? 'not_sent' : 'missing_phone'

  if (hasEmail) {
    const emailResult = await sendMarketplaceEmail(
      'payout_sent',
      { email: params.seller.email!, name: sellerName },
      {
        sellerName,
        amount: params.amount,
        currency: params.currency,
        txCode,
        txUrl,
      },
    )
    emailSent = emailResult.sent
    emailReason = emailResult.reason ?? (emailResult.sent ? 'sent' : 'not_sent')
  }

  if (hasPhone) {
    const whatsappResult = await sendMarketplaceWhatsapp(
      'mp_payout_sent',
      { phone: params.seller.phone!, name: sellerName },
      {
        txId: params.transactionId,
        txCode,
        amount: params.amount,
        currency: params.currency,
      },
    )
    whatsappSent = whatsappResult.sent
    whatsappReason = whatsappResult.reason ?? (whatsappResult.sent ? 'sent' : 'not_sent')
  }

  return { hasEmail, hasPhone, emailSent, whatsappSent, emailReason, whatsappReason }
}

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface AdminStats {
  totalTransactions: number
  escrowActiveValue: number
  pendingValidation: number
  pendingPayments: number
  activeListings: number
  totalUsers: number
  openDisputes: number
  releasedThisMonth: number
  platformFeesEarned: number
  totalSoldValue: number
  pendingSellerPayoutValue: number
  payoutsReadyCount: number
  missingPayoutMethodValue: number
  missingPayoutMethodCount: number
}

import { PLATFORM_FEE_RATE, INTERBANK_FEE_VES_RATE, USDT_FLAT_FEE, IVA_RATE } from '@/lib/marketplace/fees'

export interface PayoutDetail {
  label: string
  value: string
}

export interface PayoutReportRow {
  sellerId: string
  sellerName: string
  payoutMethodId: string | null
  payoutMethodType: string
  payoutAccount: string
  payoutMethodIsDefault: boolean
  payoutDetails: PayoutDetail[]
  hasPayoutMethod: boolean
  grossAmount: number
  feeAmount: number
  netAmount: number
  currency: string
  transactionCount: number
  transactionIds: string[]
  oldestTransactionDate: string
  // ── Nuevos campos para CSV separado ──
  titular: string
  cedula: string
  telefono: string
  numeroCuenta: string
  banco: string
  payId: string
  email: string
  paymentCurrency: string
  exchangeRate: string
  fechaValor: string
  source: 'seller' | 'referral'
  referralReference: string
  ivaAmount: number
  bcvRate: string
  binanceRate: string
  netoBs: number
  netoUsdt: number
  rateSource: string
  interbankFee: number
}

export interface EscrowItem {
  id: string
  buyer: { id: string; displayName: string }
  seller: { id: string; displayName: string; defaultPayout?: string }
  listing: { id: string; title: string }
  amount: number
  platformFeeAmount: number
  sellerNetAmount: number
  currency: string
  paymentMethod: string
  status: string
  escrowHeldAt: string | null
  escrowReleaseAt: string | null
  buyerConfirmedAt: string | null
  disputeOpenedAt: string | null
  adminNotes: string | null
  paymentReference: string | null
  paymentSenderBank: string | null
  paymentPaidAt: string | null
  paymentProofUrl: string | null
  createdAt: string
}

export interface SellerPayoutAuditRow {
  transactionId: string
  createdAt: string
  listingTitle: string
  buyerName: string
  buyerEmail: string | null
  sellerName: string
  sellerEmail: string | null
  status: string
  amount: number
  currency: string
  paymentMethod: string
  platformFeePercent: number | null
  platformFeeAmount: number | null
  sellerNetAmount: number | null
  releasedAt: string | null
  payoutId: string | null
  payoutAmount: number | null
  payoutStatus: string | null
  payoutMethod: string | null
  externalPayoutId: string | null
  payoutCreatedAt: string | null
  payoutUpdatedAt: string | null
  payoutCompletedAt: string | null
  payoutAmountMismatch: boolean
  releasedWithoutPayout: boolean
  completedPayout: boolean
  pendingPayout: boolean
  payoutCompletedButTxNotReleased: boolean
  missingSellerNetAmount: boolean
  missingPayoutAmount: boolean
}

export interface PayoutReportRow {
  sellerId: string
  sellerName: string
  payoutMethodId: string | null
  payoutMethodType: string
  payoutAccount: string
  payoutMethodIsDefault: boolean
  payoutDetails: PayoutDetail[]
  hasPayoutMethod: boolean
  grossAmount: number
  feeAmount: number
  netAmount: number
  currency: string
  transactionCount: number
  transactionIds: string[]
  oldestTransactionDate: string
}

export interface AdminUserRow {
  id: string
  displayName: string
  email: string
  phone: string | null
  whatsappConsent: boolean
  isSeller: boolean
  isVerified: boolean
  isBanned: boolean
  role: string
  totalSales: number
  totalPurchases: number
  createdAt: string
}

export type EscrowFilter =
  | 'all'
  | 'operations'
  | 'PAYMENT_RECEIVED'
  | 'IN_ESCROW'
  | 'VALIDATING'
  | 'DELIVERY_CONFIRMED'
  | 'DISPUTED'
  | 'RELEASED'
  | 'expiring'

// ─── AUTH GUARD ───────────────────────────────────────────────────────────────

async function requireSuper() {
  const session = await getSession()
  if (!session || session.role !== 'SUPER') {
    throw new Error('Requiere rol SUPER')
  }
  return session
}

function parsePayoutDetails(encryptedData: string | null | undefined): PayoutDetail[] {
  if (!encryptedData) return []

  try {
    const parsed = JSON.parse(encryptedData) as Record<string, unknown>
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return []

    return Object.entries(parsed).map(([key, value]) => ({
      label: key,
      value: typeof value === 'string' ? value : JSON.stringify(value ?? ''),
    }))
  } catch {
    return []
  }
}

/** Extract individual bank fields from encryptedData for CSV columns */
function extractBankFields(encryptedData: string | null | undefined): {
  titular: string; cedula: string; telefono: string; numeroCuenta: string; banco: string; payId: string; email: string
} {
  const fields = { titular: '', cedula: '', telefono: '', numeroCuenta: '', banco: '', payId: '', email: '' }
  if (!encryptedData) return fields
  try {
    const d = JSON.parse(encryptedData) as Record<string, unknown>
    if (!d || typeof d !== 'object' || Array.isArray(d)) return fields
    const s = (k: string) => typeof d[k] === 'string' ? d[k] as string : ''
    fields.titular = s('titular') || s('name') || s('fullName') || s('beneficiary') || ''
    fields.cedula = s('cedula') || s('ci') || s('dni') || s('document') || s('idNumber') || ''
    fields.telefono = s('telefono') || s('phone') || s('celular') || s('mobile') || ''
    fields.numeroCuenta = s('numeroCuenta') || s('accountNumber') || s('cuenta') || s('bankAccount') || ''
    fields.banco = s('banco') || s('bank') || s('bankName') || s('bankCode') || ''
    fields.payId = s('payId') || s('payID') || s('binanceId') || s('binancePayId') || s('email') || ''
    fields.email = s('email') || s('correo') || s('mail') || ''
  } catch { /* ignore */ }
  return fields
}

/** Query snapshot tables for BCV & Binance rates for each unique fechaValor and populate neto columns */
async function enrichPayoutRowsWithRates(rows: PayoutReportRow[]): Promise<void> {
  if (rows.length === 0) return

  const db = await getDb()
  if (!db) return

  try {
    const uniqueFechas = [...new Set(rows.map(r => r.fechaValor).filter(Boolean))]
    const ratesMap = new Map<string, { bcvRate: number | null; binanceRate: number | null }>()

    for (const fecha of uniqueFechas) {
      const date = new Date(fecha as string)
      const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)

      const [bcv, binance] = await Promise.all([
        db.mpReferenceRateSnapshot.findFirst({
          where: { fechaValor: { gte: start, lt: end } },
          orderBy: { fechaValor: 'desc' },
          select: { rate: true },
        }),
        db.mpBinanceRateSnapshot.findFirst({
          where: { fechaValor: { gte: start, lt: end } },
          orderBy: { fechaValor: 'desc' },
          select: { rate: true },
        }),
      ])

      ratesMap.set(fecha as string, {
        bcvRate: bcv ? Number(bcv.rate) : null,
        binanceRate: binance ? Number(binance.rate) : null,
      })
    }

    function parseRate(str: string): number | null {
      const n = parseFloat(str)
      return Number.isFinite(n) && n > 0 ? n : null
    }

    for (const row of rows) {
      const rates = row.fechaValor ? ratesMap.get(row.fechaValor) : null
      let bcv: number | null = rates?.bcvRate ?? null
      let binance: number | null = rates?.binanceRate ?? null

      const fallback = parseRate(row.exchangeRate)
      if (bcv == null && fallback != null) bcv = fallback
      if (binance == null && fallback != null) binance = fallback

      row.bcvRate = bcv != null ? String(bcv) : ''
      row.binanceRate = binance != null ? String(binance) : ''

      const b = bcv != null && bcv > 0 ? bcv : 0
      const bi = binance != null && binance > 0 ? binance : 0
      const isUSDT = row.paymentCurrency === 'USDT'

      if (isUSDT) {
        row.netoUsdt = Math.round(row.netAmount * 100) / 100
        row.netoBs = 0
        row.interbankFee = USDT_FLAT_FEE
      } else {
        const rate = row.rateSource === 'BINANCE' ? bi : b
        row.netoBs = rate > 0 ? Math.round(row.netAmount * rate * 100) / 100 : 0
        row.netoUsdt = 0
        const afterPlatform = row.grossAmount - row.feeAmount
        row.interbankFee = afterPlatform > 0 ? Math.round(afterPlatform * INTERBANK_FEE_VES_RATE * 100) / 100 : 0
      }
    }
  } catch {
    // enrichment fails gracefully — rows keep default empty values
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

// ─── GET ADMIN STATS ──────────────────────────────────────────────────────────

export async function getAdminStats(): Promise<ActionResult<AdminStats>> {
  try {
    await requireSuper()
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Sin permiso' }
  }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      totalTx,
      escrowAgg,
      pendingVal,
      pendingPayments,
      activeListings,
      totalUsers,
      openDisputes,
      relMonth,
      feesAgg,
      totalSoldAgg,
      releasedForPayout,
    ] =
      await Promise.all([
        db.mpTransaction.count(),
        db.mpTransaction.aggregate({
          where: { status: { in: ['IN_ESCROW', 'DELIVERY_CONFIRMED'] } },
          _sum: { amount: true },
        }),
        db.mpTransaction.count({ where: { status: { in: ['PAYMENT_RECEIVED', 'VALIDATING'] } } }),
        db.mpTransaction.count({ where: { status: 'PENDING_PAYMENT' } }),
        db.mpListing.count({ where: { status: 'ACTIVE' } }),
        db.mpUser.count(),
        db.mpDispute.count({ where: { status: 'OPEN' } }),
        db.mpTransaction.count({
          where: { status: 'RELEASED', updatedAt: { gte: startOfMonth } },
        }),
        db.mpTransaction.aggregate({
          where: { status: 'RELEASED', updatedAt: { gte: startOfMonth } },
          _sum: { platformFeeAmount: true },
        }),
        db.mpTransaction.aggregate({
          where: { status: { in: ['IN_ESCROW', 'DELIVERY_CONFIRMED', 'RELEASED'] } },
          _sum: { amount: true },
        }),
        db.mpTransaction.findMany({
          where: { status: 'RELEASED' },
          select: {
            sellerNetAmount: true,
            seller: {
              select: {
                payoutMethods: {
                  where: { isActive: true },
                  orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
                  select: { id: true },
                  take: 1,
                },
              },
            },
          },
        }),
      ])

    await db.$disconnect()
    const payoutStatusRows = releasedForPayout as Array<{
      sellerNetAmount: unknown
      seller: { payoutMethods: unknown[] }
    }>
    const readyPayouts = payoutStatusRows.filter(tx => tx.seller.payoutMethods.length > 0)
    const missingMethodPayouts = payoutStatusRows.filter(tx => tx.seller.payoutMethods.length === 0)

    return {
      success: true,
      data: {
        totalTransactions: totalTx,
        escrowActiveValue: Number(escrowAgg._sum.amount ?? 0),
        pendingValidation: pendingVal,
        pendingPayments,
        activeListings,
        totalUsers,
        openDisputes,
        releasedThisMonth: relMonth,
        platformFeesEarned: Number(feesAgg._sum.platformFeeAmount ?? 0),
        totalSoldValue: Number(totalSoldAgg._sum.amount ?? 0),
        pendingSellerPayoutValue: readyPayouts.reduce((sum, tx) => sum + Number(tx.sellerNetAmount), 0),
        payoutsReadyCount: readyPayouts.length,
        missingPayoutMethodValue: missingMethodPayouts.reduce((sum, tx) => sum + Number(tx.sellerNetAmount), 0),
        missingPayoutMethodCount: missingMethodPayouts.length,
      },
      message: 'OK',
    }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

// ─── GET ESCROW LIST ──────────────────────────────────────────────────────────

export async function getEscrowList(filter: EscrowFilter = 'all'): Promise<ActionResult<EscrowItem[]>> {
  try {
    await requireSuper()
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Sin permiso' }
  }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    const now = new Date()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let where: any = {}
    if (filter === 'expiring') {
      where = {
        status: 'IN_ESCROW',
        escrowReleaseAt: { lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) },
      }
    } else if (filter === 'operations') {
      where = {
        status: {
          in: ['PENDING_PAYMENT', 'PAYMENT_RECEIVED', 'VALIDATING', 'IN_ESCROW', 'DELIVERY_CONFIRMED', 'DISPUTED', 'RELEASED'],
        },
      }
    } else if (filter !== 'all') {
      where = { status: filter }
    }

    const txs = await db.mpTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        buyer: { select: { id: true, displayName: true } },
        seller: {
          select: {
            id: true,
            displayName: true,
            payoutMethods: {
              where: { isActive: true },
              select: { displayLabel: true },
              orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
              take: 1,
            },
          },
        },
        listing: { select: { id: true, title: true } },
      },
    })

    await db.$disconnect()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: EscrowItem[] = txs.map((t: any) => ({
      id: t.id,
      buyer: { id: t.buyer.id, displayName: t.buyer.displayName },
      seller: {
        id: t.seller.id,
        displayName: t.seller.displayName,
        defaultPayout: t.seller.payoutMethods[0]?.displayLabel,
      },
      listing: { id: t.listing.id, title: t.listing.title },
      amount: Number(t.amount),
      platformFeeAmount: Number(t.platformFeeAmount),
      sellerNetAmount: Number(t.sellerNetAmount),
      currency: t.currency,
      paymentMethod: t.paymentMethod,
      status: t.status,
      escrowHeldAt: t.escrowHeldAt?.toISOString() ?? null,
      escrowReleaseAt: t.escrowReleaseAt?.toISOString() ?? null,
      buyerConfirmedAt: t.buyerConfirmedAt?.toISOString() ?? null,
      disputeOpenedAt: t.disputeOpenedAt?.toISOString() ?? null,
      adminNotes: t.adminNotes,
      paymentReference: t.paymentReference,
      paymentSenderBank: t.paymentSenderBank,
      paymentPaidAt: t.paymentPaidAt?.toISOString() ?? null,
      paymentProofUrl: t.paymentProofUrl,
      createdAt: t.createdAt.toISOString(),
    }))

    return { success: true, data: items, message: 'OK' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

// ─── GET PAYOUT REPORT ────────────────────────────────────────────────────────

export async function getPayoutReport(): Promise<ActionResult<PayoutReportRow[]>> {
  try {
    await requireSuper()
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Sin permiso' }
  }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    const txs = await db.mpTransaction.findMany({
      where: { status: 'RELEASED' },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        amount: true,
        currency: true,
        sellerId: true,
        paymentMethod: true,
        platformFeeAmount: true,
        sellerNetAmount: true,
        frozenRate: true,
        frozenRateSource: true,
        frozenRateFechaValor: true,
        createdAt: true,
        seller: {
          select: {
            id: true,
            displayName: true,
            email: true,
            phone: true,
            payoutMethods: {
              where: { isActive: true },
              select: {
                id: true,
                displayLabel: true,
                methodType: true,
                encryptedData: true,
                currency: true,
                isDefault: true,
              },
              orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
              take: 1,
            },
          },
        },
      },
    })

    await db.$disconnect()

    const sellerMap = new Map<string, PayoutReportRow>()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const tx of txs as any[]) {
      const existing = sellerMap.get(tx.sellerId)
      const gross = Number(tx.amount)
      const fee = Number(tx.platformFeeAmount)
      const net = Number(tx.sellerNetAmount)

      if (existing) {
        existing.grossAmount = Math.round((existing.grossAmount + gross) * 100) / 100
        existing.feeAmount = Math.round((existing.feeAmount + fee) * 100) / 100
        existing.netAmount = Math.round((existing.netAmount + net) * 100) / 100
        existing.transactionCount++
        existing.transactionIds.push(tx.id)
      } else {
        const payout = tx.seller.payoutMethods[0]
        const bank = extractBankFields(payout?.encryptedData)
        
        // Determine payment currency: USDT only if buyer paid in USDT AND seller collects in USDT
        const buyerPaymentIsUSDT = tx.paymentMethod === 'BINANCE_PAY' || tx.paymentMethod === 'CRYPTO_WALLET' || tx.currency === 'USDT'
        const sellerPayoutIsUSDT = payout?.methodType === 'BINANCE_PAY' || payout?.methodType === 'CRYPTO_WALLET' || payout?.currency === 'USDT'
        const paymentCurrency = buyerPaymentIsUSDT && sellerPayoutIsUSDT ? 'USDT' : 'VES'
        const usedFrozenRate = tx.frozenRate ? String(tx.frozenRate) : ''
        const usedRateSource = tx.frozenRateSource || ''
        const usedFechaValor = tx.frozenRateFechaValor ? new Date(tx.frozenRateFechaValor).toISOString().slice(0, 10) : new Date(tx.createdAt).toISOString().slice(0, 10)
        
        sellerMap.set(tx.sellerId, {
          sellerId: tx.sellerId,
          sellerName: tx.seller.displayName,
          payoutMethodId: payout?.id ?? null,
          payoutMethodType: payout?.methodType ?? 'UNKNOWN',
          payoutAccount: payout?.displayLabel ?? 'Falta metodo de cobro',
          payoutMethodIsDefault: payout?.isDefault ?? false,
          payoutDetails: parsePayoutDetails(payout?.encryptedData),
          hasPayoutMethod: Boolean(payout),
          grossAmount: gross,
          feeAmount: fee,
          netAmount: net,
          currency: tx.currency,
          transactionCount: 1,
          transactionIds: [tx.id],
          oldestTransactionDate: tx.createdAt.toISOString(),
          titular: bank.titular,
          cedula: bank.cedula,
          telefono: bank.telefono || (tx.seller.phone ?? ''),
          numeroCuenta: bank.numeroCuenta,
          banco: bank.banco,
          payId: bank.payId,
          email: bank.email || (tx.seller.email ?? ''),
          paymentCurrency,
          exchangeRate: usedFrozenRate,
          fechaValor: usedFechaValor,
          source: 'seller' as const,
          referralReference: '',
          ivaAmount: 0,
          bcvRate: '',
          binanceRate: '',
          netoBs: 0,
          netoUsdt: 0,
          rateSource: usedRateSource,
          interbankFee: 0,
        })
      }
    }

    return { success: true, data: Array.from(sellerMap.values()), message: 'OK' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

// ── Consolidated report: seller payouts + Drop Social referral payouts ──────
export async function getConsolidatedPayoutReport(): Promise<ActionResult<PayoutReportRow[]>> {
  const [sellerResult, referralResult] = await Promise.all([
    getPayoutReport(),
    (async (): Promise<ActionResult<PayoutReportRow[]>> => {
      try { await requireSuper() } catch (e: any) { return { success: false, message: e?.message ?? 'Sin permiso' } }
      const db = await getDb()
      if (!db) return { success: false, message: 'DB no disponible' }
      try {
        const payouts = await db.mpPayout.findMany({
          where: { reference: { startsWith: 'REF-' }, status: 'PENDING' },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true, amount: true, currency: true, sellerId: true, reference: true,
            transactionIds: true, createdAt: true,
            seller: { select: { id: true, displayName: true, email: true, phone: true } },
          },
        })

        // Fetch associated transactions to get frozen rates and fechaValor
        const allTxIds = [...new Set(payouts.flatMap((p: any) => p.transactionIds as string[]))]
        const associatedTxs = allTxIds.length > 0
          ? await db.mpTransaction.findMany({
              where: { id: { in: allTxIds } },
              select: { id: true, frozenRate: true, frozenRateSource: true, frozenRateFechaValor: true, paymentMethod: true, currency: true },
            }) as Array<{ id: string; frozenRate: number | null; frozenRateSource: string | null; frozenRateFechaValor: Date | null; paymentMethod: string | null; currency: string }>
          : []
        const txMap = new Map(associatedTxs.map(tx => [tx.id, tx] as [string, typeof associatedTxs[0]]))

        await db.$disconnect()
        const rows: PayoutReportRow[] = payouts.map((p: any) => {
          const firstTxId = p.transactionIds[0]
          const tx = firstTxId ? txMap.get(firstTxId) : null
          const fechaValor = tx?.frozenRateFechaValor
            ? new Date(tx.frozenRateFechaValor).toISOString().slice(0, 10)
            : p.createdAt.toISOString().slice(0, 10)
          const frozenRate = tx?.frozenRate ? String(tx.frozenRate) : ''
          const rateSource = tx?.frozenRateSource || 'BCV'
          const paymentCurrency = 'VES'

          return {
            sellerId: p.sellerId,
            sellerName: p.seller.displayName,
            payoutMethodId: null,
            payoutMethodType: 'PAGO_MOVIL',
            payoutAccount: 'Comision Drop Social',
            payoutMethodIsDefault: false,
            payoutDetails: [],
            hasPayoutMethod: true,
            grossAmount: Number(p.amount),
            feeAmount: 0,
            netAmount: Number(p.amount),
            currency: p.currency,
            transactionCount: p.transactionIds.length,
            transactionIds: p.transactionIds,
            oldestTransactionDate: p.createdAt.toISOString(),
            titular: p.seller.displayName,
            cedula: '',
            telefono: p.seller.phone ?? '',
            numeroCuenta: '',
            banco: '',
            payId: '',
            email: p.seller.email ?? '',
            paymentCurrency,
            exchangeRate: frozenRate,
            fechaValor,
            source: 'referral' as const,
            referralReference: p.reference ?? '',
            ivaAmount: 0,
            bcvRate: '',
            binanceRate: '',
            netoBs: 0,
            netoUsdt: 0,
            rateSource,
            interbankFee: 0,
          }
        })
        return { success: true, data: rows, message: 'OK' }
      } catch (e: any) {
        await db.$disconnect().catch(() => {})
        return { success: false, message: e?.message ?? 'Error' }
      }
    })(),
  ])

  if (!sellerResult.success && !referralResult.success) {
    return { success: false, message: 'No se pudo generar el reporte consolidado' }
  }

  const all = [...(sellerResult.data ?? []), ...(referralResult.data ?? [])]
  await enrichPayoutRowsWithRates(all)
  return { success: true, data: all, message: `${all.length} filas` }
}

// ─── ADMIN VALIDATE PAYMENT ───────────────────────────────────────────────────

export async function getSellerPayoutAuditRows(): Promise<ActionResult<SellerPayoutAuditRow[]>> {
  try {
    await requireSuper()
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Sin permiso' }
  }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    const payouts = await db.mpPayout.findMany({
      where: {
        NOT: { reference: { startsWith: 'REF-' } },
      },
      select: {
        id: true,
        amount: true,
        status: true,
        method: true,
        externalPayoutId: true,
        createdAt: true,
        updatedAt: true,
        completedAt: true,
        transactionIds: true,
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    })

    const payoutByTxId = new Map<string, {
      id: string
      amount: unknown
      status: string
      method: string
      externalPayoutId: string | null
      createdAt: Date
      updatedAt: Date
      completedAt: Date | null
    }>()

    for (const payout of payouts) {
      for (const txId of payout.transactionIds) {
        if (!payoutByTxId.has(txId)) {
          payoutByTxId.set(txId, {
            id: payout.id,
            amount: payout.amount,
            status: payout.status,
            method: payout.method,
            externalPayoutId: payout.externalPayoutId,
            createdAt: payout.createdAt,
            updatedAt: payout.updatedAt,
            completedAt: payout.completedAt,
          })
        }
      }
    }

    const payoutTxIds = Array.from(payoutByTxId.keys())
    const txWhere = payoutTxIds.length > 0
      ? {
        OR: [
          { status: { in: ['DELIVERY_CONFIRMED', 'RELEASED'] } },
          { id: { in: payoutTxIds } },
        ],
      }
      : { status: { in: ['DELIVERY_CONFIRMED', 'RELEASED'] } }

    const txs = await db.mpTransaction.findMany({
      where: txWhere,
      orderBy: { createdAt: 'desc' },
      take: 300,
      select: {
        id: true,
        status: true,
        amount: true,
        currency: true,
        paymentMethod: true,
        platformFeePercent: true,
        platformFeeAmount: true,
        sellerNetAmount: true,
        releasedAt: true,
        createdAt: true,
        buyer: { select: { displayName: true, email: true } },
        seller: { select: { displayName: true, email: true } },
        listing: { select: { title: true } },
      },
    })

    await db.$disconnect()

    const rows: SellerPayoutAuditRow[] = (txs as Array<{
      id: string
      status: string
      amount: unknown
      currency: string
      paymentMethod: string
      platformFeePercent: unknown
      platformFeeAmount: unknown
      sellerNetAmount: unknown
      releasedAt: Date | null
      createdAt: Date
      buyer: { displayName: string | null; email: string | null } | null
      seller: { displayName: string | null; email: string | null } | null
      listing: { title: string | null } | null
    }>).map((tx) => {
      const payout = payoutByTxId.get(tx.id)
      const payoutAmount = payout ? Number(payout.amount) : null
      const sellerNetAmount = tx.sellerNetAmount != null ? Number(tx.sellerNetAmount) : null
      const hasPayout = Boolean(payout)
      const missingSellerNetAmount = !Number.isFinite(sellerNetAmount ?? Number.NaN)
      const missingPayoutAmount = hasPayout && !Number.isFinite(payoutAmount ?? Number.NaN)
      const payoutAmountMismatch = hasPayout &&
        !missingSellerNetAmount &&
        !missingPayoutAmount &&
        Math.abs((payoutAmount ?? 0) - (sellerNetAmount ?? 0)) > 0.01
      const completedPayout = payout?.status === 'COMPLETED'
      const releasedWithoutPayout = tx.status === 'RELEASED' && !hasPayout
      const pendingPayout = hasPayout && payout?.status !== 'COMPLETED'
      const payoutCompletedButTxNotReleased = completedPayout && tx.status !== 'RELEASED'

      return {
        transactionId: tx.id,
        createdAt: tx.createdAt.toISOString(),
        listingTitle: tx.listing?.title ?? 'Operacion Marketplace',
        buyerName: tx.buyer?.displayName ?? 'Comprador',
        buyerEmail: tx.buyer?.email ?? null,
        sellerName: tx.seller?.displayName ?? 'Vendedor',
        sellerEmail: tx.seller?.email ?? null,
        status: tx.status,
        amount: Number(tx.amount),
        currency: tx.currency,
        paymentMethod: tx.paymentMethod,
        platformFeePercent: tx.platformFeePercent != null ? Number(tx.platformFeePercent) : null,
        platformFeeAmount: tx.platformFeeAmount != null ? Number(tx.platformFeeAmount) : null,
        sellerNetAmount,
        releasedAt: tx.releasedAt?.toISOString() ?? null,
        payoutId: payout?.id ?? null,
        payoutAmount: hasPayout ? payoutAmount : null,
        payoutStatus: payout?.status ?? null,
        payoutMethod: payout?.method ?? null,
        externalPayoutId: payout?.externalPayoutId ?? null,
        payoutCreatedAt: payout?.createdAt?.toISOString() ?? null,
        payoutUpdatedAt: payout?.updatedAt?.toISOString() ?? null,
        payoutCompletedAt: payout?.completedAt?.toISOString() ?? null,
        payoutAmountMismatch,
        releasedWithoutPayout,
        completedPayout,
        pendingPayout,
        payoutCompletedButTxNotReleased,
        missingSellerNetAmount,
        missingPayoutAmount,
      }
    })

    return { success: true, data: rows, message: 'OK' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

export async function adminValidatePayment(
  txId: string,
  approved: boolean,
  note: string,
): Promise<ActionResult> {
  try {
    const session = await requireSuper()
    const db = await getDb()
    if (!db) return { success: false, message: 'Base de datos no disponible' }

    try {
      const tx = await db.mpTransaction.findUnique({
        where: { id: txId },
        select: {
          id: true,
          buyerId: true,
          sellerId: true,
          listingId: true,
          status: true,
          listing: { select: { title: true } },
          buyer: { select: { email: true, phone: true, displayName: true } },
          seller: { select: { email: true, phone: true, displayName: true } },
        },
      })
      if (!tx) return { success: false, message: 'Transacción no encontrada' }
      if (!['PAYMENT_RECEIVED', 'VALIDATING'].includes(tx.status)) {
        return { success: false, message: `No se puede validar en estado ${tx.status}` }
      }

      const newStatus = approved ? 'IN_ESCROW' : 'PAYMENT_FAILED'
      const now = new Date()
      await db.$transaction(async (txDb: typeof db) => {
        await txDb.mpTransaction.update({
          where: { id: txId },
          data: {
            status: newStatus,
            adminNotes: note || null,
            ...(approved
              ? {
                  escrowHeldAt: now,
                  escrowReleaseAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
                }
              : {}),
          },
        })

        if (approved) {
          const listing = await txDb.mpListing.findUnique({
            where: { id: tx.listingId },
            select: { hasInventory: true, inventory: true },
          })
          if (listing?.hasInventory && listing.inventory != null) {
            const consumedUnits = await getConsumedInventoryUnits(txDb, tx.listingId)
            const availableInventory = getAvailableInventory(listing, consumedUnits)
            if (availableInventory != null && availableInventory <= 0) {
              await txDb.mpListing.update({
                where: { id: tx.listingId },
                data: { status: 'SOLD_OUT' },
              })
            }
          }
        }

        await txDb.mpTransactionStatusHistory.create({
          data: {
            transactionId: txId,
            fromStatus: tx.status,
            toStatus: newStatus,
            changedBy: session.userId,
            reason: note || (approved ? 'Pago validado por admin' : 'Pago rechazado por admin'),
          },
        })
      })

      await db.$disconnect()

      // S16: Notify seller when admin validates payment (funds in escrow)
      if (approved) {
        void sendSystemMessage({
          buyerId: tx.buyerId,
          sellerId: tx.sellerId,
          listingId: tx.listingId,
          senderId: session.userId,
          receiverId: tx.sellerId,
          content: '🔒 ESCROW — Pago validado por admin. Fondos retenidos en escrow hasta que el comprador confirme recepcion.',
        }).catch(() => {})
        void notifyMarketplacePaymentApproved({
          transactionId: tx.id,
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
        message: approved ? 'Pago aprobado. Operacion protegida.' : 'Pago rechazado. Operacion no aprobada.',
      }
    } catch (err) {
      await db.$disconnect().catch(() => {})
      return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
    }
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Sin permiso' }
  }
}

// ─── ADMIN RELEASE ESCROW ─────────────────────────────────────────────────────

export async function adminReleaseEscrow(txId: string, note: string): Promise<ActionResult> {
  try {
    const session = await requireSuper()
    const db = await getDb()
    if (!db) return { success: false, message: 'Base de datos no disponible' }

    try {
      const tx = await db.mpTransaction.findUnique({
        where: { id: txId },
        select: {
          id: true,
          amount: true,
          currency: true,
          buyerId: true,
          sellerId: true,
          listingId: true,
          status: true,
          buyerConfirmedAt: true,
          seller: { select: { email: true, phone: true, displayName: true } },
          disputes: { where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } }, select: { id: true } },
        },
      })
      if (!tx) return { success: false, message: 'Transacción no encontrada' }
      if (tx.status !== 'DELIVERY_CONFIRMED') {
        return { success: false, message: 'Solo se puede liberar el pago cuando el comprador ha confirmado la recepcion.' }
      }
      if (!tx.buyerConfirmedAt) {
        return { success: false, message: 'No se puede liberar sin confirmacion del comprador.' }
      }
      if (tx.disputes.length > 0) {
        return { success: false, message: 'No se puede liberar el pago con una disputa activa.' }
      }

      await db.mpTransaction.update({
        where: { id: txId },
        data: { status: 'RELEASED', releasedAt: new Date(), adminNotes: note || null },
      })

      await db.mpTransactionStatusHistory.create({
        data: {
          transactionId: txId,
          fromStatus: tx.status,
          toStatus: 'RELEASED',
          changedBy: session.userId,
          reason: note || 'Liberacion por el equipo',
        },
      })

      await db.$disconnect()

      // S16: Notify seller on escrow release
      void sendSystemMessage({
        buyerId: tx.buyerId,
        sellerId: tx.sellerId,
        listingId: tx.listingId,
        senderId: session.userId,
        receiverId: tx.sellerId,
        content: '💰 PAGO LIBERADO — El admin libero el pago a tu cuenta. Revisa tu metodo de pago registrado.',
      }).catch(() => {})
      void notifyMarketplacePayoutReleased({
        transactionId: tx.id,
        amount: Number(tx.amount),
        currency: tx.currency,
        seller: {
          email: tx.seller?.email,
          phone: tx.seller?.phone,
          displayName: tx.seller?.displayName,
        },
      })
        .then((summary) => {
          console.info('[marketplace.notify]', {
            event: 'payout_released',
            recipientRole: 'seller',
            transactionId: tx.id,
            hasEmail: summary.hasEmail,
            hasPhone: summary.hasPhone,
            emailSent: summary.emailSent,
            whatsappSent: summary.whatsappSent,
            emailReason: summary.emailReason,
            whatsappReason: summary.whatsappReason,
          })
        })
        .catch((error) => {
          console.warn('[marketplace.notify]', {
            event: 'payout_released',
            recipientRole: 'seller',
            transactionId: tx.id,
            error: error instanceof Error ? error.message : 'unknown_error',
          })
        })

      return { success: true, data: undefined, message: 'Pago del vendedor liberado' }
    } catch (err) {
      await db.$disconnect().catch(() => {})
      return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
    }
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Sin permiso' }
  }
}

// ─── ADMIN MARK SELLER PAID (REGISTRAR PAGO ENVIADO AL VENDEDOR) ─────────────

export async function adminMarkSellerPaid(
  txId: string,
  externalPayoutId?: string,
): Promise<ActionResult> {
  try {
    const session = await requireSuper()
    const db = await getDb()
    if (!db) return { success: false, message: 'Base de datos no disponible' }

    try {
      const tx = await db.mpTransaction.findUnique({
        where: { id: txId },
        select: {
          id: true,
          buyerId: true,
          sellerId: true,
          listingId: true,
          status: true,
          sellerNetAmount: true,
          currency: true,
          seller: { select: { email: true, phone: true, displayName: true } },
        },
      })
      if (!tx) return { success: false, message: 'Transacción no encontrada' }
      if (tx.status !== 'RELEASED') {
        return {
          success: false,
          message: 'Solo se puede marcar como pagado al vendedor cuando la transacción está en estado RELEASED.',
        }
      }

      // Guard: prevent double payout for the same transaction
      const existingPayout = await db.mpPayout.findFirst({
        where: {
          status: { notIn: ['FAILED', 'CANCELLED'] },
          transactionIds: { has: txId },
        },
      })
      if (existingPayout) {
        return {
          success: false,
          message: 'Ya existe un pago registrado para esta transacción.',
        }
      }

      // Guard: block payout if there is an active dispute
      const activeDispute = await db.mpDispute.findFirst({
        where: {
          transactionId: txId,
          status: { in: ['OPEN', 'UNDER_REVIEW'] },
        },
      })
      if (activeDispute) {
        return {
          success: false,
          message: 'No se puede pagar al vendedor: la transacción tiene una disputa activa.',
        }
      }

      // Fetch seller's default active payout method
      const payoutMethod = await db.mpPayoutMethod.findFirst({
        where: { userId: tx.sellerId, isActive: true, isDefault: true },
      })
      if (!payoutMethod) {
        return {
          success: false,
          message: 'El vendedor no tiene un método de cobro activo configurado. No se puede registrar el pago.',
        }
      }

      // Create MpPayout record — stays as source of truth; transaction remains RELEASED
      await db.mpPayout.create({
        data: {
          sellerId: tx.sellerId,
          amount: tx.sellerNetAmount,
          currency: tx.currency,
          method: payoutMethod.methodType,
          status: 'COMPLETED',
          transactionIds: [txId],
          externalPayoutId: externalPayoutId ?? null,
          completedAt: new Date(),
        },
      })

      // Record audit entry in status history (no status change — informational)
      await db.mpTransactionStatusHistory.create({
        data: {
          transactionId: txId,
          fromStatus: tx.status,
          toStatus: tx.status,
          changedBy: session.userId,
          reason: `Pago al vendedor registrado por admin${externalPayoutId ? ` (ref: ${externalPayoutId})` : ''}`,
        },
      })

      // Fire-and-forget: notify seller that admin has marked their payout as sent
      void sendSystemMessage({
        buyerId: tx.buyerId,
        sellerId: tx.sellerId,
        listingId: tx.listingId,
        senderId: session.userId,
        receiverId: tx.sellerId,
        content: `💰 El equipo de Turpial Market ha registrado el envío de tu pago${externalPayoutId ? ` (referencia: ${externalPayoutId})` : ''}. Si tienes dudas, responde a este chat.`,
      }).catch(() => {})
      void notifyMarketplacePayoutSent({
        transactionId: tx.id,
        amount: Number(tx.sellerNetAmount),
        currency: tx.currency,
        seller: {
          email: tx.seller?.email,
          phone: tx.seller?.phone,
          displayName: tx.seller?.displayName,
        },
      })
        .then((summary) => {
          console.info('[marketplace.notify]', {
            event: 'payout_sent',
            recipientRole: 'seller',
            transactionId: tx.id,
            hasEmail: summary.hasEmail,
            hasPhone: summary.hasPhone,
            emailSent: summary.emailSent,
            whatsappSent: summary.whatsappSent,
            emailReason: summary.emailReason,
            whatsappReason: summary.whatsappReason,
          })
        })
        .catch((error) => {
          console.warn('[marketplace.notify]', {
            event: 'payout_sent',
            recipientRole: 'seller',
            transactionId: tx.id,
            error: error instanceof Error ? error.message : 'unknown_error',
          })
        })

      await db.$disconnect()
      return { success: true, data: undefined, message: 'Pago al vendedor registrado exitosamente.' }
    } catch (err) {
      await db.$disconnect().catch(() => {})
      return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
    }
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Sin permiso' }
  }
}

// ─── ADMIN RESOLVE DISPUTE ────────────────────────────────────────────────────

export async function adminResolveDispute(
  txId: string,
  resolution: 'BUYER' | 'SELLER',
  note: string,
): Promise<ActionResult> {
  try {
    const session = await requireSuper()
    const db = await getDb()
    if (!db) return { success: false, message: 'Base de datos no disponible' }

    try {
      const tx = await db.mpTransaction.findUnique({
        where: { id: txId },
        select: { id: true, status: true },
      })
      if (!tx) return { success: false, message: 'Transacción no encontrada' }
      if (tx.status !== 'DISPUTED') {
        return { success: false, message: 'Solo se pueden resolver disputas activas' }
      }

      const newStatus = resolution === 'BUYER' ? 'REFUNDED' : 'RELEASED'

      await db.mpTransaction.update({
        where: { id: txId },
        data: { status: newStatus, releasedAt: new Date(), adminNotes: note || null },
      })

      await db.mpTransactionStatusHistory.create({
        data: {
          transactionId: txId,
          fromStatus: 'DISPUTED',
          toStatus: newStatus,
          changedBy: session.userId,
          reason: note || `Disputa resuelta a favor del ${resolution === 'BUYER' ? 'comprador' : 'vendedor'}`,
        },
      })

      await db.mpDispute.updateMany({
        where: { transactionId: txId, status: 'OPEN' },
        data: {
          status: resolution === 'BUYER' ? 'RESOLVED_BUYER' : 'RESOLVED_SELLER',
          resolvedAt: new Date(),
          resolution: note || undefined,
        },
      })

      await db.$disconnect()
      return { success: true, data: undefined, message: `Disputa resuelta → ${newStatus}` }
    } catch (err) {
      await db.$disconnect().catch(() => {})
      return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
    }
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Sin permiso' }
  }
}

// ─── ADMIN CANCEL TRANSACTION ─────────────────────────────────────────────────

export async function adminCancelTransaction(txId: string, note: string): Promise<ActionResult> {
  try {
    const session = await requireSuper()
    const db = await getDb()
    if (!db) return { success: false, message: 'Base de datos no disponible' }

    try {
      const tx = await db.mpTransaction.findUnique({
        where: { id: txId },
        select: { id: true, status: true },
      })
      if (!tx) return { success: false, message: 'Transacción no encontrada' }
      if (['RELEASED', 'REFUNDED', 'CANCELLED'].includes(tx.status)) {
        return { success: false, message: 'No se puede cancelar una transacción en estado terminal' }
      }

      await db.mpTransaction.update({
        where: { id: txId },
        data: { status: 'CANCELLED', adminNotes: note || null },
      })

      await db.mpTransactionStatusHistory.create({
        data: {
          transactionId: txId,
          fromStatus: tx.status,
          toStatus: 'CANCELLED',
          changedBy: session.userId,
          reason: note || 'Cancelada por admin',
        },
      })

      await db.$disconnect()
      return { success: true, data: undefined, message: 'Transacción cancelada' }
    } catch (err) {
      await db.$disconnect().catch(() => {})
      return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
    }
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Sin permiso' }
  }
}

// ─── ADMIN GET USERS ──────────────────────────────────────────────────────────

export async function adminGetUsers(search?: string): Promise<ActionResult<AdminUserRow[]>> {
  try {
    await requireSuper()
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Sin permiso' }
  }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = search
      ? { OR: [{ displayName: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] }
      : {}

    const users = await db.mpUser.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true, displayName: true, email: true, phone: true,
        whatsappConsent: true, isSeller: true, isVerified: true,
        isBanned: true, role: true, totalSales: true, totalPurchases: true,
        createdAt: true,
      },
    })

    await db.$disconnect()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { success: true, data: users.map((u: any) => ({ ...u, createdAt: u.createdAt.toISOString() })), message: 'OK' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

// ─── ADMIN BAN USER ───────────────────────────────────────────────────────────

export async function adminBanUser(userId: string, reason: string): Promise<ActionResult> {
  try {
    const session = await requireSuper()
    if (userId === session.userId) return { success: false, message: 'No puedes suspender tu propia cuenta' }

    const db = await getDb()
    if (!db) return { success: false, message: 'Base de datos no disponible' }

    try {
      await db.mpUser.update({
        where: { id: userId },
        data: { isBanned: true, bannedAt: new Date(), bannedReason: reason },
      })
      await db.$disconnect()
      return { success: true, data: undefined, message: 'Usuario suspendido' }
    } catch (err) {
      await db.$disconnect().catch(() => {})
      return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
    }
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Sin permiso' }
  }
}

// ─── ADMIN UNBAN USER ─────────────────────────────────────────────────────────

export async function adminUnbanUser(userId: string): Promise<ActionResult> {
  try {
    await requireSuper()
    const db = await getDb()
    if (!db) return { success: false, message: 'Base de datos no disponible' }

    try {
      await db.mpUser.update({
        where: { id: userId },
        data: { isBanned: false, bannedAt: null, bannedReason: null },
      })
      await db.$disconnect()
      return { success: true, data: undefined, message: 'Usuario rehabilitado' }
    } catch (err) {
      await db.$disconnect().catch(() => {})
      return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
    }
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Sin permiso' }
  }
}

// ─── ADMIN SET USER ROLE ──────────────────────────────────────────────────────

export async function adminSetUserRole(
  userId: string,
  role: 'USER' | 'SOCIO' | 'SUPER',
  confirmPassword?: string,
): Promise<ActionResult> {
  try {
    const session = await requireSuper()
    if (userId === session.userId) return { success: false, message: 'No puedes cambiar tu propio rol' }

    // Require password confirmation for elevation to SUPER
    if (role === 'SUPER') {
      const requiredPass = process.env.SUPER_ADMIN_ELEVATION_PASS
      if (requiredPass && confirmPassword !== requiredPass) {
        return { success: false, message: 'Contrasena de elevacion incorrecta. Requerida para asignar rol SUPER.' }
      }
    }

    const db = await getDb()
    if (!db) return { success: false, message: 'Base de datos no disponible' }

    try {
      await db.mpUser.update({ where: { id: userId }, data: { role } })
      await db.$disconnect()
      return { success: true, data: undefined, message: `Rol actualizado a ${role}` }
    } catch (err) {
      await db.$disconnect().catch(() => {})
      return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
    }
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Sin permiso' }
  }
}

// ─── ADMIN VERIFY USER ────────────────────────────────────────────────────────

export async function adminVerifyUser(userId: string): Promise<ActionResult> {
  try {
    await requireSuper()
    const db = await getDb()
    if (!db) return { success: false, message: 'Base de datos no disponible' }

    try {
      await db.mpUser.update({
        where: { id: userId },
        data: { isVerified: true, verifiedAt: new Date(), verificationLevel: 'basic' },
      })
      await db.$disconnect()
      return { success: true, data: undefined, message: 'Usuario verificado' }
    } catch (err) {
      await db.$disconnect().catch(() => {})
      return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
    }
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Sin permiso' }
  }
}
