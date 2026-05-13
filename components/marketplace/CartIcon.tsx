'use client'

import { useCallback } from 'react'
import { ShoppingBag } from 'lucide-react'
import { useCart } from '@/lib/marketplace/cart-store'

export function CartIcon() {
  const { getCartCount } = useCart()
  const count = getCartCount()

  const handleClick = useCallback(() => {
    window.dispatchEvent(new CustomEvent('turpial:open-cart'))
  }, [])

  return (
    <button
      type="button"
      onClick={handleClick}
      className="mp-authbar-blue-pill relative flex h-6 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-[10px] font-bold leading-none transition-all hover:bg-white/5"
      style={{
        background: count > 0 ? 'rgba(255,193,7,0.08)' : 'transparent',
        color: count > 0 ? '#ffc107' : 'var(--mp-text-muted)',
        borderColor: count > 0 ? 'rgba(255,193,7,0.3)' : 'var(--mp-border)',
      }}
      aria-label={`Carrito${count > 0 ? ` (${count} items)` : ''}`}
    >
      <ShoppingBag size={12} />
      {count > 0 && (
        <span
          className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold tabular-nums leading-none"
          style={{
            background: '#ffc107',
            color: '#0a0a0a',
          }}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
      <span className="hidden xl:inline">Carrito</span>
    </button>
  )
}
