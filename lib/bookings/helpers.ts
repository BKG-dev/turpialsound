// Turpial Sound — Helpers puros del dominio de reservas
// Fase 1A.4 — Helpers de dominio y contratos básicos
// Sin IO, sin dependencias externas, deterministas y testeables

import type { BookingStatus, ApprovalDecision, PriorityLevel, RequestSource, PublicCodeParts } from './types'
import {
  TERMINAL_BOOKING_STATUSES,
  BOOKING_STATUS_TRANSITIONS,
  PRIORITY_WEIGHTS,
  REQUEST_SOURCES,
  PUBLIC_CODE_PREFIX,
} from './constants'

// ─────────────────────────────────────────────────────────────────
// BOOKING STATUS
// ─────────────────────────────────────────────────────────────────

/**
 * Devuelve true si el estado no tiene transiciones posibles (fin de flujo).
 */
export function isTerminalBookingStatus(status: BookingStatus): boolean {
  return TERMINAL_BOOKING_STATUSES.includes(status)
}

/**
 * Devuelve true si la transición from → to está permitida por el workflow.
 */
export function canTransitionBookingStatus(from: BookingStatus, to: BookingStatus): boolean {
  return BOOKING_STATUS_TRANSITIONS[from].includes(to)
}

/**
 * Devuelve la lista de estados a los que puede avanzar el estado dado.
 * Devuelve array vacío si el estado es terminal.
 */
export function getNextBookingStatuses(current: BookingStatus): BookingStatus[] {
  return BOOKING_STATUS_TRANSITIONS[current]
}

// ─────────────────────────────────────────────────────────────────
// APROBACIONES
// ─────────────────────────────────────────────────────────────────

/**
 * Devuelve true si la decisión de aprobación cierra el paso sin reenvío.
 * 'needs_adjustment' no es terminal: la solicitud regresa al solicitante.
 */
export function isApprovalComplete(decision: ApprovalDecision): boolean {
  return decision === 'approved' || decision === 'rejected'
}

// ─────────────────────────────────────────────────────────────────
// PUBLIC CODE
// ─────────────────────────────────────────────────────────────────

/**
 * Descompone un publicCode (ej: "TUR-2026-001") en sus partes.
 * Devuelve null si el formato no es reconocible.
 */
export function parsePublicCode(code: string): PublicCodeParts | null {
  const parts = code.split('-')
  if (parts.length !== 3) return null
  const [prefix, yearStr, seqStr] = parts
  const year = parseInt(yearStr, 10)
  const sequence = parseInt(seqStr, 10)
  if (!prefix || isNaN(year) || isNaN(sequence)) return null
  return { prefix, year, sequence }
}

/**
 * Formatea las partes de un publicCode en el string canónico.
 * El número de secuencia se rellena con ceros hasta 3 dígitos (ej: 001, 042).
 */
export function formatPublicCode(parts: PublicCodeParts): string {
  const seq = String(parts.sequence).padStart(3, '0')
  return `${parts.prefix}-${parts.year}-${seq}`
}

/**
 * Construye un publicCode canónico a partir de año y secuencia.
 * La lógica de obtener la secuencia desde la base de datos vive fuera de este helper.
 * Ejemplo: buildPublicCode(2026, 1) → "TUR-2026-001"
 */
export function buildPublicCode(year: number, sequence: number): string {
  return formatPublicCode({ prefix: PUBLIC_CODE_PREFIX, year, sequence })
}

// ─────────────────────────────────────────────────────────────────
// REQUEST SOURCE
// ─────────────────────────────────────────────────────────────────

/**
 * Normaliza un source a minúsculas y sin espacios.
 * Si el valor no es un string reconocido, devuelve 'web' como fallback.
 */
export function normalizeRequestSource(source: unknown): RequestSource {
  if (typeof source !== 'string') return 'web'
  const normalized = source.toLowerCase().trim().replace(/\s+/g, '_')
  return (REQUEST_SOURCES as string[]).includes(normalized)
    ? (normalized as RequestSource)
    : 'web'
}

// ─────────────────────────────────────────────────────────────────
// PRIORITY
// ─────────────────────────────────────────────────────────────────

/**
 * Devuelve el peso numérico de un nivel de prioridad.
 * Útil para ordenar listas en el panel interno (mayor peso = mayor prioridad).
 */
export function getPriorityWeight(priority: PriorityLevel): number {
  return PRIORITY_WEIGHTS[priority]
}

/**
 * Compara dos prioridades.
 * Devuelve positivo si a > b, negativo si a < b, 0 si iguales.
 * Compatible con Array.sort() para ordenar de menor a mayor prioridad.
 * Para mayor a menor, invertir los argumentos.
 */
export function comparePriority(a: PriorityLevel, b: PriorityLevel): number {
  return getPriorityWeight(a) - getPriorityWeight(b)
}
