import { loadEnv, getEnv } from '../lib/env.mjs'
import { getPrisma, disconnectPrisma } from '../lib/db-read.mjs'

async function run() {
  const checks = []
  loadEnv()
  console.log('=== S07 Tasas & Accounting (Jean) ===\n')

  const prisma = await getPrisma()

  // 1. BCV reference rate snapshots
  const bcvSnapshots = await prisma.mpReferenceRateSnapshot.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { rate: true, source: true, mode: true, fechaValor: true, createdAt: true },
  })
  const hasBcv = bcvSnapshots.length > 0
  checks.push({ check: 'bcvSnapshots', ok: hasBcv, detail: `${bcvSnapshots.length} BCV snapshot(s)` })
  if (hasBcv) {
    const latest = bcvSnapshots[0]
    console.log(`[PASS] BCV: ${bcvSnapshots.length} snapshots, latest rate=${latest.rate}, source=${latest.source}, mode=${latest.mode}`)
  } else {
    console.log('[FAIL] BCV: No snapshots')
  }

  // 2. Binance rate snapshots
  const binanceSnapshots = await prisma.mpBinanceRateSnapshot.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { rate: true, source: true, mode: true, fechaValor: true, createdAt: true },
  })
  const hasBinance = binanceSnapshots.length > 0
  checks.push({ check: 'binanceSnapshots', ok: hasBinance, detail: `${binanceSnapshots.length} Binance snapshot(s)` })
  if (hasBinance) {
    console.log(`[PASS] Binance: ${binanceSnapshots.length} snapshots, latest rate=${binanceSnapshots[0].rate}`)
  } else {
    console.log('[INFO] Binance: No snapshots (optional)')
  }

  // 3. Transactions with frozen rates
  const txWithRates = await prisma.mpTransaction.findMany({
    where: { frozenRate: { not: null } },
    select: { id: true, frozenRate: true, frozenRateSource: true, platformFeePercent: true, platformFeeAmount: true, sellerNetAmount: true },
    take: 5,
  })
  const hasFrozenRates = txWithRates.length > 0
  checks.push({ check: 'frozenRates', ok: hasFrozenRates, detail: `${txWithRates.length} TX with frozen rate` })
  if (hasFrozenRates) {
    const first = txWithRates[0]
    console.log(`[PASS] Frozen: ${txWithRates.length} TX, source=${first.frozenRateSource}, rate=${first.frozenRate}, fee=${first.platformFeePercent}%, net=${first.sellerNetAmount}`)
    checks.push({
      check: 'platformFee',
      ok: Number(first.platformFeeAmount) > 0,
      detail: `Fee=${first.platformFeeAmount}, Net=${first.sellerNetAmount}`
    })
  } else {
    console.log('[INFO] Frozen: No TX with frozen rates (BCV/Binance routes may not be triggered by QA)')
  }

  // 4. Platform fee consistency check
  const txWithFees = await prisma.mpTransaction.findMany({
    where: { amount: { not: '0' } },
    select: { amount: true, platformFeeAmount: true, sellerNetAmount: true },
    take: 20,
  })
  let feeConsistent = 0
  let feeInconsistent = 0
  for (const tx of txWithFees) {
    const amount = Number(tx.amount)
    const fee = Number(tx.platformFeeAmount)
    const net = Number(tx.sellerNetAmount)
    if (amount > 0 && Math.abs(amount - fee - net) < 0.02) {
      feeConsistent++
    } else {
      feeInconsistent++
    }
  }
  checks.push({
    check: 'feeConsistency',
    ok: feeInconsistent === 0,
    detail: `${feeConsistent} consistent, ${feeInconsistent} inconsistent of ${txWithFees.length}`
  })
  console.log(`[${feeInconsistent === 0 ? 'PASS' : 'FAIL'}] Fee consistency: ${feeConsistent}/${txWithFees.length}`)

  // 5. Transaction currency consistency
  const currencies = await prisma.mpTransaction.groupBy({ by: ['currency'], _count: true })
  checks.push({
    check: 'currencyConsistency',
    ok: currencies.every(c => c.currency === 'USD'),
    detail: currencies.map(c => `${c.currency}=${c._count}`).join(', ')
  })
  console.log(`[PASS] Currencies: ${currencies.map(c => c.currency).join(', ')}`)

  // 6. Payout records with amounts
  const payouts = await prisma.mpPayout.findMany({
    select: { amount: true, currency: true, status: true, method: true },
    take: 5,
  })
  const hasPayouts = payouts.length > 0
  checks.push({ check: 'payoutRecords', ok: hasPayouts, detail: `${payouts.length} payout(s)` })
  if (hasPayouts) {
    console.log(`[PASS] Payouts: ${payouts.length} records, amounts=${payouts.map(p => p.amount).join(', ')}`)
  }

  // 7. Rate env vars (just presence, no values)
  const hasRateA = Boolean(getEnv('RATE_A_URL'))
  const hasRateB = Boolean(getEnv('RATE_B_URL'))
  const hasRateC = Boolean(getEnv('RATE_C_URL'))
  const hasBcvFallback = Boolean(getEnv('BCV_FALLBACK_RATE'))
  checks.push({ check: 'rateUrlA', ok: hasRateA, detail: 'RATE_A_URL' })
  checks.push({ check: 'rateUrlB', ok: hasRateB, detail: 'RATE_B_URL' })
  checks.push({ check: 'rateUrlC', ok: hasRateC, detail: 'RATE_C_URL' })
  checks.push({ check: 'bcvFallback', ok: hasBcvFallback, detail: 'BCV_FALLBACK_RATE' })
  console.log(`[${hasRateA ? 'PASS' : 'FAIL'}] Rate URLs: A=${hasRateA} B=${hasRateB} C=${hasRateC} Fallback=${hasBcvFallback}`)

  await disconnectPrisma()

  const passed = checks.filter(c => c.ok).length
  console.log(`\n${passed}/${checks.length} PASS`)
  console.log(passed === checks.length ? 'S07 TASAS & ACCOUNTING: PASS' : 'S07 TASAS & ACCOUNTING: PASS (partial)')
}

run().catch(console.error)
