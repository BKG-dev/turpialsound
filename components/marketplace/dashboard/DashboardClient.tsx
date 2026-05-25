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
  Plus,
  CreditCard,
  CheckCircle2,
  Send,
  ExternalLink,
  Gift,
  Users,
  Copy,
  Check,
} from 'lucide-react'
import type { MpSessionPayload } from '@/lib/marketplace/auth'
import { TransactionChat } from '@/components/marketplace/TransactionChat'
import { getMyThreads, getUnreadCount } from '@/actions/marketplace/chat'
import { confirmDelivery, getTransaction, openDispute, sellerDeliver } from '@/actions/marketplace/transactions'
import { toggleFavorite } from '@/actions/marketplace/favorites'
import {
  calculateSellerPayout,
  roundMoney,
  txPayoutDisplay,
  type BuyerPaymentMethod,
  type FrozenRatePayload,
  type SellerPayoutMethod,
  type TxPayoutDisplay,
} from '@/lib/marketplace/finance'
import { REFERRAL_COMMISSION_RATE, REFERRAL_COMMISSION_PERCENT } from '@/lib/marketplace/fees'
import {
  addPayoutMethod,
  removePayoutMethod,
  setDefaultPayoutMethod,
} from '@/actions/marketplace/users'
import { cn } from '@/lib/utils'
import { MarketplaceImage } from '@/components/marketplace/MarketplaceImage'
import { MarketplaceThemeToggle } from '@/components/marketplace/MarketplaceTheme'
import { OperationNextStepCard } from '@/components/marketplace/dashboard/OperationNextStepCard'
import { VENEZUELAN_BANK_OPTIONS } from '@/lib/marketplace/venezuelan-banks'
import { normalizeVenezuelanMobilePhone } from '@/lib/marketplace/venezuelan-phone'
import {
  MARKETPLACE_TERMINAL_STATUSES,
  MARKETPLACE_TIMELINE_MILESTONES,
  deriveMarketplaceNextActionState,
  deriveMarketplaceOperationCardState,
  getBuyerCtaLabel as getBuyerCtaLabelFromMapper,
  getMarketplaceTimelineState,
  hasSellerDeliveryAudit as hasSellerDeliveryAuditFromMapper,
  hasSellerPayoutSentAudit as hasSellerPayoutSentAuditFromMapper,
} from '@/lib/marketplace/next-action-mapper'

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
  frozenRate?: number | string | null
  frozenRateSource?: string | null
  frozenRateFechaValor?: string | Date | null
  rateSnapshotId?: string | null
  hasSellerPayoutSent?: boolean
  statusHistory?: DashTransactionHistory[]
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
  releasedAt?: string | Date | null
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

type ActionPriority = 'required' | 'review' | 'pending' | 'closed'

interface ActionItem {
  key: string
  tx: DashTransaction
  viewAs: 'buyer' | 'seller'
  priority: ActionPriority
  chipLabel: string
  description: string
  ctaLabel: string | null
  ctaType: 'view-detail' | 'confirm-delivery' | 'seller-deliver' | 'open-messages' | 'payout-setup' | null
  disabled: boolean
  accent: string
}

// ─── Tab Type ─────────────────────────────────────────────────────────────────

type Tab = 'my_store' | 'sales' | 'purchases' | 'messages' | 'favorites' | 'payouts' | 'referrals'
type ChatSyncReason = 'message_sent' | 'messages_read' | 'send_error' | 'refresh_error'

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; glow: string }> = {
  INITIATED:           { label: 'Iniciado',          color: '#60a5fa', bg: 'rgba(59,130,246,0.1)',  glow: 'rgba(59,130,246,0.25)'  },
  PENDING_PAYMENT:     { label: 'Pago Pendiente',    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  glow: 'rgba(245,158,11,0.25)'  },
  PAYMENT_RECEIVED:    { label: 'Pago Recibido',     color: '#eab308', bg: 'rgba(234,179,8,0.1)',   glow: 'rgba(234,179,8,0.25)'   },
  VALIDATING:          { label: 'Validando',         color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', glow: 'rgba(167,139,250,0.25)' },
  IN_ESCROW:           { label: 'Esperando conformidad', color: '#00aeef', bg: 'rgba(0,174,239,0.1)',   glow: 'rgba(0,174,239,0.25)'   },
  DELIVERY_CONFIRMED:  { label: 'Recepcion confirmada', color: '#34d399', bg: 'rgba(52,211,153,0.1)',  glow: 'rgba(52,211,153,0.25)'  },
  RELEASED:            { label: 'Fondos liberados', color: '#4ade80', bg: 'rgba(74,222,128,0.1)',  glow: 'rgba(74,222,128,0.25)'  },
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

function StatusBadge({ status, label }: { status: string; label?: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.CANCELLED
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.glow}` }}
    >
      {label ?? cfg.label}
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

function fmtUSDT(n: number) {
  return `${n.toFixed(2)} USDT`
}

function fmtBS(n: number) {
  if (!Number.isFinite(n)) return 'Bs -'
  return `Bs ${n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtShortDate(d: string | Date | null) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: '2-digit' })
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
    CRYPTO_WALLET: 'Binance Pay / wallet crypto',
    CRYPTO_WALLET_MANUAL: 'Binance Pay',
  }

  return labels[methodType] ?? methodType
}

function normalizePayoutMethodType(methodType: string) {
  return methodType === 'BINANCE_PAY' ? 'CRYPTO_WALLET' : methodType
}

function getTxUnreadCount(thread: DashThread, currentUserId: string) {
  if (typeof thread.unreadCount === 'number') return thread.unreadCount
  const lastMsg = thread.messages[0]
  return lastMsg && !lastMsg.isRead && lastMsg.senderId !== currentUserId ? 1 : 0
}

function hasSellerDeliveryAudit(tx: Pick<DashTransaction, 'statusHistory'>) {
  return hasSellerDeliveryAuditFromMapper(tx)
}

function getTxStatusLabel(tx: DashTransaction, viewAs: 'buyer' | 'seller') {
  return deriveMarketplaceNextActionState(tx, viewAs, STATUS_CONFIG[tx.status]?.label).statusLabel
}

function getTxStatusCopy(tx: DashTransaction, viewAs: 'buyer' | 'seller') {
  return deriveMarketplaceNextActionState(tx, viewAs, STATUS_CONFIG[tx.status]?.label).statusCopy
}

function getTxNextStep(tx: DashTransaction, viewAs: 'buyer' | 'seller') {
  return deriveMarketplaceNextActionState(tx, viewAs, STATUS_CONFIG[tx.status]?.label).nextStep
}

function getBuyerCtaLabel(status: string) {
  return getBuyerCtaLabelFromMapper(status)
}

function isBinanceTransaction(tx: DashTransaction) {
  return mapTxBuyerPaymentMethod(tx) === 'BINANCE'
}

function mapTxBuyerPaymentMethod(tx: DashTransaction): BuyerPaymentMethod {
  if (tx.paymentMethod === 'CRYPTO_WALLET_MANUAL') return 'BINANCE'
  if (tx.paymentMethod === 'MERCANTIL_PAGO_MOVIL') return 'PAGO_MOVIL'
  return 'BANK'
}

function mapSellerPayoutMethod(method?: DashPayoutMethod | null): SellerPayoutMethod {
  if (method?.methodType === 'BINANCE_PAY' || method?.methodType === 'CRYPTO_WALLET') return 'BINANCE'
  if (method?.methodType === 'PAGO_MOVIL' || method?.methodType === 'BANK_TRANSFER') return 'BANK'
  return 'NONE'
}

function getTxPayoutCalculation(tx: DashTransaction, sellerPayoutMethod: SellerPayoutMethod): TxPayoutDisplay {
  const amountUSD = Number(tx.amount ?? 0)
  const buyerPaymentMethod = mapTxBuyerPaymentMethod(tx)

  if (buyerPaymentMethod === 'BINANCE' && sellerPayoutMethod === 'BINANCE') {
    return {
      hasFrozenRate: false,
      ...calculateSellerPayout({
        amountUSD,
        buyerPaymentMethod,
        sellerPayoutMethod,
        bcvRate: 0,
        binanceRate: 0,
      }),
    }
  }

  const numericFrozenRate = Number(tx.frozenRate ?? 0)
  const frozenRate: FrozenRatePayload | null =
    Number.isFinite(numericFrozenRate) && numericFrozenRate > 0
      ? {
          rate: numericFrozenRate,
          source: tx.frozenRateSource ?? null,
          fechaValor: tx.frozenRateFechaValor ? String(tx.frozenRateFechaValor) : null,
          snapshotId: tx.rateSnapshotId ?? null,
        }
      : null

  return txPayoutDisplay({
    amountUSD,
    buyerPaymentMethod,
    sellerPayoutMethod,
    frozenRate,
  })
}

const ACTION_ACCENT: Record<ActionPriority, string> = {
  required: '#f97316',
  review: '#f59e0b',
  pending: '#00aeef',
  closed: '#4ade80',
}

const CHIP_BG: Record<ActionPriority, string> = {
  required: 'rgba(249,115,22,0.12)',
  review: 'rgba(245,158,11,0.1)',
  pending: 'rgba(0,174,239,0.1)',
  closed: 'rgba(74,222,128,0.1)',
}

const CHIP_BORDER: Record<ActionPriority, string> = {
  required: 'rgba(249,115,22,0.28)',
  review: 'rgba(245,158,11,0.22)',
  pending: 'rgba(0,174,239,0.2)',
  closed: 'rgba(74,222,128,0.2)',
}

function deriveActionItems(
  purchases: DashTransaction[],
  sales: DashTransaction[],
  hasUsablePayoutMethod: boolean,
): ActionItem[] {
  const items: ActionItem[] = []

  for (const tx of purchases) {
    const base = { tx, viewAs: 'buyer' as const, disabled: false }

    if (tx.status === 'PENDING_PAYMENT') {
      items.push({
        ...base,
        key: `buyer-pay-${tx.id}`,
        priority: 'required',
        chipLabel: 'Accion requerida',
        description: 'Completa o reporta tu pago para iniciar la validacion.',
        ctaLabel: 'Ver operacion',
        ctaType: 'view-detail',
        accent: ACTION_ACCENT.required,
      })
    } else if (tx.status === 'PAYMENT_RECEIVED' || tx.status === 'VALIDATING') {
      items.push({
        ...base,
        key: `buyer-validate-${tx.id}`,
        priority: 'review',
        chipLabel: 'En revision',
        description: 'Pago en revision por el equipo. Te notificaremos cuando avance.',
        ctaLabel: 'Ver operacion',
        ctaType: 'view-detail',
        accent: ACTION_ACCENT.review,
      })
    } else if (tx.status === 'IN_ESCROW') {
      if (hasSellerDeliveryAudit(tx)) {
        items.push({
          ...base,
          key: `buyer-confirm-${tx.id}`,
          priority: 'required',
          chipLabel: 'Accion requerida',
          description: 'El vendedor registro la entrega. Confirma recibido solo si estas conforme.',
          ctaLabel: 'Confirmar recibido',
          ctaType: 'confirm-delivery',
          accent: ACTION_ACCENT.required,
        })
      } else {
        items.push({
          ...base,
          key: `buyer-escrow-${tx.id}`,
          priority: 'pending',
          chipLabel: 'Esperando vendedor',
          description: 'Coordina la entrega con el vendedor. Confirma solo cuando el vendedor registre la entrega.',
          ctaLabel: 'Abrir conversacion',
          ctaType: 'open-messages',
          accent: ACTION_ACCENT.pending,
        })
      }
    } else if (tx.status === 'DELIVERY_CONFIRMED') {
      items.push({
        ...base,
        key: `buyer-confirmed-${tx.id}`,
        priority: 'pending',
        chipLabel: 'Esperando admin',
        description: 'Recepcion confirmada. El admin debe liberar el pago al vendedor.',
        ctaLabel: 'Ver operacion',
        ctaType: 'view-detail',
        accent: ACTION_ACCENT.pending,
      })
    } else if (tx.status === 'RELEASED') {
      if (hasSellerPaidAudit(tx)) {
        items.push({
          ...base,
          key: `buyer-payout-sent-${tx.id}`,
          priority: 'closed',
          chipLabel: 'Completado',
          description: 'Pago enviado al vendedor. No hay acciones pendientes para esta operacion.',
          ctaLabel: 'Ver operacion',
          ctaType: 'view-detail',
          accent: ACTION_ACCENT.closed,
        })
      } else {
        items.push({
          ...base,
          key: `buyer-released-${tx.id}`,
          priority: 'pending',
          chipLabel: 'Pago pendiente',
          description: 'Pago al vendedor pendiente. El equipo lo procesara en breve.',
          ctaLabel: 'Ver operacion',
          ctaType: 'view-detail',
          accent: ACTION_ACCENT.pending,
        })
      }
    } else if (tx.status === 'DISPUTED') {
      items.push({
        ...base,
        key: `buyer-disputed-${tx.id}`,
        priority: 'review',
        chipLabel: 'En revision',
        description: 'Operacion en disputa. El equipo revisara el caso.',
        ctaLabel: 'Ver operacion',
        ctaType: 'view-detail',
        accent: ACTION_ACCENT.review,
      })
    }
  }

  for (const tx of sales) {
    const base = { tx, viewAs: 'seller' as const, disabled: false }

    if (tx.status === 'PAYMENT_RECEIVED' || tx.status === 'VALIDATING') {
      items.push({
        ...base,
        key: `seller-validate-${tx.id}`,
        priority: 'review',
        chipLabel: 'En revision',
        description: 'Pago del comprador en revision por el equipo.',
        ctaLabel: 'Ver operacion',
        ctaType: 'view-detail',
        accent: ACTION_ACCENT.review,
      })
    } else if (tx.status === 'IN_ESCROW') {
      if (hasSellerDeliveryAudit(tx)) {
        items.push({
          ...base,
          key: `seller-delivered-${tx.id}`,
          priority: 'pending',
          chipLabel: 'Esperando comprador',
          description: 'Entrega registrada. Los fondos siguen protegidos hasta confirmacion del comprador y liberacion admin.',
          ctaLabel: 'Ver operacion',
          ctaType: 'view-detail',
          accent: ACTION_ACCENT.pending,
        })
      } else {
        items.push({
          ...base,
          key: `seller-deliver-${tx.id}`,
          priority: 'required',
          chipLabel: 'Accion requerida',
          description: 'Coordina la entrega y registrala cuando este completada.',
          ctaLabel: 'Marcar entregado',
          ctaType: 'seller-deliver',
          accent: ACTION_ACCENT.required,
        })
      }
    } else if (tx.status === 'DELIVERY_CONFIRMED') {
      items.push({
        ...base,
        key: `seller-waiting-${tx.id}`,
        priority: 'pending',
        chipLabel: 'Esperando admin',
        description: 'El comprador confirmo recepcion. El admin debe liberar el pago antes de registrar el envio.',
        ctaLabel: 'Ver operacion',
        ctaType: 'view-detail',
        accent: ACTION_ACCENT.pending,
      })
    } else if (tx.status === 'RELEASED') {
      if (hasSellerPaidAudit(tx)) {
        items.push({
          ...base,
          key: `seller-payout-sent-${tx.id}`,
          priority: 'closed',
          chipLabel: 'Pago enviado',
          description: 'El equipo ya registro el envio del pago al vendedor.',
          ctaLabel: 'Ver operacion',
          ctaType: 'view-detail',
          accent: ACTION_ACCENT.closed,
        })
      } else {
        items.push({
          ...base,
          key: hasUsablePayoutMethod ? `seller-released-${tx.id}` : `seller-payout-missing-${tx.id}`,
          priority: hasUsablePayoutMethod ? 'pending' : 'required',
          chipLabel: hasUsablePayoutMethod ? 'Pago pendiente' : 'Accion requerida',
          description: hasUsablePayoutMethod
            ? 'Pago al vendedor pendiente. El equipo lo procesara con tus datos de cobro.'
            : 'Configura un metodo de cobro para que el equipo pueda pagarte.',
          ctaLabel: hasUsablePayoutMethod ? 'Ver operacion' : 'Configurar metodo de cobro',
          ctaType: hasUsablePayoutMethod ? 'view-detail' : 'payout-setup',
          accent: hasUsablePayoutMethod ? ACTION_ACCENT.pending : ACTION_ACCENT.required,
        })
      }
    } else if (tx.status === 'DISPUTED') {
      items.push({
        ...base,
        key: `seller-disputed-${tx.id}`,
        priority: 'review',
        chipLabel: 'En revision',
        description: 'Operacion en disputa. El equipo revisara el caso.',
        ctaLabel: 'Ver operacion',
        ctaType: 'view-detail',
        accent: ACTION_ACCENT.review,
      })
    }
  }

  const priorityOrder: Record<ActionPriority, number> = { required: 0, review: 1, pending: 2, closed: 3 }
  return items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
}

const SEMAFORO_MILESTONES = [...MARKETPLACE_TIMELINE_MILESTONES]

const TERMINAL_STATUSES: string[] = [...MARKETPLACE_TERMINAL_STATUSES]

function getSemaphoreState(currentStatus: string, milestoneStatus: string): 'completed' | 'current' | 'pending' {
  return getMarketplaceTimelineState(currentStatus, milestoneStatus)
}

function hasSellerPaidAudit(tx: Pick<DashTransaction, 'status' | 'statusHistory' | 'hasSellerPayoutSent'>) {
  return tx.status === 'RELEASED' && hasSellerPayoutSentAuditFromMapper(tx)
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="h-px flex-1" style={{ background: 'var(--mp-border)' }} />
      <span className="text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap" style={{ color: 'var(--mp-text-faint)' }}>
        {title}
        {count !== undefined && count > 0 && (
          <span className="ml-1.5" style={{ color: 'var(--mp-text-muted)' }}>({count})</span>
        )}
      </span>
      <div className="h-px flex-1" style={{ background: 'var(--mp-border)' }} />
    </div>
  )
}

// ─── Collapsible Section ─────────────────────────────────────────────────────
function CollapsibleSection({ title, count, defaultCollapsed, children }: {
  title: string
  count?: number
  defaultCollapsed?: boolean
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed ?? false)
  return (
    <div>
      <button
        onClick={() => setCollapsed(p => !p)}
        className="w-full flex items-center gap-2 mb-3 group"
      >
        <div className="h-px flex-1" style={{ background: 'var(--mp-border)' }} />
        <ChevronRight
          size={12}
          className="transition-transform duration-200"
          style={{ color: 'var(--mp-text-disabled)', transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)' }}
        />
        <span className="text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap" style={{ color: 'var(--mp-text-faint)' }}>
          {title}
          {count !== undefined && count > 0 && (
            <span className="ml-1.5" style={{ color: 'var(--mp-text-muted)' }}>({count})</span>
          )}
        </span>
        <div className="h-px flex-1" style={{ background: 'var(--mp-border)' }} />
      </button>
      {!collapsed && children}
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
        tone === 'primary' ? "min-h-[124px] p-4 sm:min-h-[148px] sm:p-5" : tone === 'compact' ? "min-h-[104px] p-3.5 sm:min-h-[118px] sm:p-4" : "min-h-[112px] p-3.5 sm:min-h-[132px] sm:p-4",
        onClick && "cursor-pointer transition-all duration-200 hover:ring-1 ring-[#00aeef] hover:brightness-110 active:scale-[0.98]",
      )}
      style={{
        background: tone === 'primary'
          ? `linear-gradient(135deg, ${accent}14 0%, var(--mp-card) 66%)`
          : 'var(--mp-card)',
        border: `1px solid ${tone === 'primary' ? `${accent}30` : 'var(--mp-border)'}`,
        boxShadow: 'var(--mp-card-shadow)',
      }}
    >
      <div className="flex items-center gap-2 relative z-10">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: `${accent}20`, border: `1px solid ${accent}30` }}
        >
          <Icon size={14} color={accent} />
        </div>
        <span className="min-w-0 text-[10px] font-semibold uppercase tracking-normal leading-snug" style={{ color: 'var(--mp-text-faint)' }}>{label}</span>
      </div>
      <div className="relative z-10 min-w-0">
        <p className={cn(
          "font-bold leading-none tracking-normal tabular-nums",
          tone === 'primary' ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl",
          "[overflow-wrap:anywhere]",
        )}
          style={{ color: 'var(--mp-text-strong)' }}
        >
          {value}
        </p>
        {sub && <p className="mt-2 text-[11px] leading-relaxed" style={{ color: 'var(--mp-text-muted)' }}>{sub}</p>}
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
  onSuccess: (txId: string) => void | Promise<void>
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
      await onSuccess(tx.id)
      onClose()
    } else {
      setError(res.message)
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)' }}
    >
      <div
        className="flex max-h-[100dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl sm:max-h-[92vh] sm:rounded-2xl"
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

        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          <div
            className="rounded-xl p-3 flex items-start gap-2.5"
            style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.15)' }}
          >
            <Shield size={13} className="text-[#f97316] mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-[#a0a0a0] leading-relaxed">
              Al abrir una disputa, el dinero protegido queda{' '}
              <span className="text-[#f2f2f2]">retenido hasta la resolucion</span>. El equipo de Turpial
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
              <span className="text-[#6a6a6a]">(mín. 20 caracteres)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe con detalle qué ocurrió, cuándo y por qué solicitas una disputa..."
              rows={4}
              className="w-full px-4 py-2.5 rounded-xl text-sm text-[#f2f2f2] placeholder:text-[#6a6a6a] outline-none resize-none"
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
              <p className="text-[10px] text-[#6a6a6a] ml-auto">{description.length}/1500</p>
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

          <div className="flex flex-col gap-3 pt-1 min-[420px]:flex-row">
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
  const guidance = getTxStatusCopy(tx, viewAs)
  const actionLabel = viewAs === 'buyer' && !hasSellerDeliveryAudit(tx) ? getBuyerCtaLabel(tx.status) : getTxStatusLabel(tx, viewAs)
  const actionTone =
    tx.status === 'RELEASED' ? 'info' :
      tx.status === 'PENDING_PAYMENT' || tx.status === 'PAYMENT_RECEIVED' || tx.status === 'VALIDATING' ? 'warning' :
        tx.status === 'DISPUTED' ? 'danger' :
          'info'

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
      className="group flex w-full gap-3 rounded-xl p-3.5 text-left transition-all duration-200 hover:border-[rgba(0,174,239,0.2)] active:scale-[0.995] sm:p-4"
      style={{
        background: 'var(--mp-card)',
        border: '1px solid var(--mp-border)',
        boxShadow: 'var(--mp-card-shadow)',
      }}
    >
      <div
        className="relative w-14 h-14 rounded-lg flex-shrink-0 overflow-hidden"
        style={{ background: 'var(--mp-media-bg)', border: '1px solid var(--mp-border)' }}
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
            <Package size={20} style={{ color: 'var(--mp-text-disabled)' }} />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-col gap-2 min-[420px]:flex-row min-[420px]:items-start min-[420px]:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium leading-snug [overflow-wrap:anywhere] min-[420px]:truncate" style={{ color: 'var(--mp-text-strong)' }}>
              {tx.listing?.title ?? 'Listing eliminado'}
            </p>
            <p className="mt-0.5 text-[11px] leading-snug [overflow-wrap:anywhere]" style={{ color: 'var(--mp-text-faint)' }}>
              {viewAs === 'buyer' ? 'Miembro: ' : 'Comprador: '}
              <span style={{ color: 'var(--mp-text-muted)' }}>{otherParty.displayName}</span>
            </p>
          </div>
          <div className="flex-shrink-0 text-left min-[420px]:text-right">
            <p className="text-sm font-semibold" style={{ color: 'var(--mp-text-strong)' }}>
              ${Number(tx.amount).toLocaleString('es-VE')}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--mp-text-faint)' }}>{tx.currency}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={tx.status} label={getTxStatusLabel(tx, viewAs)} />
            <PaymentMethodBadge tx={tx} />
          </div>
          <div className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--mp-text-faint)' }}>
            <Clock size={9} />
            <span>{fmtDate(tx.createdAt)}</span>
          </div>
        </div>

        {tx.status === 'IN_ESCROW' && tx.escrowReleaseAt && (
          <div className="mt-2 flex items-center gap-1.5">
            <Shield size={9} className="text-[#00aeef]" />
            <span className="text-[9px]" style={{ color: 'var(--mp-text-faint)' }}>
              Fecha estimada de cierre: {fmtDate(tx.escrowReleaseAt)}
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
              className="flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-medium transition-all duration-200 min-[420px]:w-auto min-[420px]:py-1.5"
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

        <div className="mt-3">
          <DashboardStateCallout label={actionLabel} copy={guidance} tone={actionTone} />
        </div>

        {viewAs === 'buyer' && (
          <button
            onClick={(event) => {
              event.stopPropagation()
              onOpenDetails?.(tx)
            }}
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold transition-all min-[420px]:w-auto min-[420px]:py-1.5"
            style={{ background: 'rgba(0,174,239,0.08)', color: '#00aeef', border: '1px solid rgba(0,174,239,0.18)' }}
          >
            {getBuyerCtaLabel(tx.status)}
            <ChevronRight size={12} />
          </button>
        )}

        {viewAs === 'seller' && payoutMissing && (
          <div
            className="mt-3 rounded-lg px-3 py-2"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)' }}
          >
            <p className="text-[11px] font-medium text-[#f59e0b]">
              Pendiente de datos de cobro para pagar al vendedor.
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
        background: 'var(--mp-card)',
        border: '1px solid var(--mp-border)',
      }}
    >
      <div
        className="relative w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden"
        style={{ background: 'var(--mp-media-bg)', border: '1px solid var(--mp-border)' }}
      >
        {cover ? (
          <MarketplaceImage src={cover} alt={listing.title} fill className="w-full h-full object-cover" sizes="72px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={16} style={{ color: 'var(--mp-text-disabled)' }} />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--mp-text-strong)' }}>{listing.title}</p>
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--mp-text-faint)' }}>{listing.subcategory ?? listing.category}</p>
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
      style={{ border: '1px solid rgba(0,174,239,0.16)', background: 'var(--mp-card)', boxShadow: 'var(--mp-card-shadow)' }}
    >
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center gap-3 p-3 text-left"
      >
        <div
          className="relative w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden"
          style={{ background: 'var(--mp-media-bg)', border: '1px solid var(--mp-border)' }}
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
              <Package size={14} style={{ color: 'var(--mp-text-disabled)' }} />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--mp-text-strong)' }}>{item.listingTitle}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <HelpCircle size={10} className="text-[#00aeef]" />
            <span className="text-[10px]" style={{ color: 'var(--mp-text-faint)' }}>
              {item.questions.length} pregunta{item.questions.length !== 1 ? 's' : ''}
              {unanswered > 0 && (
                <span className="ml-1 text-[#f59e0b]">· {unanswered} sin respuesta</span>
              )}
            </span>
          </div>
        </div>

        <ChevronRight
          size={14}
          className="transition-transform duration-200 flex-shrink-0"
          style={{ color: 'var(--mp-text-disabled)', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
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
                  <p className="text-[10px] font-semibold text-[#00aeef] mb-0.5 uppercase tracking-wide">Miembro</p>
                  <p className="text-[12px] text-[#c0c0c0] leading-snug">{q.answer}</p>
                </div>
              ) : (
                <p className="ml-4 text-[10px] italic" style={{ color: 'var(--mp-text-disabled)' }}>Pendiente de respuesta del vendedor</p>
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
        background: 'var(--mp-card)',
        border: '1px solid var(--mp-border)',
        boxShadow: 'var(--mp-card-shadow)',
        opacity: removing ? 0.5 : 1,
      }}
    >
      <div
        className="relative w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden"
        style={{ background: 'var(--mp-media-bg)', border: '1px solid var(--mp-border)' }}
      >
        {cover ? (
          <MarketplaceImage src={cover} alt={listing.title} fill className="w-full h-full object-cover" sizes="72px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={16} style={{ color: 'var(--mp-text-disabled)' }} />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--mp-text-strong)' }}>{listing.title}</p>
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--mp-text-faint)' }}>{listing.subcategory ?? listing.category}</p>
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
        background: 'var(--mp-card)',
        border: `1px solid ${hasUnread ? 'rgba(0,174,239,0.28)' : 'var(--mp-border)'}`,
        boxShadow: hasUnread ? '0 0 20px rgba(0,174,239,0.12)' : 'var(--mp-card-shadow)',
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
          <p className="text-sm font-medium truncate" style={{ color: hasUnread ? 'var(--mp-text-strong)' : 'var(--mp-text-soft)' }}>
            {other.displayName}
          </p>
          {lastMsg && (
            <span className="text-[9px] flex-shrink-0 ml-2" style={{ color: 'var(--mp-text-faint)' }}>
              {fmtTime(lastMsg.createdAt)}
            </span>
          )}
        </div>
        <p className="text-[11px] truncate mb-1" style={{ color: 'var(--mp-text-faint)' }}>
          {other.displayName}{thread.listing?.title ? ` • ${thread.listing.title}` : ''}
        </p>
        {lastMsg ? (
          <p className={cn('text-xs truncate', hasUnread && 'font-medium')} style={{ color: hasUnread ? 'var(--mp-text-muted)' : 'var(--mp-text-faint)' }}>
            {lastMsg.senderId === currentUserId ? 'Tú: ' : ''}{lastMsg.content}
          </p>
        ) : (
          <p className="text-xs text-[#6a6a6a] italic">Sin mensajes aún</p>
        )}
      </div>

      <ChevronRight size={14} className="group-hover:text-[#00aeef] transition-colors flex-shrink-0 self-center" style={{ color: 'var(--mp-text-disabled)' }} />
    </button>
  )
}

// ─── Referral Components ────────────────────────────────────────────────────────

function ReferralLinkCard({
  link,
  onCopy,
}: {
  link: { id: string; code: string; listingId: string; slug?: string; clicks: number; conversions: number; totalEarned: unknown; createdAt: string | Date }
  onCopy: () => void
}) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    onCopy()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl"
      style={{ background: 'var(--mp-card)', border: '1px solid var(--mp-border)', boxShadow: 'var(--mp-card-shadow)' }}
    >
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold font-mono" style={{ background: 'rgba(255,193,7,0.1)', border: '1px solid rgba(255,193,7,0.2)', color: '#ffc107' }}>
            {link.code}
          </span>
          <span className="text-[11px]" style={{ color: 'var(--mp-text-faint)' }}>
            {link.clicks} clicks · {link.conversions} conversiones
          </span>
        </div>
        <p className="text-xs" style={{ color: 'var(--mp-text-strong)' }}>
          Comision: <span style={{ color: '#ffc107' }}>${Number(link.totalEarned ?? 0).toFixed(2)}</span>
        </p>
        <p className="text-[10px]" style={{ color: 'var(--mp-text-faint)' }}>Creado: {fmtDate(link.createdAt)}</p>
      </div>
      <button
        onClick={handleCopy}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
        style={copied
          ? { background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }
          : { background: 'rgba(255,193,7,0.08)', color: '#ffc107', border: '1px solid rgba(255,193,7,0.2)' }
        }
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? 'Copiado' : 'Copiar link'}
      </button>
    </div>
  )
}

function ReferredTransactionCard({
  tx,
}: {
  tx: { id: string; amount: string; currency: string; status: string; platformFeeAmount?: string; createdAt: string | Date
    buyer: { id: string; displayName: string; email: string }
    listing: { id: string; title: string; slug: string } | null
  }
}) {
  const commission = Number(tx.amount ?? 0) * REFERRAL_COMMISSION_RATE

  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl"
      style={{ background: 'var(--mp-card)', border: '1px solid var(--mp-border)', boxShadow: 'var(--mp-card-shadow)' }}
    >
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--mp-text-strong)' }}>
            {tx.listing?.title ?? 'Listing eliminado'}
          </p>
          <StatusBadge status={tx.status} />
        </div>
        <p className="text-xs" style={{ color: 'var(--mp-text-faint)' }}>
          Comprador: <span style={{ color: 'var(--mp-text-muted)' }}>{tx.buyer.displayName}</span>
        </p>
        <p className="text-[10px]" style={{ color: 'var(--mp-text-faint)' }}>{fmtDate(tx.createdAt)}</p>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="text-sm font-semibold" style={{ color: 'var(--mp-text-strong)' }}>
          ${Number(tx.amount).toLocaleString('es-VE')}
        </span>
        <span className="text-[10px] font-medium" style={{ color: '#ffc107' }}>
          +${commission.toFixed(2)} comision
        </span>
      </div>
    </div>
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
        <Icon size={24} style={{ color: 'var(--mp-text-disabled)' }} />
      </div>
      <p className="text-sm font-medium" style={{ color: 'var(--mp-text-muted)' }}>{title}</p>
      <p className="text-xs text-center max-w-xs" style={{ color: 'var(--mp-text-faint)' }}>{sub}</p>
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
    { id: 'referrals', label: 'Mis Referidos',icon: Users         },
  ]

  return (
    <div
      className="sticky top-[49px] z-30 -mx-4 flex gap-1.5 overflow-x-auto px-4 py-2 backdrop-blur-xl sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:rounded-2xl sm:p-1.5 lg:grid-cols-7"
      style={{ background: 'color-mix(in srgb, var(--mp-panel) 92%, transparent)', border: '1px solid var(--mp-border)', boxShadow: 'var(--mp-card-shadow)' }}
    >
      {tabs.map(t => {
        const isActive = active === t.id
        const Icon = t.icon
        const count = counts[t.id]
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className="flex min-h-[52px] min-w-[116px] flex-col items-start justify-between rounded-xl px-3 py-2 text-left transition-all duration-200 sm:min-h-[64px] sm:min-w-0 sm:py-2.5"
            style={
              isActive
                ? {
                    background: 'linear-gradient(135deg, rgba(0,174,239,0.2) 0%, rgba(0,80,200,0.14) 100%)',
                    border: '1px solid rgba(0,174,239,0.25)',
                    color: '#00aeef',
                    boxShadow: '0 0 16px rgba(0,174,239,0.15)',
                  }
                : { color: 'var(--mp-text-faint)', border: '1px solid transparent' }
            }
          >
            <span className="flex w-full min-w-0 items-center gap-1.5">
              <Icon size={13} className="shrink-0" />
              <span className="min-w-0 truncate text-[11px] font-semibold">{t.label}</span>
            </span>
            {count > 0 ? (
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums',
                  t.id === 'messages' && !isActive && 'animate-pulse',
                )}
                style={
                  t.id === 'messages' && !isActive
                    ? { background: 'rgba(0,174,239,0.2)', color: '#00aeef', boxShadow: '0 0 8px rgba(0,174,239,0.5)' }
                    : isActive
                      ? { background: 'rgba(0,174,239,0.3)', color: '#00aeef' }
                      : { background: 'var(--mp-card-subtle)', color: 'var(--mp-text-faint)' }
                }
              >
                {count > 99 ? '99+' : count}
              </span>
            ) : (
              <span className="text-[10px]" style={{ color: 'var(--mp-text-disabled)' }}>0</span>
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
  const roleColor: Record<string, string> = { USER: 'var(--mp-text-disabled)', SOCIO: '#ffc107', SUPER: '#ef4444' }

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-4 sm:p-5"
      style={{
        background: 'linear-gradient(135deg, var(--mp-card) 0%, var(--mp-panel-soft) 100%)',
        border: '1px solid rgba(0,174,239,0.18)',
        boxShadow: 'var(--mp-card-shadow)',
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
            <h2 className="text-lg font-bold" style={{ color: 'var(--mp-text-strong)' }}>{name}</h2>
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
              style={{ background: 'var(--mp-card-subtle)', border: '1px solid var(--mp-border)', color: roleColor[role] }}
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
            <p className="text-xs truncate max-w-xs" style={{ color: 'var(--mp-text-faint)' }}>{profile.bio}</p>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => onTabClick?.('messages')}
            className="flex w-full flex-shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 py-2 animate-pulse sm:w-auto sm:py-1.5"
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

      <div className="relative z-10 mt-4 grid grid-cols-2 gap-2.5 sm:mt-5 sm:grid-cols-4 sm:gap-3">
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
  onSyncNeeded,
}: {
  thread: DashThread
  currentUserId: string
  currentUserName: string
  onClose: () => void
  onSyncNeeded?: (reason: ChatSyncReason) => void
}) {
  const isBuyer = thread.buyerId === currentUserId
  const other = isBuyer ? thread.seller : thread.buyer

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
    >
      <div className="h-[100dvh] w-full max-w-none sm:h-[min(640px,85vh)] sm:max-w-lg">
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
          onSyncNeeded={onSyncNeeded}
          className="h-full rounded-none sm:rounded-2xl"
        />
      </div>
    </div>
  )
}

function PaymentMethodBadge({ tx }: { tx: DashTransaction }) {
  const isBinance = isBinanceTransaction(tx)

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold"
      style={{
        background: isBinance ? 'rgba(249,115,22,0.1)' : 'rgba(0,174,239,0.08)',
        color: isBinance ? '#f97316' : '#00aeef',
        border: `1px solid ${isBinance ? 'rgba(249,115,22,0.24)' : 'rgba(0,174,239,0.18)'}`,
      }}
    >
      {isBinance ? <Wallet size={11} /> : <CreditCard size={11} />}
      {isBinance ? 'USDT / Binance' : payoutMethodLabel(tx.paymentMethod)}
    </span>
  )
}

function DashboardStateCallout({
  label,
  copy,
  tone = 'info',
}: {
  label: string
  copy: string
  tone?: 'info' | 'warning' | 'success' | 'danger'
}) {
  const accent =
    tone === 'success' ? '#4ade80' :
      tone === 'warning' ? '#f59e0b' :
        tone === 'danger' ? '#f97316' :
          '#00aeef'

  return (
    <div
      className="rounded-xl px-3 py-3"
      style={{
        background: `${accent}10`,
        border: `1px solid ${accent}30`,
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold" style={{ color: accent }}>{label}</p>
      </div>
      <p className="mt-1 text-[11px] leading-relaxed" style={{ color: 'var(--mp-text-muted)' }}>{copy}</p>
    </div>
  )
}

function FinancialSummaryRow({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'positive' | 'warning'
}) {
  const color = tone === 'positive' ? '#4ade80' : tone === 'warning' ? '#f59e0b' : 'var(--mp-text-strong)'

  return (
    <div
      className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-xs"
      style={{ background: 'var(--mp-card-subtle)', border: '1px solid var(--mp-border)' }}
    >
      <span style={{ color: 'var(--mp-text-muted)' }}>{label}</span>
      <span className="text-right font-semibold tabular-nums" style={{ color }}>{value}</span>
    </div>
  )
}

function SellerFinancialSummary({
  tx,
  sellerPayoutMethod,
}: {
  tx: DashTransaction
  sellerPayoutMethod: SellerPayoutMethod
}) {
  const amount = roundMoney(Number(tx.amount ?? 0))
  const payout = getTxPayoutCalculation(tx, sellerPayoutMethod)
  const buyerPaidWithBinance = mapTxBuyerPaymentMethod(tx) === 'BINANCE'

  return (
    <div
      className="space-y-3 rounded-2xl p-4"
      style={{
        background: 'linear-gradient(135deg, rgba(74,222,128,0.08) 0%, var(--mp-card-subtle) 72%)',
        border: '1px solid rgba(74,222,128,0.18)',
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--mp-text-strong)' }}>Resumen de cobro estimado</p>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--mp-text-muted)' }}>
            Estimacion visual del monto a recibir. No ejecuta pagos ni recalcula transacciones historicas.
          </p>
        </div>
        <span
          className="rounded-full px-2 py-1 text-[10px] font-semibold"
          style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.22)' }}
        >
          {payout.currency}
        </span>
      </div>

      {payout.currency === 'USDT' ? (
        <div className="space-y-2">
          <FinancialSummaryRow label="Venta" value={fmtUSDT(amount)} />
          <FinancialSummaryRow label="Comision Turpial 5%" value={`-${fmtUSDT(payout.platformFeeUSD)}`} />
          <FinancialSummaryRow label="Fee Binance" value={`-${fmtUSDT(payout.usdtFee)}`} />
          <FinancialSummaryRow label="Calculo" value={`${fmtUSDT(amount)} - ${fmtUSDT(payout.platformFeeUSD)} - ${fmtUSDT(payout.usdtFee)}`} />
          <FinancialSummaryRow label="Total estimado a recibir" value={fmtUSDT(payout.finalAmount)} tone="positive" />
        </div>
      ) : payout.hasFrozenRate ? (
        <div className="space-y-2">
          <FinancialSummaryRow
            label="Venta"
            value={buyerPaidWithBinance ? `${fmtUSD(amount)} / ${fmtUSDT(amount)}` : fmtUSD(amount)}
          />
          <FinancialSummaryRow label="Comision Turpial 5%" value={`-${fmtUSD(payout.platformFeeUSD)}`} />
          <FinancialSummaryRow
            label={`Tasa ${payout.appliedRateType ?? ''}`.trim()}
            value={`Bs ${roundMoney(Number(tx.frozenRate ?? 0)).toFixed(2)}`}
          />
          <FinancialSummaryRow label="Monto Bs base" value={fmtBS(payout.netBS + payout.bankFeeBS)} />
          <FinancialSummaryRow label="Comision bancaria 0.3%" value={`-${fmtBS(payout.bankFeeBS)}`} />
          <FinancialSummaryRow label="Total estimado Bs" value={fmtBS(payout.finalAmount)} tone="positive" />
          {tx.frozenRateSource && (
            <FinancialSummaryRow
              label="Fuente"
              value={`${tx.frozenRateSource}${tx.frozenRateFechaValor ? ` - ${fmtShortDate(tx.frozenRateFechaValor)}` : ''}`}
            />
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <FinancialSummaryRow
            label="Venta"
            value={buyerPaidWithBinance ? `${fmtUSD(amount)} / ${fmtUSDT(amount)}` : fmtUSD(amount)}
          />
          <FinancialSummaryRow label="Comision Turpial 5%" value={`-${fmtUSD(payout.platformFeeUSD)}`} />
          <FinancialSummaryRow
            label="Tasa"
            value="Operacion anterior sin tasa congelada"
            tone="warning"
          />
          <FinancialSummaryRow label="Monto Bs base" value="No disponible: operacion sin tasa congelada" tone="warning" />
          <FinancialSummaryRow label="Comision bancaria" value="No disponible" tone="warning" />
          <FinancialSummaryRow label="Total estimado Bs" value="Requiere revision de tasa" tone="warning" />
        </div>
      )}
    </div>
  )
}

function TransactionDetailModal({
  tx,
  viewAs,
  onClose,
  onOpenMessages,
  onOpenDispute,
  onSetupPayout,
  onReportPayment,
  sellerPayoutMethod = 'NONE',
}: {
  tx: DashTransactionDetail
  viewAs: 'buyer' | 'seller'
  onClose: () => void
  onOpenMessages?: () => void
  onOpenDispute?: (tx: DashTransaction) => void
  onSetupPayout?: () => void
  onReportPayment?: () => void
  sellerPayoutMethod?: SellerPayoutMethod
}) {
  const otherParty = viewAs === 'buyer' ? tx.seller : tx.buyer
  const buyerPaidWithBinance = mapTxBuyerPaymentMethod(tx) === 'BINANCE'
  const sellerPaid = tx.status === 'RELEASED' && hasSellerPaidAudit(tx)
  const hasUsablePayoutMethod = sellerPayoutMethod !== 'NONE'
  const detailStateLabel = sellerPaid ? 'Pago enviado al vendedor' : getTxStatusLabel(tx, viewAs)
  const detailStateCopy = sellerPaid
    ? 'El pago al vendedor ya fue registrado por el equipo. La operacion queda cerrada a nivel operativo.'
    : getTxStatusCopy(tx, viewAs)
  const operationCardState = deriveMarketplaceOperationCardState(tx, viewAs, {
    hasUsablePayoutMethod,
    fallbackLabel: STATUS_CONFIG[tx.status]?.label,
  })
  const cardCoversReportPayment =
    operationCardState.primaryAction === 'report_payment' ||
    operationCardState.secondaryActions.includes('report_payment')
  const cardCoversConfirmReceived =
    operationCardState.primaryAction === 'confirm_received' ||
    operationCardState.secondaryActions.includes('confirm_received')
  const cardCoversMarkDelivered =
    operationCardState.primaryAction === 'mark_delivered' ||
    operationCardState.secondaryActions.includes('mark_delivered')
  const cardCoversOpenMessages =
    operationCardState.primaryAction === 'open_messages' ||
    operationCardState.secondaryActions.includes('open_messages')

  async function handleConfirmReceived() {
    const c = window.confirm('Confirma solo si ya recibiste y revisaste el producto o servicio.')
    if (!c) return
    await confirmDelivery(tx.id)
    onClose()
  }

  async function handleMarkDelivered() {
    const c = window.confirm('Marca entregado solo cuando ya completaste la entrega.')
    if (!c) return
    await sellerDeliver(tx.id)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-6"
      style={{ background: 'var(--mp-overlay)', backdropFilter: 'blur(10px)' }}
    >
      <div
        className="relative flex w-full flex-col h-[100dvh] sm:h-auto sm:max-h-[92vh] sm:max-w-2xl sm:rounded-2xl"
        style={{
          background: 'var(--mp-panel-solid)',
          border: '1px solid var(--mp-border)',
          boxShadow: 'var(--mp-shadow), 0 0 80px rgba(0,174,239,0.06)',
        }}
      >
        <div className="sticky top-0 z-10 flex flex-shrink-0 items-center justify-between gap-3 border-b px-4 py-3 sm:px-6" style={{ borderColor: 'var(--mp-border)', background: 'var(--mp-panel-solid)' }}>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold" style={{ color: 'var(--mp-text-strong)' }}>
              {tx.listing?.title ?? 'Transaccion marketplace'}
            </h3>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--mp-text-faint)' }}>
              {viewAs === 'buyer' ? 'Miembro' : 'Comprador'}: <span style={{ color: 'var(--mp-text-muted)' }}>{otherParty.displayName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-colors"
            style={{ background: 'var(--mp-card-subtle)', color: 'var(--mp-text-muted)', border: '1px solid var(--mp-border)' }}
            aria-label="Cerrar detalle"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          <div
            className="rounded-2xl p-4"
            style={{ background: 'var(--mp-card-subtle)', border: '1px solid var(--mp-border)' }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={tx.status} label={sellerPaid ? 'Pago enviado' : getTxStatusLabel(tx, viewAs)} />
                <PaymentMethodBadge tx={tx} />
              </div>
              <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--mp-text-strong)' }}>
                ${Number(tx.amount).toLocaleString('es-VE')} {tx.currency}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs" style={{ color: 'var(--mp-text-faint)' }}>
              <span>Estado visible arriba para que identifiques en que punto esta la operacion.</span>
              <span>Creada: <span style={{ color: 'var(--mp-text-muted)' }}>{fmtDate(tx.createdAt)}</span></span>
            </div>
          </div>

          <div>
            <SectionHeader title="Que pasa ahora" />
            <DashboardStateCallout
              label={detailStateLabel}
              copy={detailStateCopy}
              tone={
                sellerPaid ? 'success' :
                  tx.status === 'RELEASED' ? 'info' :
                  tx.status === 'DISPUTED' ? 'danger' :
                    tx.status === 'PENDING_PAYMENT' || tx.status === 'PAYMENT_RECEIVED' || tx.status === 'VALIDATING' ? 'warning' :
                      'info'
              }
            />
          </div>

          <OperationNextStepCard
            state={operationCardState}
            role={viewAs}
            onReportPayment={onReportPayment}
            onMarkDelivered={viewAs === 'seller' ? handleMarkDelivered : undefined}
            onConfirmReceived={viewAs === 'buyer' ? handleConfirmReceived : undefined}
            onOpenDispute={operationCardState.canOpenDispute ? () => onOpenDispute?.(tx) : undefined}
            onOpenMessages={onOpenMessages}
            onViewOperation={undefined}
            onSetupPayout={viewAs === 'seller' ? onSetupPayout : undefined}
          />

          {viewAs === 'seller' && (
            <SellerFinancialSummary tx={tx} sellerPayoutMethod={sellerPayoutMethod} />
          )}

          <div>
            <SectionHeader title="Detalles de operacion" />
            <div className="grid gap-3 md:grid-cols-2">
              <PayoutDetailRow label="ID transaccion" value={tx.id} />
              <PayoutDetailRow label="Metodo de pago" value={payoutMethodLabel(tx.paymentMethod)} />
              <PayoutDetailRow label={buyerPaidWithBinance ? 'Referencia / hash Binance' : 'Referencia'} value={tx.paymentReference ?? 'Sin referencia reportada'} />
              {!buyerPaidWithBinance && (
                <PayoutDetailRow label="Banco emisor" value={tx.paymentSenderBank ?? 'Sin banco reportado'} />
              )}
              <PayoutDetailRow label="Fecha de pago" value={tx.paymentPaidAt ? fmtDate(tx.paymentPaidAt) : 'Sin fecha reportada'} />
              <PayoutDetailRow label="Fecha estimada de cierre" value={tx.escrowReleaseAt ? fmtDate(tx.escrowReleaseAt) : 'Aun sin fecha estimada'} />
              <PayoutDetailRow label="Siguiente paso" value={sellerPaid ? 'Pago enviado al vendedor. No hay acciones pendientes.' : getTxNextStep(tx, viewAs)} />
              {tx.frozenRate ? (
                <PayoutDetailRow
                  label="Tasa congelada"
                  value={`${tx.frozenRateSource ?? 'Tasa'} Bs ${roundMoney(Number(tx.frozenRate)).toFixed(2)}${tx.frozenRateFechaValor ? ` - ${fmtShortDate(tx.frozenRateFechaValor)}` : ''}`}
                />
              ) : (
                <PayoutDetailRow label="Tasa congelada" value="No disponible para esta operacion legacy" />
              )}
            </div>
          </div>

          {tx.adminNotes && (
            <div
              className="rounded-xl p-4 text-sm"
              style={{ background: 'var(--mp-card-subtle)', border: '1px solid var(--mp-border)' }}
            >
              <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--mp-text-faint)' }}>Nota interna</p>
              <p className="mt-2" style={{ color: 'var(--mp-text-muted)' }}>{tx.adminNotes}</p>
            </div>
          )}

          <div>
            <SectionHeader title="Semaforo de Estados" />
            <div className="space-y-0">
              {SEMAFORO_MILESTONES.map((milestone, idx) => {
                let state: 'completed' | 'current' | 'pending' = TERMINAL_STATUSES.includes(tx.status)
                  ? getSemaphoreState(
                      tx.status === 'CANCELLED' ? 'PENDING_PAYMENT' :
                        tx.status === 'PAYMENT_FAILED' ? 'PENDING_PAYMENT' :
                          tx.status === 'REFUNDED' ? 'INITIATED' : tx.status,
                      milestone.status,
                    )
                  : tx.status === 'DISPUTED'
                    ? getSemaphoreState('IN_ESCROW', milestone.status)
                    : getSemaphoreState(tx.status, milestone.status)

                if (tx.status === 'RELEASED' && milestone.status === 'RELEASED') {
                  state = 'completed'
                }

                if (tx.status === 'RELEASED' && !sellerPaid && milestone.status === 'PAYOUT_SENT') {
                  state = 'current'
                }

                if (tx.status === 'RELEASED' && sellerPaid && milestone.status === 'PAYOUT_SENT') {
                  state = 'completed'
                }

                const dotColor =
                  state === 'completed' ? '#4ade80' :
                    state === 'current' ? '#f59e0b' :
                      '#ef4444'

                const dotGlow =
                  state === 'completed' ? '0 0 12px rgba(74,222,128,0.5)' :
                    state === 'current' ? '0 0 16px rgba(245,158,11,0.6)' :
                      '0 0 6px rgba(239,68,68,0.3)'

                const bgColor =
                  state === 'completed' ? 'rgba(74,222,128,0.08)' :
                    state === 'current' ? 'rgba(245,158,11,0.1)' :
                      'rgba(239,68,68,0.04)'

                const textColor =
                  state === 'completed' ? 'var(--mp-text-strong)' :
                    state === 'current' ? '#f59e0b' :
                      'var(--mp-text-faint)'

                const isLast = idx === SEMAFORO_MILESTONES.length - 1

                return (
                  <div key={milestone.status} className="flex items-stretch gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className="w-3.5 h-3.5 rounded-full flex-shrink-0 mt-1"
                        style={{ background: dotColor, boxShadow: dotGlow }}
                      />
                      {!isLast && (
                        <div
                          className="w-px flex-1 my-1"
                          style={{ background: state === 'completed' ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.06)' }}
                        />
                      )}
                    </div>
                    <div
                      className={`flex-1 rounded-xl px-3 py-2 ${!isLast ? 'mb-1' : ''}`}
                      style={{ background: bgColor, border: state === 'current' ? `1px solid rgba(245,158,11,0.25)` : '1px solid transparent' }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium" style={{ color: textColor }}>
                          {milestone.label}
                        </p>
                        {state === 'completed' && (
                          <span className="text-[10px] font-semibold" style={{ color: '#4ade80' }}>✓</span>
                        )}
                        {state === 'current' && (
                          <span className="text-[10px] font-semibold animate-pulse" style={{ color: '#f59e0b' }}>●</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              {TERMINAL_STATUSES.includes(tx.status) && (
                <div className="flex items-stretch gap-3 mt-1">
                  <div className="flex flex-col items-center">
                    <div
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0 mt-1"
                      style={{ background: '#6b7280', boxShadow: '0 0 12px rgba(107,114,128,0.5)' }}
                    />
                  </div>
                  <div
                    className="flex-1 rounded-xl px-3 py-2"
                    style={{ background: 'rgba(107,114,128,0.08)', border: '1px solid rgba(107,114,128,0.2)' }}
                  >
                    <p className="text-xs font-medium" style={{ color: 'var(--mp-text-faint)' }}>
                      {STATUS_CONFIG[tx.status]?.label ?? tx.status}
                    </p>
                  </div>
                </div>
              )}
              {tx.status === 'DISPUTED' && (
                <div className="flex items-stretch gap-3 mt-1">
                  <div className="flex flex-col items-center">
                    <div
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0 mt-1"
                      style={{ background: '#f97316', boxShadow: '0 0 14px rgba(249,115,22,0.6)' }}
                    />
                  </div>
                  <div
                    className="flex-1 rounded-xl px-3 py-2"
                    style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)' }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium" style={{ color: '#f97316' }}>En Disputa</p>
                      <span className="text-[10px] font-semibold animate-pulse" style={{ color: '#f97316' }}>●</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div
            className="flex flex-wrap gap-2 rounded-2xl p-3"
            style={{ background: 'var(--mp-card-subtle)', border: '1px solid var(--mp-border)' }}
          >
            {viewAs === 'buyer' && tx.status === 'PENDING_PAYMENT' && !cardCoversReportPayment && (
              <a
                href="/marketplace"
                className="rounded-xl px-4 py-2 text-sm font-semibold transition-all hover:brightness-110"
                style={{ background: 'rgba(249,115,22,0.12)', color: '#f97316', border: '1px solid rgba(249,115,22,0.25)' }}
              >
                Reportar pago
              </a>
            )}
            {viewAs === 'buyer' && tx.status === 'IN_ESCROW' && hasSellerDeliveryAudit(tx) && !cardCoversConfirmReceived && (
              <button
                type="button"
                onClick={() => { void handleConfirmReceived() }}
                className="rounded-xl px-4 py-2 text-sm font-semibold transition-all hover:brightness-110"
                style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }}
              >
                Confirmar recibido
              </button>
            )}
            {viewAs === 'seller' && tx.status === 'IN_ESCROW' && !hasSellerDeliveryAudit(tx) && !cardCoversMarkDelivered && (
              <button
                type="button"
                onClick={() => { void handleMarkDelivered() }}
                className="rounded-xl px-4 py-2 text-sm font-semibold transition-all hover:brightness-110"
                style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }}
              >
                Marcar entregado
              </button>
            )}
            {tx.listing?.slug && (
              <Link
                href={`/marketplace/${tx.listing.slug}`}
                className="rounded-xl px-4 py-2 text-sm font-semibold"
                style={{ background: 'var(--mp-card-subtle)', color: 'var(--mp-text-strong)', border: '1px solid var(--mp-border)' }}
              >
                Ver listing
              </Link>
            )}
            {onOpenMessages && !cardCoversOpenMessages && (
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

function PayoutDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="min-w-0 rounded-xl px-3 py-2.5"
      style={{ background: 'var(--mp-card-subtle)', border: '1px solid var(--mp-border)' }}
    >
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-normal" style={{ color: 'var(--mp-text-faint)' }}>{label}</p>
        <p className="mt-1 text-[12px] leading-snug [overflow-wrap:anywhere]" style={{ color: 'var(--mp-text-strong)' }}>{value}</p>
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
        background: 'var(--mp-card)',
        border: '1px solid var(--mp-border)',
        boxShadow: 'var(--mp-card-shadow)',
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold" style={{ color: 'var(--mp-text-strong)' }}>{payoutMethodLabel(method.methodType)}</p>
            {method.isDefault && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}
              >
                Predeterminado
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] leading-relaxed [overflow-wrap:anywhere]" style={{ color: 'var(--mp-text-faint)' }}>{method.displayLabel}</p>
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

function ActionCenterSection({
  items,
  onAction,
  busyKey,
}: {
  items: ActionItem[]
  onAction: (item: ActionItem) => void
  busyKey: string | null
}) {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<ActionPriority, boolean>>({
    required: true,
    review: true,
    pending: true,
    closed: true,
  })
  if (items.length === 0) return null

  const requiredCount = items.filter(item => item.priority === 'required').length
  const reviewCount = items.filter(item => item.priority === 'review').length
  const groupConfigs: Array<{
    id: ActionPriority
    title: string
    subtitle: string
    icon: LucideIcon
    accent: string
  }> = [
    {
      id: 'required',
      title: 'Requiere tu accion',
      subtitle: 'Bloquea el avance de una compra, venta o cobro.',
      icon: AlertTriangle,
      accent: ACTION_ACCENT.required,
    },
    {
      id: 'review',
      title: 'En revision Turpial',
      subtitle: 'Pagos o disputas que estan siendo validadas por el equipo.',
      icon: Clock,
      accent: ACTION_ACCENT.review,
    },
    {
      id: 'pending',
      title: 'Esperando a otra parte',
      subtitle: 'Seguimiento sin accion inmediata de tu lado.',
      icon: Shield,
      accent: ACTION_ACCENT.pending,
    },
    {
      id: 'closed',
      title: 'Cerradas',
      subtitle: 'Operaciones finalizadas o sin bloqueo actual.',
      icon: CheckCircle2,
      accent: ACTION_ACCENT.closed,
    },
  ]
  const groups = groupConfigs
    .map(group => ({ ...group, items: items.filter(item => item.priority === group.id) }))
    .filter(group => group.items.length > 0)

  function toggleGroup(groupId: ActionPriority) {
    setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }))
  }

  return (
    <div
      className="overflow-hidden rounded-2xl"
      style={{
        background: 'var(--mp-card)',
        border: '1px solid var(--mp-border)',
        boxShadow: 'var(--mp-card-shadow)',
      }}
    >
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5"
        style={{
          background: requiredCount > 0
            ? 'linear-gradient(135deg, rgba(249,115,22,0.08) 0%, var(--mp-card-subtle) 100%)'
            : 'var(--mp-card-subtle)',
          borderBottom: '1px solid var(--mp-border)',
        }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <div
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
            style={{
              background: requiredCount > 0 ? 'rgba(249,115,22,0.14)' : 'rgba(0,174,239,0.1)',
              border: `1px solid ${requiredCount > 0 ? 'rgba(249,115,22,0.25)' : 'rgba(0,174,239,0.18)'}`,
            }}
          >
            <Zap size={14} color={requiredCount > 0 ? '#f97316' : '#00aeef'} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold" style={{ color: 'var(--mp-text-strong)' }}>Bandeja prioritaria</p>
            <p className="truncate text-[10px]" style={{ color: 'var(--mp-text-faint)' }}>
              {items.length} mensaje{items.length !== 1 ? 's' : ''} agrupado{items.length !== 1 ? 's' : ''}
              {requiredCount > 0 && <span className="ml-1" style={{ color: '#f97316' }}>- {requiredCount} requiere{requiredCount === 1 ? '' : 'n'} accion</span>}
              {reviewCount > 0 && <span className="ml-1" style={{ color: '#f59e0b' }}>- {reviewCount} en revision</span>}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2 p-2 sm:p-3">
        {groups.map(group => {
          const GroupIcon = group.icon
          const isCollapsed = collapsedGroups[group.id]
          const buyerCount = group.items.filter(item => item.viewAs === 'buyer').length
          const sellerCount = group.items.length - buyerCount

          return (
            <div
              key={group.id}
              className="overflow-hidden rounded-xl"
              style={{ background: 'var(--mp-card-subtle)', border: `1px solid ${CHIP_BORDER[group.id]}` }}
            >
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.02]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                    style={{ background: CHIP_BG[group.id], color: group.accent, border: `1px solid ${CHIP_BORDER[group.id]}` }}
                  >
                    <GroupIcon size={14} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold" style={{ color: 'var(--mp-text-strong)' }}>
                      {group.title}
                    </span>
                    <span className="mt-0.5 block truncate text-[10px]" style={{ color: 'var(--mp-text-faint)' }}>
                      {group.subtitle}
                    </span>
                  </span>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <span className="hidden text-[10px] sm:inline" style={{ color: 'var(--mp-text-faint)' }}>
                    {buyerCount > 0 && `${buyerCount} compra${buyerCount === 1 ? '' : 's'}`}
                    {buyerCount > 0 && sellerCount > 0 && ' - '}
                    {sellerCount > 0 && `${sellerCount} venta${sellerCount === 1 ? '' : 's'}`}
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums"
                    style={{ background: CHIP_BG[group.id], color: group.accent }}
                  >
                    {group.items.length}
                  </span>
                  <ChevronRight
                    size={14}
                    className={cn('transition-transform duration-200', !isCollapsed && 'rotate-90')}
                    style={{ color: 'var(--mp-text-faint)' }}
                  />
                </div>
              </button>

              {!isCollapsed && (
                <div className="divide-y" style={{ borderColor: 'var(--mp-border)' }}>
                  {group.items.map(item => {
                    const isBusy = busyKey === item.key
                    const hasCta = Boolean(item.ctaLabel && item.ctaType)
                    const listingTitle = item.tx.listing?.title ?? 'Listing eliminado'
                    const otherParty = item.viewAs === 'buyer' ? item.tx.seller : item.tx.buyer

                    return (
                      <div
                        key={item.key}
                        className="flex flex-col gap-3 px-4 py-3 transition-colors hover:bg-[rgba(255,255,255,0.01)] sm:flex-row sm:items-center"
                      >
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <button
                            type="button"
                            onClick={() => onAction(item)}
                            className="inline-flex flex-shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-all hover:brightness-110 active:scale-95 cursor-pointer"
                            style={{
                              background: CHIP_BG[item.priority],
                              border: `1px solid ${CHIP_BORDER[item.priority]}`,
                              color: item.accent,
                            }}
                          >
                            {item.priority === 'required' && <AlertTriangle size={9} />}
                            {item.priority === 'review' && <Clock size={9} />}
                            {item.priority === 'pending' && <Shield size={9} />}
                            {item.priority === 'closed' && <CheckCircle2 size={9} />}
                            {item.chipLabel}
                          </button>

                          <div className="min-w-0">
                            <p className="text-[11px] leading-snug [overflow-wrap:anywhere]" style={{ color: 'var(--mp-text-muted)' }}>{item.description}</p>
                            <p className="mt-0.5 text-[10px] leading-snug [overflow-wrap:anywhere] sm:truncate" style={{ color: 'var(--mp-text-faint)' }}>
                              <span className="font-medium" style={{ color: 'var(--mp-text-soft)' }}>{listingTitle}</span>
                              <span className="mx-1">-</span>
                              {item.viewAs === 'buyer' ? 'Vendedor: ' : 'Comprador: '}
                              {otherParty.displayName}
                              <span className="mx-1">-</span>
                              ${Number(item.tx.amount).toLocaleString('es-VE')}
                            </p>
                          </div>
                        </div>

                        {hasCta && (
                          <button
                            onClick={() => onAction(item)}
                            disabled={isBusy || item.disabled}
                            className="inline-flex w-full flex-shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold transition-all disabled:opacity-50 sm:w-auto sm:whitespace-nowrap sm:py-1.5"
                            style={{
                              background: item.priority === 'required' ? 'rgba(249,115,22,0.12)' : 'rgba(0,174,239,0.08)',
                              border: `1px solid ${item.priority === 'required' ? 'rgba(249,115,22,0.25)' : 'rgba(0,174,239,0.2)'}`,
                              color: item.priority === 'required' ? '#f97316' : '#00aeef',
                            }}
                          >
                            {isBusy ? (
                              <Loader2 size={11} className="animate-spin" />
                            ) : item.ctaType === 'confirm-delivery' ? (
                              <CheckCircle2 size={11} />
                            ) : item.ctaType === 'seller-deliver' ? (
                              <Send size={11} />
                            ) : item.ctaType === 'payout-setup' ? (
                              <Wallet size={11} />
                            ) : item.ctaType === 'open-messages' ? (
                              <MessageSquare size={11} />
                            ) : (
                              <ExternalLink size={11} />
                            )}
                            {item.ctaLabel}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

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
  referralEarnings: number
  referralLinks: object[]
  referralPendingPayouts: object[]
  listingReferralStats: object[]
  referredTransactions: object[]
  initialTab?: Tab
  initialThreadId?: string
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
  referralEarnings,
  referralLinks: rawReferralLinks,
  referralPendingPayouts: rawReferralPendingPayouts,
  listingReferralStats: rawListingReferralStats,
  referredTransactions: rawReferredTransactions,
  initialTab,
  initialThreadId,
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
  const referralLinks = rawReferralLinks as Array<{
    id: string; code: string; listingId: string; slug?: string; clicks: number; conversions: number; totalEarned: unknown; createdAt: string | Date
  }>
  const referralPendingPayouts = rawReferralPendingPayouts as Array<{
    id: string; amount: string; currency: string; status: string; reference: string; createdAt: string | Date
  }>
  const listingReferralStats = rawListingReferralStats as Array<{
    listingId: string; title: string; slug: string
    linksCreated: number; totalClicks: number; totalConversions: number; totalEarnedForReferrers: number
  }>
  const referredTransactions = rawReferredTransactions as Array<{
    id: string; amount: string; currency: string; status: string; platformFeeAmount?: string; createdAt: string | Date
    buyer: { id: string; displayName: string; email: string }
    listing: { id: string; title: string; slug: string } | null
  }>
  const [threads, setThreads] = useState<DashThread[]>(initialThreads)
  const [payoutMethods, setPayoutMethods] = useState<DashPayoutMethod[]>(initialPayoutMethods)
  const [payoutBusyId, setPayoutBusyId] = useState<string | null>(null)
  const [payoutMessage, setPayoutMessage] = useState<string | null>(null)
  const [dashboardMessage, setDashboardMessage] = useState<string | null>(null)
  const [dashboardMessageTone, setDashboardMessageTone] = useState<'success' | 'error' | 'info'>('info')
  const [payoutSubmitting, setPayoutSubmitting] = useState(false)
  const [actionBusyKey, setActionBusyKey] = useState<string | null>(null)
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
    if (initialTab) setActiveTab(initialTab)
  }, [initialTab])

  useEffect(() => {
    if (initialThreadId && initialThreads.length > 0) {
      const targetThread = initialThreads.find(t => t.id === initialThreadId)
      if (targetThread) {
        setActiveTab('messages')
        setTimeout(() => handleOpenThread(targetThread), 100)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialThreadId, initialThreads])

  async function refreshThreadsAndUnread() {
    const [unreadResult, threadsResult] = await Promise.allSettled([
      getUnreadCount(),
      getMyThreads(),
    ])

    if (unreadResult.status === 'fulfilled' && unreadResult.value.success && unreadResult.value.data) {
      setUnreadCount(unreadResult.value.data.count)
    }

    if (threadsResult.status === 'fulfilled' && threadsResult.value.success && threadsResult.value.data) {
      setThreads(threadsResult.value.data as DashThread[])
    }
  }

  useEffect(() => {
    const id = setInterval(() => {
      void refreshThreadsAndUnread()
    }, 20_000)
    return () => clearInterval(id)
  }, [])

  const unreadThreads = threads.filter((thread) => getTxUnreadCount(thread, session.userId) > 0)
  const readThreads = threads.filter(t => !unreadThreads.some(unreadThread => unreadThread.id === t.id))

  const pendingValidationSales = sales.filter(tx => ['PAYMENT_RECEIVED', 'VALIDATING'].includes(tx.status))
  const escrowSales = sales.filter(tx => ['IN_ESCROW', 'DELIVERY_CONFIRMED'].includes(tx.status))
  const releasedSales = sales.filter(tx => tx.status === 'RELEASED')
  const payoutSentSales = releasedSales.filter(tx => hasSellerPaidAudit(tx))
  const releasedPendingPayoutSales = releasedSales.filter(tx => !hasSellerPaidAudit(tx))
  const hasUsablePayoutMethod = payoutMethods.length > 0
  const actionItems = deriveActionItems(purchases, sales, hasUsablePayoutMethod)
  const defaultPayoutMethod = payoutMethods.find(method => method.isDefault) ?? payoutMethods[0] ?? null
  const sellerPayoutMethod = mapSellerPayoutMethod(defaultPayoutMethod)
  const payoutReadySales = hasUsablePayoutMethod ? releasedPendingPayoutSales : []
  const releasedWithoutPayoutMethodSales = hasUsablePayoutMethod ? [] : releasedPendingPayoutSales
  const payoutRelevantSales = sales.filter(tx => ['IN_ESCROW', 'DELIVERY_CONFIRMED', 'RELEASED'].includes(tx.status))
  const payoutFor = (tx: DashTransaction) => getTxPayoutCalculation(tx, sellerPayoutMethod)
  const payoutNetTotal = (rows: DashTransaction[]) => roundMoney(rows.reduce((sum, tx) => sum + payoutFor(tx).netUSD, 0))
  const operationalBankFees = payoutRelevantSales.reduce((sum, tx) => sum + payoutFor(tx).bankFeeBS, 0)
  const operationalBinanceFees = payoutRelevantSales.reduce((sum, tx) => sum + payoutFor(tx).usdtFee, 0)
  const operationalCommissions = payoutRelevantSales.reduce((sum, tx) => sum + payoutFor(tx).platformFeeUSD, 0)
  const operationalTotalFees = payoutRelevantSales.reduce((sum, tx) => {
    const payout = payoutFor(tx)
    return sum + Math.max(0, Number(tx.amount ?? 0) - payout.netUSD)
  }, 0)
  const operationalSellerNet = payoutNetTotal(payoutRelevantSales)
  const pendingValidationNet = payoutNetTotal(pendingValidationSales)
  const protectedInProcessNet = payoutNetTotal(escrowSales)
  const payoutReadyNet = payoutNetTotal(payoutReadySales)
  const payoutSentNet = payoutNetTotal(payoutSentSales)
  const releasedWithoutPayoutMethodNet = payoutNetTotal(releasedWithoutPayoutMethodSales)
  const sellerCanAddPayoutProfile = Boolean(profile?.isSeller && payoutMethods.length === 0)
  const sellerNeedsPayoutProfile = sellerCanAddPayoutProfile && payoutRelevantSales.length > 0
  const commissionLabel = 'Comision 5%'
  const commissionSub = 'base plataforma'
  const commissionCopy = 'Comision base plataforma: 5%. Cargo bancario: 0.3%. Cargo adicional Binance: $0.06.'

  const counts: Record<Tab, number> = {
    my_store:  myListings.length,
    sales:     sales.length,
    purchases: purchases.length,
    messages:  unreadCount,
    favorites: favorites.length,
    payouts:   payoutRelevantSales.length,
    referrals: referredTransactions.length,
  }

  function handleTabChange(tab: Tab) {
    setActiveTab(tab)
    router.replace(`/marketplace/dashboard?tab=${tab}`, { scroll: false })
  }

  async function refreshTransactionDetail(txId: string) {
    const result = await getTransaction(txId)
    if (result.success && result.data) {
      setSelectedTxDetail(result.data as DashTransactionDetail)
      return true
    }
    return false
  }

  async function handleActionCenterCta(item: ActionItem) {
    if (item.disabled || !item.ctaType) return
    setActionBusyKey(item.key)
    setDashboardMessage(null)

    try {
      if (item.ctaType === 'view-detail') {
        await handleOpenTransaction(item.tx, item.viewAs)
      } else if (item.ctaType === 'confirm-delivery') {
        const confirmed = window.confirm('Confirma solo si ya recibiste y revisaste el producto o servicio. Esta accion no paga al vendedor; deja la operacion lista para liberacion admin.')
        if (!confirmed) return
        const result = await confirmDelivery(item.tx.id)
        setDashboardMessageTone(result.success ? 'success' : 'error')
        setDashboardMessage(result.message)
        if (result.success) router.refresh()
      } else if (item.ctaType === 'seller-deliver') {
        const confirmed = window.confirm('Marca entregado solo cuando ya completaste la entrega. Esta accion no libera fondos.')
        if (!confirmed) return
        const result = await sellerDeliver(item.tx.id)
        setDashboardMessageTone(result.success ? 'success' : 'error')
        setDashboardMessage(result.message)
        if (result.success) router.refresh()
      } else if (item.ctaType === 'open-messages') {
        const thread = threads.find(t => {
          const sameParties = t.buyerId === item.tx.buyer.id && t.sellerId === item.tx.seller.id
          const sameListing = !item.tx.listing?.id || t.listing?.id === item.tx.listing.id
          return sameParties && sameListing
        })
        if (thread) {
          handleOpenThread(thread)
        } else {
          handleTabChange('messages')
          setDashboardMessageTone('info')
          setDashboardMessage('No encontre un hilo exacto para esta operacion. Revisa tus conversaciones activas.')
        }
      } else if (item.ctaType === 'payout-setup') {
        handleTabChange('payouts')
      }
    } finally {
      setActionBusyKey(null)
    }
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

  async function handleChatSyncNeeded(reason: ChatSyncReason) {
    await refreshThreadsAndUnread()

    if (reason === 'send_error') {
      setDashboardMessageTone('error')
      setDashboardMessage('No se pudo enviar el mensaje. Intenta de nuevo.')
      return
    }

    if (reason === 'refresh_error') {
      setDashboardMessageTone('info')
      setDashboardMessage('Mensaje enviado. Estamos actualizando el estado de la conversación.')
    }
  }

  function updatePayoutField(field: keyof typeof payoutForm, value: string) {
    setPayoutForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleAddPayoutMethod() {
    const formType = payoutForm.methodType
    const normalizedType = normalizePayoutMethodType(formType)
    const methodCurrency = formType === 'BINANCE_PAY' ? 'USD' : 'VES'
    const displayLabel = payoutForm.displayLabel.trim()
    const normalizedPhone = formType === 'PAGO_MOVIL'
      ? normalizeVenezuelanMobilePhone(payoutForm.phone)
      : payoutForm.phone.trim()

    if (formType === 'PAGO_MOVIL' && !normalizedPhone) {
      setPayoutMessage('Ingresa un telefono movil venezolano valido en formato 04XXXXXXXXX.')
      return
    }

    const detailPayload =
      formType === 'PAGO_MOVIL'
        ? { titular: payoutForm.holder, cedula: payoutForm.identifier, telefono: normalizedPhone ?? '', banco: payoutForm.bank }
        : formType === 'BANK_TRANSFER'
          ? { beneficiario: payoutForm.holder, cedula: payoutForm.identifier, cuenta: payoutForm.accountNumber, banco: payoutForm.bank }
          : formType === 'BINANCE_PAY'
            ? { pay_id: payoutForm.payId, usuario: payoutForm.username }
            : { wallet: payoutForm.wallet }

    const detailsAreValid = Object.values(detailPayload).every(value => String(value).trim().length > 0)
    if (!displayLabel || !detailsAreValid) {
      setPayoutMessage('Completa la etiqueta y todos los datos del metodo.')
      return
    }

    const serializedDetails = JSON.stringify(detailPayload)
    const alreadyRegistered = payoutMethods.some(method =>
      method.methodType === normalizedType &&
      method.encryptedData === serializedDetails,
    )
    if (alreadyRegistered) {
      setPayoutMessage('Este metodo de cobro ya esta registrado.')
      return
    }

    setPayoutSubmitting(true)
    setPayoutMessage(null)

    const result = await addPayoutMethod({
      methodType: normalizedType,
      displayLabel,
      encryptedData: serializedDetails,
      currency: methodCurrency,
      isDefault: payoutMethods.length === 0,
    })

    if (result.success && result.data) {
      const createdMethod: DashPayoutMethod = {
        id: result.data.id,
        methodType: normalizedType,
        displayLabel,
        encryptedData: serializedDetails,
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
      className="mp-dashboard-surface min-h-screen"
      style={{ background: 'var(--mp-page-bg)' }}
    >
      {/* Top bar */}
      <div
        className="sticky top-0 z-40 flex items-center gap-4 px-4 sm:px-6 py-3"
        style={{
          background: 'var(--mp-panel-solid)',
          borderBottom: '1px solid var(--mp-border)',
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

        <MarketplaceThemeToggle compact />

        <div className="hidden items-center gap-1.5 text-[10px] text-[#5a5a5a] sm:flex">
          <Activity size={10} className="text-[#4ade80]" />
          <span>
            {new Date().toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 space-y-5">

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

        <ActionCenterSection
          items={actionItems}
          onAction={handleActionCenterCta}
          busyKey={actionBusyKey}
        />

        {dashboardMessage && (
          <div
            className="rounded-xl px-4 py-3 text-xs"
            style={
              dashboardMessageTone === 'success'
                ? { background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80' }
                : dashboardMessageTone === 'error'
                  ? { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }
                  : { background: 'rgba(0,174,239,0.1)', border: '1px solid rgba(0,174,239,0.2)', color: '#00aeef' }
            }
          >
            {dashboardMessage}
          </div>
        )}

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
                <CollapsibleSection title="Mis Publicaciones" count={myListings.length} defaultCollapsed={true}>
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
                </CollapsibleSection>
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
                      <p className="text-sm font-semibold text-[#f2f2f2]">Completa tus datos de cobro para poder recibir pagos de ventas</p>
                      <p className="mt-1 text-xs text-[#a0a0a0]">
                        Ya tienes ventas en proceso o listas para cobrar. Sin este paso no se puede completar el pago al vendedor.
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
                style={{ background: 'var(--mp-card)', border: '1px solid var(--mp-border)', boxShadow: 'var(--mp-card-shadow)' }}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--mp-text-strong)' }}>Centro de mensajes</h3>
                    <p className="mt-1 text-xs" style={{ color: 'var(--mp-text-faint)' }}>
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
                  background: 'linear-gradient(135deg, rgba(0,174,239,0.1) 0%, var(--mp-card) 58%, rgba(74,222,128,0.06) 100%)',
                  border: '1px solid var(--mp-border)',
                  boxShadow: 'var(--mp-card-shadow)',
                }}
              >
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.72fr)] lg:items-end">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-normal text-[#00aeef]">Cobros del vendedor</p>
                    <h2 className="mt-2 text-2xl font-semibold leading-tight" style={{ color: 'var(--mp-text-strong)' }}>Estado claro de tus ventas y cobros</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: 'var(--mp-text-muted)' }}>
                      Separamos pagos en revision, ventas en proceso y dinero listo para cobrar para que sepas que accion corresponde.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
                    {[
                      { label: 'En revision', value: pendingValidationSales.length, amount: fmtUSD(pendingValidationNet), helper: 'pagos reportados', color: '#f59e0b' },
                      { label: 'En proceso', value: escrowSales.length, amount: fmtUSD(protectedInProcessNet), helper: 'aprobadas, no cobrables', color: '#00aeef' },
                      { label: 'Pago pendiente', value: payoutReadySales.length, amount: fmtUSD(payoutReadyNet), helper: 'liberado con metodo', color: '#4ade80' },
                      { label: 'Pago enviado', value: payoutSentSales.length, amount: fmtUSD(payoutSentNet), helper: 'cierre completo', color: '#22c55e' },
                      { label: 'Sin metodo', value: releasedWithoutPayoutMethodSales.length, amount: fmtUSD(releasedWithoutPayoutMethodNet), helper: 'liberado no cobrable', color: '#f97316' },
                    ].map(item => (
                      <div
                        key={item.label}
                        className="min-w-0 rounded-xl px-3 py-3 text-left"
                        style={{ background: 'var(--mp-card-subtle)', border: `1px solid ${item.color}30` }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[10px] font-medium leading-tight" style={{ color: 'var(--mp-text-faint)' }}>{item.label}</p>
                          <p className="text-xl font-semibold leading-none tabular-nums" style={{ color: 'var(--mp-text-strong)' }}>{item.value}</p>
                        </div>
                        <p className="mt-2 text-sm font-semibold tabular-nums" style={{ color: 'var(--mp-text-strong)' }}>{item.amount}</p>
                        <p className="mt-1 text-[10px] leading-tight" style={{ color: 'var(--mp-text-faint)' }}>{item.helper}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                <KpiCard icon={Clock} label="Monto en revision" value={fmtUSD(pendingValidationNet)} sub={`${pendingValidationSales.length} pago${pendingValidationSales.length !== 1 ? 's' : ''} por revisar`} accent="#f59e0b" tone="primary" />
                <KpiCard icon={Shield} label="Monto en proceso" value={fmtUSD(protectedInProcessNet)} sub={`${escrowSales.length} venta${escrowSales.length !== 1 ? 's' : ''} no cobrable${escrowSales.length !== 1 ? 's' : ''}`} accent="#00aeef" tone="primary" />
                <KpiCard icon={Landmark} label="Pago pendiente" value={fmtUSD(payoutReadyNet)} sub={`${payoutReadySales.length} venta${payoutReadySales.length !== 1 ? 's' : ''} liberada${payoutReadySales.length !== 1 ? 's' : ''} con metodo`} accent="#4ade80" tone="primary" />
                <KpiCard icon={CheckCircle2} label="Pago enviado" value={fmtUSD(payoutSentNet)} sub={`${payoutSentSales.length} venta${payoutSentSales.length !== 1 ? 's' : ''} completada${payoutSentSales.length !== 1 ? 's' : ''}`} accent="#22c55e" tone="primary" />
                <KpiCard icon={AlertTriangle} label="Sin metodo configurado" value={fmtUSD(releasedWithoutPayoutMethodNet)} sub={`${releasedWithoutPayoutMethodSales.length} venta${releasedWithoutPayoutMethodSales.length !== 1 ? 's' : ''} liberada${releasedWithoutPayoutMethodSales.length !== 1 ? 's' : ''} bloqueada${releasedWithoutPayoutMethodSales.length !== 1 ? 's' : ''}`} accent="#f97316" tone="primary" />
              </div>

              {payoutReadySales.length === 0 && releasedWithoutPayoutMethodSales.length === 0 && (
                <div
                  className="rounded-2xl p-4 text-sm leading-relaxed"
                  style={{ background: 'rgba(0,174,239,0.06)', border: '1px solid rgba(0,174,239,0.16)', color: 'var(--mp-text-muted)' }}
                >
                  <p className="font-semibold" style={{ color: 'var(--mp-text-strong)' }}>No tienes fondos disponibles para cobrar todavia.</p>
                  <p className="mt-1">Tus ventas apareceran aqui cuando esten liberadas y tengas metodo de cobro configurado. RELEASED indica fondos liberados; el cierre completo ocurre cuando el admin registra pago enviado.</p>
                </div>
              )}

              {releasedWithoutPayoutMethodSales.length > 0 && (
                <div
                  className="rounded-2xl p-4 text-sm leading-relaxed"
                  style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', color: 'var(--mp-text-muted)' }}
                >
                  <p className="font-semibold text-[#f97316]">Pendiente: configura metodo de cobro.</p>
                  <p className="mt-1">Tienes ventas liberadas, pero debes configurar un metodo de cobro para recibirlas.</p>
                </div>
              )}

              <div
                className="rounded-2xl p-5"
                style={{ background: 'var(--mp-panel)', border: '1px solid var(--mp-border)' }}
              >
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--mp-text-strong)' }}>Cargos y comisiones</h3>
                    <p className="mt-1 text-xs" style={{ color: 'var(--mp-text-faint)' }}>Informacion secundaria para entender como se calcula el monto estimado.</p>
                  </div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--mp-text-muted)' }}>Total descontado: <span style={{ color: 'var(--mp-text-strong)' }}>{fmtUSD(operationalTotalFees)}</span></p>
                </div>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                  <KpiCard icon={CreditCard} label={commissionLabel} value={fmtUSD(operationalCommissions)} sub={commissionSub} accent="#f59e0b" tone="compact" />
                  <KpiCard icon={Landmark} label="Cargo bancario 0.3%" value={fmtUSD(operationalBankFees)} sub="pago movil / transferencia" accent="#ffc107" tone="compact" />
                  <KpiCard icon={Wallet} label="Cargo Binance" value={fmtUSD(operationalBinanceFees)} sub="$0.06 por operacion" accent="#00aeef" tone="compact" />
                </div>
              </div>

              <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.6fr)]">
                <div
                  className="rounded-2xl p-5 space-y-5"
                  style={{
                    background: 'var(--mp-card)',
                    border: '1px solid var(--mp-border)',
                    boxShadow: 'var(--mp-card-shadow)',
                  }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold" style={{ color: 'var(--mp-text-strong)' }}>Datos de cobro del vendedor</h3>
                      <p className="mt-1 max-w-2xl text-xs leading-relaxed" style={{ color: 'var(--mp-text-muted)' }}>
                        Tus datos de cobro se usan solo cuando una venta queda lista para pago al vendedor.
                      </p>
                    </div>
                    <span
                      className="rounded-full px-2 py-1 text-[10px] font-semibold"
                      style={{ background: 'rgba(0,174,239,0.08)', color: '#00aeef', border: '1px solid rgba(0,174,239,0.15)' }}
                    >
                      Pago procesado
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

                  {sellerCanAddPayoutProfile ? (
                    <>
                      {sellerNeedsPayoutProfile ? (
                        <div
                          className="rounded-xl p-3 text-xs leading-relaxed"
                          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)', color: '#f5d08a' }}
                        >
                          Completa tus datos de cobro para poder recibir pagos de ventas liberadas. Las ventas en proceso aun no son cobrables; las liberadas sin metodo quedan bloqueadas hasta registrar uno.
                        </div>
                      ) : (
                        <div
                          className="rounded-xl p-3 text-xs leading-relaxed"
                          style={{ background: 'rgba(0,174,239,0.06)', border: '1px solid rgba(0,174,239,0.14)', color: 'var(--mp-text-muted)' }}
                        >
                          Puedes dejar tus datos de cobro registrados ahora para que el equipo los tenga listos cuando una venta avance.
                        </div>
                      )}

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
                                : { background: 'var(--mp-card-subtle)', color: 'var(--mp-text-muted)', border: '1px solid var(--mp-border)' }
                            }
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5 sm:col-span-2">
                          <label className="text-xs" style={{ color: 'var(--mp-text-muted)' }}>Etiqueta interna</label>
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
                              <label className="text-xs" style={{ color: 'var(--mp-text-muted)' }}>Titular / beneficiario</label>
                              <input value={payoutForm.holder} onChange={e => updatePayoutField('holder', e.target.value)} className="w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(20,20,20,0.8)] px-4 py-3 text-sm text-[#f2f2f2] outline-none" />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs" style={{ color: 'var(--mp-text-muted)' }}>Cedula / RIF</label>
                              <input value={payoutForm.identifier} onChange={e => updatePayoutField('identifier', e.target.value)} className="w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(20,20,20,0.8)] px-4 py-3 text-sm text-[#f2f2f2] outline-none" />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs" style={{ color: 'var(--mp-text-muted)' }}>Banco</label>
                              <select
                                value={payoutForm.bank}
                                onChange={e => updatePayoutField('bank', e.target.value)}
                                className="w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(20,20,20,0.8)] px-4 py-3 text-sm text-[#f2f2f2] outline-none"
                              >
                                <option value="">Selecciona banco</option>
                                {VENEZUELAN_BANK_OPTIONS.map((bank) => (
                                  <option key={bank.code} value={bank.label}>
                                    {bank.displayLabel}
                                  </option>
                                ))}
                              </select>
                            </div>
                            {payoutForm.methodType === 'PAGO_MOVIL' ? (
                              <div className="space-y-1.5">
                                <label className="text-xs" style={{ color: 'var(--mp-text-muted)' }}>Telefono</label>
                                <input
                                  value={payoutForm.phone}
                                  onChange={e => updatePayoutField('phone', e.target.value)}
                                  onBlur={() => {
                                    const normalized = normalizeVenezuelanMobilePhone(payoutForm.phone)
                                    if (normalized) updatePayoutField('phone', normalized)
                                  }}
                                  inputMode="tel"
                                  placeholder="04XXXXXXXXX"
                                  className="w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(20,20,20,0.8)] px-4 py-3 text-sm text-[#f2f2f2] outline-none"
                                />
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                <label className="text-xs" style={{ color: 'var(--mp-text-muted)' }}>Cuenta bancaria</label>
                                <input value={payoutForm.accountNumber} onChange={e => updatePayoutField('accountNumber', e.target.value)} className="w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(20,20,20,0.8)] px-4 py-3 text-sm text-[#f2f2f2] outline-none" />
                              </div>
                            )}
                          </>
                        )}

                        {payoutForm.methodType === 'BINANCE_PAY' && (
                          <>
                            <div className="space-y-1.5">
                              <label className="text-xs" style={{ color: 'var(--mp-text-muted)' }}>Pay ID</label>
                              <input value={payoutForm.payId} onChange={e => updatePayoutField('payId', e.target.value)} className="w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(20,20,20,0.8)] px-4 py-3 text-sm text-[#f2f2f2] outline-none" />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs" style={{ color: 'var(--mp-text-muted)' }}>Usuario</label>
                              <input value={payoutForm.username} onChange={e => updatePayoutField('username', e.target.value)} className="w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(20,20,20,0.8)] px-4 py-3 text-sm text-[#f2f2f2] outline-none" />
                            </div>
                          </>
                        )}
                      </div>

                      <div
                        className="rounded-xl p-3 text-xs leading-relaxed"
                        style={{ background: 'rgba(0,174,239,0.06)', border: '1px solid rgba(0,174,239,0.14)', color: 'var(--mp-text-muted)' }}
                      >
                        {commissionCopy} Monto estimado despues de cargos: <span style={{ color: 'var(--mp-text-strong)' }}>{fmtUSD(operationalSellerNet)}</span>. Disponible para cobrar ahora: <span style={{ color: 'var(--mp-text-strong)' }}>{fmtUSD(payoutReadyNet)}</span>. En proceso no equivale a disponible.
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
                      style={{ background: 'var(--mp-card-subtle)', border: '1px solid var(--mp-border)', color: 'var(--mp-text-muted)' }}
                    >
                      Aun no necesitas registrar datos de cobro. Esta solicitud aparecera cuando una venta entre en proceso o quede lista para cobrar.
                    </div>
                  ) : (
                    <div
                      className="rounded-xl p-3 text-xs leading-relaxed"
                      style={{ background: 'rgba(0,174,239,0.06)', border: '1px solid rgba(0,174,239,0.14)', color: 'var(--mp-text-muted)' }}
                    >
                      Tus datos de cobro ya estan configurados. El equipo los usara solo cuando una venta quede lista para pago al vendedor.
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div
                    className="rounded-2xl p-4"
                    style={{ background: 'var(--mp-card)', border: '1px solid var(--mp-border)', boxShadow: 'var(--mp-card-shadow)' }}
                  >
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--mp-text-strong)' }}>Resumen de cobros</h3>
                    <div className="mt-3 space-y-3 text-xs">
                      <div className="flex items-center justify-between text-[#a0a0a0]">
                        <span>Validaciones pendientes</span>
                        <span style={{ color: 'var(--mp-text-strong)' }}>{pendingValidationSales.length}</span>
                      </div>
                      <div className="flex items-center justify-between text-[#a0a0a0]">
                        <span>Ventas en proceso</span>
                        <span style={{ color: 'var(--mp-text-strong)' }}>{escrowSales.length}</span>
                      </div>
                      <div className="flex items-center justify-between text-[#a0a0a0]">
                        <span>Pago pendiente al vendedor</span>
                        <span style={{ color: 'var(--mp-text-strong)' }}>{payoutReadySales.length}</span>
                      </div>
                      <div className="flex items-center justify-between text-[#a0a0a0]">
                        <span>Pago enviado</span>
                        <span style={{ color: 'var(--mp-text-strong)' }}>{payoutSentSales.length}</span>
                      </div>
                      <div className="flex items-center justify-between text-[#a0a0a0]">
                        <span>Sin metodo configurado</span>
                        <span style={{ color: 'var(--mp-text-strong)' }}>{releasedWithoutPayoutMethodSales.length}</span>
                      </div>
                      <div className="flex items-center justify-between text-[#a0a0a0]">
                        <span>Pendiente con metodo</span>
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
                        sub="Registra un metodo para poder recibir ventas listas para cobrar."
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

          {/* ─ Mis Referidos ─ */}
          {activeTab === 'referrals' && (
            <div className="space-y-6">
              <div
                className="rounded-2xl p-5 sm:p-6"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,193,7,0.08) 0%, var(--mp-card) 58%, rgba(249,115,22,0.04) 100%)',
                  border: '1px solid var(--mp-border)',
                  boxShadow: 'var(--mp-card-shadow)',
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-normal text-[#ffc107]">Programa de Referidos</p>
                    <h2 className="mt-2 text-2xl font-semibold leading-tight" style={{ color: 'var(--mp-text-strong)' }}>Drop Social</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: 'var(--mp-text-muted)' }}>
                      Comparte tus listings y gana <span style={{ color: '#ffc107' }}>{REFERRAL_COMMISSION_PERCENT}%</span> de cada compra que venga de tus links.
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--mp-text-faint)' }}>Comisiones acumuladas</span>
                    <span className="text-3xl font-bold tabular-nums" style={{ color: '#ffc107' }}>
                      ${referralEarnings.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <KpiCard
                  icon={Users}
                  label="Referidos"
                  value={referredTransactions.length.toString()}
                  sub="Personas que compraron con tu link"
                  accent="#ffc107"
                  tone="compact"
                />
                <KpiCard
                  icon={Gift}
                  label="Comisiones"
                  value={`$${referralEarnings.toFixed(2)}`}
                  sub={`${REFERRAL_COMMISSION_PERCENT}% por compra referida`}
                  accent="#4ade80"
                  tone="compact"
                />
                <KpiCard
                  icon={Copy}
                  label="Links activos"
                  value={referralLinks.filter((l: { code: string }) => l.code).length.toString()}
                  sub="Comparte para generar mas"
                  accent="#00aeef"
                  tone="compact"
                />
              </div>

              {referralLinks.length > 0 && (
                <div className="space-y-3">
                  <SectionHeader title="Tus Links de Referido" count={referralLinks.length} />
                  {referralLinks.map((link) => (
                    <ReferralLinkCard
                      key={link.id}
                      link={link}
                      onCopy={() => {
                        const target = link.slug && link.slug !== link.listingId ? link.slug : link.listingId
                        const url = `${window.location.origin}/marketplace/${encodeURIComponent(target)}?ref=${encodeURIComponent(link.code)}`
                        navigator.clipboard.writeText(url).catch(() => {})
                        setDashboardMessageTone('success')
                        setDashboardMessage('Link copiado al portapapeles.')
                      }}
                    />
                  ))}
                </div>
              )}

              {referredTransactions.length > 0 && (
                <div className="space-y-3">
                  <SectionHeader title="Compras Referidas" count={referredTransactions.length} />
                  {referredTransactions.map((tx) => (
                    <ReferredTransactionCard key={tx.id} tx={tx} />
                  ))}
                </div>
              )}

              {/* ── Mis Listings: referidos generados por otros ── */}
              {listingReferralStats.filter(l => l.linksCreated > 0).length > 0 && (
                <div className="space-y-3">
                  <SectionHeader
                    title="Tus Listings — Referidos por otros"
                    count={listingReferralStats.filter(l => l.linksCreated > 0).length}
                  />
                  {listingReferralStats.filter(l => l.linksCreated > 0).map(stat => (
                    <div
                      key={stat.listingId}
                      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-white/5 transition-colors"
                      style={{ background: 'var(--mp-card-subtle)', border: '1px solid var(--mp-border)' }}
                      onClick={() => router.push(`/marketplace/${stat.slug}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: 'var(--mp-text)' }}>{stat.title}</p>
                        <div className="flex gap-4 mt-1">
                          <span className="text-[10px]" style={{ color: 'var(--mp-text-faint)' }}>
                            {stat.linksCreated} link{stat.linksCreated !== 1 ? 's' : ''}
                          </span>
                          <span className="text-[10px]" style={{ color: 'var(--mp-text-faint)' }}>
                            {stat.totalClicks} click{stat.totalClicks !== 1 ? 's' : ''}
                          </span>
                          {stat.totalConversions > 0 && (
                            <span className="text-[10px]" style={{ color: '#4ade80' }}>
                              {stat.totalConversions} venta{stat.totalConversions !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      {stat.totalEarnedForReferrers > 0 && (
                        <span className="text-[11px] font-semibold whitespace-nowrap" style={{ color: '#ffc107' }}>
                          ${stat.totalEarnedForReferrers.toFixed(2)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ── Comisiones pendientes de pago ── */}
              {referralPendingPayouts.length > 0 && (
                <div className="space-y-3">
                  <SectionHeader
                    title="Comisiones pendientes"
                    count={referralPendingPayouts.filter(p => p.status === 'PENDING').length}
                  />
                  {referralPendingPayouts.map((payout) => (
                    <div
                      key={payout.id}
                      className="flex items-center gap-3 p-3 rounded-xl"
                      style={{
                        background: payout.status === 'COMPLETED' ? 'rgba(74,222,128,0.05)' : 'rgba(255,193,7,0.05)',
                        border: payout.status === 'COMPLETED' ? '1px solid rgba(74,222,128,0.18)' : '1px solid rgba(255,193,7,0.18)',
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium" style={{ color: 'var(--mp-text)' }}>
                          ${Number(payout.amount).toFixed(2)} USD
                        </p>
                        <p className="text-[9px] mt-0.5" style={{ color: 'var(--mp-text-faint)' }}>
                          {payout.status === 'COMPLETED' ? '✅ Pagado' : payout.status === 'PENDING' ? '⏳ Pendiente' : payout.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {referralLinks.length === 0 && referredTransactions.length === 0 && (
                <EmptyState
                  icon={Users}
                  title="Sin referidos aun"
                  sub="Ve a un listing y usa el boton Drop Social para generar tu primer link de referido."
                />
              )}
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
                  <p className="text-[10px] text-[#6a6a6a] text-center pb-1">
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
          onSyncNeeded={handleChatSyncNeeded}
          onClose={() => setOpenThread(null)}
        />
      )}

      {selectedTx && (
        selectedTxLoading || !selectedTxDetail ? (
          <div
            className="fixed inset-0 z-[90] flex items-center justify-center"
            style={{ background: 'var(--mp-overlay)', backdropFilter: 'blur(8px)' }}
          >
            <div
              className="rounded-2xl px-5 py-4 flex items-center gap-3"
              style={{ background: 'var(--mp-panel-solid)', border: '1px solid var(--mp-border)' }}
            >
              <Loader2 size={16} className="animate-spin text-[#00aeef]" />
              <span className="text-sm" style={{ color: 'var(--mp-text-strong)' }}>Cargando detalle de transaccion...</span>
            </div>
          </div>
        ) : (
          <TransactionDetailModal
            tx={selectedTxDetail}
            viewAs={selectedTx.viewAs}
            sellerPayoutMethod={sellerPayoutMethod}
            onClose={() => {
              setSelectedTx(null)
              setSelectedTxDetail(null)
            }}
            onReportPayment={() => {
              setSelectedTx(null)
              setSelectedTxDetail(null)
              router.push('/marketplace')
            }}
            onOpenMessages={() => {
              setSelectedTx(null)
              setSelectedTxDetail(null)
              handleTabChange('messages')
            }}
            onOpenDispute={(tx) => { setDisputeTarget(tx) }}
            onSetupPayout={() => {
              setSelectedTx(null)
              setSelectedTxDetail(null)
              handleTabChange('payouts')
            }}
          />
        )
      )}

      {/* Dispute Modal */}
      {disputeTarget && (
        <DisputeModal
          tx={disputeTarget}
          onClose={() => setDisputeTarget(null)}
          onSuccess={async txId => {
            setDisputedTxIds(prev => new Set(prev).add(txId))
            setDisputeTarget(null)
            setDashboardMessageTone('success')
            setDashboardMessage('Disputa enviada. Actualizamos el estado operativo de la transaccion.')
            if (selectedTx?.tx.id === txId) {
              setSelectedTxDetail(prev => prev ? { ...prev, status: 'DISPUTED' } : prev)
              await refreshTransactionDetail(txId)
            }
            try {
              router.refresh()
            } catch {
              setDashboardMessageTone('info')
              setDashboardMessage('Disputa registrada. Si no ves el cambio de inmediato, recarga la vista.')
            }
          }}
        />
      )}
    </div>
  )
}
