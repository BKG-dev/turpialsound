'use client'

import { useState, useTransition, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, ShieldCheck, ArrowLeft } from 'lucide-react'
import { resetPassword } from '@/actions/marketplace/auth'
import Link from 'next/link'

// ─── Inner component (uses useSearchParams — must be inside Suspense) ─────────

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (!token) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <AlertCircle size={36} style={{ color: '#ef4444', filter: 'drop-shadow(0 0 8px rgba(239,68,68,0.5))' }} />
        <p className="text-sm text-[#f2f2f2] font-medium">Enlace inválido</p>
        <p className="text-xs text-[#5a5a5a]">El enlace de recuperación está roto o falta el token.</p>
        <Link href="/marketplace" className="mt-2 text-xs text-[#00aeef] underline">Volver al Marketplace</Link>
      </div>
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    startTransition(async () => {
      const result = await resetPassword(token, password)
      if (!result.success) {
        setError(result.message)
        return
      }
      setDone(true)
      setTimeout(() => router.push('/marketplace'), 3000)
    })
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4 py-8 text-center"
      >
        <CheckCircle2 size={44} style={{ color: '#00aeef', filter: 'drop-shadow(0 0 16px rgba(0,174,239,0.7))' }} />
        <p className="text-base font-semibold text-[#f2f2f2]">¡Contraseña actualizada!</p>
        <p className="text-xs text-[#5a5a5a]">Redirigiendo al Marketplace en 3 segundos…</p>
      </motion.div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Password */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.55)' }}>
          Nueva contraseña
        </label>
        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all pr-10"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,174,239,0.5)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
          />
          <button
            type="button"
            onClick={() => setShowPw(v => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2"
            style={{ color: 'rgba(255,255,255,0.35)' }}
          >
            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      {/* Confirm */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.55)' }}>
          Confirmar contraseña
        </label>
        <input
          type={showPw ? 'text' : 'password'}
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder="Repite tu nueva contraseña"
          className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,174,239,0.5)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
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
        {isPending ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
        {isPending ? 'Guardando…' : 'Guardar nueva contraseña'}
      </button>

      <p className="text-center text-xs mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
        <Link href="/marketplace" className="flex items-center justify-center gap-1 hover:opacity-70 transition-opacity">
          <ArrowLeft size={11} /> Volver al Marketplace
        </Link>
      </p>
    </form>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ResetPasswordPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at top, rgba(0,20,40,0.6) 0%, #0a0a0a 60%)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.3 } }}
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Header */}
        <div
          className="px-5 pt-5 pb-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <h2 className="text-base font-semibold text-white">Restablecer contraseña</h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Turpial Sound Marketplace
          </p>
        </div>

        <div className="p-5">
          <Suspense fallback={
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin text-[#00aeef]" />
            </div>
          }>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </motion.div>
    </div>
  )
}
