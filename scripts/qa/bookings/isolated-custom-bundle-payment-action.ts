import { main } from './isolated-custom-bundle-payment-receipt-action'

main().catch((error) => {
  console.error('booking_isolated_custom_bundle_payment_action FAILED')
  console.error('Unexpected failure while delegating to the receipt action gate.')
  if (error instanceof Error && error.stack) {
    console.error(error.stack)
  }
  process.exit(1)
})
