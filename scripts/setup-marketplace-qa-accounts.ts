import fs from 'node:fs'
import path from 'node:path'
import bcrypt from 'bcryptjs'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, MpPayoutMethodType } from '../generated/prisma/client'

type QaUserSpec = {
  label: 'buyer' | 'seller'
  email: string
  displayName: string
  password: string
  isSeller: boolean
  bio: string
  phone: string
}

type QaUserMatch = {
  id: string
  createdAt: Date
}

type EnsureUserResult = {
  id: string
  created: boolean
  updated: boolean
  matchedByEmail: boolean
  matchedByDisplayName: boolean
  quarantinedConflicts: number
}

type EnsureEntityResult = {
  created: boolean
  updated: boolean
}

class DuplicateQaConflictError extends Error {
  code = 'DUPLICATE_QA_CONFLICT'

  constructor(spec: QaUserSpec, ids: string[]) {
    const maskedIds = ids.map(maskId)
    super(`DUPLICATE_QA_CONFLICT:${spec.label}:${maskedIds.join(',')}`)
  }
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

function loadQaEnv() {
  const root = process.cwd()
  loadEnvFile(path.join(root, '.env.local'))
  loadEnvFile(path.join(root, '.env'))
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`${name} no disponible en .env.local/.env`)
  }
  return value
}

function maskId(id: string) {
  if (id.length <= 8) return `${id.slice(0, 2)}***${id.slice(-2)}`
  return `${id.slice(0, 4)}***${id.slice(-4)}`
}

function getLegacyDisplayName(displayName: string, id: string) {
  const suffix = id.slice(-6).toLowerCase()
  return `${displayName}__legacy__${suffix}`.slice(0, 50)
}

function getQaUserSpecs() {
  const buyer: QaUserSpec = {
    label: 'buyer',
    email: requireEnv('QA_BUYER_EMAIL'),
    displayName: requireEnv('QA_BUYER_IDENTIFIER'),
    password: requireEnv('QA_BUYER_PASSWORD'),
    isSeller: false,
    bio: 'Cuenta QA persistente para recorridos buyer end-to-end del marketplace local.',
    phone: '+58 412 000 0001',
  }

  const seller: QaUserSpec = {
    label: 'seller',
    email: requireEnv('QA_SELLER_EMAIL'),
    displayName: requireEnv('QA_SELLER_IDENTIFIER'),
    password: requireEnv('QA_SELLER_PASSWORD'),
    isSeller: true,
    bio: 'Cuenta QA persistente para recorridos seller end-to-end del marketplace local.',
    phone: '+58 412 000 0002',
  }

  return { buyer, seller }
}

async function getDb() {
  loadQaEnv()

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL no disponible en .env.local/.env')
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
  return new PrismaClient({ adapter })
}

async function findQaUserMatches(db: PrismaClient, spec: QaUserSpec) {
  const byEmail = await db.mpUser.findUnique({
    where: { email: spec.email },
    select: { id: true, createdAt: true },
  })

  const byDisplayName = await db.mpUser.findMany({
    where: { displayName: spec.displayName },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { id: true, createdAt: true },
  })

  return { byEmail, byDisplayName }
}

function resolveQaUserTarget(spec: QaUserSpec, byEmail: QaUserMatch | null, byDisplayName: QaUserMatch[]) {
  const uniqueIds = new Set<string>()

  if (byEmail) uniqueIds.add(byEmail.id)
  for (const candidate of byDisplayName) uniqueIds.add(candidate.id)

  if (uniqueIds.size > 1) {
    throw new DuplicateQaConflictError(spec, [...uniqueIds])
  }

  if (byEmail) {
    return {
      targetId: byEmail.id,
      matchedByEmail: true,
      matchedByDisplayName: byDisplayName.some((candidate) => candidate.id === byEmail.id),
    }
  }

  if (byDisplayName.length === 1) {
    return {
      targetId: byDisplayName[0].id,
      matchedByEmail: false,
      matchedByDisplayName: true,
    }
  }

  return {
    targetId: null,
    matchedByEmail: false,
    matchedByDisplayName: false,
  }
}

async function ensureUser(db: PrismaClient, spec: QaUserSpec): Promise<EnsureUserResult> {
  const passwordHash = await bcrypt.hash(spec.password, 12)
  const { byEmail, byDisplayName } = await findQaUserMatches(db, spec)
  let quarantinedConflicts = 0

  if (byEmail) {
    const displayNameOnlyConflicts = byDisplayName.filter((candidate) => candidate.id !== byEmail.id)

    if (displayNameOnlyConflicts.length > 0) {
      for (const conflict of displayNameOnlyConflicts) {
        await db.mpUser.update({
          where: { id: conflict.id },
          data: {
            displayName: getLegacyDisplayName(spec.displayName, conflict.id),
          },
          select: { id: true },
        })
      }

      quarantinedConflicts = displayNameOnlyConflicts.length
    }
  }

  const refreshed = quarantinedConflicts > 0 ? await findQaUserMatches(db, spec) : { byEmail, byDisplayName }
  const target = resolveQaUserTarget(spec, refreshed.byEmail, refreshed.byDisplayName)

  if (target.targetId) {
    const user = await db.mpUser.update({
      where: { id: target.targetId },
      data: {
        email: spec.email,
        displayName: spec.displayName,
        passwordHash,
        isSeller: spec.isSeller,
        role: 'USER',
        isBanned: false,
        bio: spec.bio,
        phone: spec.phone,
        whatsappConsent: true,
        whatsappConsentAt: new Date(),
        emailVerified: true,
        emailVerifiedAt: new Date(),
        verificationLevel: 'basic',
      },
      select: { id: true },
    })

    return {
      id: user.id,
      created: false,
      updated: true,
      matchedByEmail: target.matchedByEmail,
      matchedByDisplayName: target.matchedByDisplayName,
      quarantinedConflicts,
    }
  }

  const user = await db.mpUser.create({
    data: {
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
      isBanned: false,
    },
    select: { id: true },
  })

  return {
    id: user.id,
    created: true,
    updated: false,
    matchedByEmail: false,
    matchedByDisplayName: false,
    quarantinedConflicts,
  }
}

async function ensureSellerPayout(db: PrismaClient, sellerId: string): Promise<EnsureEntityResult> {
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

    await db.mpPayoutMethod.update({
      where: { id: existing.id },
      data: {
        methodType: SELLER_PAYOUT.methodType,
        displayLabel: SELLER_PAYOUT.displayLabel,
        currency: SELLER_PAYOUT.currency,
        encryptedData: SELLER_PAYOUT.encryptedData,
        isActive: true,
        isDefault: true,
      },
    })

    return { created: false, updated: true }
  }

  await db.mpPayoutMethod.updateMany({
    where: { userId: sellerId },
    data: { isDefault: false },
  })

  await db.mpPayoutMethod.create({
    data: {
      userId: sellerId,
      methodType: SELLER_PAYOUT.methodType,
      displayLabel: SELLER_PAYOUT.displayLabel,
      currency: SELLER_PAYOUT.currency,
      encryptedData: SELLER_PAYOUT.encryptedData,
      isActive: true,
      isDefault: true,
    },
  })

  return { created: true, updated: false }
}

async function ensureSellerListing(db: PrismaClient, sellerId: string): Promise<EnsureEntityResult> {
  const existing = await db.mpListing.findUnique({
    where: { slug: QA_LISTING.slug },
    select: { id: true },
  })

  if (existing) {
    await db.mpListing.update({
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
    })

    return { created: false, updated: true }
  }

  await db.mpListing.create({
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
  })

  return { created: true, updated: false }
}

async function main() {
  const db = await getDb()
  const { buyer: buyerSpec, seller: sellerSpec } = getQaUserSpecs()
  try {
    const buyer = await ensureUser(db, buyerSpec)
    const seller = await ensureUser(db, sellerSpec)
    const payout = await ensureSellerPayout(db, seller.id)
    const listing = await ensureSellerListing(db, seller.id)

    console.log(
      JSON.stringify(
        {
          ok: true,
          users: {
            buyer: {
              reconciled: true,
              created: buyer.created,
              updated: buyer.updated,
              matchedByEmail: buyer.matchedByEmail,
              matchedByDisplayName: buyer.matchedByDisplayName,
              quarantinedConflicts: buyer.quarantinedConflicts,
            },
            seller: {
              reconciled: true,
              created: seller.created,
              updated: seller.updated,
              matchedByEmail: seller.matchedByEmail,
              matchedByDisplayName: seller.matchedByDisplayName,
              quarantinedConflicts: seller.quarantinedConflicts,
            },
          },
          payout: {
            ensured: true,
            created: payout.created,
            updated: payout.updated,
          },
          listing: {
            ensured: true,
            created: listing.created,
            updated: listing.updated,
          },
          counts: {
            usersCreated: Number(buyer.created) + Number(seller.created),
            usersUpdated: Number(buyer.updated) + Number(seller.updated),
            usersMatchedByEmail: Number(buyer.matchedByEmail) + Number(seller.matchedByEmail),
            usersMatchedByDisplayName:
              Number(buyer.matchedByDisplayName) + Number(seller.matchedByDisplayName),
            usersQuarantinedFromQaNamespace:
              Number(buyer.quarantinedConflicts) + Number(seller.quarantinedConflicts),
          },
        },
        null,
        2,
      ),
    )
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
