'use client'

import { useEffect, useRef } from 'react'
import { counter, css, flipClock, theme } from 'flipclock'

interface PaymentFlipCountdownProps {
  initialSeconds: number
}

function toMmSs(value: number): string {
  const safe = Math.max(0, Math.floor(value))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function PaymentFlipCountdown({ initialSeconds }: PaymentFlipCountdownProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!hostRef.current) return

    const instance = flipClock({
      parent: hostRef.current,
      face: counter({
        value: Math.max(0, initialSeconds),
        targetValue: 0,
        countdown: true,
        step: 1,
        format: toMmSs,
      }),
      timer: 1000,
      autoStart: true,
      theme: theme({
        css: css({
          fontSize: '11px',
          width: '1.15rem',
          height: '1.55rem',
          borderRadius: '0.35rem',
          animationDuration: '0.5s',
        }),
      }),
    })

    return () => {
      instance.stop()
      instance.unmount()
    }
  }, [initialSeconds])

  return (
    <div
      className="turpial-flip-clock text-[10px] [&_.flip-clock-group]:!m-0 [&_.flip-clock-group-items]:gap-1 [&_.flip-clock-divider]:text-accent-gold/90 [&_.flip-clock-divider]:h-auto [&_.flip-clock-card]:border [&_.flip-clock-card]:border-accent-gold/30 [&_.flip-clock-card]:shadow-[0_0_10px_rgba(0,174,239,0.15)] [&_.flip-clock-card_.top]:bg-brand-bg [&_.flip-clock-card_.top]:text-accent-gold [&_.flip-clock-card_.bottom]:bg-[#111827] [&_.flip-clock-card_.bottom]:text-accent-gold [&_.flip-clock-card_.top:before]:bg-accent-cyan/40 [&_.flip-clock-card_.bottom:before]:bg-accent-gold/20"
      aria-label="Tiempo restante para pagar"
    >
      <div ref={hostRef} />
    </div>
  )
}
