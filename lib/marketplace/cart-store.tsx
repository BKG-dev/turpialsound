'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { CartItem } from '@/types/marketplace'

const STORAGE_KEY = 'turpial-cart'

type CartContextValue = {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void
  removeItem: (listingId: string) => void
  updateQuantity: (listingId: string, quantity: number) => void
  clearCart: () => void
  getCartTotal: () => number
  getCartCount: () => number
  hasItem: (listingId: string) => boolean
}

const CartContext = createContext<CartContextValue | null>(null)

function loadCart(): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item: unknown) =>
        item &&
        typeof item === 'object' &&
        typeof (item as CartItem).listingId === 'string' &&
        typeof (item as CartItem).slug === 'string' &&
        typeof (item as CartItem).title === 'string' &&
        typeof (item as CartItem).price === 'number' &&
        typeof (item as CartItem).sellerName === 'string' &&
        typeof (item as CartItem).sellerId === 'string' &&
        typeof (item as CartItem).quantity === 'number' &&
        (item as CartItem).quantity > 0,
    )
  } catch {
    return []
  }
}

function saveCart(items: CartItem[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // localStorage full or unavailable
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setItems(loadCart())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) {
      saveCart(items)
    }
  }, [items, hydrated])

  const addItem = useCallback(
    (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.listingId === item.listingId)
        if (existing) return prev
        return [...prev, { ...item, quantity: item.quantity ?? 1 }]
      })
    },
    [],
  )

  const removeItem = useCallback((listingId: string) => {
    setItems((prev) => prev.filter((i) => i.listingId !== listingId))
  }, [])

  const updateQuantity = useCallback((listingId: string, quantity: number) => {
    if (quantity < 1) return
    setItems((prev) =>
      prev.map((i) => (i.listingId === listingId ? { ...i, quantity } : i)),
    )
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  const getCartTotal = useCallback(() => {
    return items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  }, [items])

  const getCartCount = useCallback(() => {
    return items.reduce((sum, i) => sum + i.quantity, 0)
  }, [items])

  const hasItem = useCallback(
    (listingId: string) => items.some((i) => i.listingId === listingId),
    [items],
  )

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        getCartTotal,
        getCartCount,
        hasItem,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
