import fs from 'node:fs'
import path from 'node:path'
import bcrypt from 'bcryptjs'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, MpPayoutMethodType } from '../generated/prisma/client'

type QaUserSpec = {
  email: string
  displayName: string
  password: string
  isSeller: boolean
  bio: string
  phone: string
}

const BUYER: QaUserSpec = {
  email: 'buyerIA@local.test',
  displayName: 'buyerIA',
  password: 'BuyerIA_QA_2026!',
  isSeller: false,
  bio: 'Cuenta QA persistente para recorridos buyer end-to-end del marketplace local.',
  phone: '+58 412 000 0001',
}

const SELLER: QaUserSpec = {
  email: 'sellerIA@local.test',
  displayName: 'sellerIA',
  password: '13894619',
  isSeller: true,
  bio: 'Cuenta QA persistente para recorridos seller end-to-end del marketplace local.',
  phone: '+58 412 000 0002',
}

const SELLER_PAYOUT = {
  methodType: MpPayoutMethodType.PAGO_MOVIL,
  displayLabel: 'Cobro QA sellerIA',
  currency: 'VES',
  encryptedData: JSON.stringify({
    titular: 'sellerIA',
    cedula: '26000001',
    telefono: '04120000002',
    banco: 'Mercantil',
  }),
}

const QA_LISTING = {
  slug: 'selleria-qa-e2e-persistente',
  title: 'sellerIA QA e2e persistente',
  description:
    'Listing QA persistente para recorridos end-to-end locales buyerIA -> sellerIA con compra manual, chat y validacion cruzada.',
  category: 'instrumentos-nuevos',
  tags: ['qa', 'selleria', 'e2e', 'persistente'],
  price: '125.00',
  currency: 'USD',
}

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return
  const content = fs.readFileSync(filePath, 'utf8')
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq < 0) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

async function getDb() {
  const root = process.cwd()
  loadEnvFile(path.join(root, '.env.local'))
  loadEnvFile(path.join(root, '.env'))

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL no disponible en .env.local/.env')
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
  return new PrismaClient({ adapter })
}

async function ensureUser(db: PrismaClient, spec: QaUserSpec) {
  const passwordHash = await bcrypt.hash(spec.password, 12)

  const displayNameConflict = await db.mpUser.findFirst({
    where: {
      displayName: spec.displayName,
      email: { not: spec.email },
    },
    select: { id: true, email: true, displayName: true },
  })

  if (displayNameConflict) {
    throw new Error(`Conflicto de displayName para ${spec.displayName}: ${displayNameConflict.email}`)
  }

  return db.mpUser.upsert({
    where: { email: spec.email },
    update: {
      displayName: spec.displayName,
      passwordHash,
      isSeller: spec.isSeller,
      role: 'USER',
      isBanned: false,
      bio: spec.bio,
      phone: spec.phone,
      whatsappConsent: true,
      whatsappConsentAt: new Date(),
    },
    create: {
      email: spec.email,
      displayName: spec.displayName,
      passwordHash,
      isSeller: spec.isSeller,
      role: 'USER',
      bio: spec.bio,
      phone: spec.phone,
      whatsappConsent: true,
      whatsappConsentAt: new Date(),
      emailVerified: true,
      emailVerifiedAt: new Date(),
      verificationLevel: 'basic',
      isVerified: false,
      totalPurchases: 0,
      totalSales: 0,
    },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      isSeller: true,
      isBanned: true,
    },
  })
}

async function ensureSellerPayout(db: PrismaClient, sellerId: string) {
  const existing = await db.mpPayoutMethod.findFirst({
    where: {
      userId: sellerId,
      displayLabel: SELLER_PAYOUT.displayLabel,
    },
    select: { id: true },
  })

  if (existing) {
    await db.mpPayoutMethod.updateMany({
      where: { userId: sellerId },
      data: { isDefault: false },
    })

    return db.mpPayoutMethod.update({
      where: { id: existing.id },
      data: {
        methodType: SELLER_PAYOUT.methodType,
        displayLabel: SELLER_PAYOUT.displayLabel,
        currency: SELLER_PAYOUT.currency,
        encryptedData: SELLER_PAYOUT.encryptedData,
        isActive: true,
        isDefault: true,
      },
      select: {
        id: true,
        methodType: true,
        displayLabel: true,
        isDefault: true,
      },
    })
  }

  await db.mpPayoutMethod.updateMany({
    where: { userId: sellerId },
    data: { isDefault: false },
  })

  return db.mpPayoutMethod.create({
    data: {
      userId: sellerId,
      methodType: SELLER_PAYOUT.methodType,
      displayLabel: SELLER_PAYOUT.displayLabel,
      currency: SELLER_PAYOUT.currency,
      encryptedData: SELLER_PAYOUT.encryptedData,
      isActive: true,
      isDefault: true,
    },
    select: {
      id: true,
      methodType: true,
      displayLabel: true,
      isDefault: true,
    },
  })
}

async function ensureSellerListing(db: PrismaClient, sellerId: string) {
  const existing = await db.mpListing.findUnique({
    where: { slug: QA_LISTING.slug },
    select: { id: true },
  })

  if (existing) {
    return db.mpListing.update({
      where: { id: existing.id },
      data: {
        sellerId,
        title: QA_LISTING.title,
        description: QA_LISTING.description,
        category: QA_LISTING.category,
        tags: QA_LISTING.tags,
        price: QA_LISTING.price,
        currency: QA_LISTING.currency,
        coverImageUrl: null,
        mediaUrls: [],
        hasInventory: false,
        inventory: null,
        status: 'ACTIVE',
        publishedAt: new Date(),
      },
      select: {
        id: true,
        slug: true,
        title: true,
        status: true,
        sellerId: true,
      },
    })
  }

  return db.mpListing.create({
    data: {
      sellerId,
      title: QA_LISTING.title,
      description: QA_LISTING.description,
      category: QA_LISTING.category,
      tags: QA_LISTING.tags,
      price: QA_LISTING.price,
      currency: QA_LISTING.currency,
      coverImageUrl: null,
      mediaUrls: [],
      hasInventory: false,
      inventory: null,
      slug: QA_LISTING.slug,
      status: 'ACTIVE',
      publishedAt: new Date(),
    },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      sellerId: true,
    },
  })
}

async function main() {
  const db = await getDb()
  try {
    const buyer = await ensureUser(db, BUYER)
    const seller = await ensureUser(db, SELLER)
    const payout = await ensureSellerPayout(db, seller.id)
    const listing = await ensureSellerListing(db, seller.id)

    const summary = {
      buyer,
      seller,
      payout,
      listing,
      credentials: {
        buyer: { identifier: BUYER.displayName, email: BUYER.email, password: BUYER.password },
        seller: { identifier: SELLER.displayName, email: SELLER.email, password: SELLER.password },
      },
    }

    console.log(JSON.stringify(summary, null, 2))
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
