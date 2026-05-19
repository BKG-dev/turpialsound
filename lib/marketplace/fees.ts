/**
 * Marketplace fee configuration — single source of truth.
 * All values can be overridden via environment variables for no-deploy admin changes.
 * 
 * Env vars:
 *   MP_PLATFORM_FEE_PERCENT     — platform commission (default: 5)
 *   MP_INTERBANK_FEE_VES_PERCENT — interbank/pago-movil fee for VES (default: 0.3)
 *   MP_USDT_FLAT_FEE             — flat USDT fee (default: 0.06)
 *   MP_IVA_PERCENT               — VAT (default: 0)
 *   MP_REFERRAL_COMMISSION_PERCENT — Drop Social referral commission (default: 0.5)
 */

function getEnvNumber(key: string, fallback: number): number {
  const raw = process.env[key]
  if (raw === undefined || raw === null || raw === '') return fallback
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

export const PLATFORM_FEE_PERCENT = getEnvNumber('MP_PLATFORM_FEE_PERCENT', 5)
export const INTERBANK_FEE_VES_PERCENT = getEnvNumber('MP_INTERBANK_FEE_VES_PERCENT', 0.3)
export const USDT_FLAT_FEE = getEnvNumber('MP_USDT_FLAT_FEE', 0.06)
export const IVA_PERCENT = getEnvNumber('MP_IVA_PERCENT', 0)
export const REFERRAL_COMMISSION_PERCENT = getEnvNumber('MP_REFERRAL_COMMISSION_PERCENT', 0.5)

/** Drop Social commission as a decimal (0.5% → 0.005) */
export const REFERRAL_COMMISSION_RATE = REFERRAL_COMMISSION_PERCENT / 100

/** Platform fee as a decimal (5% → 0.05) */
export const PLATFORM_FEE_RATE = PLATFORM_FEE_PERCENT / 100

/** Interbank VES fee as a decimal (0.3% → 0.003) */
export const INTERBANK_FEE_VES_RATE = INTERBANK_FEE_VES_PERCENT / 100

/** IVA as a decimal (0% → 0) */
export const IVA_RATE = IVA_PERCENT / 100
