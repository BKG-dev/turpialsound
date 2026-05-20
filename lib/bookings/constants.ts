// Turpial Sound — Constantes del dominio de reservas
// Fase 1A.4 — Helpers de dominio y contratos básicos
// Alineado con prisma/schema.prisma — no importa Prisma Client

import type {
  BookingStatus,
  UserRole,
  ApprovalDecision,
  PriorityLevel,
  RequestSource,
} from './types'

// ─────────────────────────────────────────────────────────────────
// BOOKING STATUSES — en orden canónico de flujo
// ─────────────────────────────────────────────────────────────────

export const BOOKING_STATUSES: BookingStatus[] = [
  'draft',
  'submitted',
  'availability_checked',
  'under_review',
  'approved_partial',
  'approved',
  'rejected',
  'needs_adjustment',
  'calendar_booked',
  'confirmed',
]

// Estados sin transiciones posibles (fin de flujo)
export const TERMINAL_BOOKING_STATUSES: BookingStatus[] = ['rejected', 'confirmed']

// Transiciones permitidas por el workflow
// Cada estado lista los estados a los que puede avanzar
export const BOOKING_STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  draft:                ['submitted'],
  submitted:            ['availability_checked', 'rejected'],
  availability_checked: ['under_review', 'rejected'],
  under_review:         ['approved_partial', 'approved', 'rejected', 'needs_adjustment'],
  approved_partial:     ['approved', 'rejected', 'needs_adjustment'],
  approved:             ['calendar_booked', 'rejected'],
  rejected:             [],
  needs_adjustment:     ['submitted', 'rejected'],
  calendar_booked:      ['confirmed', 'rejected'],
  confirmed:            [],
}

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  draft:                'Borrador',
  submitted:            'Enviada',
  availability_checked: 'Disponibilidad verificada',
  under_review:         'En revisión',
  approved_partial:     'Aprobación parcial',
  approved:             'Aprobada',
  rejected:             'Rechazada',
  needs_adjustment:     'Requiere ajuste',
  calendar_booked:      'Agendada',
  confirmed:            'Confirmada',
}

// ─────────────────────────────────────────────────────────────────
// USER ROLES
// ─────────────────────────────────────────────────────────────────

export const USER_ROLES: UserRole[] = [
  'admin',
  'operations',
  'casa_director',
  'turpial_director',
]

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin:            'Administrador',
  operations:       'Operaciones',
  casa_director:    'Director Casa',
  turpial_director: 'Director Turpial',
}

// ─────────────────────────────────────────────────────────────────
// APPROVAL DECISIONS
// ─────────────────────────────────────────────────────────────────

export const APPROVAL_DECISIONS: ApprovalDecision[] = [
  'approved',
  'rejected',
  'needs_adjustment',
]

export const APPROVAL_DECISION_LABELS: Record<ApprovalDecision, string> = {
  approved:         'Aprobado',
  rejected:         'Rechazado',
  needs_adjustment: 'Requiere ajuste',
}

// ─────────────────────────────────────────────────────────────────
// PRIORITY LEVELS
// ─────────────────────────────────────────────────────────────────

export const PRIORITY_LEVELS: PriorityLevel[] = ['low', 'normal', 'high']

export const PRIORITY_LEVEL_LABELS: Record<PriorityLevel, string> = {
  low:    'Baja',
  normal: 'Normal',
  high:   'Alta',
}

// Pesos numéricos para ordenamiento en el panel interno
export const PRIORITY_WEIGHTS: Record<PriorityLevel, number> = {
  low:    1,
  normal: 2,
  high:   3,
}

// ─────────────────────────────────────────────────────────────────
// REQUEST SOURCES
// ─────────────────────────────────────────────────────────────────

export const REQUEST_SOURCES: RequestSource[] = [
  'web',
  'phone',
  'in_person',
  'referral',
]

export const REQUEST_SOURCE_LABELS: Record<string, string> = {
  web:       'Web',
  phone:     'Teléfono',
  in_person: 'Presencial',
  referral:  'Referido',
}

// ─────────────────────────────────────────────────────────────────
// DEFAULTS
// ─────────────────────────────────────────────────────────────────

export const DEFAULT_CURRENCY: string          = 'USD'
export const DEFAULT_PRIORITY: PriorityLevel   = 'normal'
export const DEFAULT_SOURCE: RequestSource     = 'web'
export const DEFAULT_STATUS: BookingStatus     = 'draft'

// Prefijo canónico para códigos públicos (ej: "TUR-2026-001")
export const PUBLIC_CODE_PREFIX = 'TUR'
