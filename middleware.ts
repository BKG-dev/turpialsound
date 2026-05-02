// middleware.ts - Turpial Sound
// Proteccion minima de rutas internas con login V1.

import { NextRequest, NextResponse } from 'next/server'
import {
  ADMIN_DASHBOARD_PATH,
  ADMIN_LOGIN_PATH,
  SESSION_COOKIE_NAME,
  isAdminLoginPath,
  isValidAdminSessionValue,
} from '@/lib/auth/session'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const sessionValue = request.cookies.get(SESSION_COOKIE_NAME)?.value
  const hasValidSession = isValidAdminSessionValue(sessionValue)

  if (isAdminLoginPath(pathname)) {
    if (hasValidSession) {
      return NextResponse.redirect(new URL(ADMIN_DASHBOARD_PATH, request.url))
    }

    return NextResponse.next()
  }

  if (!hasValidSession) {
    return NextResponse.redirect(new URL(ADMIN_LOGIN_PATH, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
