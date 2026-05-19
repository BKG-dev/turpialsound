'use server'

import { getDb } from '@/lib/marketplace/db'
import { getSession } from '@/lib/marketplace/auth'
import { REFERRAL_COMMISSION_RATE } from '@/lib/marketplace/fees'
import { revalidatePath } from 'next/cache'

function generateCode(): string {
  return `ds-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeSlug(value?: string | null): string | null {
  const slug = value?.trim()
  if (!slug || slug.includes('/') || slug.includes('?') || slug.includes('#')) return null
  return slug
}

function buildReferralUrl(slug: string, code: string): string {
  return `/marketplace/${encodeURIComponent(slug)}?ref=${encodeURIComponent(code)}`
}

async function getListingReferralTarget(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  listingId: string,
): Promise<{ slug: string | null; sellerId: string | null }> {
  try {
    const listing = await db.mpListing.findUnique({
      where: { id: listingId },
      select: { slug: true, sellerId: true },
    })
    return {
      slug: normalizeSlug(listing?.slug),
      sellerId: listing?.sellerId ?? null,
    }
  } catch {
    return { slug: null, sellerId: null }
  }
}

export async function getOrCreateReferralLink(
  listingId: string,
  listingSlug?: string,
): Promise<{ success: boolean; code?: string; url?: string; message?: string }> {
  const session = await getSession()
  if (!session) return { success: false, message: 'Inicia sesion para compartir y ganar' }

  const db = await getDb()
  if (!db) return { success: false, message: 'DB no disponible' }

  try {
    const providedSlug = normalizeSlug(listingSlug)
    const listingTarget = await getListingReferralTarget(db, listingId)
    if (listingTarget.sellerId === session.userId) {
      await db.$disconnect()
      return { success: false, message: 'No puedes crear Drop Social para tu propio listing' }
    }

    const existing = await db.mpReferralLink.findFirst({
      where: { referrerId: session.userId, listingId, isActive: true },
      select: { id: true, code: true, slug: true, listingId: true },
    })
    if (existing) {
      const existingSlug = normalizeSlug(existing.slug)
      const slug = (existingSlug && existingSlug !== existing.listingId ? existingSlug : null)
        ?? listingTarget.slug
        ?? providedSlug
        ?? listingId

      if (slug !== existing.slug) {
        await db.mpReferralLink.update({
          where: { id: existing.id },
          data: { slug },
        })
      }

      await db.$disconnect()
      return { success: true, code: existing.code, url: buildReferralUrl(slug, existing.code) }
    }

    const code = generateCode()
    const slug = listingTarget.slug ?? providedSlug ?? listingId

    await db.mpReferralLink.create({
      data: { referrerId: session.userId, listingId, code, slug },
    })
    await db.$disconnect()
    revalidatePath('/marketplace')

    // URL directa al listing con param ref — sin ruta intermedia
    return { success: true, code, url: buildReferralUrl(slug, code) }
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

async function notifyReferralPayout(phone: string | null | undefined, amount: number | string, txId: string) {
  if (!phone) return
  try {
    const { sendWhatsAppNotification } = await import('@/lib/marketplace/notifications')
    await sendWhatsAppNotification(phone, 'payout', {
      senderName: 'Turpial Market',
      amount: typeof amount === 'number' ? `$${amount.toFixed(2)}` : amount,
      txId,
    })
  } catch {}
}

export async function processReferralConversion(
  transactionId: string,
  referralCode: string,
  saleAmount: number,
): Promise<void> {
  const db = await getDb()
  if (!db) return

  try {
    const link = await db.mpReferralLink.findUnique({
      where: { code: referralCode },
      select: { id: true, referrerId: true, listingId: true, isActive: true },
    })
    if (!link?.isActive) { await db.$disconnect(); return }

    const transaction = await db.mpTransaction.findUnique({
      where: { id: transactionId },
      select: { listingId: true, referredBy: true },
    })
    if (!transaction || transaction.referredBy !== link.referrerId || transaction.listingId !== link.listingId) {
      await db.$disconnect()
      return
    }

    const reference = `REF-${referralCode}-${transactionId.slice(0, 8)}`
    const existingPayout = await db.mpPayout.findFirst({
      where: { reference },
      select: { id: true },
    })
    if (existingPayout) {
      await db.$disconnect()
      return
    }

    const commission = saleAmount * REFERRAL_COMMISSION_RATE // param configurable
    const referrer = await db.mpUser.findUnique({
      where: { id: link.referrerId },
      select: { phone: true },
    })

    let conversionRecorded = false
    try {
      await db.$transaction(async (prisma: any) => {
        await prisma.mpReferralLink.update({
          where: { id: link.id },
          data: { conversions: { increment: 1 }, totalEarned: { increment: commission } },
        })

        await prisma.mpPayout.create({
          data: {
            sellerId: link.referrerId,
            amount: String(commission),
            currency: 'USD',
            method: 'PAGO_MOVIL',
            status: 'PENDING',
            transactionIds: [transactionId],
            reference,
          },
        })
      })
      conversionRecorded = true
    } catch (payoutErr) {
      console.error('[referrals] failed to create referral payout', payoutErr)
    }

    await db.$disconnect()
    if (conversionRecorded) {
      void notifyReferralPayout(referrer?.phone, commission, transactionId)
    }
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
      select: { id: true, code: true, listingId: true, slug: true, clicks: true, conversions: true, totalEarned: true, createdAt: true },
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
  if (session.role !== 'SUPER') return { success: false, message: 'Solo administradores pueden completar pagos de referido' }

  const db = await getDb()
  if (!db) return { success: false, message: 'DB no disponible' }

  try {
    const payout = await db.mpPayout.findUnique({ where: { id: payoutId } })
    if (!payout) {
      await db.$disconnect()
      return { success: false, message: 'Payout no encontrado' }
    }
    if (payout.status !== 'PENDING') {
      await db.$disconnect()
      return { success: false, message: `Estado invalido: ${payout.status}` }
    }
    if (!payout.reference?.startsWith('REF-')) {
      await db.$disconnect()
      return { success: false, message: 'No es un payout de referido' }
    }

    const referrer = await db.mpUser.findUnique({
      where: { id: payout.sellerId },
      select: { phone: true },
    })

    await db.mpPayout.update({
      where: { id: payoutId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    })

    await db.$disconnect()
    revalidatePath('/marketplace/dashboard')
    revalidatePath('/marketplace/admin')
    void notifyReferralPayout(referrer?.phone, `$${Number(payout.amount).toFixed(2)}`, payoutId)
    return { success: true, message: 'Payout de referido pagado' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error al completar payout' }
  }
}

export async function getAdminReferralPayouts(): Promise<{
  success: boolean
  data: Array<{
    id: string
    referrerId: string
    referrerName: string
    referrerEmail: string
    amount: string
    currency: string
    status: string
    reference: string | null
    transactionIds: string[]
    createdAt: string
    completedAt: string | null
  }>
  message?: string
}> {
  const session = await getSession()
  if (!session || session.role !== 'SUPER') {
    return { success: false, data: [], message: 'Solo administradores pueden ver pagos de referido' }
  }

  const db = await getDb()
  if (!db) return { success: false, data: [], message: 'DB no disponible' }

  try {
    const payouts = await db.mpPayout.findMany({
      where: { reference: { startsWith: 'REF-' } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        sellerId: true,
        amount: true,
        currency: true,
        status: true,
        reference: true,
        transactionIds: true,
        createdAt: true,
        completedAt: true,
        seller: { select: { displayName: true, email: true } },
      },
      take: 100,
    })

    await db.$disconnect()
    return {
      success: true,
      data: payouts.map((payout: {
        id: string
        sellerId: string
        amount: unknown
        currency: string
        status: string
        reference: string | null
        transactionIds: string[]
        createdAt: Date
        completedAt: Date | null
        seller: { displayName: string; email: string }
      }) => ({
        id: payout.id,
        referrerId: payout.sellerId,
        referrerName: payout.seller.displayName,
        referrerEmail: payout.seller.email,
        amount: String(payout.amount),
        currency: payout.currency,
        status: payout.status,
        reference: payout.reference,
        transactionIds: payout.transactionIds,
        createdAt: payout.createdAt.toISOString(),
        completedAt: payout.completedAt?.toISOString() ?? null,
      })),
    }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, data: [], message: err instanceof Error ? err.message : 'Error al cargar pagos de referido' }
  }
}
