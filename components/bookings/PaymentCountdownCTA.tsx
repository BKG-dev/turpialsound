'use client'

import { useEffect, useMemo, useState } from 'react'
import styles from '@/components/bookings/PaymentCountdownCTA.module.css'

interface PaymentCountdownCTAProps {
  initialSeconds: number
  onClick: () => void
}

function two(value: number): string {
  return String(Math.max(0, value)).padStart(2, '0')
}

export function PaymentCountdownCTA({ initialSeconds, onClick }: PaymentCountdownCTAProps) {
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
    const mm = two(Math.floor(secondsLeft / 60))
    const ss = two(secondsLeft % 60)
    return `${mm}:${ss}`
  }, [secondsLeft])

  return (
    <button
      type="button"
      onClick={onClick}
      className={styles.cta}
      aria-label="Pagar en el tiempo restante"
    >
      <span className={styles.shellGlow} />

      <span className={styles.leftPane}>
        <span className={styles.leftLabel}>Pagar en</span>
      </span>

      <span className={styles.timerWindow}>
        <span className={styles.timerGlass} />
        <span className={styles.timerTick} />
        <span className={styles.timerValue}>{countdownLabel}</span>
      </span>
    </button>
  )
}
