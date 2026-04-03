'use client'

import { useEffect, useCallback } from 'react'
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
} from 'lucide-react'
import type { ModalState, ModalFlow, ProductCategory, ServiceCategory } from '@/types/marketplace'
import { PRODUCT_CATEGORIES, SERVICE_CATEGORIES } from '@/content/marketplace'

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

// ─── Overlay + Container ──────────────────────────────────────────────────────

function ModalOverlay({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      key="overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onClose}
      className="fixed inset-0 z-40"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
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
      className="relative z-50 w-full max-w-lg mx-auto"
      style={{ maxHeight: '85vh' }}
    >
      <div
        className="card-premium-wrapper rounded-2xl flex flex-col overflow-hidden"
        style={{
          background: 'rgba(11,11,11,0.98)',
          boxShadow: `0 32px 80px rgba(0,0,0,0.85), 0 0 120px ${accent === 'cyan' ? 'rgba(0,174,239,0.08)' : 'rgba(255,193,7,0.06)'}`,
          maxHeight: '85vh',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-6 py-4 flex-shrink-0 border-b border-[#1e1e1e]"
          style={{ background: accentBg }}
        >
          {onBack && (
            <button
              onClick={onBack}
              className="text-[#5a5a5a] hover:text-[#f2f2f2] transition-colors -ml-1"
            >
              <ChevronLeft size={18} />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-[#f2f2f2] truncate" style={{ letterSpacing: '0.03em' }}>
              {title}
            </h2>
            {subtitle && <p className="text-[11px] text-[#5a5a5a] mt-0.5">{subtitle}</p>}
          </div>

          {/* Step indicator */}
          {step !== undefined && totalSteps && (
            <div className="flex items-center gap-1 mr-2 flex-shrink-0">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === step ? '16px' : '6px',
                    height: '6px',
                    background: i <= step ? accentColor : '#2a2a2a',
                  }}
                />
              ))}
            </div>
          )}

          <button
            onClick={onClose}
            className="text-[#5a5a5a] hover:text-[#f2f2f2] transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto scrollbar-none">
          {children}
        </div>
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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-6">
      {categories.map(cat => {
        const accentColor = cat.accent === 'cyan' ? '#00aeef' : '#ffc107'
        const accentBg = cat.accent === 'cyan' ? 'rgba(0,174,239,0.06)' : 'rgba(255,193,7,0.05)'
        const accentBorder = cat.accent === 'cyan' ? 'rgba(0,174,239,0.18)' : 'rgba(255,193,7,0.18)'

        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className="group rounded-xl p-4 text-left transition-all duration-250 hover:-translate-y-1"
            style={{
              background: accentBg,
              border: `1px solid ${accentBorder}`,
              boxShadow: `0 0 0 0 ${accentColor}`,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px rgba(0,0,0,0.4), 0 0 24px ${accentColor}18`
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 0 transparent'
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${accentColor}15`, color: accentColor }}
              >
                {ICON_MAP[cat.icon] ?? <Music size={20} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-[#f2f2f2] group-hover:text-white transition-colors">
                    {cat.label}
                  </p>
                  {cat.listingCount && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{ background: `${accentColor}15`, color: accentColor }}>
                      {cat.listingCount}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#5a5a5a] mt-0.5 leading-relaxed">{cat.description}</p>
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
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 14 }}
      >
        <div className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)' }}>
          <CheckCircle2 size={32} className="text-[#4ade80]" style={{ filter: 'drop-shadow(0 0 12px rgba(74,222,128,0.5))' }} />
        </div>
      </motion.div>
      <div>
        <p className="text-lg font-semibold text-[#f2f2f2] mb-2">{message}</p>
        <p className="text-sm text-[#5a5a5a]">
          El equipo de Turpial Market revisará tu publicación en menos de 24 horas.
        </p>
      </div>
      <button
        onClick={onClose}
        className="btn-silky-primary px-8 py-3 rounded-xl text-sm font-semibold"
      >
        Explorar el Marketplace
      </button>
    </div>
  )
}

// ─── FLOW: Buy / Browse Products ──────────────────────────────────────────────

function BuyFlow({
  step,
  direction,
  onCategory,
}: {
  step: number
  direction: number
  onCategory: (cat: ProductCategory) => void
}) {
  return (
    <motion.div key={`buy-${step}`} custom={direction} variants={stepVariants}
      initial="enter" animate="center" exit="exit">
      {step === 0 && (
        <div className="p-6 space-y-4">
          <p className="text-sm text-[#a0a0a0]">
            Encuentra equipos, instrumentos y consumibles verificados. Toda compra está protegida por nuestro sistema de escrow.
          </p>
          <CategoryGrid
            categories={PRODUCT_CATEGORIES as Array<{ id: ProductCategory; label: string; description: string; icon: string; accent: 'gold' | 'cyan'; listingCount?: number }>}
            onSelect={onCategory}
          />
        </div>
      )}
      {step === 1 && (
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle size={13} className="text-[#00aeef]" />
            <span className="text-[11px] text-[#5a5a5a]">Mostrando todos los listados activos en esta categoría</span>
          </div>
          <div className="rounded-xl flex items-center justify-center py-12"
            style={{ background: 'rgba(0,174,239,0.03)', border: '1px dashed rgba(0,174,239,0.15)' }}>
            <div className="text-center">
              <Loader2 size={24} className="text-[#00aeef] animate-spin mx-auto mb-3" />
              <p className="text-sm text-[#5a5a5a]">Cargando listados...</p>
              <p className="text-[11px] text-[#2a2a2a] mt-1">Conectar con API en producción</p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}

// ─── FLOW: Sell a Product ─────────────────────────────────────────────────────

function SellFlow({
  step,
  direction,
  onCategory,
}: {
  step: number
  direction: number
  onCategory: (cat: ProductCategory) => void
}) {
  return (
    <motion.div key={`sell-${step}`} custom={direction} variants={stepVariants}
      initial="enter" animate="center" exit="exit">
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
          <p className="text-xs text-[#5a5a5a] uppercase tracking-widest">Detalles del producto</p>
          <div className="space-y-3">
            {[
              { label: 'Título del listado', placeholder: 'Ej: Fender Stratocaster Player 2022' },
              { label: 'Precio (USD)', placeholder: '0.00', type: 'number' },
            ].map(field => (
              <div key={field.label} className="space-y-1.5">
                <label className="text-xs text-[#a0a0a0]">{field.label}</label>
                <input
                  type={field.type ?? 'text'}
                  placeholder={field.placeholder}
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-[#f2f2f2] placeholder:text-[#2a2a2a] outline-none transition-all duration-250"
                  style={{
                    background: 'rgba(20,20,20,0.8)',
                    border: '1px solid #1e1e1e',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(255,193,7,0.4)' }}
                  onBlur={e => { e.target.style.borderColor = '#1e1e1e' }}
                />
              </div>
            ))}
            <div className="space-y-1.5">
              <label className="text-xs text-[#a0a0a0]">Descripción</label>
              <textarea
                rows={3}
                placeholder="Describe el estado, accesorios incluidos, historial..."
                className="w-full px-4 py-2.5 rounded-xl text-sm text-[#f2f2f2] placeholder:text-[#2a2a2a] outline-none resize-none transition-all duration-250"
                style={{ background: 'rgba(20,20,20,0.8)', border: '1px solid #1e1e1e' }}
                onFocus={e => { e.target.style.borderColor = 'rgba(255,193,7,0.4)' }}
                onBlur={e => { e.target.style.borderColor = '#1e1e1e' }}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-[#a0a0a0]">Estado del equipo</label>
              <select
                className="w-full px-4 py-2.5 rounded-xl text-sm text-[#f2f2f2] outline-none"
                style={{ background: 'rgba(20,20,20,0.8)', border: '1px solid #1e1e1e' }}
              >
                <option value="new">Nuevo</option>
                <option value="used-like-new">Como nuevo</option>
                <option value="used-good">Buen estado</option>
                <option value="used-fair">Estado regular</option>
              </select>
            </div>

            {/* Image upload placeholder */}
            <div className="rounded-xl flex flex-col items-center justify-center py-8 gap-2 cursor-pointer hover:border-[rgba(255,193,7,0.3)] transition-colors"
              style={{ background: 'rgba(20,20,20,0.5)', border: '1px dashed #2a2a2a' }}>
              <Upload size={20} className="text-[#2a2a2a]" />
              <p className="text-xs text-[#5a5a5a]">Subir fotos del equipo (máx. 8)</p>
              <p className="text-[10px] text-[#2a2a2a]">JPG, PNG — hasta 10MB cada una</p>
            </div>

            {/* Commission notice */}
            <div className="rounded-xl p-3 flex items-start gap-2"
              style={{ background: 'rgba(255,193,7,0.05)', border: '1px solid rgba(255,193,7,0.12)' }}>
              <AlertCircle size={13} className="text-[#ffc107] mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-[#a0a0a0]">
                Turpial Market cobra el <span className="text-[#ffc107]">5% de comisión sobre el precio de venta</span>, descontado de tu liquidación al completarse la transacción. El comprador no paga comisión adicional.
              </p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}

// ─── FLOW: Find Talent ────────────────────────────────────────────────────────

function FindTalentFlow({
  step,
  direction,
  onCategory,
}: {
  step: number
  direction: number
  onCategory: (cat: ServiceCategory) => void
}) {
  return (
    <motion.div key={`find-${step}`} custom={direction} variants={stepVariants}
      initial="enter" animate="center" exit="exit">
      {step === 0 && (
        <div className="p-6 space-y-4">
          <p className="text-sm text-[#a0a0a0]">
            Contrata músicos de sesión, bandas para eventos, técnicos de audio y productores. Pagos protegidos por escrow.
          </p>
          <CategoryGrid
            categories={SERVICE_CATEGORIES as Array<{ id: ServiceCategory; label: string; description: string; icon: string; accent: 'gold' | 'cyan'; listingCount?: number }>}
            onSelect={onCategory}
          />
        </div>
      )}
      {step === 1 && (
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Star size={12} className="text-[#ffc107] fill-[#ffc107]" />
            <span className="text-[11px] text-[#5a5a5a]">Talentos verificados — ordenados por calificación</span>
          </div>
          <div className="rounded-xl flex items-center justify-center py-12"
            style={{ background: 'rgba(255,193,7,0.03)', border: '1px dashed rgba(255,193,7,0.15)' }}>
            <div className="text-center">
              <Loader2 size={24} className="text-[#ffc107] animate-spin mx-auto mb-3" />
              <p className="text-sm text-[#5a5a5a]">Cargando talentos...</p>
              <p className="text-[11px] text-[#2a2a2a] mt-1">Conectar con API en producción</p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}

// ─── FLOW: Offer Talent ───────────────────────────────────────────────────────

function OfferTalentFlow({
  step,
  direction,
  onCategory,
}: {
  step: number
  direction: number
  onCategory: (cat: ServiceCategory) => void
}) {
  return (
    <motion.div key={`offer-${step}`} custom={direction} variants={stepVariants}
      initial="enter" animate="center" exit="exit">
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
          <p className="text-xs text-[#5a5a5a] uppercase tracking-widest">Perfil de Talento</p>
          <div className="space-y-3">
            {[
              { label: 'Título de tu servicio', placeholder: 'Ej: Guitarrista de Sesión — Rock & Blues' },
              { label: 'Precio desde (USD)', placeholder: '50', type: 'number' },
              { label: 'Precio hasta (USD) — opcional', placeholder: '200', type: 'number' },
              { label: 'Etiqueta de precio', placeholder: 'Ej: por sesión, por canción, por evento' },
            ].map(field => (
              <div key={field.label} className="space-y-1.5">
                <label className="text-xs text-[#a0a0a0]">{field.label}</label>
                <input
                  type={field.type ?? 'text'}
                  placeholder={field.placeholder}
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-[#f2f2f2] placeholder:text-[#2a2a2a] outline-none transition-all duration-250"
                  style={{ background: 'rgba(20,20,20,0.8)', border: '1px solid #1e1e1e' }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(255,193,7,0.4)' }}
                  onBlur={e => { e.target.style.borderColor = '#1e1e1e' }}
                />
              </div>
            ))}
            <div className="space-y-1.5">
              <label className="text-xs text-[#a0a0a0]">Bio / descripción del servicio</label>
              <textarea
                rows={4}
                placeholder="Cuéntanos sobre tu experiencia, géneros, equipos y lo que ofreces..."
                className="w-full px-4 py-2.5 rounded-xl text-sm text-[#f2f2f2] placeholder:text-[#2a2a2a] outline-none resize-none transition-all duration-250"
                style={{ background: 'rgba(20,20,20,0.8)', border: '1px solid #1e1e1e' }}
                onFocus={e => { e.target.style.borderColor = 'rgba(255,193,7,0.4)' }}
                onBlur={e => { e.target.style.borderColor = '#1e1e1e' }}
              />
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
}

export function MarketplaceModals({
  state,
  direction,
  onClose,
  onNext,
  onBack,
}: MarketplaceModalsProps) {
  const { flow, step } = state

  // Close on Escape
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [handleKey])

  // Block scroll when modal is open
  useEffect(() => {
    if (flow) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [flow])

  const FLOW_META: Record<NonNullable<ModalFlow>, {
    title: string
    subtitle?: string
    accent: 'cyan' | 'gold'
    totalSteps: number
  }> = {
    buy: {
      title: 'Quiero Comprar',
      subtitle: 'Equipos, instrumentos y consumibles',
      accent: 'cyan',
      totalSteps: 2,
    },
    sell: {
      title: 'Quiero Vender',
      subtitle: 'Publica tu producto en el marketplace',
      accent: 'gold',
      totalSteps: 3,
    },
    'find-talent': {
      title: 'Busco Talento',
      subtitle: 'Músicos, técnicos y productores',
      accent: 'gold',
      totalSteps: 2,
    },
    'offer-talent': {
      title: 'Ofrezco mi Talento',
      subtitle: 'Crea tu perfil de servicios',
      accent: 'gold',
      totalSteps: 3,
    },
  }

  const meta = flow ? FLOW_META[flow] : null

  const getCurrentStep = () => {
    if (step === 'category') return 0
    if (step === 'form') return 1
    if (step === 'success') return 2
    return 0
  }

  return (
    <AnimatePresence mode="wait">
      {flow && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
          <ModalOverlay onClose={onClose} />

          {flow && meta && (
            <ModalShell
              onClose={onClose}
              title={meta.title}
              subtitle={meta.subtitle}
              accent={meta.accent}
              onBack={step !== 'category' ? onBack : undefined}
              step={getCurrentStep()}
              totalSteps={meta.totalSteps}
            >
              <AnimatePresence mode="wait" custom={direction}>
                {step === 'success' ? (
                  <SuccessScreen
                    key="success"
                    message={
                      flow === 'sell'
                        ? '¡Tu producto fue publicado!'
                        : '¡Tu perfil de talento fue creado!'
                    }
                    onClose={onClose}
                  />
                ) : flow === 'buy' ? (
                  <BuyFlow
                    key="buy"
                    step={step === 'category' ? 0 : 1}
                    direction={direction}
                    onCategory={cat => onNext({ selectedCategory: cat, step: 'form' })}
                  />
                ) : flow === 'sell' ? (
                  <SellFlow
                    key="sell"
                    step={step === 'category' ? 0 : 1}
                    direction={direction}
                    onCategory={cat => onNext({ selectedCategory: cat, step: 'form' })}
                  />
                ) : flow === 'find-talent' ? (
                  <FindTalentFlow
                    key="find"
                    step={step === 'category' ? 0 : 1}
                    direction={direction}
                    onCategory={cat => onNext({ selectedCategory: cat, step: 'form' })}
                  />
                ) : (
                  <OfferTalentFlow
                    key="offer"
                    step={step === 'category' ? 0 : 1}
                    direction={direction}
                    onCategory={cat => onNext({ selectedCategory: cat, step: 'form' })}
                  />
                )}
              </AnimatePresence>

              {/* Footer CTA for form step */}
              {step === 'form' && (flow === 'sell' || flow === 'offer-talent') && (
                <div className="px-6 pb-6 flex gap-3">
                  <button
                    onClick={onBack}
                    className="btn-gradient-outline px-5 py-3 rounded-xl text-sm text-[#a0a0a0] hover:text-[#f2f2f2] transition-colors"
                  >
                    Atrás
                  </button>
                  <button
                    onClick={() => onNext({ step: 'success' })}
                    className="btn-silky-primary flex-1 py-3 rounded-xl text-sm font-semibold"
                  >
                    {flow === 'sell' ? 'Publicar Producto' : 'Crear Perfil'}
                  </button>
                </div>
              )}
            </ModalShell>
          )}
        </div>
      )}
    </AnimatePresence>
  )
}
