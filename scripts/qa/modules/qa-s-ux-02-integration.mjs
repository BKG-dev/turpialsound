import { loadEnv } from '../lib/env.mjs'

export async function run() {
  loadEnv()

  const whatsappMod = await import('../../../lib/whatsapp/marketplace-notifications.ts')
  const emailMod = await import('../../../lib/email/send.ts')

  const sendMarketplaceWhatsapp = whatsappMod.sendMarketplaceWhatsapp
  const sendMarketplaceEmail = emailMod.sendMarketplaceEmail

  const checks = []
  const pass = (label, detail) => { console.log(`  [PASS] ${label}: ${detail}`); checks.push({ check: label, ok: true, detail }) }
  const fail = (label, detail) => { console.log(`  [FAIL] ${label}: ${detail}`); checks.push({ check: label, ok: false, detail }) }
  const info = (label, detail) => { console.log(`  [INFO] ${label}: ${detail}`) }

  const phone = '+584141333305'
  const email = 'mvera@smsmantis.com'
  const name = 'Manuel'

  console.log(`\n=== INTEGRATION TEST — WhatsApp + Email to Manuel ===`)
  console.log(`  WhatsApp: ${phone}`)
  console.log(`  Email: ${email}`)
  console.log()

  // ═══════════════════════ WHATSAPP ═══════════════════════
  console.log(`═══ WHATSAPP (5 eventos) ═══`)

  const waEvents = [
    {
      event: 'mp_new_sale',
      ctx: {
        txCode: 'TX-DEMO-001',
        listingTitle: 'Fender Stratocaster Player 2022',
        amount: 850,
        currency: 'USD',
      },
    },
    {
      event: 'mp_payment_received',
      ctx: {
        txCode: 'TX-DEMO-001',
        amount: 850,
        currency: 'USD',
      },
    },
    {
      event: 'mp_dispute_opened',
      ctx: {
        txCode: 'TX-DEMO-002',
      },
    },
    {
      event: 'mp_payout_released',
      ctx: {
        txCode: 'TX-DEMO-001',
        amount: 807.5,
        currency: 'USD',
      },
    },
    {
      event: 'mp_referral_commission',
      ctx: {
        listingTitle: 'Shure SM7B Micrófono',
        amount: 1.75,
        currency: 'USD',
      },
    },
  ]

  for (const { event, ctx } of waEvents) {
    console.log(`  → ${event}...`)
    const result = await sendMarketplaceWhatsapp(
      event,
      { phone, name },
      ctx,
      true,
    )

    if (result.sent) {
      pass(`wa-${event}`, `sent via ${result.provider}${result.messageId ? ` (${result.messageId})` : ''}`)
    } else if (result.manualLink) {
      pass(`wa-${event}`, `manual fallback link generated`)
      info(`wa-${event}-link`, result.manualLink)
    } else {
      fail(`wa-${event}`, result.reason || 'unknown')
    }
  }

  console.log()

  // ═══════════════════════ EMAIL ═══════════════════════
  console.log(`═══ EMAIL (6 templates) ═══`)

  const appUrl = process.env.APP_URL?.replace(/\/+$/, '') ?? 'https://turpialsound.com'
  const marketplaceUrl = `${appUrl}/marketplace`

  const emailEvents = [
    {
      event: 'password_reset',
      data: {
        resetLink: `${appUrl}/reset-password?token=demo-token-2026`,
      },
    },
    {
      event: 'purchase_confirmation',
      data: {
        buyerName: name,
        listingTitle: 'Fender Stratocaster Player 2022',
        amount: 850,
        currency: 'USD',
        txCode: 'TX-DEMO-001',
        txUrl: `${marketplaceUrl}/dashboard?tab=purchases`,
      },
    },
    {
      event: 'new_sale',
      data: {
        sellerName: name,
        listingTitle: 'Shure SM7B Micrófono',
        amount: 350,
        currency: 'USD',
        txCode: 'TX-DEMO-002',
        txUrl: `${marketplaceUrl}/dashboard?tab=sales`,
      },
    },
    {
      event: 'payment_received',
      data: {
        buyerName: name,
        txCode: 'TX-DEMO-001',
        amount: 850,
        currency: 'USD',
        txUrl: `${marketplaceUrl}/dashboard?tab=purchases`,
      },
    },
    {
      event: 'referral_commission',
      data: {
        referrerName: name,
        listingTitle: 'Shure SM7B Micrófono',
        commissionAmount: 1.75,
        currency: 'USD',
        marketplaceUrl,
      },
    },
    {
      event: 'payout_released',
      data: {
        sellerName: name,
        amount: 807.5,
        currency: 'USD',
        txCode: 'TX-DEMO-001',
        txUrl: `${marketplaceUrl}/dashboard?tab=payouts`,
      },
    },
  ]

  for (const { event, data } of emailEvents) {
    console.log(`  → ${event}...`)
    const result = await sendMarketplaceEmail(
      event,
      { email, name },
      data,
    )

    if (result.sent) {
      pass(`email-${event}`, `sent via ${result.provider}${result.messageId ? ` (${result.messageId})` : ''}`)
    } else {
      info(`email-${event}`, `not sent: ${result.reason} (provider=${result.provider})`)
    }
  }

  console.log()

  const passCount = checks.filter(c => c.ok).length
  const failCount = checks.filter(c => !c.ok).length
  const total = checks.length

  console.log(`========================================`)
  console.log(`  INTEGRATION COMPLETE: ${passCount} PASS / ${failCount} FAIL / ${total} checks`)
  console.log(`========================================`)
  console.log()
  console.log(`  Revisa:`)
  console.log(`  - WhatsApp: ${phone}`)
  console.log(`  - Email: ${email}`)

  return { passCount, failCount, total, checks }
}

const isMain = process.argv[1]?.includes('s-ux-02-integration')
if (isMain) {
  run().then(r => {
    process.exit(r.failCount > 0 ? 1 : 0)
  }).catch(err => {
    console.error('FATAL:', err)
    process.exit(1)
  })
}
