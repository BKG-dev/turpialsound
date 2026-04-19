'use client'

import { useState, useCallback, useEffect } from 'react'
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
} from 'lucide-react'
import type { Listing } from '@/types/marketplace'
import { initiatePurchase } from '@/actions/marketplace/transactions'

// ─── Static Turpial payment details ──────────────────────────────────────────

const TURPIAL_PAGO_MOVIL = {
  phone: '04141333305',
  idNumber: 'V-13864619',
  bank: 'Mercantil',
}

const TURPIAL_TRANSFER = {
  accountNumber: '01050187331187028916',
  idNumber: 'V-13894619',
  holder: 'Turpial Sound',
}

const TURPIAL_BINANCE = {
  payId: '117577221',
}

// ─── Types ────────────────────────────────────────────────────────────────────

type PaymentMethodId = 'PAGO_MOVIL' | 'BANK_TRANSFER' | 'CRYPTO_WALLET'

export interface CheckoutModalProps {
  listing: Listing
  sellerId: string
  onClose: () => void
  onOpenChat: (listing: Listing) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useCopyField(value: string) {
  const [copied, setCopied] = useState(false)
  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }, [value])
  return { copied, copy }
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const { copied, copy } = useCopyField(value)
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl"
      style={{ background: 'rgba(20,20,20,0.8)', border: '1px solid #1e1e1e' }}>
      <div className="min-w-0">
        <p className="text-[10px] text-[#5a5a5a] uppercase tracking-wider">{label}</p>
        <p className="text-sm text-[#f2f2f2] font-mono mt-0.5 truncate">{value}</p>
      </div>
      <button
        onClick={copy}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium flex-shrink-0 transition-all duration-200"
        style={copied
          ? { background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }
          : { background: 'rgba(0,174,239,0.1)', color: '#00aeef', border: '1px solid rgba(0,174,239,0.2)' }}
      >
        {copied ? <Check size={11} /> : <Copy size={11} />}
        {copied ? 'Copiado' : 'Copiar'}
      </button>
    </div>
  )
}

function InputField({ label, value, onChange, placeholder, type }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  type: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-[#a0a0a0]">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded-xl text-sm text-[#f2f2f2] font-mono placeholder:text-[#2a2a2a] outline-none"
        style={{ background: 'rgba(20,20,20,0.8)', border: '1px solid #1e1e1e',
          colorScheme: type === 'date' ? 'dark' : undefined }}
        onFocus={e => { e.target.style.borderColor = 'rgba(0,174,239,0.4)' }}
        onBlur={e => { e.target.style.borderColor = '#1e1e1e' }}
      />
    </div>
  )
}

// ─── Payment method tab config ────────────────────────────────────────────────

const METHODS: Array<{ id: PaymentMethodId; icon: React.ElementType; label: string; accent: string }> = [
  { id: 'PAGO_MOVIL',    icon: Smartphone, label: 'Pago Móvil',    accent: '#00aeef' },
  { id: 'BANK_TRANSFER', icon: Building2,  label: 'Transferencia', accent: '#ffc107' },
  { id: 'CRYPTO_WALLET', icon: Wallet,     label: 'Binance',       accent: '#f97316' },
]

const EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1]

// ─── Main Component ───────────────────────────────────────────────────────────

export function CheckoutModal({ listing, onClose }: CheckoutModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodId>('PAGO_MOVIL')
  const [bcvRate, setBcvRate] = useState<number | null>(null)

  // Form state
  const [reference, setReference] = useState('')
  const [bankName, setBankName]   = useState('')
  const [amountPaid, setAmountPaid] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [proofFile, setProofFile] = useState<File | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const price = listing.type === 'product' ? listing.price : listing.priceFrom
  const currency = listing.currency ?? 'USD'

  // Fetch BCV rate — no-store to bypass Next.js / CDN caching
  useEffect(() => {
    fetch('/api/bcv-rate', { cache: 'no-store' })
      .then(r => r.json())
      .then((d: { rate: number }) => setBcvRate(d.rate))
      .catch(() => { /* show USD only on failure */ })
  }, [])

  // Scroll lock
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  async function handleConfirm() {
    if (!reference.trim()) { setError('Ingresa el número de referencia'); return }
    setLoading(true)
    setError(null)
    try {
      const result = await initiatePurchase(listing.id, selectedMethod)
      if (!result.success) { setError(result.message); return }
      setSuccess(true)
    } catch {
      setError('Error inesperado. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="absolute inset-0"
          style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)' }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EXPO }}
          className="relative z-10 w-full max-w-md"
        >
          <div className="rounded-2xl flex flex-col items-center justify-center py-16 px-8 text-center gap-5"
            style={{
              background: 'rgba(10,10,10,0.99)',
              border: '1px solid rgba(255,255,255,0.07)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.9)',
            }}>
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 14 }}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)' }}>
                <CheckCircle2 size={32} className="text-[#4ade80]"
                  style={{ filter: 'drop-shadow(0 0 12px rgba(74,222,128,0.5))' }} />
              </div>
            </motion.div>
            <div>
              <p className="text-base font-semibold text-[#f2f2f2] mb-2">¡Pago reportado con éxito!</p>
              <p className="text-sm text-[#5a5a5a] leading-relaxed">
                El equipo de Turpial Market revisará tu pago en{' '}
                <span className="text-[#f2f2f2]">menos de 24 horas</span>.
              </p>
            </div>
            <button
              onClick={onClose}
              className="py-2.5 px-6 rounded-xl text-sm font-medium transition-colors"
              style={{ background: 'rgba(0,174,239,0.1)', color: '#00aeef', border: '1px solid rgba(0,174,239,0.25)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,174,239,0.18)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,174,239,0.1)' }}
            >
              Volver al marketplace
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  // ── Main modal ────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)' }}
      />

      {/* Shell */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.3, ease: EXPO }}
        className="relative z-10 w-full max-w-md"
        style={{ maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="rounded-2xl flex flex-col overflow-hidden"
          style={{
            background: 'rgba(10,10,10,0.99)',
            border: '1px solid rgba(255,255,255,0.07)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.9), 0 0 80px rgba(0,174,239,0.06)',
            maxHeight: '92vh',
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 flex-shrink-0 border-b border-[#1a1a1a]"
            style={{ background: 'rgba(0,174,239,0.05)' }}>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-[#f2f2f2] truncate">Completar compra</h2>
              <p className="text-[11px] text-[#5a5a5a] mt-0.5 truncate">{listing.title}</p>
            </div>
            <button onClick={onClose} className="text-[#5a5a5a] hover:text-[#f2f2f2] transition-colors flex-shrink-0">
              <X size={15} />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto scrollbar-none p-5 space-y-5">

            {/* Total + BCV rate */}
            <div className="rounded-xl p-4"
              style={{ background: 'rgba(0,174,239,0.04)', border: '1px solid rgba(0,174,239,0.12)' }}>
              <p className="text-[10px] text-[#5a5a5a] uppercase tracking-widest mb-2">Total a pagar</p>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-2xl font-bold text-[#f2f2f2]">
                  ${price?.toLocaleString('es-VE') ?? '—'}{' '}
                  <span className="text-sm font-normal text-[#5a5a5a]">{currency}</span>
                </span>
                {bcvRate && price != null && (
                  <span className="text-sm font-semibold text-[#ffc107]">
                    / {(price * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs
                  </span>
                )}
              </div>
              {bcvRate && (
                <p className="text-[10px] text-[#5a5a5a] mt-1.5">
                  Tasa BCV: 1 USD = {bcvRate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs
                </p>
              )}
            </div>

            {/* Method selector */}
            <div>
              <p className="text-[10px] text-[#5a5a5a] uppercase tracking-widest mb-3">Método de pago</p>
              <div className="grid grid-cols-3 gap-2">
                {METHODS.map(m => {
                  const Icon = m.icon
                  const sel = selectedMethod === m.id
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMethod(m.id)}
                      className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all duration-200"
                      style={{
                        background: sel ? `${m.accent}12` : 'rgba(20,20,20,0.6)',
                        border: `1px solid ${sel ? m.accent + '40' : '#1e1e1e'}`,
                        boxShadow: sel ? `0 0 16px ${m.accent}10` : 'none',
                      }}
                    >
                      <Icon size={16} style={{ color: sel ? m.accent : '#5a5a5a' }} />
                      <span className="text-[10px] font-medium" style={{ color: sel ? m.accent : '#5a5a5a' }}>
                        {m.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Payment details */}
            <div className="space-y-2">
              <p className="text-[10px] text-[#5a5a5a] uppercase tracking-widest">Datos de pago</p>

              {selectedMethod === 'PAGO_MOVIL' && (
                <>
                  <CopyRow label="Teléfono" value={TURPIAL_PAGO_MOVIL.phone} />
                  <CopyRow label="Cédula" value={TURPIAL_PAGO_MOVIL.idNumber} />
                  <CopyRow label="Banco" value={TURPIAL_PAGO_MOVIL.bank} />
                </>
              )}

              {selectedMethod === 'BANK_TRANSFER' && (
                <>
                  <CopyRow label="Número de cuenta" value={TURPIAL_TRANSFER.accountNumber} />
                  <CopyRow label="Cédula" value={TURPIAL_TRANSFER.idNumber} />
                  <CopyRow label="Beneficiario" value={TURPIAL_TRANSFER.holder} />
                </>
              )}

              {selectedMethod === 'CRYPTO_WALLET' && (
                <CopyRow label="Binance PayID" value={TURPIAL_BINANCE.payId} />
              )}
            </div>

            {/* Separator */}
            <div style={{ borderTop: '1px solid #1a1a1a' }} />

            {/* Payment report form */}
            <div className="space-y-3">
              <p className="text-[10px] text-[#5a5a5a] uppercase tracking-widest">Reportar pago</p>

              <div className="overflow-y-auto max-h-[55vh] pr-2 space-y-3">
                <InputField
                  label="Número de referencia *"
                  value={reference}
                  onChange={v => { setReference(v); setError(null) }}
                  placeholder="Ej: 012345678901"
                  type="text"
                />
                <InputField
                  label="Banco emisor"
                  value={bankName}
                  onChange={setBankName}
                  placeholder="Ej: Mercantil"
                  type="text"
                />
                <InputField
                  label="Monto pagado"
                  value={amountPaid}
                  onChange={setAmountPaid}
                  placeholder="Ej: 474.05"
                  type="number"
                />
                <InputField
                  label="Fecha de pago"
                  value={paymentDate}
                  onChange={setPaymentDate}
                  placeholder=""
                  type="date"
                />

                {/* File upload */}
                <div className="space-y-1.5">
                  <label className="text-xs text-[#a0a0a0]">
                    Comprobante <span className="text-[#5a5a5a]">(opcional)</span>
                  </label>
                  <label
                    className="flex flex-col items-center justify-center py-6 gap-2 rounded-xl cursor-pointer transition-all"
                    style={{
                      background: 'rgba(20,20,20,0.5)',
                      border: `1px dashed ${proofFile ? 'rgba(74,222,128,0.3)' : '#2a2a2a'}`,
                    }}
                    onMouseEnter={e => { if (!proofFile) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,174,239,0.3)' }}
                    onMouseLeave={e => { if (!proofFile) (e.currentTarget as HTMLElement).style.borderColor = '#2a2a2a' }}
                  >
                    {proofFile ? (
                      <>
                        <Check size={16} className="text-[#4ade80]" />
                        <span className="text-xs text-[#4ade80] truncate max-w-[200px]">{proofFile.name}</span>
                      </>
                    ) : (
                      <>
                        <Upload size={16} className="text-[#2a2a2a]" />
                        <span className="text-xs text-[#5a5a5a]">Subir comprobante</span>
                        <span className="text-[10px] text-[#2a2a2a]">JPG, PNG — hasta 10MB</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={e => setProofFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-xl p-3 flex items-start gap-2"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                <AlertCircle size={12} className="text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-red-400">{error}</p>
              </div>
            )}
          </div>

          {/* Footer CTA */}
          <div className="px-5 pb-5 pt-4 flex-shrink-0 border-t border-[#1a1a1a]">
            <button
              onClick={handleConfirm}
              disabled={!reference.trim() || loading}
              className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }}
              onMouseEnter={e => { if (reference.trim() && !loading) (e.currentTarget as HTMLElement).style.background = 'rgba(74,222,128,0.18)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(74,222,128,0.1)' }}
            >
              {loading
                ? <><Loader2 size={14} className="animate-spin" /> Procesando...</>
                : <><Check size={14} /> Confirmar Pago</>}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
