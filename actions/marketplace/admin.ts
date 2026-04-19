'use server'

import { getDb } from '@/lib/marketplace/db'
import { getSession } from '@/lib/marketplace/auth'
import type { ActionResult } from '@/lib/validations/marketplace'

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface AdminStats {
  totalTransactions: number
  escrowActiveValue: number
  pendingValidation: number
  activeListings: number
  totalUsers: number
  openDisputes: number
  releasedThisMonth: number
  platformFeesEarned: number
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
  paymentProofUrl: string | null
  createdAt: string
}

export interface PayoutReportRow {
  sellerId: string
  sellerName: string
  payoutMethodType: string
  payoutAccount: string
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

    const [totalTx, escrowAgg, pendingVal, activeListings, totalUsers, openDisputes, relMonth, feesAgg] =
      await Promise.all([
        db.mpTransaction.count(),
        db.mpTransaction.aggregate({
          where: { status: { in: ['IN_ESCROW', 'DELIVERY_CONFIRMED'] } },
          _sum: { amount: true },
        }),
        db.mpTransaction.count({ where: { status: 'VALIDATING' } }),
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
      ])

    await db.$disconnect()
    return {
      success: true,
      data: {
        totalTransactions: totalTx,
        escrowActiveValue: Number(escrowAgg._sum.amount ?? 0),
        pendingValidation: pendingVal,
        activeListings,
        totalUsers,
        openDisputes,
        releasedThisMonth: relMonth,
        platformFeesEarned: Number(feesAgg._sum.platformFeeAmount ?? 0),
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
              where: { isDefault: true, isActive: true },
              select: { displayLabel: true },
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
      include: {
        seller: {
          select: {
            id: true,
            displayName: true,
            payoutMethods: {
              where: { isDefault: true, isActive: true },
              select: { displayLabel: true, methodType: true },
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
        sellerMap.set(tx.sellerId, {
          sellerId: tx.sellerId,
          sellerName: tx.seller.displayName,
          payoutMethodType: payout?.methodType ?? 'UNKNOWN',
          payoutAccount: payout?.displayLabel ?? 'Sin método configurado',
          grossAmount: gross,
          feeAmount: fee,
          netAmount: net,
          currency: tx.currency,
          transactionCount: 1,
          transactionIds: [tx.id],
          oldestTransactionDate: tx.createdAt.toISOString(),
        })
      }
    }

    return { success: true, data: Array.from(sellerMap.values()), message: 'OK' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

// ─── ADMIN VALIDATE PAYMENT ───────────────────────────────────────────────────

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
      const tx = await db.mpTransaction.findUnique({ where: { id: txId } })
      if (!tx) return { success: false, message: 'Transacción no encontrada' }
      if (!['VALIDATING', 'PENDING_PAYMENT'].includes(tx.status)) {
        return { success: false, message: `No se puede validar en estado ${tx.status}` }
      }

      const newStatus = approved ? 'IN_ESCROW' : 'PAYMENT_FAILED'
      const now = new Date()

      await db.mpTransaction.update({
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

      await db.mpTransactionStatusHistory.create({
        data: {
          transactionId: txId,
          fromStatus: tx.status,
          toStatus: newStatus,
          changedBy: session.userId,
          reason: note || (approved ? 'Pago validado por admin' : 'Pago rechazado por admin'),
        },
      })

      await db.$disconnect()
      return {
        success: true,
        data: undefined,
        message: approved ? 'Pago aprobado → IN_ESCROW' : 'Pago rechazado → PAYMENT_FAILED',
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
      const tx = await db.mpTransaction.findUnique({ where: { id: txId } })
      if (!tx) return { success: false, message: 'Transacción no encontrada' }
      if (!['IN_ESCROW', 'DELIVERY_CONFIRMED', 'DISPUTED'].includes(tx.status)) {
        return { success: false, message: `No se puede liberar en estado ${tx.status}` }
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
          reason: note || 'Liberación manual por admin',
        },
      })

      await db.$disconnect()
      return { success: true, data: undefined, message: 'Fondos liberados al vendedor' }
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
      const tx = await db.mpTransaction.findUnique({ where: { id: txId } })
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
      const tx = await db.mpTransaction.findUnique({ where: { id: txId } })
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
): Promise<ActionResult> {
  try {
    const session = await requireSuper()
    if (userId === session.userId) return { success: false, message: 'No puedes cambiar tu propio rol' }

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
