import { loadEnv, getEnv } from '../lib/env.mjs'
import { getPrisma, disconnectPrisma } from '../lib/db-read.mjs'

const APP_URL = 'https://turpialsound-qc6k39eh1-bkgs-projects-829c67c1.vercel.app'
const LISTING_SLUG = 'qa-e2e-s03f-selleria-discovery'

async function run() {
  const checks = []
  loadEnv()

  console.log('=== S04 Payment Proof Protection Validation (Jean) ===\n')

  // 1. Check sensitive blob token
  const hasSensitiveToken = Boolean(getEnv('TS_MARKETPLACE_SENSITIVE_BLOB_READ_WRITE_TOKEN'))
  checks.push({ check: 'sensitiveBlobToken', ok: hasSensitiveToken, detail: hasSensitiveToken ? 'TS_MARKETPLACE_SENSITIVE_BLOB_READ_WRITE_TOKEN present' : 'MISSING' })
  console.log(`[${hasSensitiveToken ? 'PASS' : 'FAIL'}] Sensitive blob token: ${hasSensitiveToken}`)

  // 2. Check proxy endpoint requires auth (401 without session)
  let proxy401 = false
  try {
    const resp = await fetch(`${APP_URL}/api/marketplace/payment-proofs/test`, { redirect: 'follow' })
    proxy401 = resp.status === 401
    checks.push({ check: 'proxyAuth', ok: proxy401, detail: `HTTP ${resp.status} (expected 401 without session)` })
  } catch (e) {
    checks.push({ check: 'proxyAuth', ok: false, detail: `Fetch error: ${e.message}` })
  }
  console.log(`[${proxy401 ? 'PASS' : 'FAIL'}] Proxy requires auth: ${proxy401}`)

  // 3. Check upload route exists and routes payment-proof correctly
  let uploadExists = false
  try {
    const resp = await fetch(`${APP_URL}/api/marketplace/upload`, { method: 'POST' })
    uploadExists = resp.status !== 404
    checks.push({ check: 'uploadRoute', ok: uploadExists, detail: `HTTP ${resp.status} (POST to /api/marketplace/upload)` })
  } catch (e) {
    checks.push({ check: 'uploadRoute', ok: false, detail: `Fetch error: ${e.message}` })
  }
  console.log(`[${uploadExists ? 'PASS' : 'INFO'}] Upload route: ${uploadExists}`)

  // 4. Verify QA transaction has payment proof in DB
  let prisma
  try { prisma = await getPrisma() } catch (e) {
    console.log(`[FAIL] DB connection: ${e.message}`)
    process.exit(1)
  }

  const listing = await prisma.mpListing.findUnique({ where: { slug: LISTING_SLUG }, select: { id: true } })
  if (!listing) {
    checks.push({ check: 'listingLookup', ok: false, detail: `${LISTING_SLUG} not found` })
    await disconnectPrisma()
  } else {
    checks.push({ check: 'listingLookup', ok: true, detail: `Found: ${listing.id.slice(0, 8)}***` })

    const tx = await prisma.mpTransaction.findFirst({
      where: { listingId: listing.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true, paymentProofUrl: true },
    })

    if (tx) {
      const hasProofUrl = Boolean(tx.paymentProofUrl)
      const usesProxy = hasProofUrl && tx.paymentProofUrl.includes('/api/marketplace/payment-proofs/')
      const notPublicBlob = hasProofUrl && !tx.paymentProofUrl.includes('public.blob.vercel-storage.com')

      checks.push({
        check: 'proofUrlExists',
        ok: hasProofUrl,
        detail: hasProofUrl ? `Proof URL found: ${tx.paymentProofUrl.slice(0, 40)}***` : 'No proof URL',
      })
      checks.push({
        check: 'proofUsesProxy',
        ok: usesProxy,
        detail: usesProxy ? 'Uses /api/marketplace/payment-proofs/ proxy' : 'Does NOT use proxy prefix',
      })
      checks.push({
        check: 'proofNotPublicBlob',
        ok: notPublicBlob || !hasProofUrl,
        detail: notPublicBlob ? 'NOT on public blob' : 'ON public blob or no URL',
      })
      console.log(`[PASS] TX: ${tx.id.slice(0, 8)}***, status=${tx.status}`)
      console.log(`[${hasProofUrl ? 'PASS' : 'FAIL'}] Proof URL: ${hasProofUrl}`)
      console.log(`[${usesProxy ? 'PASS' : 'FAIL'}] Proxy prefix: ${usesProxy}`)
      console.log(`[${notPublicBlob ? 'PASS' : 'FAIL'}] Not public blob: ${notPublicBlob}`)

      // 5. Blob metadata check
      const blobs = await prisma.mpBlobObjectMetadata.findMany({
        where: { entityType: 'payment_proof', entityId: tx.id },
        select: { url: true, pathname: true, contentType: true },
      })
      const hasBlobMeta = blobs.length > 0
      checks.push({
        check: 'blobMetadata',
        ok: hasBlobMeta,
        detail: hasBlobMeta ? `${blobs.length} blob metadata record(s) for payment_proof` : 'No blob metadata',
      })
      console.log(`[${hasBlobMeta ? 'PASS' : 'FAIL'}] Blob metadata: ${blobs.length} record(s)`)

      if (hasBlobMeta) {
        const blobUsesSensitive = blobs.every(b => !b.url.includes('public.blob.vercel-storage.com'))
        checks.push({
          check: 'blobIsSensitive',
          ok: blobUsesSensitive,
          detail: blobUsesSensitive ? 'All blob URLs are non-public' : 'Some blob URLs are public',
        })
        console.log(`[${blobUsesSensitive ? 'PASS' : 'FAIL'}] Blob sensitive: ${blobUsesSensitive}`)
      }
    } else {
      checks.push({ check: 'txLookup', ok: false, detail: 'No QA transaction found' })
      console.log('[FAIL] No QA transaction found')
    }
  }

  await disconnectPrisma()

  // Summary
  const passed = checks.filter(c => c.ok).length
  const failed = checks.filter(c => !c.ok).length
  console.log(`\n=== Summary: ${passed} passed, ${failed} failed, ${checks.length} total ===`)

  const allOk = failed === 0
  console.log(allOk ? '\nS04 PAYMENT PROOF PROTECTION: PASS' : '\nS04 PAYMENT PROOF PROTECTION: PARTIAL')

  return { ok: allOk, checks, passed, failed, total: checks.length }
}

run().catch(console.error)
