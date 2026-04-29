import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import { NextRequest, NextResponse } from 'next/server'
import {
  explainDashboardKpis,
  getAdminMarketplaceOverview,
  getFinanceReadinessSummary,
  getInfrastructureStatusSummary,
  getMarketplaceDataAvailability,
  getOperationsAttentionSummary,
  getPendingOperationsSummary,
  getRegisteredUsersCount,
  getSalesTodaySummary,
  getSellerPayoutsByMethodSummary,
  getSellerPayoutReadinessSummary,
  getConversionFunnelSummary,
  getTopClickedListingsSummary,
  getTopListingsActivitySummary,
  getTopListingsBySalesSummary,
  getTopPublishedCategoriesSummary,
  getTopSellingCategoriesSummary,
  requireAdminCopilotSession,
  summarizeTransactionReadOnly,
  type AdminCopilotToolName,
  type AdminCopilotToolResult,
} from '@/lib/marketplace/admin-copilot-tools'
import { trackMarketplaceEvent } from '@/lib/marketplace/analytics'

const MAX_INPUT_LENGTH = 900
const MAX_MESSAGES = 8
const MAX_TOTAL_CHARS = 3200
const MODEL_TIMEOUT_MS = 8000

type IncomingMessage = {
  role?: unknown
  content?: unknown
}

type CopilotMessage = {
  role: 'user' | 'assistant'
  content: string
}

type InfrastructureVisualMetric = {
  id: string
  label: string
  status: 'ok' | 'warning' | 'critical' | 'unknown'
  usedMb: number | null
  limitMb: number | null
  percent: number | null
  detail: string
}

type InfrastructureVisualPayload = {
  type: 'infrastructure_status'
  summary: string
  metrics: InfrastructureVisualMetric[]
  counts: Array<{ label: string; value: string }>
  notes: string[]
}

const REFUSAL_REPLY =
  'Este copilot es solo lectura. Puedo explicarte la operacion o indicarte donde revisarla, pero no puedo modificar estados, validar pagos, liberar fondos, ejecutar SQL, tocar Prisma/schema ni exponer secretos.'

const CONTINUE_NEEDS_CONTEXT_REPLY =
  'Necesito un poco mas de contexto para continuar. Indica si quieres ampliar por banco/metodo, listing, categoria, operaciones pendientes o DB/Blob status.'

const SYSTEM_PROMPT = `Eres el Admin AI Copilot privado de Turpial Sound Marketplace.

Reglas:
- Solo respondes a administradores autorizados.
- Solo puedes usar los datos read-only entregados por herramientas server-side deterministas.
- No puedes validar pagos, liberar fondos, cambiar estados, registrar pagos, editar usuarios, enviar notificaciones ni ejecutar acciones.
- No reveles secretos, tokens, rutas internas, Prisma, schema, SQL, arquitectura interna ni variables de entorno.
- No inventes datos financieros. Si das cifras, aclara que deben verificarse contra el dashboard antes de acciones administrativas.
- Distingue siempre entre: dato disponible ahora, dato no instrumentado todavia y dato futuro sujeto a modulo financiero/analitica.
- Si un dato existe, responde con cifra y fuente.
- Si un dato no existe, no digas solo "no disponible": explica "Ese dato aun no esta instrumentado. Para responderlo habria que registrar X."
- Para costos, impuestos y rentabilidad futura, usa: "Cuando el modulo financiero este implementado..."
- Si faltan clicks, costos, impuestos o rentabilidad neta, explica la brecha y ofrece alternativas read-only disponibles como vistas, favoritos, transacciones, categorias, montos y estados.
- En DB Status, reporta Neon conectado/tamano/limite/%/estado y Blob blobs/imagenes/storage/limite/% cuando el JSON lo incluya; si Blob viene estimado, dilo claramente.
- Si la respuesta puede ser larga, entrega resumen ejecutivo + top 5 y di que puedes ampliar por banco/metodo/listing/categoria segun aplique.
- Si el usuario pide continuar, usa el ultimo tema entregado en mensajes recientes; si no existe contexto, pregunta que quiere continuar.
- No pidas usuarios, contrasenas ni credenciales dentro del chat.
- Responde en espanol, con criterio gerencial, claro y operativo.`

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, MAX_INPUT_LENGTH) : ''
}

function normalizeMessages(body: unknown): CopilotMessage[] | null {
  if (!body || typeof body !== 'object') return null
  const payload = body as { text?: unknown; message?: unknown; messages?: unknown }
  const rawText = normalizeText(payload.text ?? payload.message)

  if (rawText) return [{ role: 'user', content: rawText }]
  if (!Array.isArray(payload.messages)) return null

  const incoming = payload.messages.slice(-MAX_MESSAGES) as IncomingMessage[]
  const messages: CopilotMessage[] = []

  for (const message of incoming) {
    const role = message.role
    const content = normalizeText(message.content)
    if ((role !== 'user' && role !== 'assistant') || !content) return null
    messages.push({ role, content })
  }

  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') return null

  const totalChars = messages.reduce((sum, message) => sum + message.content.length, 0)
  return totalChars <= MAX_TOTAL_CHARS ? messages : null
}

function jsonError(message: string, status: number, code: string) {
  return NextResponse.json({ error: message, code }, { status })
}

function latestUserText(messages: CopilotMessage[]): string {
  return [...messages].reverse().find(message => message.role === 'user')?.content ?? ''
}

function normalizeForRouting(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function containsWriteIntent(input: string): boolean {
  const text = normalizeForRouting(input)
  if (/\b(cuanto|cuantos|hay|pendiente|pendientes|resumen|resume|explica)\b/.test(text)) {
    return false
  }

  return /\b(valida|validar pago|aprueba|aprobar pago|rechaza|rechazar pago|libera|libera fondos|liberar fondos|paga al vendedor|pagar al vendedor|cambiar estado|cambia el estado|cancelar transaccion|cancela|resolver disputa|resuelve disputa|reembolsar|registra pago|registrar pago|banear|suspender|rehabilitar|verificar usuario|cambiar rol|hacer socio|hacer super|enviar notificacion|notificar)\b/.test(text)
}

function containsSensitiveIntent(input: string): boolean {
  const text = normalizeForRouting(input)
  return /\b(sql|query libre|consulta libre|schema|prisma|tabla|migracion|migration|api key|token|secret|secreto|env|variable de entorno|database_url|connection string|cadena de conexion|prompt interno|system prompt|ruta interna|endpoint interno|contrasena|password)\b/.test(text)
}

function extractTransactionId(input: string): string | null {
  const text = normalizeForRouting(input)
  const explicit = text.match(/\b(?:tx|transaccion|operacion|id)\s*[:#-]?\s*([a-zA-Z0-9_-]{8,80})\b/)
  if (explicit?.[1]) return explicit[1]

  if (!/\b(resume|resumen|explica|detalle|transaccion|operacion)\b/.test(text)) {
    return null
  }

  const token = input.match(/\b[a-zA-Z0-9_-]{18,80}\b/)
  return token?.[0] ?? null
}

function isContinuationRequest(input: string): boolean {
  return /\b(continua|continuar|sigue|seguir|amplia|ampliar|mas detalle|mas detalles|ver mas)\b/.test(normalizeForRouting(input))
}

function previousUserText(messages: CopilotMessage[]): string | null {
  const previous = messages
    .slice(0, -1)
    .reverse()
    .find(message => message.role === 'user' && !isContinuationRequest(message.content))

  return previous?.content ?? null
}

function chooseTool(input: string): { tool: AdminCopilotToolName; transactionId?: string } {
  const transactionId = extractTransactionId(input)
  if (transactionId) return { tool: 'transaction_summary', transactionId }

  const text = normalizeForRouting(input)

  if (/\b(db|database|base de datos|neon|blob|storage|almacenamiento|infra|infraestructura|imagenes|archivos|trafico|cuota|limite|uso)\b/.test(text)) {
    return { tool: 'infrastructure_status_summary' }
  }
  if (
    /\b(fondos|liberar|payout|cobro|vendedores|pendiente|pendientes)\b/.test(text) &&
    /\b(banco|bancos|metodo|metodos|segregado|segmentado|detalle|desglose|agrupado)\b/.test(text)
  ) {
    return { tool: 'seller_payouts_by_method_summary' }
  }
  if (/\b(conversion|conversiones|embudo|funnel|checkout|ctr)\b/.test(text)) {
    return { tool: 'conversion_funnel_summary' }
  }
  if (
    /\b(categoria|categorias|category|categories)\b/.test(text) &&
    /\b(publicad|activas|activa|oferta|disponibles|catalogo)\b/.test(text)
  ) {
    return { tool: 'top_published_categories_summary' }
  }
  if (/\b(categoria|categorias|category|categories|mas vendid|se venden mas)\b/.test(text)) {
    return { tool: 'top_selling_categories_summary' }
  }
  if (/\b(click|clicks|clic|clics|analitica|analytics)\b/.test(text)) {
    return { tool: 'top_clicked_listings_summary' }
  }
  if (/\b(costo|costos|impuesto|impuestos|finanza|finanzas|financiero|financiera|rentabilidad|margen|margenes|prevision fiscal)\b/.test(text)) {
    return { tool: 'finance_readiness_summary' }
  }
  if (
    /\b(producto|productos|listing|listings|publicacion|publicaciones)\b/.test(text) &&
    /\b(venta|ventas|vendid|mas vendido|mas vendidos|top ventas)\b/.test(text)
  ) {
    return { tool: 'top_listings_by_sales_summary' }
  }
  if (/\b(producto|productos|listing|listings|publicacion|publicaciones|actividad|activo|activos|vistas|views|favorito|favoritos|favoritas)\b/.test(text)) {
    return { tool: 'top_listings_activity_summary' }
  }
  if (/\b(kpi|kpis|dashboard|indicadores|explica)\b/.test(text)) return { tool: 'dashboard_kpis' }
  if (/\b(usuario|usuarios|registrad|cuentas)\b/.test(text)) return { tool: 'registered_users_count' }
  if (/\b(venta|ventas|vendido|hoy)\b/.test(text)) return { tool: 'sales_today_summary' }
  if (/\b(fondos|liberar|pagar|vendedores|payout|cobro)\b/.test(text)) return { tool: 'seller_payout_readiness_summary' }
  if (/\b(pendiente|pendientes|revisar|revision|atencion|estado|estados|disputa)\b/.test(text)) {
    return { tool: 'operations_attention_summary' }
  }

  return { tool: 'admin_overview' }
}

async function runTool(selection: { tool: AdminCopilotToolName; transactionId?: string }): Promise<AdminCopilotToolResult> {
  if (selection.tool === 'registered_users_count') return getRegisteredUsersCount()
  if (selection.tool === 'pending_operations_summary') return getPendingOperationsSummary()
  if (selection.tool === 'operations_attention_summary') return getOperationsAttentionSummary()
  if (selection.tool === 'sales_today_summary') return getSalesTodaySummary()
  if (selection.tool === 'seller_payout_readiness_summary') return getSellerPayoutReadinessSummary()
  if (selection.tool === 'seller_payouts_by_method_summary') return getSellerPayoutsByMethodSummary()
  if (selection.tool === 'infrastructure_status_summary') return getInfrastructureStatusSummary()
  if (selection.tool === 'top_published_categories_summary') return getTopPublishedCategoriesSummary()
  if (selection.tool === 'top_selling_categories_summary') return getTopSellingCategoriesSummary()
  if (selection.tool === 'top_listings_by_sales_summary') return getTopListingsBySalesSummary()
  if (selection.tool === 'top_listings_activity_summary') return getTopListingsActivitySummary()
  if (selection.tool === 'top_clicked_listings_summary') return getTopClickedListingsSummary()
  if (selection.tool === 'conversion_funnel_summary') return getConversionFunnelSummary()
  if (selection.tool === 'marketplace_data_availability') return getMarketplaceDataAvailability()
  if (selection.tool === 'marketplace_analytics_availability') return getMarketplaceDataAvailability()
  if (selection.tool === 'finance_readiness_summary') return getFinanceReadinessSummary()
  if (selection.tool === 'dashboard_kpis') return explainDashboardKpis()
  if (selection.tool === 'transaction_summary') {
    return summarizeTransactionReadOnly(selection.transactionId ?? '')
  }

  return getAdminMarketplaceOverview()
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function asArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(asRecord) : []
}

function textValue(value: unknown, fallback = 'sin dato'): string {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function numberValue(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function nullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function formatUsd(value: unknown): string {
  return `USD ${numberValue(value).toFixed(2)}`
}

function formatMb(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(2)} MB` : 'no medido'
}

function formatPercent(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(2)}%` : 'no calculable'
}

function formatSource(data: Record<string, unknown>): string {
  const source = textValue(data.source, '')
  return source ? `Fuente: ${source}` : 'Fuente: herramienta read-only del marketplace.'
}

function normalizeStatus(value: unknown): 'ok' | 'warning' | 'critical' | 'unknown' {
  const status = textValue(value, 'unknown').toLowerCase()
  if (status === 'ok' || status === 'warning' || status === 'critical') return status
  return 'unknown'
}

function topCategoryReply(toolResult: AdminCopilotToolResult, mode: 'sales' | 'published'): string {
  const rows = asArray(toolResult.data.categories)
  if (rows.length === 0) {
    return [
      `${toolResult.title}: no hay registros para ordenar todavia.`,
      formatSource(toolResult.data),
      'Lectura gerencial: el dato existe en el modelo, pero no hay volumen suficiente en este momento.',
      'Nota: este copilot es solo lectura.',
    ].join('\n')
  }

  const metric = mode === 'sales' ? 'ventas' : 'listings publicados'
  const lines = rows.slice(0, 5).map((row, index) => {
    const count = mode === 'sales' ? numberValue(row.transactionCount) : numberValue(row.publishedListingCount)
    const amount = mode === 'sales' ? `, bruto ${formatUsd(row.grossAmountUsd)}` : `, ${numberValue(row.views)} views`
    return `${index + 1}. ${textValue(row.category)}: ${count} ${metric}${amount}.`
  })

  return [
    `${toolResult.title}`,
    ...lines,
    formatSource(toolResult.data),
    mode === 'sales'
      ? 'Lectura gerencial: esto mide demanda confirmada por transacciones, no solo oferta publicada.'
      : 'Lectura gerencial: esto mide oferta activa; para demanda comercial revisa categorias vendidas.',
    'Nota: este copilot es solo lectura.',
  ].join('\n')
}

function topListingsReply(toolResult: AdminCopilotToolResult, mode: 'sales' | 'activity'): string {
  const rows = asArray(toolResult.data.topListings)
  if (rows.length === 0) {
    return [
      `${toolResult.title}: no hay registros suficientes para ordenar todavia.`,
      formatSource(toolResult.data),
      'Nota: este copilot es solo lectura.',
    ].join('\n')
  }

  const lines = rows.slice(0, 5).map((row, index) => {
    if (mode === 'sales') {
      return `${index + 1}. ${textValue(row.title)}: ${numberValue(row.saleCount)} ventas, bruto ${formatUsd(row.grossAmountUsd)}, ${numberValue(row.views)} views.`
    }

    return `${index + 1}. ${textValue(row.title)}: ${numberValue(row.analyticsViews)} views instrumentadas, ${numberValue(row.clicks)} clicks, ${numberValue(row.favorites)} favoritos, ${numberValue(row.activeSaleCount)} ventas activas.`
  })

  return [
    `${toolResult.title}`,
    ...lines,
    formatSource(toolResult.data),
    mode === 'activity'
      ? textValue(toolResult.data.clickInstrumentation, 'Los clicks aun no estan instrumentados; views y favoritos son proxies de actividad.')
      : 'Lectura gerencial: ordenado por ventas y monto bruto; views y favoritos solo dan contexto.',
    'Nota: este copilot es solo lectura.',
  ].join('\n')
}

function topClickedListingsReply(toolResult: AdminCopilotToolResult): string {
  const rows = asArray(toolResult.data.topListings)
  if (rows.length === 0) {
    return [
      'Listings con mas clicks',
      'Aun no hay eventos de click registrados desde la nueva instrumentacion.',
      formatSource(toolResult.data),
      textValue(toolResult.data.note),
    ].join('\n')
  }

  const lines = rows.slice(0, 5).map((row, index) => {
    const listing = asRecord(row.listing)
    return `${index + 1}. ${textValue(listing.title, textValue(row.listingId))}: ${numberValue(row.totalClicks)} clicks totales, ${numberValue(row.buyClicks)} buy_click, ${numberValue(row.checkoutStarts)} checkout_start.`
  })

  return [
    'Listings con mas clicks',
    ...lines,
    `Eventos click totales: ${numberValue(toolResult.data.totalClickEvents)}.`,
    formatSource(toolResult.data),
    textValue(toolResult.data.note),
  ].join('\n')
}

function conversionFunnelReply(toolResult: AdminCopilotToolResult): string {
  const events = asRecord(toolResult.data.events)
  const outcomes = asRecord(toolResult.data.transactionOutcomes)
  const rates = asRecord(toolResult.data.rates)

  return [
    'Embudo basico de conversion',
    `Eventos: ${numberValue(events.listingViews)} views, ${numberValue(events.listingClicks)} listing_click, ${numberValue(events.buyClicks)} buy_click, ${numberValue(events.checkoutStarts)} checkout_start.`,
    `Tasas: CTR view->click ${formatPercent(rates.clickThroughFromViewsPercent)}, view->buy ${formatPercent(rates.buyClickFromViewsPercent)}, buy->checkout ${formatPercent(rates.checkoutStartFromBuyClickPercent)}.`,
    `Resultados transaccionales: ${numberValue(outcomes.pendingPayment)} pending_payment, ${numberValue(outcomes.paymentReceived)} payment_received, ${numberValue(outcomes.activeSales)} ventas activas, ${numberValue(outcomes.released)} released.`,
    formatSource(toolResult.data),
    textValue(toolResult.data.note),
  ].join('\n')
}

function financeReply(toolResult: AdminCopilotToolResult): string {
  const availableNow = asRecord(toolResult.data.availableNow)

  return [
    'Finanzas marketplace',
    `Disponible ahora: vendido bruto ${formatUsd(availableNow.grossSoldUsd)}, comision plataforma ${formatUsd(availableNow.platformFeeUsd)}, neto vendedor ${formatUsd(availableNow.sellerNetUsd)}.`,
    `Operaciones: ${numberValue(availableNow.releasedTransactions)} liberadas y ${numberValue(availableNow.activeEscrowTransactions)} en escrow activo.`,
    formatSource(toolResult.data),
    textValue(toolResult.data.notInstrumentedAnswer),
    textValue(toolResult.data.futureAnswer),
    'Nota: apoyo operativo read-only; verifica montos contra el dashboard antes de ejecutar acciones.',
  ].join('\n')
}

function availabilityReply(toolResult: AdminCopilotToolResult): string {
  const answers = asRecord(toolResult.data.answers)

  return [
    'Disponibilidad de datos BI',
    `Views: ${textValue(answers.views)}`,
    `Clicks: ${textValue(answers.clicks)}`,
    `Costos: ${textValue(answers.costs)}`,
    `Impuestos: ${textValue(answers.taxes)}`,
    formatSource(toolResult.data),
    'Alternativas actuales: views, favoritos, transacciones, categorias, montos y estados.',
  ].join('\n')
}

function operationsReply(toolResult: AdminCopilotToolResult): string {
  const attentionTotal = numberValue(toolResult.data.attentionTotal)

  return [
    toolResult.title,
    `Prioridad operativa: ${attentionTotal} casos requieren atencion.`,
    `Pagos recibidos: ${numberValue(toolResult.data.paymentReceived)}. En validacion: ${numberValue(toolResult.data.validating)}. Disputas: ${numberValue(toolResult.data.disputed)}. Escrows proximos 24h: ${numberValue(toolResult.data.expiringEscrowNext24h)}.`,
    formatSource(toolResult.data),
    textValue(toolResult.data.managerialRead),
    'Nota: no valida pagos ni cambia estados.',
  ].join('\n')
}

function payoutsByMethodReply(toolResult: AdminCopilotToolResult): string {
  const rows = asArray(toolResult.data.byMethod)
  if (rows.length === 0) {
    return [
      'Fondos por liberar por metodo o banco',
      'No hay operaciones RELEASED pendientes de resumen por metodo en este momento.',
      formatSource(toolResult.data),
      textValue(toolResult.data.privacy),
      'Nota: este copilot es solo lectura.',
    ].join('\n')
  }

  const lines = rows.slice(0, 5).map((row, index) => (
    `${index + 1}. ${textValue(row.label)} (${textValue(row.methodType)}): ${numberValue(row.transactionCount)} operaciones, ${numberValue(row.sellerCount)} vendedores, ${formatUsd(row.amountUsd)}.`
  ))
  const sampleOperations = asArray(rows[0]?.sampleOperations).slice(0, 3).map(operation => (
    `- ${textValue(operation.transactionId)}: ${textValue(operation.seller)}, ${formatUsd(operation.amountUsd)}, ${textValue(operation.listingTitle)}.`
  ))

  return [
    'Fondos por liberar por metodo o banco',
    `Total listo para liberar: ${formatUsd(toolResult.data.totalAmountUsd)} en ${numberValue(toolResult.data.totalReleasedTransactions)} operaciones.`,
    ...lines,
    sampleOperations.length > 0 ? 'Muestra del primer grupo:' : '',
    ...sampleOperations,
    formatSource(toolResult.data),
    textValue(toolResult.data.privacy),
    'Puedo ampliar el desglose por banco/metodo especifico si lo necesitas.',
  ].filter(Boolean).join('\n')
}

function infrastructureReply(toolResult: AdminCopilotToolResult): string {
  const neonDb = asRecord(toolResult.data.neonDb)
  const blob = asRecord(toolResult.data.vercelBlob)
  const traffic = asRecord(toolResult.data.traffic)
  const counts = asRecord(neonDb.usefulCounts)
  const blobMeasurementMode = textValue(blob.measurementMode, '')
  const blobMeasuredByList = blobMeasurementMode === 'real_vercel_blob_list'
  const blobHasMeasuredStorage = blob.measurementAvailable === true
  const operationsLimits = asRecord(blob.operationsLimits)
  const dataTransfer = asRecord(blob.dataTransfer)

  return [
    'Estado DB/Blob',
    `Neon: conectado=${neonDb.connected === true ? 'si' : 'no'}, tamano=${formatMb(neonDb.dbSizeMb)}, limite=${formatMb(neonDb.dbStorageLimitMb)}, uso=${formatPercent(neonDb.dbStorageUsagePercent)}, estado=${textValue(neonDb.status)}.`,
    `Conteos DB: ${numberValue(counts.users)} usuarios, ${numberValue(counts.listings)} listings (${numberValue(counts.activeListings)} activos), ${numberValue(counts.transactions)} transacciones.`,
    blobHasMeasuredStorage
      ? `Blob: ${blobMeasuredByList ? 'medicion real por list()' : 'medicion real por metadata registrada'}, ${numberValue(blob.realBlobCount)} blobs, ${numberValue(blob.realImageCount)} imagenes, storage=${formatMb(blob.blobStorageMb)}, limite=${formatMb(blob.blobStorageLimitMb)}, uso=${formatPercent(blob.blobStorageUsagePercent)}, estado=${textValue(blob.status)}.`
      : `Blob: medicion estimada por DB, ${numberValue(blob.blobUrlReferencesInDb)} URLs Blob referenciadas, ${numberValue(blob.blobImageUrlReferencesInDb)} imagenes Blob, ${numberValue(blob.paymentProofUrlReferencesInDb)} comprobantes referenciados; storage MB real=${formatMb(blob.blobStorageMb)}.`,
    `Operaciones Blob: limite simple mensual ${numberValue(operationsLimits.simpleOperationsMonthlyLimit)}, limite avanzado mensual ${numberValue(operationsLimits.advancedOperationsMonthlyLimit)}, uso mensual actual=${textValue(operationsLimits.currentMonthUsage)}.`,
    `Transfer Blob: limite mensual ${numberValue(dataTransfer.monthlyLimitGb)} GB, uso actual=${textValue(dataTransfer.currentMonthUsage)}.`,
    `Trafico: ${textValue(traffic.status)} ${textValue(traffic.externalObservability)} ${textValue(traffic.missingForRealTraffic)}`,
    `Recomendacion: ${textValue(toolResult.data.recommendation)}`,
    formatSource(toolResult.data),
  ].join('\n')
}

function buildInfrastructureVisual(toolResult: AdminCopilotToolResult): InfrastructureVisualPayload | null {
  if (toolResult.tool !== 'infrastructure_status_summary') return null

  const neonDb = asRecord(toolResult.data.neonDb)
  const blob = asRecord(toolResult.data.vercelBlob)
  const traffic = asRecord(toolResult.data.traffic)
  const counts = asRecord(neonDb.usefulCounts)
  const operationsLimits = asRecord(blob.operationsLimits)
  const dataTransfer = asRecord(blob.dataTransfer)
  const blobMeasurementMode = textValue(blob.measurementMode, '')
  const hasMeasuredBlobStorage = blob.measurementAvailable === true
  const hasBlobList = blobMeasurementMode === 'real_vercel_blob_list'
  const blobCount = hasMeasuredBlobStorage ? numberValue(blob.realBlobCount) : numberValue(blob.blobUrlReferencesInDb)
  const imageCount = hasMeasuredBlobStorage ? numberValue(blob.realImageCount) : numberValue(blob.blobImageUrlReferencesInDb)

  return {
    type: 'infrastructure_status',
    summary: 'Estado read-only de Neon DB y Vercel Blob.',
    metrics: [
      {
        id: 'neon_storage',
        label: 'Neon storage',
        status: normalizeStatus(neonDb.status),
        usedMb: nullableNumber(neonDb.dbSizeMb),
        limitMb: nullableNumber(neonDb.dbStorageLimitMb),
        percent: nullableNumber(neonDb.dbStorageUsagePercent),
        detail: neonDb.connected === true ? 'Conectado por Prisma read-only' : 'No conectado',
      },
      {
        id: 'blob_storage',
        label: hasMeasuredBlobStorage ? 'Blob storage real' : 'Blob storage estimado',
        status: hasMeasuredBlobStorage ? normalizeStatus(blob.status) : 'unknown',
        usedMb: nullableNumber(blob.blobStorageMb),
        limitMb: nullableNumber(blob.blobStorageLimitMb),
        percent: nullableNumber(blob.blobStorageUsagePercent),
        detail: hasMeasuredBlobStorage
          ? hasBlobList
            ? 'Medido con @vercel/blob list() read-only'
            : 'Medido desde metadata registrada al subir archivos'
          : 'Estimado por referencias DB, no uso real en MB',
      },
      {
        id: 'blob_operations',
        label: 'Blob operations',
        status: 'unknown',
        usedMb: null,
        limitMb: null,
        percent: null,
        detail: `No instrumentado localmente. Limites: ${numberValue(operationsLimits.simpleOperationsMonthlyLimit)} simples/mes y ${numberValue(operationsLimits.advancedOperationsMonthlyLimit)} avanzadas/mes.`,
      },
      {
        id: 'blob_transfer',
        label: 'Blob transfer',
        status: 'unknown',
        usedMb: null,
        limitMb: null,
        percent: null,
        detail: `No instrumentado localmente. Limite administrativo: ${numberValue(dataTransfer.monthlyLimitGb)} GB/mes.`,
      },
    ],
    counts: [
      { label: 'DB conectada', value: neonDb.connected === true ? 'Si' : 'No' },
      { label: 'Usuarios', value: String(numberValue(counts.users)) },
      { label: 'Listings', value: String(numberValue(counts.listings)) },
      { label: 'Transacciones', value: String(numberValue(counts.transactions)) },
      { label: 'Blobs detectados', value: String(blobCount) },
      { label: 'Imagenes detectadas', value: String(imageCount) },
      { label: 'Comprobantes ref.', value: String(numberValue(blob.paymentProofUrlReferencesInDb)) },
    ],
    notes: [
      textValue(blob.measurementNote),
      textValue(traffic.missingForRealTraffic),
      textValue(toolResult.data.recommendation),
    ],
  }
}

function deterministicReply(toolResult: AdminCopilotToolResult): string {
  if (toolResult.tool === 'top_selling_categories_summary') return topCategoryReply(toolResult, 'sales')
  if (toolResult.tool === 'top_published_categories_summary') return topCategoryReply(toolResult, 'published')
  if (toolResult.tool === 'top_listings_by_sales_summary') return topListingsReply(toolResult, 'sales')
  if (toolResult.tool === 'top_listings_activity_summary') return topListingsReply(toolResult, 'activity')
  if (toolResult.tool === 'top_clicked_listings_summary') return topClickedListingsReply(toolResult)
  if (toolResult.tool === 'conversion_funnel_summary') return conversionFunnelReply(toolResult)
  if (toolResult.tool === 'seller_payouts_by_method_summary') return payoutsByMethodReply(toolResult)
  if (toolResult.tool === 'infrastructure_status_summary') return infrastructureReply(toolResult)
  if (toolResult.tool === 'marketplace_data_availability' || toolResult.tool === 'marketplace_analytics_availability') {
    return availabilityReply(toolResult)
  }
  if (toolResult.tool === 'finance_readiness_summary') return financeReply(toolResult)
  if (toolResult.tool === 'operations_attention_summary' || toolResult.tool === 'pending_operations_summary') {
    return operationsReply(toolResult)
  }

  return [
    toolResult.title,
    '',
    JSON.stringify(toolResult.data, null, 2),
    '',
    'Nota: este copilot es solo lectura. Verifica cifras financieras contra el dashboard antes de ejecutar acciones.',
  ].join('\n')
}

async function generateCopilotReply(question: string, toolResult: AdminCopilotToolResult): Promise<string> {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return deterministicReply(toolResult)
  }

  const abortController = new AbortController()
  const timeoutId = setTimeout(() => abortController.abort(), MODEL_TIMEOUT_MS)

  try {
    const model = process.env.MARKETPLACE_ADMIN_COPILOT_MODEL?.trim() || process.env.MARKETPLACE_ASSISTANT_MODEL?.trim() || 'gemini-2.5-flash'
    const result = await generateText({
      model: google(model),
      system: SYSTEM_PROMPT,
      prompt: [
        `Pregunta del admin: ${question}`,
        '',
        'Resultado de herramienta read-only:',
        JSON.stringify(toolResult, null, 2),
        '',
        'Redacta una respuesta breve, gerencial y accionable. No agregues datos fuera del JSON.',
      ].join('\n'),
      maxOutputTokens: 700,
      temperature: 0.2,
      abortSignal: abortController.signal,
    })

    return result.text.trim() || deterministicReply(toolResult)
  } catch (error) {
    if (error instanceof Error) {
      console.error(`[admin-copilot] generation_failed: ${error.name}: ${error.message}`)
    } else {
      console.error('[admin-copilot] generation_failed: unknown error')
    }
    return deterministicReply(toolResult)
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function POST(req: NextRequest) {
  let adminSession: { userId: string; displayName: string; role: string }
  try {
    adminSession = await requireAdminCopilotSession()
  } catch {
    return jsonError('Acceso no autorizado.', 403, 'ADMIN_REQUIRED')
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonError('Solicitud invalida.', 400, 'INVALID_JSON')
  }

  const messages = normalizeMessages(body)
  if (!messages) {
    return jsonError('Mensaje invalido o demasiado largo.', 400, 'INVALID_PAYLOAD')
  }

  const question = latestUserText(messages)
  const continuationContext = isContinuationRequest(question) ? previousUserText(messages) : null
  if (isContinuationRequest(question) && !continuationContext) {
    return NextResponse.json({
      reply: CONTINUE_NEEDS_CONTEXT_REPLY,
      kind: 'answer',
    })
  }
  const routedQuestion = continuationContext ?? question

  if (
    containsWriteIntent(question) ||
    containsSensitiveIntent(question) ||
    containsWriteIntent(routedQuestion) ||
    containsSensitiveIntent(routedQuestion)
  ) {
    return NextResponse.json({
      reply: REFUSAL_REPLY,
      kind: 'refusal',
    })
  }

  try {
    const selection = chooseTool(routedQuestion)
    const toolResult = await runTool(selection)
    if (toolResult.tool === 'infrastructure_status_summary') {
      await trackMarketplaceEvent({
        eventType: 'assistant_admin_db_status_view',
        userId: adminSession.userId,
        path: '/marketplace/admin/copilot',
        metadataJson: { tool: toolResult.tool },
      })
    }
    const reply = await generateCopilotReply(
      continuationContext ? `Continua la respuesta anterior sobre: ${continuationContext}` : question,
      toolResult,
    )
    const infrastructureStatus = buildInfrastructureVisual(toolResult)

    return NextResponse.json({
      reply,
      kind: 'answer',
      tool: toolResult.tool,
      type: infrastructureStatus?.type,
      infrastructureStatus,
      data: toolResult.data,
      generatedAt: toolResult.generatedAt,
    })
  } catch (error) {
    if (error instanceof Error) {
      console.error(`[admin-copilot] request_failed: ${error.name}: ${error.message}`)
    } else {
      console.error('[admin-copilot] request_failed: unknown error')
    }

    return jsonError('No pude consultar el resumen administrativo en este momento.', 500, 'COPILOT_ERROR')
  }
}
