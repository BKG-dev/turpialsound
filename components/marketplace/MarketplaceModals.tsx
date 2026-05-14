'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Users,
  Mic,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Music,
  Guitar,
  Layers,
  Package,
  Headphones,
  SlidersHorizontal,
  Radio,
  Star,
  Upload,
  Loader2,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  Send,
} from 'lucide-react'
import type {
  ModalState,
  ModalFlow,
  ProductCategory,
  ServiceCategory,
  Listing,
  MarketplaceUser,
  ProductCondition,
} from '@/types/marketplace'
import { PRODUCT_CATEGORIES, SERVICE_CATEGORIES } from '@/content/marketplace'
import { createListing } from '@/actions/marketplace'
import { MarketplaceCard } from '@/components/marketplace/MarketplaceCard'
import type { MpCategory } from '@/lib/validations/marketplace'
import { getListingQuestions, askQuestion, answerQuestion } from '@/actions/marketplace/questions'
import type { QuestionItem } from '@/actions/marketplace/questions'
import {
  prepareMarketplaceUpload,
  revokeMarketplaceUploadPreview,
  uploadMarketplaceFile,
  type PreparedMarketplaceUpload,
} from '@/lib/marketplace/media-client'

// ─── Image resize util ────────────────────────────────────────────────────────
// Converts a File to a base64 JPEG data URL, scaled to max 800px on the longest side.
// Data URLs persist in DB and render everywhere — no CDN required.

// ─── Icon map ─────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ReactNode> = {
  Music: <Music size={20} />,
  Guitar: <Guitar size={20} />,
  Mic2: <Mic size={20} />,
  Layers: <Layers size={20} />,
  Package: <Package size={20} />,
  Headphones: <Headphones size={20} />,
  Users: <Users size={20} />,
  SlidersHorizontal: <SlidersHorizontal size={20} />,
  Radio: <Radio size={20} />,
}

// ─── Overlay ──────────────────────────────────────────────────────────────────

function ModalOverlay({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      key="overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onClose}
      className="fixed inset-0 z-[80]"
      style={{ background: 'var(--mp-overlay)', backdropFilter: 'blur(8px)' }}
    />
  )
}

const EXPO_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

const modalVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 16 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.3, ease: EXPO_EASE } },
  exit: { opacity: 0, scale: 0.97, y: 8, transition: { duration: 0.2 } },
}

const stepVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 32 : -32 }),
  center: { opacity: 1, x: 0, transition: { duration: 0.28, ease: EXPO_EASE } },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -32 : 32, transition: { duration: 0.18 } }),
}

// ─── Modal Shell ──────────────────────────────────────────────────────────────

function ModalShell({
  children,
  onClose,
  title,
  subtitle,
  accent = 'cyan',
  onBack,
  step,
  totalSteps,
}: {
  children: React.ReactNode
  onClose: () => void
  title: string
  subtitle?: string
  accent?: 'cyan' | 'gold'
  onBack?: () => void
  step?: number
  totalSteps?: number
}) {
  const accentColor = accent === 'cyan' ? '#00aeef' : '#ffc107'
  const accentBg = accent === 'cyan' ? 'rgba(0,174,239,0.08)' : 'rgba(255,193,7,0.08)'

  return (
    <motion.div
      key="shell"
      variants={modalVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="relative z-[90] w-full max-w-6xl mx-auto"
      style={{ maxHeight: '90vh' }}
    >
      <div
        className="card-premium-wrapper rounded-2xl flex flex-col overflow-hidden"
        style={{
          background: 'var(--mp-panel-solid)',
          border: '1px solid var(--mp-border)',
          boxShadow: `var(--mp-shadow), 0 0 120px ${accent === 'cyan' ? 'rgba(0,174,239,0.08)' : 'rgba(255,193,7,0.06)'}`,
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-6 py-4 flex-shrink-0 border-b"
          style={{ background: accentBg, borderColor: 'var(--mp-border)' }}
        >
          {onBack && (
            <button onClick={onBack} className="text-[#5a5a5a] hover:text-[#f2f2f2] transition-colors -ml-1">
              <ChevronLeft size={18} />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-[#f2f2f2] truncate" style={{ letterSpacing: '0.03em' }}>
              {title}
            </h2>
            {subtitle && <p className="text-[11px] text-[#b8b8b8] mt-0.5">{subtitle}</p>}
          </div>
          {step !== undefined && totalSteps && (
            <div className="flex items-center gap-1 mr-2 flex-shrink-0">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === step ? '16px' : '6px',
                    height: '6px',
                    background: i <= step ? accentColor : 'var(--mp-input-border)',
                  }}
                />
              ))}
            </div>
          )}
          <button onClick={onClose} className="text-[#5a5a5a] hover:text-[#f2f2f2] transition-colors flex-shrink-0">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-none">{children}</div>
      </div>
    </motion.div>
  )
}

// ─── Category Grid ────────────────────────────────────────────────────────────

function CategoryGrid<T extends ProductCategory | ServiceCategory>({
  categories,
  onSelect,
}: {
  categories: Array<{ id: T; label: string; description: string; icon: string; accent: 'gold' | 'cyan'; listingCount?: number }>
  onSelect: (id: T) => void
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 p-6">
      {categories.map(cat => {
        const accentColor = cat.accent === 'cyan' ? '#00aeef' : '#ffc107'
        const accentBg = cat.accent === 'cyan' ? 'rgba(0,174,239,0.06)' : 'rgba(255,193,7,0.05)'
        const accentBorder = cat.accent === 'cyan' ? 'rgba(0,174,239,0.18)' : 'rgba(255,193,7,0.18)'
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className="group rounded-xl p-4 text-left transition-all duration-250 hover:-translate-y-1"
            style={{ background: accentBg, border: `1px solid ${accentBorder}` }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px rgba(0,0,0,0.4), 0 0 24px ${accentColor}18` }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '' }}
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${accentColor}15`, color: accentColor }}>
                {ICON_MAP[cat.icon] ?? <Music size={20} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-[#f2f2f2] group-hover:text-white transition-colors">{cat.label}</p>
                  {cat.listingCount && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{ background: `${accentColor}15`, color: accentColor }}>
                      {cat.listingCount}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#b8b8b8] mt-0.5 leading-relaxed">{cat.description}</p>
              </div>
              <ChevronRight size={14} className="text-[#5a5a5a] group-hover:text-[#a0a0a0] transition-colors flex-shrink-0 mt-1" />
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ─── Success Screen ───────────────────────────────────────────────────────────

function SuccessScreen({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center gap-6">
      <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 14 }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)' }}>
          <CheckCircle2 size={32} className="text-[#4ade80]"
            style={{ filter: 'drop-shadow(0 0 12px rgba(74,222,128,0.5))' }} />
        </div>
      </motion.div>
      <div>
        <p className="text-lg font-semibold text-[#f2f2f2] mb-2">{message}</p>
        <p className="text-sm text-[#b8b8b8]">El equipo de Turpial Market revisará tu publicación en menos de 24 horas.</p>
      </div>
      <button onClick={onClose} className="btn-silky-primary px-8 py-3 rounded-xl text-sm font-semibold">
        Explorar el Marketplace
      </button>
    </div>
  )
}

// ─── Field error + input style helpers ───────────────────────────────────────

function FieldError({ errors, field }: { errors?: Record<string, string[]>; field: string }) {
  const msg = errors?.[field]?.[0]
  if (!msg) return null
  return (
    <p className="text-[11px] text-red-400 flex items-center gap-1 mt-1">
      <AlertCircle size={10} className="flex-shrink-0" />
      {msg}
    </p>
  )
}

function fieldInputStyle(field: string, fieldErrors?: Record<string, string[]>) {
  const hasError = !!fieldErrors?.[field]?.length
  return {
    background: 'var(--mp-input)',
    border: `1px solid ${hasError ? 'rgba(239,68,68,0.5)' : 'var(--mp-input-border)'}`,
  }
}

// ─── LISTING Q&A SECTION ─────────────────────────────────────────────────────

function ListingQASection({
  listingId,
  sellerId,
  currentUserId,
}: {
  listingId: string
  sellerId?: string
  currentUserId?: string
}) {
  const [expanded, setExpanded] = useState(true)
  const [questions, setQuestions] = useState<QuestionItem[]>([])
  const [loading, setLoading] = useState(false)
  const [newQ, setNewQ] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const [replyStates, setReplyStates] = useState<Record<string, { text: string; submitting: boolean }>>({})

  const isSeller = !!currentUserId && !!sellerId && currentUserId === sellerId

  useEffect(() => {
    if (questions.length > 0) return
    setLoading(true)
    getListingQuestions(listingId)
      .then(res => { if (res.success) setQuestions(res.data) })
      .finally(() => setLoading(false))
  }, [listingId, questions.length])

  async function handleAsk() {
    const trimmed = newQ.trim()
    if (!trimmed || submitting) return
    setSubmitting(true)
    setFeedback(null)
    const res = await askQuestion(listingId, trimmed)
    if (res.success) {
      setNewQ('')
      const refresh = await getListingQuestions(listingId)
      if (refresh.success) setQuestions(refresh.data)
      setFeedback({ ok: true, msg: res.message })
    } else {
      setFeedback({ ok: false, msg: res.message })
    }
    setSubmitting(false)
  }

  async function handleAnswer(questionId: string) {
    const state = replyStates[questionId]
    if (!state?.text?.trim() || state.submitting) return
    setReplyStates(prev => ({ ...prev, [questionId]: { ...prev[questionId], submitting: true } }))
    const res = await answerQuestion(questionId, state.text.trim())
    if (res.success) {
      const refresh = await getListingQuestions(listingId)
      if (refresh.success) setQuestions(refresh.data)
      setReplyStates(prev => { const next = { ...prev }; delete next[questionId]; return next })
    } else {
      setReplyStates(prev => ({ ...prev, [questionId]: { ...prev[questionId], submitting: false } }))
    }
  }

  return (
    <div className="mt-2 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(0,174,239,0.12)' }}>
      {/* Toggle header */}
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left transition-colors"
        style={{ background: expanded ? 'rgba(0,174,239,0.06)' : 'rgba(0,174,239,0.03)' }}
      >
        <HelpCircle size={13} className="text-[#00aeef] flex-shrink-0" />
        <span className="text-[11px] font-semibold text-[#00aeef] tracking-wide uppercase flex-1">
          Preguntas y Respuestas
          {questions.length > 0 && (
            <span className="ml-2 text-[9px] text-[#b8b8b8] font-normal normal-case">
              ({questions.length})
            </span>
          )}
        </span>
        {isSeller && questions.filter(q => !q.answer).length > 0 && (
          <span
            className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold mr-1"
            style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}
          >
            {questions.filter(q => !q.answer).length} sin responder
          </span>
        )}
        <ChevronDown
          size={13}
          className="text-[#9a9a9a] transition-transform duration-200"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {/* Body */}
      {expanded && (
        <div className="px-4 py-3 space-y-3" style={{ background: 'var(--mp-card-subtle)' }}>
          {loading && (
            <div className="flex items-center gap-2 py-2">
              <Loader2 size={12} className="animate-spin text-[#5a5a5a]" />
              <span className="text-[11px] text-[#b8b8b8]">Cargando preguntas...</span>
            </div>
          )}
          {!loading && questions.length === 0 && (
            <p className="py-1 text-[11px] italic text-[#9a9a9a]">Sin preguntas aún. ¡Sé el primero en preguntar!</p>
          )}
          {questions.map(q => (
            <div key={q.id} className="space-y-1.5">
              <div className="flex items-start gap-2">
                <HelpCircle size={11} className="text-[#00aeef] mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm leading-relaxed text-[#f2f2f2]">{q.question}</p>
                  <p className="mt-1 text-[10px] text-[#9a9a9a]">{q.asker.displayName}</p>
                </div>
              </div>
              {q.answer ? (
                <div
                  className="ml-0 rounded-xl px-3 py-3 sm:ml-5"
                  style={{ background: 'rgba(0,174,239,0.08)', border: '1px solid rgba(0,174,239,0.18)' }}
                >
                  <p className="text-[10px] font-semibold text-[#00aeef] mb-0.5 uppercase tracking-wide">
                    Vendedor
                  </p>
                  <p className="text-sm leading-relaxed text-[#e6e6e6]">{q.answer}</p>
                </div>
              ) : isSeller ? (
                // Seller reply form for unanswered questions
                <div
                  className="ml-0 space-y-2 rounded-xl px-3 py-3 sm:ml-5"
                  style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.22)' }}
                >
                  <p className="text-[10px] font-semibold text-[#f59e0b] uppercase tracking-wide">
                    Tu respuesta
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <textarea
                      id={`modal-listing-answer-${q.id}`}
                      name={`modal-listing-answer-${q.id}`}
                      value={replyStates[q.id]?.text ?? ''}
                      onChange={e => setReplyStates(prev => ({
                        ...prev,
                        [q.id]: { text: e.target.value, submitting: false },
                      }))}
                      placeholder="Escribe tu respuesta..."
                      rows={2}
                      className="min-h-[88px] flex-1 resize-y rounded-lg px-3 py-2 text-sm text-[#f2f2f2] outline-none placeholder:text-[var(--mp-text-faint)] sm:min-h-[52px]"
                      style={{ background: 'var(--mp-input)', border: '1px solid rgba(245,158,11,0.28)' }}
                      maxLength={1000}
                      disabled={replyStates[q.id]?.submitting}
                    />
                    <button
                      onClick={() => handleAnswer(q.id)}
                      disabled={!replyStates[q.id]?.text?.trim() || replyStates[q.id]?.submitting}
                      aria-label="Enviar respuesta"
                      className="flex h-10 w-full flex-shrink-0 items-center justify-center rounded-lg transition-all duration-200 disabled:opacity-40 sm:h-8 sm:w-8"
                      style={{
                        background: replyStates[q.id]?.text?.trim() && !replyStates[q.id]?.submitting
                          ? 'linear-gradient(135deg, rgba(245,158,11,0.9) 0%, rgba(234,179,8,0.8) 100%)'
                          : 'rgba(30,30,30,0.8)',
                        border: replyStates[q.id]?.text?.trim() ? 'none' : '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      {replyStates[q.id]?.submitting
                        ? <Loader2 size={12} className="animate-spin text-[#5a5a5a]" />
                        : <Send size={12} className={replyStates[q.id]?.text?.trim() ? 'text-white' : 'text-[#5a5a5a]'} />
                      }
                    </button>
                  </div>
                </div>
              ) : (
                <p className="ml-0 text-[11px] italic text-[#9a9a9a] sm:ml-5">Pendiente de respuesta</p>
              )}
            </div>
          ))}

          {/* Ask form — only for non-sellers */}
          {!isSeller && (
            <div
              className="mt-2 space-y-2 rounded-xl p-3"
              style={{ background: 'rgba(0,174,239,0.05)', border: '1px solid rgba(0,174,239,0.16)' }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#d4d4d4]">
                Hacer una pregunta
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <textarea
                  id={`modal-listing-question-${listingId}`}
                  name={`modal-listing-question-${listingId}`}
                  value={newQ}
                  onChange={e => setNewQ(e.target.value)}
                  placeholder="¿Qué quieres saber sobre este producto?"
                  rows={2}
                  className="min-h-[88px] flex-1 resize-y rounded-lg px-3 py-2.5 text-sm text-[#f2f2f2] outline-none placeholder:text-[var(--mp-text-faint)] sm:min-h-[52px]"
                  style={{ background: 'var(--mp-input)', border: '1px solid var(--mp-input-border)' }}
                  maxLength={500}
                  disabled={submitting}
                />
                <button
                  onClick={handleAsk}
                  disabled={!newQ.trim() || submitting}
                  aria-label="Enviar pregunta"
                  className="flex h-10 w-full flex-shrink-0 items-center justify-center rounded-lg transition-all duration-200 disabled:opacity-40 sm:h-8 sm:w-8"
                  style={{
                    background: newQ.trim() && !submitting
                      ? 'linear-gradient(135deg, #00aeef 0%, #0050c8 100%)'
                      : 'rgba(30,30,30,0.8)',
                    border: newQ.trim() && !submitting ? 'none' : '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {submitting
                    ? <Loader2 size={12} className="animate-spin text-[#5a5a5a]" />
                    : <Send size={12} className={newQ.trim() ? 'text-white' : 'text-[#5a5a5a]'} />
                  }
                </button>
              </div>
              {feedback && (
                <p className={`text-[11px] ${feedback.ok ? 'text-[#4ade80]' : 'text-[#ef4444]'}`}>
                  {feedback.msg}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── FLOW: Buy / Browse Products ──────────────────────────────────────────────

const LISTINGS_ERROR_MESSAGE = 'No pudimos cargar listados en este momento. Intenta de nuevo.'

function ListingsStatus({ tone, message }: { tone: 'cyan' | 'gold'; message: string }) {
  const color = tone === 'cyan' ? '#00aeef' : '#ffc107'

  return (
    <div
      className="mx-auto flex w-full max-w-5xl items-center justify-center rounded-xl px-5 py-12 text-center"
      style={{ background: `${color}08`, border: `1px dashed ${color}30` }}
    >
      <p className="text-sm text-[#7a7a7a]">{message}</p>
    </div>
  )
}

function BuyFlow({ step, direction, listings, listingsLoading, listingsError, onCategory, onCardClick, onBuy, currentUserId }: {
  step: number
  direction: number
  listings: Listing[]
  listingsLoading?: boolean
  listingsError?: string | null
  onCategory: (cat: ProductCategory) => void
  onCardClick: (listing: Listing) => void
  onBuy?: (listing: Listing) => void
  currentUserId?: string
}) {
  return (
    <motion.div key={`buy-${step}`} custom={direction} variants={stepVariants} initial="enter" animate="center" exit="exit" className="w-full">
      {step === 0 && (
        <div className="p-6 space-y-4">
          <p className="text-sm text-[#a0a0a0]">
            Encuentra equipos, instrumentos y consumibles verificados. Cada compra utiliza nuestro flujo de pago protegido para mayor seguridad.
          </p>
          <CategoryGrid
            categories={PRODUCT_CATEGORIES as Array<{ id: ProductCategory; label: string; description: string; icon: string; accent: 'gold' | 'cyan'; listingCount?: number }>}
            onSelect={onCategory}
          />
        </div>
      )}
      {step === 1 && (
        <div className="w-full px-4 py-5 sm:px-6 sm:py-6">
          <div className="mx-auto mb-3 flex w-full max-w-5xl items-center gap-2 px-1 sm:px-2">
            <AlertCircle size={13} className="text-[#00aeef]" />
            <span className="text-[11px] text-[#b8b8b8]">Listados activos en esta categoría</span>
          </div>
          {listingsLoading ? (
            <ListingsStatus tone="cyan" message="Cargando listados..." />
          ) : listingsError ? (
            <ListingsStatus tone="cyan" message={LISTINGS_ERROR_MESSAGE} />
          ) : listings.length === 0 ? (
            <div className="mx-auto rounded-xl flex w-full max-w-5xl items-center justify-center py-12"
              style={{ background: 'rgba(0,174,239,0.03)', border: '1px dashed rgba(0,174,239,0.15)' }}>
              <div className="text-center">
                <p className="text-sm text-[#b8b8b8]">Sin listados en esta categoría aún.</p>
                <p className="text-[11px] text-[var(--mp-text-faint)] mt-1">¡Sé el primero en publicar!</p>
              </div>
            </div>
          ) : (
            <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {listings.map(l => (
                <div key={l.id} className="flex h-full min-w-0 flex-col gap-3">
                  <MarketplaceCard listing={l} onClick={() => onCardClick(l)} />
                  <ListingQASection
                    listingId={l.id}
                    sellerId={l.type === 'product' ? l.seller.id : l.talent.id}
                    currentUserId={currentUserId}
                  />
                  {onBuy && (
                    <button
                      onClick={() => onBuy(l)}
                      className="w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                      style={{ background: 'rgba(0,174,239,0.1)', color: '#00aeef', border: '1px solid rgba(0,174,239,0.2)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,174,239,0.18)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,174,239,0.1)' }}
                    >
                      Comprar ahora
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}

// ─── FLOW: Sell a Product ─────────────────────────────────────────────────────

function SellFlow({
  step, direction, onCategory, formValues, onFieldChange, fieldErrors, imageFiles, onAddImages, onRemoveImage,
}: {
  step: number
  direction: number
  onCategory: (cat: ProductCategory) => void
  formValues: Record<string, string>
  onFieldChange: (key: string, value: string) => void
  fieldErrors?: Record<string, string[]>
  imageFiles: PreparedMarketplaceUpload[]
  onAddImages: (files: FileList) => void
  onRemoveImage: (index: number) => void
}) {
  const GOLD_FOCUS = 'rgba(255,193,7,0.4)'
  const ERR_COLOR = 'rgba(239,68,68,0.5)'

  const onFocus = (field: string) => (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.target.style.borderColor = fieldErrors?.[field]?.length ? ERR_COLOR : GOLD_FOCUS
  }
  const onBlur = (field: string) => (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.target.style.borderColor = fieldErrors?.[field]?.length ? ERR_COLOR : 'var(--mp-input-border)'
  }

  return (
    <motion.div key={`sell-${step}`} custom={direction} variants={stepVariants} initial="enter" animate="center" exit="exit">
      {step === 0 && (
        <div className="p-6 space-y-4">
          <p className="text-sm text-[#a0a0a0]">
            Publica tu equipo o instrumento. La comisión del{' '}
            <span className="text-[#ffc107] font-medium">5% la asumes tú</span> solo cuando se concrete la venta.
          </p>
          <CategoryGrid
            categories={PRODUCT_CATEGORIES as Array<{ id: ProductCategory; label: string; description: string; icon: string; accent: 'gold' | 'cyan'; listingCount?: number }>}
            onSelect={onCategory}
          />
        </div>
      )}
      {step === 1 && (
        <div className="p-6 space-y-4">
          <p className="text-xs text-[#9a9a9a] uppercase tracking-widest">Detalles del producto</p>
          <div className="space-y-3">

            {/* Title */}
            <div className="space-y-1">
              <label className="text-xs text-[#a0a0a0]">Título del listado</label>
              <input type="text" value={formValues.title ?? ''} onChange={e => onFieldChange('title', e.target.value)}
                placeholder="Ej: Fender Stratocaster Player 2022"
                className="w-full px-4 py-2.5 rounded-xl text-sm text-[#f2f2f2] placeholder:text-[var(--mp-text-faint)] outline-none"
                style={fieldInputStyle('title', fieldErrors)}
                onFocus={onFocus('title')} onBlur={onBlur('title')} />
              <FieldError errors={fieldErrors} field="title" />
            </div>

            {/* Price */}
            <div className="space-y-1">
              <label className="text-xs text-[#a0a0a0]">Precio (USD)</label>
              <input type="number" value={formValues.price ?? ''} onChange={e => onFieldChange('price', e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2.5 rounded-xl text-sm text-[#f2f2f2] placeholder:text-[var(--mp-text-faint)] outline-none"
                style={fieldInputStyle('price', fieldErrors)}
                onFocus={onFocus('price')} onBlur={onBlur('price')} />
              <FieldError errors={fieldErrors} field="price" />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs text-[#a0a0a0]">Descripción</label>
              <textarea rows={3} value={formValues.description ?? ''} onChange={e => onFieldChange('description', e.target.value)}
                placeholder="Describe el estado, accesorios incluidos, historial..."
                className="w-full px-4 py-2.5 rounded-xl text-sm text-[#f2f2f2] placeholder:text-[var(--mp-text-faint)] outline-none resize-none"
                style={fieldInputStyle('description', fieldErrors)}
                onFocus={onFocus('description')} onBlur={onBlur('description')} />
              <FieldError errors={fieldErrors} field="description" />
            </div>

            {/* Condition */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#a0a0a0]">Estado del equipo</label>
              <select value={formValues.condition ?? 'used-like-new'} onChange={e => onFieldChange('condition', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm text-[#f2f2f2] outline-none"
                style={{ background: 'var(--mp-input)', border: '1px solid var(--mp-input-border)' }}
                onFocus={onFocus('condition')} onBlur={onBlur('condition')}>
                <option value="new">Nuevo</option>
                <option value="used-like-new">Como nuevo</option>
                <option value="used-good">Buen estado</option>
                <option value="used-fair">Estado regular</option>
              </select>
            </div>

            {/* S15 Location */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-[#a0a0a0]">Estado</label>
                <input type="text" value={formValues.state ?? ''} onChange={e => onFieldChange('state', e.target.value)}
                  placeholder="Ej: Distrito Capital"
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-[#f2f2f2] placeholder:text-[var(--mp-text-faint)] outline-none"
                  style={fieldInputStyle('state', fieldErrors)}
                  onFocus={onFocus('state')} onBlur={onBlur('state')} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-[#a0a0a0]">Ciudad</label>
                <input type="text" value={formValues.city ?? ''} onChange={e => onFieldChange('city', e.target.value)}
                  placeholder="Ej: Caracas"
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-[#f2f2f2] placeholder:text-[var(--mp-text-faint)] outline-none"
                  style={fieldInputStyle('city', fieldErrors)}
                  onFocus={onFocus('city')} onBlur={onBlur('city')} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs text-[#a0a0a0] cursor-pointer">
              <input type="checkbox" checked={formValues.isLocationPublic !== 'false'} onChange={e => onFieldChange('isLocationPublic', e.target.checked ? 'true' : 'false')}
                className="rounded accent-[var(--mp-accent)]" />
              Ubicacion visible en el listing
            </label>

            {/* Image upload */}
            <div className="space-y-2">
              <label className="text-xs text-[#a0a0a0]">
                Fotos del equipo <span className="text-[#9a9a9a]">({imageFiles.length}/8)</span>
              </label>
              {imageFiles.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {imageFiles.map((upload, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={upload.previewUrl} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => onRemoveImage(i)}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <X size={14} className="text-white" />
                      </button>
                    </div>
                  ))}
                  {imageFiles.length < 8 && (
                    <label className="relative aspect-square rounded-lg flex items-center justify-center cursor-pointer overflow-hidden"
                      style={{ border: '1px dashed var(--mp-input-border)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,193,7,0.3)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--mp-input-border)' }}>
                      <Upload size={14} className="text-[var(--mp-text-faint)]" />
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                        multiple
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        aria-label="Agregar fotos del equipo"
                        onChange={e => {
                          if (e.target.files) onAddImages(e.target.files)
                          e.currentTarget.value = ''
                        }}
                      />
                    </label>
                  )}
                </div>
              ) : (
                <label className="relative rounded-xl flex flex-col items-center justify-center py-8 gap-2 cursor-pointer overflow-hidden transition-colors"
                  style={{ background: 'var(--mp-card-subtle)', border: '1px dashed var(--mp-input-border)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,193,7,0.3)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--mp-input-border)' }}>
                  <Upload size={20} className="text-[var(--mp-text-faint)]" />
                  <p className="text-xs text-[#b8b8b8]">Subir fotos del equipo (máx. 8)</p>
                  <p className="text-[10px] text-[var(--mp-text-faint)]">JPG, PNG, WEBP o HEIC</p>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                    multiple
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    aria-label="Subir fotos del equipo"
                    onChange={e => {
                      if (e.target.files) onAddImages(e.target.files)
                      e.currentTarget.value = ''
                    }}
                  />
                </label>
              )}
            </div>

            {/* Commission notice */}
            <div className="rounded-xl p-3 flex items-start gap-2"
              style={{ background: 'rgba(255,193,7,0.05)', border: '1px solid rgba(255,193,7,0.12)' }}>
              <AlertCircle size={13} className="text-[#ffc107] mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-[#a0a0a0]">
                Turpial Market cobra el <span className="text-[#ffc107]">5% de comisión sobre el precio de venta</span>, descontado de tu liquidación al completarse la transacción.
              </p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}

// ─── FLOW: Find Talent ────────────────────────────────────────────────────────

function FindTalentFlow({ step, direction, listings, listingsLoading, listingsError, onCategory, onCardClick, onBuy, currentUserId }: {
  step: number
  direction: number
  listings: Listing[]
  listingsLoading?: boolean
  listingsError?: string | null
  onCategory: (cat: ServiceCategory) => void
  onCardClick: (listing: Listing) => void
  onBuy?: (listing: Listing) => void
  currentUserId?: string
}) {
  return (
    <motion.div key={`find-${step}`} custom={direction} variants={stepVariants} initial="enter" animate="center" exit="exit">
      {step === 0 && (
        <div className="p-6 space-y-4">
          <p className="text-sm text-[#a0a0a0]">
            Contrata músicos de sesión, bandas para eventos, técnicos de audio y productores de forma segura.
          </p>
          <CategoryGrid
            categories={SERVICE_CATEGORIES as Array<{ id: ServiceCategory; label: string; description: string; icon: string; accent: 'gold' | 'cyan'; listingCount?: number }>}
            onSelect={onCategory}
          />
        </div>
      )}
      {step === 1 && (
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 px-2 mb-1">
            <Star size={12} className="text-[#ffc107] fill-[#ffc107]" />
            <span className="text-[11px] text-[#b8b8b8]">Talentos en esta categoría</span>
          </div>
          {listingsLoading ? (
            <ListingsStatus tone="gold" message="Cargando listados..." />
          ) : listingsError ? (
            <ListingsStatus tone="gold" message={LISTINGS_ERROR_MESSAGE} />
          ) : listings.length === 0 ? (
            <div className="rounded-xl flex items-center justify-center py-12"
              style={{ background: 'rgba(255,193,7,0.03)', border: '1px dashed rgba(255,193,7,0.15)' }}>
              <div className="text-center">
                <p className="text-sm text-[#b8b8b8]">Sin talentos en esta categoría aún.</p>
                <p className="text-[11px] text-[var(--mp-text-faint)] mt-1">¡Registra tu perfil de talento!</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.map(l => (
                <div key={l.id} className="space-y-2">
                  <MarketplaceCard listing={l} onClick={() => onCardClick(l)} />
                  <ListingQASection
                    listingId={l.id}
                    sellerId={l.type === 'product' ? l.seller.id : l.talent.id}
                    currentUserId={currentUserId}
                  />
                  {onBuy && (
                    <button
                      onClick={() => onBuy(l)}
                      className="w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                      style={{ background: 'rgba(255,193,7,0.08)', color: '#ffc107', border: '1px solid rgba(255,193,7,0.2)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,193,7,0.15)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,193,7,0.08)' }}
                    >
                      Contratar ahora
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}

// ─── FLOW: Offer Talent ───────────────────────────────────────────────────────

function OfferTalentFlow({
  step, direction, onCategory, formValues, onFieldChange, fieldErrors,
}: {
  step: number
  direction: number
  onCategory: (cat: ServiceCategory) => void
  formValues: Record<string, string>
  onFieldChange: (key: string, value: string) => void
  fieldErrors?: Record<string, string[]>
}) {
  const GOLD_FOCUS = 'rgba(255,193,7,0.4)'
  const ERR_COLOR = 'rgba(239,68,68,0.5)'

  const onFocus = (field: string) => (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = fieldErrors?.[field]?.length ? ERR_COLOR : GOLD_FOCUS
  }
  const onBlur = (field: string) => (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = fieldErrors?.[field]?.length ? ERR_COLOR : 'var(--mp-input-border)'
  }

  return (
    <motion.div key={`offer-${step}`} custom={direction} variants={stepVariants} initial="enter" animate="center" exit="exit">
      {step === 0 && (
        <div className="p-6 space-y-4">
          <p className="text-sm text-[#a0a0a0]">
            Crea tu perfil de talento y empieza a recibir solicitudes. Gana con cada proyecto;{' '}
            <span className="text-[#ffc107] font-medium">solo pagas 5% cuando cobras</span>.
          </p>
          <CategoryGrid
            categories={SERVICE_CATEGORIES as Array<{ id: ServiceCategory; label: string; description: string; icon: string; accent: 'gold' | 'cyan'; listingCount?: number }>}
            onSelect={onCategory}
          />
        </div>
      )}
      {step === 1 && (
        <div className="p-6 space-y-4">
          <p className="text-xs text-[#9a9a9a] uppercase tracking-widest">Perfil de Talento</p>
          <div className="space-y-3">

            {/* Title */}
            <div className="space-y-1">
              <label className="text-xs text-[#a0a0a0]">Título de tu servicio</label>
              <input type="text" value={formValues.title ?? ''} onChange={e => onFieldChange('title', e.target.value)}
                placeholder="Ej: Guitarrista de Sesión — Rock & Blues"
                className="w-full px-4 py-2.5 rounded-xl text-sm text-[#f2f2f2] placeholder:text-[var(--mp-text-faint)] outline-none"
                style={fieldInputStyle('title', fieldErrors)}
                onFocus={onFocus('title')} onBlur={onBlur('title')} />
              <FieldError errors={fieldErrors} field="title" />
            </div>

            {/* Price from */}
            <div className="space-y-1">
              <label className="text-xs text-[#a0a0a0]">Precio desde (USD)</label>
              <input type="number" value={formValues.priceFrom ?? ''} onChange={e => onFieldChange('priceFrom', e.target.value)}
                placeholder="50"
                className="w-full px-4 py-2.5 rounded-xl text-sm text-[#f2f2f2] placeholder:text-[var(--mp-text-faint)] outline-none"
                style={fieldInputStyle('price', fieldErrors)}
                onFocus={onFocus('price')} onBlur={onBlur('price')} />
              <FieldError errors={fieldErrors} field="price" />
            </div>

            {/* Price to — optional, no validation */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#a0a0a0]">Precio hasta (USD) — opcional</label>
              <input type="number" value={formValues.priceTo ?? ''} onChange={e => onFieldChange('priceTo', e.target.value)}
                placeholder="200"
                className="w-full px-4 py-2.5 rounded-xl text-sm text-[#f2f2f2] placeholder:text-[var(--mp-text-faint)] outline-none"
                style={{ background: 'var(--mp-input)', border: '1px solid var(--mp-input-border)' }}
                onFocus={e => { e.target.style.borderColor = GOLD_FOCUS }}
                onBlur={e => { e.target.style.borderColor = 'var(--mp-input-border)' }} />
            </div>

            {/* Price label */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#a0a0a0]">Etiqueta de precio</label>
              <input type="text" value={formValues.priceLabel ?? ''} onChange={e => onFieldChange('priceLabel', e.target.value)}
                placeholder="Ej: por sesión, por canción, por evento"
                className="w-full px-4 py-2.5 rounded-xl text-sm text-[#f2f2f2] placeholder:text-[var(--mp-text-faint)] outline-none"
                style={{ background: 'var(--mp-input)', border: '1px solid var(--mp-input-border)' }}
                onFocus={e => { e.target.style.borderColor = GOLD_FOCUS }}
                onBlur={e => { e.target.style.borderColor = 'var(--mp-input-border)' }} />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs text-[#a0a0a0]">Bio / descripción del servicio</label>
              <textarea rows={4} value={formValues.description ?? ''} onChange={e => onFieldChange('description', e.target.value)}
                placeholder="Cuéntanos sobre tu experiencia, géneros, equipos y lo que ofreces..."
                className="w-full px-4 py-2.5 rounded-xl text-sm text-[#f2f2f2] placeholder:text-[var(--mp-text-faint)] outline-none resize-none"
                style={fieldInputStyle('description', fieldErrors)}
                onFocus={onFocus('description')} onBlur={onBlur('description')} />
              <FieldError errors={fieldErrors} field="description" />
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}

// ─── Main Export: Modal Controller ───────────────────────────────────────────

export interface MarketplaceModalsProps {
  state: ModalState
  direction: number
  onClose: () => void
  onNext: (payload?: Partial<ModalState>) => void
  onBack: () => void
  onListingCreated?: (listing: Listing) => void
  /** Real listings (extraListings + dbListings) to show in buy/find-talent browse steps */
  listings?: Listing[]
  listingsLoading?: boolean
  listingsError?: string | null
  /** Called when user clicks a listing in buy/find-talent modal (closes modal + opens chat) */
  onOpenChat?: (listing: Listing) => void
  /** Called when user clicks "Comprar/Contratar ahora" — opens checkout flow */
  onBuy?: (listing: Listing) => void
  /** Logged-in user ID — enables seller reply UI in Q&A sections */
  currentUserId?: string
}

export function MarketplaceModals({
  state,
  direction,
  onClose,
  onNext,
  onBack,
  onListingCreated,
  listings = [],
  listingsLoading = false,
  listingsError = null,
  onBuy,
  currentUserId,
}: MarketplaceModalsProps) {
  const { flow, step } = state
  const router = useRouter()

  // ── State ───────────────────────────────────────────────────────────────────
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [imageFiles, setImageFiles] = useState<PreparedMarketplaceUpload[]>([])
  const imageFilesRef = useRef<PreparedMarketplaceUpload[]>([])

  // Reset all state when modal opens or closes
  useEffect(() => {
    setFormValues({})
    setSubmitError(null)
    setIsSubmitting(false)
    setFieldErrors({})
    setImageFiles([]) // Data URLs — no revoke needed
  }, [flow])

  useEffect(() => {
    imageFilesRef.current = imageFiles
  }, [imageFiles])

  useEffect(() => {
    imageFilesRef.current.forEach(revokeMarketplaceUploadPreview)
    imageFilesRef.current = []
  }, [flow])

  useEffect(() => {
    return () => {
      imageFilesRef.current.forEach(revokeMarketplaceUploadPreview)
    }
  }, [])

  const handleFieldChange = useCallback((key: string, value: string) => {
    setFormValues(prev => ({ ...prev, [key]: value }))
    // Clear per-field error as user types
    setFieldErrors(prev => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  const handleAddImages = useCallback(async (files: FileList) => {
    const fileArray = Array.from(files).slice(0, 8) // cap to 8 total
    try {
      const prepared = await Promise.all(
        fileArray.map(file => prepareMarketplaceUpload(file, 'listing-image')),
      )
      setImageFiles(prev => {
        const slots = 8 - prev.length
        return [...prev, ...prepared.slice(0, slots)]
      })
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'No se pudieron preparar las imagenes')
      // Silently ignore resize errors — user can retry
    }
  }, [])

  const handleRemoveImage = useCallback((index: number) => {
    setImageFiles(prev => {
      const removed = prev[index]
      revokeMarketplaceUploadPreview(removed)
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  // ── Publish handler ─────────────────────────────────────────────────────────
  const handlePublish = useCallback(async () => {
    if (!state.selectedCategory) {
      setSubmitError('Selecciona una categoría primero')
      return
    }
    setIsSubmitting(true)
    setSubmitError(null)
    setFieldErrors({})
    try {
      const rawPrice = formValues.price ?? formValues.priceFrom ?? '0'
      const uploadedImageUrls = await Promise.all(
        imageFiles.map(upload => uploadMarketplaceFile(upload.file, 'listing-image').then(result => result.url)),
      )
      const result = await createListing({
        title: formValues.title ?? '',
        description: formValues.description ?? '',
        category: state.selectedCategory as MpCategory,
        tags: [],
        price: parseFloat(rawPrice) || 0,
        currency: 'USD',
        hasInventory: formValues.hasInventory === 'true',
        inventory: formValues.inventory ? parseInt(formValues.inventory) : undefined,
        city: formValues.city || undefined,
        state: formValues.state || undefined,
        isLocationPublic: formValues.isLocationPublic !== 'false',
        coverImageUrl: uploadedImageUrls[0],
        mediaUrls: uploadedImageUrls.slice(1),
      })

      if (result.success) {
        // Build a display-compatible listing so the grid updates immediately
        if (onListingCreated) {
          const categoryId = state.selectedCategory
          const now = new Date().toISOString()
          const me: MarketplaceUser = {
            id: currentUserId ?? result.data.id,
            name: 'Mi publicación',
            initials: 'YO',
            role: flow === 'offer-talent' ? 'talent' : 'seller',
            verified: false,
            rating: 0,
            reviewCount: 0,
            joinedAt: now,
            location: 'Venezuela',
          }
          let newListing: Listing
          if (flow === 'offer-talent') {
            const cat = SERVICE_CATEGORIES.find(c => (c.id as string) === (categoryId as string))
            newListing = {
              id: result.data.id,
              type: 'service',
              title: formValues.title || 'Sin título',
              slug: result.data.slug,
              description: formValues.description || '',
              category: categoryId as ServiceCategory,
              subcategory: cat?.label ?? (categoryId as string),
              priceFrom: parseFloat(formValues.priceFrom ?? '0') || 0,
              priceTo: formValues.priceTo ? parseFloat(formValues.priceTo) : undefined,
              priceLabel: formValues.priceLabel || 'por proyecto',
              currency: 'USD',
              badge: 'NUEVO',
              talent: me,
              status: 'active',
              createdAt: now,
              tags: [],
            }
          } else {
            const cat = PRODUCT_CATEGORIES.find(c => (c.id as string) === (categoryId as string))
            newListing = {
              id: result.data.id,
              type: 'product',
              title: formValues.title || 'Sin título',
              slug: result.data.slug,
              description: formValues.description || '',
              category: categoryId as ProductCategory,
              subcategory: cat?.label ?? (categoryId as string),
              price: parseFloat(formValues.price ?? '0') || 0,
              currency: 'USD',
              condition: (formValues.condition as ProductCondition) || 'used-like-new',
              images: uploadedImageUrls,
              badge: 'NUEVO',
              seller: me,
              status: 'active',
              createdAt: now,
              location: 'Venezuela',
              tags: [],
            }
          }
          onListingCreated(newListing)
        }
        onNext({ step: 'success' })
      } else {
        if (result.errors) {
          setFieldErrors(result.errors)
          setSubmitError('Corrige los campos marcados')
        } else {
          setSubmitError(result.message)
        }
      }
    } catch {
      setSubmitError('Error inesperado. Intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }, [state.selectedCategory, flow, formValues, imageFiles, onNext, onListingCreated, currentUserId])

  // ── Keyboard + scroll lock ──────────────────────────────────────────────────
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [handleKey])

  useEffect(() => {
    document.body.style.overflow = flow ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [flow])

  // ── Flow metadata ───────────────────────────────────────────────────────────
  const FLOW_META: Record<NonNullable<ModalFlow>, { title: string; subtitle?: string; accent: 'cyan' | 'gold'; totalSteps: number }> = {
    buy:           { title: 'Quiero Comprar',    subtitle: 'Equipos, instrumentos y consumibles', accent: 'cyan', totalSteps: 2 },
    sell:          { title: 'Quiero Vender',     subtitle: 'Publica tu producto en el marketplace', accent: 'gold', totalSteps: 3 },
    'find-talent': { title: 'Busco Talento',     subtitle: 'Músicos, técnicos y productores',      accent: 'gold', totalSteps: 2 },
    'offer-talent':{ title: 'Ofrezco mi Talento',subtitle: 'Crea tu perfil de servicios',          accent: 'gold', totalSteps: 3 },
  }

  const meta = flow ? FLOW_META[flow] : null
  const currentStepIndex = step === 'category' ? 0 : step === 'form' ? 1 : step === 'success' ? 2 : 0

  // Filter real listings to the selected category for browse steps
  const selectedCat = state.selectedCategory as string | undefined
  const categoryListings = selectedCat
    ? listings.filter(l => (l.category as string) === selectedCat)
    : []
  const handleCardNavigate = useCallback((l: Listing) => {
    onClose()
    router.push(`/marketplace/${(l as Listing & { slug?: string }).slug ?? l.id}`)
  }, [onClose, router])

  return (
    <AnimatePresence mode="wait">
      {flow && meta && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
          <ModalOverlay onClose={onClose} />
          <ModalShell
            onClose={onClose}
            title={meta.title}
            subtitle={meta.subtitle}
            accent={meta.accent}
            onBack={step !== 'category' ? onBack : undefined}
            step={currentStepIndex}
            totalSteps={meta.totalSteps}
          >
            <AnimatePresence mode="wait" custom={direction}>
              {step === 'success' ? (
                <SuccessScreen
                  key="success"
                  message={flow === 'sell' ? '¡Tu producto fue publicado!' : '¡Tu perfil de talento fue creado!'}
                  onClose={onClose}
                />
              ) : flow === 'buy' ? (
                <BuyFlow
                  key="buy"
                  step={step === 'category' ? 0 : 1}
                  direction={direction}
                  listings={categoryListings.filter(l => l.type === 'product')}
                  listingsLoading={listingsLoading}
                  listingsError={listingsError}
                  onCategory={cat => onNext({ selectedCategory: cat, step: 'form' })}
                  onCardClick={handleCardNavigate}
                  onBuy={onBuy ? l => { onClose(); onBuy(l) } : undefined}
                  currentUserId={currentUserId}
                />
              ) : flow === 'sell' ? (
                <SellFlow
                  key="sell"
                  step={step === 'category' ? 0 : 1}
                  direction={direction}
                  onCategory={cat => onNext({ selectedCategory: cat, step: 'form' })}
                  formValues={formValues}
                  onFieldChange={handleFieldChange}
                  fieldErrors={fieldErrors}
                  imageFiles={imageFiles}
                  onAddImages={handleAddImages}
                  onRemoveImage={handleRemoveImage}
                />
              ) : flow === 'find-talent' ? (
                <FindTalentFlow
                  key="find"
                  step={step === 'category' ? 0 : 1}
                  direction={direction}
                  listings={categoryListings.filter(l => l.type === 'service')}
                  listingsLoading={listingsLoading}
                  listingsError={listingsError}
                  onCategory={cat => onNext({ selectedCategory: cat, step: 'form' })}
                  onCardClick={handleCardNavigate}
                  onBuy={onBuy ? l => { onClose(); onBuy(l) } : undefined}
                  currentUserId={currentUserId}
                />
              ) : (
                <OfferTalentFlow
                  key="offer"
                  step={step === 'category' ? 0 : 1}
                  direction={direction}
                  onCategory={cat => onNext({ selectedCategory: cat, step: 'form' })}
                  formValues={formValues}
                  onFieldChange={handleFieldChange}
                  fieldErrors={fieldErrors}
                />
              )}
            </AnimatePresence>

            {/* Footer CTA — shown on form step for sell + offer-talent */}
            {step === 'form' && (flow === 'sell' || flow === 'offer-talent') && (
              <div className="px-6 pb-6 flex flex-col gap-3">
                {submitError && (
                  <div className="rounded-xl p-3 flex items-start gap-2"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                    <AlertCircle size={13} className="text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-red-400">{submitError}</p>
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={onBack}
                    disabled={isSubmitting}
                    className="btn-gradient-outline px-5 py-3 rounded-xl text-sm text-[#a0a0a0] hover:text-[#f2f2f2] transition-colors disabled:opacity-50"
                  >
                    Atrás
                  </button>
                  <button
                    onClick={handlePublish}
                    disabled={isSubmitting}
                    className="btn-silky-primary flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {isSubmitting ? (
                      <><Loader2 size={14} className="animate-spin" />Publicando...</>
                    ) : (
                      flow === 'sell' ? 'Publicar Producto' : 'Crear Perfil'
                    )}
                  </button>
                </div>
              </div>
            )}
          </ModalShell>
        </div>
      )}
    </AnimatePresence>
  )
}
