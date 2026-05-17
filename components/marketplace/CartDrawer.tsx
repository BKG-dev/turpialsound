'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Minus, Plus, Trash2, ShoppingBag, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCart } from '@/lib/marketplace/cart-store'
import { useMarketplaceSession } from '@/components/marketplace/MarketplaceAuthBar'
import { MarketplaceAuthModal } from '@/components/marketplace/MarketplaceAuthModal'
import { checkoutCart } from '@/actions/marketplace'
import { trackMarketplaceClientEvent } from '@/lib/marketplace/analytics-client'
import type { MpSessionPayload } from '@/lib/marketplace/auth'

const EXPO = [0.16, 1, 0.3, 1] as const

export function CartDrawer() {
  const router = useRouter()
  const { items, removeItem, updateQuantity, clearCart, getCartTotal } = useCart()
  const { session } = useMarketplaceSession()
  const [open, setOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)

  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener('turpial:open-cart', handler)
    return () => window.removeEventListener('turpial:open-cart', handler)
  }, [])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  const handleCheckout = useCallback(async () => {
    if (!session) {
      setAuthOpen(true)
      return
    }
    setCheckingOut(true)
    trackMarketplaceClientEvent({ eventType: 'cart_checkout', metadataJson: { count: items.length, total: getCartTotal() } })

    const checkoutItems = items.map(item => ({
      listingId: item.listingId,
      paymentMethod: 'PAGO_MOVIL',
    }))

    const result = await checkoutCart(checkoutItems)
    setCheckingOut(false)

    if (result.success) {
      clearCart()
      router.push('/marketplace/dashboard?tab=purchases')
    } else {
      alert(result.message || 'Error al iniciar la compra')
    }
  }, [session, items, router, getCartTotal, clearCart])

  const handleAuthSuccess = useCallback((_s: MpSessionPayload) => {
    setAuthOpen(false)
  }, [])

  const total = getCartTotal()
  const isEmpty = items.length === 0

  return (
    <>
      <MarketplaceAuthModal
        isOpen={authOpen}
        defaultTab="login"
        onClose={() => setAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="absolute inset-0"
              style={{ background: 'var(--mp-overlay)', backdropFilter: 'blur(8px)' }}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.35, ease: EXPO }}
              className="relative z-10 flex h-full w-full max-w-md flex-col"
              style={{
                background: 'var(--mp-panel-solid)',
                borderLeft: '1px solid var(--mp-border)',
                boxShadow: 'var(--mp-shadow)',
              }}
            >
              <div
                className="flex flex-shrink-0 items-center justify-between gap-3 border-b px-5 py-4"
                style={{ background: 'rgba(255,193,7,0.04)', borderColor: 'var(--mp-border)' }}
              >
                <div className="flex items-center gap-2">
                  <ShoppingBag size={16} className="text-[#ffc107]" />
                  <h2 className="text-sm font-semibold text-[#f2f2f2]">
                    Tu Carrito
                    {items.length > 0 && (
                      <span className="ml-1.5 text-[11px] font-normal text-[#b8b8b8]">
                        ({items.length} {items.length === 1 ? 'item' : 'items'})
                      </span>
                    )}
                  </h2>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="text-[#5a5a5a] transition-colors hover:text-[#f2f2f2]"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {isEmpty ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-20 px-5 text-center">
                    <ShoppingBag size={32} className="text-[#6a6a6a]" />
                    <div>
                      <p className="text-sm text-[#b8b8b8]">Tu carrito esta vacio</p>
                      <p className="mt-1 text-[11px] text-[#7a7a7a]">
                        Explora el marketplace y agrega productos o servicios.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setOpen(false)
                        router.push('/marketplace')
                      }}
                      className="mt-2 rounded-lg px-4 py-2 text-xs font-medium transition-all"
                      style={{
                        background: 'rgba(0,174,239,0.1)',
                        color: '#00aeef',
                        border: '1px solid rgba(0,174,239,0.25)',
                      }}
                    >
                      Explorar Marketplace
                    </button>
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: 'var(--mp-border)' }}>
                    {items.map((item) => (
                      <div
                        key={item.listingId}
                        className="flex gap-3 px-5 py-4"
                      >
                        <Link
                          href={`/marketplace/${item.slug}`}
                          onClick={() => setOpen(false)}
                          className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg block"
                          style={{ background: 'var(--mp-media-bg)', border: '1px solid var(--mp-border)' }}
                        >
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <ShoppingBag size={16} className="text-[#6a6a6a]" />
                            </div>
                          )}
                        </Link>

                        <div className="flex min-w-0 flex-1 flex-col justify-between">
                          <div>
                            <p className="truncate text-xs font-medium text-[#f2f2f2]">
                              {item.title}
                            </p>
                            <p className="mt-0.5 truncate text-[10px] text-[#9a9a9a]">
                              {item.sellerName}
                            </p>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  if (item.quantity > 1) {
                                    updateQuantity(item.listingId, item.quantity - 1)
                                  }
                                }}
                                disabled={item.quantity <= 1}
                                className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-white/5 disabled:opacity-30"
                                style={{ color: 'var(--mp-text-muted)', border: '1px solid var(--mp-border)' }}
                              >
                                <Minus size={10} />
                              </button>
                              <span className="w-7 text-center text-[11px] font-mono tabular-nums text-[#f2f2f2]">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.listingId, item.quantity + 1)}
                                disabled={item.quantity >= (item.availableQuantity ?? 99)}
                                className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-white/5 disabled:opacity-30"
                                style={{ color: 'var(--mp-text-muted)', border: '1px solid var(--mp-border)' }}
                              >
                                <Plus size={10} />
                              </button>
                            </div>
                            <span className="text-sm font-semibold text-gradient-gold">
                              ${(item.price * item.quantity).toLocaleString()}
                            </span>
                          </div>
                          {item.availableQuantity < 99 && (
                            <p className="mt-0.5 text-[9px] text-[#6a6a6a]">
                              {item.availableQuantity} disponibles
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => removeItem(item.listingId)}
                          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded transition-colors hover:bg-red-500/10"
                          style={{ color: 'var(--mp-text-disabled)' }}
                          title="Eliminar del carrito"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {!isEmpty && (
                <div
                  className="flex-shrink-0 border-t p-5 space-y-4"
                  style={{ borderColor: 'var(--mp-border)' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#b8b8b8]">Subtotal ({items.length} {items.length === 1 ? 'item' : 'items'})</span>
                    <span className="text-lg font-bold text-gradient-gold">
                      ${total.toLocaleString()}
                    </span>
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={checkingOut}
                    className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all disabled:opacity-50"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,193,7,0.9) 0%, rgba(245,158,11,0.85) 100%)',
                      color: '#0a0a0a',
                      border: '1px solid rgba(255,193,7,0.4)',
                      boxShadow: '0 0 28px rgba(255,193,7,0.15)',
                    }}
                    onMouseEnter={(e) => {
                      if (!checkingOut) {
                        ;(e.currentTarget as HTMLElement).style.boxShadow = '0 0 40px rgba(255,193,7,0.3)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      ;(e.currentTarget as HTMLElement).style.boxShadow = '0 0 28px rgba(255,193,7,0.15)'
                    }}
                  >
                    {checkingOut ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Procesando...
                      </>
                    ) : (
                      <>
                        <ShoppingBag size={14} /> Comprar todo
                      </>
                    )}
                  </button>

                  <button
                    onClick={clearCart}
                    className="w-full text-center text-[10px] text-[#5a5a5a] underline-offset-2 hover:underline transition-colors"
                  >
                    Vaciar carrito
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
