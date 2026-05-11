import { getEnv } from './env.mjs'
import { FailureCode } from './failures.mjs'

let prismaInstance = null

export async function getPrisma() {
  if (prismaInstance) return prismaInstance

  const dbUrl = getEnv('DATABASE_URL')
  if (!dbUrl) throw new Error('DATABASE_URL not available')

  const mod = await import('../../../generated/prisma/client.js')
  const { PrismaPg } = await import('@prisma/adapter-pg')
  const adapter = new PrismaPg({ connectionString: dbUrl })
  prismaInstance = new mod.PrismaClient({ adapter })
  return prismaInstance
}

export async function disconnectPrisma() {
  if (prismaInstance) {
    await prismaInstance.$disconnect().catch(() => {})
    prismaInstance = null
  }
}

const REQUIRED_TABLES = [
  'mp_users',
  'mp_listings',
  'mp_transactions',
  'mp_listing_questions',
  'mp_chat_threads',
  'mp_messages',
  'mp_disputes',
  'mp_payouts',
  'mp_payout_methods',
  'mp_transaction_status_history',
  'mp_blob_object_metadata',
]

export async function checkDbTables() {
  const prisma = await getPrisma()
  const results = []
  const missing = []

  for (const table of REQUIRED_TABLES) {
    try {
      const result = await prisma.$queryRawUnsafe(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '${table}') as "exists"`
      )
      const exists = result?.[0]?.exists === true
      results.push({ table, exists })
      if (!exists) missing.push(table)
    } catch {
      missing.push(table)
      results.push({ table, exists: false, error: true })
    }
  }

  return { tables: results, missing, ok: missing.length === 0 }
}

export async function findUserByIdentifier(identifier) {
  const prisma = await getPrisma()

  let user = await prisma.mpUser.findUnique({
    where: { email: identifier },
    select: {
      id: true, email: true, displayName: true, isSeller: true,
      role: true, passwordHash: true, isBanned: true, createdAt: true,
    },
  })

  if (!user) {
    user = await prisma.mpUser.findFirst({
      where: {
        email: { equals: identifier, mode: 'insensitive' },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true, email: true, displayName: true, isSeller: true,
        role: true, passwordHash: true, isBanned: true, createdAt: true,
      },
    })
  }

  if (!user) {
    user = await prisma.mpUser.findFirst({
      where: { displayName: identifier },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true, email: true, displayName: true, isSeller: true,
        role: true, passwordHash: true, isBanned: true, createdAt: true,
      },
    })
  }

  if (!user) {
    user = await prisma.mpUser.findFirst({
      where: {
        displayName: { equals: identifier, mode: 'insensitive' },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true, email: true, displayName: true, isSeller: true,
        role: true, passwordHash: true, isBanned: true, createdAt: true,
      },
    })
  }

  return user
}

export async function findUserByEmail(email) {
  const prisma = await getPrisma()
  return prisma.mpUser.findUnique({
    where: { email },
    select: {
      id: true, email: true, displayName: true, isSeller: true,
      role: true, passwordHash: true, isBanned: true, createdAt: true,
    },
  })
}

export async function countConflictsByDisplayName(displayName, excludeId) {
  const prisma = await getPrisma()
  const conflicts = await prisma.mpUser.findMany({
    where: { displayName },
    select: { id: true },
  })
  return conflicts.filter(u => u.id !== excludeId).length
}

export async function findListingBySlug(slug) {
  const prisma = await getPrisma()
  return prisma.mpListing.findUnique({
    where: { slug },
    include: { seller: true },
  })
}

export async function findActiveListingsBySlug(slug) {
  const prisma = await getPrisma()
  return prisma.mpListing.findMany({
    where: {
      slug: { contains: slug },
      status: 'ACTIVE',
    },
    orderBy: { createdAt: 'desc' },
  })
}
