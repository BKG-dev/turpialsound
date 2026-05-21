// ─── Email template types ─────────────────────────────────────────────────────

export type MarketplaceEmailEvent =
  | 'password_reset'
  | 'purchase_confirmation'
  | 'new_sale'
  | 'payment_received'
  | 'payment_approved'
  | 'seller_delivered'
  | 'delivery_confirmed'
  | 'referral_commission'
  | 'payout_released'

export interface EmailRecipient {
  email: string
  name: string
}

export interface EmailContext {
  appUrl: string
  marketplaceUrl: string
  logoUrl: string
}

function getContext(): EmailContext {
  return {
    appUrl: process.env.APP_URL?.replace(/\/+$/, '') ?? 'https://turpialsong.com',
    marketplaceUrl: `${process.env.APP_URL?.replace(/\/+$/, '') ?? 'https://turpialsong.com'}/marketplace`,
    logoUrl: `${process.env.APP_URL?.replace(/\/+$/, '') ?? 'https://turpialsong.com'}/images/logo-navbar.png`,
  }
}

const BRAND_COLOR = '#00aeef'
const BG_COLOR = '#0a0a0a'
const TEXT_COLOR = '#f2f2f2'
const MUTED_COLOR = '#9a9a9a'

function baseTemplate(body: string, ctx: EmailContext): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${BG_COLOR};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${BG_COLOR};padding:40px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#111;border-radius:16px;border:1px solid rgba(255,255,255,0.06);">
      <tr><td style="padding:32px 40px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06);">
        <img src="${ctx.logoUrl}" alt="Turpial Sound" width="36" height="31" style="display:block;margin:0 auto 8px;" />
        <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:0.2em;color:${BRAND_COLOR};text-transform:uppercase;">Turpial Market</p>
      </td></tr>
      <tr><td style="padding:32px 40px;">
        ${body}
      </td></tr>
      <tr><td style="padding:24px 40px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
        <p style="margin:0;font-size:10px;color:${MUTED_COLOR};">Turpial Sound — Marketplace musical de Venezuela</p>
        <p style="margin:4px 0 0;font-size:10px;color:${MUTED_COLOR};">
          <a href="${ctx.marketplaceUrl}" style="color:${BRAND_COLOR};text-decoration:none;">Ir al Marketplace</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
}

// ─── Template builders ───────────────────────────────────────────────────────

export function buildPasswordResetEmail(resetLink: string, recipientName: string): string {
  const ctx = getContext()
  const body = `
    <h2 style="margin:0 0 12px;font-size:22px;color:${TEXT_COLOR};">Recupera tu contraseña</h2>
    <p style="margin:0 0 24px;font-size:14px;color:${MUTED_COLOR};line-height:1.6;">
      Hola ${recipientName}, recibimos una solicitud para restablecer tu contraseña en Turpial Market.
      Haz clic en el botón de abajo para crear una nueva contraseña.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;"><tr><td align="center" style="background:${BRAND_COLOR};border-radius:8px;padding:12px 32px;">
      <a href="${resetLink}" style="color:#081018;text-decoration:none;font-size:14px;font-weight:600;">Restablecer contraseña</a>
    </td></tr></table>
    <p style="margin:0;font-size:12px;color:${MUTED_COLOR};">
      Si no solicitaste este cambio, puedes ignorar este mensaje. El enlace expira en 1 hora.
    </p>`
  return baseTemplate(body, ctx)
}

export function buildPurchaseConfirmationEmail(data: {
  buyerName: string
  listingTitle: string
  amount: number
  currency: string
  txCode: string
  txUrl: string
}): string {
  const ctx = getContext()
  const body = `
    <h2 style="margin:0 0 12px;font-size:22px;color:${TEXT_COLOR};">Compra confirmada</h2>
    <p style="margin:0 0 16px;font-size:14px;color:${MUTED_COLOR};line-height:1.6;">
      Hola ${data.buyerName}, tu compra fue registrada exitosamente en Turpial Market.
    </p>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 24px;border-collapse:collapse;">
      <tr><td style="padding:8px 0;font-size:12px;color:${MUTED_COLOR};border-bottom:1px solid rgba(255,255,255,0.04);">Producto</td><td style="padding:8px 0;font-size:12px;color:${TEXT_COLOR};border-bottom:1px solid rgba(255,255,255,0.04);text-align:right;">${data.listingTitle}</td></tr>
      <tr><td style="padding:8px 0;font-size:12px;color:${MUTED_COLOR};border-bottom:1px solid rgba(255,255,255,0.04);">Monto</td><td style="padding:8px 0;font-size:14px;font-weight:600;color:#4ade80;border-bottom:1px solid rgba(255,255,255,0.04);text-align:right;">${data.currency} ${data.amount.toFixed(2)}</td></tr>
      <tr><td style="padding:8px 0;font-size:12px;color:${MUTED_COLOR};">Referencia</td><td style="padding:8px 0;font-size:12px;color:${TEXT_COLOR};text-align:right;">${data.txCode}</td></tr>
    </table>
    <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr><td align="center" style="background:${BRAND_COLOR};border-radius:8px;padding:12px 32px;">
      <a href="${data.txUrl}" style="color:#081018;text-decoration:none;font-size:14px;font-weight:600;">Ver transacción</a>
    </td></tr></table>`
  return baseTemplate(body, ctx)
}

export function buildNewSaleEmail(data: {
  sellerName: string
  listingTitle: string
  amount: number
  currency: string
  txCode: string
  txUrl: string
}): string {
  const ctx = getContext()
  const body = `
    <h2 style="margin:0 0 12px;font-size:22px;color:#ffc107;">Nueva venta</h2>
    <p style="margin:0 0 16px;font-size:14px;color:${MUTED_COLOR};line-height:1.6;">
      Hola ${data.sellerName}, alguien compró tu producto en Turpial Market.
    </p>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 24px;border-collapse:collapse;">
      <tr><td style="padding:8px 0;font-size:12px;color:${MUTED_COLOR};border-bottom:1px solid rgba(255,255,255,0.04);">Producto</td><td style="padding:8px 0;font-size:12px;color:${TEXT_COLOR};border-bottom:1px solid rgba(255,255,255,0.04);text-align:right;">${data.listingTitle}</td></tr>
      <tr><td style="padding:8px 0;font-size:12px;color:${MUTED_COLOR};border-bottom:1px solid rgba(255,255,255,0.04);">Monto</td><td style="padding:8px 0;font-size:14px;font-weight:600;color:#4ade80;border-bottom:1px solid rgba(255,255,255,0.04);text-align:right;">${data.currency} ${data.amount.toFixed(2)}</td></tr>
      <tr><td style="padding:8px 0;font-size:12px;color:${MUTED_COLOR};">Referencia</td><td style="padding:8px 0;font-size:12px;color:${TEXT_COLOR};text-align:right;">${data.txCode}</td></tr>
    </table>
    <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr><td align="center" style="background:#ffc107;border-radius:8px;padding:12px 32px;">
      <a href="${data.txUrl}" style="color:#0a0a0a;text-decoration:none;font-size:14px;font-weight:600;">Ver venta</a>
    </td></tr></table>`
  return baseTemplate(body, ctx)
}

export function buildPaymentReceivedEmail(data: {
  buyerName: string
  txCode: string
  amount: number
  currency: string
  txUrl: string
}): string {
  const ctx = getContext()
  const body = `
    <h2 style="margin:0 0 12px;font-size:22px;color:#4ade80;">Pago recibido</h2>
    <p style="margin:0 0 16px;font-size:14px;color:${MUTED_COLOR};line-height:1.6;">
      Hola ${data.buyerName}, tu pago fue recibido y está en revisión. Te notificaremos cuando sea aprobado.
    </p>
    <p style="margin:0 0 8px;font-size:12px;color:${MUTED_COLOR};">Referencia: <span style="color:${TEXT_COLOR};">${data.txCode}</span></p>
    <p style="margin:0 0 24px;font-size:12px;color:${MUTED_COLOR};">Monto: <span style="color:#4ade80;font-weight:600;">${data.currency} ${data.amount.toFixed(2)}</span></p>
    <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr><td align="center" style="background:${BRAND_COLOR};border-radius:8px;padding:12px 32px;">
      <a href="${data.txUrl}" style="color:#081018;text-decoration:none;font-size:14px;font-weight:600;">Ver estado</a>
    </td></tr></table>`
  return baseTemplate(body, ctx)
}

export function buildPaymentApprovedEmail(data: {
  recipientName: string
  recipientRole: 'buyer' | 'seller'
  listingTitle: string
  txCode: string
  txUrl: string
}): string {
  const ctx = getContext()
  const message = data.recipientRole === 'buyer'
    ? 'Tu pago fue aprobado. El vendedor ya puede entregar el producto.'
    : 'El pago fue aprobado. Ya puedes entregar el producto.'
  const ctaLabel = data.recipientRole === 'buyer' ? 'Ver mi compra' : 'Ver mi venta'
  const body = `
    <h2 style="margin:0 0 12px;font-size:22px;color:#4ade80;">Pago aprobado</h2>
    <p style="margin:0 0 16px;font-size:14px;color:${MUTED_COLOR};line-height:1.6;">
      Hola ${data.recipientName}, ${message}
    </p>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 24px;border-collapse:collapse;">
      <tr><td style="padding:8px 0;font-size:12px;color:${MUTED_COLOR};border-bottom:1px solid rgba(255,255,255,0.04);">Producto</td><td style="padding:8px 0;font-size:12px;color:${TEXT_COLOR};border-bottom:1px solid rgba(255,255,255,0.04);text-align:right;">${data.listingTitle}</td></tr>
      <tr><td style="padding:8px 0;font-size:12px;color:${MUTED_COLOR};">Referencia</td><td style="padding:8px 0;font-size:12px;color:${TEXT_COLOR};text-align:right;">${data.txCode}</td></tr>
    </table>
    <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr><td align="center" style="background:${BRAND_COLOR};border-radius:8px;padding:12px 32px;">
      <a href="${data.txUrl}" style="color:#081018;text-decoration:none;font-size:14px;font-weight:600;">${ctaLabel}</a>
    </td></tr></table>`
  return baseTemplate(body, ctx)
}

export function buildSellerDeliveredEmail(data: {
  buyerName: string
  listingTitle: string
  txCode: string
  txUrl: string
}): string {
  const ctx = getContext()
  const body = `
    <h2 style="margin:0 0 12px;font-size:22px;color:#ffc107;">Entrega registrada</h2>
    <p style="margin:0 0 16px;font-size:14px;color:${MUTED_COLOR};line-height:1.6;">
      Hola ${data.buyerName}, el vendedor marco el producto como entregado. Confirma recepcion o abre disputa si hay un problema.
    </p>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 24px;border-collapse:collapse;">
      <tr><td style="padding:8px 0;font-size:12px;color:${MUTED_COLOR};border-bottom:1px solid rgba(255,255,255,0.04);">Producto</td><td style="padding:8px 0;font-size:12px;color:${TEXT_COLOR};border-bottom:1px solid rgba(255,255,255,0.04);text-align:right;">${data.listingTitle}</td></tr>
      <tr><td style="padding:8px 0;font-size:12px;color:${MUTED_COLOR};">Referencia</td><td style="padding:8px 0;font-size:12px;color:${TEXT_COLOR};text-align:right;">${data.txCode}</td></tr>
    </table>
    <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr><td align="center" style="background:${BRAND_COLOR};border-radius:8px;padding:12px 32px;">
      <a href="${data.txUrl}" style="color:#081018;text-decoration:none;font-size:14px;font-weight:600;">Revisar transaccion</a>
    </td></tr></table>`
  return baseTemplate(body, ctx)
}

export function buildDeliveryConfirmedEmail(data: {
  sellerName: string
  listingTitle: string
  txCode: string
  txUrl: string
}): string {
  const ctx = getContext()
  const body = `
    <h2 style="margin:0 0 12px;font-size:22px;color:#00aeef;">Recepcion confirmada</h2>
    <p style="margin:0 0 16px;font-size:14px;color:${MUTED_COLOR};line-height:1.6;">
      Hola ${data.sellerName}, el comprador confirmo recepcion. La operacion queda lista para liberacion de fondos.
    </p>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 24px;border-collapse:collapse;">
      <tr><td style="padding:8px 0;font-size:12px;color:${MUTED_COLOR};border-bottom:1px solid rgba(255,255,255,0.04);">Producto</td><td style="padding:8px 0;font-size:12px;color:${TEXT_COLOR};border-bottom:1px solid rgba(255,255,255,0.04);text-align:right;">${data.listingTitle}</td></tr>
      <tr><td style="padding:8px 0;font-size:12px;color:${MUTED_COLOR};">Referencia</td><td style="padding:8px 0;font-size:12px;color:${TEXT_COLOR};text-align:right;">${data.txCode}</td></tr>
    </table>
    <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr><td align="center" style="background:${BRAND_COLOR};border-radius:8px;padding:12px 32px;">
      <a href="${data.txUrl}" style="color:#081018;text-decoration:none;font-size:14px;font-weight:600;">Ver estado</a>
    </td></tr></table>`
  return baseTemplate(body, ctx)
}

export function buildReferralCommissionEmail(data: {
  referrerName: string
  listingTitle: string
  commissionAmount: number
  currency: string
  marketplaceUrl: string
}): string {
  const ctx = getContext()
  const body = `
    <h2 style="margin:0 0 12px;font-size:22px;color:#ffc107;">Comisión generada</h2>
    <p style="margin:0 0 16px;font-size:14px;color:${MUTED_COLOR};line-height:1.6;">
      Hola ${data.referrerName}, alguien compró usando tu enlace de Drop Social.
    </p>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 24px;border-collapse:collapse;">
      <tr><td style="padding:8px 0;font-size:12px;color:${MUTED_COLOR};border-bottom:1px solid rgba(255,255,255,0.04);">Producto</td><td style="padding:8px 0;font-size:12px;color:${TEXT_COLOR};border-bottom:1px solid rgba(255,255,255,0.04);text-align:right;">${data.listingTitle}</td></tr>
      <tr><td style="padding:8px 0;font-size:12px;color:${MUTED_COLOR};">Tu comisión</td><td style="padding:8px 0;font-size:14px;font-weight:600;color:#4ade80;text-align:right;">${data.currency} ${data.commissionAmount.toFixed(2)}</td></tr>
    </table>
    <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr><td align="center" style="background:#ffc107;border-radius:8px;padding:12px 32px;">
      <a href="${data.marketplaceUrl}?tab=referrals" style="color:#0a0a0a;text-decoration:none;font-size:14px;font-weight:600;">Ver mis referidos</a>
    </td></tr></table>`
  return baseTemplate(body, ctx)
}

export function buildPayoutReleasedEmail(data: {
  sellerName: string
  amount: number
  currency: string
  txCode: string
  txUrl: string
}): string {
  const ctx = getContext()
  const body = `
    <h2 style="margin:0 0 12px;font-size:22px;color:#4ade80;">Fondos liberados</h2>
    <p style="margin:0 0 16px;font-size:14px;color:${MUTED_COLOR};line-height:1.6;">
      Hola ${data.sellerName}, tus fondos fueron liberados para la transacción ${data.txCode}.
    </p>
    <p style="margin:0 0 24px;font-size:12px;color:${MUTED_COLOR};">Monto neto: <span style="color:#4ade80;font-weight:600;">${data.currency} ${data.amount.toFixed(2)}</span></p>
    <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr><td align="center" style="background:${BRAND_COLOR};border-radius:8px;padding:12px 32px;">
      <a href="${data.txUrl}" style="color:#081018;text-decoration:none;font-size:14px;font-weight:600;">Ver transacción</a>
    </td></tr></table>`
  return baseTemplate(body, ctx)
}
