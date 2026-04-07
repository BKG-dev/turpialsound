// Turpial Sound — Singleton de Prisma Client
// Compatible con Prisma 7 (provider = "prisma-client", output = "../generated/prisma").
// El patrón singleton evita instancias múltiples en desarrollo con hot reload de Next.js.
// Requiere DATABASE_URL configurada en el entorno de ejecución.

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
