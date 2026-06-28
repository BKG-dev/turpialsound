import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function fail(message: string, error?: unknown): never {
  console.error('booking_custom_bundle_preview_wizard_handoff_contract FAILED')
  console.error(message)
  if (error instanceof Error && error.stack) {
    console.error(error.stack)
  }
  process.exit(1)
}

function main(): void {
  const wizardSource = readFileSync(
    resolve(process.cwd(), 'components/bookings/BookingWizard.tsx'),
    'utf8',
  )
  const actionSource = readFileSync(
    resolve(process.cwd(), 'lib/bookings/custom-bundle-preview-submission-action.ts'),
    'utf8',
  )
  const routeSource = readFileSync(
    resolve(process.cwd(), 'app/api/bookings/payment-recovery/session/route.ts'),
    'utf8',
  )

  assert.equal(wizardSource.includes('submitCustomBundlePreviewAction'), true)
  assert.equal(wizardSource.includes('customBundlePreviewResult'), true)
  assert.equal(wizardSource.includes('recoveryPath'), true)
  assert.equal(wizardSource.includes('Link'), true)
  assert.equal(wizardSource.includes('setCustomBundlePreviewResult(null)'), true)

  assert.equal(actionSource.includes("use server"), true)
  assert.equal(actionSource.includes('buildCustomBundlePreviewHandoffToken'), true)
  assert.equal(actionSource.includes('clearPreviewHandoffCookie'), true)

  assert.equal(routeSource.includes('CUSTOM_BUNDLE_PREVIEW_HANDOFF_COOKIE_NAME'), true)
  assert.equal(routeSource.includes("paymentUiMode: 'preview_simulation'"), true)
  assert.equal(routeSource.includes("await import('@/lib/db')"), true)
  assert.equal(routeSource.includes("from '@/lib/db'"), false)

  console.log('booking_custom_bundle_preview_wizard_handoff_contract OK')
  console.log('preview wizard handoff: verified')
  console.log('preview action wiring: verified')
  console.log('preview recovery route: verified')
}

try {
  main()
} catch (error) {
  fail('Unexpected failure while validating the preview wizard handoff contract.', error)
}
