'use client'

import { useState } from 'react'
import Image from 'next/image'
import { TiltCard } from '@/components/ui/TiltCard'

interface NuminousPersonCardProps {
  name: string
  role: string
  bio: string
  imageSrc?: string
  accent: 'gold' | 'cyan'
}

/**
 * Numinous person card: TiltCard with reactive halo, photo with graceful fallback,
 * and accent-colored role line. Used for team (Nosotros) and artists (Artistas).
 */
export function NuminousPersonCard({
  name,
  role,
  bio,
  imageSrc,
  accent,
}: NuminousPersonCardProps) {
  const [imgError, setImgError] = useState(false)

  const borderColor = accent === 'cyan' ? 'rgba(0,174,239,0.22)' : 'rgba(255,193,7,0.22)'
  const accentHex   = accent === 'cyan' ? '#00AEEF' : '#FFC107'
  const glowBg      =
    accent === 'cyan'
      ? 'radial-gradient(circle, rgba(0,174,239,0.22) 0%, rgba(0,174,239,0.05) 100%)'
      : 'radial-gradient(circle, rgba(255,193,7,0.22) 0%, rgba(255,193,7,0.05) 100%)'

  const showImage = !!imageSrc && !imgError

  return (
    <TiltCard glowColor={accent} className="h-full">
      <div
        className="h-full rounded-2xl bg-brand-surface p-8 transition-all duration-350"
        style={{ border: `1px solid ${borderColor}` }}
      >
        {/* Avatar / Photo */}
        <div
          className="relative mb-6 h-20 w-20 overflow-hidden rounded-full"
          style={{ background: glowBg, border: `1px solid ${borderColor}` }}
          aria-hidden={!showImage}
        >
          {showImage && (
            <Image
              src={imageSrc}
              alt={name}
              fill
              sizes="80px"
              className="object-cover"
              onError={() => setImgError(true)}
            />
          )}
        </div>

        <h2 className="font-display text-lg text-text-primary">{name}</h2>
        <p className="mt-1 text-sm" style={{ color: accentHex }}>
          {role}
        </p>
        <p className="mt-4 text-sm text-text-secondary leading-relaxed">{bio}</p>
      </div>
    </TiltCard>
  )
}
