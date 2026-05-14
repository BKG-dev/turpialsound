'use server'

import { getDb } from '@/lib/marketplace/db'
import { getSession } from '@/lib/marketplace/auth'
import { revalidatePath } from 'next/cache'

type ActionResult<T = undefined> = { success: true; data: T; message: string } | { success: false; message: string }

export async function submitReview(input: {
  sellerId: string
  listingId?: string
  transactionId?: string
  rating: number
  title?: string
  comment?: string
}): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, message: 'Debes iniciar sesion para dejar una resena' }

  if (input.rating < 1 || input.rating > 5) {
    return { success: false, message: 'La calificacion debe ser entre 1 y 5' }
  }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    await db.$transaction(async (txn: typeof db) => {
      await txn.mpReview.create({
        data: {
          buyerId: session.userId,
          sellerId: input.sellerId,
          listingId: input.listingId ?? null,
          transactionId: input.transactionId ?? null,
          rating: input.rating,
          title: input.title ?? null,
          comment: input.comment ?? null,
        },
      })

      // Recompute seller average rating
      const agg = await txn.mpReview.aggregate({
        where: { sellerId: input.sellerId },
        _avg: { rating: true },
        _count: { id: true },
      })
      const avg = agg._avg.rating ? Math.round(agg._avg.rating * 100) / 100 : null
      await txn.mpUser.update({
        where: { id: input.sellerId },
        data: {
          sellerRating: avg,
          reviewCount: agg._count.id,
        },
      })
    })

    revalidatePath('/marketplace/dashboard')
    return { success: true, data: undefined, message: 'Resena enviada correctamente' }
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Error al enviar resena' }
  }
}

export async function getSellerReviews(sellerId: string, limit = 10) {
  const db = await getDb()
  if (!db) return []

  try {
    const reviews = await db.mpReview.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        buyer: { select: { id: true, displayName: true, avatarUrl: true } },
        listing: { select: { id: true, title: true, slug: true } },
      },
    })
    await db.$disconnect()
    return reviews
  } catch {
    await db.$disconnect().catch(() => {})
    return []
  }
}
