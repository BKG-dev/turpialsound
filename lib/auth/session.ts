// lib/auth/session.ts
// Contrato de sesión interna para el panel de Turpial Sound.
// Define tipos y constantes sin acoplar a ningún proveedor de auth.
// La implementación real (creación / validación de tokens, login) se completa en Fase 1C.

import type { UserRole } from '@/lib/bookings/types'

/**
 * Estructura de la sesión de un usuario interno autenticado.
 * Se usará para tipar las sesiones una vez que exista el sistema de auth real.
 */
export interface InternalSession {
  userId: string
  email: string
  name: string
  role: UserRole
}

/**
 * Nombre canónico de la cookie de sesión interna.
 * Definido aquí para evitar strings dispersos en el código.
 * También se usa en middleware.ts.
 */
export const SESSION_COOKIE_NAME = 'turpial_admin_session' as const
