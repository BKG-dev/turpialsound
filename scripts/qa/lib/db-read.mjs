import { getEnv } from './env.mjs'

let prismaInstance = null

export async function getPrisma() {
  if (prismaInstance) return prismaInstance

  const dbUrl = getEnv('DATABASE_URL')
  if (!dbUrl) throw new Error('DATABASE_URL not available')

  const mod = await import('../../../generated/prisma/client')
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
