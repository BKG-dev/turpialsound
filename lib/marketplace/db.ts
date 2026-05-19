/**
 * Shared Prisma client factory for marketplace server actions.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getDb(): Promise<any | null> {
  const url = process.env.DATABASE_URL
  if (!url) return null
  try {
    const { PrismaClient } = await import('../../generated/prisma/client')
    const { PrismaPg } = await import('@prisma/adapter-pg')
    // Force unpooled: remove pgbouncer param and use direct connection for Prisma operations
    const directUrl = url.replace(/\?pgbouncer=true(&?)/, '?').replace(/\?$/, '')
    const adapter = new PrismaPg({ connectionString: directUrl })
    return new PrismaClient({ adapter })
  } catch {
    return null
  }
}
