export type BookingPaymentMethodSlug = 'pago_movil'

export interface BookingPaymentMethodConfig {
  slug: BookingPaymentMethodSlug
  enabled: boolean
  name: string
  beneficiaryName: string
  beneficiaryDocument: string
  bankName: string
  phoneNumber: string
  referenceHint: string
  customerMessage: string
}

export interface BookingPaymentSettings {
  paymentWindowMinutes: number
  primaryMethodSlug: BookingPaymentMethodSlug
  methods: BookingPaymentMethodConfig[]
}

// Fuente operativa temporal en codigo.
// En una fase posterior puede migrarse a DB o configuracion editable interna.
export const BOOKING_PAYMENT_SETTINGS: BookingPaymentSettings = {
  paymentWindowMinutes: 60,
  primaryMethodSlug: 'pago_movil',
  methods: [
    {
      slug: 'pago_movil',
      enabled: true,
      name: 'Pago Movil',
      beneficiaryName: 'REEMPLAZAR_BENEFICIARIO',
      beneficiaryDocument: 'REEMPLAZAR_DOCUMENTO',
      bankName: 'REEMPLAZAR_BANCO',
      phoneNumber: 'REEMPLAZAR_TELEFONO',
      referenceHint: 'Usa tu codigo de solicitud como referencia al reportar el pago.',
      customerMessage:
        'Tu bloque quedara apartado por 1 hora mientras verificamos el pago manualmente.',
    },
  ],
}

export function getPrimaryPaymentMethod(): BookingPaymentMethodConfig {
  const primaryMethod = BOOKING_PAYMENT_SETTINGS.methods.find(
    (method) => method.slug === BOOKING_PAYMENT_SETTINGS.primaryMethodSlug && method.enabled,
  )

  if (primaryMethod) {
    return primaryMethod
  }

  const firstEnabledMethod = BOOKING_PAYMENT_SETTINGS.methods.find((method) => method.enabled)
  if (firstEnabledMethod) {
    return firstEnabledMethod
  }

  throw new Error('No hay metodos de pago manual habilitados en BOOKING_PAYMENT_SETTINGS.')
}

export function getPaymentWindowMinutes(): number {
  return BOOKING_PAYMENT_SETTINGS.paymentWindowMinutes
}
