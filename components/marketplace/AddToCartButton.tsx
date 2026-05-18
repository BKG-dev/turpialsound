'use client'

import { useState, useCallback, type MouseEvent } from 'react'
import { ShoppingCart, Plus, Minus, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCart } from '@/lib/marketplace/cart-store'
import type { Listing } from '@/types/marketplace'

const UNLIMITED_MAX_QTY = 99

type AddToCartButtonProps = {
  listing: Listing
  currentUserId?: string | null
  variant?: 'card' | 'detail'
}

function getListingCover(listing: Listing): string | null {
  if (listing.type === 'product') {
    return listing.images?.[0] ?? null
  }
  return listing.portfolio?.[0] ?? null
}

export function AddToCartButton({ listing, currentUserId, variant = 'card' }: AddToCartButtonProps) {
  const { addItem, hasItem, removeItem } = useCart()
  const [showQty, setShowQty] = useState(false)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  const alreadyInCart = hasItem(listing.id)
  const isSeller = currentUserId
    ? (listing.type === 'product' ? listing.seller.id : listing.talent.id) === currentUserId
    : false
  const stockCount = listing.type === 'product' && listing.hasInventory && listing.inventory != null
    ? listing.inventory
    : null
  const maxAvailable = stockCount ?? UNLIMITED_MAX_QTY
  const isOutOfStock = maxAvailable < 1
  const isUnavailable = listing.status !== 'active' || isOutOfStock
  const price = listing.type === 'product' ? listing.price : listing.priceFrom
  const sellerName = listing.type === 'product' ? listing.seller.name : listing.talent.name
  const sellerId = listing.type === 'product' ? listing.seller.id : listing.talent.id
  const cover = getListingCover(listing)

  const handleToggleQty = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    if (isSeller || isUnavailable || alreadyInCart) return
    if (!showQty) setQty(1)
    setShowQty((p) => !p)
  }, [isSeller, isUnavailable, alreadyInCart, showQty])

  const handleAdd = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    if (isSeller) return
    if (alreadyInCart) {
      removeItem(listing.id)
      return
    }
    if (maxAvailable < 1) return
    const finalQty = Math.min(qty, maxAvailable)
    addItem({
      listingId: listing.id,
      slug: listing.slug,
      title: listing.title,
      price,
      image: cover,
      sellerName,
      sellerId,
      quantity: finalQty,
      maxAvailable,
    })
    setShowQty(false)
    setAdded(true)
    setTimeout(() => {
      setAdded(false)
    }, 1200)
  }, [listing, price, cover, sellerName, sellerId, qty, maxAvailable, alreadyInCart, addItem, removeItem])

  const handleDecrement = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    setQty((p) => Math.max(1, p - 1))
  }, [])

  const handleIncrement = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    setQty((p) => Math.min(maxAvailable, p + 1))
  }, [maxAvailable])

  const isDetail = variant === 'detail'

  if (isSeller) {
    return (
      <span
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px]"
        style={{ background: 'rgba(255,193,7,0.06)', border: '1px solid rgba(255,193,7,0.15)', color: '#ffc107' }}
      >
        Es tu listing
      </span>
    )
  }

  if (alreadyInCart) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation()
          removeItem(listing.id)
        }}
        className={`flex items-center justify-center gap-1.5 rounded-lg transition-all text-[11px] font-medium ${isDetail ? 'px-4 py-2.5' : 'px-3 py-1.5'}`}
        style={{
          background: 'rgba(255,193,7,0.1)',
          border: '1px solid rgba(255,193,7,0.25)',
          color: '#ffc107',
        }}
        title="Quitar del carrito"
      >
        <Check size={13} />
        En carrito
      </button>
    )
  }

  return (
    <div className="relative inline-flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={handleToggleQty}
        disabled={isUnavailable}
        className={`flex items-center justify-center gap-1.5 rounded-lg transition-all text-[11px] font-medium disabled:opacity-40 disabled:cursor-not-allowed ${
          isDetail ? 'px-5 py-3 text-sm' : 'px-3 py-1.5'
        }`}
        style={{
          background: 'rgba(0,174,239,0.1)',
          border: '1px solid rgba(0,174,239,0.25)',
          color: '#00aeef',
        }}
      >
        <ShoppingCart size={isDetail ? 16 : 13} />
        {isOutOfStock ? 'Sin stock' : isUnavailable ? 'No disponible' : 'Agregar al carrito'}
      </button>

      {stockCount != null && (
        <span className="text-[9px] text-[#7a7a7a] text-center">
          {stockCount} disponibles
        </span>
      )}

      <AnimatePresence>
        {showQty && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="relative z-20 flex w-max items-center gap-1 rounded-lg px-2 py-1.5"
            style={{
              background: 'var(--mp-panel-solid)',
              border: '1px solid var(--mp-border)',
              boxShadow: 'var(--mp-shadow)',
            }}
          >
            <button
              onClick={handleDecrement}
              disabled={qty <= 1}
              className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-white/5 disabled:opacity-30"
              style={{ color: 'var(--mp-text-muted)' }}
              aria-label="Reducir cantidad"
            >
              <Minus size={10} />
            </button>
            <span className="w-7 text-center text-xs font-mono tabular-nums text-[#f2f2f2]">
              {qty}
            </span>
            <button
              onClick={handleIncrement}
              disabled={qty >= maxAvailable}
              className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-white/5 disabled:opacity-30"
              style={{ color: 'var(--mp-text-muted)' }}
              aria-label="Aumentar cantidad"
            >
              <Plus size={10} />
            </button>
            <button
              onClick={handleAdd}
              className="ml-1 flex h-6 items-center justify-center rounded px-2 text-[10px] font-semibold transition-all"
              style={{
                background: 'rgba(74,222,128,0.12)',
                color: '#4ade80',
                border: '1px solid rgba(74,222,128,0.25)',
              }}
            >
              Agregar
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {added && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full"
            style={{
              background: '#4ade80',
              color: '#0a0a0a',
            }}
          >
            <Check size={10} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
