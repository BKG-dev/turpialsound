import { loadEnv, getEnv } from '../lib/env.mjs'
import { getPrisma, disconnectPrisma, findUserByIdentifier, findListingBySlug } from '../lib/db-read.mjs'
import { FailureCode } from '../lib/failures.mjs'

export const MODULE_ID = 'QA-02'
export const MODULE_NAME = 'Publish Listing'
export const LAYER = 'B'

const QA_LISTING = {
  slug: 'qa-e2e-s03f-selleria-discovery',
  title: 'QA S03F sellerIA Discovery',
  description: 'Listing QA controlado para validar discovery en S03F. No tocar manualmente.',
  category: 'instrumentos-nuevos',
  tags: ['qa', 's03f', 'discovery', 'selleria'],
  price: '125.00',
  currency: 'USD',
  // S15 Location fields
  city: 'Caracas',
  state: 'Distrito Capital',
  isLocationPublic: true,
}

export async function run(report) {
  const startedAt = new Date().toISOString()
  report.addModule(MODULE_ID, 'RUNNING', { startedAt })
  const checks = []

  loadEnv()

  const sellerIdentifier = getEnv('QA_SELLER_IDENTIFIER')
  if (!sellerIdentifier) {
    checks.push({ check: 'env', status: 'FAIL', detail: 'QA_SELLER_IDENTIFIER missing' })
    report.addModule(MODULE_ID, 'FAIL', {
      failureCode: FailureCode.ENV_MISSING,
      failureDetail: 'QA_SELLER_IDENTIFIER missing',
      startedAt,
      finishedAt: new Date().toISOString(),
      checks,
    })
    return { ok: false, error: 'QA_SELLER_IDENTIFIER missing', code: FailureCode.ENV_MISSING }
  }

  let prisma
  try {
    prisma = await getPrisma()
  } catch (error) {
    checks.push({ check: 'dbConnection', status: 'FAIL', detail: error.message })
    report.addModule(MODULE_ID, 'FAIL', {
      failureCode: 'DB_MISSING_TABLE',
      failureDetail: error.message,
      startedAt,
      finishedAt: new Date().toISOString(),
      checks,
    })
    return { ok: false, error: error.message, code: 'DB_MISSING_TABLE' }
  }

  // ── 1. Find sellerIA ──────────────────────────────────────────────────────
  const seller = await findUserByIdentifier(sellerIdentifier)
  if (!seller) {
    checks.push({ check: 'sellerLookup', status: 'FAIL', detail: `No user found for identifier: ${sellerIdentifier.slice(0, 3)}***` })
    report.addModule(MODULE_ID, 'FAIL', {
      failureCode: 'QA_USER_MISSING',
      failureDetail: `Seller user not found`,
      startedAt,
      finishedAt: new Date().toISOString(),
      checks,
    })
    await disconnectPrisma()
    return { ok: false, error: 'Seller not found', code: 'QA_USER_MISSING' }
  }

  if (!seller.isSeller) {
    checks.push({ check: 'sellerLookup', status: 'FAIL', detail: `User is not a seller: isSeller=${seller.isSeller}` })
    report.addModule(MODULE_ID, 'FAIL', {
      failureCode: FailureCode.LISTING_CREATE_FAILED,
      failureDetail: 'User is not a seller',
      startedAt,
      finishedAt: new Date().toISOString(),
      checks,
    })
    await disconnectPrisma()
    return { ok: false, error: 'User is not a seller', code: FailureCode.LISTING_CREATE_FAILED }
  }

  checks.push({
    check: 'sellerLookup',
    status: 'PASS',
    detail: `Found sellerIA: ${seller.displayName} (${seller.email}), id=${seller.id.slice(0, 4)}***`,
  })

  // ── 2. Reconcile or create QA listing ─────────────────────────────────────
  let listing
  let listingAction = 'created'

  try {
    listing = await findListingBySlug(QA_LISTING.slug)

    if (listing) {
      listing = await prisma.mpListing.update({
        where: { id: listing.id },
        data: {
          sellerId: seller.id,
          title: QA_LISTING.title,
          description: QA_LISTING.description,
          category: QA_LISTING.category,
          tags: QA_LISTING.tags,
          price: QA_LISTING.price,
          currency: QA_LISTING.currency,
          coverImageUrl: null,
          mediaUrls: [],
          hasInventory: true,
          inventory: 10,
          city: QA_LISTING.city,
          state: QA_LISTING.state,
          isLocationPublic: QA_LISTING.isLocationPublic,
          status: 'ACTIVE',
          publishedAt: new Date(),
        },
        select: { id: true, slug: true, status: true, title: true, price: true, category: true, inventory: true, city: true, state: true, isLocationPublic: true },
      })
      listingAction = 'updated'
    } else {
      listing = await prisma.mpListing.create({
        data: {
          sellerId: seller.id,
          title: QA_LISTING.title,
          description: QA_LISTING.description,
          category: QA_LISTING.category,
          tags: QA_LISTING.tags,
          price: QA_LISTING.price,
          currency: QA_LISTING.currency,
          coverImageUrl: null,
          mediaUrls: [],
          hasInventory: true,
          inventory: 10,
          city: QA_LISTING.city,
          state: QA_LISTING.state,
          isLocationPublic: QA_LISTING.isLocationPublic,
          slug: QA_LISTING.slug,
          status: 'ACTIVE',
          publishedAt: new Date(),
        },
        select: { id: true, slug: true, status: true, title: true, price: true, category: true, inventory: true, city: true, state: true, isLocationPublic: true },
      })
    }

    checks.push({
      check: 'listingCreate',
      status: 'PASS',
      detail: `Listing ${listingAction}: slug=${listing.slug}, status=${listing.status}, price=${listing.price}, inventory=${listing.inventory}, city=${listing.city}, state=${listing.state}, locationPublic=${listing.isLocationPublic}`,
      listing: { id: listing.id, slug: listing.slug, status: listing.status, title: listing.title, inventory: listing.inventory, city: listing.city, state: listing.state },
    })
  } catch (error) {
    checks.push({
      check: 'listingCreate',
      status: 'FAIL',
      detail: error.message,
    })
    report.addModule(MODULE_ID, 'FAIL', {
      failureCode: FailureCode.LISTING_CREATE_FAILED,
      failureDetail: error.message,
      startedAt,
      finishedAt: new Date().toISOString(),
      checks,
    })
    await disconnectPrisma()
    return { ok: false, error: error.message, code: FailureCode.LISTING_CREATE_FAILED }
  }

  // ── 3. Verify listing is ACTIVE in DB with location fields ─────────────────
  const verify = await prisma.mpListing.findUnique({
    where: { id: listing.id },
    select: { id: true, slug: true, status: true, sellerId: true, inventory: true, city: true, state: true, isLocationPublic: true },
  })

  const isActive = verify && verify.status === 'ACTIVE' && verify.sellerId === seller.id
  const locationOk = verify && verify.city === QA_LISTING.city && verify.state === QA_LISTING.state && verify.isLocationPublic === true
  const inventoryOk = verify && verify.hasInventory !== false && verify.inventory > 0

  checks.push({
    check: 'listingVerify',
    status: isActive ? 'PASS' : 'FAIL',
    detail: isActive
      ? `DB verify: listing ACTIVE, seller matches`
      : verify
        ? `Status=${verify.status}, sellerId mismatch`
        : 'Listing not found after create/update',
  })
  checks.push({
    check: 'locationFields',
    status: locationOk ? 'PASS' : 'FAIL',
    detail: locationOk
      ? `Location: city=${verify.city}, state=${verify.state}, isPublic=${verify.isLocationPublic}`
      : `Location mismatch: expected city=${QA_LISTING.city} state=${QA_LISTING.state}, got city=${verify?.city} state=${verify?.state}`,
  })
  checks.push({
    check: 'inventorySetup',
    status: inventoryOk ? 'PASS' : 'FAIL',
    detail: inventoryOk
      ? `Inventory: hasInventory=true, stock=${verify.inventory}`
      : `Inventory setup failed: stock=${verify?.inventory}`,
  })

  await disconnectPrisma()

  // ── Final status ──────────────────────────────────────────────────────────
  const allPassed = checks.every(c => c.status === 'PASS')
  const finishedAt = new Date().toISOString()

  report.addModule(MODULE_ID, allPassed ? 'PASS' : 'FAIL', {
    startedAt,
    finishedAt,
    durationMs: new Date(finishedAt).getTime() - new Date(startedAt).getTime(),
    failureCode: allPassed ? null : FailureCode.LISTING_CREATE_FAILED,
    failureDetail: allPassed ? null : 'Listing publish validation failed',
    checks,
  })

  const result = { ok: allPassed }
  if (listing) {
    result.listingId = listing.id
    result.slug = listing.slug
    result.action = listingAction
  }
  return result
}
