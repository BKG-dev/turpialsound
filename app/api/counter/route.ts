/**
 * Site Visit Counter API
 *
 * GET  /api/counter  — returns current visit count
 * POST /api/counter  — increments counter by 1, returns new count
 *
 * Uses the SiteCounter Prisma model (id=1 singleton row).
 * Falls back gracefully if the DB or migration is unavailable.
 *
 * SETUP: After adding SiteCounter to schema.prisma, run:
 *   npx prisma db push   (or npx prisma migrate dev --name add_site_counter)
 *   npx prisma generate
 */

import { NextResponse } from 'next/server'

const BASE_COUNT = 81000

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getPrismaClient(): Promise<any | null> {
  try {
    // Dynamic import so the route compiles before the migration is applied.
    // The 'generated/prisma' module is created by `prisma generate`.
    const mod = await import('../../../generated/prisma/client')
    const { PrismaPg } = await import('@prisma/adapter-pg')
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
    return new mod.PrismaClient({ adapter })
  } catch {
    return null
  }
}

export async function GET() {
  const prisma = await getPrismaClient()
  if (!prisma) {
    return NextResponse.json({ count: BASE_COUNT })
  }
  try {
    const counter = await prisma.siteCounter.findUnique({ where: { id: 1 } })
    await prisma.$disconnect()
    return NextResponse.json({ count: counter?.count ?? BASE_COUNT })
  } catch {
    await prisma.$disconnect().catch(() => {})
    return NextResponse.json({ count: BASE_COUNT })
  }
}

export async function POST() {
  const prisma = await getPrismaClient()
  if (!prisma) {
    return NextResponse.json({ count: BASE_COUNT })
  }
  try {
    const counter = await prisma.siteCounter.upsert({
      where: { id: 1 },
      update: { count: { increment: 1 } },
      create: { id: 1, count: BASE_COUNT + 1 },
    })
    await prisma.$disconnect()
    return NextResponse.json({ count: counter.count })
  } catch {
    await prisma.$disconnect().catch(() => {})
    return NextResponse.json({ count: BASE_COUNT })
  }
}
