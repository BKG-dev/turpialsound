'use client'

import { motion } from 'framer-motion'
import { MessageCircle } from 'lucide-react'
import { usePathname } from 'next/navigation'

const WA_NUMBER = '584168017844'

export function WhatsAppButton() {
  const pathname = usePathname()

  if (pathname?.startsWith('/marketplace')) {
    return null
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Pulsing rings */}
      {[0, 1].map((i) => (
        <motion.span
          key={i}
          className="pointer-events-none absolute inset-0 rounded-full bg-[#25D366]/25"
          animate={{ scale: [1, 1.85], opacity: [0.45, 0] }}
          transition={{
            duration: 2.2,
            delay: i * 0.9,
            repeat: Infinity,
            ease: 'easeOut',
          }}
          aria-hidden="true"
        />
      ))}

      <motion.a
        href={`https://wa.me/${WA_NUMBER}`}
        target="_blank"
        rel="noopener noreferrer"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 2.5, type: 'spring', stiffness: 220, damping: 18 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl"
        aria-label="Contactar por WhatsApp"
      >
        <MessageCircle size={26} fill="white" strokeWidth={0} />
      </motion.a>
    </div>
  )
}
