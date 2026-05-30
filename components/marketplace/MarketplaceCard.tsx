'use client'

import { useState } from 'react'
import { Star, MapPin, Clock, Shield, BadgeCheck, Heart, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Listing, ProductListing, ServiceListing } from '@/types/marketplace'
import { MarketplaceImage } from '@/components/marketplace/MarketplaceImage'
import { AddToCartButton } from '@/components/marketplace/AddToCartButton'
import { ShareListingButton } from '@/components/marketplace/ShareListingButton'
import { DropSocialButton } from '@/components/marketplace/DropSocialButton'

function getCoverImage(_category: string, images?: string[]): string | null {
  return images?.find(Boolean) ?? null
}

function ImageFallback({ tone = 'cyan' }: { tone?: 'cyan' | 'gold' }) {
  const color = tone === 'cyan' ? '#00aeef' : '#ffc107'

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-2 text-center"
      style={{
        background: `linear-gradient(135deg, ${color}10 0%, rgba(10,10,10,0.92) 100%)`,
      }}
    >
      <ImageIcon size={22} style={{ color, opacity: 0.68 }} />
      <span className="text-[10px] uppercase tracking-widest text-[#9a9a9a]">Sin foto</span>
    </div>
  )
}

// ─── Condition label map ───────────────────────────────────────────────────────

const CONDITION_LABELS = {
  'new': 'Nuevo',
  'used-like-new': 'Como nuevo',
  'used-good': 'Buen estado',
  'used-fair': 'Estado regular',
} as const

const CONDITION_COLORS = {
  'new': 'text-[#00aeef]',
  'used-like-new': 'text-[#4ade80]',
  'used-good': 'text-[#ffc107]',
  'used-fair': 'text-[#f97316]',
} as const

// ─── Avatar chip ──────────────────────────────────────────────────────────────

function UserChip({ name, initials, verified, rating }: {
  name: string
  initials: string
  verified: boolean
  rating: number
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div className="relative flex-shrink-0">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #00aeef 0%, #0050c8 100%)' }}
        >
          {initials}
        </div>
        {verified && (
          <BadgeCheck
            size={11}
            className="absolute -bottom-0.5 -right-0.5 text-[#00aeef] drop-shadow-sm"
            style={{ filter: 'drop-shadow(0 0 3px rgba(0,174,239,0.6))' }}
          />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs leading-none text-[#f2f2f2]">{name}</p>
        <div className="mt-0.5 flex items-center gap-1">
          <Star size={10} className="text-[#ffc107] fill-[#ffc107]" />
          <span className="text-[11px] text-[#a0a0a0]">{rating.toFixed(1)}</span>
        </div>
      </div>
    </div>
  )
}

function AvailabilityOverlay({ listing }: { listing: Listing }) {
  const isSold = listing.status === 'sold'
  const txStatus = listing.activeTransactionStatus

  if (!isSold && !txStatus) return null

  let label = ''
  let color = '#ef4444' // default red
  let borderColor = 'rgba(239,68,68,0.7)'
  let bgColor = 'rgba(239,68,68,0.15)'
  let glowColor = 'rgba(239,68,68,0.3)'

  if (isSold) {
    label = 'VENDIDO'
  } else if (txStatus === 'PENDING_PAYMENT') {
    label = 'RESERVADO'
    color = '#ffc107'
    borderColor = 'rgba(255,193,7,0.7)'
    bgColor = 'rgba(255,193,7,0.15)'
    glowColor = 'rgba(255,193,7,0.3)'
  } else if (txStatus === 'PAYMENT_RECEIVED' || txStatus === 'VALIDATING') {
    label = 'PAGO EN REVISIÓN'
    color = '#00aeef'
    borderColor = 'rgba(0,174,239,0.7)'
    bgColor = 'rgba(0,174,239,0.15)'
    glowColor = 'rgba(0,174,239,0.3)'
  } else if (txStatus === 'IN_ESCROW') {
    label = 'VENTA EN PROCESO'
    color = '#4ade80'
    borderColor = 'rgba(74,222,128,0.7)'
    bgColor = 'rgba(74,222,128,0.15)'
    glowColor = 'rgba(74,222,128,0.3)'
  } else if (txStatus === 'DELIVERY_CONFIRMED') {
    label = 'ENTREGA CONFIRMADA'
    color = '#4ade80'
    borderColor = 'rgba(74,222,128,0.7)'
    bgColor = 'rgba(74,222,128,0.15)'
    glowColor = 'rgba(74,222,128,0.3)'
  } else if (txStatus === 'DISPUTED') {
    label = 'EN DISPUTA'
    color = '#f97316'
    borderColor = 'rgba(249,115,22,0.7)'
    bgColor = 'rgba(249,115,22,0.15)'
    glowColor = 'rgba(249,115,22,0.3)'
  } else {
    // Other active states (like INITIATED if we ever use it as blocking)
    label = 'NO DISPONIBLE'
  }

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}>
      <span
        className="px-4 py-1.5 rounded-lg text-sm font-bold tracking-widest rotate-[-8deg] text-center"
        style={{
          background: bgColor,
          border: `2px solid ${borderColor}`,
          color: color,
          boxShadow: `0 0 20px ${glowColor}`,
        }}
      >
        {label}
      </span>
    </div>
  )
}

// ─── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({ listing, onClick, isFavorited = false, onToggleFavorite, currentUserId }: {
  listing: ProductListing
  onClick: () => void
  isFavorited?: boolean
  onToggleFavorite?: (id: string) => void
  currentUserId?: string | null
}) {
  const [hovered, setHovered] = useState(false)
  const [localFav, setLocalFav] = useState(isFavorited)
  const [imageFailed, setImageFailed] = useState(false)
  const cover = imageFailed ? null : getCoverImage(listing.category, listing.images)

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick()
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="card-premium-wrapper group h-full w-full overflow-hidden rounded-xl text-left"
      style={{ background: 'var(--mp-card)' }}
    >
      {/* Image area */}
      <div className="relative h-52 rounded-t-xl overflow-hidden bg-[#0d0d0d] sm:h-56" style={{ backgroundColor: 'var(--mp-media-bg)' }}>
        {cover ? (
          <MarketplaceImage
            src={cover}
            alt={listing.title}
            fill
            className="w-full h-full object-cover transition-transform duration-500"
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            style={{ transform: hovered ? 'scale(1.04)' : 'scale(1)' }}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="h-full w-full transition-transform duration-500" style={{ transform: hovered ? 'scale(1.04)' : 'scale(1)' }}>
            <ImageFallback tone="cyan" />
          </div>
        )}

        {/* Badge */}
        {listing.badge && (
          <span className="absolute top-3 left-3 px-2 py-0.5 rounded text-[10px] font-semibold tracking-widest"
            style={{
              background: 'rgba(0,174,239,0.15)',
              border: '1px solid rgba(0,174,239,0.3)',
              color: '#00aeef',
            }}
          >
            {listing.badge}
          </span>
        )}

        {/* Availability overlay */}
        <AvailabilityOverlay listing={listing} />

        {/* Condition */}
        <span className={cn(
          'absolute top-3 right-3 px-2 py-0.5 rounded text-[10px] font-medium z-20',
          'bg-[rgba(10,10,10,0.8)] backdrop-blur-sm',
          CONDITION_COLORS[listing.condition],
        )}>
          {CONDITION_LABELS[listing.condition]}
        </span>

        {/* Rental tag */}
        {listing.rentalAvailable && (
          <span className="absolute bottom-3 left-3 flex items-center gap-1 px-2 py-0.5 rounded text-[10px] z-20"
            style={{
              background: 'rgba(255,193,7,0.15)',
              border: '1px solid rgba(255,193,7,0.3)',
              color: '#ffc107',
            }}
          >
            <Clock size={9} /> Alquiler disponible
          </span>
        )}
      </div>

      {/* Content */}
      <div className="space-y-4 p-5">
        <div>
          <p className="mb-1.5 text-[11px] uppercase tracking-widest text-[#9a9a9a]">
            {listing.subcategory}
          </p>
          <h3 className="line-clamp-2 text-base font-medium leading-snug text-[#f2f2f2] transition-colors duration-250 group-hover:text-[#00aeef]">
            {listing.title}
          </h3>
        </div>

        {/* Price */}
        <div className="flex items-end justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-end gap-x-2 gap-y-1">
            <span className="text-2xl font-semibold text-gradient-gold leading-none">
              ${listing.price.toLocaleString()}
            </span>
            <span className="text-xs text-[#b8b8b8] mb-0.5">{listing.currency}</span>
            {listing.rentalAvailable && listing.rentalPricePerDay && (
              <span className="text-xs text-[#a0a0a0] mb-0.5">
                · ${listing.rentalPricePerDay}/día
              </span>
            )}
          </div>
          {onToggleFavorite && (
            <button
              onClick={e => {
                e.stopPropagation()
                setLocalFav(p => !p)
                onToggleFavorite(listing.id)
              }}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-all duration-200"
              style={{
                background: localFav ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${localFav ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)'}`,
              }}
              title={localFav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
            >
              <Heart size={12} className={localFav ? 'text-[#ef4444] fill-[#ef4444]' : 'text-[#5a5a5a]'} />
            </button>
          )}
        </div>

        {/* Meta row */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t" style={{ borderColor: 'var(--mp-border)' }}>
          <UserChip
            name={listing.seller.name}
            initials={listing.seller.initials}
            verified={listing.seller.verified}
            rating={listing.seller.rating}
          />
          <div className="flex flex-shrink-0 items-center gap-1 text-[11px] text-[#9a9a9a]">
            <MapPin size={10} />
            <span className="truncate max-w-[110px]">{listing.location.split(',')[0]}</span>
          </div>
        </div>

        {/* Escrow badge */}
        <div className="flex items-start gap-2 text-[11px] leading-relaxed text-[#b8b8b8]">
          <Shield size={11} className="mt-0.5 flex-shrink-0 text-[#00aeef] opacity-70" />
          <span>Operacion protegida con revision de pago</span>
        </div>
        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: 'var(--mp-border)' }}>
          <AddToCartButton listing={listing} currentUserId={currentUserId} variant="card" />
          <ShareListingButton listing={listing} variant="card" />
          {(!currentUserId || currentUserId !== listing.seller.id) && (
            <DropSocialButton listing={listing} variant="card" currentUserId={currentUserId ?? null} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Service Card ─────────────────────────────────────────────────────────────

function ServiceCard({ listing, onClick, isFavorited = false, onToggleFavorite, currentUserId }: {
  listing: ServiceListing
  onClick: () => void
  isFavorited?: boolean
  onToggleFavorite?: (id: string) => void
  currentUserId?: string | null
}) {
  const [hovered, setHovered] = useState(false)
  const [localFav, setLocalFav] = useState(isFavorited)
  const [imageFailed, setImageFailed] = useState(false)
  // portfolio[0] takes priority; falls back to category image
  const cover = imageFailed ? null : getCoverImage(listing.category, listing.portfolio)

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick()
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="card-premium-wrapper card-premium-wrapper--gold group h-full w-full overflow-hidden rounded-xl text-left"
      style={{ background: 'var(--mp-card)' }}
    >
      {/* Header band */}
      <div
        className="relative h-52 rounded-t-xl overflow-hidden bg-[#0d0d0d] flex items-center justify-center sm:h-56"
        style={{ backgroundColor: 'var(--mp-media-bg)' }}
      >
        {cover ? (
          <MarketplaceImage
            src={cover}
            alt={listing.title}
            fill
            className="w-full h-full object-cover transition-transform duration-500"
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            style={{ transform: hovered ? 'scale(1.04)' : 'scale(1)' }}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="h-full w-full transition-transform duration-500" style={{ transform: hovered ? 'scale(1.04)' : 'scale(1)' }}>
            <ImageFallback tone="gold" />
          </div>
        )}

        {/* Badge */}
        {listing.badge && (
          <span className="absolute top-3 left-3 px-2 py-0.5 rounded text-[10px] font-semibold tracking-widest"
            style={{
              background: 'rgba(255,193,7,0.15)',
              border: '1px solid rgba(255,193,7,0.3)',
              color: '#ffc107',
            }}
          >
            {listing.badge}
          </span>
        )}

        {/* Availability overlay */}
        <AvailabilityOverlay listing={listing} />

        {/* Delivery */}
        {listing.deliveryDays && (
          <span className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded text-[10px]"
            style={{
              background: 'rgba(10,10,10,0.8)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: '#a0a0a0',
            }}
          >
            <Clock size={9} /> {listing.deliveryDays}d entrega
          </span>
        )}

        {/* Genres */}
        {listing.genres && listing.genres.length > 0 && (
          <div className="absolute bottom-3 left-3 right-3 flex gap-1 flex-wrap">
            {listing.genres.slice(0, 3).map(g => (
              <span key={g} className="text-[9px] px-1.5 py-0.5 rounded"
                style={{ background: 'var(--mp-chip-bg)', color: 'var(--mp-text-muted)', border: '1px solid var(--mp-border)' }}>
                {g}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="space-y-4 p-5">
        <div>
          <p className="mb-1.5 text-[11px] uppercase tracking-widest text-[#9a9a9a]">
            {listing.subcategory}
          </p>
          <h3 className="line-clamp-2 text-base font-medium leading-snug text-[#f2f2f2] transition-colors duration-250 group-hover:text-[#ffc107]">
            {listing.title}
          </h3>
        </div>

        {/* Price */}
        <div className="flex items-end justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-end gap-x-2 gap-y-1">
            <span className="text-[11px] text-[#b8b8b8] mb-0.5">Desde</span>
            <span className="text-2xl font-semibold text-gradient-gold leading-none">
              ${listing.priceFrom.toLocaleString()}
            </span>
            {listing.priceTo && (
              <span className="text-xs text-[#b8b8b8] mb-0.5">– ${listing.priceTo}</span>
            )}
            <span className="text-xs text-[#a0a0a0] mb-0.5">{listing.priceLabel}</span>
          </div>
          {onToggleFavorite && (
            <button
              onClick={e => {
                e.stopPropagation()
                setLocalFav(p => !p)
                onToggleFavorite(listing.id)
              }}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-all duration-200"
              style={{
                background: localFav ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${localFav ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)'}`,
              }}
              title={localFav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
            >
              <Heart size={12} className={localFav ? 'text-[#ef4444] fill-[#ef4444]' : 'text-[#5a5a5a]'} />
            </button>
          )}
        </div>

        {/* Meta row */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t" style={{ borderColor: 'var(--mp-border)' }}>
          <UserChip
            name={listing.talent.name}
            initials={listing.talent.initials}
            verified={listing.talent.verified}
            rating={listing.talent.rating}
          />
          <div className="flex flex-shrink-0 items-center gap-1 text-[11px] text-[#9a9a9a]">
            <span>{listing.talent.reviewCount} reseñas</span>
          </div>
        </div>

        {/* Protected payment badge */}
        <div className="flex items-start gap-2 text-[11px] leading-relaxed text-[#b8b8b8]">
          <Shield size={11} className="mt-0.5 flex-shrink-0 text-[#ffc107] opacity-70" />
          <span>Pago protegido con revision del equipo</span>
        </div>
        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: 'var(--mp-border)' }}>
          <AddToCartButton listing={listing} currentUserId={currentUserId} variant="card" />
          <ShareListingButton listing={listing} variant="card" />
          {(!currentUserId || currentUserId !== listing.talent.id) && (
            <DropSocialButton listing={listing} variant="card" currentUserId={currentUserId ?? null} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Unified export ───────────────────────────────────────────────────────────

export function MarketplaceCard({ listing, onClick, isFavorited = false, onToggleFavorite, currentUserId }: {
  listing: Listing
  onClick?: () => void
  isFavorited?: boolean
  onToggleFavorite?: (id: string) => void
  currentUserId?: string | null
}) {
  const handleClick = onClick ?? (() => {})

  if (listing.type === 'product') {
    return <ProductCard listing={listing} onClick={handleClick} isFavorited={isFavorited} onToggleFavorite={onToggleFavorite} currentUserId={currentUserId} />
  }
  return <ServiceCard listing={listing} onClick={handleClick} isFavorited={isFavorited} onToggleFavorite={onToggleFavorite} currentUserId={currentUserId} />
}
