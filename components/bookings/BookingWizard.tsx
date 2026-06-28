'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { ServiceSelectStep } from '@/components/bookings/steps/ServiceSelectStep'
import { VariantSelectStep } from '@/components/bookings/steps/VariantSelectStep'
import { DateTimeStep, deriveEndTime } from '@/components/bookings/steps/DateTimeStep'
import { ExtrasStep } from '@/components/bookings/steps/ExtrasStep'
import { CustomBundleStep } from '@/components/bookings/steps/CustomBundleStep'
import {
  ContactStep,
  isValidEmail,
  isValidWhatsappVe,
  normalizeWhatsappVe,
} from '@/components/bookings/steps/ContactStep'
import { SummaryStep } from '@/components/bookings/steps/SummaryStep'
import { PaymentCountdownCTA } from '@/components/bookings/PaymentCountdownCTA'
import { CATALOG_SERVICES, CATALOG_VARIANTS } from '@/lib/bookings/catalog'
import { reportBookingPayment, submitBookingRequest } from '@/lib/bookings/actions'
import { submitCustomBundlePreviewAction } from '@/lib/bookings/custom-bundle-preview-submission-action'
import { buildBookingEstimate } from '@/lib/bookings/estimate'
import {
  countCustomBundleAggregateOnlySelections,
  buildCustomBundleEstimate,
  getCustomBundleItemBySlug,
  splitCustomBundleEstimateLines,
  normalizeCustomBundleSelections,
} from '@/lib/bookings/custom-bundle'
import {
  getRecordingAddonsForService,
  getSelectedRecordingAddonVisualTotalUsd,
} from '@/lib/bookings/recording-addons'
import {
  formatUsdByCurrency,
  useBcvRate,
} from '@/lib/bookings/currency-display'
import type { WhatsappVerificationConfig } from '@/lib/bookings/whatsapp-verify-config'
import type {
  BookingMode,
  CustomBundleSelection,
  SelectedBookingItem,
} from '@/lib/bookings/types'
import type {
  BookingPaymentMethodConfig,
  BookingPaymentMethodSlug,
} from '@/lib/bookings/payment-settings.types'
import type { CustomBundlePreviewSubmissionPublicResult } from '@/lib/bookings/custom-bundle-preview-submission-core'

interface WizardStepDef {
  id: string
  label: string
  title: string
}

const SINGLE_SERVICE_STEPS: WizardStepDef[] = [
  { id: 'service', label: 'Servicio', title: 'Que tipo de servicio necesitas?' },
  { id: 'variant', label: 'Modalidad', title: 'Elige la modalidad' },
  { id: 'date', label: 'Fecha', title: 'Fecha y bloque horario' },
  { id: 'extras', label: 'Extras', title: 'Requerimientos adicionales' },
  { id: 'contact', label: 'Tus datos', title: 'Datos del solicitante' },
  { id: 'summary', label: 'Resumen', title: 'Revisa tu solicitud' },
]

const CUSTOM_BUNDLE_STEPS: WizardStepDef[] = [
  { id: 'service', label: 'Servicio', title: 'Que tipo de servicio necesitas?' },
  { id: 'bundle', label: 'Paquete', title: 'Arma tu paquete' },
  { id: 'contact', label: 'Tus datos', title: 'Datos del solicitante' },
  { id: 'summary', label: 'Resumen', title: 'Revisa tu simulacion' },
]

interface WizardData {
  bookingMode: BookingMode
  selectedItems: SelectedBookingItem[]
  customBundleSelections: CustomBundleSelection[]
  eventDate: string | null
  startTime: string | null
  durationMinutes: number | null
  extrasNotes: string
  extrasTechnician: boolean
  extrasBackline: boolean
  recordingAddonSlugs: string[]
  projectTopicCount: number
  requesterName: string
  requesterEmail: string
  requesterPhone: string
  whatsappConsentAccepted: boolean
}

const INITIAL_DATA: WizardData = {
  bookingMode: 'single',
  selectedItems: [],
  customBundleSelections: [],
  eventDate: null,
  startTime: null,
  durationMinutes: null,
  extrasNotes: '',
  extrasTechnician: true,
  extrasBackline: true,
  recordingAddonSlugs: [],
  projectTopicCount: 1,
  requesterName: '',
  requesterEmail: '',
  requesterPhone: '',
  whatsappConsentAccepted: true,
}

const PAYMENT_PROOF_MAX_SIZE_BYTES = Math.floor(4.5 * 1024 * 1024)
const PAYMENT_PROOF_ACCEPT_ATTR = 'image/jpeg,image/png,image/webp,image/avif'
const PAYMENT_PROOF_ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
])

type PostSubmitOperationalStatus = 'pending_payment' | 'payment_reported'
type WhatsappVerificationStatus =
  | 'idle'
  | 'loading'
  | 'pending'
  | 'verified'
  | 'failed'
  | 'expired'
  | 'not_found'

interface WhatsappVerificationState {
  status: WhatsappVerificationStatus
  challengeId: string | null
  code: string | null
  expiresAt: string | null
  verifiedAt: string | null
  phone: string | null
  error: string | null
}

interface BookingDraftV1 {
  savedAt: string
  expiresAt: string
  currentStep: number
  furthestStep: number
  data: WizardData
  whatsappVerification: WhatsappVerificationState
  contactVerificationFlowMode?: ContactVerificationFlowMode
  secureLinkRequestState?: SecureLinkRequestState
  secureLinkRequestError?: string | null
  secureLinkRequestExpiresAt?: string | null
}

interface BookingPendingPaymentSessionV1 {
  version: 1
  savedAt: string
  publicCode: string
  operationalStatus: PostSubmitOperationalStatus
  serviceSlug: string | null
  variantSlug: string | null
  serviceName: string
  variantName: string
  eventDate: string | null
  startTime: string | null
  durationMinutes: number | null
  paymentDeadlineIso: string | null
  selectedPaymentMethodSlug: BookingPaymentMethodSlug
  paymentReference: string
  amountUsd: number
  amountBs: number
  amountUsdLabel: string
  amountBsLabel: string
  bcvRate: number
}

type ContactVerificationFlowMode = 'manual_code' | 'secure_link'

type SecureLinkRequestState = 'idle' | 'loading' | 'sent' | 'failed'

const BOOKING_DRAFT_STORAGE_KEY = 'turpial_booking_draft_v1'
const BOOKING_PENDING_PAYMENT_STORAGE_KEY = 'turpial_booking_pending_payment_v1'
const BOOKING_DRAFT_TTL_MS = 2 * 60 * 60 * 1000
const WHATSAPP_VERIFICATION_TTL_MS = 30 * 60 * 1000
const WHATSAPP_STATUS_POLL_MS = 2500
const TURPIAL_WHATSAPP_BOOKING_NUMBER = '584246707078'

const INITIAL_WHATSAPP_VERIFICATION_STATE: WhatsappVerificationState = {
  status: 'idle',
  challengeId: null,
  code: null,
  expiresAt: null,
  verifiedAt: null,
  phone: null,
  error: null,
}

function formatBookingDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`)
  return new Intl.DateTimeFormat('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
}

function formatCaracasDateTime(value: string): string {
  return new Intl.DateTimeFormat('es-VE', {
    timeZone: 'America/Caracas',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function normalizePaymentReference(value: string): string {
  return value.replace(/[^a-z0-9]/gi, '').toUpperCase()
}

function isAllowedPaymentProofMimeType(value: string): boolean {
  return PAYMENT_PROOF_ALLOWED_MIME_TYPES.has(value.trim().toLowerCase())
}

function getDigitsOnly(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '')
}

function formatBankVisible(value: string | null | undefined): string {
  const raw = value?.trim()
  if (!raw) return 'Por definir'
  const match = raw.match(/^(\d{4})\s*(.+)$/)
  if (match) return `(${match[1]}) ${match[2].trim()}`
  return raw
}

function getBankCodeForCopy(value: string | null | undefined): string {
  const digits = getDigitsOnly(value)
  if (digits.length >= 4) return digits.slice(0, 4)
  if (digits.length > 0) return digits
  return value?.trim() || ''
}

function parseIdentityData(value: string | null | undefined): { type: string; number: string } {
  const raw = value?.trim()
  if (!raw) return { type: 'V', number: '' }

  const normalized = raw
    .toUpperCase()
    .replace(/[_\s\-]+/g, '')

  let type = ''
  if (
    normalized.startsWith('CI') ||
    normalized.startsWith('CEDULA') ||
    normalized.startsWith('CEDULADEIDENTIDAD')
  ) {
    type = 'V'
  } else if (normalized.startsWith('RIF')) {
    type = 'J'
  } else if (/^[VEJGP]/.test(normalized)) {
    type = normalized[0]
  } else {
    type = 'V'
  }

  const digits = getDigitsOnly(raw)
  return { type, number: digits }
}

function splitMobilePhone(value: string | null | undefined): {
  operator: string
  number: string
} {
  const digits = getDigitsOnly(value)
  if (digits.length === 11 && digits.startsWith('0')) {
    return {
      operator: digits.slice(0, 4),
      number: digits.slice(4),
    }
  }

  return {
    operator: '',
    number: digits,
  }
}

function formatWhatsappVeVisible(value: string | null | undefined): string {
  const digits = getDigitsOnly(value)
  if (digits.length === 11 && digits.startsWith('0')) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`
  }
  return value?.trim() || 'Por definir'
}

function formatBsVisibleFromLabel(label: string): string {
  const digits = getDigitsOnly(label)
  if (!digits) return label
  return `Bs. ${Number(digits).toLocaleString('es-VE')}`
}

function getAmountCopyDigits(label: string): string {
  return getDigitsOnly(label)
}

function formatUsdtAmount(value: number): string {
  const rounded = Number(value.toFixed(2))
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2)
}

function sanitizeRecordingAddonSlugs(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return Array.from(
    new Set(
      value
        .filter((entry): entry is string => typeof entry === 'string')
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  )
}

function sanitizeProjectTopicCount(value: unknown): number {
  const numericValue = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numericValue)) return 1
  return Math.min(10, Math.max(1, Math.trunc(numericValue)))
}

interface BookingWizardProps {
  paymentMethods: BookingPaymentMethodConfig[]
  primaryPaymentMethodSlug: BookingPaymentMethodSlug
  paymentWindowMinutes: number
  whatsappVerificationConfig: WhatsappVerificationConfig
  isPreview: boolean
  onSubmissionStateChange?: (state: 'idle' | 'loading' | 'success' | 'error') => void
}

export function BookingWizard({
  paymentMethods,
  primaryPaymentMethodSlug,
  paymentWindowMinutes,
  whatsappVerificationConfig,
  isPreview,
  onSubmissionStateChange,
}: BookingWizardProps) {
  const primaryPaymentMethod =
    paymentMethods.find((method) => method.slug === primaryPaymentMethodSlug) ?? paymentMethods[0]
  const defaultSuccessPaymentMethod =
    paymentMethods.find((method) => method.slug === 'pago_movil') ?? primaryPaymentMethod
  if (!primaryPaymentMethod || !defaultSuccessPaymentMethod) {
    throw new Error('No hay metodos de pago manual habilitados para el wizard de reservas.')
  }

  const [currentStep, setCurrentStep] = useState(0)
  const [furthestStep, setFurthestStep] = useState(0)
  const [data, setData] = useState<WizardData>(INITIAL_DATA)
  const [submissionState, setSubmissionState] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle',
  )
  const [publicCode, setPublicCode] = useState<string | null>(null)
  const [assignedResourceName, setAssignedResourceName] = useState<string | null>(null)
  const [paymentDeadlineIso, setPaymentDeadlineIso] = useState<string | null>(null)
  const [showPaymentOptions, setShowPaymentOptions] = useState(false)
  const [selectedPaymentMethodSlug, setSelectedPaymentMethodSlug] =
    useState<BookingPaymentMethodSlug>(defaultSuccessPaymentMethod.slug)
  const [postSubmitOperationalStatus, setPostSubmitOperationalStatus] =
    useState<PostSubmitOperationalStatus>('pending_payment')
  const [paymentReportReference, setPaymentReportReference] = useState('')
  const [paymentReportProofFile, setPaymentReportProofFile] = useState<File | null>(null)
  const [paymentReportState, setPaymentReportState] =
    useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [paymentReportError, setPaymentReportError] = useState<string | null>(null)
  const [paymentReportWarning, setPaymentReportWarning] = useState<string | null>(null)
  const [paymentReportedAtIso, setPaymentReportedAtIso] = useState<string | null>(null)
  const [contactConsentError, setContactConsentError] = useState<string | null>(null)
  const [copyStatusKey, setCopyStatusKey] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [whatsappVerification, setWhatsappVerification] = useState<WhatsappVerificationState>(
    INITIAL_WHATSAPP_VERIFICATION_STATE,
  )
  const [contactVerificationFlowMode, setContactVerificationFlowMode] =
    useState<ContactVerificationFlowMode>(
      whatsappVerificationConfig.mode === 'secure_link' && whatsappVerificationConfig.secureLinkEnabled
        ? 'secure_link'
        : 'manual_code',
    )
  const [secureLinkRequestState, setSecureLinkRequestState] =
    useState<SecureLinkRequestState>('idle')
  const [secureLinkRequestError, setSecureLinkRequestError] = useState<string | null>(null)
  const [secureLinkRequestExpiresAt, setSecureLinkRequestExpiresAt] = useState<string | null>(null)
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false)
  const [hasRestoredPendingPayment, setHasRestoredPendingPayment] = useState(false)
  const [paymentRecoveryNotice, setPaymentRecoveryNotice] = useState<string | null>(null)
  const [submissionNotice, setSubmissionNotice] = useState<string | null>(null)
  const [customBundlePreviewResult, setCustomBundlePreviewResult] =
    useState<CustomBundlePreviewSubmissionPublicResult | null>(null)
  const pollTimerRef = useRef<number | null>(null)
  const wizardContainerRef = useRef<HTMLDivElement | null>(null)

  const isCustomBundleMode = data.bookingMode === 'custom_bundle'
  const wizardSteps = isCustomBundleMode ? CUSTOM_BUNDLE_STEPS : SINGLE_SERVICE_STEPS
  const totalSteps = wizardSteps.length
  const step = wizardSteps[currentStep]
  const contactStepIndex = isCustomBundleMode ? 2 : 4
  const summaryStepIndex = totalSteps - 1
  const bundleStepIndex = isCustomBundleMode ? 1 : null
  const dateStepIndex = isCustomBundleMode ? null : 2
  const extrasStepIndex = isCustomBundleMode ? null : 3
  const progressPercentage = ((currentStep + 1) / totalSteps) * 100
  const primaryItem = data.selectedItems[0] ?? null
  const selectedServiceSlug = primaryItem?.serviceSlug ?? null
  const selectedVariantSlug = primaryItem?.variantSlug ?? null
  const bookingEstimate = useMemo(
    () =>
      buildBookingEstimate({
        selectedItems: data.selectedItems,
        eventDate: data.eventDate,
        durationMinutes: data.durationMinutes,
        extrasTechnician: data.extrasTechnician,
        extrasBackline: data.extrasBackline,
      }),
    [
      data.selectedItems,
      data.eventDate,
      data.durationMinutes,
      data.extrasTechnician,
      data.extrasBackline,
    ],
  )
  const customBundleEstimate = useMemo(
    () =>
      buildCustomBundleEstimate({
        selections: data.customBundleSelections,
        eventDate: data.eventDate,
      }),
    [data.customBundleSelections, data.eventDate],
  )
  const activeEstimate = isCustomBundleMode ? customBundleEstimate : bookingEstimate
  const paymentWindowLabel =
    paymentWindowMinutes === 60 ? '1 hora' : `${paymentWindowMinutes} minutos`
  const bcvState = useBcvRate()
  const estimatedTotalUsdLabel = formatUsdByCurrency(activeEstimate.estimatedTotalUsd, 'usd', bcvState.rate)
  const estimatedTotalBsLabel = formatUsdByCurrency(activeEstimate.estimatedTotalUsd, 'bs', bcvState.rate)
  const selectedPaymentMethod =
    paymentMethods.find((method) => method.slug === selectedPaymentMethodSlug) ??
    primaryPaymentMethod
  const selectedServiceName =
    CATALOG_SERVICES.find((service) => service.slug === selectedServiceSlug)?.name ??
    selectedServiceSlug ??
    ''
  const selectedVariantName =
    CATALOG_VARIANTS.find((variant) => variant.slug === selectedVariantSlug)?.name ??
    selectedVariantSlug ??
    ''
  const recordingAddonsForCurrentService = useMemo(
    () => getRecordingAddonsForService(selectedServiceSlug, selectedVariantSlug),
    [selectedServiceSlug, selectedVariantSlug],
  )
  const recordingAddonPreviewTotalUsd = useMemo(
    () =>
      getSelectedRecordingAddonVisualTotalUsd(
        data.recordingAddonSlugs,
        selectedServiceSlug,
        selectedVariantSlug,
        data.projectTopicCount,
      ),
    [data.recordingAddonSlugs, data.projectTopicCount, selectedServiceSlug, selectedVariantSlug],
  )
  const bookingDateLabel = data.eventDate ? formatBookingDate(data.eventDate) : null
  const activeDurationMinutes = isCustomBundleMode
    ? customBundleEstimate.totalDurationMinutes
    : data.durationMinutes
  const bookingEndTime =
    data.startTime && activeDurationMinutes !== null
      ? deriveEndTime(data.startTime, activeDurationMinutes)
      : null
  const durationLabel =
    activeDurationMinutes !== null
      ? activeDurationMinutes % 60 === 0
        ? `${activeDurationMinutes / 60} hora${activeDurationMinutes / 60 === 1 ? '' : 's'}`
        : `${Math.floor(activeDurationMinutes / 60)}h ${String(activeDurationMinutes % 60).padStart(2, '0')}m`
      : null
  const selectedExtras = [
    data.extrasTechnician ? 'Tecnico incluido' : null,
    data.extrasBackline ? 'Backline incluido' : null,
  ].filter(Boolean) as string[]
  const hasPurchaseExtras = selectedExtras.length > 0 || data.extrasNotes.trim().length > 0
  const activeAmountLabel = estimatedTotalBsLabel
  const secondaryAmountLabel = estimatedTotalUsdLabel
  const bsAmountEstimated = Number.isFinite(activeEstimate.estimatedTotalUsd * bcvState.rate)
    ? Math.round(activeEstimate.estimatedTotalUsd * bcvState.rate)
    : 0
  const bsAmountCopyValue =
    bsAmountEstimated > 0 ? String(bsAmountEstimated) : getAmountCopyDigits(activeAmountLabel)
  const bsAmountVisible =
    bsAmountCopyValue.length > 0
      ? `Bs. ${Number(bsAmountCopyValue).toLocaleString('es-VE')}`
      : formatBsVisibleFromLabel(activeAmountLabel)
  const usdtAmountValue = formatUsdtAmount(bookingEstimate.estimatedTotalUsd)
  const normalizedPaymentReference = publicCode ? normalizePaymentReference(publicCode) : ''
  const normalizedRequesterPhone = normalizeWhatsappVe(data.requesterPhone)
  const isSecureLinkEnabledByConfig = whatsappVerificationConfig.secureLinkEnabled
  const isSecureLinkFlowActive = contactVerificationFlowMode === 'secure_link'
  const whatsappVerifiedAtMs = whatsappVerification.verifiedAt
    ? new Date(whatsappVerification.verifiedAt).getTime()
    : Number.NaN
  const isWhatsappVerificationFresh =
    whatsappVerification.status === 'verified' &&
    Number.isFinite(whatsappVerifiedAtMs) &&
    Date.now() - whatsappVerifiedAtMs <= WHATSAPP_VERIFICATION_TTL_MS
  const canUsePreviewVerificationBypass = isPreview || isWhatsappVerificationFresh
  const paymentMethodNameForButton =
    selectedPaymentMethod.slug === 'efectivo' ? 'Notificar pago en efectivo' : 'Reportar pago'

  const mobilePhoneParts = splitMobilePhone(selectedPaymentMethod.details?.phoneNumber)
  const mobileIdentityData = parseIdentityData(selectedPaymentMethod.details?.beneficiaryDocument)

  const mobileBankVisible = formatBankVisible(selectedPaymentMethod.details?.bankName)
  const mobileBankCopyValue = getBankCodeForCopy(selectedPaymentMethod.details?.bankName)
  const mobileOperatorVisible = mobilePhoneParts.operator || 'Por definir'
  const mobileNumberVisible = mobilePhoneParts.number || 'Por definir'
  const mobileOperatorCopyValue = mobilePhoneParts.operator
  const mobileNumberCopyValue = mobilePhoneParts.number
  const mobileIdentityTypeVisible = mobileIdentityData.type
  const mobileIdentityNumberVisible = mobileIdentityData.number || 'Por definir'
  const mobileIdentityTypeCopyValue = mobileIdentityData.type
  const mobileIdentityNumberCopyValue = mobileIdentityData.number

  const transferIdentityData = parseIdentityData(selectedPaymentMethod.details?.beneficiaryDocument)
  const transferBankVisible = formatBankVisible(selectedPaymentMethod.details?.bankName)
  const transferBankCopyValue = getBankCodeForCopy(selectedPaymentMethod.details?.bankName)
  const transferIdentityTypeVisible = transferIdentityData.type
  const transferIdentityNumberVisible = transferIdentityData.number || 'Por definir'
  const transferIdentityTypeCopyValue = transferIdentityData.type
  const transferIdentityNumberCopyValue = transferIdentityData.number

  const binancePhoneVisible = formatWhatsappVeVisible(selectedPaymentMethod.details?.phoneNumber)
  const binancePhoneDigits = getDigitsOnly(selectedPaymentMethod.details?.phoneNumber)
  const binancePhoneCopyValue = binancePhoneDigits.startsWith('0')
    ? binancePhoneDigits.slice(1)
    : binancePhoneDigits
  const paymentDeadlineMs = useMemo(() => {
    if (!paymentDeadlineIso) return null
    const parsedDeadline = new Date(paymentDeadlineIso).getTime()
    return Number.isNaN(parsedDeadline) ? null : parsedDeadline
  }, [paymentDeadlineIso])
  const countdownStartSeconds = useMemo(() => {
    if (paymentDeadlineMs === null) {
      return paymentWindowMinutes * 60
    }
    return Math.max(0, Math.floor((paymentDeadlineMs - Date.now()) / 1000))
  }, [paymentDeadlineMs, paymentWindowMinutes])
  const bcvCompactLabel = useMemo(() => {
    if (bcvState.loading) {
      return 'TASA BCV = Bs. --.-- (actualizada: --)'
    }

    const dateLabel = bcvState.asOf
      ? new Intl.DateTimeFormat('sv-SE', {
          timeZone: 'America/Caracas',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
          .format(new Date(bcvState.asOf))
          .replace('T', ' ')
      : '--'

    const rateLabel = bcvState.rate.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

    if (bcvState.mode === 'live') {
      return `TASA BCV = Bs. ${rateLabel} (actualizada: ${dateLabel})`
    }

    return `TASA REFERENCIAL = Bs. ${rateLabel} (actualizada: ${dateLabel})`
  }, [bcvState])

  useEffect(() => {
    onSubmissionStateChange?.(submissionState)
  }, [onSubmissionStateChange, submissionState])

  useEffect(() => {
    if (!isSecureLinkEnabledByConfig) return
    if (typeof window === 'undefined') return

    const requestedFlow = new URLSearchParams(window.location.search).get('waFlow')
    if (requestedFlow === 'secure-link') {
      setContactVerificationFlowMode('secure_link')
    }
  }, [isSecureLinkEnabledByConfig])

  function clearWhatsappPollTimer() {
    if (pollTimerRef.current !== null) {
      window.clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }

  async function pollWhatsappVerificationStatus(challengeId: string) {
    try {
      const response = await fetch(
        `/api/whatsapp/lab/reservas/status?challengeId=${encodeURIComponent(challengeId)}`,
        { method: 'GET', cache: 'no-store' },
      )

      if (!response.ok) {
        setWhatsappVerification((current) => ({
          ...current,
          error: 'No pudimos validar el estado de WhatsApp. Intenta de nuevo.',
        }))
        return
      }

      const payload = (await response.json()) as {
        status: WhatsappVerificationStatus
        challengeId: string
        expiresAt: string | null
        verifiedAt: string | null
      }

      setWhatsappVerification((current) => ({
        ...current,
        challengeId: payload.challengeId,
        status: payload.status,
        expiresAt: payload.expiresAt,
        verifiedAt: payload.verifiedAt,
        phone: current.phone ?? normalizedRequesterPhone,
        error: null,
      }))

      if (payload.status === 'verified' || payload.status === 'expired' || payload.status === 'failed') {
        clearWhatsappPollTimer()
      }
    } catch {
      setWhatsappVerification((current) => ({
        ...current,
        error: 'No pudimos validar el estado de WhatsApp. Intenta de nuevo.',
      }))
    }
  }

  async function handleStartWhatsappVerification() {
    const phone = normalizedRequesterPhone
    if (!isValidWhatsappVe(phone)) {
      setWhatsappVerification((current) => ({
        ...current,
        status: 'failed',
        error: 'Introduce un WhatsApp valido antes de verificar.',
      }))
      return
    }

    if (isPreview) {
      const nowIso = new Date().toISOString()
      setWhatsappVerification({
        status: 'verified',
        challengeId: null,
        code: 'PREVIEW-WA',
        expiresAt: nowIso,
        verifiedAt: nowIso,
        phone,
        error: null,
      })
      return
    }

    setWhatsappVerification({
      status: 'loading',
      challengeId: null,
      code: null,
      expiresAt: null,
      verifiedAt: null,
      phone,
      error: null,
    })

    try {
      const response = await fetch('/api/whatsapp/lab/reservas/challenge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone }),
      })

      if (!response.ok) {
        setWhatsappVerification({
          status: 'failed',
          challengeId: null,
          code: null,
          expiresAt: null,
          verifiedAt: null,
          phone,
          error: 'No pudimos iniciar la verificacion. Intenta de nuevo.',
        })
        return
      }

      const payload = (await response.json()) as {
        challengeId: string
        code: string
        expiresAt: string
      }

      const whatsappText = encodeURIComponent(payload.code)
      const whatsappUrl = `https://wa.me/${TURPIAL_WHATSAPP_BOOKING_NUMBER}?text=${whatsappText}`
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer')

      setWhatsappVerification({
        status: 'pending',
        challengeId: payload.challengeId,
        code: payload.code,
        expiresAt: payload.expiresAt,
        verifiedAt: null,
        phone,
        error: null,
      })

      clearWhatsappPollTimer()
      pollTimerRef.current = window.setInterval(() => {
        void pollWhatsappVerificationStatus(payload.challengeId)
      }, WHATSAPP_STATUS_POLL_MS)
      await pollWhatsappVerificationStatus(payload.challengeId)
    } catch {
      setWhatsappVerification({
        status: 'failed',
        challengeId: null,
        code: null,
        expiresAt: null,
        verifiedAt: null,
        phone,
        error: 'No pudimos iniciar la verificacion. Intenta de nuevo.',
      })
    }
  }

  async function handleSendSecureLink() {
    const rawPhone = data.requesterPhone.trim()
    if (rawPhone.length === 0) {
      setSecureLinkRequestError('Ingresa tu número de WhatsApp para enviarte el enlace seguro.')
      setSecureLinkRequestState('failed')
      focusWhatsappInput()
      return
    }

    if (!isValidWhatsappVe(rawPhone)) {
      setSecureLinkRequestError('Ingresa un número de WhatsApp válido.')
      setSecureLinkRequestState('failed')
      focusWhatsappInput()
      return
    }

    if (!data.whatsappConsentAccepted) {
      const consentMessage =
        'Debes aceptar la comunicacion por WhatsApp para enviarte el enlace seguro de seguimiento.'
      setContactConsentError(consentMessage)
      setSecureLinkRequestError(consentMessage)
      setSecureLinkRequestState('failed')
      focusWhatsappConsentBlock()
      return
    }
    setContactConsentError(null)

    if (!isSecureLinkEnabledByConfig) {
      setSecureLinkRequestError('El enlace seguro no esta disponible en este entorno.')
      setSecureLinkRequestState('failed')
      return
    }

    if (isPreview) {
      setSecureLinkRequestState('sent')
      setSecureLinkRequestError(null)
      setSecureLinkRequestExpiresAt(
        new Date(
          Date.now() + whatsappVerificationConfig.secureLinkTtlMinutes * 60 * 1000,
        ).toISOString(),
      )
      return
    }

    const phone = normalizedRequesterPhone

    const bookingEndTime =
      data.startTime && data.durationMinutes !== null
        ? deriveEndTime(data.startTime, data.durationMinutes)
        : null

    if (!data.eventDate || !data.startTime || data.durationMinutes === null || !bookingEndTime) {
      setSecureLinkRequestError('Debes completar fecha, inicio y finalizacion antes de continuar.')
      setSecureLinkRequestState('failed')
      return
    }

    setSecureLinkRequestState('loading')
    setSecureLinkRequestError(null)

    try {
      const response = await fetch('/api/bookings/whatsapp-secure-link?waFlow=secure-link', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          requesterName: data.requesterName,
          requesterEmail: data.requesterEmail,
          requesterPhone: phone,
          whatsappConsentAccepted: data.whatsappConsentAccepted,
          endTime: bookingEndTime,
          draft: {
            currentStep,
            furthestStep,
            data,
          },
        }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string; fallback?: string }
          | null
        if (payload?.error === 'consent_required') {
          const consentMessage =
            'Debes aceptar la comunicacion por WhatsApp para enviarte el enlace seguro de seguimiento.'
          setContactConsentError(consentMessage)
          setSecureLinkRequestError(consentMessage)
          focusWhatsappConsentBlock()
        } else if (payload?.fallback === 'manual_code') {
          setContactVerificationFlowMode('manual_code')
          setSecureLinkRequestError(
            'No pudimos enviar el enlace seguro. Puedes verificar con codigo manual.',
          )
        } else {
          setSecureLinkRequestError('No pudimos enviar el enlace seguro. Intenta nuevamente.')
        }
        setSecureLinkRequestState('failed')
        return
      }

      const payload = (await response.json()) as { expiresAt?: string }
      setSecureLinkRequestExpiresAt(payload.expiresAt ?? null)
      setSecureLinkRequestState('sent')
      setSecureLinkRequestError(null)
    } catch {
      setSecureLinkRequestError('No pudimos enviar el enlace seguro. Intenta nuevamente.')
      setSecureLinkRequestState('failed')
    }
  }

  async function handleManualWhatsappStatusCheck() {
    if (!whatsappVerification.challengeId) return
    await pollWhatsappVerificationStatus(whatsappVerification.challengeId)
  }

  function handleRetryOpenWhatsapp() {
    if (isPreview) {
      return
    }

    if (!whatsappVerification.code) return
    const whatsappText = encodeURIComponent(whatsappVerification.code)
    const whatsappUrl = `https://wa.me/${TURPIAL_WHATSAPP_BOOKING_NUMBER}?text=${whatsappText}`
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
  }

  async function handleCopyWhatsappCode() {
    if (!whatsappVerification.code) return
    await handleCopy('wa-verify-code', whatsappVerification.code)
  }

  useEffect(() => {
    return () => {
      clearWhatsappPollTimer()
    }
  }, [])

  useEffect(() => {
    if (!hasRestoredDraft) return
    if (!normalizedRequesterPhone) return

    if (
      whatsappVerification.phone &&
      normalizeWhatsappVe(whatsappVerification.phone) !== normalizedRequesterPhone &&
      whatsappVerification.status !== 'idle'
    ) {
      clearWhatsappPollTimer()
      setWhatsappVerification(INITIAL_WHATSAPP_VERIFICATION_STATE)
      setSecureLinkRequestState('idle')
      setSecureLinkRequestError(null)
      setSecureLinkRequestExpiresAt(null)
    }
  }, [hasRestoredDraft, normalizedRequesterPhone, whatsappVerification])

  useEffect(() => {
    if (hasRestoredDraft) return
    try {
      const raw = window.localStorage.getItem(BOOKING_DRAFT_STORAGE_KEY)
      if (!raw) {
        setHasRestoredDraft(true)
        return
      }

      const parsed = JSON.parse(raw) as BookingDraftV1
      if (!parsed?.expiresAt || new Date(parsed.expiresAt).getTime() < Date.now()) {
        window.localStorage.removeItem(BOOKING_DRAFT_STORAGE_KEY)
        setHasRestoredDraft(true)
        return
      }

      const restoredData = parsed.data ?? INITIAL_DATA
      setData({
        ...INITIAL_DATA,
        ...restoredData,
        bookingMode: restoredData.bookingMode === 'custom_bundle' ? 'custom_bundle' : 'single',
        customBundleSelections: normalizeCustomBundleSelections(restoredData.customBundleSelections ?? []),
        recordingAddonSlugs: sanitizeRecordingAddonSlugs(restoredData.recordingAddonSlugs),
        projectTopicCount: sanitizeProjectTopicCount(restoredData.projectTopicCount),
      })
      setCurrentStep(
        typeof parsed.currentStep === 'number'
          ? Math.max(0, Math.min(parsed.currentStep, totalSteps - 1))
          : 0,
      )
      setFurthestStep(
        typeof parsed.furthestStep === 'number'
          ? Math.max(0, Math.min(parsed.furthestStep, totalSteps - 1))
          : 0,
      )
      if (parsed.whatsappVerification) {
        setWhatsappVerification(parsed.whatsappVerification)
      }
      if (parsed.contactVerificationFlowMode === 'manual_code' || parsed.contactVerificationFlowMode === 'secure_link') {
        setContactVerificationFlowMode(parsed.contactVerificationFlowMode)
      }
      if (parsed.secureLinkRequestState) {
        setSecureLinkRequestState(parsed.secureLinkRequestState)
      }
      setSecureLinkRequestError(parsed.secureLinkRequestError ?? null)
      setSecureLinkRequestExpiresAt(parsed.secureLinkRequestExpiresAt ?? null)
    } catch {
      window.localStorage.removeItem(BOOKING_DRAFT_STORAGE_KEY)
    } finally {
      setHasRestoredDraft(true)
    }
  }, [hasRestoredDraft, totalSteps])

  useEffect(() => {
    if (!hasRestoredDraft || hasRestoredPendingPayment) return
    setHasRestoredPendingPayment(true)

    try {
      const raw = window.localStorage.getItem(BOOKING_PENDING_PAYMENT_STORAGE_KEY)
      if (!raw) return

      const parsed = JSON.parse(raw) as BookingPendingPaymentSessionV1
      if (!parsed || parsed.version !== 1 || !parsed.publicCode) {
        window.localStorage.removeItem(BOOKING_PENDING_PAYMENT_STORAGE_KEY)
        return
      }

      if (parsed.operationalStatus === 'pending_payment' && parsed.paymentDeadlineIso) {
        const deadlineMs = new Date(parsed.paymentDeadlineIso).getTime()
        if (Number.isFinite(deadlineMs) && deadlineMs <= Date.now()) {
          window.localStorage.removeItem(BOOKING_PENDING_PAYMENT_STORAGE_KEY)
          setPaymentRecoveryNotice('Tu ventana de pago anterior vencio. Puedes crear una nueva solicitud.')
          return
        }
      }

      const restoredMethod =
        paymentMethods.find((method) => method.slug === parsed.selectedPaymentMethodSlug)?.slug ??
        defaultSuccessPaymentMethod.slug
      const restoredSelectedItem =
        parsed.serviceSlug && parsed.variantSlug
          ? [{ serviceSlug: parsed.serviceSlug, variantSlug: parsed.variantSlug, quantity: 1 }]
          : []

      setData((current) => ({
        ...current,
        selectedItems: restoredSelectedItem,
        eventDate: parsed.eventDate,
        startTime: parsed.startTime,
        durationMinutes: parsed.durationMinutes,
      }))
      setSubmissionState('success')
      setPublicCode(parsed.publicCode)
      setAssignedResourceName(null)
      setPaymentDeadlineIso(parsed.paymentDeadlineIso)
      setShowPaymentOptions(true)
      setSelectedPaymentMethodSlug(restoredMethod)
      setPostSubmitOperationalStatus(parsed.operationalStatus)
      setPaymentReportReference(parsed.paymentReference || normalizePaymentReference(parsed.publicCode))
      setPaymentReportProofFile(null)
      setPaymentReportState('idle')
      setPaymentReportError(null)
      setPaymentReportWarning(null)
      setPaymentReportedAtIso(
        parsed.operationalStatus === 'payment_reported' ? parsed.savedAt : null,
      )
      setSubmitError(null)
      setPaymentRecoveryNotice('Continuamos con tu pago pendiente para que no pierdas el apartado.')
    } catch {
      window.localStorage.removeItem(BOOKING_PENDING_PAYMENT_STORAGE_KEY)
    }
  }, [
    defaultSuccessPaymentMethod.slug,
    hasRestoredDraft,
    hasRestoredPendingPayment,
    paymentMethods,
  ])

  useEffect(() => {
    if (!hasRestoredDraft) return
    if (submissionState !== 'success' || !publicCode) return

    const pendingPaymentSession: BookingPendingPaymentSessionV1 = {
      version: 1,
      savedAt: new Date().toISOString(),
      publicCode,
      operationalStatus: postSubmitOperationalStatus,
      serviceSlug: selectedServiceSlug,
      variantSlug: selectedVariantSlug,
      serviceName: selectedServiceName,
      variantName: selectedVariantName,
      eventDate: data.eventDate,
      startTime: data.startTime,
      durationMinutes: data.durationMinutes,
      paymentDeadlineIso,
      selectedPaymentMethodSlug,
      paymentReference: paymentReportReference.trim() || normalizePaymentReference(publicCode),
      amountUsd: bookingEstimate.estimatedTotalUsd,
      amountBs: bsAmountEstimated,
      amountUsdLabel: secondaryAmountLabel,
      amountBsLabel: activeAmountLabel,
      bcvRate: bcvState.rate,
    }

    window.localStorage.setItem(
      BOOKING_PENDING_PAYMENT_STORAGE_KEY,
      JSON.stringify(pendingPaymentSession),
    )
  }, [
    activeAmountLabel,
    bcvState.rate,
    bookingEstimate.estimatedTotalUsd,
    bsAmountEstimated,
    data.durationMinutes,
    data.eventDate,
    data.startTime,
    hasRestoredDraft,
    paymentDeadlineIso,
    paymentReportReference,
    postSubmitOperationalStatus,
    publicCode,
    secondaryAmountLabel,
    selectedPaymentMethodSlug,
    selectedServiceName,
    selectedServiceSlug,
    selectedVariantName,
    selectedVariantSlug,
    submissionState,
  ])

  useEffect(() => {
    if (!hasRestoredDraft) return

    const draft: BookingDraftV1 = {
      savedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + BOOKING_DRAFT_TTL_MS).toISOString(),
      currentStep,
      furthestStep,
      data,
      whatsappVerification,
      contactVerificationFlowMode,
      secureLinkRequestState,
      secureLinkRequestError,
      secureLinkRequestExpiresAt,
    }

    window.localStorage.setItem(BOOKING_DRAFT_STORAGE_KEY, JSON.stringify(draft))
  }, [
    hasRestoredDraft,
    currentStep,
    furthestStep,
    data,
    whatsappVerification,
    contactVerificationFlowMode,
    secureLinkRequestState,
    secureLinkRequestError,
    secureLinkRequestExpiresAt,
  ])

  useEffect(() => {
    if (currentStep !== contactStepIndex) return
    if (!isWhatsappVerificationFresh) return

    const timer = window.setTimeout(() => {
      setCurrentStep((value) => (value === contactStepIndex ? summaryStepIndex : value))
      setFurthestStep((value) => Math.max(value, summaryStepIndex))
    }, 450)

    return () => window.clearTimeout(timer)
  }, [contactStepIndex, currentStep, isWhatsappVerificationFresh, summaryStepIndex])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const container = wizardContainerRef.current
    if (!container) return

    container.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }, [currentStep])

  const canProceed = isCustomBundleMode
    ? currentStep === 0
      ? selectedServiceSlug !== null
      : currentStep === 1
        ? data.eventDate !== null &&
          data.startTime !== null &&
          customBundleEstimate.totalDurationMinutes > 0 &&
          customBundleEstimate.selectionCount > 0 &&
          !customBundleEstimate.isBlocked
        : currentStep === 2
          ? data.requesterName.trim() !== '' &&
            isValidEmail(data.requesterEmail) &&
            isValidWhatsappVe(data.requesterPhone) &&
            data.whatsappConsentAccepted &&
            canUsePreviewVerificationBypass
          : currentStep === 3
            ? true
            : false
    : currentStep === 0
      ? selectedServiceSlug !== null
      : currentStep === 1
        ? selectedVariantSlug !== null
        : currentStep === 2
          ? data.eventDate !== null && data.startTime !== null && data.durationMinutes !== null
          : currentStep === 3
            ? true
            : currentStep === contactStepIndex
              ? data.requesterName.trim() !== '' &&
                isValidEmail(data.requesterEmail) &&
                isValidWhatsappVe(data.requesterPhone) &&
                data.whatsappConsentAccepted &&
                canUsePreviewVerificationBypass
              : currentStep === summaryStepIndex
                ? true
                : false
  const contactDataIsComplete =
    data.requesterName.trim() !== '' &&
    isValidEmail(data.requesterEmail) &&
    isValidWhatsappVe(data.requesterPhone) &&
    data.whatsappConsentAccepted
  const isContactVerificationRunning =
    whatsappVerification.status === 'loading' ||
    whatsappVerification.status === 'pending' ||
    secureLinkRequestState === 'loading'

  const contactPrimaryCtaLabel = canUsePreviewVerificationBypass
    ? 'Continuar al resumen'
    : isSecureLinkFlowActive
      ? secureLinkRequestState === 'loading'
        ? 'Enviando enlace...'
        : secureLinkRequestState === 'sent'
          ? 'Enlace enviado. Revisa WhatsApp'
          : 'Enviar enlace seguro a mi WhatsApp'
      : isContactVerificationRunning
        ? 'Esperando verificacion...'
        : 'Verificar WhatsApp y continuar'

  function focusWhatsappConsentBlock() {
    const consentBlock = document.getElementById('requester-whatsapp-consent-block')
    if (!(consentBlock instanceof HTMLElement)) return

    consentBlock.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
    consentBlock.focus({ preventScroll: true })
  }

  function focusWhatsappInput() {
    const whatsappInput = document.getElementById('requester-phone')
    if (!(whatsappInput instanceof HTMLElement)) return

    whatsappInput.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
    whatsappInput.focus({ preventScroll: true })
  }

  function setPrimaryItem(
    updater: (currentItem: SelectedBookingItem | null) => SelectedBookingItem | null,
  ) {
    setData((currentData) => {
      const nextItem = updater(currentData.selectedItems[0] ?? null)
      return {
        ...currentData,
        selectedItems: nextItem ? [nextItem] : [],
      }
    })
  }

  function toggleRecordingAddon(slug: string) {
    setData((currentData) => {
      const nextSlugs = currentData.recordingAddonSlugs.includes(slug)
        ? currentData.recordingAddonSlugs.filter((currentSlug) => currentSlug !== slug)
        : [...currentData.recordingAddonSlugs, slug]

      return {
        ...currentData,
        recordingAddonSlugs: nextSlugs,
      }
    })
  }

  function updateProjectTopicCount(nextValue: number) {
    setData((currentData) => ({
      ...currentData,
      projectTopicCount: sanitizeProjectTopicCount(nextValue),
    }))
  }

  function clearSubmissionArtifacts() {
    setSubmissionState('idle')
    setPublicCode(null)
    setAssignedResourceName(null)
    setPaymentDeadlineIso(null)
    setShowPaymentOptions(false)
    setSelectedPaymentMethodSlug(defaultSuccessPaymentMethod.slug)
    setPostSubmitOperationalStatus('pending_payment')
    setPaymentReportReference('')
    setPaymentReportProofFile(null)
    setPaymentReportState('idle')
    setPaymentReportError(null)
    setPaymentReportWarning(null)
    setPaymentReportedAtIso(null)
    setContactConsentError(null)
    setCopyStatusKey(null)
    setSubmitError(null)
    setSubmissionNotice(null)
    setCustomBundlePreviewResult(null)
    setPaymentRecoveryNotice(null)
  }

  function setBookingMode(nextMode: BookingMode) {
    setData((currentData) => ({
      ...currentData,
      bookingMode: nextMode,
    }))

    clearSubmissionArtifacts()
    setCurrentStep(nextMode === 'custom_bundle' ? 1 : 0)
    setFurthestStep(nextMode === 'custom_bundle' ? 1 : 0)
  }

  function toggleCustomBundleItem(itemSlug: string) {
    const item = getCustomBundleItemBySlug(itemSlug)
    if (!item || item.included) return

    setData((currentData) => {
      const currentSelections = normalizeCustomBundleSelections(currentData.customBundleSelections)
      const isAlreadySelected = currentSelections.some((selection) => selection.itemSlug === itemSlug)

      let nextSelections: CustomBundleSelection[]
      if (isAlreadySelected) {
        nextSelections = currentSelections.filter((selection) => selection.itemSlug !== itemSlug)
      } else if (item.groupSlug) {
        nextSelections = [
          ...currentSelections.filter((selection) => {
            const selectedItem = getCustomBundleItemBySlug(selection.itemSlug)
            return selectedItem?.groupSlug !== item.groupSlug
          }),
          {
            itemSlug: item.slug,
            quantity: item.minimumQuantity,
            sessionDurationMinutes: item.requiresSessionDuration ? item.minimumSessionMinutes : null,
          },
        ]
      } else {
        nextSelections = [
          ...currentSelections,
          {
            itemSlug: item.slug,
            quantity: item.minimumQuantity,
            sessionDurationMinutes: item.requiresSessionDuration ? item.minimumSessionMinutes : null,
          },
        ]
      }

      return {
        ...currentData,
        customBundleSelections: normalizeCustomBundleSelections(nextSelections),
      }
    })
  }

  function updateCustomBundleQuantity(itemSlug: string, nextQuantity: number) {
    const item = getCustomBundleItemBySlug(itemSlug)
    if (!item || item.included) return

    setData((currentData) => {
      const currentSelections = normalizeCustomBundleSelections(currentData.customBundleSelections)
      const nextSelections = currentSelections.map((selection) => {
        if (selection.itemSlug !== itemSlug) return selection
        return {
          ...selection,
          quantity: Math.max(
            item.minimumQuantity,
            item.maximumQuantity !== null
              ? Math.min(item.maximumQuantity, Math.trunc(nextQuantity))
              : Math.trunc(nextQuantity),
          ),
        }
      })

      return {
        ...currentData,
        customBundleSelections: normalizeCustomBundleSelections(nextSelections),
      }
    })
  }

  function updateCustomBundleDuration(itemSlug: string, nextDurationMinutes: number | null) {
    const item = getCustomBundleItemBySlug(itemSlug)
    if (!item || item.included || !item.requiresSessionDuration) return

    setData((currentData) => {
      const currentSelections = normalizeCustomBundleSelections(currentData.customBundleSelections)
      const nextSelections = currentSelections.map((selection) => {
        if (selection.itemSlug !== itemSlug) return selection
        return {
          ...selection,
          sessionDurationMinutes:
            nextDurationMinutes === null ? null : Math.max(0, Math.trunc(nextDurationMinutes)),
        }
      })

      return {
        ...currentData,
        customBundleSelections: normalizeCustomBundleSelections(nextSelections),
      }
    })
  }

  function handleNext() {
    if (currentStep === contactStepIndex && !data.whatsappConsentAccepted) {
      setContactConsentError(
        'Debes aceptar la comunicacion por WhatsApp para enviarte el enlace seguro de seguimiento.',
      )
      focusWhatsappConsentBlock()
      return
    }

    if (currentStep === contactStepIndex && !canUsePreviewVerificationBypass) {
      setSubmitError(
        isSecureLinkFlowActive
          ? 'Debes abrir el enlace seguro de WhatsApp antes de continuar al resumen.'
          : 'Debes verificar tu WhatsApp antes de continuar al resumen.',
      )
      return
    }

    if (currentStep < totalSteps - 1) {
      const nextStep = currentStep + 1
      setCurrentStep(nextStep)
      setFurthestStep((currentFurthestStep) => Math.max(currentFurthestStep, nextStep))
    }
  }

  function handleBack() {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1)
    }
  }

  function resetWizard() {
    clearWhatsappPollTimer()
    setCurrentStep(0)
    setFurthestStep(0)
    setData(INITIAL_DATA)
    setSubmissionState('idle')
    setPublicCode(null)
    setAssignedResourceName(null)
    setPaymentDeadlineIso(null)
    setShowPaymentOptions(false)
    setSelectedPaymentMethodSlug(defaultSuccessPaymentMethod.slug)
    setPostSubmitOperationalStatus('pending_payment')
    setPaymentReportReference('')
    setPaymentReportProofFile(null)
    setPaymentReportState('idle')
    setPaymentReportError(null)
    setPaymentReportWarning(null)
    setPaymentReportedAtIso(null)
    setContactConsentError(null)
    setCopyStatusKey(null)
    setSubmitError(null)
    setSubmissionNotice(null)
    setCustomBundlePreviewResult(null)
    setWhatsappVerification(INITIAL_WHATSAPP_VERIFICATION_STATE)
    setContactVerificationFlowMode(
      whatsappVerificationConfig.mode === 'secure_link' && whatsappVerificationConfig.secureLinkEnabled
        ? 'secure_link'
        : 'manual_code',
    )
    setSecureLinkRequestState('idle')
    setSecureLinkRequestError(null)
    setSecureLinkRequestExpiresAt(null)
    setHasRestoredPendingPayment(false)
    setPaymentRecoveryNotice(null)
    window.localStorage.removeItem(BOOKING_DRAFT_STORAGE_KEY)
    window.localStorage.removeItem(BOOKING_PENDING_PAYMENT_STORAGE_KEY)
  }

  async function handleContactPrimaryAction() {
    if (!contactDataIsComplete) {
      if (!data.whatsappConsentAccepted) {
        setContactConsentError(
          'Debes aceptar la comunicacion por WhatsApp para enviarte el enlace seguro de seguimiento.',
        )
        focusWhatsappConsentBlock()
      }
      return
    }

    if (canUsePreviewVerificationBypass) {
      handleNext()
      return
    }

    if (isSecureLinkFlowActive) {
      if (secureLinkRequestState !== 'loading') {
        setSubmitError(null)
        await handleSendSecureLink()
      }
      return
    }

    if (!isContactVerificationRunning) {
      console.info('[fallback_manual_code_used]', { event: 'fallback_manual_code_used' })
      setSubmitError(null)
      await handleStartWhatsappVerification()
    }
  }

  async function handleContactPrimarySecureLinkAction() {
    setSubmitError(null)

    if (isSecureLinkFlowActive && !canUsePreviewVerificationBypass) {
      if (secureLinkRequestState !== 'loading') {
        await handleSendSecureLink()
      }
      return
    }

    await handleContactPrimaryAction()
  }

  function markCopied(key: string) {
    setCopyStatusKey(key)
    window.setTimeout(() => {
      setCopyStatusKey((currentKey) => (currentKey === key ? null : currentKey))
    }, 1800)
  }

  async function handleCopy(key: string, value: string | undefined) {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      markCopied(key)
    } catch {
      // noop
    }
  }

  function handleStepClick(stepIndex: number) {
    if (submissionState === 'loading' || stepIndex > furthestStep || stepIndex === currentStep) {
      return
    }

    setCurrentStep(stepIndex)
  }

  async function handleSubmit() {
    if (submissionState === 'loading') return

    if (isCustomBundleMode) {
      if (!isPreview) {
        setSubmitError('El modo paquete solo esta disponible en Preview.')
        setSubmissionState('error')
        return
      }

      if (
        !data.eventDate ||
        !data.startTime ||
        customBundleEstimate.isBlocked ||
        customBundleEstimate.totalDurationMinutes <= 0 ||
        customBundleEstimate.selectionCount === 0
      ) {
        setSubmitError('El paquete requiere ajustes antes de simularse.')
        setSubmissionState('error')
        return
      }

      setSubmissionState('loading')
      clearSubmissionArtifacts()
      setSubmissionState('loading')
      setSubmitError(null)
      const canonicalPreviewSubmission = {
        contractVersion: 1 as const,
        bookingMode: 'custom_bundle' as const,
        eventDate: data.eventDate,
        startTime: data.startTime,
        items: normalizeCustomBundleSelections(data.customBundleSelections).map((selection) => ({
          itemSlug: selection.itemSlug,
          quantity: selection.quantity,
          sessionDurationMinutes: selection.sessionDurationMinutes,
        })),
        extrasNotes: data.extrasNotes,
        requester: {
          name: data.requesterName,
          email: data.requesterEmail,
          phone: normalizeWhatsappVe(data.requesterPhone),
          whatsappConsentAccepted: data.whatsappConsentAccepted,
        },
      }

      const result = await submitCustomBundlePreviewAction(canonicalPreviewSubmission)
      if (!result.ok) {
        setSubmitError(result.message)
        setSubmissionState('error')
        return
      }

      setSubmissionNotice(result.message)
      setCustomBundlePreviewResult(result)
      setSubmissionState('success')
      return
    }

    if (
      bookingEstimate.isBlocked ||
      !selectedServiceSlug ||
      !selectedVariantSlug ||
      !data.eventDate ||
      !data.startTime ||
      !data.durationMinutes
    ) {
      setSubmitError('La solicitud requiere ajustes antes de enviarse.')
      setSubmissionState('error')
      return
    }

    if (!canUsePreviewVerificationBypass) {
      setSubmitError('Debes verificar tu WhatsApp antes de crear la solicitud de reserva.')
      setSubmissionState('error')
      return
    }

    setSubmissionState('loading')
    setPublicCode(null)
    setAssignedResourceName(null)
    setPaymentDeadlineIso(null)
    setShowPaymentOptions(false)
    setSelectedPaymentMethodSlug(defaultSuccessPaymentMethod.slug)
    setPostSubmitOperationalStatus('pending_payment')
    setPaymentReportReference('')
    setPaymentReportProofFile(null)
    setPaymentReportState('idle')
    setPaymentReportError(null)
    setPaymentReportWarning(null)
    setPaymentReportedAtIso(null)
    setSubmitError(null)
    setSubmissionNotice(null)
    setPaymentRecoveryNotice(null)

    const result = await submitBookingRequest({
      serviceSlug: selectedServiceSlug,
      variantSlug: selectedVariantSlug,
      eventDate: data.eventDate,
      startTime: data.startTime,
      durationMinutes: data.durationMinutes,
      extrasNotes: data.extrasNotes,
      extrasTechnician: data.extrasTechnician,
      extrasBackline: data.extrasBackline,
      requesterName: data.requesterName,
      requesterEmail: data.requesterEmail,
      requesterPhone: normalizeWhatsappVe(data.requesterPhone),
      whatsappConsentAccepted: data.whatsappConsentAccepted,
    })

    if (result.success && result.publicCode) {
      setPublicCode(result.publicCode)
      setAssignedResourceName(result.assignedResourceName ?? null)
      setPaymentDeadlineIso(result.paymentDeadlineIso ?? null)
      setSubmissionNotice(result.message ?? null)
      setShowPaymentOptions(true)
      setSelectedPaymentMethodSlug(defaultSuccessPaymentMethod.slug)
      setPostSubmitOperationalStatus('pending_payment')
      setPaymentReportReference(normalizePaymentReference(result.publicCode))
      setPaymentReportProofFile(null)
      setPaymentReportState('idle')
      setPaymentReportError(null)
      setPaymentReportedAtIso(null)
      setPaymentRecoveryNotice(null)
      setSubmissionState('success')
    } else {
      setSubmitError(result.error ?? 'Error al enviar. Intenta de nuevo.')
      setSubmissionState('error')
    }
  }

  async function handleReportPayment() {
    if (!publicCode || paymentReportState === 'loading') return

    if (postSubmitOperationalStatus !== 'pending_payment') {
      setPaymentReportError('Esta solicitud ya no acepta reportes de pago.')
      setPaymentReportState('error')
      setPaymentReportWarning(null)
      return
    }

    const trimmedReference = paymentReportReference.trim()
    const requiresProofFile = selectedPaymentMethod.slug !== 'efectivo'

    if (!trimmedReference) {
      setPaymentReportError('La referencia de pago es obligatoria.')
      setPaymentReportState('error')
      setPaymentReportWarning(null)
      return
    }

    if (!isPreview) {
      if (requiresProofFile && !paymentReportProofFile) {
        setPaymentReportError('Sube tu comprobante en JPG, PNG, WEBP o AVIF.')
        setPaymentReportState('error')
        setPaymentReportWarning(null)
        return
      }

      if (paymentReportProofFile) {
        const proofType = paymentReportProofFile.type.toLowerCase()
        if (!isAllowedPaymentProofMimeType(proofType)) {
          setPaymentReportError('Formato no soportado. Sube una imagen JPG, PNG, WEBP o AVIF.')
          setPaymentReportState('error')
          setPaymentReportWarning(null)
          return
        }

        if (paymentReportProofFile.size > PAYMENT_PROOF_MAX_SIZE_BYTES) {
          setPaymentReportError('El comprobante supera el maximo permitido de 4.5 MB.')
          setPaymentReportState('error')
          setPaymentReportWarning(null)
          return
        }
      }
    }

    setPaymentReportState('loading')
    setPaymentReportError(null)
    setPaymentReportWarning(null)

    const paymentReportFormData = new FormData()
    paymentReportFormData.set('publicCode', publicCode)
    paymentReportFormData.set('paymentMethod', selectedPaymentMethod.slug)
    paymentReportFormData.set('paymentReference', trimmedReference)
    if (paymentReportProofFile) {
      paymentReportFormData.set('paymentProofFile', paymentReportProofFile)
    }

    const result = await reportBookingPayment(paymentReportFormData)

    if (!result.success) {
      setPaymentReportError(result.error ?? 'No pudimos registrar el pago reportado.')
      setPaymentReportState('error')
      setPaymentReportWarning(null)
      return
    }

    setPostSubmitOperationalStatus('payment_reported')
    setPaymentReportState('success')
    setPaymentReportWarning(result.message ?? result.warning ?? null)
    setPaymentReportedAtIso(result.paymentReportedAtIso ?? new Date().toISOString())
  }

  if (submissionState === 'success' && isCustomBundleMode && customBundlePreviewResult) {
    const simulatedEndTime =
      data.startTime && activeDurationMinutes !== null
        ? deriveEndTime(data.startTime, activeDurationMinutes)
        : null
    const {
      itemizedLines,
      aggregateOnlyLines,
      includedLines,
    } = splitCustomBundleEstimateLines(customBundleEstimate.lines)
    const aggregateOnlyCount = countCustomBundleAggregateOnlySelections(customBundleEstimate.lines)

    return (
      <div className="rounded-2xl border border-brand-border bg-brand-surface p-3">
        {submissionNotice && (
          <div className="mb-2 rounded-lg border border-amber-300/40 bg-amber-400/10 px-3 py-2 text-[11px] text-amber-100">
            {submissionNotice}
          </div>
        )}
        <div className="mb-2.5 rounded-lg border border-brand-border/70 bg-brand-bg/30 px-2.5 py-2">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-gold/10">
              <svg className="h-4 w-4 text-accent-gold" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M5 13l4 4L19 7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-sm font-bold leading-tight text-text-primary md:text-base">
                Simulacion completada
              </h2>
              <p className="mt-0.5 text-[11px] leading-snug text-text-secondary">
                No se creo BookingRequest, no se llamo Prisma y no se envio ninguna notificacion real.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-2">
            <div className="rounded-lg border border-brand-border bg-brand-bg/30 px-2 py-1.5">
              <div className="space-y-1.5 text-[11px] leading-snug">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-text-muted">Fecha</p>
                  <p className="font-medium text-text-primary">{bookingDateLabel ?? 'Por definir'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-text-muted">Horario</p>
                  <p className="font-medium text-text-primary">
                    {data.startTime}
                    {simulatedEndTime ? ` - ${simulatedEndTime}` : ''}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-text-muted">Duracion total</p>
                  <p className="font-medium text-text-primary">{durationLabel ?? '0 min'}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-brand-border bg-brand-bg/40 p-2">
              <div className="space-y-1.5 text-[11px] leading-snug">
                {itemizedLines.map((line) => (
                  <div key={`${line.item.slug}-${line.label}`}>
                    <p className="text-[10px] uppercase tracking-wide text-text-muted">{line.label}</p>
                    <p className="font-medium text-text-primary">
                      {`${line.quantity} ${line.item.commercialUnit} · ${line.lineTotalUsd} USD`}
                    </p>
                  </div>
                ))}
                {aggregateOnlyLines.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-text-muted">Adicionales del paquete</p>
                    <p className="font-medium text-text-primary">{customBundleEstimate.additionalSubtotalUsd} USD</p>
                    <p className="text-[10px] text-text-muted">
                      {aggregateOnlyCount} adicionales seleccionados
                    </p>
                  </div>
                )}
                {includedLines.map((line) => (
                  <div key={`${line.item.slug}-${line.label}`}>
                    <p className="text-[10px] uppercase tracking-wide text-text-muted">{line.label}</p>
                    <p className="font-medium text-text-primary">Incluido — 0 USD</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-brand-border bg-brand-bg/40 p-2">
            <div className="space-y-1.5 text-[11px] leading-snug">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-text-muted">Subtotal</p>
                <p className="font-medium text-text-primary">{customBundleEstimate.subtotalUsd} USD</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-text-muted">Recargo de fin de semana</p>
                <p className="font-medium text-text-primary">
                  {customBundleEstimate.adjustments.reduce((total, adjustment) => total + adjustment.amountUsd, 0)} USD
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-text-muted">Total estimado</p>
                <p className="font-medium text-text-primary">{customBundleEstimate.estimatedTotalUsd} USD</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-text-muted">Estado</p>
                <p className="font-medium text-text-primary">Preview / simulacion segura</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-text-muted">Simulada</p>
                <p className="font-medium text-text-primary">
                  {formatCaracasDateTime(customBundlePreviewResult.holdExpiresAtIso)}
                </p>
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-accent-gold/20 bg-accent-gold/5 px-3 py-2 text-[11px] leading-snug text-text-primary">
              <p className="font-medium">Continua al pago simulado sin token visible.</p>
              <Link
                href={customBundlePreviewResult.recoveryPath}
                className="mt-1 inline-flex font-semibold text-accent-gold underline underline-offset-4"
              >
                Abrir recuperacion segura
              </Link>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSubmissionState('idle')
                  setCustomBundlePreviewResult(null)
                  setSubmitError(null)
                }}
              >
                Seguir editando
              </Button>
              <Button variant="primary" size="sm" onClick={resetWizard}>
                Nueva simulacion
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (submissionState === 'success' && publicCode) {
    const successTitle =
      postSubmitOperationalStatus === 'payment_reported'
        ? isPreview
          ? 'Pago simulado'
          : 'Pago reportado'
        : isPreview
          ? 'Simulacion completada'
          : 'Solicitud enviada'
    const successDescription =
      postSubmitOperationalStatus === 'payment_reported'
        ? isPreview
          ? 'La prueba quedo simulada. No se modifico la base de datos.'
          : 'Tu comprobante fue recibido y el pago quedo en revision por el equipo de Turpial Sound.'
        : isPreview
          ? 'Simulamos el flujo completo sin escribir en la base de datos compartida.'
          : `Tu solicitud quedo en estado pendiente de pago. El bloque quedo apartado por ${paymentWindowLabel} mientras confirmamos el pago.`

    return (
      <div className="rounded-2xl border border-brand-border bg-brand-surface p-3">
        {submissionNotice && (
          <div className="mb-2 rounded-lg border border-amber-300/40 bg-amber-400/10 px-3 py-2 text-[11px] text-amber-100">
            {submissionNotice}
          </div>
        )}
        <div className="mb-2.5 rounded-lg border border-brand-border/70 bg-brand-bg/30 px-2.5 py-2">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-gold/10">
              <svg className="h-4 w-4 text-accent-gold" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M5 13l4 4L19 7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-sm font-bold leading-tight text-text-primary md:text-base">
                {successTitle}
              </h2>
              <p className="mt-0.5 text-[11px] leading-snug text-text-secondary">
                {successDescription}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-2">
            <div className="space-y-2">
              <div className="rounded-lg border border-brand-border bg-brand-bg/30 px-2 py-1.5">
                <PaymentCountdownCTA initialSeconds={countdownStartSeconds} />
              </div>

              <div className="mx-auto w-full max-w-[23rem] rounded-lg border border-accent-gold/35 bg-accent-gold/5 px-4 py-2.5 text-center shadow-[0_0_0_1px_rgba(255,191,0,0.04)]">
                <p className="mb-1 text-[10px] uppercase tracking-[0.16em] text-text-muted">
                  Codigo de solicitud
                </p>
                <p className="font-display text-base font-bold tracking-[0.08em] text-accent-gold md:text-lg">
                  {publicCode}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-brand-border bg-brand-bg/40 p-2">
              <div className="space-y-1.5 text-[11px] leading-snug">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-text-muted">Servicio</p>
                  <p className="font-medium text-text-primary">{selectedServiceName}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-text-muted">Modalidad</p>
                  <p className="font-medium text-text-primary">{selectedVariantName}</p>
                </div>
                {(bookingDateLabel || data.startTime || durationLabel) && (
                  <div className="grid gap-1 sm:grid-cols-3">
                    {bookingDateLabel && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-text-muted">Fecha</p>
                        <p className="text-text-secondary">{bookingDateLabel}</p>
                      </div>
                    )}
                    {data.startTime && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-text-muted">Horario</p>
                        <p className="text-text-secondary">
                          {data.startTime}
                          {bookingEndTime ? ` - ${bookingEndTime}` : ''}
                        </p>
                      </div>
                    )}
                    {durationLabel && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-text-muted">Duracion</p>
                        <p className="text-text-secondary">{durationLabel}</p>
                      </div>
                    )}
                  </div>
                )}
                {hasPurchaseExtras && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-text-muted">Extras incluidos</p>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {selectedExtras.map((extraLabel) => (
                        <span
                          key={extraLabel}
                          className="rounded-full border border-brand-border bg-brand-bg/30 px-1.5 py-0.5 text-[10px] text-text-secondary"
                        >
                          {extraLabel}
                        </span>
                      ))}
                    </div>
                    {data.extrasNotes.trim() && (
                      <p className="mt-0.5 text-text-secondary">Notas: {data.extrasNotes.trim()}</p>
                    )}
                  </div>
                )}
                {assignedResourceName && (
                  <p className="text-[10px] text-text-muted">Sala asignada: {assignedResourceName}</p>
                )}
              </div>

              <div className="mt-1.5 text-[11px] leading-snug text-text-muted">
                <p className="mb-0.5 text-[10px] uppercase tracking-wide text-text-muted">Monto a pagar</p>
                <p className="font-medium text-text-primary">{activeAmountLabel}</p>
                <p>
                  USD:{' '}
                  <span className="font-medium text-text-primary">{secondaryAmountLabel}</span>
                </p>
                <p>{bcvCompactLabel}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-brand-border bg-brand-bg/40 p-2">
            {showPaymentOptions && (
              <div>
                <div className="mb-1.5 grid grid-cols-2 gap-1 sm:grid-cols-4">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.slug}
                      type="button"
                      onClick={() => {
                        setSelectedPaymentMethodSlug(method.slug)
                        if (method.slug === 'efectivo') {
                          setPaymentReportProofFile(null)
                        }
                      }}
                      className={cn(
                        'rounded-md border px-2 py-1 text-[10px] font-medium leading-tight transition-colors',
                        selectedPaymentMethod.slug === method.slug
                          ? 'border-accent-gold bg-accent-gold/10 text-text-primary'
                          : 'border-brand-border bg-brand-surface text-text-secondary hover:border-accent-gold/50',
                      )}
                      aria-pressed={selectedPaymentMethod.slug === method.slug}
                      disabled={postSubmitOperationalStatus === 'payment_reported' || paymentReportState === 'loading'}
                    >
                      {method.name}
                    </button>
                  ))}
                </div>

                <div className="space-y-1">
                  {selectedPaymentMethod.slug === 'pago_movil' && (
                    <div className="space-y-1 rounded-lg border border-brand-border bg-brand-surface p-1.5">
                      <p className="text-[11px] font-semibold text-text-primary">Pago movil</p>
                      <p className="text-[10px] text-text-muted">Envia tu pago a estos datos:</p>
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="text-text-secondary">Operadora: {mobileOperatorVisible}</span>
                        <Button variant="ghost" size="sm" onClick={() => handleCopy('pm-operator', mobileOperatorCopyValue)}>
                          Copiar
                        </Button>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="text-text-secondary">Numero: {mobileNumberVisible}</span>
                        <Button variant="ghost" size="sm" onClick={() => handleCopy('pm-number', mobileNumberCopyValue)}>
                          Copiar
                        </Button>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="text-text-secondary">Tipo: {mobileIdentityTypeVisible}</span>
                        <Button variant="ghost" size="sm" onClick={() => handleCopy('pm-type', mobileIdentityTypeCopyValue)}>
                          Copiar
                        </Button>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="text-text-secondary">Cedula de identidad: {mobileIdentityNumberVisible}</span>
                        <Button variant="ghost" size="sm" onClick={() => handleCopy('pm-doc', mobileIdentityNumberCopyValue)}>
                          Copiar
                        </Button>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="text-text-secondary">Banco: {mobileBankVisible}</span>
                        <Button variant="ghost" size="sm" onClick={() => handleCopy('pm-bank', mobileBankCopyValue)}>
                          Copiar
                        </Button>
                      </div>
                      <div className="flex items-center justify-between gap-2 rounded-md border border-accent-gold/20 bg-accent-gold/5 px-2 py-1 text-[10px]">
                        <span className="text-text-secondary">Monto a pagar: {bsAmountVisible}</span>
                        <Button variant="ghost" size="sm" onClick={() => handleCopy('pm-amount', bsAmountCopyValue)}>
                          Copiar
                        </Button>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="text-text-secondary">Concepto: {normalizedPaymentReference}</span>
                        <Button variant="ghost" size="sm" onClick={() => handleCopy('pm-ref', normalizedPaymentReference)}>
                          Copiar
                        </Button>
                      </div>
                      <p className="text-[10px] text-text-muted">
                        Importante: En el concepto del pago, coloca: {normalizedPaymentReference}
                      </p>
                      {selectedPaymentMethod.details?.qrImageUrl ? (
                        <img
                          src={selectedPaymentMethod.details.qrImageUrl}
                          alt="QR Pago Movil"
                          className="h-16 w-16 rounded-md border border-brand-border object-contain"
                        />
                      ) : (
                        <div className="h-10 rounded-md border border-dashed border-brand-border/80 bg-brand-bg/30 p-1 text-[10px] text-text-muted">
                          Espacio QR preparado. Disponible cuando se configure la fuente real.
                        </div>
                      )}
                    </div>
                  )}

                  {selectedPaymentMethod.slug === 'transferencia' && (
                    <div className="space-y-1 rounded-lg border border-brand-border bg-brand-surface p-1.5">
                      <p className="text-[11px] font-semibold text-text-primary">Transferencia</p>
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="text-text-secondary">
                          Numero de cuenta: {selectedPaymentMethod.details?.accountNumber ?? 'Por definir'}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy('tr-account', selectedPaymentMethod.details?.accountNumber)}
                        >
                          Copiar
                        </Button>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="text-text-secondary">Tipo: {transferIdentityTypeVisible}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy('tr-type', transferIdentityTypeCopyValue)}
                        >
                          Copiar
                        </Button>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="text-text-secondary">Cedula de identidad: {transferIdentityNumberVisible}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy('tr-doc', transferIdentityNumberCopyValue)}
                        >
                          Copiar
                        </Button>
                      </div>
                      <div className="flex items-center justify-between gap-2 rounded-md border border-accent-gold/20 bg-accent-gold/5 px-2 py-1 text-[10px]">
                        <span className="text-text-secondary">Monto a pagar: {bsAmountVisible}</span>
                        <Button variant="ghost" size="sm" onClick={() => handleCopy('tr-amount', bsAmountCopyValue)}>
                          Copiar
                        </Button>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="text-text-secondary">Descripcion: {normalizedPaymentReference}</span>
                        <Button variant="ghost" size="sm" onClick={() => handleCopy('tr-ref', normalizedPaymentReference)}>
                          Copiar
                        </Button>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="text-text-secondary">Banco: {transferBankVisible}</span>
                        <Button variant="ghost" size="sm" onClick={() => handleCopy('tr-bank', transferBankCopyValue)}>
                          Copiar
                        </Button>
                      </div>
                      <p className="text-[10px] text-text-muted">
                        Titular: {selectedPaymentMethod.details?.accountHolder ?? 'Por definir'}
                      </p>
                    </div>
                  )}

                  {selectedPaymentMethod.slug === 'binance' && (
                    <div className="space-y-1 rounded-lg border border-brand-border bg-brand-surface p-1.5">
                      <p className="text-[11px] font-semibold text-text-primary">Binance</p>
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="text-text-secondary">
                          Telefono: {binancePhoneVisible}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy('bn-phone', binancePhoneCopyValue)}
                        >
                          Copiar
                        </Button>
                      </div>
                      <div className="flex items-center justify-between gap-2 rounded-md border border-accent-gold/20 bg-accent-gold/5 px-2 py-1 text-[10px]">
                        <span className="text-text-secondary">Monto a pagar: {usdtAmountValue} USDT</span>
                        <Button variant="ghost" size="sm" onClick={() => handleCopy('bn-amount', usdtAmountValue)}>
                          Copiar
                        </Button>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="text-text-secondary">
                          Nota al beneficiario: {normalizedPaymentReference}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy('bn-note', normalizedPaymentReference)}
                        >
                          Copiar
                        </Button>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="text-text-secondary">
                          Binance ID: {selectedPaymentMethod.details?.payId ?? 'Por definir'}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy('bn-payid', selectedPaymentMethod.details?.payId)}
                        >
                          Copiar
                        </Button>
                      </div>
                      {selectedPaymentMethod.details?.qrImageUrl ? (
                        <img
                          src={selectedPaymentMethod.details.qrImageUrl}
                          alt="QR Binance"
                          className="h-16 w-16 rounded-md border border-brand-border object-contain"
                        />
                      ) : (
                        <div className="h-10 rounded-md border border-dashed border-brand-border/80 bg-brand-bg/30 p-1 text-[10px] text-text-muted">
                          Espacio QR preparado. Disponible cuando se configure la fuente real.
                        </div>
                      )}
                      <p className="text-[10px] text-text-muted">Envia captura del comprobante al finalizar.</p>
                    </div>
                  )}

                  {selectedPaymentMethod.slug === 'efectivo' && (
                    <div className="space-y-1 rounded-lg border border-brand-border bg-brand-surface p-1.5">
                      <p className="text-[11px] font-semibold text-text-primary">Efectivo</p>
                      <div className="flex items-center justify-between gap-2 rounded-md border border-accent-gold/20 bg-accent-gold/5 px-2 py-1 text-[10px]">
                        <span className="text-text-secondary">Monto a pagar: ${usdtAmountValue}</span>
                        <Button variant="ghost" size="sm" onClick={() => handleCopy('cash-amount', usdtAmountValue)}>
                          Copiar
                        </Button>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="text-text-secondary">Codigo de solicitud: {publicCode}</span>
                        <Button variant="ghost" size="sm" onClick={() => handleCopy('cash-code', publicCode)}>
                          Copiar
                        </Button>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="text-text-secondary">
                          Referencia operativa: {normalizedPaymentReference}
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => handleCopy('cash-ref', normalizedPaymentReference)}>
                          Copiar
                        </Button>
                      </div>
                      <p className="text-[10px] text-text-secondary">
                        Solo valido para pago presencial dentro de la ventana activa del apartado.
                      </p>
                    </div>
                  )}
                </div>

                <p className="mt-1 text-center text-[10px] text-text-muted">
                  {copyStatusKey ? 'Dato copiado.' : selectedPaymentMethod.referenceHint}
                </p>

                {postSubmitOperationalStatus === 'pending_payment' ? (
                  <div className="mt-2 space-y-1.5 rounded-lg border border-brand-border bg-brand-surface p-2">
                    <p className="text-[11px] font-semibold text-text-primary">{paymentMethodNameForButton}</p>
                    <p className="text-[10px] text-text-muted">
                      Metodo usado: <span className="font-medium text-text-secondary">{selectedPaymentMethod.name}</span>
                    </p>

                    <label className="block space-y-0.5">
                      <span className="text-[10px] uppercase tracking-wide text-text-muted">Referencia</span>
                      <input
                        type="text"
                        value={paymentReportReference}
                        onChange={(event) => setPaymentReportReference(event.target.value)}
                        placeholder="Ej: TUR2026073"
                        className="w-full rounded-md border border-brand-border bg-brand-bg/40 px-2 py-1.5 text-[11px] text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-gold/60"
                        disabled={paymentReportState === 'loading'}
                      />
                    </label>

                    {selectedPaymentMethod.slug !== 'efectivo' && (
                      <label className="block space-y-0.5">
                        <span className="text-[10px] uppercase tracking-wide text-text-muted">
                          Sube tu comprobante en JPG, PNG, WEBP o AVIF.
                        </span>
                        <input
                          type="file"
                          accept={PAYMENT_PROOF_ACCEPT_ATTR}
                          onChange={(event) => setPaymentReportProofFile(event.target.files?.[0] ?? null)}
                          className="w-full rounded-md border border-brand-border bg-brand-bg/40 px-2 py-1.5 text-[11px] text-text-secondary file:mr-2 file:rounded-md file:border-0 file:bg-accent-gold/15 file:px-2 file:py-1 file:text-[10px] file:font-medium file:text-text-primary"
                          disabled={paymentReportState === 'loading'}
                        />
                      </label>
                    )}

                    {paymentReportError && (
                      <p className="rounded-md border border-red-400/30 bg-red-500/10 px-2 py-1 text-[10px] text-red-200">
                        {paymentReportError}
                      </p>
                    )}

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleReportPayment}
                      disabled={paymentReportState === 'loading'}
                    >
                      {paymentReportState === 'loading' ? 'Reportando pago...' : paymentMethodNameForButton}
                    </Button>
                  </div>
                ) : (
                  <div className="mt-2 rounded-lg border border-accent-gold/35 bg-accent-gold/10 px-2 py-2 text-[11px] leading-snug">
                    <p className="font-semibold text-text-primary">Pago reportado</p>
                    <p className="text-text-secondary">
                      Tu comprobante fue recibido y quedo en revision manual. Te notificaremos por WhatsApp cuando sea verificado.
                    </p>
                    {paymentReportWarning && (
                      <p className="mt-1 rounded-md border border-amber-300/40 bg-amber-400/10 px-2 py-1 text-[10px] text-amber-200">
                        {paymentReportWarning}
                      </p>
                    )}
                    {paymentReportedAtIso && (
                      <p className="mt-0.5 text-[10px] text-text-muted">
                        Reportado: {formatCaracasDateTime(paymentReportedAtIso)} (America/Caracas)
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2 border-t border-brand-border/70 pt-1.5">
          <p className="text-[10px] leading-snug text-text-muted">
            {postSubmitOperationalStatus === 'payment_reported'
              ? 'Conserva tu codigo de solicitud mientras el equipo verifica el pago reportado.'
              : 'Guarda tu codigo de solicitud para reportar el pago y hacer seguimiento.'}
          </p>
          <Button variant="ghost" size="sm" onClick={resetWizard}>
            Crear una nueva solicitud
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={wizardContainerRef}
      className="overflow-x-hidden rounded-2xl border border-brand-border bg-brand-surface"
      aria-busy={submissionState === 'loading'}
    >
      <div className="border-b border-brand-border px-5 py-3 md:px-6 md:py-3">
        <div className="md:hidden">
          <p className="text-[11px] uppercase tracking-[0.16em] text-text-muted">
            Paso {currentStep + 1} de {totalSteps}
          </p>
          <h2 className="mt-1 font-display text-base font-semibold leading-tight text-text-primary">
            {step.title}
          </h2>
          <div className="mt-2 h-1 w-full rounded-full bg-brand-border/80">
            <span
              className="block h-full rounded-full bg-accent-gold transition-[width] duration-300 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        <ol
          className="hidden gap-2 pb-1 md:grid md:grid-cols-3 lg:grid-cols-6 lg:gap-2 xl:gap-3 lg:pb-0"
          aria-label="Pasos del formulario"
        >
            {wizardSteps.map((s, index) => {
              const isCompleted = index < currentStep
              const isCurrent = index === currentStep
              const isVisited = index <= furthestStep
              const isClickable = isVisited && !isCurrent && submissionState !== 'loading'
              return (
                <li key={s.id} className="min-w-[8.5rem] flex-1 lg:min-w-0">
                  <button
                    type="button"
                    onClick={() => handleStepClick(index)}
                    disabled={!isClickable}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-xl border px-2.5 py-3 text-left transition-colors',
                      isCurrent
                        ? 'border-accent-gold bg-accent-gold/5'
                        : isCompleted
                          ? 'border-accent-gold/30 bg-accent-gold/5'
                          : 'border-brand-border bg-transparent',
                      isClickable
                        ? 'cursor-pointer hover:border-accent-gold/50 hover:bg-accent-gold/5'
                        : 'cursor-default',
                    )}
                    aria-current={isCurrent ? 'step' : undefined}
                  >
                    <span
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                        isCompleted
                          ? 'bg-accent-gold text-brand-bg'
                          : isCurrent
                            ? 'border-2 border-accent-gold text-accent-gold'
                            : isVisited
                              ? 'border border-brand-border text-text-secondary'
                              : 'border border-brand-border text-text-muted',
                      )}
                    >
                      {isCompleted ? (
                        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                          <path
                            d="M2 6l3 3 5-5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={cn(
                          'block text-[11px] font-medium leading-tight xl:text-xs',
                          isCurrent || isCompleted ? 'text-text-primary' : 'text-text-secondary',
                        )}
                      >
                        {s.label}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
      </div>

      <div
        className={cn(
          'p-4 pb-28 md:px-6 md:py-3',
          currentStep === summaryStepIndex && 'md:py-2.5 lg:py-2',
        )}
      >
        {paymentRecoveryNotice && (
          <div className="mb-3 rounded-lg border border-amber-300/40 bg-amber-400/10 px-3 py-2">
            <p className="text-[11px] text-amber-100">{paymentRecoveryNotice}</p>
          </div>
        )}
        {currentStep === totalSteps - 1 && submissionState === 'loading' && (
          <div className="mb-6 rounded-lg border border-accent-gold/30 bg-accent-gold/5 px-4 py-3">
            <div className="flex items-start gap-3">
              <span
                className="mt-0.5 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent-gold/30 border-t-accent-gold"
                aria-hidden="true"
              />
              <div className="space-y-1 text-sm">
                <p className="font-medium text-text-primary">Enviando tu solicitud</p>
                <p className="text-text-secondary">
                  Estamos registrando tus datos. No cierres esta ventana hasta recibir la
                  confirmacion.
                </p>
              </div>
            </div>
          </div>
        )}

        {isCustomBundleMode ? (
          <>
            {currentStep === 0 && (
              <ServiceSelectStep
                selected={isCustomBundleMode ? null : selectedServiceSlug}
                isCustomBundleSelected={isCustomBundleMode}
                isPreview={isPreview}
                onChange={(slug) => {
                  setBookingMode('single')
                  setPrimaryItem((currentItem) => ({
                    serviceSlug: slug,
                    variantSlug: currentItem?.serviceSlug === slug ? currentItem.variantSlug : null,
                    quantity: currentItem?.quantity ?? 1,
                  }))
                }}
                onSelectCustomBundle={() => setBookingMode('custom_bundle')}
              />
            )}

            {bundleStepIndex !== null && currentStep === bundleStepIndex && (
              <CustomBundleStep
                selections={data.customBundleSelections}
                eventDate={data.eventDate}
                startTime={data.startTime}
                estimate={customBundleEstimate}
                onEventDateChange={(value) =>
                  setData((d) => ({
                    ...d,
                    eventDate: value,
                  }))
                }
                onStartTimeChange={(value) =>
                  setData((d) => ({
                    ...d,
                    startTime: value,
                  }))
                }
                onToggleItem={toggleCustomBundleItem}
                onQuantityChange={updateCustomBundleQuantity}
                onSessionDurationChange={updateCustomBundleDuration}
              />
            )}

            {currentStep === 2 && (
              <ContactStep
                name={data.requesterName}
                email={data.requesterEmail}
                phone={data.requesterPhone}
                whatsappConsentAccepted={data.whatsappConsentAccepted}
                whatsappConsentError={contactConsentError}
                whatsappVerificationStatus={whatsappVerification.status}
                whatsappVerificationCode={whatsappVerification.code}
                whatsappVerificationError={whatsappVerification.error}
                whatsappVerificationChallengeId={whatsappVerification.challengeId}
                whatsappVerificationExpiresAt={whatsappVerification.expiresAt}
                whatsappVerificationVerifiedAt={whatsappVerification.verifiedAt}
                whatsappVerificationPhone={whatsappVerification.phone}
                whatsappFlowMode={contactVerificationFlowMode}
                secureLinkRequestState={secureLinkRequestState}
                secureLinkExpiresAt={secureLinkRequestExpiresAt}
                secureLinkError={secureLinkRequestError}
                onPrimarySecureLinkAction={() => {
                  void handleContactPrimarySecureLinkAction()
                }}
                onStartWhatsappVerification={() => {
                  setSubmitError(null)
                  setContactVerificationFlowMode('manual_code')
                  setSecureLinkRequestState('idle')
                  setSecureLinkRequestError(null)
                  void handleStartWhatsappVerification()
                }}
                onSendSecureLink={() => {
                  setSubmitError(null)
                  void handleSendSecureLink()
                }}
                onUseManualCodeFallback={() => {
                  console.info('[fallback_manual_code_used]', { event: 'fallback_manual_code_used' })
                  setContactVerificationFlowMode('manual_code')
                  setSecureLinkRequestState('idle')
                  setSecureLinkRequestError(null)
                }}
                onRetryOpenWhatsapp={handleRetryOpenWhatsapp}
                onCopyWhatsappCode={() => {
                  void handleCopyWhatsappCode()
                }}
                onManualWhatsappStatusCheck={() => {
                  void handleManualWhatsappStatusCheck()
                }}
                onNameChange={(value) => setData((d) => ({ ...d, requesterName: value }))}
                onEmailChange={(value) => setData((d) => ({ ...d, requesterEmail: value }))}
                onPhoneChange={(value) =>
                  setData((d) => {
                    const normalizedNextPhone = normalizeWhatsappVe(value)
                    const normalizedVerifiedPhone = whatsappVerification.phone
                      ? normalizeWhatsappVe(whatsappVerification.phone)
                      : null

                    if (
                      normalizedVerifiedPhone &&
                      normalizedNextPhone !== normalizedVerifiedPhone &&
                      whatsappVerification.status !== 'idle'
                    ) {
                      clearWhatsappPollTimer()
                      setWhatsappVerification(INITIAL_WHATSAPP_VERIFICATION_STATE)
                    }

                    if (secureLinkRequestState !== 'idle') {
                      setSecureLinkRequestState('idle')
                      setSecureLinkRequestError(null)
                      setSecureLinkRequestExpiresAt(null)
                    }

                    return { ...d, requesterPhone: value }
                  })
                }
                onWhatsappConsentChange={(value) => {
                  setData((d) => ({ ...d, whatsappConsentAccepted: value }))
                  if (value) {
                    setContactConsentError(null)
                    if (secureLinkRequestState === 'failed') {
                      setSecureLinkRequestError(null)
                    }
                  }
                }}
              />
            )}

            {currentStep === summaryStepIndex && (
              <SummaryStep
                bookingMode="custom_bundle"
                eventDate={data.eventDate ?? ''}
                startTime={data.startTime ?? ''}
                durationMinutes={activeDurationMinutes ?? 0}
                extrasNotes={data.extrasNotes}
                extrasTechnician={data.extrasTechnician}
                extrasBackline={data.extrasBackline}
                recordingAddonSlugs={data.recordingAddonSlugs}
                recordingAddonPreviewTotalUsd={recordingAddonPreviewTotalUsd}
                availableRecordingAddons={recordingAddonsForCurrentService}
                projectTopicCount={data.projectTopicCount}
                requesterName={data.requesterName}
                requesterEmail={data.requesterEmail}
                requesterPhone={normalizeWhatsappVe(data.requesterPhone)}
                customBundleEstimate={customBundleEstimate}
              />
            )}
          </>
        ) : (
          <>
            {currentStep === 0 && (
              <ServiceSelectStep
                selected={selectedServiceSlug}
                isCustomBundleSelected={false}
                isPreview={isPreview}
                onChange={(slug) =>
                  setPrimaryItem((currentItem) => ({
                    serviceSlug: slug,
                    variantSlug: currentItem?.serviceSlug === slug ? currentItem.variantSlug : null,
                    quantity: currentItem?.quantity ?? 1,
                  }))
                }
                onSelectCustomBundle={() => setBookingMode('custom_bundle')}
              />
            )}

            {currentStep === 1 && selectedServiceSlug && (
              <VariantSelectStep
                serviceSlug={selectedServiceSlug}
                selected={selectedVariantSlug}
                onChange={(slug) =>
                  setPrimaryItem((currentItem) => ({
                    serviceSlug: currentItem?.serviceSlug ?? selectedServiceSlug,
                    variantSlug: slug,
                    quantity: currentItem?.quantity ?? 1,
                  }))
                }
              />
            )}

            {dateStepIndex !== null && currentStep === dateStepIndex && (
              <DateTimeStep
                serviceSlug={selectedServiceSlug}
                variantSlug={selectedVariantSlug}
                eventDate={data.eventDate}
                startTime={data.startTime}
                durationMinutes={data.durationMinutes}
                onDateChange={(value) =>
                  setData((d) => ({ ...d, eventDate: value, startTime: null, durationMinutes: null }))
                }
                onStartTimeChange={(value) => setData((d) => ({ ...d, startTime: value, durationMinutes: null }))}
                onDurationChange={(value) => setData((d) => ({ ...d, durationMinutes: value }))}
              />
            )}

            {extrasStepIndex !== null && currentStep === extrasStepIndex && (
              <ExtrasStep
                serviceSlug={selectedServiceSlug}
                variantSlug={selectedVariantSlug}
                notes={data.extrasNotes}
                technician={data.extrasTechnician}
                backline={data.extrasBackline}
                availableRecordingAddons={recordingAddonsForCurrentService}
                selectedRecordingAddonSlugs={data.recordingAddonSlugs}
                projectTopicCount={data.projectTopicCount}
                onRecordingAddonToggle={toggleRecordingAddon}
                onProjectTopicCountChange={updateProjectTopicCount}
                onNotesChange={(value) => setData((d) => ({ ...d, extrasNotes: value }))}
                onTechnicianChange={(value) => setData((d) => ({ ...d, extrasTechnician: value }))}
                onBacklineChange={(value) => setData((d) => ({ ...d, extrasBackline: value }))}
              />
            )}

            {currentStep === contactStepIndex && (
              <ContactStep
                name={data.requesterName}
                email={data.requesterEmail}
                phone={data.requesterPhone}
                whatsappConsentAccepted={data.whatsappConsentAccepted}
                whatsappConsentError={contactConsentError}
                whatsappVerificationStatus={whatsappVerification.status}
                whatsappVerificationCode={whatsappVerification.code}
                whatsappVerificationError={whatsappVerification.error}
                whatsappVerificationChallengeId={whatsappVerification.challengeId}
                whatsappVerificationExpiresAt={whatsappVerification.expiresAt}
                whatsappVerificationVerifiedAt={whatsappVerification.verifiedAt}
                whatsappVerificationPhone={whatsappVerification.phone}
                whatsappFlowMode={contactVerificationFlowMode}
                secureLinkRequestState={secureLinkRequestState}
                secureLinkExpiresAt={secureLinkRequestExpiresAt}
                secureLinkError={secureLinkRequestError}
                onPrimarySecureLinkAction={() => {
                  void handleContactPrimarySecureLinkAction()
                }}
                onStartWhatsappVerification={() => {
                  setSubmitError(null)
                  setContactVerificationFlowMode('manual_code')
                  setSecureLinkRequestState('idle')
                  setSecureLinkRequestError(null)
                  void handleStartWhatsappVerification()
                }}
                onSendSecureLink={() => {
                  setSubmitError(null)
                  void handleSendSecureLink()
                }}
                onUseManualCodeFallback={() => {
                  console.info('[fallback_manual_code_used]', { event: 'fallback_manual_code_used' })
                  setContactVerificationFlowMode('manual_code')
                  setSecureLinkRequestState('idle')
                  setSecureLinkRequestError(null)
                }}
                onRetryOpenWhatsapp={handleRetryOpenWhatsapp}
                onCopyWhatsappCode={() => {
                  void handleCopyWhatsappCode()
                }}
                onManualWhatsappStatusCheck={() => {
                  void handleManualWhatsappStatusCheck()
                }}
                onNameChange={(value) => setData((d) => ({ ...d, requesterName: value }))}
                onEmailChange={(value) => setData((d) => ({ ...d, requesterEmail: value }))}
                onPhoneChange={(value) =>
                  setData((d) => {
                    const normalizedNextPhone = normalizeWhatsappVe(value)
                    const normalizedVerifiedPhone = whatsappVerification.phone
                      ? normalizeWhatsappVe(whatsappVerification.phone)
                      : null

                    if (
                      normalizedVerifiedPhone &&
                      normalizedNextPhone !== normalizedVerifiedPhone &&
                      whatsappVerification.status !== 'idle'
                    ) {
                      clearWhatsappPollTimer()
                      setWhatsappVerification(INITIAL_WHATSAPP_VERIFICATION_STATE)
                    }

                    if (secureLinkRequestState !== 'idle') {
                      setSecureLinkRequestState('idle')
                      setSecureLinkRequestError(null)
                      setSecureLinkRequestExpiresAt(null)
                    }

                    return { ...d, requesterPhone: value }
                  })
                }
                onWhatsappConsentChange={(value) => {
                  setData((d) => ({ ...d, whatsappConsentAccepted: value }))
                  if (value) {
                    setContactConsentError(null)
                    if (secureLinkRequestState === 'failed') {
                      setSecureLinkRequestError(null)
                    }
                  }
                }}
              />
            )}

            {currentStep === summaryStepIndex &&
              selectedServiceSlug &&
              selectedVariantSlug &&
              data.eventDate &&
              data.startTime &&
              data.durationMinutes && (
                <SummaryStep
                  bookingMode="single"
                  serviceSlug={selectedServiceSlug}
                  variantSlug={selectedVariantSlug}
                  eventDate={data.eventDate}
                  startTime={data.startTime}
                  durationMinutes={data.durationMinutes}
                  extrasNotes={data.extrasNotes}
                  extrasTechnician={data.extrasTechnician}
                  extrasBackline={data.extrasBackline}
                  recordingAddonSlugs={data.recordingAddonSlugs}
                  recordingAddonPreviewTotalUsd={recordingAddonPreviewTotalUsd}
                  availableRecordingAddons={recordingAddonsForCurrentService}
                  projectTopicCount={data.projectTopicCount}
                  requesterName={data.requesterName}
                  requesterEmail={data.requesterEmail}
                  requesterPhone={normalizeWhatsappVe(data.requesterPhone)}
                  estimate={bookingEstimate}
                />
              )}
          </>
        )}
      </div>

      {submitError && (
        <div className="border-t border-brand-border bg-red-500/5 px-6 py-3">
          <p className="text-sm font-medium text-red-300">No pudimos registrar tu solicitud.</p>
          <p className="mt-1 text-xs text-red-200/90">
            {submitError} Revisa los datos e intenta de nuevo.
          </p>
        </div>
      )}

      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-40 flex items-center justify-between border-t border-brand-border px-3 py-2.5',
          'bg-brand-surface/95 backdrop-blur supports-[backdrop-filter]:bg-brand-surface/85',
          'shadow-[0_-10px_30px_rgba(0,0,0,0.35)]',
          '[padding-bottom:calc(env(safe-area-inset-bottom)+0.625rem)]',
          'md:static md:z-auto md:bg-transparent md:backdrop-blur-0 md:px-6 md:py-3 md:[padding-bottom:0]',
        )}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          disabled={currentStep === 0 || submissionState === 'loading'}
        >
          <span className="md:hidden">Atras</span>
          <span className="hidden md:inline">Anterior</span>
        </Button>

        <span className="text-[11px] text-text-muted md:text-xs">
          Paso {currentStep + 1} de {totalSteps}
        </span>

        {currentStep < totalSteps - 1 ? (
          currentStep === contactStepIndex ? (
            isSecureLinkFlowActive && !canUsePreviewVerificationBypass ? (
              <Button variant="ghost" size="sm" disabled>
                Completa la verificacion arriba
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  void handleContactPrimaryAction()
                }}
                disabled={!contactDataIsComplete || isContactVerificationRunning}
              >
                {contactPrimaryCtaLabel}
              </Button>
            )
          ) : (
            <Button variant="primary" size="sm" onClick={handleNext} disabled={!canProceed}>
              Continuar
            </Button>
          )
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={submissionState === 'loading' || activeEstimate.isBlocked}
          >
            {submissionState === 'loading'
              ? isCustomBundleMode
                ? 'Simulando reserva...'
                : 'Enviando solicitud...'
              : activeEstimate.isBlocked
                ? isCustomBundleMode
                  ? 'Corrige el paquete'
                  : 'Corrige la solicitud'
                : isCustomBundleMode
                  ? 'Simular reserva'
                  : 'Enviar solicitud'}
          </Button>
        )}
      </div>
    </div>
  )
}
