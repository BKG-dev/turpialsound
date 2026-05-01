'use client'

import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import styles from '@/components/bookings/PaymentCountdownCTA.module.css'

interface PaymentCountdownCTAProps {
  initialSeconds: number
}

function two(value: number): string {
  return String(Math.max(0, value)).padStart(2, '0')
}

export function PaymentCountdownCTA({ initialSeconds }: PaymentCountdownCTAProps) {
  const [secondsLeft, setSecondsLeft] = useState(Math.max(0, Math.floor(initialSeconds)))

  useEffect(() => {
    setSecondsLeft(Math.max(0, Math.floor(initialSeconds)))
  }, [initialSeconds])

  useEffect(() => {
    if (secondsLeft <= 0) return
    const id = window.setInterval(() => {
      setSecondsLeft((current) => (current > 0 ? current - 1 : 0))
    }, 1000)
    return () => window.clearInterval(id)
  }, [secondsLeft])

  const countdownLabel = useMemo(() => {
    const minutes = two(Math.floor(secondsLeft / 60))
    const seconds = two(secondsLeft % 60)
    return `${minutes}:${seconds}`
  }, [secondsLeft])

  return (
    <div
      className={cn(
        'btn-silky-primary inline-flex w-full items-center justify-between gap-5 rounded-xl px-8 py-4 text-base text-left',
        'font-semibold transition-all duration-250',
        styles.cta,
      )}
      aria-label="Tiempo restante para completar el pago"
      aria-live="polite"
    >
      <span className={styles.label}>Completa tu pago en</span>
      <span className={styles.timeValue}>{countdownLabel}</span>
    </div>
  )
}
