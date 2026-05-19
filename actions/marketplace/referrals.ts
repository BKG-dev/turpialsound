'use server'

import { getDb } from '@/lib/marketplace/db'
import { getSession } from '@/lib/marketplace/auth'
import { revalidatePath } from 'next/cache'

function generateCode(): string {
  return `ds-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export async function getOrCreateReferralLink(listingId: string): Promise<{ success: boolean; code?: string; url?: string; message?: string }> {
  const session = await getSession()
  if (!session) return { success: false, message: 'Inicia sesion para compartir y ganar' }

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
    // Obtener slug para URL directa
    const listing = await db.mpListing.findUnique({ where: { id: listingId }, select: { slug: true } })
    const slug = listing?.slug || listingId

    await db.mpReferralLink.create({
      data: { referrerId: session.userId, listingId, code, slug },
    })
    await db.$disconnect()
    revalidatePath('/marketplace')

    // URL directa al listing con param ref — sin ruta intermedia
    return { success: true, code, url: `/marketplace/${slug}?ref=${code}` }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error al generar link' }
  }
}

export async function trackReferralClick(code: string): Promise<{ listingId?: string; slug?: string }> {
  const db = await getDb()
  if (!db) return {}

  try {
    const link = await db.mpReferralLink.findUnique({
      where: { code },
      select: { id: true, listingId: true, slug: true, isActive: true },
    })
    if (link?.isActive) {
      await db.mpReferralLink.update({ where: { id: link.id }, data: { clicks: { increment: 1 } } })
      await db.$disconnect()
      return { listingId: link.listingId, slug: link.slug || link.listingId }
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

    // WhatsApp notification to referrer (S-MP-08-05, fire-and-forget)
    void (async () => {
      try {
        const { sendWhatsAppNotification } = await import('@/lib/marketplace/notifications')
        const referrer = await db.mpUser.findUnique({
          where: { id: link.referrerId },
          select: { phone: true },
        })
        if (referrer?.phone) {
          await sendWhatsAppNotification(referrer.phone, 'payout', {
            senderName: 'Turpial Market',
            amount: `$${commission.toFixed(2)}`,
            txId: transactionId,
          })
        }
      } catch {}
    })()

    // Crear MpPayout real para la comision del referido
    try {
      await db.mpPayout.create({
        data: {
          sellerId: link.referrerId,
          amount: String(commission),
          currency: 'USD',
          method: 'PAGO_MOVIL',
          status: 'PENDING',
          transactionIds: [transactionId],
          reference: `REF-${referralCode}-${transactionId.slice(0, 8)}`,
        },
      })
    } catch {} // No bloquear la conversion si el payout falla

    await db.$disconnect()
  } catch {
    await db.$disconnect().catch(() => {})
  }
}

export async function getMyReferralEarnings(): Promise<{ totalEarned: number; links: unknown[]; pendingPayouts: unknown[] }> {
  const session = await getSession()
  if (!session) return { totalEarned: 0, links: [], pendingPayouts: [] }

  const db = await getDb()
  if (!db) return { totalEarned: 0, links: [], pendingPayouts: [] }

  try {
    const links = await db.mpReferralLink.findMany({
      where: { referrerId: session.userId, isActive: true },
      orderBy: { createdAt: 'desc' },
      select: { id: true, code: true, listingId: true, clicks: true, conversions: true, totalEarned: true, createdAt: true },
      take: 20,
    })
    const totalEarned = links.reduce((sum: number, l: { totalEarned: unknown }) => sum + Number(l.totalEarned || 0), 0)

    const pendingPayouts = await db.mpPayout.findMany({
      where: { sellerId: session.userId, reference: { startsWith: 'REF-' } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, amount: true, currency: true, status: true, reference: true, createdAt: true },
      take: 20,
    })

    await db.$disconnect()
    return { totalEarned, links, pendingPayouts }
  } catch {
    await db.$disconnect().catch(() => {})
    return { totalEarned: 0, links: [], pendingPayouts: [] }
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

// ─── Dashboard: estadisticas de referral sobre MIS listings ─────────────
export async function getMyListingsReferralStats(): Promise<{
  listings: Array<{
    listingId: string
    title: string
    slug: string
    linksCreated: number
    totalClicks: number
    totalConversions: number
    totalEarnedForReferrers: number
  }>
}> {
  const session = await getSession()
  if (!session) return { listings: [] }

  const db = await getDb()
  if (!db) return { listings: [] }

  try {
    const myListings = await db.mpListing.findMany({
      where: { sellerId: session.userId },
      select: { id: true, title: true, slug: true },
    })

    const listingIds = myListings.map((l: { id: string }) => l.id)

    const links = await db.mpReferralLink.findMany({
      where: { listingId: { in: listingIds } },
      select: { listingId: true, clicks: true, conversions: true, totalEarned: true },
    })

    const byListing: Record<string, { links: number; clicks: number; conversions: number; earned: number }> = {}
    for (const l of links) {
      if (!byListing[l.listingId]) byListing[l.listingId] = { links: 0, clicks: 0, conversions: 0, earned: 0 }
      byListing[l.listingId].links++
      byListing[l.listingId].clicks += l.clicks
      byListing[l.listingId].conversions += l.conversions
      byListing[l.listingId].earned += Number(l.totalEarned || 0)
    }

    const listings = myListings.map((l: { id: string; title: string; slug: string }) => ({
      listingId: l.id,
      title: l.title,
      slug: l.slug,
      linksCreated: byListing[l.id]?.links ?? 0,
      totalClicks: byListing[l.id]?.clicks ?? 0,
      totalConversions: byListing[l.id]?.conversions ?? 0,
      totalEarnedForReferrers: byListing[l.id]?.earned ?? 0,
    }))

    await db.$disconnect()
    return { listings }
  } catch {
    await db.$disconnect().catch(() => {})
    return { listings: [] }
  }
}

// ─── Admin: completar payout de referido ────────────────────────────────
export async function completeReferralPayout(payoutId: string): Promise<{ success: boolean; message: string }> {
  const session = await getSession()
  if (!session) return { success: false, message: 'No autenticado' }

  const db = await getDb()
  if (!db) return { success: false, message: 'DB no disponible' }

  try {
    const payout = await db.mpPayout.findUnique({ where: { id: payoutId } })
    if (!payout) return { success: false, message: 'Payout no encontrado' }
    if (payout.status !== 'PENDING') return { success: false, message: `Estado invalido: ${payout.status}` }
    if (!payout.reference?.startsWith('REF-')) return { success: false, message: 'No es un payout de referido' }

    await db.mpPayout.update({
      where: { id: payoutId },
      data: { status: 'COMPLETED' },
    })

    // WhatsApp al referrer
    void (async () => {
      try {
        const { sendWhatsAppNotification } = await import('@/lib/marketplace/notifications')
        const seller = await db.mpUser.findUnique({
          where: { id: payout.sellerId },
          select: { phone: true },
        })
        if (seller?.phone) {
          await sendWhatsAppNotification(seller.phone, 'payout', {
            senderName: 'Turpial Market',
            amount: `$${Number(payout.amount).toFixed(2)}`,
            txId: payoutId,
          })
        }
      } catch {}
    })()

    await db.$disconnect()
    revalidatePath('/marketplace/dashboard')
    return { success: true, message: 'Payout de referido pagado' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error al completar payout' }
  }
}
