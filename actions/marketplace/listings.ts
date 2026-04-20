'use server'

import {
  createListingSchema,
  type CreateListingInput,
  type ActionResult,
} from '@/lib/validations/marketplace'
import { getDb } from '@/lib/marketplace/db'
import { getSession } from '@/lib/marketplace/auth'
import type { Listing } from '@/types/marketplace'
import { adaptDbListing } from '@/lib/marketplace/adapters'

// ─── SLUG GENERATOR ───────────────────────────────────────────────────────────
function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80)
  return `${base}-${Date.now()}`
}

// ─── GET ACTIVE LISTINGS (UI-compatible) ─────────────────────────────────────
export async function getActiveListings(): Promise<Listing[]> {
  const db = await getDb()
  if (!db) return []

  try {
    const listings = await db.mpListing.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      include: { seller: true },
    })
    await db.$disconnect()
    return listings.map(adaptDbListing)
  } catch {
    await db.$disconnect().catch(() => {})
    return []
  }
}

// ─── GET LISTING BY ID ────────────────────────────────────────────────────────
export async function getListingById(id: string): Promise<Listing | null> {
  const db = await getDb()
  if (!db) return null
  try {
    const l = await db.mpListing.findUnique({
      where: { id, status: 'ACTIVE' },
      include: { seller: true },
    })
    if (!l) { await db.$disconnect(); return null }
    await db.$disconnect()
    return adaptDbListing(l)
  } catch {
    await db.$disconnect().catch(() => {})
    return null
  }
}

// ─── GET LISTING BY SLUG ──────────────────────────────────────────────────────
export async function getListingBySlug(slug: string): Promise<Listing | null> {
  const db = await getDb()
  if (!db) return null
  try {
    const l = await db.mpListing.findUnique({
      where: { slug, status: { in: ['ACTIVE', 'SOLD_OUT'] } },
      include: { seller: true },
    })
    if (!l) { await db.$disconnect(); return null }
    await db.$disconnect()
    return adaptDbListing(l)
  } catch {
    await db.$disconnect().catch(() => {})
    return null
  }
}

// ─── GET LISTINGS BY CATEGORY ─────────────────────────────────────────────────
export async function getListingsByCategory(
  category: string,
  limit = 20,
): Promise<Listing[]> {
  const db = await getDb()
  if (!db) return []
  try {
    const listings = await db.mpListing.findMany({
      where: { category, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { seller: true },
    })
    await db.$disconnect()
    return listings.map(adaptDbListing)
  } catch {
    await db.$disconnect().catch(() => {})
    return []
  }
}

// ─── GET USER'S OWN LISTINGS (SELLER VIEW) ───────────────────────────────────
// Returns raw DB records (not adapted) so the dashboard can read the real status enum.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getUserListings(): Promise<ActionResult<any[]>> {
  const session = await getSession()
  if (!session) return { success: false, message: 'No autenticado' }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    const listings = await db.mpListing.findMany({
      where: { sellerId: session.userId },
      orderBy: { createdAt: 'desc' },
      include: { seller: true, questions: true },
    })
    await db.$disconnect()
    return { success: true, data: listings, message: 'OK' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { success: false, message }
  }
}

// ─── UPDATE LISTING STATUS ────────────────────────────────────────────────────
export async function updateListingStatus(
  id: string,
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED',
): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, message: 'No autenticado' }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    const listing = await db.mpListing.findUnique({ where: { id } })
    if (!listing) return { success: false, message: 'Listing no encontrado' }
    if (listing.sellerId !== session.userId && session.role !== 'SUPER') {
      return { success: false, message: 'Sin permiso' }
    }

    await db.mpListing.update({ where: { id }, data: { status } })
    await db.$disconnect()
    return { success: true, data: undefined, message: `Listing ${status.toLowerCase()}` }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

// ─── INCREMENT VIEW COUNT ─────────────────────────────────────────────────────
export async function incrementListingView(id: string): Promise<void> {
  const db = await getDb()
  if (!db) return
  try {
    await db.mpListing.update({ where: { id }, data: { viewCount: { increment: 1 } } })
    await db.$disconnect()
  } catch {
    await db.$disconnect().catch(() => {})
  }
}

// ─── CREATE LISTING ───────────────────────────────────────────────────────────
export async function createListing(
  input: CreateListingInput,
): Promise<ActionResult<{ id: string; slug: string }>> {
  const parsed = createListingSchema.safeParse(input)
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors as Record<string, string[]>
    return { success: false, message: 'Datos inválidos', errors }
  }

  const data = parsed.data

  const session = await getSession()
  if (!session) {
    return { success: false, message: 'Debes iniciar sesión para publicar un listing' }
  }

  const db = await getDb()
  if (!db) {
    return { success: false, message: 'Base de datos no disponible' }
  }

  try {
    const slug = generateSlug(data.title)

    const listing = await db.mpListing.create({
      data: {
        sellerId: session.userId,
        title: data.title,
        description: data.description,
        category: data.category,
        tags: data.tags,
        price: String(data.price),
        currency: data.currency,
        coverImageUrl: data.coverImageUrl ?? null,
        mediaUrls: data.mediaUrls,
        hasInventory: data.hasInventory,
        inventory: data.inventory ?? null,
        status: 'ACTIVE',
        publishedAt: new Date(),
        slug,
      },
      select: { id: true, slug: true },
    })

    await db.$disconnect()
    return { success: true, data: listing, message: 'Listing creado correctamente' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { success: false, message: `Error al crear listing: ${message}` }
  }
}
