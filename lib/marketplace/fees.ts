/**
 * Marketplace financial rules - single source of truth.
 * Historical snapshots are persisted in DB per transaction.
 */

function getEnvNumber(key: string, fallback: number): number {
  const raw = process.env[key]
  if (raw === undefined || raw === null || raw === '') return fallback
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(value * 100) / 100
}

// Confirmed business rules
export const PLATFORM_FEE_RATE = 0.05
export const PLATFORM_FEE_PERCENT = PLATFORM_FEE_RATE * 100

export const DROP_SOCIAL_SHARE_OF_PLATFORM_FEE_RATE = 0.10
export const DROP_SOCIAL_SHARE_OF_PLATFORM_FEE_PERCENT = DROP_SOCIAL_SHARE_OF_PLATFORM_FEE_RATE * 100

export const BANK_PAYOUT_FEE_RATE = 0.003
export const BANK_PAYOUT_FEE_PERCENT = BANK_PAYOUT_FEE_RATE * 100

// Existing configurable values outside the confirmed rules
export const USDT_FLAT_FEE = getEnvNumber('MP_USDT_FLAT_FEE', 0.06)
export const IVA_PERCENT = getEnvNumber('MP_IVA_PERCENT', 0)
export const IVA_RATE = IVA_PERCENT / 100

// Backward-compatible aliases used across modules/UI
export const INTERBANK_FEE_VES_RATE = BANK_PAYOUT_FEE_RATE
export const INTERBANK_FEE_VES_PERCENT = BANK_PAYOUT_FEE_PERCENT
export const REFERRAL_COMMISSION_RATE = PLATFORM_FEE_RATE * DROP_SOCIAL_SHARE_OF_PLATFORM_FEE_RATE
export const REFERRAL_COMMISSION_PERCENT = REFERRAL_COMMISSION_RATE * 100

export function calculatePlatformFee(amount: number): number {
  return roundMoney(Math.max(0, amount) * PLATFORM_FEE_RATE)
}

export function calculateDropSocialCommissionFromPlatformFee(platformFeeAmount: number): number {
  return roundMoney(Math.max(0, platformFeeAmount) * DROP_SOCIAL_SHARE_OF_PLATFORM_FEE_RATE)
}

export function calculateDropSocialCommissionFromSaleAmount(amount: number): number {
  return calculateDropSocialCommissionFromPlatformFee(calculatePlatformFee(amount))
}

export function calculateBankPayoutFee(amount: number): number {
  return roundMoney(Math.max(0, amount) * BANK_PAYOUT_FEE_RATE)
}
