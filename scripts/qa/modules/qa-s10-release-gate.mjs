import { loadEnv, getEnv } from '../lib/env.mjs'
import { getPrisma, disconnectPrisma } from '../lib/db-read.mjs'

const APP_URL = 'https://turpialsound-qc6k39eh1-bkgs-projects-829c67c1.vercel.app'

async function run() {
  const gates = []
  loadEnv()
  console.log('=== S10 Release Gate Validation ===\n')

  // G1 - Preview accessible
  try {
    const r = await fetch(APP_URL)
    gates.push({ gate: 'G1-preview', ok: r.ok, detail: `HTTP ${r.status}` })
  } catch (e) {
    gates.push({ gate: 'G1-preview', ok: false, detail: e.message })
  }
  console.log(`[${gates[0].ok ? 'PASS' : 'FAIL'}] Preview: ${gates[0].detail}`)

  // G2 - Marketplace home page
  try {
    const r = await fetch(`${APP_URL}/marketplace`)
    gates.push({ gate: 'G2-marketplace', ok: r.ok, detail: `HTTP ${r.status}` })
  } catch (e) {
    gates.push({ gate: 'G2-marketplace', ok: false, detail: e.message })
  }
  console.log(`[${gates[1].ok ? 'PASS' : 'FAIL'}] Marketplace: ${gates[1].detail}`)

  // G3 - DB connection
  let prisma
  try {
    prisma = await getPrisma()
    await prisma.$queryRaw`SELECT 1`
    gates.push({ gate: 'G3-db', ok: true, detail: 'Connected' })
  } catch (e) {
    gates.push({ gate: 'G3-db', ok: false, detail: e.message })
  }
  console.log(`[${gates[2].ok ? 'PASS' : 'FAIL'}] DB: ${gates[2].detail}`)

  // G4 - Core tables exist
  const tables = ['mp_users', 'mp_listings', 'mp_transactions', 'mp_payouts', 'mp_chat_threads', 'mp_messages']
  const missing = []
  for (const t of tables) {
    try {
      const r = await prisma.$queryRawUnsafe(`SELECT 1 FROM "${t}" LIMIT 1`)
      if (!r) missing.push(t)
    } catch { missing.push(t) }
  }
  gates.push({ gate: 'G4-tables', ok: missing.length === 0, detail: missing.length ? `Missing: ${missing.join(',')}` : `${tables.length} OK` })
  console.log(`[${missing.length === 0 ? 'PASS' : 'FAIL'}] Tables: ${missing.length === 0 ? 'OK' : missing.join(',')}`)

  // G5 - QA users exist
  const buyer = await prisma.mpUser.findFirst({ where: { email: 'buyerIA@local.test' }, select: { id: true } })
  const seller = await prisma.mpUser.findFirst({ where: { email: 'sellerIA@local.test' }, select: { id: true } })
  const admin = await prisma.mpUser.findFirst({ where: { displayName: 'mvera' }, select: { id: true } })
  gates.push({ gate: 'G5-users', ok: !!(buyer && seller && admin), detail: `buyer:${!!buyer} seller:${!!seller} admin:${!!admin}` })
  console.log(`[${buyer && seller && admin ? 'PASS' : 'FAIL'}] Users: buyer=${!!buyer} seller=${!!seller} admin=${!!admin}`)

  // G6 - QA listing exists and is ACTIVE
  const listing = await prisma.mpListing.findFirst({ where: { slug: 'qa-e2e-s03f-selleria-discovery' }, select: { id: true, status: true } })
  gates.push({ gate: 'G6-listing', ok: !!(listing && listing.status === 'ACTIVE'), detail: `status=${listing?.status}` })
  console.log(`[${listing?.status === 'ACTIVE' ? 'PASS' : 'FAIL'}] Listing: ${listing?.status}`)

  // G7 - At least one complete TX flow (PENDING_PAYMENT → RELEASED)
  const completeTx = await prisma.mpTransaction.findFirst({
    where: { status: 'RELEASED' },
    orderBy: { createdAt: 'desc' },
    include: { statusHistory: { select: { toStatus: true } } },
  })
  const hasComplete = !!(completeTx && completeTx.statusHistory.length >= 5)
  gates.push({ gate: 'G7-flow', ok: hasComplete, detail: hasComplete ? `TX ${completeTx.id.slice(0,8)}*** RELEASED` : 'No complete flow' })
  console.log(`[${hasComplete ? 'PASS' : 'FAIL'}] TX flow: ${hasComplete ? 'RELEASED' : 'No complete TX'}`)

  // G8 - Sensitive blob token configured
  const hasSensitiveToken = Boolean(getEnv('TS_MARKETPLACE_SENSITIVE_BLOB_READ_WRITE_TOKEN') && getEnv('TS_MARKETPLACE_SENSITIVE_BLOB_READ_WRITE_TOKEN').length > 10)
  gates.push({ gate: 'G8-blob', ok: hasSensitiveToken, detail: hasSensitiveToken ? 'Token present' : 'Token missing — Jean infra task' })
  console.log(`[${hasSensitiveToken ? 'PASS' : 'FAIL'}] Blob token: ${hasSensitiveToken}`)

  // G9 - Rate env vars present
  const ratesOk = Boolean(getEnv('RATE_A_URL') && getEnv('BCV_FALLBACK_RATE'))
  gates.push({ gate: 'G9-rates', ok: ratesOk, detail: ratesOk ? 'Rate env vars present' : 'Missing' })
  console.log(`[${ratesOk ? 'PASS' : 'FAIL'}] Rates: ${ratesOk}`)

  // G10 - Payout audit fields exist in schema
  const hasAuditFields = listing !== null // already connected, check via raw query
  const auditCheck = await prisma.$queryRawUnsafe(`SELECT column_name FROM information_schema.columns WHERE table_name = 'mp_payouts' AND column_name IN ('reference','auditHash')`)
  gates.push({ gate: 'G10-audit', ok: auditCheck?.length >= 2, detail: `${auditCheck?.length || 0}/2 audit fields` })
  console.log(`[${auditCheck?.length >= 2 ? 'PASS' : 'FAIL'}] Audit fields: ${auditCheck?.length || 0}/2`)

  await disconnectPrisma()

  // Summary
  const passed = gates.filter(g => g.ok).length
  const blocked = gates.filter(g => !g.ok)

  console.log('')
  gates.forEach(g => console.log(`[${g.ok ? '✓' : '✗'}] ${g.gate}: ${g.detail}`))
  console.log(`\n=== Release Gate: ${passed}/${gates.length} PASS ===`)

  if (blocked.length) {
    console.log('\nBLOCKERS:')
    blocked.forEach(g => console.log(`  - ${g.gate}: ${g.detail}`))
  }

  console.log(blocked.length === 0 ? '\n🟢 RELEASE GATE: READY' : `\n🟡 RELEASE GATE: ${blocked.length} blocker(s)`)
}

run().catch(console.error)
