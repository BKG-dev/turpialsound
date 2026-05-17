import { Calendar, TrendingUp, Users, MapPin } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface StatItem {
  value: string
  label: string
  Icon: LucideIcon
}

const stats: StatItem[] = [
  { value: '2015', label: 'Año de fundación', Icon: Calendar },
  { value: '30+', label: 'Años de experiencia', Icon: TrendingUp },
  { value: '100+', label: 'Artistas y proyectos', Icon: Users },
  { value: 'CCS', label: 'Caracas, Venezuela', Icon: MapPin },
]

export function StatsBar() {
  return (
    <div className="border-b border-brand-border bg-brand-surface">
      <div className="container-base">
        <dl className="grid grid-cols-2 divide-x divide-brand-border md:grid-cols-4">
          {stats.map(({ value, label, Icon }) => (
            <div key={label} className="group flex flex-col items-center gap-2 px-6 py-6 text-center">
              <dt className="font-display text-2xl text-gradient-animated leading-none">
                <span className="relative mb-1 flex h-8 w-8 items-center justify-center mx-auto" aria-hidden="true">
                  <span
                    className="pointer-events-none absolute inset-0 rounded-full animate-pulse-glow"
                    style={{
                      background: 'radial-gradient(circle, rgba(0,174,239,0.22) 0%, transparent 70%)',
                    }}
                  />
                  <Icon size={16} className="relative z-10 shrink-0" style={{ color: 'var(--color-cyan)' }} />
                </span>
                <span>{value}</span>
              </dt>
              <dd className="text-xs tracking-wide text-text-secondary uppercase">{label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
