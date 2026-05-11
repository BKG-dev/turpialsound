'use client'

import Script from 'next/script'
import { useCallback, useEffect, useMemo, useState } from 'react'

const META_GRAPH_VERSION = 'v25.0'
const ALLOWED_ORIGINS = new Set(['https://www.facebook.com', 'https://web.facebook.com'])

type UnknownRecord = Record<string, unknown>

interface FacebookAuthResponse {
  code?: string
}

interface FacebookLoginResponse {
  status?: string
  authResponse?: FacebookAuthResponse
}

interface FacebookLoginOptions {
  config_id: string
  response_type: 'code'
  override_default_response_type: boolean
  extras: {
    featureType: 'whatsapp_business_app_onboarding'
  }
}

interface FacebookSDK {
  init: (options: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void
  login: (callback: (response: FacebookLoginResponse) => void, options: FacebookLoginOptions) => void
}

interface SanitizedMetaEvent {
  type: string
  event: string | null
  waba_id: string | null
  phone_number_id: string | null
  business_id: string | null
}

declare global {
  interface Window {
    FB?: FacebookSDK
    fbAsyncInit?: () => void
  }
}

function getString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function sanitizeEmbeddedSignupEvent(raw: unknown): SanitizedMetaEvent | null {
  if (!raw || typeof raw !== 'object') return null

  const payload = raw as UnknownRecord
  const type = getString(payload.type)
  if (type !== 'WA_EMBEDDED_SIGNUP') return null

  const data = (payload.data && typeof payload.data === 'object' ? payload.data : {}) as UnknownRecord

  return {
    type,
    event: getString(payload.event),
    waba_id: getString(data.waba_id),
    phone_number_id: getString(data.phone_number_id),
    business_id: getString(data.business_id),
  }
}

export default function EmbeddedSignupLabClient({
  appId,
  configId,
}: {
  appId: string
  configId: string
}) {
  const [sdkReady, setSdkReady] = useState(false)
  const [sdkInitError, setSdkInitError] = useState<string | null>(null)
  const [loginStatus, setLoginStatus] = useState<string>('idle')
  const [hasCode, setHasCode] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [events, setEvents] = useState<SanitizedMetaEvent[]>([])

  const labReady = useMemo(() => Boolean(appId && configId), [appId, configId])

  const initializeFacebookSdk = useCallback(() => {
    if (!appId) {
      setSdkInitError('Falta NEXT_PUBLIC_META_APP_ID en runtime.')
      return
    }

    if (!window.FB) {
      setSdkInitError('Facebook SDK no disponible en window.FB.')
      return
    }

    window.FB.init({
      appId,
      cookie: false,
      xfbml: false,
      version: META_GRAPH_VERSION,
    })

    setSdkInitError(null)
    setSdkReady(true)
  }, [appId])

  useEffect(() => {
    window.fbAsyncInit = initializeFacebookSdk
    return () => {
      window.fbAsyncInit = undefined
    }
  }, [initializeFacebookSdk])

  useEffect(() => {
    const onMessage = (message: MessageEvent) => {
      if (!ALLOWED_ORIGINS.has(message.origin)) return

      const sanitized = sanitizeEmbeddedSignupEvent(message.data)
      if (!sanitized) return

      setEvents((previous) => [sanitized, ...previous].slice(0, 20))
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  const handleEmbeddedSignup = useCallback(() => {
    if (!window.FB) {
      setLoginError('Facebook SDK aun no esta disponible.')
      return
    }

    if (!configId) {
      setLoginError('Falta NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID en runtime.')
      return
    }

    setLoginStatus('opening_popup')
    setHasCode(false)
    setLoginError(null)

    window.FB.login(
      (response) => {
        const status = response?.status ?? 'unknown'
        const codePresent = Boolean(response?.authResponse?.code)

        setLoginStatus(status)
        setHasCode(codePresent)

        if (!codePresent && status !== 'connected') {
          setLoginError('Flujo cancelado, denegado o sin code en authResponse.')
        }
      },
      {
        config_id: configId,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          // Coexistence flow selector for WhatsApp Business App onboarding.
          featureType: 'whatsapp_business_app_onboarding',
        },
      },
    )
  }, [configId])

  return (
    <main className="container-base py-12">
      <Script
        src="https://connect.facebook.net/en_US/sdk.js"
        strategy="afterInteractive"
        onLoad={initializeFacebookSdk}
        onError={() => setSdkInitError('No se pudo cargar https://connect.facebook.net/en_US/sdk.js')}
      />

      <div className="mx-auto max-w-3xl rounded-xl border border-amber-500/40 bg-black/30 p-6 text-white">
        <h1 className="font-display text-3xl">LAB Meta Embedded Signup / No produccion</h1>
        <p className="mt-3 text-sm text-zinc-200">
          Este flujo no crea reservas, no bloquea calendario y no modifica pagos.
        </p>
        <p className="mt-2 text-xs text-zinc-400">
          Entorno LAB_ONLY. Esta pagina solo valida apertura del flujo Embedded Signup para
          coexistencia WhatsApp Business App + Cloud API.
        </p>

        <div className="mt-6 grid gap-3 rounded-lg border border-zinc-700 bg-zinc-950/60 p-4 text-sm">
          <p>
            <strong>SDK:</strong> {sdkReady ? 'listo' : 'pendiente'}
          </p>
          <p>
            <strong>Graph version:</strong> {META_GRAPH_VERSION}
          </p>
          <p>
            <strong>App ID:</strong> {appId ? 'configurado' : 'faltante'}
          </p>
          <p>
            <strong>Config ID:</strong> {configId ? 'configurado' : 'faltante'}
          </p>
          <p>
            <strong>status:</strong> {loginStatus}
          </p>
          <p>
            <strong>authResponse.code:</strong> {hasCode ? 'presente' : 'no presente'}
          </p>
          {sdkInitError ? (
            <p className="text-amber-300">
              <strong>sdk_error:</strong> {sdkInitError}
            </p>
          ) : null}
          {loginError ? (
            <p className="text-amber-300">
              <strong>login_error:</strong> {loginError}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleEmbeddedSignup}
          disabled={!sdkReady || !labReady}
          className="mt-6 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Iniciar Embedded Signup de WhatsApp
        </button>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">Eventos WA_EMBEDDED_SIGNUP (saneados)</h2>
          {events.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-300">Sin eventos recibidos aun.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {events.map((eventItem, index) => (
                <pre
                  key={`${eventItem.event ?? 'event'}-${index}`}
                  className="overflow-auto rounded-md border border-zinc-700 bg-zinc-950/70 p-3 text-xs text-zinc-100"
                >
                  {JSON.stringify(eventItem, null, 2)}
                </pre>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
