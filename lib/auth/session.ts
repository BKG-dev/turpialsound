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

export const ADMIN_LOGIN_PATH = '/admin/login' as const
export const ADMIN_DASHBOARD_PATH = '/admin' as const

function normalizePathname(pathname: string): string {
  if (!pathname) {
    return '/'
  }

  const trimmed = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname
  return trimmed || '/'
}

export function isAdminLoginPath(pathname: string): boolean {
  return normalizePathname(pathname) === ADMIN_LOGIN_PATH
}

export function getAdminAccessKey(): string {
  return process.env.ADMIN_ACCESS_KEY?.trim() ?? ''
}

export function isAdminAccessConfigured(): boolean {
  return getAdminAccessKey().length > 0
}

export function isValidAdminAccessKey(value: string): boolean {
  const configuredKey = getAdminAccessKey()
  if (!configuredKey) {
    return false
  }

  return value === configuredKey
}

export function isValidAdminSessionValue(value: string | undefined): boolean {
  if (!value) {
    return false
  }

  return isValidAdminAccessKey(value)
}

export function getAdminSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  }
}
