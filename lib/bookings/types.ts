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
