import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const COOKIE_NAME = 'mp_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days in seconds

// Falls back to a dev secret so the app boots without additional config.
// In production set MP_JWT_SECRET to a random 32+ char string.
const secret = new TextEncoder().encode(
  process.env.MP_JWT_SECRET ?? 'turpialsound_mp_dev_secret_change_in_production',
)

export interface MpSessionPayload {
  userId: string
  email: string
  displayName: string
  isSeller: boolean
  role: string // 'USER' | 'SOCIO' | 'SUPER'
}

export async function signSession(payload: MpSessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret)
}

export async function verifySession(token: string): Promise<MpSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return {
      userId: payload['userId'] as string,
      email: payload['email'] as string,
      displayName: payload['displayName'] as string,
      isSeller: payload['isSeller'] as boolean,
      role: (payload['role'] as string) ?? 'USER',
    }
  } catch {
    return null
  }
}

/** Read session from the current request's cookie (server-side only). */
export async function getSession(): Promise<MpSessionPayload | null> {
  // cookies() is synchronous in Next.js 14; no await needed
  const cookieStore = cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifySession(token)
}

/** Write the session JWT into an httpOnly cookie. */
export async function setSessionCookie(payload: MpSessionPayload): Promise<void> {
  const token = await signSession(payload)
  const cookieStore = cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
}

/** Delete the session cookie (logout). */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = cookies()
  cookieStore.delete(COOKIE_NAME)
}
