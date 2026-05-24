import { loadEnv } from '../lib/env.mjs'

export async function run() {
  loadEnv()
  const checks = []
  const pass = (label, detail) => { console.log(`  [PASS] ${label}: ${detail}`); checks.push({ check: label, ok: true, detail }) }
  const fail = (label, detail) => { console.log(`  [FAIL] ${label}: ${detail}`); checks.push({ check: label, ok: false, detail }) }
  const info = (label, detail) => { console.log(`  [INFO] ${label}: ${detail}`) }

  console.log(`\n=== S-UX-02-M10 Email Transactional Validation ===`)
  console.log()

  const events = [
    'password_reset',
    'purchase_confirmation',
    'new_sale',
    'payment_received',
    'payment_approved',
    'seller_delivered',
    'delivery_confirmed',
    'referral_commission',
    'payout_released',
    'payout_sent',
  ]

  // ─── 1. Verify email templates module exports all 6 events ───
  console.log(`── 1. Email Template Functions ──`)
  try {
    const templates = await import('../../../lib/email/templates.ts')
    const requiredFns = [
      'buildPasswordResetEmail',
      'buildPurchaseConfirmationEmail',
      'buildNewSaleEmail',
      'buildPaymentReceivedEmail',
      'buildPaymentApprovedEmail',
      'buildSellerDeliveredEmail',
      'buildDeliveryConfirmedEmail',
      'buildReferralCommissionEmail',
      'buildPayoutReleasedEmail',
      'buildPayoutSentEmail',
    ]
    const exported = Object.keys(templates)
    const missing = requiredFns.filter(f => !exported.includes(f))
    if (missing.length === 0) {
      pass('templates-exports', `10/10 template functions exported`)
      requiredFns.forEach(f => info(f, 'exported'))
    } else {
      fail('templates-exports', `missing: ${missing.join(', ')}`)
    }

    // ─── 2. Verify templates generate valid HTML ──
    console.log(`── 2. Template HTML Generation ──`)
    const testData = {
      buyerName: 'QA Test',
      sellerName: 'QA Seller',
      referrerName: 'QA Referrer',
      listingTitle: 'Test Listing',
      amount: 100,
      currency: 'USD',
      txCode: 'TX-TEST-001',
      txUrl: 'https://turpialsound.com/marketplace',
      marketplaceUrl: 'https://turpialsound.com/marketplace',
      resetLink: 'https://turpialsound.com/reset-password?token=test',
      commissionAmount: 0.5,
      recipientRole: 'buyer',
    }

    const emails = [
      { name: 'password_reset', html: templates.buildPasswordResetEmail(testData.resetLink, testData.buyerName) },
      { name: 'purchase_confirmation', html: templates.buildPurchaseConfirmationEmail(testData) },
      { name: 'new_sale', html: templates.buildNewSaleEmail(testData) },
      { name: 'payment_received', html: templates.buildPaymentReceivedEmail(testData) },
      { name: 'payment_approved_buyer', html: templates.buildPaymentApprovedEmail({ recipientName: testData.buyerName, recipientRole: 'buyer', listingTitle: testData.listingTitle, txCode: testData.txCode, txUrl: testData.txUrl }) },
      { name: 'payment_approved_seller', html: templates.buildPaymentApprovedEmail({ recipientName: testData.sellerName, recipientRole: 'seller', listingTitle: testData.listingTitle, txCode: testData.txCode, txUrl: testData.txUrl }) },
      { name: 'seller_delivered', html: templates.buildSellerDeliveredEmail({ buyerName: testData.buyerName, listingTitle: testData.listingTitle, txCode: testData.txCode, txUrl: testData.txUrl }) },
      { name: 'delivery_confirmed', html: templates.buildDeliveryConfirmedEmail({ sellerName: testData.sellerName, listingTitle: testData.listingTitle, txCode: testData.txCode, txUrl: testData.txUrl }) },
      { name: 'referral_commission', html: templates.buildReferralCommissionEmail(testData) },
      { name: 'payout_released', html: templates.buildPayoutReleasedEmail(testData) },
      { name: 'payout_sent', html: templates.buildPayoutSentEmail(testData) },
    ]

    let allValid = true
    for (const email of emails) {
      const isHtml = email.html.includes('<!DOCTYPE html>') && email.html.includes('</html>')
      const hasBrand = email.html.includes('Turpial Market') || email.html.includes('Turpial Sound')
      const hasContent = email.html.length > 500

      if (isHtml && hasBrand && hasContent) {
        pass(`template-${email.name}`, `valid HTML, ${email.html.length}B, has branding`)
      } else {
        allValid = false
        const issues = []
        if (!isHtml) issues.push('missing doctype')
        if (!hasBrand) issues.push('no branding')
        if (!hasContent) issues.push(`too short (${email.html.length}B)`)
        fail(`template-${email.name}`, issues.join(', '))
      }
    }

    if (allValid) pass('all-templates-valid', '11/11 templates generate valid HTML with branding')
  } catch (e) {
    fail('templates-import', `cannot import templates.ts: ${e.message}`)
  }

  // ─── 3. Verify email sender module ──
  console.log(`── 3. Email Sender (send.ts) ──`)
  try {
    const send = await import('../../../lib/email/send.ts')
    const hasFunctions = typeof send.sendMarketplaceEmail === 'function' && typeof send.sendPasswordResetEmail === 'function'
    if (hasFunctions) {
      pass('sender-exports', 'sendMarketplaceEmail + sendPasswordResetEmail exported')
    } else {
      fail('sender-exports', 'missing required exports')
    }

    const provider = process.env.EMAIL_PROVIDER?.trim()
    const resendKey = process.env.RESEND_API_KEY?.trim()
    if (provider === 'resend' && resendKey) {
      pass('provider-configured', `EMAIL_PROVIDER=resend, RESEND_API_KEY set`)
    } else if (provider === 'smtp') {
      pass('provider-configured', 'EMAIL_PROVIDER=smtp')
    } else {
      info('provider-status', `provider=${provider || 'disabled'} — emails use fallback logging`)
    }
  } catch (e) {
    fail('sender-import', `cannot import send.ts: ${e.message}`)
  }

  // ─── 4. Verify env vars for email ──
  console.log(`── 4. Email Environment Variables ──`)
  const fromEmail = process.env.EMAIL_FROM?.trim()
  if (fromEmail) {
    pass('EMAIL_FROM', fromEmail)
  } else {
    info('EMAIL_FROM', 'not set — using default market@turpialsong.com')
  }

  const appUrl = process.env.APP_URL?.trim()
  if (appUrl) pass('APP_URL', appUrl)
  else info('APP_URL', 'not set — using default https://turpialsong.com')

  const passCount = checks.filter(c => c.ok).length
  const failCount = checks.filter(c => !c.ok).length
  const total = checks.length

  console.log()
  console.log(`========================================`)
  console.log(`  VALIDATION COMPLETE: ${passCount} PASS / ${failCount} FAIL / ${total} checks`)
  console.log(`========================================`)

  return { passCount, failCount, total, checks }
}

const isMain = process.argv[1]?.includes('qa-s-ux-02-email')
if (isMain) {
  run().then(r => {
    process.exit(r.failCount > 0 ? 1 : 0)
  }).catch(err => {
    console.error('FATAL:', err)
    process.exit(1)
  })
}
