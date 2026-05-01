export const PLATFORM_FEE = 0.05
export const BANK_FEE = 0.003
export const USDT_FEE = 0.06
export const USD_REFERENCE_RATE = 1

export type BuyerPaymentMethod = 'BINANCE' | 'BANK' | 'PAGO_MOVIL'
export type SellerPayoutMethod = 'BINANCE' | 'BANK' | 'NONE'
export type SellerPayoutCurrency = 'USDT' | 'BS'
export type AppliedRateType = 'BCV' | 'BINANCE' | null

export type ExchangeRateKind = 'BCV' | 'BINANCE'

export type MarketplaceExchangeContext = {
  kind: ExchangeRateKind
  rateValue: number
  source: string
  fechaValor: string
  capturedAt: string
  buyerAmountBs: number | null
  snapshotId: string | null
}

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

export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(value * 100) / 100
}

function positiveRate(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 1
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
      breakdown: 'Payout USDT: 5% plataforma + 0.06 USDT.',
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
    breakdown: `Payout BS: 5% plataforma + 0.3% bancario con tasa ${appliedRateType}.`,
  }
}
