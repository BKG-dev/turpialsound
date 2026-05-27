import {
  BANK_PAYOUT_FEE_PERCENT,
  BANK_PAYOUT_FEE_RATE,
  PLATFORM_FEE_PERCENT,
  PLATFORM_FEE_RATE,
  USDT_FLAT_FEE,
} from '@/lib/marketplace/fees'

export const PLATFORM_FEE = PLATFORM_FEE_RATE
export const BANK_FEE = BANK_PAYOUT_FEE_RATE
export const USDT_FEE = USDT_FLAT_FEE
export const USD_REFERENCE_RATE = 0

export type BuyerPaymentMethod = 'BINANCE' | 'BANK' | 'PAGO_MOVIL'
export type SellerPayoutMethod = 'BINANCE' | 'BANK' | 'NONE'
export type SellerPayoutCurrency = 'USDT' | 'BS'
export type AppliedRateType = 'BCV' | 'BINANCE' | null

export type CalculateSellerPayoutParams = {
  amountUSD: number
  buyerPaymentMethod: BuyerPaymentMethod
  sellerPayoutMethod: SellerPayoutMethod
  bcvRate: number
  binanceRate: number
}

export type SellerPayoutCalculation = {
  currency: SellerPayoutCurrency
  platformFeeUSD: number
  bankFeeBS: number
  usdtFee: number
  netUSD: number
  netBS: number
  finalAmount: number
  appliedRateType: AppliedRateType
  breakdown: string
}

/** Frozen-rate display result — used exclusively by the dashboard UI. */
export type FrozenRatePayload = {
  rate: number
  source: string | null
  fechaValor: string | null
  snapshotId: string | null
}

export type TxPayoutDisplay = {
  hasFrozenRate: boolean
  currency: SellerPayoutCurrency
  platformFeeUSD: number
  bankFeeBS: number
  usdtFee: number
  netUSD: number
  netBS: number
  finalAmount: number
  appliedRateType: AppliedRateType
  breakdown: string
}

export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(value * 100) / 100
}

function positiveRate(value: number): number {
  // Server-side: rates are pre-validated before reaching this function.
  // Return 0 as safety net (never fabricate rate=1).
  return Number.isFinite(value) && value > 0 ? value : 0
}

export function calculateSellerPayout(params: CalculateSellerPayoutParams): SellerPayoutCalculation {
  const amountUSD = Math.max(0, roundMoney(params.amountUSD))
  const platformFeeUSD = roundMoney(amountUSD * PLATFORM_FEE)
  const afterPlatformUSD = roundMoney(amountUSD - platformFeeUSD)
  const buyerPaidWithBinance = params.buyerPaymentMethod === 'BINANCE'
  const sellerReceivesBinance = params.sellerPayoutMethod === 'BINANCE'

  if (buyerPaidWithBinance && sellerReceivesBinance) {
    const netUSD = roundMoney(afterPlatformUSD - USDT_FEE)

    return {
      currency: 'USDT',
      platformFeeUSD,
      bankFeeBS: 0,
      usdtFee: USDT_FEE,
      netUSD,
      netBS: 0,
      finalAmount: netUSD,
      appliedRateType: null,
      breakdown: `Payout USDT: ${PLATFORM_FEE_PERCENT}% plataforma + ${USDT_FEE} USDT.`,
    }
  }

  const appliedRateType: Exclude<AppliedRateType, null> = buyerPaidWithBinance ? 'BINANCE' : 'BCV'
  const appliedRate = positiveRate(buyerPaidWithBinance ? params.binanceRate : params.bcvRate)
  const amountAfterPlatformBS = roundMoney(afterPlatformUSD * appliedRate)
  const bankFeeBS = roundMoney(amountAfterPlatformBS * BANK_FEE)
  const netBS = roundMoney(amountAfterPlatformBS - bankFeeBS)
  const netUSD = roundMoney(netBS / appliedRate)

  return {
    currency: 'BS',
    platformFeeUSD,
    bankFeeBS,
    usdtFee: 0,
    netUSD,
    netBS,
    finalAmount: netBS,
    appliedRateType,
    breakdown: `Payout BS: ${PLATFORM_FEE_PERCENT}% plataforma + ${BANK_PAYOUT_FEE_PERCENT}% bancario con tasa ${appliedRateType}.`,
  }
}

/**
 * Dashboard-only: calculate BS/commission display using the transaction's frozen rate.
 *
 * - When frozenRate is present: uses the real rate, never fabricates.
 * - When frozenRate is absent (legacy TX): returns hasFrozenRate=false so the UI
 *   can show honest copy instead of inventing numbers.
 */
export function txPayoutDisplay(params: {
  amountUSD: number
  buyerPaymentMethod: BuyerPaymentMethod
  sellerPayoutMethod: SellerPayoutMethod
  frozenRate: FrozenRatePayload | null
}): TxPayoutDisplay {
  const { amountUSD, buyerPaymentMethod, sellerPayoutMethod, frozenRate } = params

  // Legacy TX: no frozen rate — don't calculate, return placeholder.
  if (!frozenRate || !frozenRate.rate || !Number.isFinite(frozenRate.rate) || frozenRate.rate <= 0) {
    return {
      hasFrozenRate: false,
      currency: sellerPayoutMethod === 'BINANCE' ? 'USDT' : 'BS',
      platformFeeUSD: 0,
      bankFeeBS: 0,
      usdtFee: 0,
      netUSD: 0,
      netBS: 0,
      finalAmount: 0,
      appliedRateType: null,
      breakdown: 'Operación anterior sin tasa congelada',
    }
  }

  const bcvRate = frozenRate.source === 'BCV' ? frozenRate.rate : 0
  const binanceRate = frozenRate.source === 'BINANCE' ? frozenRate.rate : 0

  const calc = calculateSellerPayout({
    amountUSD,
    buyerPaymentMethod,
    sellerPayoutMethod,
    bcvRate,
    binanceRate,
  })

  return {
    hasFrozenRate: true,
    ...calc,
  }
}
