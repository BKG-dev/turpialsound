'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Bot } from 'lucide-react'
import { MarketplaceAssistant } from '@/components/marketplace/MarketplaceAssistant'

const TURPIAL_LOGO_SRC = '/images/logo-navbar.png'

type MarketplaceAssistantLauncherContextValue = {
  openAssistant: () => void
}

const MarketplaceAssistantLauncherContext = createContext<MarketplaceAssistantLauncherContextValue | null>(null)

export function useMarketplaceAssistantLauncher() {
  const context = useContext(MarketplaceAssistantLauncherContext)

  if (!context) {
    throw new Error('useMarketplaceAssistantLauncher must be used inside MarketplaceAssistantFab')
  }

  return context
}

export function MarketplaceAssistantFab({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const isAdminRoute = pathname?.startsWith('/marketplace/admin') ?? false
  const openAssistant = () => setIsOpen(true)
  const closeAssistant = () => setIsOpen(false)

  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeAssistant()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  return (
    <MarketplaceAssistantLauncherContext.Provider value={{ openAssistant }}>
      {children}

      {!isAdminRoute && (
        <>
          <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-[55] sm:bottom-6 sm:right-6">
            {[0, 1].map((index) => (
              <motion.span
                key={index}
                className="pointer-events-none absolute right-0 top-1/2 h-16 w-16 -translate-y-1/2 rounded-full"
                style={{
                  background: 'rgba(0,174,239,0.2)',
                  boxShadow: '0 0 34px rgba(0,174,239,0.32)',
                }}
                animate={{ scale: [1, 1.85], opacity: [0.42, 0] }}
                transition={{ duration: 2.35, delay: index * 0.9, repeat: Infinity, ease: 'easeOut' }}
                aria-hidden="true"
              />
            ))}

            <motion.button
              type="button"
              onClick={openAssistant}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 220, damping: 18 }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="group relative flex items-center gap-3 rounded-full px-2.5 py-2 pr-3 text-left shadow-2xl transition"
              style={{
                background: 'var(--mp-card)',
                border: '1px solid rgba(0,174,239,0.34)',
                boxShadow: '0 18px 45px rgba(0,0,0,0.24), 0 0 34px rgba(0,174,239,0.22)',
              }}
              aria-label="Abrir Asistente Turpial. Informacion publica sobre compras, ventas y uso del marketplace"
            >
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full"
                style={{
                  background: '#f8fafc',
                  border: '1px solid rgba(0,174,239,0.4)',
                  boxShadow: '0 0 15px rgba(255,255,255,0.1)',
                }}
              >
                <Image
                  src={TURPIAL_LOGO_SRC}
                  alt=""
                  width={40}
                  height={40}
                  className="h-8 w-8 object-contain brightness-90 contrast-125"
                  priority={false}
                />
              </span>
              <span className="hidden min-w-0 flex-col pr-1 sm:flex">
                <span className="text-xs font-semibold leading-tight" style={{ color: 'var(--mp-text)' }}>
                  Asistente Turpial
                </span>
                <span className="mt-0.5 max-w-[12rem] text-[11px] leading-tight" style={{ color: 'var(--mp-text-muted)' }}>
                  Informacion publica sobre compras, ventas y uso del marketplace
                </span>
              </span>
              <Bot size={16} className="hidden shrink-0 text-[#00aeef] sm:block" aria-hidden="true" />
            </motion.button>
          </div>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                className="fixed inset-0 z-[90] flex items-end justify-center p-3 sm:items-center sm:p-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                role="dialog"
                aria-modal="true"
                aria-label="Asistente Turpial"
              >
                <button
                  type="button"
                  className="absolute inset-0 cursor-default"
                  style={{ background: 'rgba(2,6,23,0.58)', backdropFilter: 'blur(10px)' }}
                  onClick={closeAssistant}
                  aria-label="Cerrar asistente"
                />
                <motion.div
                  className="relative z-10 w-full max-w-2xl min-h-0"
                  initial={{ y: 28, scale: 0.98, opacity: 0 }}
                  animate={{ y: 0, scale: 1, opacity: 1 }}
                  exit={{ y: 28, scale: 0.98, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 240, damping: 24 }}
                >
                  <MarketplaceAssistant compact onClose={closeAssistant} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </MarketplaceAssistantLauncherContext.Provider>
  )
}
