'use client'

import { useEffect, useState } from 'react'

export type DisplayCurrency = 'usd' | 'bs'
export type BcvMode = 'live' | 'stale_last_good' | 'emergency_fallback'

export interface BcvState {
  rate: number
  mode: BcvMode
  source: string
  asOf: string | null
  providersTried: Array<{ name: string; status: string; rate?: number }>
  loading: boolean
}

export interface DisplayCurrencyParts {
  prefix: string
  amount: string
}

const FALLBACK_BCV_RATE = 50

export function useBcvRate(): BcvState {
  const [state, setState] = useState<BcvState>({
    rate: FALLBACK_BCV_RATE,
    mode: 'emergency_fallback',
    source: 'client_emergency_fallback',
    asOf: null,
    providersTried: [],
    loading: true,
  })

  useEffect(() => {
    let cancelled = false

    fetch('/api/bcv-rate')
      .then((response) => response.json())
      .then(
        (data: {
          rate: number
          mode: BcvMode
          source: string
          asOf: string
          providersTried?: Array<{ name: string; status: string; rate?: number }>
        }) => {
          const modeIsValid =
            data.mode === 'live' || data.mode === 'stale_last_good' || data.mode === 'emergency_fallback'
          const rateIsValid = Number.isFinite(data.rate) && data.rate > 0

          if (!modeIsValid || !rateIsValid || !data.source) {
            if (!cancelled) {
              setState((currentState) => ({
                ...currentState,
                loading: false,
                source: 'invalid_api_response',
              }))
            }
            return
          }

          if (!cancelled) {
            setState({
              rate: data.rate,
              mode: data.mode,
              source: data.source,
              asOf: data.asOf ?? null,
              providersTried: data.providersTried ?? [],
              loading: false,
            })
          }
        },
      )
      .catch(() => {
        if (!cancelled) {
          setState((currentState) => ({ ...currentState, loading: false }))
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return state
}

export function formatUsdByCurrencyParts(
  amountUsd: number,
  currency: DisplayCurrency,
  rate: number,
): DisplayCurrencyParts {
  if (currency === 'usd') {
    return { prefix: '$', amount: String(amountUsd) }
  }

  const bsAmount = Math.round(amountUsd * rate)
  return { prefix: 'Bs.', amount: bsAmount.toLocaleString('es-VE') }
}

export function formatUsdByCurrency(amountUsd: number, currency: DisplayCurrency, rate: number): string {
  const parts = formatUsdByCurrencyParts(amountUsd, currency, rate)
  return `${parts.prefix} ${parts.amount}`
}

export function formatBcvReferenceLabel(state: BcvState): string {
  if (state.loading) {
    return 'Obteniendo tasa de referencia USD-Bs...'
  }

  const rateLabel = `1 USD = Bs. ${state.rate.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })}`
  const asOfLabel = state.asOf ? ` (actualizada: ${state.asOf})` : ''

  if (state.mode === 'live') {
    return `Tasa de referencia en vivo (${state.source}): ${rateLabel}${asOfLabel}`
  }

  if (state.mode === 'stale_last_good') {
    return `Tasa de referencia temporal (${state.source}): ${rateLabel}${asOfLabel}`
  }

  return `Tasa de contingencia (${state.source}): ${rateLabel}${asOfLabel}`
}
