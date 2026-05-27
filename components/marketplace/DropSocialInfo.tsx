'use client'

import { Share2, Gift, TrendingUp, Link2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useMarketplaceSession } from '@/components/marketplace/MarketplaceAuthBar'
import { DROP_SOCIAL_SHARE_OF_PLATFORM_FEE_PERCENT } from '@/lib/marketplace/fees'

export function DropSocialInfo() {
  const { session } = useMarketplaceSession()

  const BENEFITS = [
    {
      icon: Link2,
      title: 'Link unico de referido',
      desc: `Comparte tu enlace personal y recibe el ${DROP_SOCIAL_SHARE_OF_PLATFORM_FEE_PERCENT}% de la comision de plataforma por cada venta generada.`,
    },
    {
      icon: Gift,
      title: 'Sin costo para quien compra',
      desc: 'La comision la paga la plataforma. Tus referidos compran al mismo precio.',
    },
    {
      icon: TrendingUp,
      title: 'Acumula sin limite',
      desc: 'Cada venta a traves de tu enlace te genera comision. Sin topes ni minimos.',
    },
  ]

  return (
    <section
      className="section-padding border-t"
      style={{ background: 'var(--mp-panel-soft)', borderColor: 'var(--mp-border)' }}
    >
      <div className="container-base">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="accent-line-animated" />
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#9a9a9a]">Drop Social</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-semibold text-gradient-gold mb-3">
            Comparte y gana
          </h2>
          <p className="max-w-xl text-sm leading-relaxed text-[#b8b8b8]">
            Drop Social es el programa de referidos de Turpial Market. Comparte productos, servicios
            o tu enlace personal y recibe comisiones por cada venta que se concrete.
            Cuando una venta se confirma desde tu enlace, recibes el {DROP_SOCIAL_SHARE_OF_PLATFORM_FEE_PERCENT}% de la comision de Turpial Market.
          </p>
          <p className="mt-2 max-w-xl text-xs leading-relaxed text-[#8e8e8e]">
            Ejemplo: venta de $500 - comision de plataforma $25 - tu comision Drop Social $2.50.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {BENEFITS.map((benefit, i) => {
            const Icon = benefit.icon
            return (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="flex flex-col items-center gap-3 rounded-xl p-6 text-center"
                style={{ background: 'var(--mp-card)', border: '1px solid var(--mp-border)' }}
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: 'rgba(255,193,7,0.1)', border: '1px solid rgba(255,193,7,0.2)' }}
                >
                  <Icon size={18} style={{ color: '#ffc107' }} />
                </div>
                <h3 className="text-sm font-semibold text-[#f2f2f2]">{benefit.title}</h3>
                <p className="text-xs leading-relaxed text-[#b8b8b8]">{benefit.desc}</p>
              </motion.div>
            )
          })}
        </div>

        <div className="flex flex-col items-center gap-4 rounded-2xl p-6"
          style={{ background: 'rgba(255,193,7,0.04)', border: '1px solid rgba(255,193,7,0.12)' }}>
          <p className="text-sm font-semibold text-[#f2f2f2] text-center">
            {session
              ? 'Genera tu link de referido y empieza a ganar comisiones.'
              : 'Unete a Turpial Market para generar tu link de referido.'}
          </p>
          {session ? (
            <a
              href="/marketplace?tab=referrals"
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold transition-all hover:-translate-y-0.5 active:scale-95"
              style={{ background: '#ffc107', color: '#0a0a0a' }}
            >
              <Share2 size={14} />
              Generar mi link de referido
            </a>
          ) : (
            <p className="text-xs text-[#9a9a9a]">
              Inicia sesion o registrate para acceder a Drop Social.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
