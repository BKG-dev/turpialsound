'use server'

import { getDb } from '@/lib/marketplace/db'
import { getSession } from '@/lib/marketplace/auth'
import type { ActionResult } from '@/lib/validations/marketplace'
import { adaptDbListing } from '@/lib/marketplace/adapters'
import type { Listing } from '@/types/marketplace'

export async function toggleFavorite(
  listingId: string,
): Promise<ActionResult<{ isFavorited: boolean }>> {
  const session = await getSession()
  if (!session) return { success: false, message: 'Debes iniciar sesión para guardar favoritos' }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    const user = await db.mpUser.findUnique({
      where: { id: session.userId },
      select: { favoriteListings: { where: { id: listingId }, select: { id: true } } },
    })

    const isFavorited = (user?.favoriteListings.length ?? 0) > 0

    if (isFavorited) {
      await db.mpUser.update({
        where: { id: session.userId },
        data: { favoriteListings: { disconnect: { id: listingId } } },
      })
      await db.mpListing.update({
        where: { id: listingId },
        data: { favoriteCount: { decrement: 1 } },
      })
    } else {
      await db.mpUser.update({
        where: { id: session.userId },
        data: { favoriteListings: { connect: { id: listingId } } },
      })
      await db.mpListing.update({
        where: { id: listingId },
        data: { favoriteCount: { increment: 1 } },
      })
    }

    await db.$disconnect()
    return {
      success: true,
      data: { isFavorited: !isFavorited },
      message: !isFavorited ? 'Guardado en favoritos' : 'Eliminado de favoritos',
    }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error al actualizar favorito' }
  }
}

export async function getMyFavorites(): Promise<ActionResult<Listing[]>> {
  const session = await getSession()
  if (!session) return { success: false, message: 'No autenticado' }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    const user = await db.mpUser.findUnique({
      where: { id: session.userId },
      select: {
        favoriteListings: {
          include: { seller: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    await db.$disconnect()
    const listings = (user?.favoriteListings ?? []).map(adaptDbListing)
    return { success: true, data: listings, message: 'OK' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error al cargar favoritos' }
  }
}

export async function getMyFavoriteIds(): Promise<ActionResult<string[]>> {
  const session = await getSession()
  if (!session) return { success: false, message: 'No autenticado' }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    const user = await db.mpUser.findUnique({
      where: { id: session.userId },
      select: { favoriteListings: { select: { id: true } } },
    })
    await db.$disconnect()
    return {
      success: true,
      data: (user?.favoriteListings ?? []).map((l: { id: string }) => l.id),
      message: 'OK',
    }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error' }
  }
}
