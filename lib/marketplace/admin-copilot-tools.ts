import { list, type ListBlobResultBlob } from '@vercel/blob'
import { getDb } from '@/lib/marketplace/db'
import { getSession } from '@/lib/marketplace/auth'

export type AdminCopilotToolName =
  | 'admin_overview'
  | 'registered_users_count'
  | 'pending_operations_summary'
  | 'sales_today_summary'
  | 'seller_payout_readiness_summary'
  | 'seller_payouts_by_method_summary'
  | 'infrastructure_status_summary'
  | 'top_published_categories_summary'
  | 'top_selling_categories_summary'
  | 'top_listings_by_sales_summary'
  | 'top_listings_activity_summary'
  | 'top_clicked_listings_summary'
  | 'conversion_funnel_summary'
  | 'operations_attention_summary'
  | 'marketplace_data_availability'
  | 'marketplace_analytics_availability'
  | 'finance_readiness_summary'
  | 'dashboard_kpis'
  | 'transaction_summary'

export type AdminCopilotToolResult = {
  tool: AdminCopilotToolName
  title: string
  data: Record<string, unknown>
  generatedAt: string
}

type AdminSession = {
  userId: string
  displayName: string
  role: string
}

const ACTIVE_SALE_STATUSES = ['IN_ESCROW', 'DELIVERY_CONFIRMED', 'RELEASED'] as const
const ATTENTION_STATUSES = ['PAYMENT_RECEIVED', 'VALIDATING', 'DISPUTED'] as const
const NEON_FREE_STORAGE_LIMIT_MB = 512
const BLOB_HOBBY_STORAGE_LIMIT_MB = 1024
const BLOB_HOBBY_SIMPLE_OPERATIONS_LIMIT = 10_000
const BLOB_HOBBY_ADVANCED_OPERATIONS_LIMIT = 2_000
const BLOB_HOBBY_DATA_TRANSFER_LIMIT_GB = 10

function startOfToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function toNumber(value: unknown): number {
  return Number(value ?? 0)
}

function bytesToMb(value: unknown): number {
  const bytes = typeof value === 'bigint' ? Number(value) : Number(value ?? 0)
  if (!Number.isFinite(bytes) || bytes <= 0) return 0
  return Number((bytes / 1024 / 1024).toFixed(2))
}

function bytesTotalToMb(values: unknown[]): number {
  return bytesToMb(values.reduce<number>((sum, value) => {
    const bytes = typeof value === 'bigint' ? Number(value) : Number(value ?? 0)
    return Number.isFinite(bytes) ? sum + bytes : sum
  }, 0))
}

function usagePercent(used: number, limit: number): number {
  if (!Number.isFinite(used) || !Number.isFinite(limit) || limit <= 0) return 0
  return Number(((used / limit) * 100).toFixed(2))
}

function usageStatus(percent: number): 'ok' | 'warning' | 'critical' {
  if (percent >= 90) return 'critical'
  if (percent >= 70) return 'warning'
  return 'ok'
}

function parseJsonRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'string') return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

function maskSensitiveText(value: unknown): string {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) return ''

  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, match => {
      const [name, domain] = match.split('@')
      return `${name.slice(0, 2)}***@${domain}`
    })
    .replace(/\b\d{4,}\b/g, match => {
      if (match.length <= 4) return '****'
      return `${'*'.repeat(Math.max(4, match.length - 4))}${match.slice(-4)}`
    })
}

function safePayoutGroupLabel(methodType: string, displayLabel: string, details: Record<string, unknown>): string {
  const bank = typeof details.banco === 'string' && details.banco.trim() ? details.banco.trim() : ''
  const base = bank || displayLabel || methodType || 'sin metodo configurado'
  return maskSensitiveText(base) || 'sin metodo configurado'
}

function getUrlHost(value: string): string {
  try {
    return new URL(value).hostname
  } catch {
    return ''
  }
}

function isImageLikeUrl(value: string): boolean {
  return /\.(avif|gif|jpeg|jpg|png|webp)(\?|$)/i.test(value) || value.includes('/images/')
}

async function getVercelBlobUsage() {
  const tokens = [
    process.env.BLOB_READ_WRITE_TOKEN?.trim(),
    process.env.TS_WEB_BLOB_READ_WRITE_TOKEN?.trim(),
    process.env.TS_MARKETPLACE_SENSITIVE_BLOB_READ_WRITE_TOKEN?.trim(),
  ].filter((token): token is string => Boolean(token))
  const uniqueTokens = Array.from(new Set(tokens))

  if (uniqueTokens.length === 0) {
    return {
      mode: 'estimated_from_db_references',
      available: false,
      reason: 'No hay token server-side de Blob disponible para list() read-only; no se exponen ni se imprimen tokens.',
      blobCount: null,
      imageCount: null,
      storageMb: null,
      usagePercent: null,
      status: 'unknown',
      listOperationsUsedForMeasurement: 0,
    }
  }

  try {
    const blobs: ListBlobResultBlob[] = []
    let listOperationsUsedForMeasurement = 0

    for (const token of uniqueTokens) {
      let cursor: string | undefined
      do {
        const page = await list({ token, cursor, limit: 1000 })
        listOperationsUsedForMeasurement += 1
        blobs.push(...page.blobs)
        cursor = page.hasMore ? page.cursor : undefined
      } while (cursor)
    }

    const storageMb = bytesToMb(blobs.reduce((sum, blob) => sum + blob.size, 0))
    const percent = usagePercent(storageMb, BLOB_HOBBY_STORAGE_LIMIT_MB)

    return {
      mode: 'real_vercel_blob_list',
      available: true,
      reason: 'Medido con @vercel/blob list() en modo read-only; no se devuelven URLs ni tokens.',
      blobCount: blobs.length,
      imageCount: blobs.filter(blob => isImageLikeUrl(blob.pathname)).length,
      storageMb,
      usagePercent: percent,
      status: usageStatus(percent),
      listOperationsUsedForMeasurement,
    }
  } catch {
    return {
      mode: 'estimated_from_db_references',
      available: false,
      reason: 'No pude leer Blob con list() en este runtime. Se usa conteo local por referencias en DB; storage MB real requiere acceso read-only correcto a Blob.',
      blobCount: null,
      imageCount: null,
      storageMb: null,
      usagePercent: null,
      status: 'unknown',
      listOperationsUsedForMeasurement: 0,
    }
  }
}

function makeResult(
  tool: AdminCopilotToolName,
  title: string,
  data: Record<string, unknown>,
): AdminCopilotToolResult {
  return {
    tool,
    title,
    data,
    generatedAt: new Date().toISOString(),
  }
}

export async function requireAdminCopilotSession(): Promise<AdminSession> {
  const session = await getSession()
  if (!session || session.role !== 'SUPER') {
    throw new Error('ADMIN_REQUIRED')
  }

  return {
    userId: session.userId,
    displayName: session.displayName,
    role: session.role,
  }
}

export async function getRegisteredUsersCount(): Promise<AdminCopilotToolResult> {
  await requireAdminCopilotSession()
  const db = await getDb()
  if (!db) throw new Error('DB_UNAVAILABLE')

  try {
    const today = startOfToday()
    const [total, sellers, admins, verified, banned, newToday] = await Promise.all([
      db.mpUser.count(),
      db.mpUser.count({ where: { isSeller: true } }),
      db.mpUser.count({ where: { role: 'SUPER' } }),
      db.mpUser.count({ where: { isVerified: true } }),
      db.mpUser.count({ where: { isBanned: true } }),
      db.mpUser.count({ where: { createdAt: { gte: today } } }),
    ])

    return makeResult('registered_users_count', 'Usuarios registrados', {
      total,
      sellers,
      admins,
      verified,
      banned,
      newToday,
    })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function getPendingOperationsSummary(): Promise<AdminCopilotToolResult> {
  await requireAdminCopilotSession()
  const db = await getDb()
  if (!db) throw new Error('DB_UNAVAILABLE')

  try {
    const now = new Date()
    const expiringAt = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const [
      paymentReceived,
      validating,
      disputed,
      pendingPayment,
      inEscrow,
      deliveryConfirmed,
      expiringEscrow,
    ] = await Promise.all([
      db.mpTransaction.count({ where: { status: 'PAYMENT_RECEIVED' } }),
      db.mpTransaction.count({ where: { status: 'VALIDATING' } }),
      db.mpTransaction.count({ where: { status: 'DISPUTED' } }),
      db.mpTransaction.count({ where: { status: 'PENDING_PAYMENT' } }),
      db.mpTransaction.count({ where: { status: 'IN_ESCROW' } }),
      db.mpTransaction.count({ where: { status: 'DELIVERY_CONFIRMED' } }),
      db.mpTransaction.count({
        where: {
          status: 'IN_ESCROW',
          escrowReleaseAt: { lte: expiringAt },
        },
      }),
    ])

    return makeResult('pending_operations_summary', 'Operaciones que necesitan atencion', {
      paymentReceived,
      validating,
      disputed,
      pendingPayment,
      inEscrow,
      deliveryConfirmed,
      expiringEscrowNext24h: expiringEscrow,
      attentionTotal: paymentReceived + validating + disputed + expiringEscrow,
      attentionStatuses: ATTENTION_STATUSES,
    })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function getOperationsAttentionSummary(): Promise<AdminCopilotToolResult> {
  const pending = await getPendingOperationsSummary()

  return makeResult('operations_attention_summary', 'Operaciones que requieren atencion gerencial', {
    ...pending.data,
    availableNow: 'Conteos por estado operativo desde MpTransaction.status y escrowReleaseAt.',
    source: 'MpTransaction: PAYMENT_RECEIVED, VALIDATING, DISPUTED e IN_ESCROW con escrowReleaseAt dentro de 24h.',
    managerialRead: 'Priorizar pagos recibidos/en validacion, disputas abiertas y escrows proximos a vencer.',
    limitation: 'No ejecuta cambios de estado ni validaciones de pago; solo resume el backlog read-only.',
  })
}

export async function getSalesTodaySummary(): Promise<AdminCopilotToolResult> {
  await requireAdminCopilotSession()
  const db = await getDb()
  if (!db) throw new Error('DB_UNAVAILABLE')

  try {
    const today = startOfToday()
    const [count, amount, fees, sellerNet] = await Promise.all([
      db.mpTransaction.count({
        where: { createdAt: { gte: today }, status: { in: [...ACTIVE_SALE_STATUSES] } },
      }),
      db.mpTransaction.aggregate({
        where: { createdAt: { gte: today }, status: { in: [...ACTIVE_SALE_STATUSES] } },
        _sum: { amount: true },
      }),
      db.mpTransaction.aggregate({
        where: { createdAt: { gte: today }, status: { in: [...ACTIVE_SALE_STATUSES] } },
        _sum: { platformFeeAmount: true },
      }),
      db.mpTransaction.aggregate({
        where: { createdAt: { gte: today }, status: { in: [...ACTIVE_SALE_STATUSES] } },
        _sum: { sellerNetAmount: true },
      }),
    ])

    return makeResult('sales_today_summary', 'Ventas de hoy', {
      count,
      grossAmountUsd: toNumber(amount._sum.amount),
      platformFeeUsd: toNumber(fees._sum.platformFeeAmount),
      sellerNetUsd: toNumber(sellerNet._sum.sellerNetAmount),
      countedStatuses: ACTIVE_SALE_STATUSES,
      note: 'Incluye operaciones activas o cerradas; verificar contra dashboard antes de decisiones financieras.',
    })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function getSellerPayoutReadinessSummary(): Promise<AdminCopilotToolResult> {
  await requireAdminCopilotSession()
  const db = await getDb()
  if (!db) throw new Error('DB_UNAVAILABLE')

  try {
    const txs = await db.mpTransaction.findMany({
      where: { status: 'RELEASED' },
      select: {
        sellerNetAmount: true,
        seller: {
          select: {
            payoutMethods: {
              where: { isActive: true },
              select: { id: true },
              orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
              take: 1,
            },
          },
        },
      },
    })

    const ready = txs.filter((tx: { seller: { payoutMethods: unknown[] } }) => tx.seller.payoutMethods.length > 0)
    const missingMethod = txs.filter((tx: { seller: { payoutMethods: unknown[] } }) => tx.seller.payoutMethods.length === 0)

    return makeResult('seller_payout_readiness_summary', 'Fondos por liberar', {
      readyCount: ready.length,
      readyAmountUsd: ready.reduce((sum: number, tx: { sellerNetAmount: unknown }) => sum + toNumber(tx.sellerNetAmount), 0),
      missingPayoutMethodCount: missingMethod.length,
      missingPayoutMethodAmountUsd: missingMethod.reduce((sum: number, tx: { sellerNetAmount: unknown }) => sum + toNumber(tx.sellerNetAmount), 0),
      note: 'Resumen read-only. No libera fondos ni valida pagos.',
    })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function getSellerPayoutsByMethodSummary(): Promise<AdminCopilotToolResult> {
  await requireAdminCopilotSession()
  const db = await getDb()
  if (!db) throw new Error('DB_UNAVAILABLE')

  try {
    const txs = await db.mpTransaction.findMany({
      where: { status: 'RELEASED' },
      orderBy: { releasedAt: 'desc' },
      select: {
        id: true,
        sellerNetAmount: true,
        currency: true,
        releasedAt: true,
        listing: { select: { title: true } },
        seller: {
          select: {
            id: true,
            displayName: true,
            payoutMethods: {
              where: { isActive: true },
              orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
              take: 1,
              select: {
                methodType: true,
                displayLabel: true,
                encryptedData: true,
                currency: true,
              },
            },
          },
        },
      },
    })

    type MethodRow = {
      methodKey: string
      methodType: string
      label: string
      currency: string
      transactionCount: number
      sellerCount: number
      amountUsd: number
      sellers: Set<string>
      sampleOperations: Array<{
        transactionId: string
        seller: string
        listingTitle: string
        amountUsd: number
        releasedAt: string | null
      }>
    }

    const grouped = new Map<string, MethodRow>()
    for (const tx of txs as Array<{
      id: string
      sellerNetAmount: unknown
      currency: string
      releasedAt: Date | null
      listing: { title: string }
      seller: {
        id: string
        displayName: string
        payoutMethods: Array<{
          methodType: string
          displayLabel: string
          encryptedData: string
          currency: string
        }>
      }
    }>) {
      const method = tx.seller.payoutMethods[0] ?? null
      const methodType = method?.methodType ?? 'SIN_METODO'
      const details = parseJsonRecord(method?.encryptedData)
      const label = method ? safePayoutGroupLabel(method.methodType, method.displayLabel, details) : 'sin metodo configurado'
      const methodKey = `${methodType}:${label}`
      const row = grouped.get(methodKey) ?? {
        methodKey,
        methodType,
        label,
        currency: method?.currency ?? tx.currency,
        transactionCount: 0,
        sellerCount: 0,
        amountUsd: 0,
        sellers: new Set<string>(),
        sampleOperations: [],
      }

      row.transactionCount += 1
      row.amountUsd += toNumber(tx.sellerNetAmount)
      row.sellers.add(tx.seller.id)
      row.sellerCount = row.sellers.size
      if (row.sampleOperations.length < 8) {
        row.sampleOperations.push({
          transactionId: tx.id,
          seller: tx.seller.displayName,
          listingTitle: tx.listing.title,
          amountUsd: toNumber(tx.sellerNetAmount),
          releasedAt: tx.releasedAt?.toISOString?.() ?? null,
        })
      }
      grouped.set(methodKey, row)
    }

    const byMethod = Array.from(grouped.values())
      .map(row => ({
        methodType: row.methodType,
        label: row.label,
        currency: row.currency,
        transactionCount: row.transactionCount,
        sellerCount: row.sellerCount,
        amountUsd: row.amountUsd,
        sampleOperations: row.sampleOperations,
      }))
      .sort((a, b) => b.amountUsd - a.amountUsd || b.transactionCount - a.transactionCount)

    return makeResult('seller_payouts_by_method_summary', 'Fondos por liberar por metodo o banco', {
      byMethod,
      totalReleasedTransactions: txs.length,
      totalAmountUsd: byMethod.reduce((sum, row) => sum + row.amountUsd, 0),
      groupsWithoutConfiguredMethod: byMethod
        .filter(row => row.methodType === 'SIN_METODO')
        .reduce((sum, row) => sum + row.transactionCount, 0),
      source: 'MpTransaction.status=RELEASED unido a payoutMethods activos del vendedor. Solo usa metodo, displayLabel y campo banco si existe.',
      privacy: 'No incluye encryptedData crudo, numeros completos de cuenta/telefono, paymentProofUrl, documentos privados ni datos bancarios completos.',
      note: 'Resumen read-only. No libera fondos, no valida pagos y no cambia estados.',
    })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function getTopPublishedCategoriesSummary(): Promise<AdminCopilotToolResult> {
  await requireAdminCopilotSession()
  const db = await getDb()
  if (!db) throw new Error('DB_UNAVAILABLE')

  try {
    const listings = await db.mpListing.findMany({
      where: { status: 'ACTIVE' },
      select: {
        category: true,
        viewCount: true,
        favoriteCount: true,
        price: true,
        currency: true,
      },
    })

    type CategoryRow = {
      category: string
      publishedListingCount: number
      views: number
      favorites: number
      priceTotalByCurrency: Record<string, number>
    }

    const map = new Map<string, CategoryRow>()
    for (const listing of listings as Array<{
      category: string | null
      viewCount: number
      favoriteCount: number
      price: unknown
      currency: string
    }>) {
      const category = listing.category ?? 'sin_categoria'
      const row = map.get(category) ?? {
        category,
        publishedListingCount: 0,
        views: 0,
        favorites: 0,
        priceTotalByCurrency: {},
      }

      row.publishedListingCount += 1
      row.views += listing.viewCount
      row.favorites += listing.favoriteCount
      row.priceTotalByCurrency[listing.currency] =
        (row.priceTotalByCurrency[listing.currency] ?? 0) + toNumber(listing.price)
      map.set(category, row)
    }

    const categories = Array.from(map.values())
      .sort((a, b) => b.publishedListingCount - a.publishedListingCount || b.views - a.views)
      .slice(0, 8)

    return makeResult('top_published_categories_summary', 'Categorias con mas listings publicados', {
      categories,
      totalPublishedListings: listings.length,
      totalCategoriesWithPublishedListings: map.size,
      countedListingStatus: 'ACTIVE',
      source: 'MpListing.status=ACTIVE agrupado por MpListing.category; views/favorites desde MpListing.viewCount y MpListing.favoriteCount.',
      availability: categories.length > 0 ? 'dato_disponible' : 'dato_disponible_sin_registros',
      note: 'Mide oferta publicada, no ventas. Para demanda comercial usa categorias vendidas o listings por ventas.',
    })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function getTopSellingCategoriesSummary(): Promise<AdminCopilotToolResult> {
  await requireAdminCopilotSession()
  const db = await getDb()
  if (!db) throw new Error('DB_UNAVAILABLE')

  try {
    const txs = await db.mpTransaction.findMany({
      where: { status: { in: [...ACTIVE_SALE_STATUSES] } },
      select: {
        amount: true,
        sellerNetAmount: true,
        platformFeeAmount: true,
        status: true,
        listing: { select: { category: true } },
      },
    })

    type CategoryRow = {
      category: string
      transactionCount: number
      grossAmountUsd: number
      sellerNetUsd: number
      platformFeeUsd: number
      statuses: Record<string, number>
    }

    const map = new Map<string, CategoryRow>()
    for (const tx of txs as Array<{
      amount: unknown
      sellerNetAmount: unknown
      platformFeeAmount: unknown
      status: string
      listing: { category: string | null }
    }>) {
      const category = tx.listing.category ?? 'sin_categoria'
      const row = map.get(category) ?? {
        category,
        transactionCount: 0,
        grossAmountUsd: 0,
        sellerNetUsd: 0,
        platformFeeUsd: 0,
        statuses: {},
      }

      row.transactionCount += 1
      row.grossAmountUsd += toNumber(tx.amount)
      row.sellerNetUsd += toNumber(tx.sellerNetAmount)
      row.platformFeeUsd += toNumber(tx.platformFeeAmount)
      row.statuses[tx.status] = (row.statuses[tx.status] ?? 0) + 1
      map.set(category, row)
    }

    const categories = Array.from(map.values())
      .sort((a, b) => b.transactionCount - a.transactionCount || b.grossAmountUsd - a.grossAmountUsd)
      .slice(0, 8)

    return makeResult('top_selling_categories_summary', 'Categorias mas vendidas', {
      categories,
      totalCategoriesWithSales: map.size,
      countedStatuses: ACTIVE_SALE_STATUSES,
      source: 'MpTransaction con estado IN_ESCROW, DELIVERY_CONFIRMED o RELEASED, agrupado por MpListing.category.',
      availability: categories.length > 0 ? 'dato_disponible' : 'dato_disponible_sin_registros',
      note: 'Calculado desde transacciones y categorias de listings existentes. No incluye productos sin transaccion.',
    })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function getTopListingsBySalesSummary(): Promise<AdminCopilotToolResult> {
  await requireAdminCopilotSession()
  const db = await getDb()
  if (!db) throw new Error('DB_UNAVAILABLE')

  try {
    const txs = await db.mpTransaction.findMany({
      where: { status: { in: [...ACTIVE_SALE_STATUSES] } },
      select: {
        amount: true,
        sellerNetAmount: true,
        platformFeeAmount: true,
        status: true,
        listing: {
          select: {
            id: true,
            title: true,
            category: true,
            status: true,
            viewCount: true,
            favoriteCount: true,
          },
        },
      },
    })

    type ListingSalesRow = {
      id: string
      title: string
      category: string
      listingStatus: string
      saleCount: number
      grossAmountUsd: number
      sellerNetUsd: number
      platformFeeUsd: number
      views: number
      favorites: number
      transactionStatuses: Record<string, number>
    }

    const map = new Map<string, ListingSalesRow>()
    for (const tx of txs as Array<{
      amount: unknown
      sellerNetAmount: unknown
      platformFeeAmount: unknown
      status: string
      listing: {
        id: string
        title: string
        category: string
        status: string
        viewCount: number
        favoriteCount: number
      }
    }>) {
      const row = map.get(tx.listing.id) ?? {
        id: tx.listing.id,
        title: tx.listing.title,
        category: tx.listing.category,
        listingStatus: tx.listing.status,
        saleCount: 0,
        grossAmountUsd: 0,
        sellerNetUsd: 0,
        platformFeeUsd: 0,
        views: tx.listing.viewCount,
        favorites: tx.listing.favoriteCount,
        transactionStatuses: {},
      }

      row.saleCount += 1
      row.grossAmountUsd += toNumber(tx.amount)
      row.sellerNetUsd += toNumber(tx.sellerNetAmount)
      row.platformFeeUsd += toNumber(tx.platformFeeAmount)
      row.transactionStatuses[tx.status] = (row.transactionStatuses[tx.status] ?? 0) + 1
      map.set(tx.listing.id, row)
    }

    const topListings = Array.from(map.values())
      .sort((a, b) => b.saleCount - a.saleCount || b.grossAmountUsd - a.grossAmountUsd)
      .slice(0, 10)

    return makeResult('top_listings_by_sales_summary', 'Listings con mas ventas', {
      topListings,
      totalListingsWithSales: map.size,
      countedStatuses: ACTIVE_SALE_STATUSES,
      source: 'MpTransaction con estado IN_ESCROW, DELIVERY_CONFIRMED o RELEASED, agrupado por MpListing.id.',
      availability: topListings.length > 0 ? 'dato_disponible' : 'dato_disponible_sin_registros',
      note: 'Ordenado por cantidad de ventas y luego monto bruto. Views y favoritos se incluyen como contexto de actividad, no como clicks.',
    })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function getTopListingsActivitySummary(): Promise<AdminCopilotToolResult> {
  await requireAdminCopilotSession()
  const db = await getDb()
  if (!db) throw new Error('DB_UNAVAILABLE')

  try {
    const [listings, analyticsEvents] = await Promise.all([
      db.mpListing.findMany({
        orderBy: [{ viewCount: 'desc' }, { favoriteCount: 'desc' }, { updatedAt: 'desc' }],
      take: 12,
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        viewCount: true,
        favoriteCount: true,
        price: true,
        currency: true,
        transactions: {
          select: {
            status: true,
            amount: true,
          },
        },
      },
      }),
      db.mpAnalyticsEvent.findMany({
        where: {
          eventType: { in: ['listing_view', 'listing_click', 'favorite_click', 'buy_click', 'checkout_start'] },
          listingId: { not: null },
        },
        select: {
          eventType: true,
          listingId: true,
        },
      }).catch(() => []),
    ])

    const analyticsByListing = new Map<string, Record<string, number>>()
    for (const event of analyticsEvents as Array<{ eventType: string; listingId: string | null }>) {
      if (!event.listingId) continue
      const row = analyticsByListing.get(event.listingId) ?? {}
      row[event.eventType] = (row[event.eventType] ?? 0) + 1
      analyticsByListing.set(event.listingId, row)
    }

    const topListings = listings.map((listing: {
      id: string
      title: string
      category: string
      status: string
      viewCount: number
      favoriteCount: number
      price: unknown
      currency: string
      transactions: Array<{ status: string; amount: unknown }>
    }) => {
      const activeTransactions = listing.transactions.filter(tx => ACTIVE_SALE_STATUSES.includes(tx.status as typeof ACTIVE_SALE_STATUSES[number]))
      const analytics = analyticsByListing.get(listing.id) ?? {}
      return {
        id: listing.id,
        title: listing.title,
        category: listing.category,
        status: listing.status,
        price: toNumber(listing.price),
        currency: listing.currency,
        views: listing.viewCount,
        favorites: listing.favoriteCount,
        analyticsViews: analytics.listing_view ?? 0,
        clicks: analytics.listing_click ?? 0,
        favoriteClicks: analytics.favorite_click ?? 0,
        buyClicks: analytics.buy_click ?? 0,
        checkoutStarts: analytics.checkout_start ?? 0,
        transactionCount: listing.transactions.length,
        activeSaleCount: activeTransactions.length,
        activeSaleGrossUsd: activeTransactions.reduce((sum, tx) => sum + toNumber(tx.amount), 0),
      }
    })

    return makeResult('top_listings_activity_summary', 'Listings con mas actividad', {
      topListings,
      availableSignals: ['MpAnalyticsEvent listing_view/listing_click/favorite_click/buy_click/checkout_start', 'viewCount', 'favoriteCount', 'transactionCount', 'activeSaleGrossUsd'],
      source: 'MpAnalyticsEvent para views/clicks reales desde la nueva instrumentacion; MpListing y MpTransaction como contexto operacional.',
      clickInstrumentation: 'Clicks instrumentados desde MpAnalyticsEvent. Los historicos previos a esta instrumentacion pueden faltar.',
    })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function getTopClickedListingsSummary(): Promise<AdminCopilotToolResult> {
  await requireAdminCopilotSession()
  const db = await getDb()
  if (!db) throw new Error('DB_UNAVAILABLE')

  try {
    const events = await db.mpAnalyticsEvent.findMany({
      where: {
        eventType: { in: ['listing_click', 'buy_click', 'favorite_click', 'checkout_start'] },
        listingId: { not: null },
      },
      select: {
        eventType: true,
        listingId: true,
      },
    }).catch(() => [])

    type ClickRow = {
      listingId: string
      listingClicks: number
      buyClicks: number
      favoriteClicks: number
      checkoutStarts: number
      totalClicks: number
    }

    const map = new Map<string, ClickRow>()
    for (const event of events as Array<{ eventType: string; listingId: string | null }>) {
      if (!event.listingId) continue
      const row = map.get(event.listingId) ?? {
        listingId: event.listingId,
        listingClicks: 0,
        buyClicks: 0,
        favoriteClicks: 0,
        checkoutStarts: 0,
        totalClicks: 0,
      }
      if (event.eventType === 'listing_click') row.listingClicks += 1
      if (event.eventType === 'buy_click') row.buyClicks += 1
      if (event.eventType === 'favorite_click') row.favoriteClicks += 1
      if (event.eventType === 'checkout_start') row.checkoutStarts += 1
      row.totalClicks += 1
      map.set(event.listingId, row)
    }

    const rankedRows = Array.from(map.values())
      .sort((a, b) => b.totalClicks - a.totalClicks || b.buyClicks - a.buyClicks)
      .slice(0, 10)
    const listingIds = rankedRows.map(row => row.listingId)
    const listings = listingIds.length > 0
      ? await db.mpListing.findMany({
          where: { id: { in: listingIds } },
          select: { id: true, title: true, category: true, status: true, viewCount: true, favoriteCount: true },
        })
      : []
    const listingMap = new Map((listings as Array<{ id: string }>).map(listing => [listing.id, listing]))

    return makeResult('top_clicked_listings_summary', 'Listings con mas clicks', {
      topListings: rankedRows.map(row => ({
        ...row,
        listing: listingMap.get(row.listingId) ?? null,
      })),
      totalClickEvents: events.length,
      source: 'MpAnalyticsEvent con eventType listing_click, buy_click, favorite_click y checkout_start.',
      note: 'Los datos comienzan desde la activacion de la instrumentacion; no reconstruyen clicks historicos.',
    })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function getConversionFunnelSummary(): Promise<AdminCopilotToolResult> {
  await requireAdminCopilotSession()
  const db = await getDb()
  if (!db) throw new Error('DB_UNAVAILABLE')

  try {
    const events = await db.mpAnalyticsEvent.findMany({
      where: {
        eventType: { in: ['listing_view', 'listing_click', 'buy_click', 'checkout_start'] },
      },
      select: { eventType: true },
    }).catch(() => [])

    const views = (events as Array<{ eventType: string }>).filter(event => event.eventType === 'listing_view').length
    const listingClicks = (events as Array<{ eventType: string }>).filter(event => event.eventType === 'listing_click').length
    const buyClicks = (events as Array<{ eventType: string }>).filter(event => event.eventType === 'buy_click').length
    const checkoutStarts = (events as Array<{ eventType: string }>).filter(event => event.eventType === 'checkout_start').length
    const [pendingPayment, paymentReceived, activeSales, released] = await Promise.all([
      db.mpTransaction.count({ where: { status: 'PENDING_PAYMENT' } }),
      db.mpTransaction.count({ where: { status: 'PAYMENT_RECEIVED' } }),
      db.mpTransaction.count({ where: { status: { in: ['IN_ESCROW', 'DELIVERY_CONFIRMED'] } } }),
      db.mpTransaction.count({ where: { status: 'RELEASED' } }),
    ])

    return makeResult('conversion_funnel_summary', 'Embudo basico de conversion marketplace', {
      events: {
        listingViews: views,
        listingClicks,
        buyClicks,
        checkoutStarts,
      },
      transactionOutcomes: {
        pendingPayment,
        paymentReceived,
        activeSales,
        released,
      },
      rates: {
        clickThroughFromViewsPercent: views > 0 ? Number(((listingClicks / views) * 100).toFixed(2)) : null,
        buyClickFromViewsPercent: views > 0 ? Number(((buyClicks / views) * 100).toFixed(2)) : null,
        checkoutStartFromBuyClickPercent: buyClicks > 0 ? Number(((checkoutStarts / buyClicks) * 100).toFixed(2)) : null,
      },
      source: 'MpAnalyticsEvent para eventos de comportamiento y MpTransaction para resultados operativos.',
      note: 'Embudo basico. No incluye atribucion por canal, costos, impuestos ni usuarios cross-device.',
    })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

function getMarketplaceDataAvailabilityData(): Record<string, unknown> {
  return {
    availableNow: [
      'viewCount por listing',
      'favoriteCount por listing',
      'eventos reales de listing_view, listing_click, buy_click, favorite_click y checkout_start desde MpAnalyticsEvent',
      'transacciones por listing',
      'transacciones por categoria',
      'montos brutos, comision de plataforma y neto vendedor por transaccion',
      'estados operativos de transacciones',
      'metadata segura de blobs subidos desde MpBlobObjectMetadata',
    ],
    notInstrumentedYet: [
      'conversion por fuente de trafico',
      'embudo por sesion',
      'eventos de busqueda y filtros',
      'Blob data transfer y API operations mensuales dentro de la app',
    ],
    suggestedInstrumentation: [
      'eventType',
      'listingId',
      'userId anonimo o sessionId',
      'route',
      'component',
      'createdAt',
      'metadata no sensible',
    ],
    answers: {
      clicks: 'Clicks instrumentados desde MpAnalyticsEvent para listing_click, buy_click y favorite_click. Los historicos anteriores a la instrumentacion pueden faltar.',
      views: 'Views instrumentadas como listing_view en MpAnalyticsEvent y tambien existe viewCount por listing como contador operativo.',
      costs: 'Cuando el modulo financiero este implementado, podre consultar costos operativos por venta/categoria desde herramientas read-only.',
      taxes: 'Cuando el modulo financiero este implementado, podre consultar impuestos estimados y prevision fiscal desde herramientas read-only.',
      netProfit: 'Ese dato aun no esta instrumentado. Para responderlo habria que registrar costos, impuestos, ajustes y reglas de rentabilidad por transaccion o categoria.',
    },
    source: 'Schema actual: MpListing, MpTransaction, MpAnalyticsEvent y MpBlobObjectMetadata. No se consultan tablas inexistentes ni SQL libre.',
  }
}

export async function getMarketplaceDataAvailability(): Promise<AdminCopilotToolResult> {
  await requireAdminCopilotSession()

  return makeResult('marketplace_data_availability', 'Disponibilidad de datos marketplace', getMarketplaceDataAvailabilityData())
}

export async function getMarketplaceAnalyticsAvailability(): Promise<AdminCopilotToolResult> {
  await requireAdminCopilotSession()

  return makeResult('marketplace_analytics_availability', 'Disponibilidad de analitica marketplace', getMarketplaceDataAvailabilityData())
}

export async function getInfrastructureStatusSummary(): Promise<AdminCopilotToolResult> {
  await requireAdminCopilotSession()
  const db = await getDb()
  if (!db) throw new Error('DB_UNAVAILABLE')

  try {
    const [
      dbSizeRows,
      users,
      listings,
      transactions,
      payoutMethods,
      activeListings,
      releasedTransactions,
      listingsWithMedia,
      proofs,
      blobMetadata,
      blobUsage,
    ] =
      await Promise.all([
        db.$queryRaw<Array<{ bytes: bigint | number | string }>>`SELECT pg_database_size(current_database()) AS bytes`,
        db.mpUser.count(),
        db.mpListing.count(),
        db.mpTransaction.count(),
        db.mpPayoutMethod.count(),
        db.mpListing.count({ where: { status: 'ACTIVE' } }),
        db.mpTransaction.count({ where: { status: 'RELEASED' } }),
        db.mpListing.findMany({
          select: {
            coverImageUrl: true,
            mediaUrls: true,
          },
        }),
        db.mpTransaction.findMany({
          where: { paymentProofUrl: { not: null } },
          select: { paymentProofUrl: true },
        }),
        db.mpBlobObjectMetadata.findMany({
          select: {
            sizeBytes: true,
            contentType: true,
            entityType: true,
          },
        }).catch(() => []),
        getVercelBlobUsage(),
      ])

    const listingUrls = listingsWithMedia.flatMap((listing: { coverImageUrl: string | null; mediaUrls: string[] }) => [
      listing.coverImageUrl,
      ...listing.mediaUrls,
    ])
    const proofUrls = proofs.map((proof: { paymentProofUrl: string | null }) => proof.paymentProofUrl)
    const fileUrls = [...listingUrls, ...proofUrls].filter((url): url is string => Boolean(url))
    const uniqueFileUrls = Array.from(new Set(fileUrls))
    const blobFileUrls = uniqueFileUrls.filter(url => getUrlHost(url).endsWith('.public.blob.vercel-storage.com'))
    const imageUrls = uniqueFileUrls.filter(isImageLikeUrl)
    const blobImageUrls = blobFileUrls.filter(isImageLikeUrl)
    const dbSizeMb = bytesToMb(dbSizeRows[0]?.bytes)
    const dbStorageUsagePercent = usagePercent(dbSizeMb, NEON_FREE_STORAGE_LIMIT_MB)
    const metadataRows = blobMetadata as Array<{ sizeBytes: bigint | number | null; contentType: string | null; entityType: string }>
    const metadataStorageMb = bytesTotalToMb(metadataRows.map(row => row.sizeBytes ?? 0))
    const hasRealBlobList = blobUsage.available
    const hasMetadataStorage = metadataRows.length > 0 && metadataStorageMb > 0
    const blobStorageMb = hasRealBlobList ? blobUsage.storageMb : hasMetadataStorage ? metadataStorageMb : null
    const blobStorageUsagePercent = typeof blobStorageMb === 'number' ? usagePercent(blobStorageMb, BLOB_HOBBY_STORAGE_LIMIT_MB) : null
    const blobStatus = typeof blobStorageUsagePercent === 'number' ? usageStatus(blobStorageUsagePercent) : 'unknown'
    const metadataImageCount = metadataRows.filter(row => row.contentType?.startsWith('image/')).length
    const metadataProofCount = metadataRows.filter(row => row.entityType === 'payment_proof').length

    return makeResult('infrastructure_status_summary', 'Estado DB y Blob', {
      neonDb: {
        connected: true,
        connectivity: 'OK: consulta read-only completada via Prisma.',
        dbSizeMb,
        dbStorageLimitMb: NEON_FREE_STORAGE_LIMIT_MB,
        dbStorageUsagePercent,
        status: usageStatus(dbStorageUsagePercent),
        usefulCounts: {
          users,
          listings,
          activeListings,
          transactions,
          releasedTransactions,
          payoutMethods,
        },
        measurement: 'Tamaño real consultado con SELECT pg_database_size(current_database()) AS bytes; consulta constante, read-only y sin interpolacion de usuario.',
      },
      vercelBlob: {
        measurementMode: hasRealBlobList
          ? blobUsage.mode
          : hasMetadataStorage
            ? 'real_metadata_recorded_uploads'
            : blobUsage.mode,
        measurementAvailable: hasRealBlobList || hasMetadataStorage,
        measurementNote: hasRealBlobList
          ? blobUsage.reason
          : hasMetadataStorage
            ? 'Medido desde MpBlobObjectMetadata registrada al subir archivos. Puede no incluir archivos historicos anteriores a esta instrumentacion.'
            : blobUsage.reason,
        realBlobCount: hasRealBlobList ? blobUsage.blobCount : hasMetadataStorage ? metadataRows.length : null,
        realImageCount: hasRealBlobList ? blobUsage.imageCount : hasMetadataStorage ? metadataImageCount : null,
        blobStorageMb,
        blobStorageLimitMb: BLOB_HOBBY_STORAGE_LIMIT_MB,
        blobStorageUsagePercent,
        status: blobStatus,
        metadataRecordedObjects: metadataRows.length,
        metadataRecordedStorageMb: metadataStorageMb,
        metadataRecordedImages: metadataImageCount,
        metadataRecordedPaymentProofs: metadataProofCount,
        fileUrlReferencesInDb: uniqueFileUrls.length,
        blobUrlReferencesInDb: blobFileUrls.length,
        imageUrlReferencesInDb: imageUrls.length,
        blobImageUrlReferencesInDb: blobImageUrls.length,
        paymentProofUrlReferencesInDb: proofUrls.filter(Boolean).length,
        operationsLimits: {
          simpleOperationsMonthlyLimit: BLOB_HOBBY_SIMPLE_OPERATIONS_LIMIT,
          advancedOperationsMonthlyLimit: BLOB_HOBBY_ADVANCED_OPERATIONS_LIMIT,
          listOperationsUsedForThisMeasurement: blobUsage.listOperationsUsedForMeasurement,
          currentMonthUsage: 'No instrumentado localmente.',
        },
        dataTransfer: {
          monthlyLimitGb: BLOB_HOBBY_DATA_TRANSFER_LIMIT_GB,
          currentMonthUsage: 'No instrumentado localmente.',
        },
      },
      traffic: {
        status: 'No instrumentado.',
        availableProxy: 'MpListing.viewCount existe para exposicion por listing, pero no equivale a trafico web, bandwidth ni requests.',
        externalObservability: 'Vercel dashboard/Blob Observability puede mostrar transfer, downloads, cache y API operations si esta habilitado.',
        missingForRealTraffic: 'Para responder trafico y porcentaje contra limites dentro del Copilot habria que instrumentar Vercel Analytics, logs agregados o una tabla futura de eventos/requests con timestamp, ruta, bytes y origen.',
      },
      limits: {
        neonFreeStorageMb: NEON_FREE_STORAGE_LIMIT_MB,
        vercelBlobHobbyStorageMb: BLOB_HOBBY_STORAGE_LIMIT_MB,
        vercelBlobSimpleOperationsMonthly: BLOB_HOBBY_SIMPLE_OPERATIONS_LIMIT,
        vercelBlobAdvancedOperationsMonthly: BLOB_HOBBY_ADVANCED_OPERATIONS_LIMIT,
        vercelBlobDataTransferMonthlyGb: BLOB_HOBBY_DATA_TRANSFER_LIMIT_GB,
      },
      recommendation: blobUsage.available
        ? 'Para medicion completa falta integrar operaciones mensuales, data transfer y trafico desde Vercel Observability o contadores propios.'
        : 'Para medicion completa falta acceso read-only valido a Blob list/head o guardar metadata de size/contentLength por archivo, mas Vercel Observability o contadores propios para trafico y operaciones.',
      source: 'DB read-only via Prisma; Neon size via pg_database_size(current_database()); Blob real via @vercel/blob list() solo si hay token server-side, si no conteo de URLs desde MpListing.coverImageUrl, MpListing.mediaUrls y MpTransaction.paymentProofUrl.',
      note: 'No se exponen connection strings, tokens, env vars, secrets ni URLs privadas de comprobantes.',
    })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function getFinanceReadinessSummary(): Promise<AdminCopilotToolResult> {
  await requireAdminCopilotSession()
  const db = await getDb()
  if (!db) throw new Error('DB_UNAVAILABLE')

  try {
    const [gross, fees, sellerNet, released, active, pendingPayout] = await Promise.all([
      db.mpTransaction.aggregate({
        where: { status: { in: [...ACTIVE_SALE_STATUSES] } },
        _sum: { amount: true },
      }),
      db.mpTransaction.aggregate({
        where: { status: { in: [...ACTIVE_SALE_STATUSES] } },
        _sum: { platformFeeAmount: true },
      }),
      db.mpTransaction.aggregate({
        where: { status: { in: [...ACTIVE_SALE_STATUSES] } },
        _sum: { sellerNetAmount: true },
      }),
      db.mpTransaction.count({ where: { status: 'RELEASED' } }),
      db.mpTransaction.count({ where: { status: { in: ['IN_ESCROW', 'DELIVERY_CONFIRMED'] } } }),
      getSellerPayoutReadinessSummary(),
    ])

    return makeResult('finance_readiness_summary', 'Readiness de finanzas', {
      availableNow: {
        grossSoldUsd: toNumber(gross._sum.amount),
        platformFeeUsd: toNumber(fees._sum.platformFeeAmount),
        sellerNetUsd: toNumber(sellerNet._sum.sellerNetAmount),
        releasedTransactions: released,
        activeEscrowTransactions: active,
        sellerPayouts: pendingPayout.data,
      },
      notAvailableYet: [
        'costos operativos por venta',
        'impuestos estimados',
        'rentabilidad neta por categoria',
        'proyeccion fiscal',
      ],
      source: 'MpTransaction.amount, platformFeeAmount, sellerNetAmount y estados operativos; readiness de pagos desde payoutMethods activos.',
      notInstrumentedAnswer: 'Ese dato aun no esta instrumentado. Para responderlo habria que registrar costos operativos, impuestos, ajustes y reglas de rentabilidad por transaccion o categoria.',
      futureAnswer: 'Cuando el modulo financiero este implementado, podre consultar costos, prevision de impuestos y rentabilidad desde herramientas read-only.',
      note: 'No se cambiaron pagos, tasas, liquidaciones ni schema.',
    })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function explainDashboardKpis(): Promise<AdminCopilotToolResult> {
  await requireAdminCopilotSession()

  return makeResult('dashboard_kpis', 'KPIs del dashboard admin', {
    totalTransactions: 'Cantidad total de operaciones registradas.',
    escrowActiveValue: 'Valor bruto de operaciones en IN_ESCROW o DELIVERY_CONFIRMED.',
    pendingValidation: 'Operaciones con pago recibido o en validacion manual.',
    pendingPayments: 'Operaciones creadas que aun esperan reporte o confirmacion de pago.',
    activeListings: 'Publicaciones activas visibles en el marketplace.',
    totalUsers: 'Usuarios registrados del marketplace.',
    openDisputes: 'Disputas abiertas que requieren revision.',
    releasedThisMonth: 'Operaciones en RELEASED durante el mes actual.',
    platformFeesEarned: 'Comision de plataforma acumulada sobre operaciones liberadas del mes.',
    pendingSellerPayoutValue: 'Monto neto de operaciones RELEASED con metodo de cobro usable.',
    financialNote: 'Los datos financieros deben verificarse contra el dashboard antes de ejecutar acciones.',
  })
}

export async function summarizeTransactionReadOnly(transactionId: string): Promise<AdminCopilotToolResult> {
  await requireAdminCopilotSession()
  const cleanId = transactionId.trim().slice(0, 80)
  if (!cleanId) throw new Error('TRANSACTION_ID_REQUIRED')

  const db = await getDb()
  if (!db) throw new Error('DB_UNAVAILABLE')

  try {
    const tx = await db.mpTransaction.findUnique({
      where: { id: cleanId },
      select: {
        id: true,
        amount: true,
        currency: true,
        platformFeeAmount: true,
        sellerNetAmount: true,
        paymentMethod: true,
        status: true,
        escrowHeldAt: true,
        escrowReleaseAt: true,
        releasedAt: true,
        buyerConfirmedAt: true,
        disputeOpenedAt: true,
        paymentPaidAt: true,
        paymentProofUrl: true,
        createdAt: true,
        updatedAt: true,
        buyer: { select: { displayName: true } },
        seller: { select: { displayName: true } },
        listing: { select: { title: true } },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            fromStatus: true,
            toStatus: true,
            reason: true,
            createdAt: true,
          },
        },
        disputes: {
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: {
            status: true,
            createdAt: true,
          },
        },
      },
    })

    if (!tx) {
      return makeResult('transaction_summary', 'Resumen de transaccion', {
        found: false,
        transactionId: cleanId,
      })
    }

    return makeResult('transaction_summary', 'Resumen de transaccion', {
      found: true,
      id: tx.id,
      listingTitle: tx.listing.title,
      buyer: tx.buyer.displayName,
      seller: tx.seller.displayName,
      amountUsd: toNumber(tx.amount),
      platformFeeUsd: toNumber(tx.platformFeeAmount),
      sellerNetUsd: toNumber(tx.sellerNetAmount),
      currency: tx.currency,
      paymentMethod: tx.paymentMethod,
      status: tx.status,
      hasPaymentProof: Boolean(tx.paymentProofUrl),
      createdAt: tx.createdAt?.toISOString?.() ?? null,
      paymentPaidAt: tx.paymentPaidAt?.toISOString?.() ?? null,
      escrowHeldAt: tx.escrowHeldAt?.toISOString?.() ?? null,
      escrowReleaseAt: tx.escrowReleaseAt?.toISOString?.() ?? null,
      buyerConfirmedAt: tx.buyerConfirmedAt?.toISOString?.() ?? null,
      releasedAt: tx.releasedAt?.toISOString?.() ?? null,
      disputeOpenedAt: tx.disputeOpenedAt?.toISOString?.() ?? null,
      updatedAt: tx.updatedAt?.toISOString?.() ?? null,
      statusHistory: tx.statusHistory.map((row: { fromStatus: string | null; toStatus: string; reason: string | null; createdAt: Date }) => ({
        fromStatus: row.fromStatus,
        toStatus: row.toStatus,
        reason: row.reason,
        createdAt: row.createdAt.toISOString(),
      })),
      disputes: tx.disputes.map((row: { status: string; createdAt: Date }) => ({
        status: row.status,
        createdAt: row.createdAt.toISOString(),
      })),
      omitted: ['paymentProofUrl', 'raw payout data', 'private account details'],
    })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function getAdminMarketplaceOverview(): Promise<AdminCopilotToolResult> {
  const [users, pending, salesToday, payouts, analytics] = await Promise.all([
    getRegisteredUsersCount(),
    getOperationsAttentionSummary(),
    getSalesTodaySummary(),
    getSellerPayoutReadinessSummary(),
    getMarketplaceDataAvailability(),
  ])

  return makeResult('admin_overview', 'Resumen admin del marketplace', {
    users: users.data,
    pendingOperations: pending.data,
    salesToday: salesToday.data,
    sellerPayouts: payouts.data,
    analyticsAvailability: analytics.data,
    note: 'Vista read-only; no ejecuta acciones administrativas.',
  })
}
