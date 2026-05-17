'use client'

import { useEffect, useState } from 'react'

const BASE_COUNT = 81000
const DISPLAY_LENGTH = 6

function numberToDigits(num: number): string[] {
  return String(num).padStart(DISPLAY_LENGTH, '0').split('')
}

export function FlipCounter() {
  const [count, setCount] = useState(BASE_COUNT)
  const digits = numberToDigits(count)

  useEffect(() => {
    const run = () => {
      fetch('/api/counter', { method: 'POST' })
        .then((r) => r.json())
        .then((data: { count?: number }) => {
          if (typeof data.count === 'number' && data.count >= BASE_COUNT) {
            setCount(data.count)
          }
        })
        .catch(() => {
          // Keep BASE_COUNT when endpoint is unavailable.
        })
    }

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const id = window.requestIdleCallback(run, { timeout: 1500 })
      return () => window.cancelIdleCallback(id)
    }

    const timer = setTimeout(run, 800)
    return () => clearTimeout(timer)
  }, [])

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
          <span
            key={i}
            aria-hidden="true"
            className="flex shrink-0 items-center justify-center font-display text-text-primary"
            style={{
              width: '2.8rem',
              height: '4rem',
              fontSize: '1.75rem',
              lineHeight: 1,
              background: 'rgba(8,8,8,0.9)',
              border: '1px solid rgba(0,174,239,0.2)',
              borderRadius: '0.375rem',
              boxShadow: '0 0 14px rgba(0,174,239,0.18)',
            }}
          >
            {digit}
          </span>
        ))}
      </div>
    </div>
  )
}
