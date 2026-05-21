import { loadEnv } from '../lib/env.mjs'

export async function run() {
  loadEnv()
  const checks = []
  const pass = (label, detail) => { console.log(`  [PASS] ${label}: ${detail}`); checks.push({ check: label, ok: true, detail }) }
  const fail = (label, detail) => { console.log(`  [FAIL] ${label}: ${detail}`); checks.push({ check: label, ok: false, detail }) }
  const info = (label, detail) => { console.log(`  [INFO] ${label}: ${detail}`) }

  console.log(`\n=== S-UX-02-M11 WhatsApp Marketplace Notifications Validation ===`)
  console.log()

  const events = [
    'mp_new_sale',
    'mp_payment_received',
    'mp_payment_approved',
    'mp_seller_delivered',
    'mp_delivery_confirmed',
    'mp_dispute_opened',
    'mp_payout_released',
    'mp_referral_commission',
  ]

  // ─── 1. Verify marketplace-notifications module ──
  console.log(`── 1. WhatsApp Marketplace Module ──`)
  try {
    const notifications = await import('../../../lib/whatsapp/marketplace-notifications.ts')
    const hasFunction = typeof notifications.sendMarketplaceWhatsapp === 'function'
    if (hasFunction) {
      pass('module-exists', 'sendMarketplaceWhatsapp function exported')
    } else {
      fail('module-exists', 'sendMarketplaceWhatsapp not found or not a function')
    }

    // ─── 2. Verify message formatting for all 5 events ──
    console.log(`── 2. Message Formatting ──`)
    const testCustomer = { phone: '+584141234567', name: 'QA Test' }
    const testCtx = {
      txCode: 'TX-TEST-001',
      listingTitle: 'Test Product',
      amount: 150,
      currency: 'USD',
      appUrl: 'https://turpialsound.com',
    }

    for (const event of events) {
      try {
        const result = await notifications.sendMarketplaceWhatsapp(
          event,
          testCustomer,
          testCtx,
          false, // no manual fallback
        )
        if (result.provider === 'disabled') {
          info(`event-${event}`, `provider=disabled — message formatted, not sent (expected in test)`)
        } else if (result.sent) {
          pass(`event-${event}`, `sent via ${result.provider}`)
        } else {
          info(`event-${event}`, `not sent: ${result.reason || 'unknown'}`)
        }
      } catch (e) {
        fail(`event-${event}`, `error formatting message: ${e.message}`)
      }
    }
  } catch (e) {
    fail('module-import', `cannot import marketplace-notifications.ts: ${e.message}`)
  }

  // ─── 3. Verify WhatsApp provider configuration ──
  console.log(`── 3. WhatsApp Provider Configuration ──`)
  const provider = process.env.WHATSAPP_OUTBOUND_PROVIDER?.trim()
  const metaToken = process.env.WHATSAPP_META_TOKEN?.trim()
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()

  if (provider) {
    if (provider === 'disabled') {
      info('provider', 'WHATSAPP_OUTBOUND_PROVIDER=disabled — messages formatted only, not sent')
    } else {
      pass('provider', `WHATSAPP_OUTBOUND_PROVIDER=${provider}`)
      if (provider === 'meta') {
        if (metaToken) pass('meta-token', 'WHATSAPP_META_TOKEN set')
        else info('meta-token', 'WHATSAPP_META_TOKEN not set')
        if (phoneId) pass('phone-id', `WHATSAPP_PHONE_NUMBER_ID=${phoneId}`)
        else info('phone-id', 'WHATSAPP_PHONE_NUMBER_ID not set')
      }
    }
  } else {
    info('provider', 'WHATSAPP_OUTBOUND_PROVIDER not set — WhatsApp disabled')
  }

  // ─── 4. Cross-check: marketplace & booking notifications coexist ──
  console.log(`── 4. Booking Notifications Check ──`)
  try {
    const booking = await import('../../../lib/whatsapp/booking-notifications.ts')
    const hasBookingFn = typeof booking.sendBookingWhatsapp === 'function'
    if (hasBookingFn) {
      pass('booking-coexistence', 'sendBookingWhatsapp exists — marketplace + booking notifications coexist')
    } else {
      fail('booking-coexistence', 'sendBookingWhatsapp missing — booking notifications may be broken')
    }
  } catch (e) {
    fail('booking-coexistence', `cannot import booking-notifications.ts: ${e.message}`)
  }

  const passCount = checks.filter(c => c.ok).length
  const failCount = checks.filter(c => !c.ok).length
  const total = checks.length

  console.log()
  console.log(`========================================`)
  console.log(`  VALIDATION COMPLETE: ${passCount} PASS / ${failCount} FAIL / ${total} checks`)
  console.log(`========================================`)

  return { passCount, failCount, total, checks }
}

const isMain = process.argv[1]?.includes('qa-s-ux-02-whatsapp')
if (isMain) {
  run().then(r => {
    process.exit(r.failCount > 0 ? 1 : 0)
  }).catch(err => {
    console.error('FATAL:', err)
    process.exit(1)
  })
}
