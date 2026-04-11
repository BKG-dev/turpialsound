'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { Route } from 'next'
import {
  Music2,
  Mic2,
  Layers,
  SlidersHorizontal,
  Radio,
  Headphones,
  Check,
  Info,
  DollarSign,
  Banknote,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { pricingPackages, type PricingPackage } from '@/content/pricing'

/* ── Icon map ─────────────────────────────────────────────────── */
const iconMap: Record<PricingPackage['iconName'], LucideIcon> = {
  Music2,
  Mic2,
  Layers,
  SlidersHorizontal,
  Radio,
  Headphones,
}

/* ── BCV rate hook ────────────────────────────────────────────── */
interface BcvState {
  rate: number
  isFallback: boolean
  loading: boolean
}

function useBcvRate(): BcvState {
  const [state, setState] = useState<BcvState>({ rate: 50, isFallback: true, loading: true })

  useEffect(() => {
    let cancelled = false
    fetch('/api/bcv-rate')
      .then((r) => r.json())
      .then((data: { rate: number; isFallback: boolean }) => {
        if (!cancelled) setState({ rate: data.rate, isFallback: data.isFallback, loading: false })
      })
      .catch(() => {
        if (!cancelled) setState((s) => ({ ...s, loading: false }))
      })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}

/* ── Price formatting ─────────────────────────────────────────── */
interface PriceDisplay {
  label: string
  prefix: string | null
  amount: string | null
}

function formatPrice(pkg: PricingPackage, currency: 'usd' | 'bs', rate: number): PriceDisplay {
  if (pkg.priceUSD === null) {
    return { label: pkg.priceLabel, prefix: null, amount: null }
  }
  if (currency === 'usd') {
    return { label: pkg.priceLabel, prefix: '$', amount: String(pkg.priceUSD) }
  }
  const bs = Math.round(pkg.priceUSD * rate)
  return { label: pkg.priceLabel, prefix: 'Bs.', amount: bs.toLocaleString('es-VE') }
}

/* ── Card ─────────────────────────────────────────────────────── */
function PriceCard({
  pkg,
  currency,
  bcvRate,
}: {
  pkg: PricingPackage
  currency: 'usd' | 'bs'
  bcvRate: number
}) {
  const Icon = iconMap[pkg.iconName]
  const { label, prefix, amount } = formatPrice(pkg, currency, bcvRate)
  const isGold = pkg.accent === 'gold'
  const accentVar = isGold ? 'var(--color-gold)' : 'var(--color-cyan)'
  const haloClass = isGold ? 'price-halo--gold' : 'price-halo--cyan'

  return (
    <div
      className={cn(
        'card-premium-wrapper',
        isGold ? 'card-premium-wrapper--gold' : '',
        'flex h-full flex-col rounded-2xl bg-brand-surface p-6',
      )}
    >
      {/* Badge — z-[2] para quedar sobre el ring de borde del ::before (z-index:1) */}
      {pkg.badge && (
        <span
          className="absolute -top-3.5 left-1/2 z-[2] -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 font-display text-[8px] tracking-[0.22em] uppercase text-white"
          style={{
            background: 'linear-gradient(135deg, var(--color-cyan), var(--color-cyan-dark))',
            boxShadow: '0 2px 14px rgba(0,174,239,0.45)',
          }}
        >
          {pkg.badge}
        </span>
      )}

      {/*
       * ALINEACIÓN VERTICAL — CAROUSEL EDITION (p-6 = 24px padding)
       *
       *   Icon orb     h-12  (48px)  + mb-5 (20px gap)  →   68px
       *   Nombre       h-7   (28px)                      →   96px
       *   Precio       mt-3 + h-[6.5rem] (104px)         →  212px
       *   Tagline      h-[3rem] (48px)                   →  260px
       *   Divider      my-4 + h-px (17px)                →  277px
       *   Features     flex-1 (dinámico)
       *   CTA          mt-auto (ancla al bottom)
       */}

      {/* ── ZONA 1: Icono — h-12 fijo ─────────────────────────── */}
      <div
        className="mb-5 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
        style={{
          background: isGold
            ? 'linear-gradient(135deg, rgba(255,193,7,0.13) 0%, rgba(255,193,7,0.04) 100%)'
            : 'linear-gradient(135deg, rgba(0,174,239,0.15) 0%, rgba(0,174,239,0.04) 100%)',
          border: isGold ? '1px solid rgba(255,193,7,0.22)' : '1px solid rgba(0,174,239,0.24)',
          boxShadow: isGold
            ? '0 0 22px rgba(255,193,7,0.24), inset 0 1px 0 rgba(255,193,7,0.14)'
            : '0 0 22px rgba(0,174,239,0.30), inset 0 1px 0 rgba(0,174,239,0.18)',
        }}
      >
        <Icon size={20} style={{ color: accentVar }} aria-hidden="true" />
      </div>

      {/* ── ZONA 2: Nombre del servicio — h-7 fijo ──────────────── */}
      <p
        className="h-7 shrink-0 overflow-hidden font-display text-xs tracking-[0.22em] uppercase leading-7"
        style={{
          color: accentVar,
          textShadow: isGold ? '0 0 18px rgba(255,193,7,0.35)' : '0 0 18px rgba(0,174,239,0.4)',
        }}
      >
        {pkg.name}
      </p>

      {/* ── ZONA 3: Bloque de precio — h-[6.5rem] fijo ──────────── */}
      {/* label (9px) · prefijo (text-sm) · monto (2.75rem=44px)    */}
      <div className="mt-3 flex h-[6.5rem] shrink-0 flex-col justify-start overflow-hidden">
        <span className="font-display text-[9px] tracking-[0.22em] uppercase leading-none text-text-muted">
          {label}
        </span>

        {prefix && amount ? (
          <>
            <span
              className="mt-1.5 font-display text-sm tracking-[0.18em] uppercase leading-none"
              style={{ color: accentVar }}
            >
              {prefix}
            </span>
            <span
              className={cn('price-halo mt-2 font-display text-[2.75rem] leading-none', haloClass)}
              style={{
                color: accentVar,
                textShadow: isGold
                  ? '0 2px 24px rgba(255,193,7,0.28)'
                  : '0 2px 24px rgba(0,174,239,0.32)',
              }}
            >
              {amount}
            </span>
          </>
        ) : (
          <span
            className={cn(
              'price-halo mt-2 font-display text-sm leading-snug tracking-[0.08em]',
              haloClass,
            )}
            style={{ color: accentVar }}
          >
            {pkg.priceLabel}
          </span>
        )}
      </div>

      {/* ── ZONA 4: Tagline — h-[3rem] fijo (2 líneas max) ──────── */}
      <p className="h-[3rem] shrink-0 overflow-hidden font-display text-xs leading-[1.6] text-text-secondary">
        {pkg.tagline}
      </p>

      {/* ── DIVISOR — siempre en la misma coordenada Y ─────────── */}
      <div
        className="my-4 h-px w-full shrink-0"
        style={{
          background: isGold
            ? 'linear-gradient(90deg, transparent, rgba(255,193,7,0.18) 50%, transparent)'
            : 'linear-gradient(90deg, transparent, rgba(0,174,239,0.2) 50%, transparent)',
        }}
        aria-hidden="true"
      />

      {/* ── ZONA 5: Features — flex-1, mismo inicio en todas ───── */}
      <ul className="mb-5 flex flex-1 flex-col gap-3">
        {pkg.features.map((feat) => (
          <li key={feat} className="flex items-start gap-2.5">
            <div
              className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded"
              style={{
                background: isGold ? 'rgba(255,193,7,0.1)' : 'rgba(0,174,239,0.1)',
                border: isGold ? '1px solid rgba(255,193,7,0.2)' : '1px solid rgba(0,174,239,0.22)',
              }}
            >
              <Check size={9} style={{ color: accentVar }} aria-hidden="true" />
            </div>
            <span className="font-display text-[11px] leading-[1.6] text-text-secondary">
              {feat}
            </span>
          </li>
        ))}
      </ul>

      {/* ── CTA — mt-auto ancla el botón al fondo en todas ─────── */}
      <Link
        href={pkg.ctaHref as Route}
        className="btn-silky-primary mt-auto inline-flex h-[2.75rem] w-full shrink-0 items-center justify-center rounded-lg font-display text-[10px] tracking-[0.22em] uppercase text-white"
      >
        {pkg.ctaLabel}
      </Link>
    </div>
  )
}

/* ── Main component ───────────────────────────────────────────── */
export function PricingPreview() {
  const [currency, setCurrency] = useState<'usd' | 'bs'>('bs')
  const { rate, isFallback, loading } = useBcvRate()
  const carouselRef = useRef<HTMLDivElement>(null)

  function scroll(dir: 'left' | 'right') {
    const el = carouselRef.current
    if (!el) return
    const maxScroll = el.scrollWidth - el.clientWidth
    const cardWidth = el.clientWidth / 3 + 20
    if (dir === 'right') {
      if (el.scrollLeft >= maxScroll - 10) {
        el.scrollTo({ left: 0, behavior: 'smooth' })
      } else {
        el.scrollBy({ left: cardWidth, behavior: 'smooth' })
      }
    } else {
      if (el.scrollLeft <= 10) {
        el.scrollTo({ left: maxScroll, behavior: 'smooth' })
      } else {
        el.scrollBy({ left: -cardWidth, behavior: 'smooth' })
      }
    }
  }

  useEffect(() => {
    const el = carouselRef.current
    if (!el) return
    const handleWheel = (e: WheelEvent) => {
      const maxScroll = el.scrollWidth - el.clientWidth
      if (e.deltaY > 0 && el.scrollLeft < maxScroll - 1) {
        e.preventDefault()
        el.scrollLeft += e.deltaY
      } else if (e.deltaY < 0 && el.scrollLeft > 1) {
        e.preventDefault()
        el.scrollLeft += e.deltaY
      }
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [])

  return (
    <div className="pb-16">

      {/* ── HEADER ROW: texto izq + controles der ─────────────────── */}
      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between max-w-[1400px] mx-auto">

        {/* Texto */}
        <div>
          <div className="mb-4 flex items-center gap-3">
            <span className="accent-line-animated" aria-hidden="true" />
            <span className="font-display text-xs tracking-[0.25em] uppercase text-gradient-animated">
              Referencia de precios
            </span>
          </div>
          <h2 className="font-display text-display-lg text-text-primary">
            Claridad desde el primer contacto.
          </h2>
          <p className="mt-3 font-display text-body-base text-text-secondary max-w-lg">
            Precios base orientativos en USD o Bolívares. Cada proyecto se ajusta a sus requerimientos.
          </p>
        </div>

        {/* Controles */}
        <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
          <div className="flex items-center gap-3">
            <button
              onClick={() => scroll('left')}
              aria-label="Ver paquetes anteriores"
              className="pricing-nav-btn h-12 w-12"
            >
              <ChevronLeft size={22} aria-hidden="true" />
            </button>
            <button
              onClick={() => scroll('right')}
              aria-label="Ver más paquetes"
              className="pricing-nav-btn h-12 w-12"
            >
              <ChevronRight size={22} aria-hidden="true" />
            </button>

            {/* Toggle pill */}
            <div
              className="glass-surface flex rounded-xl p-1"
              role="group"
              aria-label="Seleccionar moneda"
            >
              <button
                onClick={() => setCurrency('usd')}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-5 py-2.5 font-display text-[10px] tracking-[0.18em] uppercase transition-all duration-350',
                  currency === 'usd'
                    ? 'btn-silky-primary text-white'
                    : 'text-text-secondary hover:text-text-primary',
                )}
                aria-pressed={currency === 'usd'}
              >
                <DollarSign size={11} aria-hidden="true" />
                USD
              </button>
              <button
                onClick={() => setCurrency('bs')}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-5 py-2.5 font-display text-[10px] tracking-[0.18em] uppercase transition-all duration-350',
                  currency === 'bs'
                    ? 'btn-silky-primary text-white'
                    : 'text-text-secondary hover:text-text-primary',
                )}
                aria-pressed={currency === 'bs'}
              >
                <Banknote size={11} aria-hidden="true" />
                Bs.
              </button>
            </div>
          </div>

          {/* BCV note */}
          <div className="flex items-center gap-1.5">
            <Info size={10} style={{ color: 'var(--color-cyan)' }} aria-hidden="true" />
            <span className="whitespace-nowrap font-display text-[9px] tracking-wider text-text-muted">
              {loading
                ? 'Obteniendo tasa BCV…'
                : isFallback
                  ? 'Tasa de referencia (BCV no disponible)'
                  : `1 USD = Bs. ${rate.toLocaleString('es-VE', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 4,
                    })}`}
            </span>
          </div>
        </div>
      </div>

      {/* ── CARRUSEL — ancho completo ──────────────────────────────── */}
      {/* py-6 protege el badge (-top-3.5) y las box-shadows laterales */}
      <div
        ref={carouselRef}
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto scrollbar-none py-6 px-1"
      >
        {pricingPackages.map((pkg) => (
          <div
            key={pkg.id}
            className="flex shrink-0 snap-start flex-col w-[calc(100%-1rem)] sm:w-[calc((100%-1.25rem)/2)] lg:w-[calc((100%-2.5rem)/3)]"
          >
            <PriceCard pkg={pkg} currency={currency} bcvRate={rate} />
          </div>
        ))}
      </div>

      <p className="mt-4 font-display text-[9px] tracking-wider text-text-muted max-w-[1400px] mx-auto">
        * Referencias orientativas. El valor final se confirma en la orden de servicio.
      </p>
    </div>
  )
}
