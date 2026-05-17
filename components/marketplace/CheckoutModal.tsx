'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  X,
  Copy,
  Check,
  Upload,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Smartphone,
  Building2,
  Wallet,
  CalendarDays,
} from 'lucide-react'
import type { ElementType } from 'react'
import type { Listing, MpTransactionStatus } from '@/types/marketplace'
import {
  initiatePurchase,
  submitPaymentProof,
} from '@/actions/marketplace/transactions'
import { useBcvRate } from '@/lib/hooks/useBcvRate'
import { VENEZUELAN_BANK_OPTIONS } from '@/lib/marketplace/venezuelan-banks'
import {
  prepareMarketplaceUpload,
  revokeMarketplaceUploadPreview,
  uploadMarketplaceFile,
  type PreparedMarketplaceUpload,
} from '@/lib/marketplace/media-client'

type ManualMethodId = 'PAGO_MOVIL' | 'TRANSFERENCIA_BANCARIA' | 'BINANCE_PAY'

type CheckoutActionMethod = 'PAGO_MOVIL' | 'CRYPTO_WALLET'

type PaymentDetail = {
  label: string
  value: string
}

type ManualMethodConfig = {
  id: ManualMethodId
  label: string
  accent: string
  icon: ElementType
  actionMethod: CheckoutActionMethod
  details: PaymentDetail[] | ((priceDisplay: string) => PaymentDetail[])
}

const MANUAL_METHODS: ManualMethodConfig[] = [
  {
    id: 'PAGO_MOVIL',
    label: 'Pago movil',
    accent: '#00aeef',
    icon: Smartphone,
    actionMethod: 'PAGO_MOVIL',
    details: [
      { label: 'Cedula', value: '13894619' },
      { label: 'Telefono', value: '04141333305' },
      { label: 'Banco', value: 'Mercantil' },
    ],
  },
  {
    id: 'TRANSFERENCIA_BANCARIA',
    label: 'Transferencia bancaria',
    accent: '#ffc107',
    icon: Building2,
    actionMethod: 'PAGO_MOVIL',
    details: [
      { label: 'Cuenta', value: '01050187331187028916' },
      { label: 'Beneficiario', value: 'Turpial Sound' },
      { label: 'C.I', value: 'V-13894619' },
    ],
  },
  {
    id: 'BINANCE_PAY',
    label: 'Binance Pay',
    accent: '#f97316',
    icon: Wallet,
    actionMethod: 'CRYPTO_WALLET',
    details: (priceDisplay) => [
      { label: 'Monto a pagar', value: `${priceDisplay} USDT` },
      { label: 'Pay ID', value: '11757221' },
      { label: 'User', value: 'manuelverax' },
    ],
  },
]

const EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1]

function useCopyField(value: string) {
  const [copied, setCopied] = useState(false)
  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // noop
    }
  }, [value])

  return { copied, copy }
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const { copied, copy } = useCopyField(value)

  return (
    <div
      className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
      style={{ background: 'var(--mp-input)', border: '1px solid var(--mp-input-border)' }}
    >
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-[#9a9a9a]">{label}</p>
        <p className="mt-0.5 truncate font-mono text-sm text-[#f2f2f2]">{value}</p>
      </div>
      <button
        onClick={copy}
        className="flex flex-shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all duration-200"
        style={
          copied
            ? {
                background: 'rgba(74,222,128,0.12)',
                color: '#4ade80',
                border: '1px solid rgba(74,222,128,0.25)',
              }
            : {
                background: 'rgba(0,174,239,0.1)',
                color: '#00aeef',
                border: '1px solid rgba(0,174,239,0.2)',
              }
        }
      >
        {copied ? <Check size={11} /> : <Copy size={11} />}
        {copied ? 'Copiado' : 'Copiar'}
      </button>
    </div>
  )
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type,
  readOnly = false,
  icon,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  type: string
  readOnly?: boolean
  icon?: ElementType
}) {
  const Icon = icon

  return (
    <div className="space-y-1.5">
      <label className="text-xs text-[#c8c8c8]">{label}</label>
      <div className="relative">
        {Icon && (
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#5a5a5a]">
            <Icon size={14} />
          </div>
        )}
        <input
          type={type}
          value={value}
          readOnly={readOnly}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="mp-themed-input w-full rounded-xl border px-4 py-2.5 font-mono text-sm outline-none read-only:text-[#ffc107]"
          style={{ paddingLeft: Icon ? '2.4rem' : undefined }}
          onFocus={(e) => {
            if (!readOnly) e.target.style.borderColor = 'rgba(0,174,239,0.4)'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--mp-input-border)'
          }}
        />
      </div>
    </div>
  )
}

function getTodayDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export interface CheckoutModalProps {
  listing: Listing
  sellerId: string
  quantity?: number
  onClose: () => void
  onOpenChat: (listing: Listing) => void
  onSuccess?: (status: MpTransactionStatus) => void
}

export function CheckoutModal({ listing, quantity = 1, onClose, onSuccess }: CheckoutModalProps) {
  const router = useRouter()
  const { rate: bcvRate, loading: rateLoading } = useBcvRate()
  const [selectedMethodId, setSelectedMethodId] = useState<ManualMethodId>('PAGO_MOVIL')
  const [operationNumber, setOperationNumber] = useState('')
  const [bankName, setBankName] = useState('')
  const [paymentDate, setPaymentDate] = useState(getTodayDate())
  const [proofFile, setProofFile] = useState<PreparedMarketplaceUpload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{
    title: string
    summary: string
    detail: string
  } | null>(null)

  const unitPrice = listing.type === 'product' ? listing.price : listing.priceFrom
  const price = unitPrice * quantity
  const currency = listing.currency ?? 'USD'
  const selectedMethod =
    MANUAL_METHODS.find((method) => method.id === selectedMethodId) ?? MANUAL_METHODS[0]
  const isBinancePay = selectedMethod.id === 'BINANCE_PAY'
  const usdAmountDisplay =
    price != null
      ? Number(price).toLocaleString('es-VE', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : '-'
  const bsAmountValue = price && bcvRate ? (price * bcvRate).toFixed(2) : ''
  const bsAmountDisplay = bsAmountValue
    ? Number(bsAmountValue).toLocaleString('es-VE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : '-'
  const selectedMethodDetails =
    typeof selectedMethod.details === 'function'
      ? selectedMethod.details(usdAmountDisplay !== '-' ? usdAmountDisplay : '0.00')
      : selectedMethod.details
  const amountInputValue = isBinancePay
    ? `${usdAmountDisplay !== '-' ? usdAmountDisplay : '0.00'} USDT`
    : (bsAmountDisplay !== '-' ? `${bsAmountDisplay} Bs` : '')
  const referenceLabel = isBinancePay
    ? 'Referencia / hash / ID de operacion Binance *'
    : 'Numero de operacion *'
  const referencePlaceholder = isBinancePay
    ? 'Ej: hash, order ID o referencia Binance'
    : 'Ej: 012345678901'
  const proofRequired = isBinancePay
  const canConfirmPayment = Boolean(
    operationNumber.trim() &&
    paymentDate.trim() &&
    (!isBinancePay || proofFile) &&
    (isBinancePay || bankName.trim()) &&
    !loading,
  )

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    return () => {
      revokeMarketplaceUploadPreview(proofFile)
    }
  }, [proofFile])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  async function handleConfirm() {
    if (!operationNumber.trim()) {
      setError(isBinancePay ? 'Ingresa la referencia, hash o ID de operacion Binance.' : 'Ingresa el numero de operacion.')
      return
    }

    if (!isBinancePay && !bankName.trim()) {
      setError('Selecciona el banco emisor.')
      return
    }

    if (isBinancePay && !proofFile) {
      setError('El comprobante de Binance es obligatorio.')
      return
    }

    if (!paymentDate.trim()) {
      setError('Ingresa la fecha de pago.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const purchase = await initiatePurchase(listing.id, selectedMethod.actionMethod, quantity)
      if (!purchase.success || !purchase.data) {
        setError(purchase.message)
        return
      }

      const proofUrl = proofFile
        ? (
            await uploadMarketplaceFile(proofFile.file, 'payment-proof', {
              transactionId: purchase.data.transactionId,
            })
          ).url
        : undefined
      const proof = await submitPaymentProof(
        purchase.data.transactionId,
        operationNumber.trim(),
        {
          senderBank: isBinancePay ? null : bankName,
          paymentDate,
        },
        proofUrl,
      )

      if (!proof.success) {
        setError(proof.message)
        return
      }

      onSuccess?.('PAYMENT_RECEIVED')
      router.refresh()
      setSuccess({
        title: 'Pago procesado',
        summary: 'Tu pago esta siendo validado.',
        detail: 'Notificaremos la resolucion o la liberacion del escrow en menos de 24h.',
      })
    } catch {
      setError('Error inesperado. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0"
          style={{ background: 'var(--mp-overlay)', backdropFilter: 'blur(10px)' }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EXPO }}
          className="relative z-10 w-full max-w-md"
        >
          <div
            className="flex flex-col items-center justify-center gap-5 rounded-2xl px-8 py-16 text-center"
            style={{
              background: 'var(--mp-panel-solid)',
              border: '1px solid var(--mp-border)',
              boxShadow: 'var(--mp-shadow)',
            }}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 14 }}
            >
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full"
                style={{
                  background: 'rgba(74,222,128,0.1)',
                  border: '1px solid rgba(74,222,128,0.25)',
                }}
              >
                <CheckCircle2
                  size={32}
                  className="text-[#4ade80]"
                  style={{ filter: 'drop-shadow(0 0 12px rgba(74,222,128,0.5))' }}
                />
              </div>
            </motion.div>
            <div>
              <p className="mb-2 text-base font-semibold text-[#f2f2f2]">{success.title}</p>
              <div className="space-y-2 text-sm leading-relaxed text-[#b8b8b8]">
                <p>{success.summary}</p>
                <p>Recibimos tu comprobante y el equipo operativo ya fue notificado para revisar la conciliacion manual.</p>
                <p>{success.detail}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl px-6 py-2.5 text-sm font-medium transition-colors"
              style={{
                background: 'rgba(0,174,239,0.1)',
                color: '#00aeef',
                border: '1px solid rgba(0,174,239,0.25)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0,174,239,0.18)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0,174,239,0.1)'
              }}
            >
              Volver al marketplace
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: 'var(--mp-overlay)', backdropFilter: 'blur(10px)' }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.3, ease: EXPO }}
        className="relative z-10 w-full max-w-md"
        style={{ maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex max-h-[92vh] flex-col overflow-hidden rounded-2xl"
          style={{
            background: 'var(--mp-panel-solid)',
            border: '1px solid var(--mp-border)',
            boxShadow: 'var(--mp-shadow), 0 0 80px rgba(0,174,239,0.06)',
          }}
        >
          <div
            className="flex flex-shrink-0 items-center gap-3 border-b px-5 py-4"
            style={{ background: 'rgba(0,174,239,0.05)', borderColor: 'var(--mp-border)' }}
          >
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold text-[#f2f2f2]">Completar compra</h2>
              <p className="mt-0.5 truncate text-[11px] text-[#b8b8b8]">{listing.title}</p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 text-[#5a5a5a] transition-colors hover:text-[#f2f2f2]"
            >
              <X size={15} />
            </button>
          </div>

          <div className="scrollbar-none flex-1 space-y-5 overflow-y-auto p-5">
            <div
              className="rounded-xl p-4"
              style={{ background: 'rgba(0,174,239,0.04)', border: '1px solid rgba(0,174,239,0.12)' }}
            >
              <p className="mb-2 text-[10px] uppercase tracking-widest text-[#9a9a9a]">Total a pagar</p>
              {quantity > 1 && (
                <p className="mb-2 text-[11px] text-[#b8b8b8]">
                  {quantity} unidades x ${unitPrice.toLocaleString('es-VE')} {currency}
                </p>
              )}
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-2xl font-bold text-[#f2f2f2]">
                  ${price?.toLocaleString('es-VE') ?? '-'}{' '}
                  <span className="text-sm font-normal text-[#b8b8b8]">{currency}</span>
                </span>
              </div>

              {isBinancePay ? (
                <div
                  className="mt-3 rounded-lg p-3"
                  style={{
                    background: 'rgba(249,115,22,0.08)',
                    border: '1px solid rgba(249,115,22,0.16)',
                  }}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[10px] uppercase tracking-wider text-[#9a9a9a]">
                      Total a pagar en USDT
                    </p>
                    <span className="text-sm font-semibold text-[#f97316]">{usdAmountDisplay} USDT</span>
                  </div>
                  <p className="mt-1.5 text-[10px] text-[#b8b8b8]">
                    Binance Pay usa 1 USDT = 1 USD. No se requiere banco venezolano.
                  </p>
                </div>
              ) : (
                <div
                  className="mt-3 rounded-lg p-3"
                  style={{
                    background: 'rgba(255,193,7,0.08)',
                    border: '1px solid rgba(255,193,7,0.15)',
                  }}
                >
                  <div className="flex items-baseline justify-between">
                    <p className="text-[10px] uppercase tracking-wider text-[#9a9a9a]">
                      Total a pagar en Bs
                    </p>
                    {rateLoading ? (
                      <span className="animate-pulse text-sm text-[#b8b8b8]">Cargando...</span>
                    ) : (
                      <span className="text-sm font-semibold text-[#ffc107]">{bsAmountDisplay} Bs</span>
                    )}
                  </div>
                  <p className="mt-1.5 text-[10px] text-[#b8b8b8]">
                    Tasa BCV: 1 USD ={' '}
                    {bcvRate?.toLocaleString('es-VE', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }) ?? '-'}{' '}
                    Bs
                  </p>
                </div>
              )}
            </div>

            <div>
              <p className="mb-3 text-[10px] uppercase tracking-widest text-[#9a9a9a]">Metodo de pago</p>
              <div className="grid grid-cols-3 gap-2">
                {MANUAL_METHODS.map((method) => {
                  const Icon = method.icon
                  const selected = selectedMethod.id === method.id

                  return (
                    <button
                      key={method.id}
                      onClick={() => {
                        setSelectedMethodId(method.id)
                        if (method.id === 'BINANCE_PAY') setBankName('')
                        setError(null)
                      }}
                      className="flex flex-col items-center gap-2 rounded-xl px-2 py-3 text-center transition-all duration-200"
                      style={{
                        background: selected ? `${method.accent}12` : 'var(--mp-input)',
                        border: `1px solid ${selected ? `${method.accent}40` : 'var(--mp-border)'}`,
                        boxShadow: selected ? `0 0 16px ${method.accent}10` : 'none',
                      }}
                    >
                      <Icon size={16} style={{ color: selected ? method.accent : 'var(--mp-text-faint)' }} />
                      <span
                        className="text-[10px] font-medium leading-tight"
                        style={{ color: selected ? method.accent : 'var(--mp-text-faint)' }}
                      >
                        {method.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div
              className="space-y-3 rounded-xl p-4"
              style={{
                background: 'var(--mp-card-subtle)',
                border: `1px solid ${selectedMethod.accent}24`,
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ background: `${selectedMethod.accent}15`, color: selectedMethod.accent }}
                >
                  <selectedMethod.icon size={16} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#f2f2f2]">{selectedMethod.label}</p>
                  <p className="text-[11px] text-[#b8b8b8]">Usa estos datos para completar el pago externo.</p>
                </div>
              </div>

              <div className="space-y-2">
                {selectedMethodDetails.map((detail) => (
                  <CopyRow
                    key={`${selectedMethod.id}_${detail.label}`}
                    label={detail.label}
                    value={detail.value}
                  />
                ))}
                {!isBinancePay && (
                  <CopyRow label="Monto en Bs" value={bsAmountDisplay !== '-' ? `${bsAmountDisplay} Bs` : '-'} />
                )}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--mp-border)' }} />

            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-widest text-[#9a9a9a]">
                Reportar pago
              </p>

              <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-2">
                <InputField
                  label="Metodo seleccionado"
                  value={selectedMethod.label}
                  onChange={() => {}}
                  placeholder=""
                  type="text"
                  readOnly
                />

                <InputField
                  label={isBinancePay ? 'Monto a pagar' : 'Monto en Bs'}
                  value={amountInputValue}
                  onChange={() => {}}
                  placeholder=""
                  type="text"
                  readOnly
                />

                <InputField
                  label={referenceLabel}
                  value={operationNumber}
                  onChange={(value) => {
                    setOperationNumber(value)
                    setError(null)
                  }}
                  placeholder={referencePlaceholder}
                  type="text"
                />

                {!isBinancePay && (
                  <div className="space-y-1.5">
                    <label className="text-xs text-[#c8c8c8]" htmlFor="marketplace-payment-sender-bank">
                      Banco emisor *
                    </label>
                    <select
                      id="marketplace-payment-sender-bank"
                      name="marketplace-payment-sender-bank"
                      value={bankName}
                      onChange={(e) => {
                        setBankName(e.target.value)
                        setError(null)
                      }}
                      className="mp-themed-input w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[rgba(0,174,239,0.45)] sm:py-2.5"
                    >
                      <option value="">Selecciona un banco</option>
                      {VENEZUELAN_BANK_OPTIONS.map((bank) => (
                        <option key={bank.code} value={bank.label}>
                          {bank.displayLabel}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <InputField
                  label="Fecha de pago *"
                  value={paymentDate}
                  onChange={(value) => {
                    setPaymentDate(value)
                    setError(null)
                  }}
                  placeholder=""
                  type="date"
                  icon={CalendarDays}
                />

                <div className="space-y-1.5">
                  <label className="text-xs text-[#a0a0a0]">
                    Comprobante {!proofRequired && <span className="text-[#9a9a9a]">(opcional)</span>}{proofRequired && <span className="text-[#4ade80]">*</span>}
                  </label>
                  <label
                    className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl py-6 transition-all"
                    style={{
                      background: 'var(--mp-card-subtle)',
                      border: `1px dashed ${proofFile ? 'rgba(74,222,128,0.3)' : 'var(--mp-input-border)'}`,
                    }}
                    onMouseEnter={(e) => {
                      if (!proofFile) e.currentTarget.style.borderColor = 'rgba(0,174,239,0.3)'
                    }}
                    onMouseLeave={(e) => {
                      if (!proofFile) e.currentTarget.style.borderColor = 'var(--mp-input-border)'
                    }}
                  >
                    {proofFile ? (
                      <>
                        <Check size={16} className="text-[#4ade80]" />
                        <span className="max-w-[200px] truncate text-xs text-[#4ade80]">
                          {proofFile.file.name}
                        </span>
                      </>
                    ) : (
                      <>
                        <Upload size={16} className="text-[var(--mp-text-faint)]" />
                        <span className="text-xs text-[#b8b8b8]">Subir comprobante</span>
                        <span className="text-[10px] text-[var(--mp-text-faint)]">JPG, PNG, WEBP - hasta 10MB</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) {
                          revokeMarketplaceUploadPreview(proofFile)
                          setProofFile(null)
                          return
                        }

                        try {
                          const prepared = await prepareMarketplaceUpload(file, 'payment-proof')
                          setError(null)
                          setProofFile(prev => {
                            revokeMarketplaceUploadPreview(prev)
                            return prepared
                          })
                        } catch (uploadError) {
                          setError(uploadError instanceof Error ? uploadError.message : 'No se pudo preparar el comprobante')
                          revokeMarketplaceUploadPreview(proofFile)
                          setProofFile(null)
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            {error && (
              <div
                className="flex items-start gap-2 rounded-xl p-3"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}
              >
                <AlertCircle size={12} className="mt-0.5 flex-shrink-0 text-red-400" />
                <p className="text-[11px] text-red-400">{error}</p>
              </div>
            )}
          </div>

          <div className="flex-shrink-0 border-t px-5 pb-5 pt-4" style={{ borderColor: 'var(--mp-border)' }}>
            <button
              onClick={handleConfirm}
              disabled={!canConfirmPayment}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all disabled:opacity-50"
              style={{
                background: 'rgba(74,222,128,0.1)',
                color: '#4ade80',
                border: '1px solid rgba(74,222,128,0.25)',
              }}
              onMouseEnter={(e) => {
                if (canConfirmPayment) {
                  e.currentTarget.style.background = 'rgba(74,222,128,0.18)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(74,222,128,0.1)'
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Procesando...
                </>
              ) : (
                <>
                  <Check size={14} /> Confirmar pago
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
