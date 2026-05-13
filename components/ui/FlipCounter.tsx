'use client'

import { useRef, useState, useEffect } from 'react'
import { motion, useInView } from 'framer-motion'

/** Starting value — displayed on first render before the API responds */
const BASE_COUNT = 81000
const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
const DIGIT_H = 4 // rem
const DISPLAY_LENGTH = 6 // always show 6 digits

function numberToDigits(num: number): string[] {
  return String(num).padStart(DISPLAY_LENGTH, '0').split('')
}

function DigitSlot({ digit, delay }: { digit: string; delay: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.5 })
  const targetIndex = DIGITS.indexOf(digit)

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="relative overflow-hidden"
      style={{
        width: '2.8rem',
        height: `${DIGIT_H}rem`,
        background: 'rgba(8,8,8,0.9)',
        border: '1px solid rgba(0,174,239,0.28)',
        borderRadius: '0.375rem',
        boxShadow: '0 0 28px rgba(0,174,239,0.22), 0 0 8px rgba(0,80,200,0.15), inset 0 1px 0 rgba(255,255,255,0.03)',
      }}
    >
      {/* Split-flap divider */}
      <div
        className="pointer-events-none absolute inset-x-0 z-10"
        style={{ top: '50%', height: '1px', background: 'rgba(0,174,239,0.25)' }}
      />
      {/* Scrolling column */}
      <motion.div
        className="flex flex-col"
        initial={{ y: 0 }}
        animate={inView ? { y: `${-targetIndex * DIGIT_H}rem` } : { y: 0 }}
        transition={{ delay, duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
        style={{ willChange: 'transform', filter: 'drop-shadow(0 0 10px rgba(0,174,239,0.55))' }}
      >
        {DIGITS.map((d) => (
          <div
            key={d}
            className="flex shrink-0 items-center justify-center font-display text-gradient-animated"
            style={{
              width: '2.8rem',
              height: `${DIGIT_H}rem`,
              fontSize: '1.75rem',
            }}
          >
            {d}
          </div>
        ))}
      </motion.div>
    </div>
  )
}

export function FlipCounter() {
  const [count, setCount] = useState(BASE_COUNT)

  useEffect(() => {
    // Increment visit counter on each page load and get the updated value.
    // Falls back to BASE_COUNT if the API is unavailable (e.g. during local dev
    // before the first migration is applied).
    fetch('/api/counter', { method: 'POST' })
      .then((r) => r.json())
      .then((data: { count?: number }) => {
        if (typeof data.count === 'number' && data.count >= BASE_COUNT) {
          setCount(data.count)
        }
      })
      .catch(() => {
        // Silently keep the BASE_COUNT display — no error shown to user
      })
  }, [])

  const digits = numberToDigits(count)

  return (
    <div className="flex flex-col items-center py-8">
      <p
        className="font-display tracking-[0.2em] text-sm uppercase mb-5"
        style={{ color: 'var(--color-text-secondary, #c0c0c0)' }}
      >
        Tu presencia resuena. Eres el visitante...
      </p>
      <div className="flex gap-1.5">
        <span className="sr-only">{count} visitantes</span>
        {digits.map((digit, i) => (
          <DigitSlot key={i} digit={digit} delay={i * 0.14} />
        ))}
      </div>
    </div>
  )
}
