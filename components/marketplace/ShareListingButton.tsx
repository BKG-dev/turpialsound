'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Share2, Copy, Check, MessageCircle, ExternalLink } from 'lucide-react'
import { trackMarketplaceClientEvent } from '@/lib/marketplace/analytics-client'
import type { Listing } from '@/types/marketplace'

type ShareListingButtonProps = {
  listing: Listing
  variant?: 'card' | 'detail'
}

function buildShareUrl(slug: string, utmMedium: string): string {
  const base = `${window.location.origin}/marketplace/${slug}`
  const params = new URLSearchParams({
    utm_source: 'share',
    utm_medium: utmMedium,
    utm_campaign: 'listing_share',
  })
  return `${base}?${params.toString()}`
}

function getListingPrice(listing: Listing): string {
  const price = listing.type === 'product' ? listing.price : listing.priceFrom
  return `$${price.toLocaleString()}`
}

export function ShareListingButton({ listing, variant = 'card' }: ShareListingButtonProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleCopyLink = useCallback(async () => {
    const url = buildShareUrl(listing.slug, 'clipboard')
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      trackMarketplaceClientEvent({ eventType: 'share_click', listingId: listing.id, metadataJson: { method: 'clipboard' } })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable
    }
  }, [listing.slug, listing.id])

  const handleWhatsApp = useCallback(() => {
    const url = buildShareUrl(listing.slug, 'whatsapp')
    const price = getListingPrice(listing)
    const text = encodeURIComponent(
      `Mira esto en Turpial Sound Marketplace: ${listing.title} — ${price} → ${url}`,
    )
    trackMarketplaceClientEvent({ eventType: 'share_click', listingId: listing.id, metadataJson: { method: 'whatsapp' } })
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer')
  }, [listing])

  const handleNativeShare = useCallback(async () => {
    const url = buildShareUrl(listing.slug, 'webshare')
    const price = getListingPrice(listing)
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: listing.title,
          text: `Mira esto en Turpial Sound Marketplace: ${listing.title} — ${price}`,
          url,
        })
        trackMarketplaceClientEvent({ eventType: 'share_click', listingId: listing.id, metadataJson: { method: 'webshare' } })
      } catch {
        // user cancelled or unsupported
      }
    } else {
      handleCopyLink()
    }
  }, [listing, handleCopyLink])

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setOpen((p) => !p)
    },
    [],
  )

  const isDetail = variant === 'detail'

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        onClick={handleToggle}
        className={`flex items-center justify-center gap-1 rounded-lg transition-all text-[11px] font-medium ${
          isDetail ? 'px-4 py-2.5 text-sm' : 'px-3 py-1.5'
        }`}
        style={{
          background: open ? 'rgba(168,85,247,0.1)' : 'var(--mp-card-subtle)',
          border: open ? '1px solid rgba(168,85,247,0.25)' : '1px solid var(--mp-border)',
          color: open ? '#a855f7' : 'var(--mp-text-muted)',
        }}
        title="Compartir"
      >
        <Share2 size={isDetail ? 16 : 13} />
        {isDetail && 'Compartir'}
      </button>

      {open && (
        <div
          className="absolute bottom-full left-0 mb-2 z-30 w-52 rounded-xl overflow-hidden"
          style={{
            background: 'var(--mp-panel-solid)',
            border: '1px solid var(--mp-border)',
            boxShadow: 'var(--mp-shadow), 0 8px 32px rgba(0,0,0,0.4)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--mp-border)' }}>
            <p className="text-[10px] uppercase tracking-widest text-[#9a9a9a]">Compartir</p>
          </div>

          <button
            onClick={handleCopyLink}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-xs transition-colors hover:bg-white/5"
            style={{ color: copied ? '#4ade80' : 'var(--mp-text-muted)' }}
          >
            {copied ? <Check size={14} className="text-[#4ade80]" /> : <Copy size={14} />}
            <span>{copied ? 'Link copiado!' : 'Copiar link'}</span>
          </button>

          <button
            onClick={handleWhatsApp}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-xs transition-colors hover:bg-white/5"
            style={{ color: 'var(--mp-text-muted)' }}
          >
            <MessageCircle size={14} className="text-[#25D366]" />
            <span>WhatsApp</span>
          </button>

          {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
            <button
              onClick={handleNativeShare}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-xs transition-colors hover:bg-white/5"
              style={{ color: 'var(--mp-text-muted)' }}
            >
              <ExternalLink size={14} />
              <span>Compartir</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
