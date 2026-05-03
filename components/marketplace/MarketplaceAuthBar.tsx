'use client'

import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import Image from 'next/image'
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
import { getMpSession, logoutMpUser } from '@/actions/marketplace/auth'
import { getUnreadCount } from '@/actions/marketplace/chat'
import { MarketplaceAuthModal } from '@/components/marketplace/MarketplaceAuthModal'
import type { MpSessionPayload } from '@/lib/marketplace/auth'

type MarketplaceSessionContextType = {
  session: MpSessionPayload | null
  isSessionLoading: boolean
  unreadCount: number
  authOpen: boolean
  authTab: 'login' | 'register'
  openLogin: () => void
  openRegister: () => void
  closeAuth: () => void
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
  updateUnreadCount: (delta: number) => void
}

const MarketplaceSessionContext = createContext<MarketplaceSessionContextType | null>(null)

export function MarketplaceSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<MpSessionPayload | null>(null)
  const [isSessionLoading, setIsSessionLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [authOpen, setAuthOpen] = useState(false)
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login')

  const fetchSession = useCallback(async () => {
    try {
      const s = await getMpSession()
      setSession(s)
    } catch (e) {
      setSession(null)
    } finally {
      setIsSessionLoading(false)
    }
  }, [])

  const fetchUnread = useCallback(async () => {
    if (!session) return
    const r = await getUnreadCount()
    if (r.success && r.data) setUnreadCount(r.data.count)
  }, [session])

  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  useEffect(() => {
    if (!session) { setUnreadCount(0); return }
    fetchUnread()
    const id = setInterval(fetchUnread, 30_000)
    return () => clearInterval(id)
  }, [session, fetchUnread])

  const logout = async () => {
    await logoutMpUser()
    setSession(null)
    setUnreadCount(0)
  }

  const openLogin = () => { setAuthTab('login'); setAuthOpen(true) }
  const openRegister = () => { setAuthTab('register'); setAuthOpen(true) }
  const closeAuth = () => setAuthOpen(false)

  const updateUnreadCount = (delta: number) => {
    setUnreadCount(prev => Math.max(0, prev + delta))
  }

  return (
    <MarketplaceSessionContext.Provider
      value={{
        session,
        isSessionLoading,
        unreadCount,
        authOpen,
        authTab,
        openLogin,
        openRegister,
        closeAuth,
        logout,
        refreshSession: fetchSession,
        updateUnreadCount,
      }}
    >
      {children}
      <MarketplaceAuthModal
        isOpen={authOpen}
        defaultTab={authTab}
        onClose={closeAuth}
        onSuccess={(s) => {
          setSession(s)
          setAuthOpen(false)
        }}
      />
    </MarketplaceSessionContext.Provider>
  )
}

export function useMarketplaceSession() {
  const context = useContext(MarketplaceSessionContext)
  if (!context) {
    throw new Error('useMarketplaceSession must be used within a MarketplaceSessionProvider')
  }
  return context
}

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

export function SmartMarketplaceAuthBar({
  variant = 'marketplace',
  onMessagesClick,
}: {
  variant?: 'marketplace' | 'dashboard'
  onMessagesClick?: () => void
}) {
  const {
    session,
    isSessionLoading,
    unreadCount,
    logout,
    openLogin,
    openRegister,
  } = useMarketplaceSession()

  return (
    <MarketplaceAuthBar
      session={session}
      isSessionLoading={isSessionLoading}
      unreadCount={unreadCount}
      variant={variant}
      onLogout={logout}
      onLogin={openLogin}
      onRegister={openRegister}
      onMessagesClick={onMessagesClick}
    />
  )
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
        background: 'linear-gradient(135deg, rgba(8, 18, 24, 0.42), rgba(10, 10, 10, 0.34))',
        backdropFilter: 'blur(18px) saturate(155%)',
        boxShadow: '0 6px 22px rgba(0,0,0,0.22)',
      }}
    >
      <div className="mx-auto flex min-h-[34px] w-full flex-wrap items-center justify-between px-4 py-0 sm:px-6 lg:min-h-[32px] lg:flex-nowrap lg:gap-x-3">
        <div className="mp-authbar-left-rail flex items-center min-w-0 overflow-hidden">
          <div className="flex shrink-0 items-center gap-2.5">
            {isDashboard ? (
              <div className="flex items-center gap-2.5">
                <Link
                  href="/"
                  aria-label="Ir al home de Turpial Sound"
                  title="Turpial Sound"
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-transform hover:scale-105"
                  style={{
                    borderColor: 'rgba(0,174,239,0.32)',
                    background: '#f8fafc',
                    boxShadow: '0 0 10px rgba(0,174,239,0.18)',
                  }}
                >
                  <Image
                    src="/images/logo-navbar.png"
                    alt=""
                    width={18}
                    height={18}
                    className="h-[18px] w-[18px] object-contain"
                  />
                </Link>
                <Link
                  href="/marketplace"
                  className="group flex h-6 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-[10px] leading-none transition-all hover:bg-white/5"
                  style={{ borderColor: 'var(--mp-border)', color: 'var(--mp-text-muted)' }}
                >
                  <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Marketplace</span>
                </Link>
                <div className="min-w-0 border-l pl-3" style={{ borderColor: 'var(--mp-border)' }}>
                  <p className="truncate text-[9px] font-black uppercase tracking-[0.2em] text-[#00aeef]">
                    Market Command Center
                  </p>
                  <p className="truncate text-xs font-bold text-white">{isAdmin ? 'Panel Admin' : 'Mi Panel'}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <div
                  className="hidden h-2.5 w-2.5 shrink-0 rounded-full bg-[#4ade80] sm:block"
                  style={{ boxShadow: '0 0 10px #4ade80' }}
                />
                <Link
                  href="/"
                  aria-label="Ir al home de Turpial Sound"
                  title="Turpial Sound"
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-transform hover:scale-105"
                  style={{
                    borderColor: 'rgba(0,174,239,0.32)',
                    background: '#f8fafc',
                    boxShadow: '0 0 10px rgba(0,174,239,0.18)',
                  }}
                >
                  <Image
                    src="/images/logo-navbar.png"
                    alt=""
                    width={18}
                    height={18}
                    className="h-[18px] w-[18px] object-contain"
                  />
                </Link>
                <Link href="/marketplace" className="group min-w-0 block">
                  <h2 className="truncate text-[11px] font-black uppercase tracking-[0.25em] text-[#00aeef] transition-colors group-hover:text-[#00aeef]/80">
                    Turpial Market
                  </h2>
                  <p className="hidden truncate text-[9px] font-semibold sm:block" style={{ color: 'var(--mp-text-faint)' }}>
                    Marketplace musical protegido
                  </p>
                </Link>
              </div>
            )}
          </div>

          <div className="mp-authbar-ticker-slot ml-4 min-w-0 overflow-hidden lg:ml-6">
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
                  className="flex h-6 shrink-0 items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 text-[10px] font-black uppercase tracking-widest text-red-500 transition-all hover:bg-red-500/20"
                >
                  <ShieldAlert size={12} />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              )}

              {onMessagesClick ? (
                <button
                  type="button"
                  onClick={onMessagesClick}
                  className="mp-authbar-blue-pill relative flex h-6 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-[10px] font-bold leading-none transition-all hover:bg-white/5"
                  style={{
                    background: unreadCount > 0 ? 'rgba(0,174,239,0.1)' : 'transparent',
                    color: unreadCount > 0 ? '#00aeef' : 'var(--mp-text-muted)',
                    borderColor: unreadCount > 0 ? 'rgba(0,174,239,0.3)' : 'var(--mp-border)',
                  }}
                  aria-label={messageLabel}
                >
                  <MessageSquare size={12} />
                  {unreadCount > 0 && <span className="tabular-nums">{unreadCount > 99 ? '99+' : unreadCount}</span>}
                  <span className="hidden xl:inline">Mensajes</span>
                </button>
              ) : (
                <Link
                  href="/marketplace/dashboard?tab=messages&focus=unread"
                  className="mp-authbar-blue-pill relative flex h-6 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-[10px] font-bold leading-none transition-all hover:bg-white/5"
                  style={{
                    background: unreadCount > 0 ? 'rgba(0,174,239,0.1)' : 'transparent',
                    color: unreadCount > 0 ? '#00aeef' : 'var(--mp-text-muted)',
                    borderColor: unreadCount > 0 ? 'rgba(0,174,239,0.3)' : 'var(--mp-border)',
                  }}
                  aria-label={messageLabel}
                >
                  <MessageSquare size={12} />
                  {unreadCount > 0 && <span className="tabular-nums">{unreadCount > 99 ? '99+' : unreadCount}</span>}
                  <span className="hidden xl:inline">Mensajes</span>
                </Link>
              )}

              <div
                className="hidden h-6 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-[10px] md:flex"
                style={{ background: roleStyle.bg, borderColor: roleStyle.border, color: roleStyle.text }}
              >
                <UserCircle2 size={12} />
                <span className="max-w-[110px] truncate font-black uppercase tracking-tight">
                  {session.displayName}
                </span>
                <span className="text-[8px] font-bold uppercase opacity-70">{roleLabel}</span>
              </div>

              {!isDashboard && (
                <Link
                  href="/marketplace/dashboard"
                  className="mp-authbar-blue-pill flex h-6 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-[#00aeef]/20"
                >
                  <LayoutDashboard size={12} />
                  <span className="hidden sm:inline">Mi Panel</span>
                </Link>
              )}

              <MarketplaceThemeToggle compact className="mp-authbar-theme-toggle h-6 shrink-0" />

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex h-6 shrink-0 items-center justify-center gap-1 rounded-lg border px-2 text-[10px] font-bold uppercase tracking-widest transition-all hover:bg-black/5"
                  style={{
                    borderColor: 'var(--mp-border)',
                    color: 'var(--mp-text-faint)',
                  }}
                  title="Salir"
                  aria-label="Salir"
                >
                  <LogOut size={12} />
                  <span className="hidden 2xl:inline">Salir</span>
                </button>
              )}
            </>
          ) : onLogin || onRegister ? (
            <div className="flex items-center gap-2">
              <MarketplaceThemeToggle compact className="mp-authbar-theme-toggle h-6 shrink-0" />
              {onLogin && (
                <button
                  type="button"
                  onClick={onLogin}
                  className="mp-authbar-login-pill h-6 rounded-lg border px-3 text-[10px] font-bold uppercase tracking-widest transition-colors hover:bg-white/5"
                  style={{
                    borderColor: 'var(--mp-border)',
                    background: 'rgba(255,255,255,0.04)',
                    color: 'var(--mp-text-strong)',
                  }}
                >
                  Entrar
                </button>
              )}

              {onRegister && (
                <button
                  type="button"
                  onClick={onRegister}
                  className="btn-silky-primary mp-authbar-register-pill h-6 rounded-lg px-4 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                >
                  Unirse
                </button>
              )}
            </div>
          ) : (
            <div className="h-6 w-20 shrink-0 animate-pulse rounded-lg bg-black/5" aria-hidden="true" />
          )}
        </div>
      </div>
    </div>
  )
}
