import { cookies } from 'next/headers'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
}
import { redirect } from 'next/navigation'
import {
  ADMIN_DASHBOARD_PATH,
  ADMIN_LOGIN_PATH,
  SESSION_COOKIE_NAME,
  getAdminSessionCookieOptions,
  isAdminAccessConfigured,
  isValidAdminAccessKey,
  isValidAdminSessionValue,
} from '@/lib/auth/session'

type SearchParamValue = string | string[] | undefined

interface AdminLoginPageProps {
  searchParams?:
    | Promise<{
        error?: SearchParamValue
      }>
    | {
        error?: SearchParamValue
      }
}

function getSingleValue(value: SearchParamValue): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim()) {
    return value[0].trim()
  }

  return null
}

async function signInAction(formData: FormData) {
  'use server'

  const submittedAccessKey = formData.get('accessKey')?.toString().trim() ?? ''

  if (!isAdminAccessConfigured()) {
    redirect(`${ADMIN_LOGIN_PATH}?error=missing_config`)
  }

  if (!isValidAdminAccessKey(submittedAccessKey)) {
    redirect(`${ADMIN_LOGIN_PATH}?error=invalid_credentials`)
  }

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, submittedAccessKey, {
    ...getAdminSessionCookieOptions(),
    maxAge: 60 * 60 * 8,
  })

  redirect(ADMIN_DASHBOARD_PATH)
}

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const cookieStore = await cookies()
  const existingSession = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (isValidAdminSessionValue(existingSession)) {
    redirect(ADMIN_DASHBOARD_PATH)
  }

  const params = (await searchParams) ?? {}
  const error = getSingleValue(params.error)
  const accessConfigured = isAdminAccessConfigured()

  const errorMessage =
    error === 'invalid_credentials'
      ? 'Clave de acceso invalida. Verifica e intenta de nuevo.'
      : error === 'missing_config'
        ? 'No se puede iniciar sesion: falta configurar ADMIN_ACCESS_KEY en variables de entorno.'
        : null

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Acceso interno</h1>
        <p className="mt-2 text-sm text-slate-600">
          Ingresa la clave interna para abrir el Booking Command Center.
        </p>

        {errorMessage ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <form action={signInAction} className="mt-6 space-y-4">
          <label className="block space-y-1.5 text-sm text-slate-700">
            <span className="font-medium">Clave de acceso</span>
            <input
              type="password"
              name="accessKey"
              required
              autoComplete="current-password"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Ingresa la clave interna"
            />
          </label>

          <button
            type="submit"
            disabled={!accessConfigured}
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            Entrar
          </button>
        </form>
      </section>
    </main>
  )
}
