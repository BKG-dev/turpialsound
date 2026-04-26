'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShoppingBag,
  Tag,
  Users,
  Mic,
  Shield,
  Star,
  TrendingUp,
  CheckCircle2,
  MessageSquare,
  ChevronDown,
  Sparkles,
  Lock,
  BadgeCheck,
  UserCircle2,
  LogOut,
  ShieldAlert,
} from 'lucide-react'
import type { ModalFlow, ModalState, Listing, MarketplaceUser, MessageThread } from '@/types/marketplace'
import { MarketplaceModals } from '@/components/marketplace/MarketplaceModals'
import { MarketplaceCard } from '@/components/marketplace/MarketplaceCard'
import { TransactionChat } from '@/components/marketplace/TransactionChat'
import { MarketplaceAuthModal } from '@/components/marketplace/MarketplaceAuthModal'
import { CheckoutModal } from '@/components/marketplace/CheckoutModal'
import { getMpSession, logoutMpUser } from '@/actions/marketplace/auth'
import { getActiveListings, getOrCreateThread } from '@/actions/marketplace'
import { getUnreadCount } from '@/actions/marketplace/chat'
import { toggleFavorite, getMyFavoriteIds } from '@/actions/marketplace/favorites'
import type { MpSessionPayload } from '@/lib/marketplace/auth'
import Link from 'next/link'

// ─── Build a MessageThread from a listing + optional session ──────────────────
// Used when opening a real chat: we have the listing data but no pre-fetched thread.

function buildThreadFromListing(
  listing: Listing,
  session: MpSessionPayload | null,
  threadId: string | null,
): MessageThread {
  const seller: MarketplaceUser =
    listing.type === 'product' ? listing.seller : listing.talent

  const buyer: MarketplaceUser = session
    ? {
        id: session.userId,
        name: session.displayName,
        initials: session.displayName.slice(0, 2).toUpperCase(),
        role: 'buyer',
        verified: false,
        rating: 0,
        reviewCount: 0,
        joinedAt: '',
        location: '',
      }
    : {
        id: 'guest',
        name: 'Visitante',
        initials: 'VI',
        role: 'buyer',
        verified: false,
        rating: 0,
        reviewCount: 0,
        joinedAt: '',
        location: '',
      }

  const now = new Date().toISOString()
  return {
    id: threadId ?? `demo-${listing.id}`,
    listingId: listing.id,
    listing,
    participants: [buyer, seller],
    messages: [],
    createdAt: now,
    updatedAt: now,
  }
}

// ─── Hero Intent Cards ────────────────────────────────────────────────────────

const INTENT_CARDS = [
  {
    id: 'buy' as ModalFlow,
    icon: ShoppingBag,
    label: 'Quiero Comprar',
    sublabel: 'Equipos · Instrumentos · Consumibles',
    accent: 'cyan' as const,
    accentColor: '#00aeef',
    accentBg: 'rgba(0,174,239,0.07)',
    accentBorder: 'rgba(0,174,239,0.2)',
    accentGlow: 'rgba(0,174,239,0.12)',
  },
  {
    id: 'sell' as ModalFlow,
    icon: Tag,
    label: 'Quiero Vender',
    sublabel: 'Publica · Cotiza · Cobra con revision',
    accent: 'gold' as const,
    accentColor: '#ffc107',
    accentBg: 'rgba(255,193,7,0.06)',
    accentBorder: 'rgba(255,193,7,0.2)',
    accentGlow: 'rgba(255,193,7,0.1)',
  },
  {
    id: 'find-talent' as ModalFlow,
    icon: Users,
    label: 'Busco Talento',
    sublabel: 'Músicos · Técnicos · Productores',
    accent: 'cyan' as const,
    accentColor: '#00aeef',
    accentBg: 'rgba(0,174,239,0.07)',
    accentBorder: 'rgba(0,174,239,0.2)',
    accentGlow: 'rgba(0,174,239,0.12)',
  },
  {
    id: 'offer-talent' as ModalFlow,
    icon: Mic,
    label: 'Ofrezco mi Talento',
    sublabel: 'Crea tu perfil · Acepta proyectos',
    accent: 'gold' as const,
    accentColor: '#ffc107',
    accentBg: 'rgba(255,193,7,0.06)',
    accentBorder: 'rgba(255,193,7,0.2)',
    accentGlow: 'rgba(255,193,7,0.1)',
  },
]

// ─── Trust Stats ──────────────────────────────────────────────────────────────

const TRUST_STATS = [
  { label: 'Transacciones seguras', value: '2,400+', icon: Shield, color: '#00aeef' },
  { label: 'Talentos verificados', value: '180+', icon: BadgeCheck, color: '#ffc107' },
  { label: 'Calificación promedio', value: '4.9', icon: Star, color: '#4ade80' },
  { label: 'Comisión del vendedor', value: '5%', icon: TrendingUp, color: '#f97316' },
]

// ─── Tab filter ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'all', label: 'Todo' },
  { id: 'products', label: 'Productos' },
  { id: 'services', label: 'Servicios & Talento' },
]

const LISTINGS_LOAD_ERROR_MESSAGE = 'No pudimos cargar listados en este momento. Intenta de nuevo.'

// ─── Section heading helper ───────────────────────────────────────────────────

function SectionHeading({
  eyebrow,
  heading,
  sub,
  accentClass = 'text-gradient-cyan',
}: {
  eyebrow: string
  heading: React.ReactNode
  sub?: string
  accentClass?: string
}) {
  return (
    <div className="flex flex-col gap-3 mb-10">
      <div className="flex items-center gap-3">
        <span className="accent-line-animated" />
        <span className="text-[11px] uppercase tracking-[0.2em] text-[#5a5a5a]">{eyebrow}</span>
      </div>
      <h2 className={`text-2xl md:text-3xl font-semibold ${accentClass}`}>{heading}</h2>
      {sub && <p className="text-sm text-[#5a5a5a] max-w-xl">{sub}</p>}
    </div>
  )
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function MarketplacePageClient() {
  const router = useRouter()

  // Scroll restoration — ensure page always loads from the top.
  // Prevents focus hijacking from footer inputs or other elements.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
  }, [])

  // Modal state
  const [modalState, setModalState] = useState<ModalState>({
    flow: null,
    step: 'category',
  })
  const [direction, setDirection] = useState(1)

  // Chat state — tracks the listing being viewed + the real DB thread ID
  const [showChat, setShowChat] = useState(false)
  const [chatListing, setChatListing] = useState<Listing | null>(null)
  const [chatThreadId, setChatThreadId] = useState<string | null>(null)

  // Checkout state
  const [checkoutListing, setCheckoutListing] = useState<Listing | null>(null)

  // Tab
  const [activeTab, setActiveTab] = useState('all')

  // Auth
  const [session, setSession] = useState<MpSessionPayload | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login')
  const [unreadCount, setUnreadCount] = useState(0)
  // Flow requested while unauthenticated — open after login
  const [pendingFlow, setPendingFlow] = useState<ModalFlow | null>(null)

  // Favorites
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    getMpSession().then(setSession)
  }, [])

  // Poll unread count every 30s when logged in
  useEffect(() => {
    if (!session) { setUnreadCount(0); return }
    getUnreadCount().then(r => { if (r.success && r.data) setUnreadCount(r.data.count) })
    const id = setInterval(() => {
      getUnreadCount().then(r => { if (r.success && r.data) setUnreadCount(r.data.count) })
    }, 30_000)
    return () => clearInterval(id)
  }, [session])

  // Create a function to update unread count optimistically
  const updateUnreadCountOptimistically = useCallback((delta: number) => {
    if (session) {
      setUnreadCount(prev => Math.max(0, prev + delta))
    }
  }, [session])

  // Load favorite IDs when session is active
  useEffect(() => {
    if (!session) { setFavoritedIds(new Set()); return }
    getMyFavoriteIds().then(r => {
      if (r.success && r.data) setFavoritedIds(new Set(r.data))
    })
  }, [session])

  const handleToggleFavorite = useCallback(async (id: string) => {
    if (!session) { openAuth('login'); return }
    setFavoritedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
    await toggleFavorite(id)
  }, [session])

  function openAuth(tab: 'login' | 'register' = 'login') {
    setAuthTab(tab)
    setAuthOpen(true)
  }

  function handleAuthSuccess(s: MpSessionPayload) {
    setSession(s)
    setAuthOpen(false)
    // Open deferred flow after login
    if (pendingFlow) {
      setDirection(1)
      setModalState({ flow: pendingFlow, step: 'category' })
      setPendingFlow(null)
    }
  }

  async function handleLogout() {
    await logoutMpUser()
    setSession(null)
  }

  // Listings loaded from DB on mount (persisted across sessions)
  const [dbListings, setDbListings] = useState<Listing[]>([])
  const [listingsLoading, setListingsLoading] = useState(true)
  const [listingsError, setListingsError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const timeoutId = window.setTimeout(() => {
      if (!active) return
      setListingsLoading(false)
      setListingsError(LISTINGS_LOAD_ERROR_MESSAGE)
    }, 12_000)

    getActiveListings()
      .then(listings => {
        if (!active) return
        setDbListings(listings)
        setListingsError(null)
      })
      .catch(() => {
        if (!active) return
        setListingsError(LISTINGS_LOAD_ERROR_MESSAGE)
      })
      .finally(() => {
        if (!active) return
        window.clearTimeout(timeoutId)
        setListingsLoading(false)
      })

    return () => {
      active = false
      window.clearTimeout(timeoutId)
    }
  }, [])

  // Extra listings added by the user in this session (appear immediately, before DB refresh)
  const [extraListings, setExtraListings] = useState<Listing[]>([])

  const handleListingCreated = useCallback((listing: Listing) => {
    setExtraListings(prev => [listing, ...prev])
  }, [])

  // ── Modal handlers ──────────────────────────────────────────────────────────

  const openFlow = useCallback((flow: ModalFlow) => {
    // Sell / offer-talent require a session — prompt auth first
    if ((flow === 'sell' || flow === 'offer-talent') && !session) {
      setPendingFlow(flow)
      openAuth('register')
      return
    }
    setDirection(1)
    setModalState({ flow, step: 'category' })
  }, [session])

  const closeModal = useCallback(() => {
    setModalState({ flow: null, step: 'category' })
  }, [])

  // Opens the real chat for a specific listing.
  // Creates/finds a DB thread when the user is authenticated.
  const openChat = useCallback(async (listing: Listing) => {
    closeModal()
    setChatListing(listing)
    setChatThreadId(null)
    setShowChat(true)

    if (session) {
      const sellerId = listing.type === 'product' ? listing.seller.id : listing.talent.id
      getOrCreateThread(sellerId, listing.id)
        .then(r => {
          if (r.success && r.data) {
            setChatThreadId(r.data.threadId)
            // Reset unread count for this thread when opening it
            updateUnreadCountOptimistically(-1) // Approximate reduction
          }
        })
        .catch(() => {})
    }
  }, [session, closeModal, updateUnreadCountOptimistically])

  const openCheckout = useCallback((listing: Listing) => {
    if (!session) {
      setPendingFlow(null)
      openAuth('login')
      return
    }
    setCheckoutListing(listing)
  }, [session])

  const nextStep = useCallback((payload?: Partial<ModalState>) => {
    setDirection(1)
    setModalState(prev => ({ ...prev, ...payload }))
  }, [])

  const prevStep = useCallback(() => {
    setDirection(-1)
    setModalState(prev => {
      const backStep: Record<string, ModalState['step']> = {
        form: 'category',
        preview: 'form',
        success: 'preview',
        browse: 'category',
        detail: 'browse',
      }
      return { ...prev, step: backStep[prev.step] ?? 'category' }
    })
  }, [])

  // ── Listings filtered ───────────────────────────────────────────────────────

  const tabFilter = (l: Listing) =>
    activeTab === 'all' ||
    (activeTab === 'products' && l.type === 'product') ||
    (activeTab === 'services' && l.type === 'service')

  const filteredExtra = extraListings.filter(tabFilter)
  const filteredDb    = dbListings.filter(tabFilter)

  // Deduplicate: extraListings (same-session) take priority over dbListings
  const extraIds  = new Set(filteredExtra.map(l => l.id))
  const uniqueDb  = filteredDb.filter(l => !extraIds.has(l.id))

  const listings: Listing[] = [...filteredExtra, ...uniqueDb]

  return (
    <>
      {/* ── Auth Modal ─────────────────────────────────────────────────────── */}
      <MarketplaceAuthModal
        isOpen={authOpen}
        defaultTab={authTab}
        onClose={() => { setAuthOpen(false); setPendingFlow(null) }}
        onSuccess={handleAuthSuccess}
      />

      {/* ── Auth Bar ───────────────────────────────────────────────────────── */}
      <div className="w-full flex items-center justify-end px-6 py-2 gap-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.3)' }}>
        {session ? (
          <>
            {session.role === 'SUPER' && (
              <a
                href="/marketplace/admin"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                <ShieldAlert size={11} /> Admin
              </a>
            )}
            {/* Unread messages badge */}
            <Link
              href="/marketplace/dashboard?tab=messages"
              className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all hover:opacity-90"
              style={{
                background: unreadCount > 0 ? 'rgba(0,174,239,0.1)' : 'transparent',
                color: unreadCount > 0 ? '#00aeef' : 'rgba(255,255,255,0.35)',
                border: unreadCount > 0 ? '1px solid rgba(0,174,239,0.25)' : '1px solid transparent',
                boxShadow: unreadCount > 0 ? '0 0 12px rgba(0,174,239,0.2)' : 'none',
              }}
            >
              <MessageSquare size={12} />
              {unreadCount > 0 && (
                <span
                  className="font-bold tabular-nums"
                  style={{ textShadow: '0 0 8px rgba(0,174,239,0.8)' }}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>

            <div className="flex items-center gap-2">
              <UserCircle2 size={15} style={{ color: '#00aeef' }} />
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
                {session.displayName}
                {session.role === 'SUPER' ? (
                  <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded"
                    style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}>
                    Admin
                  </span>
                ) : session.role === 'SOCIO' ? (
                  <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded"
                    style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.25)' }}>
                    Socio
                  </span>
                ) : session.isSeller ? (
                  <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded"
                    style={{ background: 'rgba(255,193,7,0.15)', color: '#ffc107', border: '1px solid rgba(255,193,7,0.25)' }}>
                    Vendedor
                  </span>
                ) : null}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors hover:bg-white/5"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              <LogOut size={12} /> Salir
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => openAuth('login')}
              className="text-xs px-3 py-1 rounded-lg transition-colors hover:bg-white/5"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => openAuth('register')}
              className="text-xs px-3 py-1 rounded-lg font-medium transition-all"
              style={{ background: 'rgba(0,174,239,0.12)', color: '#00aeef', border: '1px solid rgba(0,174,239,0.25)' }}
            >
              Crear cuenta
            </button>
          </>
        )}
      </div>

      {/* ── Marketplace Modals ─────────────────────────────────────────────── */}
      <MarketplaceModals
        state={modalState}
        direction={direction}
        onClose={closeModal}
        onNext={nextStep}
        onBack={prevStep}
        onListingCreated={handleListingCreated}
        listings={[...extraListings, ...dbListings]}
        listingsLoading={listingsLoading}
        listingsError={listingsError}
        onOpenChat={openChat}
        onBuy={openCheckout}
        currentUserId={session?.userId}
      />

      {/* ── Checkout Modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {checkoutListing && (
          <CheckoutModal
            listing={checkoutListing}
            sellerId={
              checkoutListing.type === 'product'
                ? checkoutListing.seller.id
                : checkoutListing.talent.id
            }
            onClose={() => setCheckoutListing(null)}
            onOpenChat={listing => {
              setCheckoutListing(null)
              openChat(listing)
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Chat Demo Modal ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showChat && (
          <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
            <motion.div
              key="chat-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowChat(false)}
              className="absolute inset-0"
              style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
            />
            <motion.div
              key="chat-modal"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-50 w-full max-w-lg"
              style={{ height: '80vh', maxHeight: '680px' }}
            >
              <TransactionChat
                thread={
                  chatListing
                    ? buildThreadFromListing(chatListing, session, chatThreadId)
                    : undefined
                }
                threadId={chatThreadId ?? undefined}
                currentUserId={session?.userId}
                currentUserName={session?.displayName}
                currentUserInitials={
                  session ? session.displayName.slice(0, 2).toUpperCase() : undefined
                }
                onMessageSent={() => {
                  // Optimistically update unread count when sending a message
                  updateUnreadCountOptimistically(0) // No change for own messages
                }}
                onClose={() => {
                  setShowChat(false)
                  setChatListing(null)
                  setChatThreadId(null)
                }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="min-h-screen">

        {/* ═══════════════════════════════════════════════════════════════════
            HERO SECTION
        ═══════════════════════════════════════════════════════════════════ */}
        <section
          className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-24 pb-16 overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(0,50,120,0.08) 0%, transparent 60%)',
          }}
        >
          {/* Ambient orbs */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-[0.04]"
              style={{
                background: 'radial-gradient(circle, #00aeef 0%, transparent 70%)',
                filter: 'blur(60px)',
                animation: 'bgDrift 18s ease-in-out infinite',
              }}
            />
            <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full opacity-[0.03]"
              style={{
                background: 'radial-gradient(circle, #ffc107 0%, transparent 70%)',
                filter: 'blur(60px)',
                animation: 'bgDrift 24s ease-in-out infinite reverse',
              }}
            />
          </div>

          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-3 mb-8"
          >
            <span className="accent-line-animated" />
            <span className="text-[11px] uppercase tracking-[0.25em] text-[#5a5a5a]">
              Turpial Market Beta
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ background: 'rgba(0,174,239,0.1)', border: '1px solid rgba(0,174,239,0.2)', color: '#00aeef' }}>
              NUEVO
            </span>
          </motion.div>

          {/* Heading */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-center max-w-3xl mb-4"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold leading-tight">
              <span className="text-gradient-animated">El Marketplace</span>
              <br />
              <span className="text-[#f2f2f2]">Musical de Venezuela</span>
            </h1>
          </motion.div>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center text-sm text-[#5a5a5a] max-w-xl mb-12"
          >
            Compra, vende y contrata talento musical con pagos reportados y revisados manualmente.
            Instrumentos, equipos de audio, accesorios y servicios para la comunidad musical.
          </motion.p>

          {/* ── 4 Intent Cards ─────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-4xl"
          >
            {INTENT_CARDS.map((card, i) => {
              const Icon = card.icon
              return (
                <motion.button
                  key={card.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.35 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => openFlow(card.id)}
                  className="group relative flex flex-col items-center text-center gap-4 p-6 rounded-2xl transition-all duration-350 hover:-translate-y-2 active:scale-95 active:opacity-80"
                  style={{
                    background: card.accentBg,
                    border: `1px solid ${card.accentBorder}`,
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 20px 60px rgba(0,0,0,0.5), 0 0 40px ${card.accentGlow}`
                    ;(e.currentTarget as HTMLElement).style.borderColor = card.accentColor + '40'
                  }}
                  onMouseLeave={e => {
                    ;(e.currentTarget as HTMLElement).style.boxShadow = ''
                    ;(e.currentTarget as HTMLElement).style.borderColor = card.accentBorder
                  }}
                >
                  {/* Icon ring */}
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-350 group-hover:scale-110"
                    style={{
                      background: `linear-gradient(135deg, ${card.accentColor}20 0%, ${card.accentColor}08 100%)`,
                      border: `1px solid ${card.accentColor}25`,
                    }}
                  >
                    <Icon
                      size={24}
                      style={{ color: card.accentColor, filter: `drop-shadow(0 0 8px ${card.accentColor}40)` }}
                    />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-[#f2f2f2] mb-1 group-hover:text-white transition-colors">
                      {card.label}
                    </p>
                    <p className="text-[11px] text-[#5a5a5a] leading-relaxed">{card.sublabel}</p>
                  </div>

                  {/* Arrow indicator */}
                  <div
                    className="absolute bottom-4 right-4 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-250"
                    style={{ background: `${card.accentColor}15`, border: `1px solid ${card.accentColor}25` }}
                  >
                    <ChevronDown
                      size={12}
                      style={{ color: card.accentColor, transform: 'rotate(-90deg)' }}
                    />
                  </div>
                </motion.button>
              )
            })}
          </motion.div>

          {/* Trust chips */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="flex flex-wrap justify-center gap-3 mt-10"
          >
            {[
              { icon: Lock, text: 'Pago protegido' },
              { icon: Shield, text: 'Revision manual' },
              { icon: BadgeCheck, text: 'Talentos verificados' },
              { icon: CheckCircle2, text: 'Comision 5% al vendedor' },
            ].map(chip => (
              <div
                key={chip.text}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <chip.icon size={12} className="text-[#00aeef]" />
                <span className="text-xs text-[#5a5a5a]">{chip.text}</span>
              </div>
            ))}
          </motion.div>

          {/* Scroll hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.6 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          >
            <span className="text-[10px] text-[#2a2a2a] uppercase tracking-widest">Explorar</span>
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ChevronDown size={16} className="text-[#2a2a2a]" />
            </motion.div>
          </motion.div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            TRUST STATS BAR
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="border-y border-[#1e1e1e]" style={{ background: 'rgba(17,17,17,0.7)', backdropFilter: 'blur(12px)' }}>
          <div className="container-base py-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {TRUST_STATS.map(stat => {
                const Icon = stat.icon
                return (
                  <div key={stat.label} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${stat.color}12`, border: `1px solid ${stat.color}20` }}>
                      <Icon size={16} style={{ color: stat.color }} />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-[#f2f2f2]">{stat.value}</p>
                      <p className="text-[10px] text-[#5a5a5a]">{stat.label}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="section-padding-sm border-b border-[#1e1e1e]">
          <div className="container-base">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.8fr)] lg:items-start">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#5a5a5a]">
                  Marketplace musical en Venezuela
                </p>
                <h2 className="mt-3 text-2xl md:text-3xl font-semibold text-[#f2f2f2]">
                  Compra y vende instrumentos, equipos de audio y servicios musicales en Turpial Sound
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-[#8a8a8a]">
                  Turpial Market conecta a musicos, productores, estudios y vendedores con listados de instrumentos,
                  interfaces, microfonos, monitores, accesorios y talento musical. El flujo actual usa pagos
                  reportados por el comprador, revision manual del equipo y operacion protegida antes del cierre.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  {
                    title: 'Para compradores',
                    text: 'Explora productos y servicios, conversa con el vendedor y reporta el pago para revision.',
                  },
                  {
                    title: 'Para vendedores',
                    text: 'Publica equipos, accesorios o servicios y recibe pagos cuando la operacion queda lista.',
                  },
                  {
                    title: 'Servicios musicales',
                    text: 'Encuentra musicos, tecnicos, productores y perfiles de apoyo para proyectos de audio.',
                  },
                  {
                    title: 'Operacion protegida',
                    text: 'El equipo revisa pagos y estados antes de avanzar al cierre de la venta.',
                  },
                ].map(item => (
                  <div
                    key={item.title}
                    className="rounded-lg p-4"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    <h3 className="text-sm font-semibold text-[#f2f2f2]">{item.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-[#6f6f6f]">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            ACTIVE LISTINGS
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="section-padding">
          <div className="container-base">
            <SectionHeading
              eyebrow="Listados Activos"
              heading="Explora el Marketplace"
              sub="Productos y talentos verificados disponibles ahora mismo."
            />

            {/* Tab filter */}
            <div className="flex gap-1 mb-8 p-1 rounded-xl w-fit"
              style={{ background: 'rgba(17,17,17,0.8)', border: '1px solid #1e1e1e' }}>
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="px-4 py-2 rounded-lg text-xs transition-all duration-250"
                  style={activeTab === tab.id
                    ? {
                        background: 'rgba(0,174,239,0.12)',
                        border: '1px solid rgba(0,174,239,0.25)',
                        color: '#00aeef',
                      }
                    : {
                        background: 'transparent',
                        border: '1px solid transparent',
                        color: '#5a5a5a',
                      }
                  }
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Grid */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
              >
                {listingsLoading ? (
                  <div className="col-span-full flex flex-col items-center gap-3 py-20 text-center">
                    <p className="text-sm text-[#5a5a5a]">Cargando listados...</p>
                  </div>
                ) : listingsError ? (
                  <div className="col-span-full flex flex-col items-center gap-3 py-20 text-center">
                    <p className="text-sm text-[#5a5a5a]">{LISTINGS_LOAD_ERROR_MESSAGE}</p>
                  </div>
                ) : listings.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center gap-3 py-20 text-center">
                    <p className="text-sm text-[#5a5a5a]">No hay listados activos en este momento.</p>
                    <button
                      onClick={() => openFlow('sell')}
                      className="text-xs underline"
                      style={{ color: '#00aeef' }}
                    >
                      ¿Quieres publicar el primero?
                    </button>
                  </div>
                ) : listings.map((listing, i) => (
                  <motion.div
                    key={listing.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <MarketplaceCard
                      listing={listing}
                      onClick={() => router.push(`/marketplace/${listing.slug}`)}
                      isFavorited={favoritedIds.has(listing.id)}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            HOW IT WORKS — FLOW
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="section-padding border-t border-[#1e1e1e]"
          style={{ background: 'rgba(17,17,17,0.4)' }}>
          <div className="container-base">
            <SectionHeading
              eyebrow="Como funciona"
              heading="Seguro. Simple. Transparente."
              sub="Disenado para proteger al comprador y al vendedor durante revision, entrega y cierre."
              accentClass="text-gradient-gold"
            />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                {
                  step: '01',
                  icon: MessageSquare,
                  title: 'Explora y conversa',
                  desc: 'Encuentra productos o servicios y abre una conversacion directa con el vendedor.',
                  color: '#00aeef',
                },
                {
                  step: '02',
                  icon: Tag,
                  title: 'Acuerdo con el vendedor',
                  desc: 'Coordina detalles, precio y condiciones antes de reportar el pago.',
                  color: '#ffc107',
                },
                {
                  step: '03',
                  icon: Lock,
                  title: 'Pago reportado',
                  desc: 'El comprador reporta el pago y el equipo lo revisa manualmente antes de avanzar.',
                  color: '#00aeef',
                },
                {
                  step: '04',
                  icon: CheckCircle2,
                  title: 'Pago al vendedor',
                  desc: 'Cuando la operacion queda lista, el equipo procesa el pago al vendedor segun sus datos de cobro.',
                  color: '#4ade80',
                },
              ].map((item, i) => {
                const Icon = item.icon
                return (
                  <div key={item.step} className="relative">
                    {/* Connector */}
                    {i < 3 && (
                      <div className="hidden md:block absolute top-7 left-full w-full h-px z-0"
                        style={{ background: 'linear-gradient(90deg, #1e1e1e 0%, transparent 100%)', width: 'calc(100% - 2rem)' }} />
                    )}
                    <div className="relative z-10 flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{
                            background: `${item.color}12`,
                            border: `1px solid ${item.color}25`,
                          }}
                        >
                          <Icon size={20} style={{ color: item.color }} />
                        </div>
                        <span className="text-3xl font-semibold"
                          style={{ color: `${item.color}20`, letterSpacing: '-0.02em' }}>
                          {item.step}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-[#f2f2f2]">{item.title}</h3>
                      <p className="text-xs text-[#5a5a5a] leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            DEMO CHAT CTA
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="section-padding-sm border-t border-[#1e1e1e]">
          <div className="container-base">
            <div
              className="card-premium-wrapper rounded-2xl p-8 flex flex-col sm:flex-row items-center gap-6"
              style={{ background: 'rgba(17,17,17,0.8)' }}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={14} className="text-[#00aeef]" style={{ filter: 'drop-shadow(0 0 6px rgba(0,174,239,0.6))' }} />
                  <span className="text-[11px] uppercase tracking-widest text-[#5a5a5a]">Demo en vivo</span>
                </div>
                <h3 className="text-lg font-semibold text-[#f2f2f2] mb-2">
                  Ve el chat de compra en accion
                </h3>
                <p className="text-sm text-[#5a5a5a]">
                  Explora como se ve una conversacion real entre comprador y vendedor, con acuerdo, pago reportado y revision manual.
                </p>
              </div>
              <button
                onClick={() => {
                  const demo = listings[0]
                  if (demo) openChat(demo)
                }}
                disabled={listings.length === 0}
                className="btn-silky-primary px-8 py-3.5 rounded-xl text-sm font-semibold flex items-center gap-2 flex-shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <MessageSquare size={15} />
                Abrir Chat Demo
              </button>
            </div>
          </div>
        </section>

      </main>
    </>
  )
}
