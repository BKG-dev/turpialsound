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
import { getUnreadCount } from '@/actions/marketplace/chat'
import { openDispute } from '@/actions/marketplace/transactions'
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
}: {
  icon: LucideIcon
  label: string
  value: string
  sub?: string
  accent?: string
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick() } : undefined}
      className={cn(
        "rounded-2xl p-4 flex flex-col gap-2 relative overflow-hidden",
        onClick && "cursor-pointer transition-all duration-200 hover:ring-1 ring-[#00aeef] hover:brightness-110 active:scale-[0.98]",
      )}
      style={{
        background: 'rgba(13,13,13,0.95)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: `0 0 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)`,
      }}
    >
      <div
        className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-20 blur-2xl"
        style={{ background: accent }}
      />
      <div className="flex items-center gap-2 relative z-10">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: `${accent}20`, border: `1px solid ${accent}30` }}
        >
          <Icon size={14} color={accent} />
        </div>
        <span className="text-[10px] font-semibold text-[#5a5a5a] uppercase tracking-widest">{label}</span>
      </div>
      <div className="relative z-10">
        <p className="text-2xl font-bold text-[#f2f2f2] leading-none">{value}</p>
        {sub && <p className="text-[10px] text-[#5a5a5a] mt-1">{sub}</p>}
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
  payoutMissing = false,
}: {
  tx: DashTransaction
  viewAs: 'buyer' | 'seller'
  onDispute?: (tx: DashTransaction) => void
  payoutMissing?: boolean
}) {
  const otherParty = viewAs === 'buyer' ? tx.seller : tx.buyer
  const cfg = STATUS_CONFIG[tx.status] ?? STATUS_CONFIG.CANCELLED

  return (
    <div
      className="rounded-xl p-4 flex gap-3 group cursor-default transition-all duration-200 hover:border-[rgba(0,174,239,0.2)]"
      style={{
        background: 'rgba(13,13,13,0.9)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 2px 16px rgba(0,0,0,0.4)',
      }}
    >
      <div
        className="w-14 h-14 rounded-lg flex-shrink-0 overflow-hidden"
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
              onClick={() => onDispute(tx)}
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
        className="w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden"
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
          className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden"
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
        className="w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden"
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
  const hasUnread = lastMsg && !lastMsg.isRead && lastMsg.senderId !== currentUserId

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
            className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0a0a0a]"
            style={{ background: '#00aeef', boxShadow: '0 0 8px rgba(0,174,239,0.8)' }}
          />
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
      className="flex gap-1 p-1 rounded-xl"
      style={{ background: 'rgba(13,13,13,0.9)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {tabs.map(t => {
        const isActive = active === t.id
        const Icon = t.icon
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200"
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
            <Icon size={13} />
            <span className="hidden sm:inline">{t.label}</span>
            {counts[t.id] > 0 && (
              <span
                className={cn(
                  'ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold tabular-nums',
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
  const totalSales = profile?.totalSales ?? 0
  const totalPurchases = profile?.totalPurchases ?? 0
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
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl flex-shrink-0 animate-pulse"
            style={{
              background: 'rgba(0,174,239,0.1)',
              border: '1px solid rgba(0,174,239,0.3)',
              boxShadow: '0 0 16px rgba(0,174,239,0.25)',
            }}
          >
            <MessageSquare size={12} style={{ color: '#00aeef', filter: 'drop-shadow(0 0 4px rgba(0,174,239,0.8))' }} />
            <span
              className="text-xs font-bold tabular-nums"
              style={{ color: '#00aeef', textShadow: '0 0 8px rgba(0,174,239,0.7)' }}
            >
              {unreadCount > 99 ? '99+' : unreadCount} sin leer
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 relative z-10">
        <KpiCard
          icon={TrendingUp}
          label="Publicaciones"
          value={myListings.length.toString()}
          sub={totalSales === 0 ? 'Sin ventas aún' : `${totalSales} vendidos`}
          accent="#4ade80"
          onClick={onTabClick ? () => onTabClick('my_store') : undefined}
        />
        <KpiCard
          icon={ShoppingBag}
          label="Compras"
          value={totalPurchases.toString()}
          sub={totalPurchases === 0 ? 'Sin compras aún' : `${purchases.length} activas`}
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
      className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-widest text-[#5a5a5a]">{label}</p>
        <p className="mt-1 truncate text-[12px] text-[#f2f2f2]">{value}</p>
      </div>
      <CopyValueButton value={value} />
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
      className="rounded-2xl p-4 space-y-3"
      style={{ background: 'rgba(13,13,13,0.9)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
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
          <p className="mt-1 text-[11px] text-[#5a5a5a]">{method.displayLabel}</p>
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

      <div className="grid gap-2 sm:grid-cols-2">
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
  const threads = rawThreads as DashThread[]
  const myListings = rawMyListings as DashListing[]
  const initialPayoutMethods = rawPayoutMethods as DashPayoutMethod[]

  const [activeTab, setActiveTab] = useState<Tab>(initialTab ?? 'my_store')
  const [openThread, setOpenThread] = useState<DashThread | null>(null)
  const [disputeTarget, setDisputeTarget] = useState<DashTransaction | null>(null)
  const [disputedTxIds, setDisputedTxIds] = useState<Set<string>>(new Set())
  const [favorites, setFavorites] = useState<DashListing[]>(rawMyFavorites as DashListing[])
  const myInteracted = rawMyInteracted as DashInteracted[]
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

  const initialUnread = threads.filter(t =>
    t.messages[0] && !t.messages[0].isRead && t.messages[0].senderId !== session.userId,
  ).length
  const [unreadCount, setUnreadCount] = useState(initialUnread)

  useEffect(() => {
    const id = setInterval(() => {
      getUnreadCount().then(r => { if (r.success && r.data) setUnreadCount(r.data.count) })
    }, 20_000)
    return () => clearInterval(id)
  }, [])

  const counts: Record<Tab, number> = {
    my_store:  myListings.length,
    sales:     sales.length,
    purchases: purchases.length,
    messages:  unreadCount,
    favorites: favorites.length,
    payouts:   payoutMethods.length,
  }

  const pendingValidationSales = sales.filter(tx => ['PAYMENT_RECEIVED', 'VALIDATING'].includes(tx.status))
  const escrowSales = sales.filter(tx => ['IN_ESCROW', 'DELIVERY_CONFIRMED'].includes(tx.status))
  const releasedSales = sales.filter(tx => tx.status === 'RELEASED')
  const payoutRelevantSales = sales.filter(tx => ['IN_ESCROW', 'DELIVERY_CONFIRMED', 'RELEASED'].includes(tx.status))
  const payoutReadySales = sales.filter(tx => tx.status === 'RELEASED')
  const operationalSold = payoutRelevantSales.reduce((sum, tx) => sum + Number(tx.amount ?? 0), 0)
  const operationalCommissions = payoutRelevantSales.reduce((sum, tx) => sum + Number(tx.platformFeeAmount ?? 0), 0)
  const operationalSellerNet = payoutRelevantSales.reduce((sum, tx) => sum + Number(tx.sellerNetAmount ?? 0), 0)
  const payoutReadyNet = payoutReadySales.reduce((sum, tx) => sum + Number(tx.sellerNetAmount ?? 0), 0)
  const sellerNeedsPayoutProfile = profile?.isSeller && payoutMethods.length === 0 && payoutRelevantSales.length > 0

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
          onTabClick={setActiveTab}
        />

        {/* Tab Navigation */}
        <TabBar active={activeTab} onChange={setActiveTab} counts={counts} />

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
                      onClick={() => setActiveTab('payouts')}
                      className="rounded-xl px-3 py-2 text-[11px] font-semibold"
                      style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}
                    >
                      Configurar cobro
                    </button>
                  </div>
                </div>
              )}

              <SectionHeader title="Transacciones en Escrow" count={sales.length} />
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
              <SectionHeader title="Compras en Escrow" count={purchases.length} />
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

              {/* Preguntas por Responder — same block as my_store, for sellers */}
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

              {/* Chats de Negociación */}
              <div>
                <SectionHeader title="Chats de Negociación" count={threads.length} />
                {threads.length === 0 ? (
                  <EmptyState
                    icon={MessageSquare}
                    title="Sin conversaciones"
                    sub="Cuando contactes a un vendedor o alguien te escriba, los hilos aparecerán aquí."
                  />
                ) : (
                  <div className="space-y-3">
                    {threads.map(t => (
                      <ThreadCard
                        key={t.id}
                        thread={t}
                        currentUserId={session.userId}
                        onOpen={() => setOpenThread(t)}
                      />
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ─ Favoritos ─ */}
          {activeTab === 'payouts' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard icon={CircleDollarSign} label="Total operativo" value={fmtUSD(operationalSold)} sub={`${payoutRelevantSales.length} en escrow o liberadas`} accent="#4ade80" />
                <KpiCard icon={CreditCard} label="Comisiones" value={fmtUSD(operationalCommissions)} sub="solo transacciones payout-relevantes" accent="#f59e0b" />
                <KpiCard icon={Wallet} label="Neto operativo" value={fmtUSD(operationalSellerNet)} sub="escrow activo + payout listo" accent="#00aeef" />
                <KpiCard icon={Landmark} label="Pendiente por pagar" value={fmtUSD(payoutReadyNet)} sub={`${releasedSales.length} liberadas`} accent="#a78bfa" />
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <div
                  className="rounded-2xl p-4 space-y-4"
                  style={{ background: 'rgba(13,13,13,0.9)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-[#f2f2f2]">Datos de cobro del vendedor</h3>
                      <p className="mt-1 text-xs text-[#5a5a5a]">
                        Este flujo se activa solo cuando ya existe escrow activo o payout pendiente.
                      </p>
                    </div>
                    <span
                      className="rounded-full px-2 py-1 text-[10px] font-semibold"
                      style={{ background: 'rgba(0,174,239,0.08)', color: '#00aeef', border: '1px solid rgba(0,174,239,0.15)' }}
                    >
                      Flujo manual temporal
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
                        Comision base plataforma: 5%. Comision adicional pago movil / transferencia: 0.03%. Comision adicional Binance: $0.06. Neto operativo acumulado: <span className="text-[#f2f2f2]">{fmtUSD(operationalSellerNet)}</span>. Total listo para recibir hoy: <span className="text-[#f2f2f2]">{fmtUSD(payoutReadyNet)}</span>.
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
                      Tus datos de cobro ya estan configurados. El equipo operativo los usara cuando corresponda liberar el escrow o reportar el payout manual.
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
                        <span>Payouts listos</span>
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
