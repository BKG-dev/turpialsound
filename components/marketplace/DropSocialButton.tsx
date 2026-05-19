'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Gift, Copy, Check, MessageCircle, Loader2 } from 'lucide-react'
import { getOrCreateReferralLink } from '@/actions/marketplace/referrals'
import { REFERRAL_COMMISSION_PERCENT } from '@/lib/marketplace/fees'
import { trackMarketplaceClientEvent } from '@/lib/marketplace/analytics-client'
import { MarketplaceAuthModal } from '@/components/marketplace/MarketplaceAuthModal'
import type { Listing } from '@/types/marketplace'
import type { MpSessionPayload } from '@/lib/marketplace/auth'

type DropSocialButtonProps = {
  listing: Listing
  variant?: 'card' | 'detail'
  currentUserId?: string | null
}

export function DropSocialButton({ listing, variant = 'card', currentUserId = null }: DropSocialButtonProps) {
  const [open, setOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [referralUrl, setReferralUrl] = useState<string | null>(null)
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fetched, setFetched] = useState(false)
  const [localUserId, setLocalUserId] = useState<string | null>(currentUserId)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLocalUserId(currentUserId)
  }, [currentUserId])

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

  const fetchReferralLink = useCallback(async () => {
    if (fetched) return
    setLoading(true)
    setError(null)
    try {
      const res = await getOrCreateReferralLink(listing.id, listing.slug)
      if (res.success && res.code && res.url) {
        setReferralCode(res.code)
        setReferralUrl(`${window.location.origin}${res.url}`)
        setFetched(true)
        trackMarketplaceClientEvent({ eventType: 'referral_link_created', listingId: listing.id, metadataJson: { code: res.code ?? '' } })
      } else {
        setError(res.message ?? 'Error al generar link')
      }
    } catch {
      setError('Error al conectar')
    } finally {
      setLoading(false)
    }
  }, [listing.id, listing.slug, fetched])

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (!localUserId) {
        setAuthOpen(true)
        return
      }
      if (!open) {
        setOpen(true)
        fetchReferralLink()
      } else {
        setOpen(false)
      }
    },
    [localUserId, open, fetchReferralLink],
  )

  const handleAuthSuccess = useCallback((session: MpSessionPayload) => {
    setLocalUserId(session.userId)
    setAuthOpen(false)
    setOpen(true)
    setFetched(false)
    fetchReferralLink()
  }, [fetchReferralLink])

  const handleCopyLink = useCallback(async () => {
    if (!referralUrl) return
    try {
      await navigator.clipboard.writeText(referralUrl)
      setCopied(true)
      trackMarketplaceClientEvent({ eventType: 'referral_copy', listingId: listing.id, metadataJson: { code: referralCode ?? '' } })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable
    }
  }, [referralUrl, referralCode, listing.id])

  const handleWhatsApp = useCallback(() => {
    if (!referralUrl) return
    const price = listing.type === 'product' ? listing.price : listing.priceFrom
    const text = encodeURIComponent(
      `Gana conmigo en Turpial Sound Marketplace! Compra este articulo: ${listing.title} — $${price.toLocaleString()} → ${referralUrl}`,
    )
    trackMarketplaceClientEvent({ eventType: 'referral_whatsapp', listingId: listing.id, metadataJson: { code: referralCode ?? '' } })
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer')
  }, [referralUrl, listing, referralCode])

  const isDetail = variant === 'detail'

  return (
    <>
    <MarketplaceAuthModal
      isOpen={authOpen}
      defaultTab="login"
      onClose={() => setAuthOpen(false)}
      onSuccess={handleAuthSuccess}
    />
    <div className="relative inline-flex" ref={ref}>
      <button
        onClick={handleToggle}
        className={`flex items-center justify-center gap-1 rounded-lg transition-all text-[11px] font-medium ${
          isDetail ? 'px-4 py-2.5 text-sm' : 'px-3 py-1.5'
        }`}
        style={{
          background: open ? 'rgba(255,193,7,0.12)' : 'var(--mp-card-subtle)',
          border: open ? '1px solid rgba(255,193,7,0.35)' : '1px solid var(--mp-border)',
          color: open ? '#ffc107' : 'var(--mp-text-muted)',
        }}
        title="Drop Social — Comparte y gana"
      >
        <Gift size={isDetail ? 16 : 13} />
        {isDetail && 'Drop Social'}
      </button>

      {open && (
        <div
          className="absolute bottom-full left-0 mb-2 z-30 w-64 rounded-xl overflow-hidden"
          style={{
            background: 'var(--mp-panel-solid)',
            border: '1px solid var(--mp-border)',
            boxShadow: 'var(--mp-shadow), 0 8px 32px rgba(0,0,0,0.4)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="px-3 py-2.5 border-b"
            style={{ borderColor: 'var(--mp-border)', background: 'linear-gradient(135deg, rgba(255,193,7,0.08) 0%, transparent 100%)' }}
          >
            <p className="text-[11px] font-semibold text-[#ffc107] flex items-center gap-1.5">
              <Gift size={13} />
              Drop Social
            </p>
            <p className="text-[10px] mt-1" style={{ color: 'var(--mp-text-faint)' }}>
              Comparte este listing y gana <span style={{ color: '#ffc107' }}>{REFERRAL_COMMISSION_PERCENT}%</span> de cada compra que venga de tu link.
            </p>
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2 px-3 py-4">
              <Loader2 size={14} className="animate-spin text-[#ffc107]" />
              <span className="text-xs" style={{ color: 'var(--mp-text-faint)' }}>Generando link...</span>
            </div>
          )}

          {error && (
            <div className="px-3 py-3">
              <p className="text-[11px] text-[#ef4444]">{error}</p>
            </div>
          )}

          {referralUrl && !loading && (
            <>
              <div className="px-3 py-2.5 space-y-1.5">
                <p className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--mp-text-faint)' }}>Tu codigo</p>
                <div
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-mono"
                  style={{ background: 'var(--mp-card-subtle)', border: '1px solid var(--mp-border)', color: '#ffc107' }}
                >
                  <span className="truncate">{referralCode}</span>
                </div>
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
                <span>Compartir por WhatsApp</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
    </>
  )
}
