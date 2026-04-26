'use client'

import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, MessageCircle, ArrowLeft, KeyRound } from 'lucide-react'
import { registerMpUser, loginMpUser, requestPasswordReset } from '@/actions/marketplace/auth'
import type { MpSessionPayload } from '@/lib/marketplace/auth'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'login' | 'register' | 'forgot'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: (session: MpSessionPayload) => void
  defaultTab?: 'login' | 'register'
}

// ─── Animations ───────────────────────────────────────────────────────────────

const EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1]

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
}

const modalVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 12 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.28, ease: EXPO } },
  exit: { opacity: 0, scale: 0.97, y: 6, transition: { duration: 0.18 } },
}

// ─── Input ────────────────────────────────────────────────────────────────────

function Input({
  label,
  type,
  value,
  onChange,
  error,
  placeholder,
  rightSlot,
}: {
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  error?: string
  placeholder?: string
  rightSlot?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.55)' }}>
        {label}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all pr-10"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: error ? '1px solid rgba(239,68,68,0.6)' : '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = error ? 'rgba(239,68,68,0.8)' : 'rgba(0,174,239,0.5)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.1)'
          }}
        />
        {rightSlot && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">{rightSlot}</div>
        )}
      </div>
      {error && (
        <p className="text-xs flex items-center gap-1" style={{ color: 'rgba(239,68,68,0.9)' }}>
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  )
}

// ─── Register Form ────────────────────────────────────────────────────────────

function RegisterForm({ onSuccess }: { onSuccess: (s: MpSessionPayload) => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [whatsappConsent, setWhatsappConsent] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [globalError, setGlobalError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})
    setGlobalError('')

    startTransition(async () => {
      const result = await registerMpUser({
        displayName: name,
        email,
        password,
        phone: phone.trim() || undefined,
        whatsappConsent,
      })

      if (!result.success) {
        if (result.errors) {
          const flat: Record<string, string> = {}
          for (const [k, v] of Object.entries(result.errors)) {
            flat[k] = Array.isArray(v) ? v[0] : String(v)
          }
          setErrors(flat)
        } else {
          setGlobalError(result.message)
        }
        return
      }

      // Build session payload from returned data to avoid extra server round-trip
      onSuccess({
        userId: result.data.userId,
        email,
        displayName: result.data.displayName,
        isSeller: true,
        role: result.data.role,
      })
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Nombre para mostrar"
        type="text"
        value={name}
        onChange={setName}
        placeholder="Tu nombre artístico o real"
        error={errors['displayName']}
      />
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="tu@email.com"
        error={errors['email']}
      />
      <Input
        label="Contraseña"
        type={showPw ? 'text' : 'password'}
        value={password}
        onChange={setPassword}
        placeholder="Mínimo 8 caracteres"
        error={errors['password']}
        rightSlot={
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            style={{ color: 'rgba(255,255,255,0.35)' }}
          >
            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        }
      />

      <Input
        label="Teléfono (opcional)"
        type="tel"
        value={phone}
        onChange={setPhone}
        placeholder="+58 414 123 4567"
        error={errors['phone']}
      />

      {/* WhatsApp opt-in — low friction, high value */}
      <button
        type="button"
        onClick={() => setWhatsappConsent(v => !v)}
        className="flex items-start gap-3 p-3 rounded-xl text-left transition-all w-full"
        style={{
          background: whatsappConsent ? 'rgba(37,211,102,0.08)' : 'rgba(255,255,255,0.03)',
          border: whatsappConsent ? '1px solid rgba(37,211,102,0.3)' : '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div
          className="mt-0.5 w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
          style={{
            background: whatsappConsent ? 'rgba(37,211,102,0.9)' : 'rgba(255,255,255,0.08)',
            border: whatsappConsent ? 'none' : '1px solid rgba(255,255,255,0.2)',
          }}
        >
          {whatsappConsent && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <MessageCircle size={12} style={{ color: whatsappConsent ? '#25D366' : 'rgba(255,255,255,0.35)' }} />
            <span className="text-xs font-medium" style={{ color: whatsappConsent ? '#25D366' : 'rgba(255,255,255,0.6)' }}>
              Avísame en WhatsApp
            </span>
          </div>
          <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Recibe alertas cuando tu pago sea confirmado, tu producto avance de estado o tu cobro quede listo. Solo lo importante, sin spam.
          </p>
        </div>
      </button>

      {globalError && (
        <p className="text-xs flex items-center gap-1.5 px-3 py-2 rounded-lg"
          style={{ background: 'rgba(239,68,68,0.1)', color: 'rgba(239,68,68,0.9)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle size={12} /> {globalError}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all mt-1"
        style={{ background: 'rgba(0,174,239,0.9)', color: '#fff', opacity: isPending ? 0.7 : 1 }}
      >
        {isPending ? <Loader2 size={15} className="animate-spin" /> : null}
        {isPending ? 'Creando cuenta…' : 'Crear cuenta'}
      </button>
    </form>
  )
}

// ─── Forgot Password Form ─────────────────────────────────────────────────────

function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      const result = await requestPasswordReset(email)
      if (!result.success) {
        setError(result.message)
        return
      }
      setDone(true)
    })
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-3 py-6 text-center"
      >
        <CheckCircle2 size={40} style={{ color: '#00aeef', filter: 'drop-shadow(0 0 12px rgba(0,174,239,0.6))' }} />
        <p className="text-sm text-white font-medium">Enlace enviado</p>
        <p className="text-xs leading-relaxed max-w-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Si el email está registrado, recibirás un enlace de recuperación en los próximos minutos.
        </p>
        <button
          onClick={onBack}
          className="mt-2 flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70"
          style={{ color: 'rgba(0,174,239,0.7)' }}
        >
          <ArrowLeft size={12} /> Volver al inicio de sesión
        </button>
      </motion.div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
        Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña. El enlace expira en 1 hora.
      </p>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.55)' }}>Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="tu@email.com"
          className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: error ? '1px solid rgba(239,68,68,0.6)' : '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,174,239,0.5)')}
          onBlur={e => (e.currentTarget.style.borderColor = error ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.1)')}
        />
      </div>

      {error && (
        <p className="text-xs flex items-center gap-1.5 px-3 py-2 rounded-lg"
          style={{ background: 'rgba(239,68,68,0.1)', color: 'rgba(239,68,68,0.9)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle size={12} /> {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all mt-1"
        style={{ background: 'rgba(0,174,239,0.9)', color: '#fff', opacity: isPending ? 0.7 : 1 }}
      >
        {isPending ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
        {isPending ? 'Enviando…' : 'Enviar enlace de recuperación'}
      </button>

      <button
        type="button"
        onClick={onBack}
        className="flex items-center justify-center gap-1.5 text-xs transition-opacity hover:opacity-70"
        style={{ color: 'rgba(255,255,255,0.35)' }}
      >
        <ArrowLeft size={12} /> Volver
      </button>
    </form>
  )
}

// ─── Login Form ───────────────────────────────────────────────────────────────

function LoginForm({ onSuccess, onForgot }: { onSuccess: (s: MpSessionPayload) => void; onForgot: () => void }) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [globalError, setGlobalError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})
    setGlobalError('')

    startTransition(async () => {
      const result = await loginMpUser({ identifier, password })

      if (!result.success) {
        if (result.errors) {
          const flat: Record<string, string> = {}
          for (const [k, v] of Object.entries(result.errors)) {
            flat[k] = Array.isArray(v) ? v[0] : String(v)
          }
          setErrors(flat)
        } else {
          setGlobalError(result.message)
        }
        return
      }

      onSuccess({
        userId: result.data.userId,
        email: result.data.email,
        displayName: result.data.displayName,
        isSeller: false, // will be refreshed from cookie on next nav
        role: result.data.role,
      })
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Email o usuario"
        type="text"
        value={identifier}
        onChange={setIdentifier}
        placeholder="tu@email.com o nombre de usuario"
        error={errors['identifier']}
      />
      <Input
        label="Contraseña"
        type={showPw ? 'text' : 'password'}
        value={password}
        onChange={setPassword}
        placeholder="Tu contraseña"
        error={errors['password']}
        rightSlot={
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            style={{ color: 'rgba(255,255,255,0.35)' }}
          >
            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        }
      />

      {globalError && (
        <p className="text-xs flex items-center gap-1.5 px-3 py-2 rounded-lg"
          style={{ background: 'rgba(239,68,68,0.1)', color: 'rgba(239,68,68,0.9)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle size={12} /> {globalError}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all mt-1"
        style={{ background: 'rgba(0,174,239,0.9)', color: '#fff', opacity: isPending ? 0.7 : 1 }}
      >
        {isPending ? <Loader2 size={15} className="animate-spin" /> : null}
        {isPending ? 'Iniciando sesión…' : 'Iniciar sesión'}
      </button>

      <button
        type="button"
        onClick={onForgot}
        className="text-xs text-center transition-opacity hover:opacity-80"
        style={{ color: 'rgba(0,174,239,0.55)' }}
      >
        ¿Olvidaste tu contraseña?
      </button>
    </form>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

const HEADER_TITLE: Record<Tab, string> = {
  login: 'Iniciar sesión',
  register: 'Crear cuenta',
  forgot: 'Recuperar contraseña',
}

export function MarketplaceAuthModal({ isOpen, onClose, onSuccess, defaultTab = 'login' }: Props) {
  const [tab, setTab] = useState<Tab>(defaultTab)
  const [done, setDone] = useState(false)
  const [doneMsg, setDoneMsg] = useState('')

  function handleSuccess(session: MpSessionPayload) {
    const msg = tab === 'register' ? `¡Cuenta creada! Bienvenido, ${session.displayName}` : `Bienvenido, ${session.displayName}`
    setDoneMsg(msg)
    setDone(true)
    onSuccess(session)
    setTimeout(() => {
      setDone(false)
      setDoneMsg('')
      onClose()
    }, 1600)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="overlay"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              key="modal"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full max-w-sm rounded-2xl overflow-hidden"
              style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div>
                  <h2 className="text-base font-semibold text-white">
                    {done ? 'Listo' : HEADER_TITLE[tab]}
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Turpial Sound Marketplace
                  </p>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg transition-colors hover:bg-white/5">
                  <X size={16} style={{ color: 'rgba(255,255,255,0.4)' }} />
                </button>
              </div>

              <div className="p-5">
                {done ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-3 py-6 text-center"
                  >
                    <CheckCircle2 size={40} style={{ color: '#00aeef', filter: 'drop-shadow(0 0 16px rgba(0,174,239,0.6))' }} />
                    <p className="text-sm text-white">{doneMsg}</p>
                  </motion.div>
                ) : (
                  <>
                    {/* Tab switcher — only shown for login/register */}
                    {tab !== 'forgot' && (
                      <div className="flex gap-1 p-1 rounded-xl mb-5"
                        style={{ background: 'rgba(255,255,255,0.04)' }}>
                        {(['login', 'register'] as const).map((t) => (
                          <button
                            key={t}
                            onClick={() => setTab(t)}
                            className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                            style={{
                              background: tab === t ? 'rgba(0,174,239,0.15)' : 'transparent',
                              color: tab === t ? '#00aeef' : 'rgba(255,255,255,0.4)',
                              border: tab === t ? '1px solid rgba(0,174,239,0.3)' : '1px solid transparent',
                            }}
                          >
                            {t === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
                          </button>
                        ))}
                      </div>
                    )}

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={tab}
                        initial={{ opacity: 0, x: tab === 'forgot' ? 0 : tab === 'login' ? -12 : 12 }}
                        animate={{ opacity: 1, x: 0, transition: { duration: 0.2, ease: EXPO } }}
                        exit={{ opacity: 0 }}
                      >
                        {tab === 'login' ? (
                          <LoginForm onSuccess={handleSuccess} onForgot={() => setTab('forgot')} />
                        ) : tab === 'register' ? (
                          <RegisterForm onSuccess={handleSuccess} />
                        ) : (
                          <ForgotPasswordForm onBack={() => setTab('login')} />
                        )}
                      </motion.div>
                    </AnimatePresence>

                    {/* Footer link — only for login/register */}
                    {tab !== 'forgot' && (
                      <p className="text-center text-xs mt-4" style={{ color: 'rgba(255,255,255,0.25)' }}>
                        {tab === 'login' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
                        <button
                          onClick={() => setTab(tab === 'login' ? 'register' : 'login')}
                          className="underline"
                          style={{ color: 'rgba(0,174,239,0.7)' }}
                        >
                          {tab === 'login' ? 'Crear cuenta' : 'Iniciar sesión'}
                        </button>
                      </p>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
