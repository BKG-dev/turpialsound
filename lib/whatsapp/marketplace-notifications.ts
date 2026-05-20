import {
  sendWhatsappMessage,
  buildManualWhatsappDeepLink,
  type OutboundWhatsappResult,
} from '@/lib/whatsapp/outbound-provider'

export type MarketplaceWhatsappEvent =
  | 'mp_new_sale'
  | 'mp_payment_received'
  | 'mp_dispute_opened'
  | 'mp_payout_released'
  | 'mp_referral_commission'

interface MarketplaceCustomer {
  phone: string
  name: string
}

interface MarketplaceContext {
  txCode?: string
  listingTitle?: string
  amount?: number
  currency?: string
  appUrl?: string
}

export interface MarketplaceWhatsappResult {
  sent: boolean
  provider: OutboundWhatsappResult['provider'] | 'manual_fallback'
  manualLink?: string | null
  reason?: string
  messageId?: string | null
}

function formatMarketplaceMessage(
  event: MarketplaceWhatsappEvent,
  customer: MarketplaceCustomer,
  ctx: MarketplaceContext,
): string {
  const baseUrl = ctx.appUrl ?? (process.env.APP_URL?.replace(/\/+$/, '') ?? 'https://turpialsong.com')
  const currency = ctx.currency ?? 'USD'

  switch (event) {
    case 'mp_new_sale':
      return [
        `Hola ${customer.name}, recibiste una nueva venta en Turpial Market.`,
        `Producto: ${ctx.listingTitle ?? 'Sin titulo'}.`,
        `Monto: ${currency} ${ctx.amount?.toFixed(2) ?? '0.00'}.`,
        ctx.txCode ? `Referencia: ${ctx.txCode}.` : '',
        `Revisa tu panel: ${baseUrl}/marketplace/dashboard?tab=sales`,
      ].filter(Boolean).join('\n')

    case 'mp_payment_received':
      return [
        `Hola ${customer.name}, tu pago fue recibido y esta en revision.`,
        ctx.txCode ? `Referencia: ${ctx.txCode}.` : '',
        ctx.amount ? `Monto: ${currency} ${ctx.amount.toFixed(2)}.` : '',
        ctx.txCode
          ? `Estado: ${baseUrl}/marketplace/dashboard?tab=purchases`
          : `Revisa tu panel: ${baseUrl}/marketplace/dashboard`,
      ].filter(Boolean).join('\n')

    case 'mp_dispute_opened':
      return [
        `Hola ${customer.name}, se abrio una disputa en tu transaccion.`,
        ctx.txCode ? `Referencia: ${ctx.txCode}.` : '',
        `El equipo revisara el caso y te contactara.`,
        `Panel: ${baseUrl}/marketplace/dashboard`,
      ].filter(Boolean).join('\n')

    case 'mp_payout_released':
      return [
        `Hola ${customer.name}, tus fondos fueron liberados.`,
        ctx.txCode ? `Referencia: ${ctx.txCode}.` : '',
        ctx.amount ? `Monto neto: ${currency} ${ctx.amount.toFixed(2)}.` : '',
        `Revisa tu panel de cobros: ${baseUrl}/marketplace/dashboard?tab=payouts`,
      ].filter(Boolean).join('\n')

    case 'mp_referral_commission':
      return [
        `Hola ${customer.name}, alguien compro usando tu enlace de Drop Social.`,
        `Producto: ${ctx.listingTitle ?? 'Sin titulo'}.`,
        ctx.amount ? `Tu comision: ${currency} ${ctx.amount.toFixed(2)}.` : '',
        `Revisa tus referidos: ${baseUrl}/marketplace/dashboard?tab=referrals`,
      ].filter(Boolean).join('\n')

    default:
      return ''
  }
}

export async function sendMarketplaceWhatsapp(
  event: MarketplaceWhatsappEvent,
  customer: MarketplaceCustomer,
  ctx: MarketplaceContext = {},
  allowManualFallback = true,
): Promise<MarketplaceWhatsappResult> {

  if (!customer.phone) {
    console.warn('[whatsapp.marketplace]', { event, result: 'missing_phone' })
    return { sent: false, provider: 'disabled', reason: 'missing_phone' }
  }

  const message = formatMarketplaceMessage(event, customer, ctx)
  if (!message) {
    console.warn('[whatsapp.marketplace]', { event, result: 'empty_message' })
    return { sent: false, provider: 'disabled', reason: 'empty_message' }
  }

  const outbound = await sendWhatsappMessage({
    to: customer.phone,
    message,
    event,
    publicCode: ctx.txCode ?? 'marketplace',
  })

  if (outbound.ok) {
    console.info('[whatsapp.marketplace]', { event, result: 'ok', provider: outbound.provider })
    return {
      sent: true,
      provider: outbound.provider,
      messageId: outbound.messageId ?? null,
    }
  }

  if (!allowManualFallback) {
    console.warn('[whatsapp.marketplace]', { event, result: 'failed', reason: outbound.reason })
    return {
      sent: false,
      provider: outbound.provider,
      reason: outbound.reason ?? 'outbound_failed',
      messageId: outbound.messageId ?? null,
    }
  }

  const manualLink = buildManualWhatsappDeepLink(customer.phone, message)
  console.info('[whatsapp.marketplace]', { event, result: 'manual_fallback', provider: 'manual_fallback' })
  return {
    sent: false,
    provider: 'manual_fallback',
    reason: outbound.reason ?? 'outbound_failed',
    manualLink,
    messageId: outbound.messageId ?? null,
  }
}
