'use client'

import Link from 'next/link'
import {
  ArrowLeft,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  ShieldAlert,
  UserCircle2,
} from 'lucide-react'
import { MarketplaceThemeToggle } from '@/components/marketplace/MarketplaceTheme'
import { useBcvRate } from '@/lib/hooks/useBcvRate'

type MarketplaceAuthBarSession = {
  displayName: string
  role: string
}

type MarketplaceAuthBarProps = {
  session: MarketplaceAuthBarSession | null
  unreadCount: number
  isSessionLoading?: boolean
  variant?: 'marketplace' | 'dashboard'
  onLogout?: () => void
  onLogin?: () => void
  onRegister?: () => void
  onMessagesClick?: () => void
}

function formatBcvNumber(value: number) {
  return value.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatBcvDate(value?: string) {
  if (!value) return 'por confirmar'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'por confirmar'
  return date.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatBcvTime(value?: string) {
  if (!value) return 'por confirmar'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'por confirmar'
  return date.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })
}

function BcvTicker() {
  const { rate, loading, asOf, isFallback } = useBcvRate()
  const tickerText = loading
    ? 'BCV: consultando tasa de referencia'
    : Number.isFinite(rate)
      ? `BCV: Bs. ${formatBcvNumber(rate)} - Fecha valor: ${formatBcvDate(asOf)} - Actualizado: ${formatBcvTime(asOf)}${isFallback ? ' - referencia temporal' : ''}`
      : 'BCV: tasa no disponible en este momento'

  return (
    <div className="mp-bcv-ticker" role="status" aria-label={tickerText}>
      <div className="mp-bcv-ticker__track">
        <span>{tickerText}</span>
        <span aria-hidden="true">{tickerText}</span>
      </div>
    </div>
  )
}

function getRoleLabel(role?: string) {
  if (role === 'SUPER' || role === 'admin') return 'Admin'
  if (role === 'SOCIO') return 'Socio'
  return 'Miembro'
}

function getRoleBadgeStyle(role?: string) {
  if (role === 'SUPER' || role === 'admin') {
    return { bg: 'rgba(239,68,68,0.1)', text: '#ef4444', border: 'rgba(239,68,68,0.2)' }
  }
  if (role === 'SOCIO') {
    return { bg: 'rgba(168,85,247,0.1)', text: '#a855f7', border: 'rgba(168,85,247,0.2)' }
  }
  return { bg: 'rgba(0,174,239,0.1)', text: '#00aeef', border: 'rgba(0,174,239,0.2)' }
}

export function MarketplaceAuthBar({
  session,
  unreadCount,
  isSessionLoading = false,
  variant = 'marketplace',
  onLogout,
  onLogin,
  onRegister,
  onMessagesClick,
}: MarketplaceAuthBarProps) {
  const isDashboard = variant === 'dashboard'
  const roleLabel = getRoleLabel(session?.role)
  const isAdmin = session?.role === 'SUPER' || session?.role === 'admin'
  const roleStyle = getRoleBadgeStyle(session?.role)
  const messageLabel = unreadCount > 0 ? `${unreadCount > 99 ? '99+' : unreadCount} sin leer` : 'Mensajes'



  return (
    <div
      className="mp-market-authbar sticky top-0 z-[70] w-full border-b"
      style={{
        borderColor: 'var(--mp-border)',
        background: 'var(--mp-panel-solid)',
        backdropFilter: 'blur(24px)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
      }}
    >
      <div className="mx-auto flex min-h-[92px] w-full flex-wrap items-center justify-between px-4 py-2 sm:px-6 lg:min-h-[60px] lg:flex-nowrap lg:gap-x-4">
        <div className="flex flex-1 items-center min-w-0 overflow-hidden">
          <div className="flex shrink-0 items-center gap-3">
            {isDashboard ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/marketplace"
                  className="group flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 transition-all hover:bg-white/5"
                  style={{ borderColor: 'var(--mp-border)', color: 'var(--mp-text-muted)' }}
                >
                  <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Marketplace</span>
                </Link>
                <div className="min-w-0 border-l pl-3" style={{ borderColor: 'var(--mp-border)' }}>
                  <p className="truncate text-[9px] font-black uppercase tracking-[0.2em] text-[#00aeef]">
                    Market Command Center
                  </p>
                  <p className="truncate text-xs font-bold text-white">Mi Panel</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div
                  className="hidden h-2.5 w-2.5 shrink-0 rounded-full bg-[#4ade80] sm:block"
                  style={{ boxShadow: '0 0 10px #4ade80' }}
                />
                <div className="min-w-0">
                  <h2 className="truncate text-[11px] font-black uppercase tracking-[0.25em] text-[#00aeef]">
                    Turpial Market
                  </h2>
                  <p className="hidden truncate text-[9px] font-semibold text-[#111827] sm:block">
  Marketplace musical protegido
</p>
                </div>
              </div>
            )}
          </div>

          <div className="ml-4 flex-1 min-w-0 overflow-hidden lg:ml-6">
            <BcvTicker />
          </div>
        </div>

        <div className="flex flex-none shrink-0 flex-nowrap items-center justify-end gap-1.5 sm:gap-2 whitespace-nowrap pl-4">
          {isSessionLoading ? (
            <div className="flex items-center gap-2">
              <div className="h-8 w-16 animate-pulse rounded-lg bg-white/5" />
              <div className="h-8 w-20 animate-pulse rounded-lg bg-white/5" />
            </div>
          ) : session ? (
            <>
              {isAdmin && (
                <Link
                  href="/marketplace/admin"
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-black uppercase tracking-widest text-red-500 transition-all hover:bg-red-500/20"
                >
                  <ShieldAlert size={12} />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              )}

              {onMessagesClick ? (
                <button
                  type="button"
                  onClick={onMessagesClick}
                  className="relative flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-all hover:bg-white/5"
                  style={{
                    background: unreadCount > 0 ? 'rgba(0,174,239,0.1)' : 'transparent',
                    color: unreadCount > 0 ? '#00aeef' : 'var(--mp-text-muted)',
                    borderColor: unreadCount > 0 ? 'rgba(0,174,239,0.3)' : 'var(--mp-border)',
                  }}
                  aria-label={messageLabel}
                >
                  <MessageSquare size={14} />
                  {unreadCount > 0 && <span className="tabular-nums">{unreadCount > 99 ? '99+' : unreadCount}</span>}
                  <span className="hidden xl:inline">Mensajes</span>
                </button>
              ) : (
                <Link
                  href="/marketplace/dashboard?tab=messages"
                  className="relative flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-all hover:bg-white/5"
                  style={{
                    background: unreadCount > 0 ? 'rgba(0,174,239,0.1)' : 'transparent',
                    color: unreadCount > 0 ? '#00aeef' : 'var(--mp-text-muted)',
                    borderColor: unreadCount > 0 ? 'rgba(0,174,239,0.3)' : 'var(--mp-border)',
                  }}
                  aria-label={messageLabel}
                >
                  <MessageSquare size={14} />
                  {unreadCount > 0 && <span className="tabular-nums">{unreadCount > 99 ? '99+' : unreadCount}</span>}
                  <span className="hidden xl:inline">Mensajes</span>
                </Link>
              )}

              <div
                className="hidden shrink-0 items-center gap-2 rounded-lg border px-2.5 py-1.5 md:flex"
                style={{ background: roleStyle.bg, borderColor: roleStyle.border, color: roleStyle.text }}
              >
                <UserCircle2 size={14} />
                <div className="flex flex-col leading-none">
                  <span className="max-w-[100px] truncate text-xs font-black uppercase tracking-tight">
                    {session.displayName}
                  </span>
                  <span className="text-[8px] font-bold opacity-70 uppercase">{roleLabel}</span>
                </div>
              </div>

              {!isDashboard && (
                <Link
                  href="/marketplace/dashboard"
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[#00aeef]/30 bg-[#00aeef]/10 px-2.5 py-1.5 text-xs font-black uppercase tracking-widest text-[#00aeef] transition-all hover:bg-[#00aeef]/20"
                >
                  <LayoutDashboard size={14} />
                  <span className="hidden sm:inline">Mi Panel</span>
                </Link>
              )}

              <MarketplaceThemeToggle compact className="shrink-0" />

              {onLogout && (
                <button
  type="button"
  onClick={onLogout}
  className="flex shrink-0 items-center justify-center gap-1 rounded-lg border border-white/10 px-2 py-1.5 text-xs font-bold uppercase tracking-widest text-[#111827]/60 transition-all hover:bg-black/5 hover:text-[#111827]"
  title="Salir"
  aria-label="Salir"
>
  <LogOut size={14} />
  <span className="hidden 2xl:inline">Salir</span>
</button>
              )}
            </>
         ) : onLogin || onRegister ? (
  <div className="flex items-center gap-2">
    {onLogin && (
      <button
        type="button"
        onClick={onLogin}
        className="rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-[#111827]/70 transition-colors hover:text-[#111827]"
      >
        Entrar
      </button>
    )}

    {onRegister && (
      <button
        type="button"
        onClick={onRegister}
        className="rounded-lg bg-[#00aeef] px-4 py-1.5 text-xs font-black uppercase tracking-widest text-[#020617] transition-all hover:brightness-110 active:scale-95"
      >
        Unirse
      </button>
    )}
  </div>
) : (
  <div className="h-8 w-20 shrink-0 animate-pulse rounded-lg bg-black/5" aria-hidden="true" />
)}
        </div>
      </div>
    </div>
  )
}
