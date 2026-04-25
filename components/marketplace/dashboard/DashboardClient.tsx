'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeft,
  ShoppingBag,
  TrendingUp,
  MessageSquare,
  Heart,
  Star,
  BadgeCheck,
  Shield,
  Clock,
  Package,
  ChevronRight,
  Zap,
  Activity,
  AlertTriangle,
  X,
  Loader2,
  HelpCircle,
  Wallet,
  Landmark,
  CircleDollarSign,
  Copy,
  Check,
  Plus,
  CreditCard,
} from 'lucide-react'
import type { MpSessionPayload } from '@/lib/marketplace/auth'
import { TransactionChat } from '@/components/marketplace/TransactionChat'
import { getMyThreads, getUnreadCount } from '@/actions/marketplace/chat'
import { getTransaction, openDispute } from '@/actions/marketplace/transactions'
import { toggleFavorite } from '@/actions/marketplace/favorites'
import {
  addPayoutMethod,
  removePayoutMethod,
  setDefaultPayoutMethod,
} from '@/actions/marketplace/users'
import { cn } from '@/lib/utils'
import { MarketplaceImage } from '@/components/marketplace/MarketplaceImage'

// ─── Local Types ──────────────────────────────────────────────────────────────

interface DashProfile {
  id: string
  displayName: string
  bio: string | null
  avatarUrl: string | null
  isVerified: boolean
  verificationLevel: string
  isSeller: boolean
  sellerRating: string | null
  totalSales: number
  totalPurchases: number
  role: string
  createdAt: string | Date
}

interface DashTransaction {
  id: string
  status: string
  amount: string
  currency: string
  paymentMethod: string
  platformFeeAmount?: string
  sellerNetAmount?: string
  paymentReference?: string | null
  paymentProofUrl?: string | null
  createdAt: string | Date
  escrowReleaseAt?: string | Date | null
  buyer: { id: string; displayName: string; avatarUrl: string | null }
  seller: { id: string; displayName: string; avatarUrl: string | null }
  listing: { id: string; title: string; slug: string; coverImageUrl: string | null } | null
}

interface DashTransactionHistory {
  id: string
  fromStatus: string | null
  toStatus: string
  reason: string | null
  createdAt: string | Date
}

interface DashTransactionDetail extends DashTransaction {
  adminNotes?: string | null
  paymentSenderBank?: string | null
  paymentPaidAt?: string | Date | null
  statusHistory?: DashTransactionHistory[]
}

interface DashPayoutMethod {
  id: string
  methodType: string
  displayLabel: string
  encryptedData: string
  currency: string
  isDefault: boolean
  createdAt: string | Date
}

interface DashThread {
  id: string
  buyerId: string
  sellerId: string
  isActive: boolean
  lastMessageAt: string | Date
  unreadCount?: number
  buyer: { id: string; displayName: string; avatarUrl: string | null }
  seller: { id: string; displayName: string; avatarUrl: string | null }
  listing: { id: string; title: string; slug: string; coverImageUrl: string | null } | null
  messages: Array<{ content: string; createdAt: string | Date; senderId: string; isRead: boolean }>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DashListing = any

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DashInteracted = any

// ─── Tab Type ─────────────────────────────────────────────────────────────────

type Tab = 'my_store' | 'sales' | 'purchases' | 'messages' | 'favorites' | 'payouts'

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; glow: string }> = {
  INITIATED:           { label: 'Iniciado',          color: '#60a5fa', bg: 'rgba(59,130,246,0.1)',  glow: 'rgba(59,130,246,0.25)'  },
  PENDING_PAYMENT:     { label: 'Pago Pendiente',    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  glow: 'rgba(245,158,11,0.25)'  },
  PAYMENT_RECEIVED:    { label: 'Pago Recibido',     color: '#eab308', bg: 'rgba(234,179,8,0.1)',   glow: 'rgba(234,179,8,0.25)'   },
  VALIDATING:          { label: 'Validando',         color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', glow: 'rgba(167,139,250,0.25)' },
  IN_ESCROW:           { label: 'En Escrow',         color: '#00aeef', bg: 'rgba(0,174,239,0.1)',   glow: 'rgba(0,174,239,0.25)'   },
  DELIVERY_CONFIRMED:  { label: 'Entrega Confirmada',color: '#34d399', bg: 'rgba(52,211,153,0.1)',  glow: 'rgba(52,211,153,0.25)'  },
  RELEASED:            { label: 'Liberado',          color: '#4ade80', bg: 'rgba(74,222,128,0.1)',  glow: 'rgba(74,222,128,0.25)'  },
  PAYMENT_FAILED:      { label: 'Pago Fallido',      color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   glow: 'rgba(239,68,68,0.25)'   },
  DISPUTED:            { label: 'En Disputa',        color: '#f97316', bg: 'rgba(249,115,22,0.1)',  glow: 'rgba(249,115,22,0.25)'  },
  REFUNDED:            { label: 'Reembolsado',       color: '#c084fc', bg: 'rgba(192,132,252,0.1)', glow: 'rgba(192,132,252,0.25)' },
  CANCELLED:           { label: 'Cancelado',         color: '#6b7280', bg: 'rgba(107,114,128,0.1)', glow: 'rgba(107,114,128,0.25)' },
  // Listing statuses
  ACTIVE:              { label: 'Activo',            color: '#4ade80', bg: 'rgba(74,222,128,0.1)',  glow: 'rgba(74,222,128,0.25)'  },
  PAUSED:              { label: 'Pausado',           color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  glow: 'rgba(245,158,11,0.25)'  },
  ARCHIVED:            { label: 'Archivado',         color: '#6b7280', bg: 'rgba(107,114,128,0.1)', glow: 'rgba(107,114,128,0.25)' },
  DRAFT:               { label: 'Borrador',          color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', glow: 'rgba(167,139,250,0.25)' },
  SOLD_OUT:            { label: 'Agotado',           color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   glow: 'rgba(239,68,68,0.25)'   },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.CANCELLED
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.glow}` }}
    >
      {cfg.label}
    </span>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtTime(d: string | Date) {
  return new Date(d).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })
}

function fmtUSD(n: number) {
  return `$${n.toFixed(2)}`
}

function initials(name: string) {
  return name.slice(0, 2).toUpperCase()
}

function parsePayoutDetails(encryptedData: string) {
  try {
    const parsed = JSON.parse(encryptedData)
    return parsed && typeof parsed === 'object' ? parsed as Record<string, string> : {}
  } catch {
    return {}
  }
}

function payoutMethodLabel(methodType: string) {
  const labels: Record<string, string> = {
    PAGO_MOVIL: 'Pago movil',
    MERCANTIL_PAGO_MOVIL: 'Pago movil',
    BANK_TRANSFER: 'Transferencia bancaria',
    ZELLE: 'Zelle',
    BINANCE_PAY: 'Binance Pay',
    CRYPTO_WALLET: 'Wallet crypto',
    CRYPTO_WALLET_MANUAL: 'Binance Pay',
  }

  return labels[methodType] ?? methodType
}

function getOperationalStatusCopy(status: string, viewAs: 'buyer' | 'seller') {
  const copy: Record<string, { buyer: string; seller: string }> = {
    PENDING_PAYMENT: {
      buyer: 'Tu compra fue iniciada. Falta reportar el pago para que el equipo pueda revisarlo.',
      seller: 'El comprador inicio la compra, pero aun no ha reportado el pago.',
    },
    PAYMENT_RECEIVED: {
      buyer: 'Recibimos tu reporte de pago. La validacion manual esta en curso. Te notificaremos la resolucion y, si procede, la activacion del escrow.',
      seller: 'El comprador ya reporto el pago. La validacion manual esta en curso y te notificaremos cuando el pago quede conciliado o el escrow sea liberado.',
    },
    VALIDATING: {
      buyer: 'Tu pago sigue en validacion manual. No necesitas repetir el envio mientras revisamos la conciliacion. Te notificaremos la resolucion.',
      seller: 'La validacion manual sigue en curso. Te notificaremos cuando el pago quede conciliado y los fondos entren en escrow.',
    },
    IN_ESCROW: {
      buyer: 'El pago ya fue validado y los fondos estan protegidos en escrow hasta la entrega o liberacion manual.',
      seller: 'Los fondos ya estan en escrow. Completa la entrega para avanzar al cierre operativo.',
    },
    DELIVERY_CONFIRMED: {
      buyer: 'La entrega fue confirmada. El payout al vendedor queda en cola operativa.',
      seller: 'La entrega fue confirmada. El payout manual debe ejecutarse en el siguiente paso operativo.',
    },
    RELEASED: {
      buyer: 'La operacion fue liberada y quedo cerrada a nivel de escrow.',
      seller: 'La operacion fue liberada desde escrow. Si el payout manual aun no se ha ejecutado, ya quedo lista para pago.',
    },
    DISPUTED: {
      buyer: 'La transaccion entro en disputa. El equipo revisara el caso antes de liberar fondos.',
      seller: 'La transaccion entro en disputa. Los fondos quedan retenidos hasta la resolucion.',
    },
    PAYMENT_FAILED: {
      buyer: 'El pago fue rechazado o no pudo conciliarse. Revisa los datos antes de intentar de nuevo.',
      seller: 'El pago del comprador no pudo validarse y la operacion quedo rechazada.',
    },
    CANCELLED: {
      buyer: 'La transaccion fue cancelada.',
      seller: 'La transaccion fue cancelada.',
    },
    REFUNDED: {
      buyer: 'La disputa se resolvio a favor del comprador y la operacion fue reembolsada.',
      seller: 'La disputa se resolvio a favor del comprador y no habra payout para esta operacion.',
    },
  }

  return copy[status]?.[viewAs] ?? 'Consulta el estado de la transaccion para continuar con el siguiente paso operativo.'
}

function getOperationalNextStep(status: string, viewAs: 'buyer' | 'seller') {
  const nextStep: Record<string, { buyer: string; seller: string }> = {
    PENDING_PAYMENT: {
      buyer: 'Reporta tu pago con referencia, banco y fecha para iniciar la validacion.',
      seller: 'Espera a que el comprador reporte el pago para que el equipo pueda validarlo.',
    },
    PAYMENT_RECEIVED: {
      buyer: 'Espera la validacion manual. No hace falta reenviar el comprobante salvo que soporte lo solicite.',
      seller: 'Espera la conciliacion manual. Te notificaremos cuando entre a escrow o si hace falta revision adicional.',
    },
    VALIDATING: {
      buyer: 'Mantente atento a la confirmacion del equipo mientras termina la conciliacion.',
      seller: 'Mantente atento a la confirmacion del equipo mientras termina la conciliacion.',
    },
    IN_ESCROW: {
      buyer: 'Coordina la entrega y abre disputa solo si aparece una incidencia real.',
      seller: 'Completa la entrega para que el flujo pueda avanzar a liberacion o payout manual.',
    },
    DELIVERY_CONFIRMED: {
      buyer: 'La operacion ya quedo lista para cierre operativo.',
      seller: 'El payout manual queda en cola operativa con tus datos de cobro actuales.',
    },
    RELEASED: {
      buyer: 'La transaccion ya esta cerrada del lado de escrow.',
      seller: 'Verifica tus datos de cobro si el payout manual aun no ha sido ejecutado.',
    },
    DISPUTED: {
      buyer: 'Espera la resolucion del equipo y conserva el contexto de la entrega.',
      seller: 'Espera la resolucion del equipo y conserva el contexto de la entrega.',
    },
    PAYMENT_FAILED: {
      buyer: 'Revisa los datos del pago antes de intentar nuevamente.',
      seller: 'La operacion no seguira hasta que exista un nuevo pago valido.',
    },
  }

  return nextStep[status]?.[viewAs] ?? 'Revisa la linea de estado para identificar el siguiente paso operativo.'
}

function getTxUnreadCount(thread: DashThread, currentUserId: string) {
  if (typeof thread.unreadCount === 'number') return thread.unreadCount
  const lastMsg = thread.messages[0]
  return lastMsg && !lastMsg.isRead && lastMsg.senderId !== currentUserId ? 1 : 0
}

function getTxExtraFee(tx: DashTransaction) {
  if (tx.paymentMethod === 'MERCANTIL_PAGO_MOVIL') return Math.round(Number(tx.amount ?? 0) * 0.03) / 100
  if (tx.paymentMethod === 'CRYPTO_WALLET_MANUAL') return 0.06
  return 0
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}

function getTxTotalFee(tx: DashTransaction) {
  const storedFee = Number(tx.platformFeeAmount ?? 0)
  if (storedFee > 0) return storedFee

  const amount = Number(tx.amount ?? 0)
  const sellerNet = Number(tx.sellerNetAmount ?? 0)
  if (amount > 0 && sellerNet >= 0) {
    return roundCurrency(Math.max(amount - sellerNet, 0))
  }

  return getTxExtraFee(tx)
}

function getTxBasePlatformFee(tx: DashTransaction) {
  return roundCurrency(Math.max(getTxTotalFee(tx) - getTxExtraFee(tx), 0))
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.05)' }} />
      <span className="text-[10px] font-semibold text-[#3a3a3a] uppercase tracking-widest whitespace-nowrap">
        {title}
        {count !== undefined && count > 0 && (
          <span className="ml-1.5 text-[#5a5a5a]">({count})</span>
        )}
      </span>
      <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.05)' }} />
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = '#00aeef',
  onClick,
  tone = 'default',
}: {
  icon: LucideIcon
  label: string
  value: string
  sub?: string
  accent?: string
  onClick?: () => void
  tone?: 'default' | 'primary' | 'compact'
}) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick() } : undefined}
      className={cn(
        "rounded-2xl flex min-w-0 flex-col justify-between gap-4 relative overflow-hidden",
        tone === 'primary' ? "p-5 min-h-[148px]" : tone === 'compact' ? "p-4 min-h-[118px]" : "p-4 min-h-[132px]",
        onClick && "cursor-pointer transition-all duration-200 hover:ring-1 ring-[#00aeef] hover:brightness-110 active:scale-[0.98]",
      )}
      style={{
        background: tone === 'primary'
          ? `linear-gradient(135deg, ${accent}12 0%, rgba(13,13,13,0.96) 58%)`
          : 'linear-gradient(180deg, rgba(18,18,18,0.96) 0%, rgba(10,10,10,0.96) 100%)',
        border: `1px solid ${tone === 'primary' ? `${accent}22` : 'rgba(255,255,255,0.065)'}`,
        boxShadow: '0 18px 42px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.035)',
      }}
    >
      <div className="flex items-center gap-2 relative z-10">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: `${accent}20`, border: `1px solid ${accent}30` }}
        >
          <Icon size={14} color={accent} />
        </div>
        <span className="min-w-0 text-[10px] font-semibold text-[#8a8a8a] uppercase tracking-normal leading-snug">{label}</span>
      </div>
      <div className="relative z-10 min-w-0">
        <p className={cn(
          "font-bold text-[#f2f2f2] leading-none tracking-normal tabular-nums",
          tone === 'primary' ? "text-3xl" : "text-2xl",
          "[overflow-wrap:anywhere]",
        )}>
          {value}
        </p>
        {sub && <p className="mt-2 text-[11px] leading-relaxed text-[#8a8a8a]">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Dispute Modal ────────────────────────────────────────────────────────────

const DISPUTE_REASONS = [
  'No recibí el producto / servicio',
  'El producto no coincide con la descripción',
  'El vendedor no responde',
  'Producto llegó dañado o incompleto',
  'Servicio entregado de forma incompleta',
  'Otro motivo',
]

function DisputeModal({
  tx,
  onClose,
  onSuccess,
}: {
  tx: DashTransaction
  onClose: () => void
  onSuccess: (txId: string) => void
}) {
  const [reason, setReason] = useState(DISPUTE_REASONS[0])
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (description.trim().length < 20) {
      setError('La descripción debe tener al menos 20 caracteres.')
      return
    }
    setSubmitting(true)
    setError(null)
    const res = await openDispute(tx.id, reason, description.trim())
    if (res.success) {
      onSuccess(tx.id)
      onClose()
    } else {
      setError(res.message)
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(11,11,11,0.98)',
          border: '1px solid rgba(249,115,22,0.2)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.85), 0 0 80px rgba(249,115,22,0.06)',
        }}
      >
        <div
          className="flex items-center gap-3 px-6 py-4 border-b border-[#1e1e1e]"
          style={{ background: 'rgba(249,115,22,0.06)' }}
        >
          <AlertTriangle size={16} className="text-[#f97316] flex-shrink-0"
            style={{ filter: 'drop-shadow(0 0 6px rgba(249,115,22,0.5))' }} />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-[#f2f2f2]">Abrir Disputa</h3>
            <p className="text-[11px] text-[#5a5a5a] truncate mt-0.5">
              {tx.listing?.title ?? 'Transacción'} · ${Number(tx.amount).toLocaleString('es-VE')} {tx.currency}
            </p>
          </div>
          <button onClick={onClose} className="text-[#5a5a5a] hover:text-[#f2f2f2] transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div
            className="rounded-xl p-3 flex items-start gap-2.5"
            style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.15)' }}
          >
            <Shield size={13} className="text-[#f97316] mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-[#a0a0a0] leading-relaxed">
              Al abrir una disputa, los fondos en escrow quedan{' '}
              <span className="text-[#f2f2f2]">retenidos hasta la resolución</span>. El equipo de Turpial
              Market revisará el caso en <span className="text-[#f2f2f2]">24–48 horas</span>.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[#a0a0a0]">Motivo de la disputa</label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm text-[#f2f2f2] outline-none"
              style={{ background: 'rgba(20,20,20,0.8)', border: '1px solid rgba(249,115,22,0.2)' }}
            >
              {DISPUTE_REASONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[#a0a0a0]">
              Descripción detallada{' '}
              <span className="text-[#3a3a3a]">(mín. 20 caracteres)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe con detalle qué ocurrió, cuándo y por qué solicitas una disputa..."
              rows={4}
              className="w-full px-4 py-2.5 rounded-xl text-sm text-[#f2f2f2] placeholder:text-[#3a3a3a] outline-none resize-none"
              style={{
                background: 'rgba(20,20,20,0.8)',
                border: `1px solid ${description.trim().length > 0 && description.trim().length < 20 ? 'rgba(239,68,68,0.4)' : 'rgba(249,115,22,0.15)'}`,
              }}
              maxLength={1500}
            />
            <div className="flex items-center justify-between">
              {description.trim().length > 0 && description.trim().length < 20 && (
                <p className="text-[11px] text-[#ef4444]">Mínimo 20 caracteres</p>
              )}
              <p className="text-[10px] text-[#3a3a3a] ml-auto">{description.length}/1500</p>
            </div>
          </div>

          {error && (
            <div
              className="rounded-xl p-3 flex items-start gap-2"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <AlertTriangle size={13} className="text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-red-400">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-3 rounded-xl text-sm text-[#a0a0a0] hover:text-[#f2f2f2] transition-colors disabled:opacity-50"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || description.trim().length < 20}
              className="flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, rgba(249,115,22,0.9) 0%, rgba(239,68,68,0.8) 100%)',
                color: '#fff',
                border: '1px solid rgba(249,115,22,0.3)',
                boxShadow: submitting ? 'none' : '0 0 20px rgba(249,115,22,0.25)',
              }}
            >
              {submitting ? (
                <><Loader2 size={14} className="animate-spin" />Enviando...</>
              ) : (
                <><AlertTriangle size={14} />Abrir Disputa</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Transaction Card ─────────────────────────────────────────────────────────

function TxCard({
  tx,
  viewAs,
  onDispute,
  onOpenDetails,
  payoutMissing = false,
}: {
  tx: DashTransaction
  viewAs: 'buyer' | 'seller'
  onDispute?: (tx: DashTransaction) => void
  onOpenDetails?: (tx: DashTransaction) => void
  payoutMissing?: boolean
}) {
  const otherParty = viewAs === 'buyer' ? tx.seller : tx.buyer
  const guidance = getOperationalStatusCopy(tx.status, viewAs)

  return (
    <div
      onClick={() => onOpenDetails?.(tx)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpenDetails?.(tx)
        }
      }}
      className="w-full rounded-xl p-4 flex gap-3 group text-left transition-all duration-200 hover:border-[rgba(0,174,239,0.2)]"
      style={{
        background: 'rgba(13,13,13,0.9)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 2px 16px rgba(0,0,0,0.4)',
      }}
    >
      <div
        className="relative w-14 h-14 rounded-lg flex-shrink-0 overflow-hidden"
        style={{ background: 'rgba(30,30,30,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {tx.listing?.coverImageUrl ? (
          <MarketplaceImage
            src={tx.listing.coverImageUrl}
            alt={tx.listing.title}
            fill
            className="w-full h-full object-cover"
            sizes="80px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={20} className="text-[#3a3a3a]" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#f2f2f2] truncate">
              {tx.listing?.title ?? 'Listing eliminado'}
            </p>
            <p className="text-[11px] text-[#5a5a5a] mt-0.5">
              {viewAs === 'buyer' ? 'Vendedor: ' : 'Comprador: '}
              <span className="text-[#a0a0a0]">{otherParty.displayName}</span>
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-semibold text-[#f2f2f2]">
              ${Number(tx.amount).toLocaleString('es-VE')}
            </p>
            <p className="text-[10px] text-[#5a5a5a]">{tx.currency}</p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <StatusBadge status={tx.status} />
          <div className="flex items-center gap-1 text-[10px] text-[#5a5a5a]">
            <Clock size={9} />
            <span>{fmtDate(tx.createdAt)}</span>
          </div>
        </div>

        {tx.status === 'IN_ESCROW' && tx.escrowReleaseAt && (
          <div className="mt-2 flex items-center gap-1.5">
            <Shield size={9} className="text-[#00aeef]" />
            <span className="text-[9px] text-[#5a5a5a]">
              Liberación automática: {fmtDate(tx.escrowReleaseAt)}
            </span>
          </div>
        )}

        {tx.status === 'IN_ESCROW' && onDispute && (
          <div className="mt-3">
            <button
              onClick={(event) => {
                event.stopPropagation()
                onDispute(tx)
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200"
              style={{
                background: 'rgba(249,115,22,0.06)',
                border: '1px solid rgba(249,115,22,0.18)',
                color: '#f97316',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(249,115,22,0.12)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(249,115,22,0.06)' }}
            >
              <AlertTriangle size={11} />
              Abrir Disputa
            </button>
          </div>
        )}

        <div
          className="mt-3 rounded-lg px-3 py-2"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <p className="text-[11px] text-[#d4d4d4]">{guidance}</p>
          <p className="mt-1 text-[10px] text-[#5a5a5a]">Haz clic para ver el detalle completo y la linea de estado.</p>
        </div>

        {viewAs === 'seller' && payoutMissing && (
          <div
            className="mt-3 rounded-lg px-3 py-2"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)' }}
          >
            <p className="text-[11px] font-medium text-[#f59e0b]">
              Pendiente de datos de cobro para liberar payout al vendedor.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── My Listing Row (seller dashboard) ────────────────────────────────────────

function MyListingRow({ listing, onClick }: { listing: DashListing; onClick?: () => void }) {
  const price = listing.price ?? listing.priceFrom
  const cover = listing.coverImageUrl ?? listing.images?.[0] ?? null

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick() } : undefined}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl transition-all duration-200",
        onClick && "cursor-pointer hover:border-[rgba(0,174,239,0.2)] hover:bg-[rgba(0,174,239,0.02)] active:scale-[0.99]",
      )}
      style={{
        background: 'rgba(13,13,13,0.9)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div
        className="relative w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden"
        style={{ background: 'rgba(30,30,30,0.8)', border: '1px solid rgba(255,255,255,0.04)' }}
      >
        {cover ? (
          <MarketplaceImage src={cover} alt={listing.title} fill className="w-full h-full object-cover" sizes="72px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={16} className="text-[#3a3a3a]" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#f2f2f2] truncate">{listing.title}</p>
        <p className="text-[10px] text-[#5a5a5a] mt-0.5">{listing.subcategory ?? listing.category}</p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {price !== undefined && (
          <span className="text-sm font-semibold text-[#ffc107]">${Number(price).toLocaleString()}</span>
        )}
        <StatusBadge status={listing.status ?? 'ACTIVE'} />
      </div>
    </div>
  )
}

// ─── Interacted Listing Row (buyer Q&A) ───────────────────────────────────────

function InteractedRow({ item }: { item: DashInteracted }) {
  const [expanded, setExpanded] = useState(false)
  const unanswered = (item.questions as Array<{ answer: string | null }>).filter(q => !q.answer).length

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid rgba(0,174,239,0.1)', background: 'rgba(13,13,13,0.9)' }}
    >
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center gap-3 p-3 text-left"
      >
        <div
          className="relative w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden"
          style={{ background: 'rgba(30,30,30,0.8)', border: '1px solid rgba(255,255,255,0.04)' }}
        >
          {item.listingCoverImageUrl ? (
            <MarketplaceImage
              src={item.listingCoverImageUrl}
              alt={item.listingTitle}
              fill
              className="w-full h-full object-cover"
              sizes="56px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package size={14} className="text-[#3a3a3a]" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#f2f2f2] truncate">{item.listingTitle}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <HelpCircle size={10} className="text-[#00aeef]" />
            <span className="text-[10px] text-[#5a5a5a]">
              {item.questions.length} pregunta{item.questions.length !== 1 ? 's' : ''}
              {unanswered > 0 && (
                <span className="ml-1 text-[#f59e0b]">· {unanswered} sin respuesta</span>
              )}
            </span>
          </div>
        </div>

        <ChevronRight
          size={14}
          className="text-[#3a3a3a] transition-transform duration-200 flex-shrink-0"
          style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
        />
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-[rgba(255,255,255,0.04)]">
          {(item.questions as Array<{ id: string; question: string; answer: string | null; createdAt: string }> ).map(q => (
            <div key={q.id} className="mt-2 space-y-1">
              <div className="flex items-start gap-2">
                <HelpCircle size={10} className="text-[#00aeef] mt-1 flex-shrink-0" />
                <p className="text-[12px] text-[#d4d4d4] leading-snug">{q.question}</p>
              </div>
              {q.answer ? (
                <div
                  className="ml-4 rounded-lg px-3 py-2"
                  style={{ background: 'rgba(0,174,239,0.05)', border: '1px solid rgba(0,174,239,0.1)' }}
                >
                  <p className="text-[10px] font-semibold text-[#00aeef] mb-0.5 uppercase tracking-wide">Vendedor</p>
                  <p className="text-[12px] text-[#c0c0c0] leading-snug">{q.answer}</p>
                </div>
              ) : (
                <p className="ml-4 text-[10px] text-[#3a3a3a] italic">Pendiente de respuesta del vendedor</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Favorite Row ─────────────────────────────────────────────────────────────

function FavoriteRow({
  listing,
  onClick,
  onRemove,
}: {
  listing: DashListing
  onClick?: () => void
  onRemove: (id: string) => void
}) {
  const [removing, setRemoving] = useState(false)
  const price = listing.price ?? listing.priceFrom
  const cover = listing.coverImageUrl ?? listing.images?.[0] ?? null

  async function handleRemove(e: React.MouseEvent) {
    e.stopPropagation()
    setRemoving(true)
    await toggleFavorite(listing.id)
    onRemove(listing.id)
  }

  return (
    <div
      onClick={!removing ? onClick : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick && !removing ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick() } : undefined}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl transition-all duration-200",
        onClick && !removing && "cursor-pointer hover:border-[rgba(239,68,68,0.2)] hover:bg-[rgba(239,68,68,0.02)] active:scale-[0.99]",
      )}
      style={{
        background: 'rgba(13,13,13,0.9)',
        border: '1px solid rgba(255,255,255,0.06)',
        opacity: removing ? 0.5 : 1,
      }}
    >
      <div
        className="relative w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden"
        style={{ background: 'rgba(30,30,30,0.8)', border: '1px solid rgba(255,255,255,0.04)' }}
      >
        {cover ? (
          <MarketplaceImage src={cover} alt={listing.title} fill className="w-full h-full object-cover" sizes="72px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={16} className="text-[#3a3a3a]" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#f2f2f2] truncate">{listing.title}</p>
        <p className="text-[10px] text-[#5a5a5a] mt-0.5">{listing.subcategory ?? listing.category}</p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {price !== undefined && (
          <span className="text-sm font-semibold text-[#ffc107]">${Number(price).toLocaleString()}</span>
        )}
        <button
          onClick={handleRemove}
          disabled={removing}
          className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
          title="Quitar de favoritos"
        >
          {removing
            ? <Loader2 size={11} className="animate-spin text-[#ef4444]" />
            : <Heart size={11} className="text-[#ef4444] fill-[#ef4444]" />
          }
        </button>
      </div>
    </div>
  )
}

// ─── Thread Card ──────────────────────────────────────────────────────────────

function ThreadCard({
  thread,
  currentUserId,
  onOpen,
}: {
  thread: DashThread
  currentUserId: string
  onOpen: () => void
}) {
  const isBuyer = thread.buyerId === currentUserId
  const other = isBuyer ? thread.seller : thread.buyer
  const lastMsg = thread.messages[0]
  const unreadCount = getTxUnreadCount(thread, currentUserId)
  const hasUnread = unreadCount > 0

  return (
    <button
      onClick={onOpen}
      className="w-full text-left rounded-xl p-4 flex gap-3 group transition-all duration-200 hover:border-[rgba(0,174,239,0.25)]"
      style={{
        background: 'rgba(13,13,13,0.9)',
        border: `1px solid ${hasUnread ? 'rgba(0,174,239,0.2)' : 'rgba(255,255,255,0.06)'}`,
        boxShadow: hasUnread ? '0 0 20px rgba(0,174,239,0.08)' : '0 2px 16px rgba(0,0,0,0.4)',
      }}
    >
      <div className="relative flex-shrink-0">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #00aeef 0%, #0050c8 100%)' }}
        >
          {initials(other.displayName)}
        </div>
        {hasUnread && (
          <span
            className="absolute -top-1.5 -right-1.5 min-w-[18px] rounded-full border-2 border-[#0a0a0a] px-1 py-0.5 text-center text-[9px] font-bold"
            style={{ background: '#00aeef', color: '#081018', boxShadow: '0 0 8px rgba(0,174,239,0.8)' }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <p className={cn('text-sm font-medium truncate', hasUnread ? 'text-[#f2f2f2]' : 'text-[#c0c0c0]')}>
            {other.displayName}
          </p>
          {lastMsg && (
            <span className="text-[9px] text-[#5a5a5a] flex-shrink-0 ml-2">
              {fmtTime(lastMsg.createdAt)}
            </span>
          )}
        </div>
        <p className="text-[11px] text-[#5a5a5a] truncate mb-1">
          {other.displayName}{thread.listing?.title ? ` • ${thread.listing.title}` : ''}
        </p>
        {lastMsg ? (
          <p className={cn('text-xs truncate', hasUnread ? 'text-[#a0a0a0] font-medium' : 'text-[#5a5a5a]')}>
            {lastMsg.senderId === currentUserId ? 'Tú: ' : ''}{lastMsg.content}
          </p>
        ) : (
          <p className="text-xs text-[#3a3a3a] italic">Sin mensajes aún</p>
        )}
      </div>

      <ChevronRight size={14} className="text-[#3a3a3a] group-hover:text-[#00aeef] transition-colors flex-shrink-0 self-center" />
    </button>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, title, sub }: {
  icon: LucideIcon
  title: string
  sub: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(0,174,239,0.06)', border: '1px solid rgba(0,174,239,0.12)' }}
      >
        <Icon size={24} className="text-[#2a2a2a]" />
      </div>
      <p className="text-sm font-medium text-[#5a5a5a]">{title}</p>
      <p className="text-xs text-[#3a3a3a] text-center max-w-xs">{sub}</p>
    </div>
  )
}

// ─── Tab Bar ─────────────────────────────────────────────────────────────────

function TabBar({
  active,
  onChange,
  counts,
}: {
  active: Tab
  onChange: (t: Tab) => void
  counts: Record<Tab, number>
}) {
  const tabs: { id: Tab; label: string; icon: LucideIcon }[] = [
    { id: 'my_store',  label: 'Mi Tienda',    icon: Package       },
    { id: 'sales',     label: 'Mis Ventas',   icon: TrendingUp    },
    { id: 'purchases', label: 'Mis Compras',  icon: ShoppingBag   },
    { id: 'messages',  label: 'Mensajes',     icon: MessageSquare },
    { id: 'favorites', label: 'Favoritos',    icon: Heart         },
    { id: 'payouts',   label: 'Cobros',       icon: Wallet        },
  ]

  return (
    <div
      className="grid grid-cols-3 gap-1 rounded-xl p-1 lg:grid-cols-6"
      style={{ background: 'rgba(13,13,13,0.9)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {tabs.map(t => {
        const isActive = active === t.id
        const Icon = t.icon
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className="flex min-h-[48px] min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-all duration-200"
            style={
              isActive
                ? {
                    background: 'linear-gradient(135deg, rgba(0,174,239,0.18) 0%, rgba(0,80,200,0.14) 100%)',
                    border: '1px solid rgba(0,174,239,0.25)',
                    color: '#00aeef',
                    boxShadow: '0 0 16px rgba(0,174,239,0.15)',
                  }
                : { color: '#5a5a5a', border: '1px solid transparent' }
            }
          >
            <Icon size={13} className="shrink-0" />
            <span className="min-w-0 truncate">{t.label}</span>
            {counts[t.id] > 0 && (
              <span
                className={cn(
                  'ml-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold tabular-nums',
                  t.id === 'messages' && !isActive && 'animate-pulse',
                )}
                style={
                  t.id === 'messages' && !isActive
                    ? { background: 'rgba(0,174,239,0.2)', color: '#00aeef', boxShadow: '0 0 8px rgba(0,174,239,0.5)' }
                    : isActive
                      ? { background: 'rgba(0,174,239,0.3)', color: '#00aeef' }
                      : { background: 'rgba(255,255,255,0.06)', color: '#5a5a5a' }
                }
              >
                {counts[t.id] > 99 ? '99+' : counts[t.id]}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── Reputation Header ────────────────────────────────────────────────────────

function ProfileHeader({
  profile,
  purchases,
  sales,
  myListings,
  myFavorites,
  unreadCount,
  onTabClick,
}: {
  profile: DashProfile | null
  purchases: DashTransaction[]
  sales: DashTransaction[]
  myListings: DashListing[]
  myFavorites: DashListing[]
  unreadCount: number
  onTabClick?: (tab: Tab) => void
}) {
  const name = profile?.displayName ?? 'Usuario'
  const totalSales = sales.length
  const totalPurchases = purchases.length
  const rating = profile?.sellerRating ? parseFloat(profile.sellerRating) : 0
  const isNew = totalSales === 0 && totalPurchases === 0
  const role = profile?.role ?? 'USER'

  const roleLabel: Record<string, string> = { USER: 'Miembro', SOCIO: 'Socio', SUPER: 'Admin' }
  const roleColor: Record<string, string> = { USER: '#5a5a5a', SOCIO: '#ffc107', SUPER: '#ef4444' }

  return (
    <div
      className="rounded-2xl p-5 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(13,13,13,0.98) 0%, rgba(0,20,40,0.95) 100%)',
        border: '1px solid rgba(0,174,239,0.12)',
        boxShadow: '0 0 60px rgba(0,174,239,0.06), 0 8px 40px rgba(0,0,0,0.6)',
      }}
    >
      <div
        className="absolute top-0 right-0 w-64 h-32 opacity-10 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #00aeef 0%, transparent 70%)' }}
      />

      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-shrink-0">
          {profile?.avatarUrl ? (
            <MarketplaceImage
              src={profile.avatarUrl}
              alt={name}
              width={56}
              height={56}
              className="w-14 h-14 rounded-2xl object-cover"
              style={{ border: '2px solid rgba(0,174,239,0.3)' }}
            />
          ) : (
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white"
              style={{
                background: 'linear-gradient(135deg, #00aeef 0%, #0050c8 100%)',
                boxShadow: '0 0 24px rgba(0,174,239,0.4)',
              }}
            >
              {initials(name)}
            </div>
          )}
          {profile?.isVerified && (
            <BadgeCheck
              size={18}
              className="absolute -bottom-1.5 -right-1.5 text-[#00aeef]"
              style={{ filter: 'drop-shadow(0 0 6px rgba(0,174,239,0.8))' }}
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2 mb-1">
            <h2 className="text-lg font-bold text-[#f2f2f2]">{name}</h2>
            {profile?.isVerified && (
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide"
                style={{ background: 'rgba(0,174,239,0.12)', border: '1px solid rgba(0,174,239,0.25)', color: '#00aeef' }}
              >
                ✓ VERIFICADO
              </span>
            )}
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: roleColor[role] }}
            >
              {roleLabel[role] ?? role}
            </span>
            {isNew && (
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide"
                style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80' }}
              >
                <Zap size={9} className="inline mr-0.5" />
                USUARIO NUEVO
              </span>
            )}
          </div>
          {profile?.bio && (
            <p className="text-xs text-[#5a5a5a] truncate max-w-xs">{profile.bio}</p>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => onTabClick?.('messages')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl flex-shrink-0 animate-pulse"
            style={{
              background: 'rgba(0,174,239,0.1)',
              border: '1px solid rgba(0,174,239,0.3)',
              boxShadow: '0 0 16px rgba(0,174,239,0.25)',
            }}
            title="Ir a mensajes"
          >
            <MessageSquare size={12} style={{ color: '#00aeef', filter: 'drop-shadow(0 0 4px rgba(0,174,239,0.8))' }} />
            <span
              className="text-xs font-bold tabular-nums"
              style={{ color: '#00aeef', textShadow: '0 0 8px rgba(0,174,239,0.7)' }}
            >
              {unreadCount > 99 ? '99+' : unreadCount} sin leer
            </span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 relative z-10">
        <KpiCard
          icon={TrendingUp}
          label="Publicaciones"
          value={myListings.length.toString()}
          sub={totalSales === 0 ? 'Sin ventas aun' : `${totalSales} operaciones`}
          accent="#4ade80"
          onClick={onTabClick ? () => onTabClick('my_store') : undefined}
        />
        <KpiCard
          icon={ShoppingBag}
          label="Compras"
          value={totalPurchases.toString()}
          sub={totalPurchases === 0 ? 'Sin compras aun' : `${totalPurchases} registradas`}
          accent="#00aeef"
          onClick={onTabClick ? () => onTabClick('purchases') : undefined}
        />
        <KpiCard
          icon={Star}
          label="Calificación"
          value={rating > 0 ? rating.toFixed(1) : '—'}
          sub={rating === 0 ? 'Sin calificaciones aún' : 'Promedio de ventas'}
          accent="#ffc107"
        />
        <KpiCard
          icon={Heart}
          label="Favoritos"
          value={myFavorites.length.toString()}
          sub="Listings guardados"
          accent="#ef4444"
          onClick={onTabClick ? () => onTabClick('favorites') : undefined}
        />
      </div>
    </div>
  )
}

// ─── Chat Overlay ─────────────────────────────────────────────────────────────

function ChatOverlay({
  thread,
  currentUserId,
  currentUserName,
  onClose,
}: {
  thread: DashThread
  currentUserId: string
  currentUserName: string
  onClose: () => void
}) {
  const isBuyer = thread.buyerId === currentUserId
  const other = isBuyer ? thread.seller : thread.buyer

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
    >
      <div className="w-full max-w-lg" style={{ height: 'min(640px, 85vh)' }}>
        <TransactionChat
          threadId={thread.id}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          otherUser={{
            displayName: other.displayName,
            avatarUrl: other.avatarUrl,
          }}
          listingTitle={thread.listing?.title ?? 'Conversación'}
          listingSlug={thread.listing?.slug}
          onClose={onClose}
          className="h-full"
        />
      </div>
    </div>
  )
}

function TransactionDetailModal({
  tx,
  viewAs,
  onClose,
  onOpenMessages,
}: {
  tx: DashTransactionDetail
  viewAs: 'buyer' | 'seller'
  onClose: () => void
  onOpenMessages?: () => void
}) {
  const otherParty = viewAs === 'buyer' ? tx.seller : tx.buyer

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)' }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(11,11,11,0.98)',
          border: '1px solid rgba(0,174,239,0.16)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.85), 0 0 80px rgba(0,174,239,0.06)',
        }}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#1e1e1e] px-6 py-4">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-[#f2f2f2] truncate">
              {tx.listing?.title ?? 'Transaccion marketplace'}
            </h3>
            <p className="mt-1 text-xs text-[#5a5a5a]">
              {viewAs === 'buyer' ? 'Vendedor' : 'Comprador'}: <span className="text-[#a0a0a0]">{otherParty.displayName}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-[#5a5a5a] hover:text-[#f2f2f2] transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <StatusBadge status={tx.status} />
              <span className="text-sm font-semibold text-[#f2f2f2]">
                ${Number(tx.amount).toLocaleString('es-VE')} {tx.currency}
              </span>
            </div>
            <div className="text-xs text-[#5a5a5a]">
              Creada: <span className="text-[#a0a0a0]">{fmtDate(tx.createdAt)}</span>
            </div>
          </div>

          <div
            className="rounded-xl p-4 text-sm leading-relaxed"
            style={{ background: 'rgba(0,174,239,0.06)', border: '1px solid rgba(0,174,239,0.16)', color: '#d0eef9' }}
          >
            {getOperationalStatusCopy(tx.status, viewAs)}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <PayoutDetailRow label="ID transaccion" value={tx.id} />
            <PayoutDetailRow label="Metodo de pago" value={tx.paymentMethod} />
            <PayoutDetailRow label="Referencia" value={tx.paymentReference ?? 'Sin referencia reportada'} />
            <PayoutDetailRow label="Banco emisor" value={tx.paymentSenderBank ?? 'Sin banco reportado'} />
            <PayoutDetailRow label="Fecha de pago" value={tx.paymentPaidAt ? fmtDate(tx.paymentPaidAt) : 'Sin fecha reportada'} />
            <PayoutDetailRow label="Liberacion estimada" value={tx.escrowReleaseAt ? fmtDate(tx.escrowReleaseAt) : 'Aun sin fecha de liberacion'} />
            <PayoutDetailRow label="Siguiente paso" value={getOperationalNextStep(tx.status, viewAs)} />
          </div>

          {tx.adminNotes && (
            <div
              className="rounded-xl p-4 text-sm"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <p className="text-[10px] uppercase tracking-widest text-[#5a5a5a]">Nota interna</p>
              <p className="mt-2 text-[#d4d4d4]">{tx.adminNotes}</p>
            </div>
          )}

          {tx.statusHistory && tx.statusHistory.length > 0 && (
            <div>
              <SectionHeader title="Linea de Estado" count={tx.statusHistory.length} />
              <div className="space-y-2">
                {tx.statusHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-xl p-3"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-[#f2f2f2]">
                        {(entry.fromStatus ?? 'Inicio')} <span className="text-[#5a5a5a]">→</span> {entry.toStatus}
                      </p>
                      <span className="text-[10px] text-[#5a5a5a]">{fmtDate(entry.createdAt)}</span>
                    </div>
                    {entry.reason && <p className="mt-1 text-[11px] text-[#a0a0a0]">{entry.reason}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {tx.listing?.slug && (
              <Link
                href={`/marketplace/${tx.listing.slug}`}
                className="rounded-xl px-4 py-2 text-sm font-semibold"
                style={{ background: 'rgba(255,255,255,0.05)', color: '#f2f2f2', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                Ver listing
              </Link>
            )}
            {onOpenMessages && (
              <button
                onClick={onOpenMessages}
                className="rounded-xl px-4 py-2 text-sm font-semibold"
                style={{ background: 'rgba(0,174,239,0.12)', color: '#00aeef', border: '1px solid rgba(0,174,239,0.2)' }}
              >
                Ir a mensajes
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function CopyValueButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      // noop
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold transition-all"
      style={
        copied
          ? { background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.22)' }
          : { background: 'rgba(0,174,239,0.08)', color: '#00aeef', border: '1px solid rgba(0,174,239,0.18)' }
      }
    >
      {copied ? <Check size={10} /> : <Copy size={10} />}
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  )
}

function PayoutDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="min-w-0 rounded-xl px-3 py-2.5"
      style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.055)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-normal text-[#6f6f6f]">{label}</p>
          <p className="mt-1 text-[12px] leading-snug text-[#f2f2f2] [overflow-wrap:anywhere]">{value}</p>
        </div>
        <CopyValueButton value={value} />
      </div>
    </div>
  )
}

function PayoutMethodCard({
  method,
  onSetDefault,
  onRemove,
  busyId,
}: {
  method: DashPayoutMethod
  onSetDefault: (methodId: string) => void
  onRemove: (methodId: string) => void
  busyId: string | null
}) {
  const details = parsePayoutDetails(method.encryptedData)
  const entries = Object.entries(details).filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
  const isBusy = busyId === method.id

  return (
    <div
      className="rounded-2xl p-5 space-y-4"
      style={{
        background: 'linear-gradient(180deg, rgba(17,17,17,0.96) 0%, rgba(10,10,10,0.96) 100%)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 16px 38px rgba(0,0,0,0.32)',
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-[#f2f2f2]">{payoutMethodLabel(method.methodType)}</p>
            {method.isDefault && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}
              >
                Predeterminado
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-[#7a7a7a] [overflow-wrap:anywhere]">{method.displayLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!method.isDefault && (
            <button
              onClick={() => onSetDefault(method.id)}
              disabled={isBusy}
              className="rounded-xl px-3 py-2 text-[11px] font-semibold transition-all disabled:opacity-50"
              style={{ background: 'rgba(0,174,239,0.08)', color: '#00aeef', border: '1px solid rgba(0,174,239,0.18)' }}
            >
              Usar por defecto
            </button>
          )}
          <button
            onClick={() => onRemove(method.id)}
            disabled={isBusy}
            className="rounded-xl px-3 py-2 text-[11px] font-semibold transition-all disabled:opacity-50"
            style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.18)' }}
          >
            Eliminar
          </button>
        </div>
      </div>

      <div
        className="grid gap-2 pt-3 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]"
        style={{ borderTop: '1px solid rgba(255,255,255,0.055)' }}
      >
        {entries.length > 0 ? (
          entries.map(([label, value]) => (
            <PayoutDetailRow key={label} label={label} value={value} />
          ))
        ) : (
          <p className="text-xs text-[#5a5a5a]">Sin detalles visibles para este metodo.</p>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface DashboardClientProps {
  session: MpSessionPayload
  profile: object | null
  purchases: object[]
  sales: object[]
  threads: object[]
  myListings: object[]
  myFavorites: object[]
  myInteracted: object[]
  payoutMethods: object[]
  initialTab?: Tab
}

export function DashboardClient({
  session,
  profile: rawProfile,
  purchases: rawPurchases,
  sales: rawSales,
  threads: rawThreads,
  myListings: rawMyListings,
  myFavorites: rawMyFavorites,
  myInteracted: rawMyInteracted,
  payoutMethods: rawPayoutMethods,
  initialTab,
}: DashboardClientProps) {
  const router = useRouter()

  const profile = rawProfile as DashProfile | null
  const purchases = rawPurchases as DashTransaction[]
  const sales = rawSales as DashTransaction[]
  const initialThreads = rawThreads as DashThread[]
  const myListings = rawMyListings as DashListing[]
  const initialPayoutMethods = rawPayoutMethods as DashPayoutMethod[]

  const [activeTab, setActiveTab] = useState<Tab>(initialTab ?? 'my_store')
  const [openThread, setOpenThread] = useState<DashThread | null>(null)
  const [selectedTx, setSelectedTx] = useState<{ tx: DashTransaction; viewAs: 'buyer' | 'seller' } | null>(null)
  const [selectedTxDetail, setSelectedTxDetail] = useState<DashTransactionDetail | null>(null)
  const [selectedTxLoading, setSelectedTxLoading] = useState(false)
  const [disputeTarget, setDisputeTarget] = useState<DashTransaction | null>(null)
  const [disputedTxIds, setDisputedTxIds] = useState<Set<string>>(new Set())
  const [favorites, setFavorites] = useState<DashListing[]>(rawMyFavorites as DashListing[])
  const myInteracted = rawMyInteracted as DashInteracted[]
  const [threads, setThreads] = useState<DashThread[]>(initialThreads)
  const [payoutMethods, setPayoutMethods] = useState<DashPayoutMethod[]>(initialPayoutMethods)
  const [payoutBusyId, setPayoutBusyId] = useState<string | null>(null)
  const [payoutMessage, setPayoutMessage] = useState<string | null>(null)
  const [payoutSubmitting, setPayoutSubmitting] = useState(false)
  const [payoutForm, setPayoutForm] = useState({
    methodType: 'PAGO_MOVIL',
    displayLabel: '',
    currency: 'VES',
    holder: '',
    identifier: '',
    phone: '',
    bank: '',
    accountNumber: '',
    payId: '',
    username: '',
    wallet: '',
  })

  const initialUnread = initialThreads.reduce((sum, thread) => sum + getTxUnreadCount(thread, session.userId), 0)
  const [unreadCount, setUnreadCount] = useState(initialUnread)

  useEffect(() => {
    const id = setInterval(() => {
      getUnreadCount().then(r => { if (r.success && r.data) setUnreadCount(r.data.count) })
      getMyThreads().then((result) => {
        if (result.success && result.data) {
          setThreads(result.data as DashThread[])
        }
      })
    }, 20_000)
    return () => clearInterval(id)
  }, [])

  const unreadThreads = threads.filter((thread) => getTxUnreadCount(thread, session.userId) > 0)
  const readThreads = threads.filter(t => !unreadThreads.some(unreadThread => unreadThread.id === t.id))

  const pendingValidationSales = sales.filter(tx => ['PAYMENT_RECEIVED', 'VALIDATING'].includes(tx.status))
  const escrowSales = sales.filter(tx => ['IN_ESCROW', 'DELIVERY_CONFIRMED'].includes(tx.status))
  const releasedSales = sales.filter(tx => tx.status === 'RELEASED')
  const payoutRelevantSales = sales.filter(tx => ['IN_ESCROW', 'DELIVERY_CONFIRMED', 'RELEASED'].includes(tx.status))
  const payoutReadySales = sales.filter(tx => tx.status === 'RELEASED')
  const operationalSold = payoutRelevantSales.reduce((sum, tx) => sum + Number(tx.amount ?? 0), 0)
  const operationalBankFees = payoutRelevantSales.reduce((sum, tx) => sum + (tx.paymentMethod === 'MERCANTIL_PAGO_MOVIL' ? getTxExtraFee(tx) : 0), 0)
  const operationalBinanceFees = payoutRelevantSales.reduce((sum, tx) => sum + (tx.paymentMethod === 'CRYPTO_WALLET_MANUAL' ? getTxExtraFee(tx) : 0), 0)
  const operationalCommissions = payoutRelevantSales.reduce((sum, tx) => sum + getTxBasePlatformFee(tx), 0)
  const operationalTotalFees = payoutRelevantSales.reduce((sum, tx) => sum + getTxTotalFee(tx), 0)
  const operationalSellerNet = payoutRelevantSales.reduce((sum, tx) => sum + Number(tx.sellerNetAmount ?? 0), 0)
  const payoutReadyNet = payoutReadySales.reduce((sum, tx) => sum + Number(tx.sellerNetAmount ?? 0), 0)
  const sellerNeedsPayoutProfile = profile?.isSeller && payoutMethods.length === 0 && payoutRelevantSales.length > 0
  const sellerHasCommissionExemption = profile?.role === 'SOCIO' || profile?.role === 'SUPER'
  const commissionLabel = sellerHasCommissionExemption ? 'Comision plataforma' : 'Comision 5%'
  const commissionSub = sellerHasCommissionExemption ? 'exenta por rol actual' : 'base plataforma'
  const commissionCopy = sellerHasCommissionExemption
    ? 'Comision base plataforma: exenta por rol actual. Comision adicional pago movil / transferencia: 0.03%. Comision adicional Binance: $0.06.'
    : 'Comision base plataforma: 5%. Comision adicional pago movil / transferencia: 0.03%. Comision adicional Binance: $0.06.'

  const counts: Record<Tab, number> = {
    my_store:  myListings.length,
    sales:     sales.length,
    purchases: purchases.length,
    messages:  unreadCount,
    favorites: favorites.length,
    payouts:   payoutRelevantSales.length,
  }

  function handleTabChange(tab: Tab) {
    setActiveTab(tab)
    router.replace(`/marketplace/dashboard?tab=${tab}`, { scroll: false })
  }

  async function handleOpenTransaction(tx: DashTransaction, viewAs: 'buyer' | 'seller') {
    setSelectedTx({ tx, viewAs })
    setSelectedTxDetail(null)
    setSelectedTxLoading(true)
    const result = await getTransaction(tx.id)
    if (result.success && result.data) {
      setSelectedTxDetail(result.data as DashTransactionDetail)
    }
    setSelectedTxLoading(false)
  }

  function handleOpenThread(thread: DashThread) {
    const unreadForThread = getTxUnreadCount(thread, session.userId)
    if (unreadForThread > 0) {
      setUnreadCount((prev) => Math.max(prev - unreadForThread, 0))
    }
    setThreads((prev) =>
      prev.map((currentThread) =>
        currentThread.id === thread.id
          ? {
              ...currentThread,
              unreadCount: 0,
              messages: currentThread.messages.map((message, index) =>
                index === 0 && message.senderId !== session.userId
                  ? { ...message, isRead: true }
                  : message,
              ),
            }
          : currentThread,
      ),
    )
    setOpenThread(thread)
  }

  function updatePayoutField(field: keyof typeof payoutForm, value: string) {
    setPayoutForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleAddPayoutMethod() {
    const normalizedType = payoutForm.methodType
    const methodCurrency = normalizedType === 'BINANCE_PAY' ? 'USD' : 'VES'

    const detailPayload =
      normalizedType === 'PAGO_MOVIL'
        ? { titular: payoutForm.holder, cedula: payoutForm.identifier, telefono: payoutForm.phone, banco: payoutForm.bank }
        : normalizedType === 'BANK_TRANSFER'
          ? { beneficiario: payoutForm.holder, cedula: payoutForm.identifier, cuenta: payoutForm.accountNumber, banco: payoutForm.bank }
          : normalizedType === 'BINANCE_PAY'
            ? { pay_id: payoutForm.payId, usuario: payoutForm.username }
            : { wallet: payoutForm.wallet }

    const detailsAreValid = Object.values(detailPayload).every(value => value.trim().length > 0)
    if (!payoutForm.displayLabel.trim() || !detailsAreValid) {
      setPayoutMessage('Completa la etiqueta y todos los datos del metodo.')
      return
    }

    setPayoutSubmitting(true)
    setPayoutMessage(null)

    const result = await addPayoutMethod({
      methodType: normalizedType,
      displayLabel: payoutForm.displayLabel.trim(),
      encryptedData: JSON.stringify(detailPayload),
      currency: methodCurrency,
      isDefault: payoutMethods.length === 0,
    })

    if (result.success && result.data) {
      const createdMethod: DashPayoutMethod = {
        id: result.data.id,
        methodType: normalizedType,
        displayLabel: payoutForm.displayLabel.trim(),
        encryptedData: JSON.stringify(detailPayload),
        currency: methodCurrency,
        isDefault: payoutMethods.length === 0,
        createdAt: new Date().toISOString(),
      }
      setPayoutMethods(prev => [createdMethod, ...prev.map(method => ({ ...method, isDefault: createdMethod.isDefault ? false : method.isDefault }))])
      setPayoutForm({
        methodType: 'PAGO_MOVIL',
        displayLabel: '',
        currency: 'VES',
        holder: '',
        identifier: '',
        phone: '',
        bank: '',
        accountNumber: '',
        payId: '',
        username: '',
        wallet: '',
      })
      setPayoutMessage('Metodo de cobro guardado.')
    } else {
      setPayoutMessage(result.message)
    }

    setPayoutSubmitting(false)
  }

  async function handleSetDefaultPayout(methodId: string) {
    setPayoutBusyId(methodId)
    setPayoutMessage(null)
    const result = await setDefaultPayoutMethod(methodId)
    if (result.success) {
      setPayoutMethods(prev => prev.map(method => ({ ...method, isDefault: method.id === methodId })))
      setPayoutMessage('Metodo predeterminado actualizado.')
    } else {
      setPayoutMessage(result.message)
    }
    setPayoutBusyId(null)
  }

  async function handleRemovePayout(methodId: string) {
    setPayoutBusyId(methodId)
    setPayoutMessage(null)
    const result = await removePayoutMethod(methodId)
    if (result.success) {
      setPayoutMethods(prev => prev.filter(method => method.id !== methodId))
      setPayoutMessage('Metodo eliminado.')
    } else {
      setPayoutMessage(result.message)
    }
    setPayoutBusyId(null)
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: 'radial-gradient(ellipse at top, rgba(0,20,40,0.5) 0%, #0a0a0a 60%)' }}
    >
      {/* Top bar */}
      <div
        className="sticky top-0 z-40 flex items-center gap-4 px-4 sm:px-6 py-3"
        style={{
          background: 'rgba(8,8,8,0.95)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <Link
          href="/marketplace"
          className="flex items-center gap-2 text-[#5a5a5a] hover:text-[#f2f2f2] transition-colors"
        >
          <ArrowLeft size={16} />
          <span className="text-xs hidden sm:inline">Marketplace</span>
        </Link>

        <div className="flex-1 flex items-center gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: '#4ade80', boxShadow: '0 0 8px rgba(74,222,128,0.8)' }}
          />
          <span
            className="text-[11px] font-bold tracking-[0.15em] uppercase"
            style={{ color: '#00aeef' }}
          >
            Market Command Center
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-[#5a5a5a]">
          <Activity size={10} className="text-[#4ade80]" />
          <span>
            {new Date().toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Profile + KPIs */}
        <ProfileHeader
          profile={profile}
          purchases={purchases}
          sales={sales}
          myListings={myListings}
          myFavorites={favorites}
          unreadCount={unreadCount}
          onTabClick={handleTabChange}
        />

        {/* Tab Navigation */}
        <TabBar active={activeTab} onChange={handleTabChange} counts={counts} />

        {/* Tab Content */}
        <div>

          {/* ─ Mi Tienda ─ */}
          {activeTab === 'my_store' && (
            <div className="space-y-4">
              {/* Preguntas por Responder */}
              {(() => {
                const withUnanswered = myListings.filter((l: DashListing) =>
                  Array.isArray(l.questions) &&
                  l.questions.some((q: { answer: string | null }) => !q.answer),
                )
                if (withUnanswered.length === 0) return null
                const totalUnanswered = withUnanswered.reduce(
                  (acc: number, l: DashListing) =>
                    acc + (l.questions as Array<{ answer: string | null }>).filter(q => !q.answer).length,
                  0,
                )
                return (
                  <div className="space-y-2">
                    <SectionHeader title="Preguntas por Responder" count={totalUnanswered} />
                    {withUnanswered.map((l: DashListing) => {
                      const unanswered = (l.questions as Array<{ answer: string | null }>).filter(q => !q.answer).length
                      return (
                        <div
                          key={l.id}
                          className="flex items-center gap-3 p-3 rounded-xl"
                          style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.18)' }}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#f2f2f2] truncate">{l.title}</p>
                            <p className="text-[10px] text-[#f59e0b] mt-0.5">
                              {unanswered} pregunta{unanswered !== 1 ? 's' : ''} sin responder
                            </p>
                          </div>
                          <button
                            onClick={() => router.push(`/marketplace/${l.slug}`)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all flex-shrink-0"
                            style={{
                              background: 'rgba(245,158,11,0.1)',
                              border: '1px solid rgba(245,158,11,0.25)',
                              color: '#f59e0b',
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(245,158,11,0.18)' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(245,158,11,0.1)' }}
                          >
                            <HelpCircle size={11} /> Responder
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}

              <div className="space-y-2">
                <SectionHeader title="Mis Publicaciones" count={myListings.length} />
                {myListings.length === 0 ? (
                  <EmptyState
                    icon={Package}
                    title="Sin publicaciones"
                    sub="Publica tu primer listing desde el Marketplace para comenzar a vender."
                  />
                ) : (
                  <>
                    {myListings.map((l: DashListing) => (
                      <MyListingRow
                        key={l.id}
                        listing={l}
                        onClick={() => router.push(`/marketplace/${l.slug}`)}
                      />
                    ))}
                  </>
                )}
              </div>
            </div>
          )}

          {/* ─ Mis Ventas ─ */}
          {activeTab === 'sales' && (
            <div className="space-y-3">
              {sellerNeedsPayoutProfile && (
                <div
                  className="rounded-2xl p-4"
                  style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#f2f2f2]">Completa tus datos de cobro para poder recibir la liberacion del escrow</p>
                      <p className="mt-1 text-xs text-[#a0a0a0]">
                        Ya tienes transacciones en escrow o payout pendiente. Sin este paso no se puede completar el pago al vendedor.
                      </p>
                    </div>
                    <button
                      onClick={() => handleTabChange('payouts')}
                      className="rounded-xl px-3 py-2 text-[11px] font-semibold"
                      style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}
                    >
                      Configurar cobro
                    </button>
                  </div>
                </div>
              )}

              <SectionHeader title="Mis ventas" count={sales.length} />
              {sales.length === 0 ? (
                <EmptyState
                  icon={TrendingUp}
                  title="Sin transacciones activas"
                  sub="Cuando un comprador inicie una transacción en tus listings aparecerá aquí."
                />
              ) : (
                <div className="space-y-3">
                  {sales.map(tx => {
                    const effectiveTx = disputedTxIds.has(tx.id) ? { ...tx, status: 'DISPUTED' } : tx
                    const payoutMissingForTx =
                      payoutMethods.length === 0 &&
                      ['IN_ESCROW', 'DELIVERY_CONFIRMED', 'RELEASED'].includes(effectiveTx.status)
                    return (
                      <TxCard
                        key={tx.id}
                        tx={effectiveTx}
                        viewAs="seller"
                        onOpenDetails={(currentTx) => void handleOpenTransaction(currentTx, 'seller')}
                        onDispute={effectiveTx.status === 'IN_ESCROW' ? setDisputeTarget : undefined}
                        payoutMissing={payoutMissingForTx}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─ Mis Compras ─ */}
          {activeTab === 'purchases' && (
            <div className="space-y-3">
              <SectionHeader title="Mis compras" count={purchases.length} />
              {purchases.length === 0 ? (
                <EmptyState
                  icon={ShoppingBag}
                  title="Sin compras activas"
                  sub="Cuando realices tu primera compra aparecerá aquí con el estado del escrow en tiempo real."
                />
              ) : (
                <div className="space-y-3">
                  {purchases.map(tx => {
                    const effectiveTx = disputedTxIds.has(tx.id) ? { ...tx, status: 'DISPUTED' } : tx
                    return (
                      <TxCard
                        key={tx.id}
                        tx={effectiveTx}
                        viewAs="buyer"
                        onOpenDetails={(currentTx) => void handleOpenTransaction(currentTx, 'buyer')}
                        onDispute={effectiveTx.status === 'IN_ESCROW' ? setDisputeTarget : undefined}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─ Mensajes ─ */}
          {activeTab === 'messages' && (
            <div className="space-y-6">
              <div
                className="rounded-2xl p-4"
                style={{ background: 'rgba(13,13,13,0.9)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-[#f2f2f2]">Centro de mensajes</h3>
                    <p className="mt-1 text-xs text-[#5a5a5a]">
                      {unreadCount > 0
                        ? `${unreadCount} mensaje(s) sin leer en ${unreadThreads.length} conversacion(es).`
                        : 'No tienes mensajes sin leer en este momento.'}
                    </p>
                  </div>
                  {unreadCount > 0 && (
                    <span
                      className="rounded-full px-3 py-1 text-[11px] font-semibold"
                      style={{ background: 'rgba(0,174,239,0.1)', color: '#00aeef', border: '1px solid rgba(0,174,239,0.18)' }}
                    >
                      {unreadCount > 99 ? '99+' : unreadCount} sin leer
                    </span>
                  )}
                </div>
              </div>

              {/* Preguntas por Responder */}
              {(() => {
                const withUnanswered = myListings.filter((l: DashListing) =>
                  Array.isArray(l.questions) &&
                  l.questions.some((q: { answer: string | null }) => !q.answer),
                )
                if (withUnanswered.length === 0) return null
                const totalUnanswered = withUnanswered.reduce(
                  (acc: number, l: DashListing) =>
                    acc + (l.questions as Array<{ answer: string | null }>).filter(q => !q.answer).length,
                  0,
                )
                return (
                  <div className="space-y-2">
                    <SectionHeader title="Preguntas por Responder" count={totalUnanswered} />
                    {withUnanswered.map((l: DashListing) => {
                      const unanswered = (l.questions as Array<{ answer: string | null }>).filter(q => !q.answer).length
                      return (
                        <div
                          key={l.id}
                          className="flex items-center gap-3 p-3 rounded-xl"
                          style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.18)' }}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#f2f2f2] truncate">{l.title}</p>
                            <p className="text-[10px] text-[#f59e0b] mt-0.5">
                              {unanswered} pregunta{unanswered !== 1 ? 's' : ''} sin responder
                            </p>
                          </div>
                          <button
                            onClick={() => router.push(`/marketplace/${l.slug}`)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all flex-shrink-0"
                            style={{
                              background: 'rgba(245,158,11,0.1)',
                              border: '1px solid rgba(245,158,11,0.25)',
                              color: '#f59e0b',
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(245,158,11,0.18)' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(245,158,11,0.1)' }}
                          >
                            <HelpCircle size={11} /> Responder
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}

              {/* Preguntas Abiertas */}
              <div>
                <SectionHeader title="Preguntas Abiertas" count={myInteracted.length} />
                {myInteracted.length === 0 ? (
                  <EmptyState
                    icon={HelpCircle}
                    title="Sin preguntas realizadas"
                    sub="Las preguntas que hagas sobre listings aparecerán aquí con las respuestas de los vendedores."
                  />
                ) : (
                  <div className="space-y-2">
                    {myInteracted.map((item: DashInteracted) => (
                      <InteractedRow key={item.listingId} item={item} />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <SectionHeader title="Chats por Atender" count={unreadThreads.length} />
                {unreadThreads.length === 0 ? (
                  <EmptyState
                    icon={MessageSquare}
                    title="Sin chats pendientes"
                    sub="Cuando entren mensajes nuevos, apareceran primero en esta sección."
                  />
                ) : (
                  <div className="space-y-3">
                    {unreadThreads.map(t => (
                      <ThreadCard
                        key={t.id}
                        thread={t}
                        currentUserId={session.userId}
                        onOpen={() => handleOpenThread(t)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Chats de Negociación */}
              <div>
                <SectionHeader title="Todos los Chats" count={threads.length} />
                {threads.length === 0 ? (
                  <EmptyState
                    icon={MessageSquare}
                    title="Sin conversaciones"
                    sub="Cuando contactes a un vendedor o alguien te escriba, los hilos aparecerán aquí."
                  />
                ) : readThreads.length === 0 ? (
                  <EmptyState
                    icon={MessageSquare}
                    title="Todo lo pendiente ya está arriba"
                    sub="Todas tus conversaciones activas tienen mensajes sin leer o aún no hay chats adicionales."
                  />
                ) : (
                  <div className="space-y-3">
                    {readThreads.map(t => (
                      <ThreadCard
                        key={t.id}
                        thread={t}
                        currentUserId={session.userId}
                        onOpen={() => handleOpenThread(t)}
                      />
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ─ Cobros ─ */}
          {activeTab === 'payouts' && (
            <div className="space-y-6">
              <div
                className="rounded-2xl p-5 sm:p-6"
                style={{
                  background: 'linear-gradient(135deg, rgba(0,174,239,0.08) 0%, rgba(13,13,13,0.96) 52%, rgba(74,222,128,0.045) 100%)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 22px 70px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.04)',
                }}
              >
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.72fr)] lg:items-end">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-normal text-[#00aeef]">Cobros del vendedor</p>
                    <h2 className="mt-2 text-2xl font-semibold leading-tight text-[#f2f2f2]">Estado claro de tus ventas y cobros</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#a0a0a0]">
                      Separamos lo que esta en revision, lo que sigue en aprobacion y el monto que ya esta disponible para cobrar.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {[
                      { label: 'En revision', value: pendingValidationSales.length, color: '#f59e0b' },
                      { label: 'En aprobacion', value: escrowSales.length, color: '#00aeef' },
                      { label: 'Listo para cobrar', value: releasedSales.length, color: '#4ade80' },
                    ].map(item => (
                      <div
                        key={item.label}
                        className="min-w-0 rounded-xl px-3 py-3 text-center"
                        style={{ background: 'rgba(255,255,255,0.035)', border: `1px solid ${item.color}24` }}
                      >
                        <p className="text-2xl font-semibold leading-none text-[#f2f2f2] tabular-nums">{item.value}</p>
                        <p className="mt-2 text-[10px] font-medium leading-tight text-[#8a8a8a]">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <KpiCard icon={CircleDollarSign} label="Ventas realizadas" value={fmtUSD(operationalSold)} sub={`${payoutRelevantSales.length} en proceso o ya aprobadas`} accent="#4ade80" tone="primary" />
                <KpiCard icon={Wallet} label="Ganancia estimada" value={fmtUSD(operationalSellerNet)} sub={`incluye cargos por ${fmtUSD(operationalTotalFees)}`} accent="#00aeef" tone="primary" />
                <KpiCard icon={Landmark} label="Disponible para cobrar" value={fmtUSD(payoutReadyNet)} sub={`${releasedSales.length} venta${releasedSales.length !== 1 ? 's' : ''} lista${releasedSales.length !== 1 ? 's' : ''}`} accent="#a78bfa" tone="primary" />
              </div>

              <div
                className="rounded-2xl p-5"
                style={{ background: 'rgba(13,13,13,0.72)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-[#f2f2f2]">Desglose de comisiones y cargos</h3>
                    <p className="mt-1 text-xs text-[#6f6f6f]">Detalle separado del monto principal para que la lectura financiera sea directa.</p>
                  </div>
                  <p className="text-xs font-semibold text-[#a0a0a0]">Total cargos: <span className="text-[#f2f2f2]">{fmtUSD(operationalTotalFees)}</span></p>
                </div>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                  <KpiCard icon={CreditCard} label={commissionLabel} value={fmtUSD(operationalCommissions)} sub={commissionSub} accent="#f59e0b" tone="compact" />
                  <KpiCard icon={Landmark} label="Cargo bancario 0.03%" value={fmtUSD(operationalBankFees)} sub="pago movil / transferencia" accent="#ffc107" tone="compact" />
                  <KpiCard icon={Wallet} label="Cargo Binance" value={fmtUSD(operationalBinanceFees)} sub="$0.06 por operacion" accent="#00aeef" tone="compact" />
                </div>
              </div>

              <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.6fr)]">
                <div
                  className="rounded-2xl p-5 space-y-5"
                  style={{
                    background: 'linear-gradient(180deg, rgba(16,16,16,0.94) 0%, rgba(10,10,10,0.94) 100%)',
                    border: '1px solid rgba(255,255,255,0.065)',
                    boxShadow: '0 18px 44px rgba(0,0,0,0.3)',
                  }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-[#f2f2f2]">Datos de cobro del vendedor</h3>
                      <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#8a8a8a]">
                        Tu ganancia estimada incluye ventas en proceso y ventas ya aprobadas; solo lo disponible para cobrar puede pagarse ahora.
                      </p>
                    </div>
                    <span
                      className="rounded-full px-2 py-1 text-[10px] font-semibold"
                      style={{ background: 'rgba(0,174,239,0.08)', color: '#00aeef', border: '1px solid rgba(0,174,239,0.15)' }}
                    >
                      Pago manual
                    </span>
                  </div>

                  {payoutMessage && (
                    <div
                      className="rounded-xl px-3 py-2 text-xs"
                      style={{ background: 'rgba(0,174,239,0.06)', color: '#00aeef', border: '1px solid rgba(0,174,239,0.14)' }}
                    >
                      {payoutMessage}
                    </div>
                  )}

                  {sellerNeedsPayoutProfile ? (
                    <>
                      <div
                        className="rounded-xl p-3 text-xs leading-relaxed"
                        style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)', color: '#f5d08a' }}
                      >
                        Completa tus datos de cobro para poder recibir la liberacion del escrow. Ya tienes transacciones operativas que dependen de este paso.
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {[
                          { id: 'PAGO_MOVIL', label: 'Pago movil' },
                          { id: 'BANK_TRANSFER', label: 'Transferencia bancaria' },
                          { id: 'BINANCE_PAY', label: 'Binance Pay' },
                        ].map(option => (
                          <button
                            key={option.id}
                            onClick={() => updatePayoutField('methodType', option.id)}
                            className="rounded-xl px-3 py-3 text-sm font-semibold transition-all"
                            style={
                              payoutForm.methodType === option.id
                                ? { background: 'rgba(0,174,239,0.12)', color: '#00aeef', border: '1px solid rgba(0,174,239,0.25)' }
                                : { background: 'rgba(255,255,255,0.03)', color: '#a0a0a0', border: '1px solid rgba(255,255,255,0.08)' }
                            }
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5 sm:col-span-2">
                          <label className="text-xs text-[#a0a0a0]">Etiqueta interna</label>
                          <input
                            value={payoutForm.displayLabel}
                            onChange={e => updatePayoutField('displayLabel', e.target.value)}
                            placeholder="Ej. Cobro principal"
                            className="w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(20,20,20,0.8)] px-4 py-3 text-sm text-[#f2f2f2] outline-none"
                          />
                        </div>

                        {(payoutForm.methodType === 'PAGO_MOVIL' || payoutForm.methodType === 'BANK_TRANSFER') && (
                          <>
                            <div className="space-y-1.5">
                              <label className="text-xs text-[#a0a0a0]">Titular / beneficiario</label>
                              <input value={payoutForm.holder} onChange={e => updatePayoutField('holder', e.target.value)} className="w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(20,20,20,0.8)] px-4 py-3 text-sm text-[#f2f2f2] outline-none" />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs text-[#a0a0a0]">Cedula / RIF</label>
                              <input value={payoutForm.identifier} onChange={e => updatePayoutField('identifier', e.target.value)} className="w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(20,20,20,0.8)] px-4 py-3 text-sm text-[#f2f2f2] outline-none" />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs text-[#a0a0a0]">Banco</label>
                              <input value={payoutForm.bank} onChange={e => updatePayoutField('bank', e.target.value)} className="w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(20,20,20,0.8)] px-4 py-3 text-sm text-[#f2f2f2] outline-none" />
                            </div>
                            {payoutForm.methodType === 'PAGO_MOVIL' ? (
                              <div className="space-y-1.5">
                                <label className="text-xs text-[#a0a0a0]">Telefono</label>
                                <input value={payoutForm.phone} onChange={e => updatePayoutField('phone', e.target.value)} className="w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(20,20,20,0.8)] px-4 py-3 text-sm text-[#f2f2f2] outline-none" />
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                <label className="text-xs text-[#a0a0a0]">Cuenta bancaria</label>
                                <input value={payoutForm.accountNumber} onChange={e => updatePayoutField('accountNumber', e.target.value)} className="w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(20,20,20,0.8)] px-4 py-3 text-sm text-[#f2f2f2] outline-none" />
                              </div>
                            )}
                          </>
                        )}

                        {payoutForm.methodType === 'BINANCE_PAY' && (
                          <>
                            <div className="space-y-1.5">
                              <label className="text-xs text-[#a0a0a0]">Pay ID</label>
                              <input value={payoutForm.payId} onChange={e => updatePayoutField('payId', e.target.value)} className="w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(20,20,20,0.8)] px-4 py-3 text-sm text-[#f2f2f2] outline-none" />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs text-[#a0a0a0]">Usuario</label>
                              <input value={payoutForm.username} onChange={e => updatePayoutField('username', e.target.value)} className="w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(20,20,20,0.8)] px-4 py-3 text-sm text-[#f2f2f2] outline-none" />
                            </div>
                          </>
                        )}
                      </div>

                      <div
                        className="rounded-xl p-3 text-xs leading-relaxed"
                        style={{ background: 'rgba(0,174,239,0.04)', border: '1px solid rgba(0,174,239,0.1)', color: '#a0a0a0' }}
                      >
                        {commissionCopy} Neto operativo acumulado: <span className="text-[#f2f2f2]">{fmtUSD(operationalSellerNet)}</span>. Total listo para recibir hoy: <span className="text-[#f2f2f2]">{fmtUSD(payoutReadyNet)}</span>.
                      </div>

                      <button
                        onClick={handleAddPayoutMethod}
                        disabled={payoutSubmitting}
                        className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, rgba(0,174,239,0.9) 0%, rgba(0,80,200,0.88) 100%)', color: '#fff' }}
                      >
                        {payoutSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        Guardar metodo de cobro
                      </button>
                    </>
                  ) : payoutMethods.length === 0 ? (
                    <div
                      className="rounded-xl p-4 text-sm"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#a0a0a0' }}
                    >
                      Aun no necesitas registrar datos de cobro. Esta solicitud aparecera cuando una transaccion entre en escrow activo o quede lista para payout.
                    </div>
                  ) : (
                    <div
                      className="rounded-xl p-3 text-xs leading-relaxed"
                      style={{ background: 'rgba(0,174,239,0.04)', border: '1px solid rgba(0,174,239,0.1)', color: '#a0a0a0' }}
                    >
                      Tus datos de cobro ya estan configurados. El equipo operativo los usara solo cuando una venta quede RELEASED y lista para payout manual.
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div
                    className="rounded-2xl p-4"
                    style={{ background: 'rgba(13,13,13,0.9)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <h3 className="text-sm font-semibold text-[#f2f2f2]">Resumen operativo</h3>
                    <div className="mt-3 space-y-3 text-xs">
                      <div className="flex items-center justify-between text-[#a0a0a0]">
                        <span>Validaciones pendientes</span>
                        <span className="text-[#f2f2f2]">{pendingValidationSales.length}</span>
                      </div>
                      <div className="flex items-center justify-between text-[#a0a0a0]">
                        <span>Escrow activo</span>
                        <span className="text-[#f2f2f2]">{escrowSales.length}</span>
                      </div>
                      <div className="flex items-center justify-between text-[#a0a0a0]">
                        <span>Listos para payout</span>
                        <span className="text-[#f2f2f2]">{releasedSales.length}</span>
                      </div>
                      <div className="flex items-center justify-between text-[#a0a0a0]">
                        <span>Total a recibir</span>
                        <span className="font-semibold text-[#00aeef]">{fmtUSD(payoutReadyNet)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <SectionHeader title="Metodos registrados" count={payoutMethods.length} />
                    {payoutMethods.length === 0 ? (
                      <EmptyState
                        icon={Wallet}
                        title="Sin datos de cobro"
                        sub="Registra un metodo para poder recibir los fondos liberados del escrow."
                      />
                    ) : (
                      payoutMethods.map(method => (
                        <PayoutMethodCard
                          key={method.id}
                          method={method}
                          onSetDefault={handleSetDefaultPayout}
                          onRemove={handleRemovePayout}
                          busyId={payoutBusyId}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'favorites' && (
            <div className="space-y-3">
              {favorites.length === 0 ? (
                <EmptyState
                  icon={Heart}
                  title="Sin favoritos aún"
                  sub="Guarda listings que te interesen desde el Marketplace para acceder rápido a ellos."
                />
              ) : (
                <>
                  <p className="text-[10px] text-[#3a3a3a] text-center pb-1">
                    {favorites.length} listing{favorites.length !== 1 ? 's' : ''} guardado{favorites.length !== 1 ? 's' : ''}
                  </p>
                  {favorites.map((l: DashListing) => (
                    <FavoriteRow
                      key={l.id}
                      listing={l}
                      onClick={() => l.slug ? router.push(`/marketplace/${l.slug}`) : router.push('/marketplace')}
                      onRemove={id => setFavorites(prev => prev.filter((f: DashListing) => f.id !== id))}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        <div className="h-8" />
      </div>

      {/* Chat Overlay */}
      {openThread && (
        <ChatOverlay
          thread={openThread}
          currentUserId={session.userId}
          currentUserName={session.displayName}
          onClose={() => setOpenThread(null)}
        />
      )}

      {selectedTx && (
        selectedTxLoading || !selectedTxDetail ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)' }}
          >
            <div
              className="rounded-2xl px-5 py-4 flex items-center gap-3"
              style={{ background: 'rgba(13,13,13,0.95)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <Loader2 size={16} className="animate-spin text-[#00aeef]" />
              <span className="text-sm text-[#f2f2f2]">Cargando detalle de transaccion...</span>
            </div>
          </div>
        ) : (
          <TransactionDetailModal
            tx={selectedTxDetail}
            viewAs={selectedTx.viewAs}
            onClose={() => {
              setSelectedTx(null)
              setSelectedTxDetail(null)
            }}
            onOpenMessages={() => {
              setSelectedTx(null)
              setSelectedTxDetail(null)
              handleTabChange('messages')
            }}
          />
        )
      )}

      {/* Dispute Modal */}
      {disputeTarget && (
        <DisputeModal
          tx={disputeTarget}
          onClose={() => setDisputeTarget(null)}
          onSuccess={txId => {
            setDisputedTxIds(prev => new Set(prev).add(txId))
            setDisputeTarget(null)
          }}
        />
      )}
    </div>
  )
}
