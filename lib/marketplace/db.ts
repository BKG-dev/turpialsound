/**
 * Shared Prisma client factory for marketplace server actions.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getDb(): Promise<any | null> {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL
  if (!url) return null
  try {
    const { PrismaClient } = await import('../../generated/prisma/client')
    const { PrismaPg } = await import('@prisma/adapter-pg')
    const adapter = new PrismaPg({ connectionString: url })
    return new PrismaClient({ adapter })
  } catch {
    return null
  }
}
