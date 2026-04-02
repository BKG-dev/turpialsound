// middleware.ts — Turpial Sound
// Protección mínima de rutas internas.
// Fase 1A.5: bloquea /admin si no existe cookie de sesión.
// La validación real del token se implementa en Fase 1C.

import { NextRequest, NextResponse } from 'next/server'

// Nombre de cookie de sesión interna (ver también lib/auth/session.ts)
const SESSION_COOKIE_NAME = 'turpial_admin_session'

export function middleware(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE_NAME)

  if (!session) {
    // Sin sesión válida: redirigir al inicio.
    // En Fase 1C se reemplaza por redirección a /admin/login con validación de token.
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
