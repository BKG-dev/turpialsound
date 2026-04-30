'use client'

import { useState, useCallback, useEffect } from 'react'
import { ShoppingCart, MessageSquare, Heart } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckoutModal } from '@/components/marketplace/CheckoutModal'
import { TransactionChat } from '@/components/marketplace/TransactionChat'
import { MarketplaceAuthModal } from '@/components/marketplace/MarketplaceAuthModal'
import { getOrCreateThread } from '@/actions/marketplace'
import { toggleFavorite, getMyFavoriteIds } from '@/actions/marketplace/favorites'
import { trackMarketplaceClientEvent } from '@/lib/marketplace/analytics-client'
import type { Listing, MpTransactionStatus } from '@/types/marketplace'
import type { MpSessionPayload } from '@/lib/marketplace/auth'

export function ListingDetailActions({
  listing,
  sellerId,
  initialUserId,
  initialUserName,
}: {
  listing: Listing
  sellerId: string
  initialUserId: string | null
  initialUserName: string | null
}) {
  const [userId, setUserId] = useState<string | null>(initialUserId)
  const [userName, setUserName] = useState<string | null>(initialUserName)

  const [authOpen, setAuthOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<'checkout' | 'chat' | 'favorite' | null>(null)

  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [localTxStatus, setLocalTxStatus] = useState<MpTransactionStatus | undefined>(listing.activeTransactionStatus)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatThreadId, setChatThreadId] = useState<string | null>(null)
  
  const [isFavorite, setIsFavorite] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  
  // Check if listing is in user's favorites
  useEffect(() => {
    if (!userId) return
    
    const checkFavoriteStatus = async () => {
      try {
        const result = await getMyFavoriteIds()
        if (result.success && result.data) {
          setIsFavorite(result.data.includes(listing.id))
        }
      } catch (error) {
        console.error('Error checking favorite status:', error)
      }
    }
    
    checkFavoriteStatus()
  }, [userId, listing.id])

  useEffect(() => {
    trackMarketplaceClientEvent({ eventType: 'listing_view', listingId: listing.id })
  }, [listing.id])

  useEffect(() => {
    setLocalTxStatus(listing.activeTransactionStatus)
  }, [listing.activeTransactionStatus])

  function requireAuth(action: 'checkout' | 'chat' | 'favorite') {
    setPendingAction(action)
    setAuthOpen(true)
  }
  
  async function handleFavorite() {
    trackMarketplaceClientEvent({ eventType: 'favorite_click', listingId: listing.id })
    if (!userId) { requireAuth('favorite'); return }
    
    setFavoriteLoading(true)
    try {
      const result = await toggleFavorite(listing.id)
      if (result.success) {
        setIsFavorite(result.data?.isFavorited || false)
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
    } finally {
      setFavoriteLoading(false)
    }
  }

  function handleAuthSuccess(s: MpSessionPayload) {
    setUserId(s.userId)
    setUserName(s.displayName)
    setAuthOpen(false)
    const p = pendingAction
    setPendingAction(null)
    if (p === 'checkout') {
      trackMarketplaceClientEvent({ eventType: 'checkout_start', listingId: listing.id })
      setCheckoutOpen(true)
    }
    if (p === 'chat') openChat(s.userId)
    if (p === 'favorite') handleFavorite()
  }

  const openChat = useCallback(async (uid = userId) => {
    setChatOpen(true)
    setChatThreadId(null)
    if (uid) {
      getOrCreateThread(sellerId, listing.id)
        .then(r => { if (r.success && r.data) setChatThreadId(r.data.threadId) })
        .catch(() => {})
    }
  }, [userId, sellerId, listing.id])

  function handleComprar() {
    trackMarketplaceClientEvent({ eventType: 'buy_click', listingId: listing.id })
    if (!userId) { requireAuth('checkout'); return }
    trackMarketplaceClientEvent({ eventType: 'checkout_start', listingId: listing.id })
    setCheckoutOpen(true)
  }

  function handleContactar() {
    if (!userId) { requireAuth('chat'); return }
    openChat()
  }

  const isSeller = userId === sellerId
  const isSold = listing.status === 'sold'
  const txStatus = localTxStatus

  const getStatusLabel = () => {
    switch (txStatus) {
      case 'PENDING_PAYMENT': return 'Reservado temporalmente'
      case 'PAYMENT_RECEIVED':
      case 'VALIDATING': return 'Pago en revisión'
      case 'IN_ESCROW': return 'Venta en proceso'
      case 'DELIVERY_CONFIRMED': return 'Entrega confirmada'
      case 'DISPUTED': return 'Operación en disputa'
      default: return 'Artículo no disponible'
    }
  }

  const isUnavailable = !!txStatus || isSold

  return (
    <>
      {/* Auth Modal */}
      <MarketplaceAuthModal
        isOpen={authOpen}
        defaultTab="login"
        onClose={() => { setAuthOpen(false); setPendingAction(null) }}
        onSuccess={handleAuthSuccess}
      />

      {/* Checkout Modal */}
      <AnimatePresence>
        {checkoutOpen && (
          <CheckoutModal
            listing={listing}
            sellerId={sellerId}
            onClose={() => setCheckoutOpen(false)}
            onSuccess={(status) => setLocalTxStatus(status)}
            onOpenChat={() => {
              setCheckoutOpen(false)
              openChat()
            }}
          />
        )}
      </AnimatePresence>

      {/* Chat Overlay */}
      <AnimatePresence>
        {chatOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setChatOpen(false)}
              className="absolute inset-0"
              style={{ background: 'var(--mp-overlay)', backdropFilter: 'blur(8px)' }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-50 w-full max-w-lg"
              style={{ height: '80vh', maxHeight: '680px' }}
            >
              <TransactionChat
                threadId={chatThreadId ?? undefined}
                currentUserId={userId ?? undefined}
                currentUserName={userName ?? undefined}
                currentUserInitials={userName ? userName.slice(0, 2).toUpperCase() : undefined}
                listingTitle={listing.title}
                listingSlug={listing.slug}
                onClose={() => { setChatOpen(false); setChatThreadId(null) }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CTA Buttons */}
      {!isSeller && (
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex gap-3">
            <button
              onClick={isUnavailable ? undefined : handleComprar}
              disabled={isUnavailable}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-all disabled:cursor-not-allowed"
              style={isUnavailable ? {
                background: 'rgba(239,68,68,0.08)',
                color: '#ef4444',
                border: '1px solid rgba(239,68,68,0.25)',
              } : {
                background: 'linear-gradient(135deg, rgba(0,174,239,0.9) 0%, rgba(0,80,200,0.85) 100%)',
                color: '#fff',
                border: '1px solid rgba(0,174,239,0.4)',
                boxShadow: '0 0 28px rgba(0,174,239,0.2)',
              }}
              onMouseEnter={e => { if (!isUnavailable) (e.currentTarget as HTMLElement).style.boxShadow = '0 0 40px rgba(0,174,239,0.35)' }}
              onMouseLeave={e => { if (!isUnavailable) (e.currentTarget as HTMLElement).style.boxShadow = '0 0 28px rgba(0,174,239,0.2)' }}
            >
              <ShoppingCart size={16} />
              {isSold ? 'Artículo Vendido' : isUnavailable ? getStatusLabel() : 'Comprar Ahora'}
            </button>
            
            {/* Favorite button */}
            <button
              onClick={handleFavorite}
              disabled={favoriteLoading}
              className="w-14 flex items-center justify-center rounded-xl transition-all"
              style={{
                background: isFavorite
                  ? 'rgba(239,68,68,0.1)'
                  : 'var(--mp-card-subtle)',
                color: isFavorite ? '#ef4444' : 'var(--mp-text-muted)',
                border: isFavorite
                  ? '1px solid rgba(239,68,68,0.3)'
                  : '1px solid var(--mp-border)',
              }}
              onMouseEnter={e => {
                if (!favoriteLoading) {
                  if (isFavorite) {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.15)'
                  } else {
                    (e.currentTarget as HTMLElement).style.background = 'var(--mp-card)'
                    ;(e.currentTarget as HTMLElement).style.color = 'var(--mp-text)'
                  }
                }
              }}
              onMouseLeave={e => {
                if (!favoriteLoading) {
                  if (isFavorite) {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'
                  } else {
                    (e.currentTarget as HTMLElement).style.background = 'var(--mp-card-subtle)'
                    ;(e.currentTarget as HTMLElement).style.color = 'var(--mp-text-muted)'
                  }
                }
              }}
            >
              <Heart
                size={16}
                className={`${favoriteLoading ? 'animate-pulse' : ''} ${isFavorite ? 'fill-[#ef4444]' : ''}`}
              />
            </button>
          </div>

          <button
            onClick={handleContactar}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-medium transition-all"
            style={{
              background: 'var(--mp-card-subtle)',
              color: 'var(--mp-text-muted)',
              border: '1px solid var(--mp-border)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'var(--mp-card)'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--mp-text)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'var(--mp-card-subtle)'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--mp-text-muted)'
            }}
          >
            <MessageSquare size={15} />
            Contactar Vendedor
          </button>
        </div>
      )}

      {isSeller && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-xl"
          style={{ background: 'rgba(255,193,7,0.06)', border: '1px solid rgba(255,193,7,0.15)' }}
        >
          <span className="text-[11px] text-[#ffc107]">Este es tu listing.</span>
        </div>
      )}
    </>
  )
}
