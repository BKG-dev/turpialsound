'use server'

import {
  createListingSchema,
  type CreateListingInput,
  type ActionResult,
} from '@/lib/validations/marketplace'
import {
  marketplaceMockData,
  type MockMpListing,
} from '@/lib/mocks/marketplaceData'

// Re-export so UI components import from one place
export type { MockMpListing as MpListing }

// ─── MOCK MODE ────────────────────────────────────────────────────────────────
// Local dev: add USE_MOCK_DATA=true to .env to bypass the database entirely.
// When Jean runs the migration and the tables exist, set to false (or remove).
const IS_MOCK =
  process.env.USE_MOCK_DATA === 'true' || !process.env.DATABASE_URL

// ─── DB CLIENT (GRACEFUL FALLBACK) ────────────────────────────────────────────
// Dynamic import so the action compiles before Jean runs the migration.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getPrismaClient(): Promise<any | null> {
  try {
    const mod = await import('../../generated/prisma/client')
    const { PrismaPg } = await import('@prisma/adapter-pg')
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
    return new mod.PrismaClient({ adapter })
  } catch {
    return null
  }
}

// ─── SELLER PLACEHOLDER ───────────────────────────────────────────────────────
// TODO Phase 2: replace with session.user.id from NextAuth
const PLACEHOLDER_SELLER_ID = 'dev_placeholder_seller'

// ─── SLUG GENERATOR ───────────────────────────────────────────────────────────
function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80)
  return `${base}-${Date.now()}`
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// ─── GET LISTINGS ─────────────────────────────────────────────────────────────

export async function getMockListings(): Promise<MockMpListing[]> {
  if (IS_MOCK) {
    await delay(600)
    return marketplaceMockData.listings
  }

  const prisma = await getPrismaClient()
  if (!prisma) return marketplaceMockData.listings

  try {
    const listings = await prisma.mpListing.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    })
    await prisma.$disconnect()
    return listings
  } catch {
    // Tables not yet migrated → fall back to mock data silently
    await prisma.$disconnect().catch(() => {})
    return marketplaceMockData.listings
  }
}

// ─── CREATE LISTING ───────────────────────────────────────────────────────────

export async function createListing(
  input: CreateListingInput,
): Promise<ActionResult<{ id: string; slug: string }>> {
  // 1. Validate
  const parsed = createListingSchema.safeParse(input)
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors as Record<string, string[]>
    return { success: false, message: 'Datos inválidos', errors }
  }

  const data = parsed.data

  // 2. Mock mode: return a fake success so the UI flow works end-to-end locally
  if (IS_MOCK) {
    await delay(800)
    const slug = generateSlug(data.title)
    return {
      success: true,
      data: { id: `mock_${Date.now()}`, slug },
      message: '[MOCK] Listing creado correctamente',
    }
  }

  // 3. Get DB client
  const prisma = await getPrismaClient()
  if (!prisma) {
    return {
      success: false,
      message: 'Base de datos no disponible. Pendiente de migración.',
    }
  }

  // 4. Create listing
  try {
    const slug = generateSlug(data.title)

    const listing = await prisma.mpListing.create({
      data: {
        sellerId: PLACEHOLDER_SELLER_ID,
        title: data.title,
        description: data.description,
        category: data.category,
        tags: data.tags,
        price: String(data.price), // Prisma Decimal accepts string
        currency: data.currency,
        coverImageUrl: data.coverImageUrl ?? null,
        mediaUrls: [],
        hasInventory: data.hasInventory,
        inventory: data.inventory ?? null,
        status: 'DRAFT',
        slug,
      },
      select: { id: true, slug: true },
    })

    await prisma.$disconnect()
    return { success: true, data: listing, message: 'Listing creado correctamente' }
  } catch (err) {
    await prisma.$disconnect().catch(() => {})
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { success: false, message: `Error al crear listing: ${message}` }
  }
}
