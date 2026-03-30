'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { Mic, Video, Sliders, Music, type LucideIcon } from 'lucide-react'
import { TiltCard } from '@/components/ui/TiltCard'

const ICON_MAP: Record<string, LucideIcon> = {
  Mic,
  Video,
  Sliders,
  Music,
}

interface NuminousServiceCardProps {
  name: string
  tagline: string
  href: string
  iconName: string
  glowColor?: 'cyan' | 'gold'
}

/**
 * Premium service card: TiltCard with reactive halo + animated gradient border +
 * lucide icon. Used in the expanded services grid.
 */
export function NuminousServiceCard({
  name,
  tagline,
  href,
  iconName,
  glowColor = 'cyan',
}: NuminousServiceCardProps) {
  const Icon = ICON_MAP[iconName] ?? Mic
  return (
    <TiltCard
      glowColor={glowColor}
      className="rounded-xl"
    >
      {/* Animated gradient border via btn-gradient-border technique */}
      <Link
        href={href as Route<string>}
        className={[
          'btn-gradient-border group flex items-start gap-5 rounded-xl',
          'bg-brand-bg p-5 transition-all duration-300',
          'hover:bg-brand-surface/60',
        ].join(' ')}
      >
        {/* Icon container with halo glow */}
        <div className="relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
          <span
            className="pointer-events-none absolute inset-0 rounded-lg animate-pulse-glow"
            style={{
              background:
                glowColor === 'cyan'
                  ? 'radial-gradient(circle, rgba(0,174,239,0.18) 0%, transparent 70%)'
                  : 'radial-gradient(circle, rgba(255,193,7,0.18) 0%, transparent 70%)',
            }}
            aria-hidden="true"
          />
          <Icon
            size={17}
            className="relative z-10 shrink-0"
            style={{
              color: glowColor === 'cyan' ? 'var(--color-cyan)' : 'var(--color-gold)',
            }}
            aria-hidden="true"
          />
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base text-gradient-animated">
            {name}
          </h3>
          <p className="mt-1 text-sm text-text-secondary">{tagline}</p>
        </div>
      </Link>
    </TiltCard>
  )
}
