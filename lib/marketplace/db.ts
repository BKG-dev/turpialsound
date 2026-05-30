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
    // Remove channel_binding param which can interfere with Prisma metadata queries
    const cleanUrl = url.replace(/&channel_binding=[^&\s]+/g, '')
    const adapter = new PrismaPg({ connectionString: cleanUrl })
    return new PrismaClient({ adapter })
  } catch {
    return null
  }
}
