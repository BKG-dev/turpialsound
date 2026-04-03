'use client'

import { useState, useCallback } from 'react'
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
} from 'lucide-react'
import type { ModalFlow, ModalState } from '@/types/marketplace'
import { MarketplaceModals } from '@/components/marketplace/MarketplaceModals'
import { MarketplaceCard } from '@/components/marketplace/MarketplaceCard'
import { TransactionChat } from '@/components/marketplace/TransactionChat'
import { MOCK_PRODUCT_LISTINGS, MOCK_SERVICE_LISTINGS, MOCK_THREAD } from '@/content/marketplace'

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
    sublabel: 'Publica · Cotiza · Cobra seguro',
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

export default function MarketplacePage() {
  // Modal state
  const [modalState, setModalState] = useState<ModalState>({
    flow: null,
    step: 'category',
  })
  const [direction, setDirection] = useState(1)

  // Chat demo state
  const [showChat, setShowChat] = useState(false)

  // Tab
  const [activeTab, setActiveTab] = useState('all')

  // ── Modal handlers ──────────────────────────────────────────────────────────

  const openFlow = useCallback((flow: ModalFlow) => {
    setDirection(1)
    setModalState({ flow, step: 'category' })
  }, [])

  const closeModal = useCallback(() => {
    setModalState({ flow: null, step: 'category' })
  }, [])

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

  const listings =
    activeTab === 'products'
      ? MOCK_PRODUCT_LISTINGS
      : activeTab === 'services'
      ? MOCK_SERVICE_LISTINGS
      : [...MOCK_PRODUCT_LISTINGS, ...MOCK_SERVICE_LISTINGS]

  return (
    <>
      {/* ── Marketplace Modals ─────────────────────────────────────────────── */}
      <MarketplaceModals
        state={modalState}
        direction={direction}
        onClose={closeModal}
        onNext={nextStep}
        onBack={prevStep}
      />

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
                thread={MOCK_THREAD}
                onClose={() => setShowChat(false)}
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
            Compra, vende y contrata talento musical con pagos fiduciarios protegidos.
            Matchmaking inteligente, escrow integrado, cero riesgo.
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
                  className="group relative flex flex-col items-center text-center gap-4 p-6 rounded-2xl transition-all duration-350 hover:-translate-y-2"
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
              { icon: Lock, text: 'Pago Escrow' },
              { icon: Shield, text: 'Sin riesgo' },
              { icon: BadgeCheck, text: 'Talentos verificados' },
              { icon: CheckCircle2, text: 'Comisión 5% al vendedor' },
            ].map(chip => (
              <div
                key={chip.text}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <chip.icon size={11} className="text-[#00aeef]" />
                <span className="text-[11px] text-[#5a5a5a]">{chip.text}</span>
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
                {listings.map((listing, i) => (
                  <motion.div
                    key={listing.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <MarketplaceCard
                      listing={listing}
                      onClick={() => setShowChat(true)}
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
              eyebrow="Cómo funciona"
              heading="Seguro. Simple. Transparente."
              sub="Diseñado para proteger tanto al comprador como al vendedor en cada transacción."
              accentClass="text-gradient-gold"
            />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                {
                  step: '01',
                  icon: MessageSquare,
                  title: 'Match & Chat',
                  desc: 'Encuentra lo que buscas y abre un hilo de conversación directo y seguro.',
                  color: '#00aeef',
                },
                {
                  step: '02',
                  icon: Tag,
                  title: 'Cotización Formal',
                  desc: 'El vendedor envía una cotización oficial dentro del chat protegido.',
                  color: '#ffc107',
                },
                {
                  step: '03',
                  icon: Lock,
                  title: 'Pago en Escrow',
                  desc: 'Tu pago queda retenido de forma segura hasta confirmar la entrega.',
                  color: '#00aeef',
                },
                {
                  step: '04',
                  icon: CheckCircle2,
                  title: 'Liberación de Fondos',
                  desc: 'Al confirmar, el vendedor recibe su dinero menos el 5% de comisión.',
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
                  Ve el Chat Fiduciario en acción
                </h3>
                <p className="text-sm text-[#5a5a5a]">
                  Explora cómo se ve una conversación real entre comprador y vendedor, con la cotización formal y el botón de pago fiduciario integrados.
                </p>
              </div>
              <button
                onClick={() => setShowChat(true)}
                className="btn-silky-primary px-8 py-3.5 rounded-xl text-sm font-semibold flex items-center gap-2 flex-shrink-0"
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
