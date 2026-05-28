'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Gift,
  Link2,
  Share2,
  DollarSign,
  Zap,
  Eye,
  Infinity as InfinityIcon,
  Wallet,
  ChevronDown,
  Sparkles,
  TrendingUp,
} from 'lucide-react'

const HOW_STEPS = [
  {
    n: '01',
    Icon: Link2,
    title: 'Crea tu link',
    body: 'Entra al Marketplace, elige cualquier producto o servicio y toca el botón de regalo. Tu link único queda listo en segundos.',
  },
  {
    n: '02',
    Icon: Share2,
    title: 'Compártelo',
    body: 'WhatsApp, IG, X, TikTok, tu grupo del estudio — donde quieras. Sin límite de links, sin límite de canales.',
  },
  {
    n: '03',
    Icon: DollarSign,
    title: 'Cobras el 10%',
    body: 'Cuando alguien compra a través de tu link, te cae el 10% de nuestra comisión. Lo ves en tu panel en tiempo real.',
  },
]

const PERKS = [
  {
    Icon: InfinityIcon,
    title: 'Sin tope de ganancia',
    body: 'Si compartes bien, ganas. No hay techo ni cláusula que te detenga.',
  },
  {
    Icon: Zap,
    title: 'Sin límite de links',
    body: 'Cada listing del Marketplace genera un link único tuyo. Comparte uno, comparte mil.',
  },
  {
    Icon: Wallet,
    title: 'Pago directo',
    body: 'Sin filtros, sin retenciones sorpresa. Lo que tu link gana es lo que cobras.',
  },
  {
    Icon: Sparkles,
    title: 'No tienes que vender ni comprar',
    body: 'Te registras solo para compartir y ganar. Eres afiliado, no comerciante.',
  },
]

const FAQ = [
  {
    q: '¿Cuánto gano exactamente por cada venta?',
    a: 'Nuestra plataforma cobra un 5% de fee por cada venta. Te damos el 10% de ese fee, lo que equivale al 0.5% del precio del producto. Lo decimos así para que entiendas que ganas tú porque ganamos nosotros — somos socios en cada venta que traes.',
  },
  {
    q: '¿Cuándo me pagan?',
    a: 'La comisión se acredita en tu panel apenas la transacción queda cerrada (escrow liberado al vendedor). El pago efectivo se libera por el mismo método que usa el marketplace para los sellers.',
  },
  {
    q: '¿Puedo compartir mis propios productos?',
    a: 'Si eres vendedor, no aplica comisión sobre tus propios listings — sería pagarte a ti mismo. Pero puedes compartir cualquier otro producto del marketplace sin restricción.',
  },
  {
    q: '¿Hay tope mensual o anual?',
    a: 'No. No hay tope de comisiones, no hay tope de links, no hay tope de clicks. La única regla es que el comprador llegue desde tu link y complete la compra.',
  },
  {
    q: '¿Qué pasa si el comprador pide reembolso?',
    a: 'Si la venta se cancela o se reembolsa antes de cerrar el escrow, la comisión se revierte. Si la venta ya cerró, la comisión queda firme.',
  },
  {
    q: '¿Necesito empresa o registro fiscal?',
    a: 'No para empezar. A medida que tus comisiones acumuladas crezcan, te avisaremos sobre los requisitos formales aplicables a tu país.',
  },
]

function HeroOrb() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
    >
      <div
        className="absolute h-[36rem] w-[36rem] rounded-full opacity-50 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(255,193,7,0.35) 0%, rgba(0,174,239,0.18) 40%, transparent 70%)',
        }}
      />
      <div
        className="absolute h-[20rem] w-[20rem] rounded-full opacity-60 blur-2xl"
        style={{
          background:
            'radial-gradient(circle, rgba(255,193,7,0.5) 0%, transparent 65%)',
        }}
      />
    </div>
  )
}

function Calculator() {
  const [price, setPrice] = useState(500)
  const [sales, setSales] = useState(10)

  const monthly = useMemo(() => price * sales * 0.005, [price, sales])
  const yearly = monthly * 12

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand-border bg-brand-surface p-8 sm:p-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 60% at 50% 0%, rgba(255,193,7,0.06) 0%, transparent 60%)',
        }}
      />

      <div className="relative grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
        <div>
          <div className="mb-3 flex items-center gap-3">
            <span className="accent-line-animated" aria-hidden="true" />
            <span className="font-display text-xs uppercase tracking-[0.25em] text-gradient-animated">
              Cuánto puedes ganar
            </span>
          </div>
          <h2
            className="font-display text-text-primary"
            style={{ fontSize: 'clamp(1.5rem, 2.6vw, 2.2rem)', lineHeight: 1.15 }}
          >
            Mueve los sliders. Tu estimación se actualiza en vivo.
          </h2>
          <p className="mt-4 text-body-base text-text-secondary">
            Cálculo basado en el 0.5% efectivo sobre el precio bruto (= 10% de nuestra comisión).
            Tus ganancias reales dependen de qué tan bien compartas.
          </p>

          <div className="mt-8 space-y-6">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="price" className="text-xs uppercase tracking-widest text-text-muted">
                  Precio promedio del producto
                </label>
                <span className="font-display text-base text-accent-gold">${fmt(price)}</span>
              </div>
              <input
                id="price"
                type="range"
                min={50}
                max={5000}
                step={50}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="dropsocial-slider w-full"
              />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="sales" className="text-xs uppercase tracking-widest text-text-muted">
                  Ventas tuyas al mes
                </label>
                <span className="font-display text-base text-accent-cyan">{sales}</span>
              </div>
              <input
                id="sales"
                type="range"
                min={1}
                max={100}
                step={1}
                value={sales}
                onChange={(e) => setSales(Number(e.target.value))}
                className="dropsocial-slider w-full"
              />
            </div>
          </div>
        </div>

        <div className="relative flex flex-col items-center justify-center rounded-2xl border border-brand-border bg-brand-bg p-8 text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-text-muted">Al mes</p>
          <p
            className="mt-2 font-display"
            style={{
              fontSize: 'clamp(2.5rem, 7vw, 5rem)',
              lineHeight: 1,
              background: 'linear-gradient(135deg, #00AEEF 0%, #FFC107 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            ${fmt(monthly)}
          </p>
          <div className="mt-6 w-full border-t border-brand-border pt-6">
            <p className="text-[10px] uppercase tracking-[0.3em] text-text-muted">Al año</p>
            <p className="mt-2 font-display text-2xl text-accent-gold">${fmt(yearly)}</p>
          </div>
          <p className="mt-6 text-[11px] text-text-muted">
            Estimación. No es promesa de ingreso.
          </p>
        </div>
      </div>

      <style jsx>{`
        .dropsocial-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 4px;
          background: linear-gradient(
            90deg,
            #00aeef 0%,
            #ffc107 100%
          );
          border-radius: 999px;
          outline: none;
        }
        .dropsocial-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #0a0a0a;
          border: 2px solid #ffc107;
          box-shadow: 0 0 16px rgba(255, 193, 7, 0.4);
          cursor: pointer;
        }
        .dropsocial-slider::-moz-range-thumb {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #0a0a0a;
          border: 2px solid #ffc107;
          box-shadow: 0 0 16px rgba(255, 193, 7, 0.4);
          cursor: pointer;
        }
      `}</style>
    </div>
  )
}

function PanelPreview() {
  const rows = [
    { code: 'ds-x4f7a', clicks: 142, conv: 8, earned: 24.5 },
    { code: 'ds-9k2lm', clicks: 87, conv: 3, earned: 11.25 },
    { code: 'ds-p3qrw', clicks: 256, conv: 14, earned: 52.0 },
  ]
  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand-border bg-brand-surface p-6 sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-text-muted">Acumulado</p>
          <p
            className="mt-1 font-display"
            style={{
              fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
              background: 'linear-gradient(135deg, #00AEEF 0%, #FFC107 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            $87.75
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <TrendingUp size={14} className="text-accent-cyan" />
          este mes
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-brand-border">
        <table className="w-full text-left text-xs">
          <thead className="bg-brand-bg/50">
            <tr className="text-[10px] uppercase tracking-widest text-text-muted">
              <th className="px-3 py-2">Link</th>
              <th className="px-3 py-2 text-right">Clicks</th>
              <th className="px-3 py-2 text-right">Conv.</th>
              <th className="px-3 py-2 text-right">Ganado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.code} className="border-t border-brand-border">
                <td className="px-3 py-3 font-mono text-accent-gold">{r.code}</td>
                <td className="px-3 py-3 text-right text-text-secondary">{r.clicks}</td>
                <td className="px-3 py-3 text-right text-text-secondary">{r.conv}</td>
                <td className="px-3 py-3 text-right text-text-primary">${r.earned.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-[11px] text-text-muted">
        Vista preview. Tu panel real vive en tu dashboard del Marketplace.
      </p>
    </div>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-brand-border">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
        aria-expanded={open}
      >
        <span className="font-display text-base text-text-primary">{q}</span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <p className="pb-5 pr-8 text-body-base text-text-secondary">{a}</p>
      )}
    </div>
  )
}

export function DropSocialLanding() {
  return (
    <main className="bg-brand-bg">
      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <HeroOrb />
        <div className="container-base relative z-10 flex min-h-[88vh] flex-col items-center justify-center py-24 text-center">
          <div className="mb-6 flex items-center gap-3">
            <span
              aria-hidden="true"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl"
              style={{
                background: 'linear-gradient(135deg, #00AEEF 0%, #FFC107 100%)',
              }}
            >
              <Gift size={20} className="text-brand-bg" />
            </span>
            <span
              className="font-display text-sm uppercase"
              style={{
                letterSpacing: '0.25em',
                background: 'linear-gradient(135deg, #00AEEF 0%, #FFC107 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              DropSocial
            </span>
          </div>

          <h1
            className="font-display text-text-primary"
            style={{
              fontSize: 'clamp(2.5rem, 8vw, 6rem)',
              letterSpacing: '0.06em',
              lineHeight: 1.05,
            }}
          >
            comparte.{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #00AEEF 0%, #FFC107 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              suena.
            </span>{' '}
            <span className="text-accent-gold">cobra.</span>
          </h1>

          <p className="mt-8 max-w-2xl text-body-lg text-text-secondary">
            La red social te dio likes. Nosotros te damos el <span className="font-semibold text-accent-gold">10%</span>{' '}
            de nuestra comisión por cada venta que traigan tus links.
          </p>
          <p className="mt-3 text-sm uppercase tracking-[0.3em] text-text-muted">
            sin tope · sin esfuerzo · sin permiso
          </p>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/marketplace/dashboard"
              className="btn-silky-primary inline-flex items-center gap-2 rounded-xl px-10 py-5 text-base font-semibold leading-none transition-all duration-250 hover:brightness-110"
            >
              Empezar a ganar →
            </Link>
            <a
              href="#como-funciona"
              className="font-display text-xs uppercase tracking-widest text-accent-cyan transition-opacity hover:opacity-70"
            >
              ver cómo funciona ↓
            </a>
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ─────────────────────────────────────────────── */}
      <section id="como-funciona" className="section-padding-sm border-t border-brand-border">
        <div className="container-base">
          <div className="mb-12 text-center">
            <div className="mb-4 flex justify-center">
              <span className="accent-line-animated" aria-hidden="true" />
            </div>
            <span className="font-display text-xs uppercase tracking-[0.25em] text-gradient-animated">
              Cómo funciona
            </span>
            <h2
              className="mt-4 font-display text-text-primary"
              style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', lineHeight: 1.1 }}
            >
              Tres pasos. Sin tutoriales.
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {HOW_STEPS.map(({ n, Icon, title, body }) => (
              <div
                key={n}
                className="relative overflow-hidden rounded-2xl border border-brand-border bg-brand-surface p-8"
              >
                <div className="mb-4 flex items-center justify-between">
                  <span
                    className="font-display text-4xl"
                    style={{
                      background: 'linear-gradient(135deg, #00AEEF 0%, #FFC107 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {n}
                  </span>
                  <Icon size={24} className="text-accent-gold" aria-hidden="true" />
                </div>
                <h3 className="font-display text-lg text-text-primary">{title}</h3>
                <p className="mt-3 text-body-base text-text-secondary">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CALCULADORA ───────────────────────────────────────────────── */}
      <section className="section-padding-sm">
        <div className="container-base">
          <Calculator />
        </div>
      </section>

      {/* ── PANEL TRANSPARENTE ────────────────────────────────────────── */}
      <section className="section-padding-sm">
        <div className="container-base">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <span className="accent-line-animated" aria-hidden="true" />
                <span className="font-display text-xs uppercase tracking-[0.25em] text-gradient-animated">
                  Panel transparente
                </span>
              </div>
              <h2
                className="font-display text-text-primary"
                style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', lineHeight: 1.1 }}
              >
                Todo en tiempo real. Sin letra pequeña.
              </h2>
              <p className="mt-5 text-body-base text-text-secondary">
                Cada link tuyo tiene su propia métrica. Clicks, conversiones, dinero acumulado.
                Si una semana no estás generando ventas, lo ves al instante y ajustas. Si una
                campaña pega, también.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  { Icon: Eye, label: 'Clicks y vistas por link' },
                  { Icon: TrendingUp, label: 'Conversiones en tiempo real' },
                  { Icon: DollarSign, label: 'Ganancia acumulada y estado de pago' },
                ].map(({ Icon, label }) => (
                  <li key={label} className="flex items-center gap-3 text-body-base">
                    <Icon size={16} className="text-accent-gold" aria-hidden="true" />
                    <span className="text-text-secondary">{label}</span>
                  </li>
                ))}
              </ul>
            </div>
            <PanelPreview />
          </div>
        </div>
      </section>

      {/* ── PERKS ──────────────────────────────────────────────────────── */}
      <section className="section-padding-sm">
        <div className="container-base">
          <div className="mb-12 text-center">
            <span className="font-display text-xs uppercase tracking-[0.25em] text-gradient-animated">
              Sin límites
            </span>
            <h2
              className="mt-4 font-display text-text-primary"
              style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', lineHeight: 1.1 }}
            >
              Por qué DropSocial es distinto.
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PERKS.map(({ Icon, title, body }) => (
              <div
                key={title}
                className="card-premium-wrapper flex flex-col items-center rounded-2xl bg-brand-surface p-8 text-center"
              >
                <Icon size={28} className="mb-4 text-accent-gold" aria-hidden="true" />
                <h3 className="font-display text-base text-text-primary">{title}</h3>
                <p className="mt-2 text-sm text-text-secondary">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────── */}
      <section className="section-padding-sm border-t border-brand-border">
        <div className="container-base max-w-3xl">
          <div className="mb-10 text-center">
            <span className="font-display text-xs uppercase tracking-[0.25em] text-gradient-animated">
              Preguntas frecuentes
            </span>
            <h2
              className="mt-4 font-display text-text-primary"
              style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', lineHeight: 1.1 }}
            >
              Lo que vas a preguntar.
            </h2>
          </div>
          <div>
            {FAQ.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-t border-brand-border">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 60% 80% at 50% 100%, rgba(0,174,239,0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 80% at 50% 0%, rgba(255,193,7,0.10) 0%, transparent 60%)',
          }}
        />
        <div className="container-base relative z-10 py-24 text-center">
          <h2
            className="font-display text-text-primary"
            style={{
              fontSize: 'clamp(2rem, 6vw, 4.5rem)',
              letterSpacing: '0.06em',
              lineHeight: 1.1,
            }}
          >
            comparte.{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #00AEEF 0%, #FFC107 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              suena.
            </span>{' '}
            <span className="text-accent-gold">cobra.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-body-base text-text-secondary">
            Tu cuenta del Marketplace es tu cuenta de DropSocial. Una sola sesión, dos formas de ganar.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/marketplace/dashboard"
              className="btn-silky-primary inline-flex items-center gap-2 rounded-xl px-10 py-5 text-base font-semibold leading-none transition-all duration-250 hover:brightness-110"
            >
              Crear cuenta y empezar →
            </Link>
            <Link
              href="/marketplace"
              className="font-display text-xs uppercase tracking-widest text-accent-cyan transition-opacity hover:opacity-70"
            >
              explorar el marketplace →
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
