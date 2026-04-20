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
