import type { MarketplaceEmailEvent, EmailRecipient } from './templates'
import {
  buildPasswordResetEmail,
  buildPurchaseConfirmationEmail,
  buildNewSaleEmail,
  buildPaymentReceivedEmail,
  buildPaymentApprovedEmail,
  buildSellerDeliveredEmail,
  buildDeliveryConfirmedEmail,
  buildReferralCommissionEmail,
  buildPayoutReleasedEmail,
  buildPayoutSentEmail,
} from './templates'

type EmailProvider = 'resend' | 'smtp' | 'disabled'

interface SendResult {
  sent: boolean
  provider: EmailProvider
  messageId?: string | null
  reason?: string
}

function getProvider(): EmailProvider {
  const configured = process.env.EMAIL_PROVIDER?.trim().toLowerCase()
  if (configured === 'resend' || configured === 'smtp') return configured
  return 'disabled'
}

async function sendWithResend(params: {
  to: EmailRecipient
  subject: string
  html: string
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { sent: false, provider: 'resend', reason: 'missing_api_key' }

  const fromEmail =
    process.env.MARKETPLACE_EMAIL_FROM
    ?? process.env.EMAIL_FROM
    ?? 'Turpial Market <market@turpialsong.com>'

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [`${params.to.name} <${params.to.email}>`],
        subject: params.subject,
        html: params.html,
      }),
    })

    const data = await response.json().catch(() => null)
    if (!response.ok) {
      return { sent: false, provider: 'resend', reason: data?.message ?? 'resend_error' }
    }

    return { sent: true, provider: 'resend', messageId: data?.id ?? null }
  } catch (err) {
    return { sent: false, provider: 'resend', reason: err instanceof Error ? err.message : 'send_error' }
  }
}

async function sendWithSmtp(_params: {
  to: EmailRecipient
  subject: string
  html: string
}): Promise<SendResult> {
  return { sent: false, provider: 'smtp', reason: 'smtp_not_implemented' }
}

async function sendEmail(params: {
  to: EmailRecipient
  subject: string
  html: string
}): Promise<SendResult> {
  const provider = getProvider()
  if (provider === 'disabled') {
    return { sent: false, provider: 'disabled', reason: 'provider_disabled' }
  }

  if (provider === 'resend') return sendWithResend(params)
  if (provider === 'smtp') return sendWithSmtp(params)
  return { sent: false, provider: 'disabled', reason: 'unknown_provider' }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function sendMarketplaceEmail(
  event: MarketplaceEmailEvent,
  to: EmailRecipient,
  templateData: Record<string, unknown>,
): Promise<SendResult> {
  if (!to.email?.trim()) {
    return { sent: false, provider: getProvider(), reason: 'missing_email' }
  }

  let subject: string
  let html: string

  switch (event) {
    case 'password_reset':
      subject = 'Recupera tu contraseña — Turpial Market'
      html = buildPasswordResetEmail(templateData.resetLink as string, to.name)
      break
    case 'purchase_confirmation':
      subject = 'Compra confirmada — Turpial Market'
      html = buildPurchaseConfirmationEmail(templateData as {
        buyerName: string; listingTitle: string; amount: number; currency: string; txCode: string; txUrl: string
      })
      break
    case 'new_sale':
      subject = 'Nueva venta — Turpial Market'
      html = buildNewSaleEmail(templateData as {
        sellerName: string; listingTitle: string; amount: number; currency: string; txCode: string; txUrl: string
      })
      break
    case 'payment_received':
      subject = 'Pago recibido — Turpial Market'
      html = buildPaymentReceivedEmail(templateData as {
        buyerName: string; txCode: string; amount: number; currency: string; txUrl: string
      })
      break
    case 'payment_approved':
      subject = 'Pago aprobado — Turpial Market'
      html = buildPaymentApprovedEmail(templateData as {
        recipientName: string; recipientRole: 'buyer' | 'seller'; listingTitle: string; txCode: string; txUrl: string
      })
      break
    case 'seller_delivered':
      subject = 'Entrega registrada — Turpial Market'
      html = buildSellerDeliveredEmail(templateData as {
        buyerName: string; listingTitle: string; txCode: string; txUrl: string
      })
      break
    case 'delivery_confirmed':
      subject = 'Recepcion confirmada — Turpial Market'
      html = buildDeliveryConfirmedEmail(templateData as {
        sellerName: string; listingTitle: string; txCode: string; txUrl: string
      })
      break
    case 'referral_commission':
      subject = 'Comisión generada — Turpial Market'
      html = buildReferralCommissionEmail(templateData as {
        referrerName: string; listingTitle: string; commissionAmount: number; currency: string; marketplaceUrl: string
      })
      break
    case 'payout_released':
      subject = 'Fondos liberados — Turpial Market'
      html = buildPayoutReleasedEmail(templateData as {
        sellerName: string; amount: number; currency: string; txCode: string; txUrl: string
      })
      break
    case 'payout_sent':
      subject = "Pago enviado - Turpial Market"
      html = buildPayoutSentEmail(templateData as {
        sellerName: string; amount: number; currency: string; txCode: string; txUrl: string
      })
      break
    default:
      return { sent: false, provider: getProvider(), reason: 'unknown_event' }
  }

  return sendEmail({ to, subject, html })
}

export async function sendPasswordResetEmail(to: EmailRecipient, resetLink: string): Promise<SendResult> {
  return sendMarketplaceEmail('password_reset', to, { resetLink })
}
