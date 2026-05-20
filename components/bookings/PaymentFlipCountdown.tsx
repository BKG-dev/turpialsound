'use client'

import { useEffect, useRef } from 'react'
import { counter, css, flipClock, theme } from 'flipclock'
import { cn } from '@/lib/utils'

interface PaymentFlipCountdownProps {
  initialSeconds: number
  className?: string
}

function toMmSs(value: number): string {
  const safe = Math.max(0, Math.floor(value))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function PaymentFlipCountdown({ initialSeconds, className }: PaymentFlipCountdownProps) {
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
          fontSize: '10px',
          width: '1.05rem',
          height: '1.4rem',
          borderRadius: '0.35rem',
          animationDuration: '0.45s',
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
      className={cn(
        'turpial-flip-clock text-[10px] [&_.flip-clock-group]:!m-0 [&_.flip-clock-group-items]:gap-[3px] [&_.flip-clock-divider]:mx-[1px] [&_.flip-clock-divider]:text-[#f5c15d] [&_.flip-clock-divider]:h-auto [&_.flip-clock-divider-inner]:text-[11px] [&_.flip-clock-card]:border [&_.flip-clock-card]:border-[#f5c15d]/35 [&_.flip-clock-card]:shadow-[0_0_8px_rgba(245,193,93,0.18)] [&_.flip-clock-card_.top]:bg-[#060a14] [&_.flip-clock-card_.top]:text-[#f5c15d] [&_.flip-clock-card_.bottom]:bg-[#0a1020] [&_.flip-clock-card_.bottom]:text-[#f5c15d] [&_.flip-clock-card_.top:before]:bg-accent-cyan/30 [&_.flip-clock-card_.bottom:before]:bg-[#f5c15d]/20',
        className,
      )}
      aria-label="Tiempo restante para pagar"
    >
      <div ref={hostRef} />
    </div>
  )
}
