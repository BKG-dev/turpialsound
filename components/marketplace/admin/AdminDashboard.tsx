'use client'

import { useState, useTransition, useCallback } from 'react'
import {
  BarChart3,
  Users,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Search,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  ArrowUpRight,
  FileText,
  Ban,
  BadgeCheck,
  Shield,
} from 'lucide-react'
import type {
  AdminStats,
  EscrowItem,
  PayoutReportRow,
  AdminUserRow,
  EscrowFilter,
} from '@/actions/marketplace/admin'
import {
  getAdminStats,
  getEscrowList,
  getPayoutReport,
  adminGetUsers,
  adminValidatePayment,
  adminReleaseEscrow,
  adminResolveDispute,
  adminCancelTransaction,
  adminBanUser,
  adminUnbanUser,
  adminSetUserRole,
  adminVerifyUser,
} from '@/actions/marketplace/admin'

// ─── TYPES ────────────────────────────────────────────────────────────────────

type AdminTab = 'dashboard' | 'transactions' | 'escrow' | 'validations' | 'payouts' | 'commissions' | 'users'

type PendingAction = {
  txId: string
  type: 'approve' | 'reject' | 'release' | 'resolve-buyer' | 'resolve-seller' | 'cancel'
  note: string
  loading: boolean
} | null

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-VE', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtShortDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function fmtUSD(n: number) {
  return `$${n.toFixed(2)}`
}

function isExpiring(item: EscrowItem) {
  if (!item.escrowReleaseAt || item.status !== 'IN_ESCROW') return false
  return new Date(item.escrowReleaseAt).getTime() - Date.now() < 24 * 60 * 60 * 1000
}

const STATUS_LABEL: Record<string, string> = {
  INITIATED: 'Iniciado',
  PENDING_PAYMENT: 'Pago pendiente',
  PAYMENT_RECEIVED: 'Pago recibido',
  VALIDATING: 'Validando',
  PAYMENT_FAILED: 'Pago fallido',
  IN_ESCROW: 'En escrow',
  DELIVERY_CONFIRMED: 'Entrega confirmada',
  RELEASED: 'Liberado',
  REFUNDED: 'Reembolsado',
  DISPUTED: 'En disputa',
  CANCELLED: 'Cancelado',
}

function statusBadge(status: string, expiring?: boolean) {
  const label = STATUS_LABEL[status] ?? status
  let bg = 'rgba(255,255,255,0.08)'
  let color = 'rgba(255,255,255,0.5)'

  if (expiring && status === 'IN_ESCROW') { bg = 'rgba(251,146,60,0.15)'; color = '#fb923c' }
  else if (status === 'IN_ESCROW' || status === 'DELIVERY_CONFIRMED') { bg = 'rgba(0,174,239,0.15)'; color = '#00aeef' }
  else if (status === 'PAYMENT_RECEIVED' || status === 'VALIDATING' || status === 'PENDING_PAYMENT') { bg = 'rgba(251,191,36,0.15)'; color = '#fbbf24' }
  else if (status === 'DISPUTED') { bg = 'rgba(239,68,68,0.15)'; color = '#ef4444' }
  else if (status === 'RELEASED') { bg = 'rgba(74,222,128,0.15)'; color = '#4ade80' }
  else if (status === 'PAYMENT_FAILED' || status === 'CANCELLED') { bg = 'rgba(107,114,128,0.15)'; color = '#6b7280' }
  else if (status === 'REFUNDED') { bg = 'rgba(168,85,247,0.15)'; color = '#a855f7' }

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
      style={{ background: bg, color }}
    >
      {expiring && status === 'IN_ESCROW' && <Clock size={9} />}
      {expiring && status === 'IN_ESCROW' ? 'Por vencer' : label}
    </span>
  )
}

function roleBadge(role: string) {
  if (role === 'SUPER') return <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>SUPER</span>
  if (role === 'SOCIO') return <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(168,85,247,0.12)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.2)' }}>SOCIO</span>
  return <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>USER</span>
}

function exportCSV(rows: PayoutReportRow[]) {
  const headers = ['Vendedor', 'Método', 'Cuenta/Dirección', 'Bruto (USD)', 'Comisión retenida', 'Neto a Pagar', 'Moneda', 'Núm. TX', 'IDs Transacciones']
  const csv = [
    headers.join(','),
    ...rows.map(r => [
      `"${r.sellerName}"`,
      `"${r.payoutMethodType}"`,
      `"${r.payoutAccount}"`,
      r.grossAmount.toFixed(2),
      r.feeAmount.toFixed(2),
      r.netAmount.toFixed(2),
      r.currency,
      r.transactionCount,
      `"${r.transactionIds.join(';')}"`,
    ].join(',')),
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pagos-vendedores-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── KPI CARD ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  color,
  icon: Icon,
  onClick,
}: {
  label: string
  value: string | number
  sub?: string
  color: string
  icon: React.ElementType
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className="rounded-xl p-4 flex flex-col gap-3 transition-all"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick() } : undefined}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon size={14} style={{ color }} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-semibold text-white">{value}</p>
        {sub && <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{sub}</p>}
      </div>
    </div>
  )
}

// ─── ESCROW ACTION PANEL ──────────────────────────────────────────────────────

function ActionPanel({
  action,
  onNote,
  onConfirm,
  onCancel,
}: {
  action: PendingAction
  onNote: (note: string) => void
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!action) return null

  const labels: Record<string, { title: string; color: string }> = {
    approve:          { title: 'Aprobar pago → IN_ESCROW', color: '#4ade80' },
    reject:           { title: 'Rechazar pago → PAYMENT_FAILED', color: '#ef4444' },
    release:          { title: 'Liberar fondos al vendedor → RELEASED', color: '#00aeef' },
    'resolve-buyer':  { title: 'Resolver disputa → REFUNDED (favor comprador)', color: '#a855f7' },
    'resolve-seller': { title: 'Resolver disputa → RELEASED (favor vendedor)', color: '#4ade80' },
    cancel:           { title: 'Cancelar transacción → CANCELLED', color: '#6b7280' },
  }

  const cfg = labels[action.type] ?? { title: action.type, color: '#fff' }

  return (
    <div
      className="rounded-xl p-4 mb-4"
      style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${cfg.color}30` }}
    >
      <p className="text-xs font-semibold mb-3" style={{ color: cfg.color }}>{cfg.title}</p>
      <p className="text-[11px] mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
        TX: <span className="font-mono text-white">{action.txId}</span>
      </p>
      <input
        type="text"
        value={action.note}
        onChange={e => onNote(e.target.value)}
        placeholder="Nota interna (opcional)"
        className="w-full px-3 py-2 rounded-lg text-sm outline-none mb-3"
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#fff',
        }}
      />
      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          disabled={action.loading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all"
          style={{ background: cfg.color, color: '#000', opacity: action.loading ? 0.6 : 1 }}
        >
          {action.loading ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
          {action.loading ? 'Procesando…' : 'Confirmar'}
        </button>
        <button
          onClick={onCancel}
          disabled={action.loading}
          className="px-3 py-2 rounded-lg text-xs transition-all"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ─── ADMIN DASHBOARD ─────────────────────────────────────────────────────────

interface Props {
  initialStats: AdminStats | null
  initialEscrow: EscrowItem[]
}

export function AdminDashboard({ initialStats, initialEscrow }: Props) {
  const [tab, setTab] = useState<AdminTab>('dashboard')
  const [isPending, startTransition] = useTransition()

  // Stats
  const [stats, setStats] = useState<AdminStats | null>(initialStats)

  // Escrow
  const [escrow, setEscrow] = useState<EscrowItem[]>(initialEscrow)
  const [escrowFilter, setEscrowFilter] = useState<EscrowFilter>('all')
  const [escrowSearch, setEscrowSearch] = useState('')
  const [senderBankFilter, setSenderBankFilter] = useState('all')
  const [paymentDayFilter, setPaymentDayFilter] = useState('')
  const [operationFilter, setOperationFilter] = useState('')
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [actionMsg, setActionMsg] = useState('')

  // Payouts
  const [payouts, setPayouts] = useState<PayoutReportRow[] | null>(null)

  // Users
  const [users, setUsers] = useState<AdminUserRow[] | null>(null)
  const [userSearch, setUserSearch] = useState('')
  const [userMsg, setUserMsg] = useState('')

  // ─── Escrow filter ─────────────────────────────────────────────────────────

  const applyEscrowFilter = useCallback((f: EscrowFilter) => {
    setEscrowFilter(f)
    startTransition(async () => {
      const result = await getEscrowList(f)
      if (result.success && result.data) setEscrow(result.data)
    })
  }, [])

  const openOperationalView = useCallback((nextTab: AdminTab, filter: EscrowFilter) => {
    setTab(nextTab)
    applyEscrowFilter(filter)
  }, [applyEscrowFilter])

  const refreshStats = useCallback(() => {
    startTransition(async () => {
      const r = await getAdminStats()
      if (r.success && r.data) setStats(r.data)
    })
  }, [])

  // ─── Escrow actions ────────────────────────────────────────────────────────

  function startAction(txId: string, type: NonNullable<PendingAction>['type']) {
    setActionMsg('')
    setPendingAction({ txId, type, note: '', loading: false })
  }

  async function confirmAction() {
    if (!pendingAction) return
    setPendingAction(prev => prev ? { ...prev, loading: true } : null)

    let result
    const { txId, type, note } = pendingAction
    if (type === 'approve')         result = await adminValidatePayment(txId, true, note)
    else if (type === 'reject')     result = await adminValidatePayment(txId, false, note)
    else if (type === 'release')    result = await adminReleaseEscrow(txId, note)
    else if (type === 'resolve-buyer')   result = await adminResolveDispute(txId, 'BUYER', note)
    else if (type === 'resolve-seller')  result = await adminResolveDispute(txId, 'SELLER', note)
    else                            result = await adminCancelTransaction(txId, note)

    setActionMsg(result.message)
    setPendingAction(null)

    if (result.success) {
      // Refresh escrow list
      const refreshed = await getEscrowList(escrowFilter)
      if (refreshed.success && refreshed.data) setEscrow(refreshed.data)
    }
  }

  // ─── Payouts tab ───────────────────────────────────────────────────────────

  const loadPayouts = useCallback(() => {
    startTransition(async () => {
      const r = await getPayoutReport()
      if (r.success && r.data) setPayouts(r.data)
    })
  }, [])

  // ─── Users tab ─────────────────────────────────────────────────────────────

  const loadUsers = useCallback((search?: string) => {
    startTransition(async () => {
      const r = await adminGetUsers(search)
      if (r.success && r.data) setUsers(r.data)
    })
  }, [])

  async function doUserAction(
    userId: string,
    action: 'ban' | 'unban' | 'verify' | 'role-user' | 'role-socio' | 'role-super',
  ) {
    setUserMsg('')
    let result
    if (action === 'ban') {
      const reason = window.prompt('Razón de suspensión:') ?? ''
      if (reason === null) return
      result = await adminBanUser(userId, reason)
    } else if (action === 'unban') {
      result = await adminUnbanUser(userId)
    } else if (action === 'verify') {
      result = await adminVerifyUser(userId)
    } else {
      const roleMap = { 'role-user': 'USER', 'role-socio': 'SOCIO', 'role-super': 'SUPER' } as const
      result = await adminSetUserRole(userId, roleMap[action as keyof typeof roleMap])
    }
    setUserMsg(result.message)
    if (result.success) loadUsers(userSearch || undefined)
  }

  // ─── Tab: Dashboard ────────────────────────────────────────────────────────

  const DashboardTab = () => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-semibold text-white">Resumen operativo</h2>
        <button
          onClick={refreshStats}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all hover:bg-white/5"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          <RefreshCw size={11} className={isPending ? 'animate-spin' : ''} /> Actualizar
        </button>
      </div>

      {stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total transacciones" value={stats.totalTransactions} color="#00aeef" icon={BarChart3} onClick={() => openOperationalView('transactions', 'operations')} />
          <KpiCard label="Valor en escrow activo" value={fmtUSD(stats.escrowActiveValue)} sub="IN_ESCROW + DELIVERY_CONFIRMED" color="#fbbf24" icon={Lock} onClick={() => openOperationalView('escrow', 'IN_ESCROW')} />
          <KpiCard label="Validaciones pendientes" value={stats.pendingValidation} sub="pagos manuales en espera" color="#fb923c" icon={Clock} onClick={() => openOperationalView('validations', 'PAYMENT_RECEIVED')} />
          <KpiCard label="Listings activos" value={stats.activeListings} color="#4ade80" icon={ArrowUpRight} />
          <KpiCard label="Usuarios registrados" value={stats.totalUsers} color="#00aeef" icon={Users} />
          <KpiCard label="Disputas abiertas" value={stats.openDisputes} color="#ef4444" icon={AlertTriangle} onClick={() => openOperationalView('transactions', 'DISPUTED')} />
          <KpiCard label="Liberados este mes" value={stats.releasedThisMonth} color="#4ade80" icon={CheckCircle2} onClick={() => setTab('payouts')} />
          <KpiCard label="Comisiones cobradas" value={fmtUSD(stats.platformFeesEarned)} sub="mes en curso" color="#a855f7" icon={FileText} onClick={() => setTab('commissions')} />
        </div>
      ) : (
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Cargando estadísticas…</p>
      )}

      {/* Quick access */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Pagos en espera de validacion', filter: 'PAYMENT_RECEIVED' as EscrowFilter, color: '#fbbf24', icon: Clock, count: stats?.pendingValidation ?? '-', tab: 'validations' as AdminTab },
          { label: 'Escrow por vencer (<24 h)', filter: 'expiring' as EscrowFilter, color: '#fb923c', icon: AlertTriangle, count: '!', tab: 'escrow' as AdminTab },
          { label: 'Disputas abiertas', filter: 'DISPUTED' as EscrowFilter, color: '#ef4444', icon: AlertTriangle, count: stats?.openDisputes ?? '-', tab: 'transactions' as AdminTab },
        ].map(item => (
          <button
            key={item.filter}
            onClick={() => openOperationalView(item.tab, item.filter)}
            className="flex items-center justify-between p-3 rounded-xl transition-all hover:opacity-80 text-left"
            style={{ background: `${item.color}10`, border: `1px solid ${item.color}25` }}
          >
            <div className="flex items-center gap-2">
              <item.icon size={14} style={{ color: item.color }} />
              <span className="text-xs" style={{ color: item.color }}>{item.label}</span>
            </div>
            <div className="flex items-center gap-1" style={{ color: item.color }}>
              <span className="text-sm font-semibold">{item.count}</span>
              <ChevronRight size={12} />
            </div>
          </button>
        ))}
      </div>
    </div>
  )

  // ─── Tab: Escrow ───────────────────────────────────────────────────────────

  const EscrowTab = () => {
    const viewConfig: Record<Exclude<AdminTab, 'dashboard' | 'payouts' | 'users' | 'commissions'>, { title: string; description: string; defaultFilter: EscrowFilter }> = {
      transactions: {
        title: 'Transacciones completas',
        description: 'Lista operativa completa con filtros por estado para checkout manual y escrow.',
        defaultFilter: 'operations',
      },
      escrow: {
        title: 'Escrow activo',
        description: 'Operaciones en custodia y entregas confirmadas pendientes de liberacion.',
        defaultFilter: 'IN_ESCROW',
      },
      validations: {
        title: 'Validaciones pendientes',
        description: 'Pagos reportados por compradores pendientes de validacion manual.',
        defaultFilter: 'PAYMENT_RECEIVED',
      },
    }

    const currentView = viewConfig[(tab === 'transactions' || tab === 'escrow' || tab === 'validations') ? tab : 'transactions']
    const filters: { value: EscrowFilter; label: string }[] = [
      { value: 'operations', label: 'Operativo' },
      { value: 'all', label: 'Todos' },
      { value: 'PAYMENT_RECEIVED', label: 'Pago recibido' },
      { value: 'VALIDATING', label: 'Validando' },
      { value: 'IN_ESCROW', label: 'En escrow' },
      { value: 'expiring', label: 'Por vencer' },
      { value: 'DISPUTED', label: 'En disputa' },
      { value: 'DELIVERY_CONFIRMED', label: 'Conf. entrega' },
      { value: 'RELEASED', label: 'Liberados' },
    ]

    const availableSenderBanks = Array.from(
      new Set(
        escrow
          .map(tx => tx.paymentSenderBank)
          .filter((value): value is string => Boolean(value && value.trim())),
      ),
    ).sort((a, b) => a.localeCompare(b, 'es'))

    const visibleEscrow = escrow.filter(tx => {
      if (senderBankFilter !== 'all' && tx.paymentSenderBank !== senderBankFilter) return false
      if (paymentDayFilter) {
        const txPaymentDay = tx.paymentPaidAt ? tx.paymentPaidAt.slice(0, 10) : ''
        if (txPaymentDay !== paymentDayFilter) return false
      }
      if (operationFilter.trim()) {
        const currentOperation = (tx.paymentReference ?? '').toLowerCase()
        if (!currentOperation.includes(operationFilter.trim().toLowerCase())) return false
      }
      if (!escrowSearch.trim()) return true
      const haystack = [
        tx.id,
        tx.listing.title,
        tx.buyer.displayName,
        tx.seller.displayName,
        tx.paymentMethod,
        tx.paymentReference ?? '',
        tx.paymentSenderBank ?? '',
        tx.paymentPaidAt ? tx.paymentPaidAt.slice(0, 10) : '',
      ].join(' ').toLowerCase()
      return haystack.includes(escrowSearch.trim().toLowerCase())
    })

    return (
      <div>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">{currentView.title}</h2>
            <p className="mt-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {currentView.description}
            </p>
          </div>
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <Search size={12} style={{ color: 'rgba(255,255,255,0.35)' }} />
            <input
              value={escrowSearch}
              onChange={e => setEscrowSearch(e.target.value)}
              placeholder="Filtrar por TX, listing, comprador o vendedor"
              className="w-full bg-transparent text-xs text-white outline-none placeholder:text-[rgba(255,255,255,0.2)] lg:w-72"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {filters.map(f => (
            <button
              key={f.value}
              onClick={() => applyEscrowFilter(f.value)}
              className="px-3 py-1.5 rounded-lg text-xs transition-all"
              style={escrowFilter === f.value
                ? { background: 'rgba(0,174,239,0.15)', color: '#00aeef', border: '1px solid rgba(0,174,239,0.3)' }
                : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }
              }
            >
              {f.label}
            </button>
          ))}
          <button
            onClick={() => applyEscrowFilter(escrowFilter)}
            disabled={isPending}
            className="ml-auto px-2 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-all hover:bg-white/5"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            <RefreshCw size={10} className={isPending ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <select
            value={senderBankFilter}
            onChange={(e) => setSenderBankFilter(e.target.value)}
            className="rounded-xl border px-3 py-2 text-xs outline-none"
            style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', color: '#fff' }}
          >
            <option value="all">Todos los bancos emisores</option>
            {availableSenderBanks.map((bank) => (
              <option key={bank} value={bank}>
                {bank}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={paymentDayFilter}
            onChange={(e) => setPaymentDayFilter(e.target.value)}
            className="rounded-xl border px-3 py-2 text-xs outline-none"
            style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', color: '#fff' }}
          />

          <input
            type="text"
            value={operationFilter}
            onChange={(e) => setOperationFilter(e.target.value)}
            placeholder="Numero de operacion"
            className="rounded-xl border px-3 py-2 text-xs outline-none placeholder:text-[rgba(255,255,255,0.25)]"
            style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', color: '#fff' }}
          />
        </div>

        <div className="mb-4">
          <button
            onClick={() => {
              setSenderBankFilter('all')
              setPaymentDayFilter('')
              setOperationFilter('')
              setEscrowSearch('')
            }}
            className="px-3 py-1.5 rounded-lg text-xs transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Limpiar filtros de conciliacion
          </button>
        </div>

        {/* Action confirmation panel */}
        {pendingAction && (
          <ActionPanel
            action={pendingAction}
            onNote={note => setPendingAction(prev => prev ? { ...prev, note } : null)}
            onConfirm={confirmAction}
            onCancel={() => { setPendingAction(null); setActionMsg('') }}
          />
        )}

        {actionMsg && (
          <p className="text-xs mb-3 px-3 py-2 rounded-lg"
            style={{ background: 'rgba(0,174,239,0.08)', color: '#00aeef', border: '1px solid rgba(0,174,239,0.15)' }}>
            {actionMsg}
          </p>
        )}

        {visibleEscrow.length === 0 ? (
          <p className="text-sm text-center py-10" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Sin transacciones para este filtro.
          </p>
        ) : (
          <div className="space-y-3">
            {visibleEscrow.map(tx => {
              const exp = isExpiring(tx)
              return (
                <div
                  key={tx.id}
                  className="rounded-xl p-4"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: exp ? '1px solid rgba(251,146,60,0.25)' : '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {/* Header row */}
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="text-xs font-semibold text-white truncate max-w-[220px]">{tx.listing.title}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        {tx.buyer.displayName} <span style={{ color: 'rgba(255,255,255,0.2)' }}>→</span> {tx.seller.displayName}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {statusBadge(tx.status, exp)}
                      <span className="text-sm font-semibold" style={{ color: '#00aeef' }}>{fmtUSD(tx.amount)}</span>
                    </div>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 mb-3 text-[11px]">
                    <div>
                      <p style={{ color: 'rgba(255,255,255,0.3)' }}>Comisión</p>
                      <p className="text-white">{fmtUSD(tx.platformFeeAmount)}</p>
                    </div>
                    <div>
                      <p style={{ color: 'rgba(255,255,255,0.3)' }}>Neto vendedor</p>
                      <p className="text-white">{fmtUSD(tx.sellerNetAmount)}</p>
                    </div>
                    <div>
                      <p style={{ color: 'rgba(255,255,255,0.3)' }}>Método</p>
                      <p className="text-white">{tx.paymentMethod}</p>
                    </div>
                    <div>
                      <p style={{ color: 'rgba(255,255,255,0.3)' }}>Escrow libera</p>
                      <p className={exp ? 'font-semibold' : ''} style={{ color: exp ? '#fb923c' : '#fff' }}>
                        {fmtDate(tx.escrowReleaseAt)}
                      </p>
                    </div>
                    <div>
                      <p style={{ color: 'rgba(255,255,255,0.3)' }}>Banco emisor</p>
                      <p className="text-white">{tx.paymentSenderBank ?? '—'}</p>
                    </div>
                    <div>
                      <p style={{ color: 'rgba(255,255,255,0.3)' }}>Fecha de pago</p>
                      <p className="text-white">{fmtShortDate(tx.paymentPaidAt)}</p>
                    </div>
                    <div>
                      <p style={{ color: 'rgba(255,255,255,0.3)' }}>Numero de operacion</p>
                      <p className="text-white">{tx.paymentReference ?? '—'}</p>
                    </div>
                  </div>

                  {tx.paymentProofUrl && (
                    <p className="text-[11px] mb-2" style={{ color: '#fbbf24' }}>
                      Comprobante adjunto — <a href={tx.paymentProofUrl} target="_blank" rel="noreferrer" className="underline">ver</a>
                    </p>
                  )}

                  {tx.seller.defaultPayout && (
                    <p className="text-[11px] mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      Pago vendedor: {tx.seller.defaultPayout}
                    </p>
                  )}

                  {!tx.seller.defaultPayout && ['IN_ESCROW', 'DELIVERY_CONFIRMED', 'RELEASED'].includes(tx.status) && (
                    <p className="text-[11px] mb-2" style={{ color: '#f59e0b' }}>
                      Pendiente de datos de cobro del vendedor.
                    </p>
                  )}

                  {tx.adminNotes && (
                    <p className="text-[11px] mb-2 italic" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      Nota: {tx.adminNotes}
                    </p>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-1.5 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    {(tx.status === 'PAYMENT_RECEIVED' || tx.status === 'VALIDATING') && (
                      <>
                        <ActionBtn label="Aprobar pago" color="#4ade80" onClick={() => startAction(tx.id, 'approve')} />
                        <ActionBtn label="Rechazar" color="#ef4444" onClick={() => startAction(tx.id, 'reject')} />
                      </>
                    )}
                    {(tx.status === 'IN_ESCROW' || tx.status === 'DELIVERY_CONFIRMED') && (
                      <ActionBtn label="Liberar fondos" color="#00aeef" onClick={() => startAction(tx.id, 'release')} />
                    )}
                    {tx.status === 'DISPUTED' && (
                      <>
                        <ActionBtn label="Favor comprador" color="#a855f7" onClick={() => startAction(tx.id, 'resolve-buyer')} />
                        <ActionBtn label="Favor vendedor" color="#4ade80" onClick={() => startAction(tx.id, 'resolve-seller')} />
                      </>
                    )}
                    {!['RELEASED', 'REFUNDED', 'CANCELLED', 'PAYMENT_FAILED'].includes(tx.status) && (
                      <ActionBtn label="Cancelar" color="#6b7280" onClick={() => startAction(tx.id, 'cancel')} />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ─── Tab: Payouts ──────────────────────────────────────────────────────────

  const PayoutsTab = () => {
    const total = payouts?.reduce((s, r) => s + r.netAmount, 0) ?? 0

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Reporte de pagos a vendedores</h2>
            <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Transacciones RELEASED pendientes de pago manual
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => loadPayouts()}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all hover:bg-white/5"
              style={{ color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <RefreshCw size={11} className={isPending ? 'animate-spin' : ''} /> Cargar
            </button>
            {payouts && payouts.length > 0 && (
              <button
                onClick={() => exportCSV(payouts)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{ background: 'rgba(0,174,239,0.12)', color: '#00aeef', border: '1px solid rgba(0,174,239,0.25)' }}
              >
                <Download size={11} /> Exportar CSV
              </button>
            )}
          </div>
        </div>

        {payouts === null ? (
          <div className="py-10 text-center">
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>Haz clic en Cargar para ver el reporte.</p>
          </div>
        ) : payouts.length === 0 ? (
          <p className="text-sm text-center py-10" style={{ color: 'rgba(255,255,255,0.25)' }}>Sin pagos pendientes.</p>
        ) : (
          <>
            {/* Summary */}
            <div
              className="rounded-xl p-4 mb-4 flex items-center justify-between"
              style={{ background: 'rgba(0,174,239,0.06)', border: '1px solid rgba(0,174,239,0.15)' }}
            >
              <div>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{payouts.length} vendedor(es) · {payouts.reduce((s, r) => s + r.transactionCount, 0)} transacciones</p>
                <p className="text-base font-semibold text-white mt-0.5">Total a pagar: <span style={{ color: '#00aeef' }}>{fmtUSD(total)}</span></p>
              </div>
              <button
                onClick={() => exportCSV(payouts)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: 'rgba(0,174,239,0.15)', color: '#00aeef', border: '1px solid rgba(0,174,239,0.3)' }}
              >
                <Download size={14} /> CSV
              </button>
            </div>

            <div className="space-y-3">
              {payouts.map(row => (
                <div
                  key={row.sellerId}
                  className="rounded-xl p-4"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-sm font-semibold text-white">{row.sellerName}</p>
                      <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{row.payoutAccount}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-semibold" style={{ color: '#4ade80' }}>{fmtUSD(row.netAmount)}</p>
                      <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>neto a pagar</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <p style={{ color: 'rgba(255,255,255,0.3)' }}>Bruto</p>
                      <p className="text-white">{fmtUSD(row.grossAmount)}</p>
                    </div>
                    <div>
                      <p style={{ color: 'rgba(255,255,255,0.3)' }}>Comision retenida</p>
                      <p className="text-white">— {fmtUSD(row.feeAmount)}</p>
                    </div>
                    <div>
                      <p style={{ color: 'rgba(255,255,255,0.3)' }}>Transacciones</p>
                      <p className="text-white">{row.transactionCount} TX</p>
                    </div>
                  </div>
                  <p className="text-[10px] mt-2 font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    IDs: {row.transactionIds.join(', ')}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  // ─── Tab: Users ────────────────────────────────────────────────────────────

  const CommissionsTab = () => {
    const payoutRows = payouts ?? []
    const gross = payoutRows.reduce((sum, row) => sum + row.grossAmount, 0)
    const fees = payoutRows.reduce((sum, row) => sum + row.feeAmount, 0)
    const net = payoutRows.reduce((sum, row) => sum + row.netAmount, 0)

    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Comisiones y totales</h2>
          <p className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Vista consolidada de ventas, comisiones y monto pendiente por pagar a vendedores.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Total vendido" value={fmtUSD(stats?.totalSoldValue ?? gross)} color="#4ade80" icon={BarChart3} />
          <KpiCard label="Comisiones acumuladas" value={fmtUSD(stats?.platformFeesEarned ?? fees)} color="#a855f7" icon={FileText} />
          <KpiCard label="Pendiente vendedores" value={fmtUSD(stats?.pendingSellerPayoutValue ?? net)} color="#00aeef" icon={Lock} />
          <KpiCard label="Payouts listos" value={stats?.payoutsReadyCount ?? payoutRows.length} color="#fbbf24" icon={Download} />
        </div>

        <div
          className="rounded-xl p-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="grid gap-3 text-sm md:grid-cols-3">
            <div>
              <p style={{ color: 'rgba(255,255,255,0.35)' }}>Bruto acumulado</p>
              <p className="mt-1 font-semibold text-white">{fmtUSD(gross)}</p>
            </div>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.35)' }}>Fee retenido</p>
              <p className="mt-1 font-semibold text-white">{fmtUSD(fees)}</p>
            </div>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.35)' }}>Neto a pagar</p>
              <p className="mt-1 font-semibold" style={{ color: '#00aeef' }}>{fmtUSD(net)}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const UsersTab = () => (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
          <input
            type="text"
            value={userSearch}
            onChange={e => setUserSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loadUsers(userSearch || undefined)}
            placeholder="Buscar por nombre o email…"
            className="w-full pl-8 pr-3 py-2 rounded-lg text-sm outline-none"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
            }}
          />
        </div>
        <button
          onClick={() => loadUsers(userSearch || undefined)}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-all"
          style={{ background: 'rgba(0,174,239,0.12)', color: '#00aeef', border: '1px solid rgba(0,174,239,0.25)' }}
        >
          {isPending ? <RefreshCw size={11} className="animate-spin" /> : <Search size={11} />}
          Buscar
        </button>
      </div>

      {userMsg && (
        <p className="text-xs mb-3 px-3 py-2 rounded-lg"
          style={{ background: 'rgba(0,174,239,0.08)', color: '#00aeef', border: '1px solid rgba(0,174,239,0.15)' }}>
          {userMsg}
        </p>
      )}

      {users === null ? (
        <p className="text-sm text-center py-10" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Ingresa un término o haz clic en Buscar para cargar usuarios.
        </p>
      ) : users.length === 0 ? (
        <p className="text-sm text-center py-10" style={{ color: 'rgba(255,255,255,0.25)' }}>Sin resultados.</p>
      ) : (
        <div className="space-y-2">
          {users.map(u => (
            <div
              key={u.id}
              className="rounded-xl p-3 flex flex-wrap items-start justify-between gap-3"
              style={{
                background: u.isBanned ? 'rgba(239,68,68,0.04)' : 'rgba(255,255,255,0.03)',
                border: u.isBanned ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-white">{u.displayName}</span>
                  {roleBadge(u.role)}
                  {u.isSeller && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,193,7,0.1)', color: '#ffc107', border: '1px solid rgba(255,193,7,0.2)' }}>Vendedor</span>}
                  {u.isVerified && <BadgeCheck size={12} style={{ color: '#00aeef' }} />}
                  {u.isBanned && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>SUSPENDIDO</span>}
                  {u.whatsappConsent && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(37,211,102,0.1)', color: '#25D366', border: '1px solid rgba(37,211,102,0.2)' }}>WA ✓</span>}
                </div>
                <p className="text-[11px] mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{u.email}</p>
                {u.phone && <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>{u.phone}</p>}
                <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  {u.totalSales} ventas · {u.totalPurchases} compras · Registro: {fmtDate(u.createdAt)}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {!u.isVerified && (
                  <ActionBtn label="Verificar" color="#00aeef" icon={ShieldCheck} onClick={() => doUserAction(u.id, 'verify')} />
                )}
                {u.isBanned ? (
                  <ActionBtn label="Rehabilitar" color="#4ade80" icon={CheckCircle2} onClick={() => doUserAction(u.id, 'unban')} />
                ) : (
                  <ActionBtn label="Suspender" color="#ef4444" icon={Ban} onClick={() => doUserAction(u.id, 'ban')} />
                )}
                {u.role !== 'SOCIO' && (
                  <ActionBtn label="→ SOCIO" color="#a855f7" icon={Shield} onClick={() => doUserAction(u.id, 'role-socio')} />
                )}
                {u.role !== 'USER' && (
                  <ActionBtn label="→ USER" color="#6b7280" onClick={() => doUserAction(u.id, 'role-user')} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // ─── Render ────────────────────────────────────────────────────────────────

  const tabs: { id: AdminTab; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'transactions', label: 'Transacciones', icon: BarChart3 },
    { id: 'escrow', label: 'Escrow', icon: Lock },
    { id: 'validations', label: 'Validaciones', icon: Clock },
    { id: 'payouts', label: 'Pagos', icon: FileText },
    { id: 'commissions', label: 'Comisiones', icon: Download },
    { id: 'users', label: 'Usuarios', icon: Users },
  ]

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={16} style={{ color: '#ef4444' }} />
            <span className="text-[11px] uppercase tracking-widest" style={{ color: '#ef4444' }}>Panel Administrativo</span>
          </div>
          <h1 className="text-xl font-semibold text-white">Turpial Sound — Admin</h1>
        </div>
        <a
          href="/marketplace"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all hover:bg-white/5"
          style={{ color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          ← Marketplace
        </a>
      </div>

      {/* Tab nav */}
      <div
        className="flex gap-1 p-1 rounded-xl mb-6 w-fit"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {tabs.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id)
                if (t.id === 'transactions') applyEscrowFilter('operations')
                if (t.id === 'escrow') applyEscrowFilter('IN_ESCROW')
                if (t.id === 'validations') applyEscrowFilter('PAYMENT_RECEIVED')
                if (t.id === 'payouts' && payouts === null) loadPayouts()
                if (t.id === 'commissions' && payouts === null) loadPayouts()
                if (t.id === 'users' && users === null) loadUsers()
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all"
              style={tab === t.id
                ? { background: 'rgba(0,174,239,0.12)', color: '#00aeef', border: '1px solid rgba(0,174,239,0.25)' }
                : { background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '1px solid transparent' }
              }
            >
              <Icon size={13} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div
        className="rounded-2xl p-6"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {tab === 'dashboard' && <DashboardTab />}
        {(tab === 'transactions' || tab === 'escrow' || tab === 'validations') && <EscrowTab />}
        {tab === 'payouts' && <PayoutsTab />}
        {tab === 'commissions' && <CommissionsTab />}
        {tab === 'users' && <UsersTab />}
      </div>
    </div>
  )
}

// ─── ACTION BUTTON (helper) ───────────────────────────────────────────────────

function ActionBtn({
  label,
  color,
  icon: Icon,
  onClick,
}: {
  label: string
  color: string
  icon?: React.ElementType
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all hover:opacity-80"
      style={{ background: `${color}12`, color, border: `1px solid ${color}25` }}
    >
      {Icon && <Icon size={10} />}
      {label}
    </button>
  )
}
