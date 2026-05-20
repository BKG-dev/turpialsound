// lib/auth/roles.ts
// Jerarquía de roles y helpers de permisos para el panel interno de Turpial Sound.
// Solo aplica a usuarios internos (staff / directivos) — no a solicitantes externos.
// Fase 1A.5 — implementación sin dependencias externas.

import type { UserRole } from '@/lib/bookings/types'

export type { UserRole }

// Peso numérico de cada rol. Mayor índice = más privilegios.
// admin > turpial_director > casa_director > operations
const ROLE_HIERARCHY: Record<UserRole, number> = {
  operations: 1,
  casa_director: 2,
  turpial_director: 3,
  admin: 4,
}

/**
 * True si el rol del usuario cumple o supera el rol requerido.
 */
export function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}

/**
 * Puede acceder al panel interno (todos los roles internos).
 */
export function canAccessAdmin(userRole: UserRole): boolean {
  return hasMinimumRole(userRole, 'operations')
}

/**
 * Puede revisar y actualizar el estado de solicitudes.
 */
export function canReviewBookings(userRole: UserRole): boolean {
  return hasMinimumRole(userRole, 'operations')
}

/**
 * Puede emitir una decisión de aprobación (directores en adelante).
 */
export function canApproveBookings(userRole: UserRole): boolean {
  return hasMinimumRole(userRole, 'casa_director')
}

/**
 * Puede gestionar catálogos, recursos y usuarios internos (solo admin).
 */
export function canManageCatalog(userRole: UserRole): boolean {
  return hasMinimumRole(userRole, 'admin')
}

/**
 * Lista ordenada de todos los roles internos válidos.
 */
export const INTERNAL_ROLES: UserRole[] = [
  'operations',
  'casa_director',
  'turpial_director',
  'admin',
]
