export type RecoveryBootstrapResponseState =
  | 'pending_payment'
  | 'payment_reported'
  | 'confirmed'
  | 'expired'
  | 'cancelled'
  | 'invalid_link'
  | 'not_found'
  | 'unavailable'

export function shouldClearInitialRecoveryToken(input: {
  responseOk: boolean
  responseState: string | null
  hasValidPendingSession: boolean
}): boolean {
  if (!input.responseOk || input.responseState === null) {
    return false
  }

  if (input.responseState === 'pending_payment') {
    return input.hasValidPendingSession
  }

  return (
    input.responseState === 'payment_reported' ||
    input.responseState === 'confirmed' ||
    input.responseState === 'expired' ||
    input.responseState === 'cancelled' ||
    input.responseState === 'invalid_link' ||
    input.responseState === 'not_found' ||
    input.responseState === 'unavailable'
  )
}
