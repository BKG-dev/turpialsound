import type { Route } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

type EcosystemNode = {
  title: string
  description: string
  href?: Route
  tag?: string
  accent: 'cyan' | 'gold'
}

const ecosystemNodes: EcosystemNode[] = [
  {
    title: 'Salas de ensayo',
    description: 'Espacio acústico para preparar repertorio, sonido y puesta en escena.',
    href: '/salas-de-ensayo',
    accent: 'gold',
  },
  {
    title: 'Estudio de grabación',
    description: 'Captura profesional con criterio técnico y entorno controlado.',
    href: '/estudio-de-grabacion',
    accent: 'cyan',
  },
  {
    title: 'Producción musical',
    description: 'Del concepto creativo al resultado final, en un solo flujo.',
    href: '/produccion-musical',
    accent: 'gold',
  },
  {
    title: 'Podcast y locución',
    description: 'Formato editorial y sonoro para creadores, marcas y proyectos.',
    href: '/servicios/podcast-locucion',
    accent: 'cyan',
  },
  {
    title: 'Video sessions',
    description: 'Contenido audiovisual para redes, lanzamientos y campañas.',
    href: '/servicios/video-session',
    accent: 'gold',
  },
  {
    title: 'Marketplace musical',
    description: 'Compra, venta y conexión entre músicos, técnicos y productores.',
    href: '/marketplace',
    accent: 'cyan',
  },
  {
    title: 'Reservas y coordinación',
    description: 'Agenda sesiones y activa tu proyecto con una ruta clara.',
    href: '/reservas',
    accent: 'gold',
  },
  {
    title: 'Futuros aliados',
    description: 'Espacio para colaboraciones con marcas, agencias y partners.',
    tag: 'Próximamente',
    accent: 'cyan',
  },
  {
    title: 'Red de creadores',
    description: 'Un punto de encuentro para artistas, equipos y proyectos audiovisuales.',
    tag: 'Próximamente',
    accent: 'gold',
  },
]

interface CreativeEcosystemSectionProps {
  className?: string
}

export function CreativeEcosystemSection({ className }: CreativeEcosystemSectionProps) {
  return (
    <div
      className={cn(
        'card-premium-wrapper rounded-2xl border border-brand-border bg-brand-surface p-6 md:p-8',
        className,
      )}
    >
      <div className="mb-4 flex items-center gap-4">
        <span className="accent-line-animated" aria-hidden="true" />
        <span className="font-display text-xs tracking-[0.25em] uppercase text-gradient-animated">
          El ecosistema Turpial
        </span>
      </div>
      <h3 className="font-display text-display-md text-text-primary">
        Más que un estudio: un ecosistema creativo.
      </h3>
      <p className="mt-4 max-w-[75ch] text-body-base text-text-secondary">
        El hub creativo donde músicos, creadores, marcas y proyectos audiovisuales pueden ensayar,
        grabar, producir, vender, conectar y generar contenido profesional.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ecosystemNodes.map((node) => {
          const card = (
            <>
              <div className="flex items-center justify-between gap-4">
                <h4 className="font-display text-base text-text-primary">{node.title}</h4>
                {node.tag ? (
                  <span
                    className="rounded-full border px-2 py-1 text-[10px] uppercase tracking-wide"
                    style={{
                      borderColor:
                        node.accent === 'cyan' ? 'rgba(0, 174, 239, 0.35)' : 'rgba(255, 193, 7, 0.35)',
                      color: node.accent === 'cyan' ? '#7ddcff' : '#ffd86a',
                    }}
                  >
                    {node.tag}
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">{node.description}</p>
              {node.href ? (
                <p
                  className="mt-4 text-xs font-semibold uppercase tracking-wide"
                  style={{ color: node.accent === 'cyan' ? 'var(--color-cyan)' : 'var(--color-gold)' }}
                >
                  Explorar →
                </p>
              ) : null}
            </>
          )

          if (!node.href) {
            return (
              <div
                key={node.title}
                className="rounded-xl border border-brand-border bg-brand-bg/60 p-5"
              >
                {card}
              </div>
            )
          }

          return (
            <Link
              key={node.title}
              href={node.href}
              className="rounded-xl border border-brand-border bg-brand-bg/60 p-5 transition-all duration-250 hover:-translate-y-0.5 hover:border-accent-cyan/40"
            >
              {card}
            </Link>
          )
        })}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button as="link" href="/reservas" variant="primary" size="sm">
          Reservar ahora
        </Button>
        <Button as="link" href="/servicios" variant="secondary" size="sm">
          Ver servicios
        </Button>
        <Button as="link" href="/marketplace" variant="secondary" size="sm">
          Explorar marketplace
        </Button>
        <Button as="link" href="/contacto" variant="ghost" size="sm">
          Contactar
        </Button>
      </div>
    </div>
  )
}
