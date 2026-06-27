export const CUSTOM_BUNDLE_BOOKING_EVENT_TITLE = 'Solicitud - Arma tu paquete' as const

export function isCustomBundleBookingCandidate(input: { eventTitle: unknown }): boolean {
  return (
    typeof input.eventTitle === 'string' &&
    input.eventTitle.trim() === CUSTOM_BUNDLE_BOOKING_EVENT_TITLE
  )
}
