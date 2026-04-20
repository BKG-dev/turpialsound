export type BookingPaymentMethodSlug = 'pago_movil' | 'transferencia' | 'binance' | 'efectivo'

export interface BookingPaymentMethodDetails {
  beneficiaryName?: string
  beneficiaryDocument?: string
  bankName?: string
  phoneNumber?: string
  accountNumber?: string
  accountHolder?: string
  payId?: string
  qrImageUrl?: string
}

export interface BookingPaymentMethodConfig {
  slug: BookingPaymentMethodSlug
  enabled: boolean
  name: string
  details?: BookingPaymentMethodDetails
  referenceHint: string
  customerMessage: string
}

export interface BookingPaymentSettings {
  paymentWindowMinutes: number
  primaryMethodSlug: BookingPaymentMethodSlug
  methods: BookingPaymentMethodConfig[]
}

const PAYMENT_DETAILS_FALLBACK = 'Por definir'

function resolvePaymentEnvValue(value: string | undefined): string {
  const normalized = value?.trim()
  if (!normalized) return PAYMENT_DETAILS_FALLBACK
  if (normalized.toUpperCase().startsWith('REEMPLAZAR_')) return PAYMENT_DETAILS_FALLBACK
  return normalized
}

function buildMobileBeneficiaryDocument(): string {
  const idType = resolvePaymentEnvValue(process.env.BOOKINGS_PAYMENT_MOBILE_ID_TYPE)
  const idNumber = resolvePaymentEnvValue(process.env.BOOKINGS_PAYMENT_MOBILE_ID_NUMBER)

  if (idType === PAYMENT_DETAILS_FALLBACK && idNumber === PAYMENT_DETAILS_FALLBACK) {
    return PAYMENT_DETAILS_FALLBACK
  }

  if (idType === PAYMENT_DETAILS_FALLBACK) return idNumber
  if (idNumber === PAYMENT_DETAILS_FALLBACK) return idType
  return `${idType} ${idNumber}`
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
      name: 'Pago Móvil',
      details: {
        beneficiaryName: PAYMENT_DETAILS_FALLBACK,
        beneficiaryDocument: buildMobileBeneficiaryDocument(),
        bankName: resolvePaymentEnvValue(process.env.BOOKINGS_PAYMENT_MOBILE_BANK),
        phoneNumber: resolvePaymentEnvValue(process.env.BOOKINGS_PAYMENT_MOBILE_PHONE),
      },
      referenceHint: 'Usa tu codigo de solicitud como referencia al reportar el pago.',
      customerMessage:
        'Tu bloque quedara apartado por 1 hora mientras verificamos el pago manualmente.',
    },
    {
      slug: 'transferencia',
      enabled: true,
      name: 'Transferencia',
      details: {
        bankName: resolvePaymentEnvValue(process.env.BOOKINGS_BANK_TRANSFER_BANK),
        accountNumber: resolvePaymentEnvValue(process.env.BOOKINGS_BANK_TRANSFER_ACCOUNT_NUMBER),
        accountHolder: resolvePaymentEnvValue(process.env.BOOKINGS_BANK_TRANSFER_BENEFICIARY),
        beneficiaryDocument: buildMobileBeneficiaryDocument(),
      },
      referenceHint: 'Usa tu codigo de solicitud como referencia al reportar el pago.',
      customerMessage: 'Envia tu pago y conserva el comprobante para reportarlo.',
    },
    {
      slug: 'binance',
      enabled: true,
      name: 'Binance',
      details: {
        payId: resolvePaymentEnvValue(process.env.BOOKINGS_BINANCE_PAY_ID),
        phoneNumber: resolvePaymentEnvValue(process.env.BOOKINGS_BINANCE_PHONE),
      },
      referenceHint: 'Usa tu codigo de solicitud como referencia al reportar el pago.',
      customerMessage: 'Envia tu pago y conserva el comprobante para reportarlo.',
    },
    {
      slug: 'efectivo',
      enabled: true,
      name: 'Efectivo',
      referenceHint: 'Indica tu codigo de solicitud al momento de pagar.',
      customerMessage:
        'Solo valido para pago presencial dentro de la ventana activa del apartado.',
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

export function getEnabledPaymentMethods(): BookingPaymentMethodConfig[] {
  return BOOKING_PAYMENT_SETTINGS.methods.filter((method) => method.enabled)
}
