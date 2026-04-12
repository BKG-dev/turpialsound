'use server'

import {
  createListingSchema,
  type CreateListingInput,
  type ActionResult,
} from '@/lib/validations/marketplace'

// ─── DB CLIENT (GRACEFUL FALLBACK) ────────────────────────────────────────────
// Dynamic import so the action compiles before Jean runs the migration.
// Returns null if the generated client or DB tables are not yet available.
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

  // 2. Get DB client
  const prisma = await getPrismaClient()
  if (!prisma) {
    // DB not yet available — Jean will run the migration after merge
    return {
      success: false,
      message: 'Base de datos no disponible. Pendiente de migración.',
    }
  }

  // 3. Create listing
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
