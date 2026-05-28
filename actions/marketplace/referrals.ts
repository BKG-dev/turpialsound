'use server'

import { getDb } from '@/lib/marketplace/db'
import { getSession } from '@/lib/marketplace/auth'
import { revalidatePath } from 'next/cache'

function generateCode(): string {
  return `ds-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export async function getOrCreateReferralLink(listingId: string): Promise<{ success: boolean; code?: string; url?: string; message?: string }> {
  const session = await getSession()
  if (!session) return { success: false, message: 'Inicia sesion para compartir y ganar el 10% de nuestra comision' }

  const db = await getDb()
  if (!db) return { success: false, message: 'DB no disponible' }

  try {
    const existing = await db.mpReferralLink.findFirst({
      where: { referrerId: session.userId, listingId, isActive: true },
    })
    if (existing) {
      await db.$disconnect()
      return { success: true, code: existing.code, url: `/marketplace/r/${existing.code}` }
    }

    const code = generateCode()
    await db.mpReferralLink.create({
      data: { referrerId: session.userId, listingId, code },
    })
    await db.$disconnect()
    revalidatePath('/marketplace')
    return { success: true, code, url: `/marketplace/r/${code}` }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error al generar link' }
  }
}

export async function trackReferralClick(code: string): Promise<{ listingId?: string }> {
  const db = await getDb()
  if (!db) return {}

  try {
    const link = await db.mpReferralLink.findUnique({ where: { code }, select: { id: true, listingId: true, isActive: true } })
    if (link?.isActive) {
      await db.mpReferralLink.update({ where: { id: link.id }, data: { clicks: { increment: 1 } } })
      await db.$disconnect()
      return { listingId: link.listingId }
    }
    await db.$disconnect()
    return {}
  } catch {
    await db.$disconnect().catch(() => {})
    return {}
  }
}

export async function processReferralConversion(
  transactionId: string,
  referralCode: string,
  saleAmount: number,
): Promise<void> {
  const db = await getDb()
  if (!db) return

  try {
    const link = await db.mpReferralLink.findUnique({ where: { code: referralCode }, select: { id: true, referrerId: true, isActive: true } })
    if (!link?.isActive) { await db.$disconnect(); return }

    const commission = saleAmount * 0.005 // 0.5%
    await db.mpReferralLink.update({
      where: { id: link.id },
      data: { conversions: { increment: 1 }, totalEarned: { increment: commission } },
    })
    // TODO: create MpPayout or credit to referrer balance
    await db.$disconnect()
  } catch {
    await db.$disconnect().catch(() => {})
  }
}

export async function getMyReferralEarnings(): Promise<{ totalEarned: number; links: unknown[] }> {
  const session = await getSession()
  if (!session) return { totalEarned: 0, links: [] }

  const db = await getDb()
  if (!db) return { totalEarned: 0, links: [] }

  try {
    const links = await db.mpReferralLink.findMany({
      where: { referrerId: session.userId, isActive: true },
      orderBy: { createdAt: 'desc' },
      select: { id: true, code: true, listingId: true, clicks: true, conversions: true, totalEarned: true, createdAt: true },
      take: 20,
    })
    const totalEarned = links.reduce((sum: number, l: { totalEarned: unknown }) => sum + Number(l.totalEarned || 0), 0)
    await db.$disconnect()
    return { totalEarned, links }
  } catch {
    await db.$disconnect().catch(() => {})
    return { totalEarned: 0, links: [] }
  }
}

export async function getMyReferredTransactions(): Promise<{ success: boolean; data: unknown[] }> {
  const session = await getSession()
  if (!session) return { success: false, data: [] }

  const db = await getDb()
  if (!db) return { success: false, data: [] }

  try {
    const transactions = await db.mpTransaction.findMany({
      where: { referredBy: session.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        platformFeeAmount: true,
        createdAt: true,
        buyer: { select: { id: true, displayName: true, email: true } },
        listing: { select: { id: true, title: true, slug: true } },
      },
      take: 50,
    })
    await db.$disconnect()
    return { success: true, data: transactions }
  } catch {
    await db.$disconnect().catch(() => {})
    return { success: false, data: [] }
  }
}
