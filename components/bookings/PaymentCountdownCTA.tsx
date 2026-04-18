'use client'

import { useEffect, useMemo, useState } from 'react'

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
      className="group relative flex w-full items-center overflow-hidden rounded-[14px] border border-accent-cyan/65 bg-gradient-to-r from-[#06162a] via-[#09213c] to-[#0c2950] p-[1px] text-left shadow-[0_0_0_1px_rgba(0,174,239,0.22),0_0_22px_rgba(0,174,239,0.28)] transition-all duration-200 hover:border-accent-cyan/85 hover:shadow-[0_0_0_1px_rgba(0,174,239,0.32),0_0_28px_rgba(0,174,239,0.38)]"
      aria-label="Pagar en el tiempo restante"
    >
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(0,174,239,0.18),transparent_58%)]" />

      <span className="relative flex h-10 min-w-0 flex-1 items-center rounded-l-[13px] bg-gradient-to-r from-[#081a30] via-[#0a223f] to-[#0b2545] px-3.5">
        <span className="text-[13px] font-semibold tracking-[0.1em] text-[#a6ecff]">
          Pagar en
        </span>
      </span>

      <span className="relative flex h-10 items-center rounded-r-[13px] border-l border-accent-cyan/35 bg-gradient-to-r from-[#03070d] via-[#060b14] to-[#090f1a] px-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_0_0_1px_rgba(6,18,33,0.85)]">
        <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.06),rgba(0,0,0,0.32))]" />
        <span className="pointer-events-none absolute inset-y-[30%] left-0 right-0 border-t border-accent-cyan/10" />
        <span className="relative min-w-[4.6rem] text-center font-mono text-[20px] font-semibold tracking-[0.2em] text-[#f4c86b] drop-shadow-[0_0_10px_rgba(244,200,107,0.45)]">
          {countdownLabel}
        </span>
      </span>
    </button>
  )
}
