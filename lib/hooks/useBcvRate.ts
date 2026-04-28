'use client'

import { useState, useEffect } from 'react'

export interface BcvRateState {
  rate: number
  isFallback: boolean
  loading: boolean
  mode?: string
  source?: string
  asOf?: string
}

/**
 * Hook to fetch and use the BCV reference rate from the local API
 * @returns BcvRateState with rate, loading status, and fallback indicator
 */
export function useBcvRate(): BcvRateState {
  const [state, setState] = useState<BcvRateState>({ 
    rate: 50, 
    isFallback: true, 
    loading: true 
  })

  useEffect(() => {
    let cancelled = false
    
    fetch('/api/bcv-rate', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: { 
        rate: number
        isFallback: boolean
        mode: string
        source: string
        asOf: string
      }) => {
        if (!cancelled) {
          setState({ 
            rate: data.rate, 
            isFallback: data.isFallback, 
            loading: false,
            mode: data.mode,
            source: data.source,
            asOf: data.asOf
          })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState((s) => ({ ...s, loading: false }))
        }
      })
      
    return () => {
      cancelled = true
    }
  }, [])

  return state
}