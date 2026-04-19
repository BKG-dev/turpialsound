'use client'

import { useState, useCallback } from 'react'
import { ShoppingCart, MessageSquare } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckoutModal } from '@/components/marketplace/CheckoutModal'
import { TransactionChat } from '@/components/marketplace/TransactionChat'
import { MarketplaceAuthModal } from '@/components/marketplace/MarketplaceAuthModal'
import { getOrCreateThread } from '@/actions/marketplace'
import type { Listing } from '@/types/marketplace'
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
  const [pendingAction, setPendingAction] = useState<'checkout' | 'chat' | null>(null)

  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatThreadId, setChatThreadId] = useState<string | null>(null)

  function requireAuth(action: 'checkout' | 'chat') {
    setPendingAction(action)
    setAuthOpen(true)
  }

  function handleAuthSuccess(s: MpSessionPayload) {
    setUserId(s.userId)
    setUserName(s.displayName)
    setAuthOpen(false)
    const p = pendingAction
    setPendingAction(null)
    if (p === 'checkout') setCheckoutOpen(true)
    if (p === 'chat') openChat(s.userId)
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
    if (!userId) { requireAuth('checkout'); return }
    setCheckoutOpen(true)
  }

  function handleContactar() {
    if (!userId) { requireAuth('chat'); return }
    openChat()
  }

  const isSeller = userId === sellerId
  const isSold = listing.status === 'sold'

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
              style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
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
          <button
            onClick={isSold ? undefined : handleComprar}
            disabled={isSold}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-all disabled:cursor-not-allowed"
            style={isSold ? {
              background: 'rgba(239,68,68,0.08)',
              color: '#ef4444',
              border: '1px solid rgba(239,68,68,0.25)',
            } : {
              background: 'linear-gradient(135deg, rgba(0,174,239,0.9) 0%, rgba(0,80,200,0.85) 100%)',
              color: '#fff',
              border: '1px solid rgba(0,174,239,0.4)',
              boxShadow: '0 0 28px rgba(0,174,239,0.2)',
            }}
            onMouseEnter={e => { if (!isSold) (e.currentTarget as HTMLElement).style.boxShadow = '0 0 40px rgba(0,174,239,0.35)' }}
            onMouseLeave={e => { if (!isSold) (e.currentTarget as HTMLElement).style.boxShadow = '0 0 28px rgba(0,174,239,0.2)' }}
          >
            <ShoppingCart size={16} />
            {isSold ? 'Artículo Vendido' : 'Comprar Ahora'}
          </button>

          <button
            onClick={handleContactar}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-medium transition-all"
            style={{
              background: 'rgba(255,255,255,0.04)',
              color: '#a0a0a0',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'
              ;(e.currentTarget as HTMLElement).style.color = '#f2f2f2'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
              ;(e.currentTarget as HTMLElement).style.color = '#a0a0a0'
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
