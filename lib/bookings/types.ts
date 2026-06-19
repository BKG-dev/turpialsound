// Turpial Sound — Tipos del dominio de reservas
// Fase 1A.4 — Helpers de dominio y contratos básicos
// Fuente canónica de tipos del dominio.
// No depende de Prisma Client ni de React.

// ─────────────────────────────────────────────────────────────────
// ENUMS / UNION TYPES (alineados con prisma/schema.prisma)
// ─────────────────────────────────────────────────────────────────

export type BookingStatus =
  | 'draft'
  | 'submitted'
  | 'availability_checked'
  | 'under_review'
  | 'approved_partial'
  | 'approved'
  | 'rejected'
  | 'needs_adjustment'
  | 'calendar_booked'
  | 'confirmed'

export type UserRole =
  | 'admin'
  | 'operations'
  | 'casa_director'
  | 'turpial_director'

export type ApprovalDecision =
  | 'approved'
  | 'rejected'
  | 'needs_adjustment'

export type PriorityLevel = 'low' | 'normal' | 'high'

// String con valores conocidos; extensible sin migración (igual que el schema)
export type RequestSource =
  | 'web'
  | 'phone'
  | 'in_person'
  | 'referral'
  | (string & Record<never, never>)
// ─────────────────────────────────────────────────────────────────
// RESÚMENES DE CATÁLOGO
// Usados en formularios y listados; sin relaciones anidadas
// ─────────────────────────────────────────────────────────────────

export interface ServiceSummary {
  id: string
  slug: string
  name: string
  description?: string | null
  isActive: boolean
}

export interface ServiceVariantSummary {
  id: string
  slug: string
  name: string
  description?: string | null
  isActive: boolean
  serviceId: string
}

export interface ResourceSummary {
  id: string
  slug: string
  name: string
  description?: string | null
  isActive: boolean
}

// ─────────────────────────────────────────────────────────────────
// BOOKING REQUEST
// ─────────────────────────────────────────────────────────────────

export interface BookingRequestSummary {
  id: string
  publicCode: string
  status: BookingStatus
  priorityLevel: PriorityLevel
  source: RequestSource
  requesterName: string
  requesterEmail: string
  requesterPhone?: string | null
  eventTitle: string
  eventDate: Date
  eventEndDate?: Date | null
  estimatedTotal?: number | null
  currency: string
  submittedAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

// Input para crear un ítem dentro de una solicitud
export interface BookingRequestItemInput {
  serviceVariantId: string
  resourceId?: string | null
  quantity?: number
  notes?: string | null
}

// Representa un item seleccionado dentro del wizard publico.
// En 1B.6a seguimos usando un solo item visible, pero el contrato
// deja preparado el estado para evolucionar a multiples items.
export interface SelectedBookingItem {
  serviceSlug: string
  variantSlug: string | null
  quantity: number
}

export interface BookingEstimateLine {
  label: string
  quantity: number
  unit: 'hour' | 'track' | 'episode' | 'fixed' | 'addon'
  unitPriceUsd: number | null
  lineTotalUsd: number
}

export interface BookingEstimateAdjustment {
  label: string
  amountUsd: number
}

export interface BookingEstimateIssue {
  code: string
  message: string
}

export interface BookingEstimate {
  lines: BookingEstimateLine[]
  adjustments: BookingEstimateAdjustment[]
  subtotalUsd: number
  estimatedTotalUsd: number
  blockingIssues: BookingEstimateIssue[]
  isBlocked: boolean
}

export type BookingMode = 'single' | 'custom_bundle'

export type CustomBundleQuantityType = 'hour' | 'track' | 'episode' | 'unit'

export interface CustomBundleCategory {
  slug: string
  name: string
  description: string
  visualOrder: number
  active: boolean
}

export interface CustomBundleItem {
  slug: string
  categorySlug: string
  groupSlug: string | null
  name: string
  description: string
  commercialUnit: string
  quantityType: CustomBundleQuantityType
  unitPriceUsd: number
  minimumQuantity: number
  maximumQuantity: number | null
  quantityStep: number
  consumesCalendar: boolean
  minutesPerUnit: number | null
  fixedPrice: boolean
  requiresSessionDuration: boolean
  minimumSessionMinutes: number | null
  maximumSessionMinutes: number | null
  scheduleOrder: number | null
  visualOrder: number
  active: boolean
  weekendSurchargeUsdPerHour: number | null
  included: boolean
}

export interface CustomBundleSelection {
  itemSlug: string
  quantity: number
  sessionDurationMinutes: number | null
}

export interface CustomBundleEstimateLine {
  item: CustomBundleItem
  label: string
  quantity: number
  sessionDurationMinutes: number | null
  durationMinutes: number
  unitPriceUsd: number
  lineTotalUsd: number
  isIncluded: boolean
}

export interface CustomBundleEstimateAdjustment {
  label: string
  amountUsd: number
}

export interface CustomBundleEstimateIssue {
  code: string
  message: string
}

export interface CustomBundleEstimate {
  lines: CustomBundleEstimateLine[]
  adjustments: CustomBundleEstimateAdjustment[]
  subtotalUsd: number
  estimatedTotalUsd: number
  totalDurationMinutes: number
  selectionCount: number
  blockingIssues: CustomBundleEstimateIssue[]
  isBlocked: boolean
}

// ─────────────────────────────────────────────────────────────────
// APROBACIONES
// ─────────────────────────────────────────────────────────────────

export interface ApprovalStepSummary {
  id: string
  bookingRequestId: string
  approverId: string
  roleRequired: UserRole
  decision: ApprovalDecision
  comment?: string | null
  decidedAt?: Date | null
  createdAt: Date
}

// ─────────────────────────────────────────────────────────────────
// UTILIDADES INTERNAS
// ─────────────────────────────────────────────────────────────────

// Partes descompuestas de un publicCode para generación o display
// Formato canónico: "TUR-2026-001"
export interface PublicCodeParts {
  prefix: string   // 'TUR'
  year: number     // 2026
  sequence: number // 1, 2, 3...
}
