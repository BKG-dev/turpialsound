'use client'

import { useEffect, useState, useCallback, type ElementType } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { AlertCircle, Building2, Check, Copy, Loader2, Smartphone, Upload, Wallet, X } from 'lucide-react'
import { checkoutCart, submitOrderPaymentProof } from '@/actions/marketplace'
import { useBcvRate } from '@/lib/hooks/useBcvRate'
import { VENEZUELAN_BANK_OPTIONS } from '@/lib/marketplace/venezuelan-banks'
import {
  prepareMarketplaceUpload,
  revokeMarketplaceUploadPreview,
  uploadMarketplaceFile,
  type PreparedMarketplaceUpload,
} from '@/lib/marketplace/media-client'
import type { CartItem } from '@/types/marketplace'

type ManualMethodId = 'PAGO_MOVIL' | 'TRANSFERENCIA_BANCARIA' | 'BINANCE_PAY'
type CheckoutActionMethod = 'PAGO_MOVIL' | 'CRYPTO_WALLET'

type ManualMethodConfig = {
  id: ManualMethodId
  label: string
  accent: string
  icon: ElementType
  actionMethod: CheckoutActionMethod
  details: Array<{ label: string; value: string }> | ((priceDisplay: string) => Array<{ label: string; value: string }>)
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

function getTodayDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {}
  }, [value])

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl px-4 py-3" style={{ background: 'var(--mp-input)', border: '1px solid var(--mp-input-border)' }}>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-[#9a9a9a]">{label}</p>
        <p className="mt-0.5 truncate font-mono text-sm text-[#f2f2f2]">{value}</p>
      </div>
      <button onClick={copy} className="flex flex-shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all" style={{ background: copied ? 'rgba(74,222,128,0.12)' : 'rgba(0,174,239,0.1)', color: copied ? '#4ade80' : '#00aeef', border: `1px solid ${copied ? 'rgba(74,222,128,0.25)' : 'rgba(0,174,239,0.2)'}` }}>
        {copied ? <Check size={11} /> : <Copy size={11} />}
        {copied ? 'Copiado' : 'Copiar'}
      </button>
    </div>
  )
}

function groupBySeller(items: CartItem[]) {
  const grouped = new Map<string, { sellerName: string; items: CartItem[]; total: number }>()
  for (const item of items) {
    const current = grouped.get(item.sellerId) ?? { sellerName: item.sellerName, items: [], total: 0 }
    current.items.push(item)
    current.total += item.price * item.quantity
    grouped.set(item.sellerId, current)
  }
  return [...grouped.values()]
}

export function CartCheckoutModal({
  items,
  onClose,
  onSuccess,
  onViewPurchases,
}: {
  items: CartItem[]
  onClose: () => void
  onSuccess: () => void
  onViewPurchases?: () => void
}) {
  const router = useRouter()
  const { rate: bcvRate, loading: rateLoading } = useBcvRate()
  const [selectedMethodId, setSelectedMethodId] = useState<ManualMethodId>('PAGO_MOVIL')
  const [operationNumber, setOperationNumber] = useState('')
  const [bankName, setBankName] = useState('')
  const [paymentDate, setPaymentDate] = useState(getTodayDate())
  const [proofFile, setProofFile] = useState<PreparedMarketplaceUpload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null)

  const selectedMethod = MANUAL_METHODS.find((method) => method.id === selectedMethodId) ?? MANUAL_METHODS[0]
  const Icon = selectedMethod.icon
  const isBinancePay = selectedMethod.id === 'BINANCE_PAY'
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const unitCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const sellerGroups = groupBySeller(items)
  const usdAmountDisplay = total.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const bsAmountValue = bcvRate ? total * bcvRate : 0
  const bsAmountDisplay = bsAmountValue
    ? bsAmountValue.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '-'
  const selectedMethodDetails = typeof selectedMethod.details === 'function'
    ? selectedMethod.details(usdAmountDisplay)
    : selectedMethod.details
  const canConfirm = Boolean(operationNumber.trim() && paymentDate.trim() && (isBinancePay || bankName.trim()) && proofFile && !loading)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    return () => revokeMarketplaceUploadPreview(proofFile)
  }, [proofFile])

  async function handleProofFile(file: File | null) {
    setError(null)
    revokeMarketplaceUploadPreview(proofFile)
    setProofFile(null)
    if (!file) return

    try {
      setProofFile(await prepareMarketplaceUpload(file, 'payment-proof'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo preparar el comprobante')
    }
  }

  async function handleConfirm() {
    if (!canConfirm) return
    if (!proofFile) {
      setError('El comprobante de pago es obligatorio')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const draft = await checkoutCart(items.map(item => ({
        listingId: item.listingId,
        paymentMethod: selectedMethod.actionMethod,
        quantity: item.quantity,
      })))
      if (!draft.success || !draft.data) {
        setError(draft.message)
        return
      }

      const firstTransactionId = draft.data.transactions[0]?.transactionId
      if (!firstTransactionId) {
        setError('No se pudo preparar la transaccion para adjuntar el comprobante')
        return
      }

      const proofUrl = (await uploadMarketplaceFile(proofFile.file, 'payment-proof', { transactionId: firstTransactionId })).url

      const proof = await submitOrderPaymentProof(
        draft.data.orderId,
        operationNumber.trim(),
        { senderBank: isBinancePay ? null : bankName, paymentDate },
        proofUrl,
      )
      if (!proof.success) {
        setError(proof.message)
        return
      }

      onSuccess()
      setSuccessOrderId(draft.data.orderId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (successOrderId) {
    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center px-4">
        <div className="absolute inset-0" style={{ background: 'var(--mp-overlay)', backdropFilter: 'blur(10px)' }} />
        <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative z-10 w-full max-w-md rounded-2xl px-8 py-12 text-center" style={{ background: 'var(--mp-panel-solid)', border: '1px solid var(--mp-border)', boxShadow: 'var(--mp-shadow)' }}>
          <Check size={34} className="mx-auto text-[#4ade80]" />
          <h2 className="mt-4 text-lg font-semibold text-[#f2f2f2]">Orden consolidada creada</h2>
          <p className="mt-2 text-sm text-[#b8b8b8]">Tu pago sera validado una vez y cada vendedor avanzara su entrega por separado.</p>
          <p className="mt-3 font-mono text-[11px] text-[#7a7a7a]">{successOrderId}</p>
          <button
            type="button"
            onClick={() => {
              if (onViewPurchases) {
                onViewPurchases()
                return
              }
              router.push('/marketplace/dashboard?tab=purchases')
            }}
            className="mt-6 rounded-xl px-5 py-3 text-sm font-semibold"
            style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }}
          >
            Ver compras
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4">
      <div className="absolute inset-0" onClick={onClose} style={{ background: 'var(--mp-overlay)', backdropFilter: 'blur(10px)' }} />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.3, ease: EXPO }} className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl" style={{ background: 'var(--mp-panel-solid)', border: '1px solid var(--mp-border)', boxShadow: 'var(--mp-shadow)' }}>
        <div className="flex items-center justify-between gap-3 border-b px-5 py-4" style={{ borderColor: 'var(--mp-border)' }}>
          <div>
            <h2 className="text-sm font-semibold text-[#f2f2f2]">Revisar y pagar orden</h2>
            <p className="mt-0.5 text-[11px] text-[#b8b8b8]">{unitCount} articulos · {sellerGroups.length} vendedor(es)</p>
          </div>
          <button onClick={onClose} className="text-[#5a5a5a] transition-colors hover:text-[#f2f2f2]"><X size={15} /></button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <section className="rounded-xl p-4" style={{ background: 'rgba(255,193,7,0.05)', border: '1px solid rgba(255,193,7,0.14)' }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#9a9a9a]">Total consolidado</p>
                <p className="mt-1 text-2xl font-bold text-[#f2f2f2]">${usdAmountDisplay} USD</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-[#9a9a9a]">Pago en Bs</p>
                <p className="mt-1 text-sm font-semibold text-[#ffc107]">{rateLoading ? 'Cargando...' : `${bsAmountDisplay} Bs`}</p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-[10px] uppercase tracking-widest text-[#9a9a9a]">Detalle por vendedor</p>
            {sellerGroups.map((group) => (
              <div key={group.sellerName} className="rounded-xl p-4" style={{ background: 'var(--mp-card-subtle)', border: '1px solid var(--mp-border)' }}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-[#f2f2f2]">{group.sellerName}</p>
                  <p className="text-xs font-semibold text-[#ffc107]">${group.total.toLocaleString('es-VE')}</p>
                </div>
                <div className="space-y-2">
                  {group.items.map((item) => (
                    <div key={item.listingId} className="flex items-center justify-between gap-3 text-[11px] text-[#b8b8b8]">
                      <span className="min-w-0 truncate">{item.title}</span>
                      <span className="flex-shrink-0 font-mono">{item.quantity} x ${item.price.toLocaleString('es-VE')}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>

          <section>
            <p className="mb-3 text-[10px] uppercase tracking-widest text-[#9a9a9a]">Metodo de pago</p>
            <div className="grid grid-cols-3 gap-2">
              {MANUAL_METHODS.map((method) => {
                const MethodIcon = method.icon
                const selected = selectedMethod.id === method.id
                return (
                  <button key={method.id} onClick={() => { setSelectedMethodId(method.id); if (method.id === 'BINANCE_PAY') setBankName(''); setError(null) }} className="flex flex-col items-center gap-2 rounded-xl px-2 py-3 text-center transition-all" style={{ background: selected ? `${method.accent}12` : 'var(--mp-input)', border: `1px solid ${selected ? `${method.accent}40` : 'var(--mp-border)'}` }}>
                    <MethodIcon size={16} style={{ color: selected ? method.accent : 'var(--mp-text-faint)' }} />
                    <span className="text-[10px] font-medium leading-tight" style={{ color: selected ? method.accent : 'var(--mp-text-faint)' }}>{method.label}</span>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="space-y-3 rounded-xl p-4" style={{ background: 'var(--mp-card-subtle)', border: `1px solid ${selectedMethod.accent}24` }}>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `${selectedMethod.accent}15`, color: selectedMethod.accent }}>
                <Icon size={16} />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#f2f2f2]">{selectedMethod.label}</p>
                <p className="text-[11px] text-[#b8b8b8]">Usa estos datos y reporta la operacion una sola vez.</p>
              </div>
            </div>
            {selectedMethodDetails.map((detail) => <CopyRow key={`${selectedMethod.id}_${detail.label}`} label={detail.label} value={detail.value} />)}
            {!isBinancePay && <CopyRow label="Monto en Bs" value={bsAmountDisplay !== '-' ? `${bsAmountDisplay} Bs` : '-'} />}
          </section>

          <section className="space-y-3">
            <p className="text-[10px] uppercase tracking-widest text-[#9a9a9a]">Reportar pago</p>
            <input value={operationNumber} onChange={(e) => { setOperationNumber(e.target.value); setError(null) }} placeholder={isBinancePay ? 'Referencia / hash Binance' : 'Numero de operacion'} className="mp-themed-input w-full rounded-xl border px-4 py-2.5 font-mono text-sm outline-none" />
            {!isBinancePay && (
              <select value={bankName} onChange={(e) => { setBankName(e.target.value); setError(null) }} className="mp-themed-input w-full rounded-xl border px-4 py-2.5 text-sm outline-none">
                <option value="">Selecciona banco emisor</option>
                {VENEZUELAN_BANK_OPTIONS.map((bank) => <option key={bank.code} value={bank.name}>{bank.label}</option>)}
              </select>
            )}
            <input type="date" value={paymentDate} onChange={(e) => { setPaymentDate(e.target.value); setError(null) }} className="mp-themed-input w-full rounded-xl border px-4 py-2.5 text-sm outline-none" />
            <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-4 py-4 text-xs transition-colors hover:bg-white/5" style={{ borderColor: proofFile ? 'rgba(74,222,128,0.4)' : 'var(--mp-border)', color: proofFile ? '#4ade80' : '#b8b8b8' }}>
              <span className="flex items-center gap-2">
                <Upload size={14} />
                {proofFile ? proofFile.file.name : 'Adjuntar comprobante de pago'}
              </span>
              <span className="text-[10px]" style={{ color: proofFile ? '#4ade80' : '#ef4444' }}>
                Campo obligatorio para reportar la orden
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleProofFile(e.target.files?.[0] ?? null)} />
            </label>
            {error && (
              <div className="flex items-start gap-2 rounded-xl px-4 py-3 text-xs" style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </section>
        </div>

        <div className="border-t p-5" style={{ borderColor: 'var(--mp-border)' }}>
          <button onClick={handleConfirm} disabled={!canConfirm} className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all disabled:opacity-50" style={{ background: 'linear-gradient(135deg, rgba(255,193,7,0.9) 0%, rgba(245,158,11,0.85) 100%)', color: '#0a0a0a', border: '1px solid rgba(255,193,7,0.4)' }}>
            {loading ? <><Loader2 size={14} className="animate-spin" /> Procesando orden...</> : <>Crear orden y reportar pago</>}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
