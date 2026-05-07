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
  Lock,
  BadgeCheck,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import type { ModalFlow, ModalState, Listing, MarketplaceUser, MessageThread } from '@/types/marketplace'
import { MarketplaceModals } from '@/components/marketplace/MarketplaceModals'
import { MarketplaceCard } from '@/components/marketplace/MarketplaceCard'
import { TransactionChat } from '@/components/marketplace/TransactionChat'
import { useMarketplaceAssistantLauncher } from '@/components/marketplace/MarketplaceAssistantFab'
import { CheckoutModal } from '@/components/marketplace/CheckoutModal'
import { SmartMarketplaceAuthBar, useMarketplaceSession } from '@/components/marketplace/MarketplaceAuthBar'
import { TurpialWaveShader } from '@/components/marketplace/TurpialWaveShader'
import { getActiveListings, getOrCreateThread } from '@/actions/marketplace'
import { toggleFavorite, getMyFavoriteIds } from '@/actions/marketplace/favorites'
import { trackMarketplaceClientEvent } from '@/lib/marketplace/analytics-client'
import type { MpSessionPayload } from '@/lib/marketplace/auth'

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
    sublabel: 'Publica · Coordina · Cobra seguro',
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

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'Todas las categorias' },
  { value: 'instrumentos-nuevos', label: 'Instrumentos Nuevos' },
  { value: 'instrumentos-usados', label: 'Instrumentos Usados' },
  { value: 'audio-pro-estudio', label: 'Audio Pro & Estudio' },
  { value: 'consumibles', label: 'Consumibles' },
  { value: 'alquiler-equipos', label: 'Alquiler de Equipos' },
  { value: 'musicos-sesion', label: 'Musicos de Sesion' },
  { value: 'bandas-eventos', label: 'Bandas para Eventos' },
  { value: 'tecnicos-audio-iluminacion', label: 'Tecnicos Audio/Iluminacion' },
  { value: 'productores-arreglistas', label: 'Productores & Arreglistas' },
  { value: 'beats', label: 'Beats' },
  { value: 'mixing', label: 'Mixing' },
  { value: 'mastering', label: 'Mastering' },
  { value: 'vocals', label: 'Vocals' },
  { value: 'production', label: 'Produccion' },
  { value: 'arreglos', label: 'Arreglos' },
  { value: 'podcast', label: 'Podcast' },
]

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
        <span className="text-[11px] uppercase tracking-[0.2em] text-[#9a9a9a]">{eyebrow}</span>
      </div>
      <h2 className={`text-2xl md:text-3xl font-semibold ${accentClass}`}>{heading}</h2>
      {sub && <p className="text-sm text-[#b8b8b8] max-w-xl">{sub}</p>}
    </div>
  )
}

// ─── Page Component ───────────────────────────────────────────────────────────

type MarketplacePageClientProps = {
  initialListings: Listing[]
}

export default function MarketplacePageClient({ initialListings }: MarketplacePageClientProps) {
  const router = useRouter()
  const { openAssistant } = useMarketplaceAssistantLauncher()

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

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [hideUnavailable, setHideUnavailable] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  // Auth & Session from global context
  const {
    session,
    openLogin,
    openRegister,
    updateUnreadCount,
  } = useMarketplaceSession()

  // Flow requested while unauthenticated — open after login
  const [pendingFlow, setPendingFlow] = useState<ModalFlow | null>(null)

  // Favorites
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set())

  // Load favorite IDs when session is active
  useEffect(() => {
    if (!session) { setFavoritedIds(new Set()); return }
    getMyFavoriteIds().then(r => {
      if (r.success && r.data) setFavoritedIds(new Set(r.data))
    })
  }, [session])

  const handleToggleFavorite = useCallback(async (id: string) => {
    trackMarketplaceClientEvent({ eventType: 'favorite_click', listingId: id })
    if (!session) { openLogin(); return }
    setFavoritedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
    await toggleFavorite(id)
  }, [session, openLogin])

  const handleListingClick = useCallback((listing: Listing) => {
    trackMarketplaceClientEvent({ eventType: 'listing_click', listingId: listing.id })
    router.push(`/marketplace/${listing.slug}`)
  }, [router])

  // Watch for session changes to trigger pending flows
  useEffect(() => {
    if (session && pendingFlow) {
      setDirection(1)
      setModalState({ flow: pendingFlow, step: 'category' })
      setPendingFlow(null)
    }
  }, [session, pendingFlow])

  // Listings loaded from DB on mount (persisted across sessions)
  const [dbListings, setDbListings] = useState<Listing[]>(initialListings)
  const [listingsLoading, setListingsLoading] = useState(initialListings.length === 0)
  const [listingsError, setListingsError] = useState<string | null>(null)

  useEffect(() => {
    if (initialListings.length > 0) return

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
  }, [initialListings])

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
      openRegister()
      return
    }
    setDirection(1)
    setModalState({ flow, step: 'category' })
  }, [session, openRegister])

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
            updateUnreadCount(-1) // Approximate reduction
          }
        })
        .catch(() => {})
    }
  }, [session, closeModal, updateUnreadCount])

  const openCheckout = useCallback((listing: Listing) => {
    if (!session) {
      setPendingFlow(null)
      openLogin()
      return
    }
    setCheckoutListing(listing)
  }, [session, openLogin])

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

  const priceForListing = (l: Listing): number =>
    l.type === 'product' ? l.price : l.priceFrom

  const applyFilters = useCallback((l: Listing): boolean => {
    if (activeTab !== 'all') {
      if (activeTab === 'products' && l.type !== 'product') return false
      if (activeTab === 'services' && l.type !== 'service') return false
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      const haystack = [l.title, l.description, l.subcategory, ...l.tags].join(' ').toLowerCase()
      if (!haystack.includes(q)) return false
    }

    if (filterCategory !== 'all' && l.category !== filterCategory) return false

    const price = priceForListing(l)
    if (priceMin && price < Number(priceMin)) return false
    if (priceMax && price > Number(priceMax)) return false

    if (hideUnavailable) {
      const isAvailable = l.status === 'active' && !l.activeTransactionStatus
      if (!isAvailable) return false
    }

    return true
  }, [activeTab, searchQuery, filterCategory, priceMin, priceMax, hideUnavailable])

  const filteredExtra = extraListings.filter(applyFilters)
  const filteredDb    = dbListings.filter(applyFilters)

  // Deduplicate: extraListings (same-session) take priority over dbListings
  const extraIds  = new Set(filteredExtra.map(l => l.id))
  const uniqueDb  = filteredDb.filter(l => !extraIds.has(l.id))

  const listings: Listing[] = [...filteredExtra, ...uniqueDb]
  const hasDiscoveryFiltersActive =
    activeTab !== 'all' ||
    Boolean(searchQuery.trim()) ||
    filterCategory !== 'all' ||
    Boolean(priceMin) ||
    Boolean(priceMax) ||
    hideUnavailable

  const resetDiscoveryFilters = () => {
    setActiveTab('all')
    setSearchQuery('')
    setFilterCategory('all')
    setPriceMin('')
    setPriceMax('')
    setHideUnavailable(false)
  }

  const emptyStateMessage = hideUnavailable
    ? 'No hay listados disponibles con los filtros actuales. Estas ocultando publicaciones vendidas, no disponibles o en proceso.'
    : hasDiscoveryFiltersActive
      ? 'No hay resultados para la busqueda o filtros actuales.'
      : 'No hay listados publicados en este momento.'

  return (
    <>
      {/* ── Auth Bar ───────────────────────────────────────────────────────── */}
      <SmartMarketplaceAuthBar />

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
              style={{ background: 'var(--mp-overlay)', backdropFilter: 'blur(8px)' }}
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
                  // Message sent successfully
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

      <main className="min-h-screen overflow-x-hidden">
        <div className="flex flex-col">
          {/* ═══════════════════════════════════════════════════════════════════
              HERO SECTION
          ═══════════════════════════════════════════════════════════════════ */}
          <section
            className="relative flex min-h-[calc(100svh-2rem)] flex-col justify-between overflow-hidden px-4 pb-0 pt-3 lg:min-h-[calc(100svh-2rem)] lg:pt-4"
            style={{
              background: 'var(--mp-hero-bg)',
            }}
          >
          <TurpialWaveShader />
          {/* Ambient orbs */}
          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full opacity-[0.04]"
              style={{
                background: 'radial-gradient(circle, #00aeef 0%, transparent 70%)',
                filter: 'blur(60px)',
                animation: 'bgDrift 18s ease-in-out infinite',
              }}
            />
            <div className="absolute bottom-1/3 right-1/4 w-64 h-64 rounded-full opacity-[0.03]"
              style={{
                background: 'radial-gradient(circle, #ffc107 0%, transparent 70%)',
                filter: 'blur(60px)',
                animation: 'bgDrift 24s ease-in-out infinite reverse',
              }}
            />
          </div>

          <div className="relative z-10 flex w-full flex-col items-center flex-grow justify-center">
            {/* Eyebrow */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="mb-4 flex items-center gap-3"
            >
              <span className="accent-line-animated" />
              <span className="text-[10px] uppercase tracking-[0.25em] text-[#9a9a9a]">
                Turpial Market Beta
              </span>
            </motion.div>

            {/* Heading */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-center max-w-4xl mb-4"
            >
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-6xl font-semibold leading-[0.9] tracking-[-0.04em]">
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
              className="mb-6 max-w-xl text-center text-sm leading-relaxed text-[#b8b8b8] sm:text-base"
            >
              Compra, vende y contrata talento musical de forma segura.
            </motion.p>

            {/* ── 4 Intent Cards ─────────────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="mb-6 grid w-full max-w-5xl grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
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
                    className="group relative flex flex-col items-center gap-2 rounded-2xl p-4 text-center transition-all duration-350 hover:-translate-y-2 active:scale-95 active:opacity-80 sm:gap-3 sm:p-5 lg:p-5"
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
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-350 group-hover:scale-110 sm:h-12 sm:w-12 lg:h-14 lg:w-14"
                      style={{
                        background: `linear-gradient(135deg, ${card.accentColor}20 0%, ${card.accentColor}08 100%)`,
                        border: `1px solid ${card.accentColor}25`,
                      }}
                    >
                      <Icon
                        size={20}
                        style={{ color: card.accentColor, filter: `drop-shadow(0 0 8px ${card.accentColor}40)` }}
                      />
                    </div>
                    <div>
                      <p className="mb-0.5 text-[12px] font-semibold text-[#f2f2f2] transition-colors group-hover:text-white sm:text-[13px]">
                        {card.label}
                      </p>
                      <p className="text-[11px] leading-snug text-[#b8b8b8] sm:text-xs sm:leading-relaxed">{card.sublabel}</p>
                    </div>
                  </motion.button>
                )
              })}
            </motion.div>

            {/* Bottom Row: Trust chips & Explore hint */}
            <div className="flex w-full flex-col items-center gap-4">
              {/* Trust chips */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.6 }}
                className="flex flex-wrap justify-center gap-3"
              >
                {[
                  { icon: Lock, text: 'Pagos protegidos' },
                  { icon: BadgeCheck, text: 'Talentos verificados' },
                  { icon: CheckCircle2, text: 'Comisión del 5% al vendedor' },
                ].map(chip => (
                  <div
                    key={chip.text}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <chip.icon size={12} className="text-[#00aeef]" />
                    <span className="text-xs text-[#b8b8b8]">{chip.text}</span>
                  </div>
                ))}
              </motion.div>

              {/* Scroll hint */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 0.6 }}
                className="flex flex-col items-center gap-1"
              >
                <span className="text-[10px] text-[var(--mp-text-faint)] uppercase tracking-widest">Explorar</span>
                <motion.div
                  animate={{ y: [0, 6, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <ChevronDown size={16} className="text-[var(--mp-text-faint)]" />
                </motion.div>
              </motion.div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              TRUST STATS BAR
          ═══════════════════════════════════════════════════════════════════ */}
          <div className="border-t w-full" style={{ background: 'var(--mp-panel)', borderColor: 'var(--mp-border)', backdropFilter: 'blur(12px)' }}>
            <div className="container-base py-2">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {TRUST_STATS.map(stat => {
                  const Icon = stat.icon
                  return (
                    <div key={stat.label} className="flex items-center gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl"
                        style={{ background: `${stat.color}12`, border: `1px solid ${stat.color}20` }}>
                        <Icon size={16} style={{ color: stat.color }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#f2f2f2] sm:text-base">{stat.value}</p>
                        <p className="text-[10px] text-[#b8b8b8]">{stat.label}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>
        </div>

        <section className="section-padding-sm border-b" style={{ borderColor: 'var(--mp-border)' }}>
          <div className="container-base">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.8fr)] lg:items-start">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#9a9a9a]">
                  Marketplace musical en Venezuela
                </p>
                <h2 className="mt-3 text-2xl md:text-3xl font-semibold text-[#f2f2f2]">
                  Compra y vende instrumentos, equipos de audio y servicios musicales en Turpial Sound
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-[#8a8a8a]">
                  Turpial Market conecta a musicos, productores, estudios y vendedores con listados de instrumentos,
                  interfaces, microfonos, monitores, accesorios y talento musical. El flujo actual usa pagos
                  reportados por el comprador, revision del equipo y operacion protegida antes del cierre.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  {
                    title: 'Para compradores',
                    text: 'Explora productos y servicios, conversa con el vendedor y reporta el pago para revision del equipo.',
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
                    style={{ background: 'var(--mp-card-subtle)', border: '1px solid var(--mp-border)' }}
                  >
                    <h3 className="text-sm font-semibold text-[#f2f2f2]">{item.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-[#b8b8b8]">{item.text}</p>
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
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="flex gap-1 p-1 rounded-xl w-fit"
                style={{ background: 'var(--mp-panel)', border: '1px solid var(--mp-border)' }}>
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
                          color: '#9a9a9a',
                        }
                    }
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowFilters(p => !p)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-all"
                style={{
                  background: showFilters ? 'rgba(0,174,239,0.1)' : 'rgba(255,255,255,0.03)',
                  border: showFilters ? '1px solid rgba(0,174,239,0.25)' : '1px solid rgba(255,255,255,0.08)',
                  color: showFilters ? '#00aeef' : '#9a9a9a',
                }}
              >
                <SlidersHorizontal size={12} />
                Filtros
                {hasDiscoveryFiltersActive && (
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#00aeef' }} />
                )}
              </button>
              {hideUnavailable && (
                <button
                  onClick={() => setHideUnavailable(false)}
                  className="text-[10px] px-2 py-1 rounded-full transition-all"
                  style={{ background: 'rgba(74,222,128,0.08)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.18)' }}
                >
                  Solo disponibles · Mostrar todos
                </button>
              )}
            </div>

            {/* Filter panel */}
            {showFilters && (
              <div
                className="rounded-xl p-4 mb-4 space-y-3"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                {/* Search */}
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#5a5a5a' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Buscar por titulo, descripcion o etiquetas..."
                    className="w-full pl-8 pr-8 py-2 rounded-lg text-xs outline-none"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: '#f2f2f2',
                    }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      style={{ color: '#5a5a5a' }}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {/* Category */}
                  <select
                    value={filterCategory}
                    onChange={e => setFilterCategory(e.target.value)}
                    className="px-3 py-2 rounded-lg text-xs outline-none"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#f2f2f2' }}
                  >
                    {CATEGORY_OPTIONS.map(c => (
                      <option key={c.value} value={c.value} style={{ background: '#111', color: '#f2f2f2' }}>{c.label}</option>
                    ))}
                  </select>

                  {/* Price min */}
                  <input
                    type="number"
                    value={priceMin}
                    onChange={e => setPriceMin(e.target.value)}
                    placeholder="Precio minimo USD"
                    className="px-3 py-2 rounded-lg text-xs outline-none"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#f2f2f2' }}
                  />

                  {/* Price max */}
                  <input
                    type="number"
                    value={priceMax}
                    onChange={e => setPriceMax(e.target.value)}
                    placeholder="Precio maximo USD"
                    className="px-3 py-2 rounded-lg text-xs outline-none"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#f2f2f2' }}
                  />

                  {/* Availability toggle */}
                  <button
                    onClick={() => setHideUnavailable(p => !p)}
                    className="px-3 py-2 rounded-lg text-xs transition-all text-left"
                    style={{
                      background: hideUnavailable ? 'rgba(74,222,128,0.06)' : 'rgba(255,255,255,0.03)',
                      border: hideUnavailable ? '1px solid rgba(74,222,128,0.2)' : '1px solid rgba(255,255,255,0.08)',
                      color: hideUnavailable ? '#4ade80' : '#9a9a9a',
                    }}
                  >
                    {hideUnavailable ? 'Solo disponibles' : 'Ocultar no disponibles'}
                  </button>
                </div>

                {/* Active filters summary */}
                {hasDiscoveryFiltersActive && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px]" style={{ color: '#6a6a6a' }}>
                      {filteredDb.length + filteredExtra.length} resultado{filteredDb.length + filteredExtra.length !== 1 ? 's' : ''}
                    </span>
                    <button
                      onClick={resetDiscoveryFilters}
                      className="text-[10px] underline"
                      style={{ color: '#00aeef' }}
                    >
                      Limpiar filtros
                    </button>
                  </div>
                )}
              </div>
            )}

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
                    <p className="text-sm text-[#b8b8b8]">Cargando listados...</p>
                  </div>
                ) : listingsError ? (
                  <div className="col-span-full flex flex-col items-center gap-3 py-20 text-center">
                    <p className="text-sm text-[#b8b8b8]">{LISTINGS_LOAD_ERROR_MESSAGE}</p>
                  </div>
                ) : listings.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center gap-3 py-20 text-center">
                    <p className="text-sm text-[#b8b8b8]">
                      {emptyStateMessage}
                    </p>
                    {hasDiscoveryFiltersActive && (
                      <button
                        onClick={resetDiscoveryFilters}
                        className="text-xs underline"
                        style={{ color: '#00aeef' }}
                      >
                        {hideUnavailable ? 'Mostrar todos los listados' : 'Limpiar filtros'}
                      </button>
                    )}
                    {!hasDiscoveryFiltersActive && (
                      <button
                        onClick={() => openFlow('sell')}
                        className="text-xs underline"
                        style={{ color: '#00aeef' }}
                      >
                        ¿Quieres publicar el primero?
                      </button>
                    )}
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
                      onClick={() => handleListingClick(listing)}
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
        <section
          className="section-padding border-t"
          style={{ background: 'var(--mp-panel-soft)', borderColor: 'var(--mp-border)' }}
        >
          <div className="container-base">
            <SectionHeading
              eyebrow="Como funciona"
              heading="Seguro. Simple. Transparente."
              sub="Disenado para proteger al comprador y al vendedor durante revision, entrega y cierre."
              accentClass="text-gradient-gold"
            />

            <div className="grid grid-cols-1 gap-6 overflow-hidden md:grid-cols-4">
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
                  desc: 'El comprador reporta el pago y el equipo lo revisa antes de avanzar.',
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
                        style={{ background: 'var(--mp-line-gradient)', width: 'calc(100% - 2rem)' }} />
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
                      <p className="text-xs text-[#b8b8b8] leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            PUBLIC ASSISTANT
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="section-padding-sm border-t" style={{ borderColor: 'var(--mp-border)' }}>
          <div className="container-base">
            <div
              className="grid gap-6 rounded-2xl p-4 sm:p-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)] lg:items-stretch"
              style={{
                background: 'var(--mp-card)',
                border: '1px solid var(--mp-border)',
                boxShadow: 'var(--mp-card-shadow)',
              }}
            >
              <div className="flex flex-col justify-between gap-6">
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-xl"
                      style={{ background: 'rgba(0,174,239,0.12)', border: '1px solid rgba(0,174,239,0.24)' }}
                    >
                      <MessageSquare size={18} className="text-[#00aeef]" />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-widest" style={{ color: 'var(--mp-text-faint)' }}>
                        Asistente publico
                      </p>
                      <h3 className="text-lg font-semibold" style={{ color: 'var(--mp-text)' }}>
                        Pregunta como usar el marketplace
                      </h3>
                    </div>
                  </div>
                  <p className="max-w-xl text-sm leading-relaxed" style={{ color: 'var(--mp-text-muted)' }}>
                    Responde sobre compras, ventas, pago reportado, estados publicos, metodos visibles,
                    cobro del vendedor en terminos generales y disputas. No accede a cuentas, pagos reales
                    ni informacion privada.
                  </p>
                </div>

                <div className="grid gap-2">
                  <div
                    className="flex items-start gap-2 rounded-xl p-3"
                    style={{ background: 'var(--mp-card-subtle)', border: '1px solid var(--mp-border)' }}
                  >
                    <Shield size={16} className="mt-0.5 shrink-0 text-[#4ade80]" />
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--mp-text-muted)' }}>
                      Usa solo una base publica curada y rechaza datos internos, secretos, datos bancarios privados y detalles operativos sensibles.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={openAssistant}
                    className="w-fit rounded-full px-4 py-2 text-xs font-semibold transition hover:-translate-y-0.5"
                    style={{
                      background: 'rgba(0,174,239,0.14)',
                      border: '1px solid rgba(0,174,239,0.28)',
                      color: '#00aeef',
                    }}
                  >
                    Abrir Asistente Turpial
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={openAssistant}
                className="group flex min-h-[320px] flex-col justify-between rounded-2xl p-4 text-left transition hover:-translate-y-1"
                style={{ background: 'var(--mp-panel-solid)', border: '1px solid var(--mp-border)' }}
                aria-label="Abrir Asistente Turpial para preguntar sobre comprar o vender"
              >
                <div className="flex items-center justify-between gap-3 border-b pb-3" style={{ borderColor: 'var(--mp-border)' }}>
                  <div className="flex min-w-0 items-center gap-2">
                    <Star size={15} className="shrink-0 text-[#ffc107]" />
                    <p className="truncate text-sm font-semibold" style={{ color: 'var(--mp-text)' }}>
                      Turpial Marketplace Assistant
                    </p>
                  </div>
                  <span className="rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide" style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80' }}>
                    Publico
                  </span>
                </div>

                <div className="space-y-3 py-5">
                  <div
                    className="max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
                    style={{
                      background: 'var(--mp-card-subtle)',
                      color: 'var(--mp-text-muted)',
                      border: '1px solid var(--mp-border)',
                    }}
                  >
                    Hola. Puedo ayudarte con comprar, vender, reportar pagos, estados y disputas.
                  </div>
                  <div
                    className="ml-auto max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
                    style={{
                      background: 'rgba(0,174,239,0.16)',
                      color: 'var(--mp-text)',
                      border: '1px solid rgba(0,174,239,0.24)',
                    }}
                  >
                    Como compro en Turpial Market?
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t pt-3" style={{ borderColor: 'var(--mp-border)' }}>
                  <span className="text-xs" style={{ color: 'var(--mp-text-faint)' }}>
                    Toca para abrir el chat seguro
                  </span>
                  <span
                    className="rounded-xl px-3 py-2 text-xs font-semibold transition group-hover:scale-105"
                    style={{ background: '#00aeef', color: '#020617' }}
                  >
                    Preguntar
                  </span>
                </div>
              </button>
            </div>
          </div>
        </section>

      </main>
    </>
  )
}
