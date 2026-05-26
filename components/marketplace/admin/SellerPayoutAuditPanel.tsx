'use client'

import type { SellerPayoutAuditRow } from '@/actions/marketplace/admin'

type SellerPayoutAuditPanelProps = {
  rows: SellerPayoutAuditRow[] | null
  isLoading?: boolean
  onReload?: () => void
}

function fmtDate(iso: string | null) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fmtAmount(value: number | null, currency = 'USD') {
  if (value == null || !Number.isFinite(value)) return 'No disponible'
  return `$${value.toFixed(2)} ${currency}`
}

function alertLabels(row: SellerPayoutAuditRow) {
  const labels: string[] = []
  if (row.releasedWithoutPayout) labels.push('Fondos liberados; falta registrar pago')
  if (row.completedPayout) labels.push('Pago enviado')
  if (row.pendingPayout) labels.push('Pago registrado pendiente')
  if (row.payoutAmountMismatch) labels.push('Diferencia entre neto y payout')
  if (row.payoutCompletedButTxNotReleased) labels.push('Revisar: payout completado antes de liberacion')
  if (row.missingSellerNetAmount) labels.push('Neto vendedor faltante')
  if (row.missingPayoutAmount) labels.push('Monto payout faltante')
  if (labels.length === 0) labels.push('Conciliado')
  return labels
}

function statusTone(row: SellerPayoutAuditRow): 'ok' | 'warn' | 'error' {
  if (row.payoutAmountMismatch || row.payoutCompletedButTxNotReleased || row.missingSellerNetAmount || row.missingPayoutAmount) {
    return 'error'
  }
  if (row.releasedWithoutPayout || row.pendingPayout) return 'warn'
  return 'ok'
}

export function SellerPayoutAuditPanel({ rows, isLoading = false, onReload }: SellerPayoutAuditPanelProps) {
  return (
    <section
      className="rounded-xl p-4 space-y-3"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Auditoria de pagos a vendedores</h3>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Desglose por transaccion para conciliar bruto, comision, neto y payout registrado.
          </p>
        </div>
        {onReload && (
          <button
            type="button"
            onClick={onReload}
            disabled={isLoading}
            className="rounded-lg px-3 py-1.5 text-xs transition-all"
            style={{ border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}
          >
            {isLoading ? 'Cargando...' : 'Actualizar'}
          </button>
        )}
      </div>

      {rows === null ? (
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Carga la auditoria para ver conciliacion por transaccion.
        </p>
      ) : rows.length === 0 ? (
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
          No hay transacciones en auditoria para los filtros actuales.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const tone = statusTone(row)
            const labels = alertLabels(row)
            const toneStyle =
              tone === 'ok'
                ? { bg: 'rgba(74,222,128,0.07)', border: 'rgba(74,222,128,0.2)', color: '#4ade80' }
                : tone === 'warn'
                  ? { bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.25)', color: '#fbbf24' }
                  : { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', color: '#ef4444' }

            return (
              <article
                key={row.transactionId}
                className="rounded-xl p-3 space-y-3"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{row.listingTitle}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
                      {row.sellerName} {'<-'} {row.buyerName}
                    </p>
                    <p className="text-[10px] font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.28)' }}>
                      TX: {row.transactionId}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Fecha</p>
                    <p className="text-xs text-white">{fmtDate(row.createdAt)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                  <div><p style={{ color: 'rgba(255,255,255,0.35)' }}>Estado TX</p><p className="text-white">{row.status}</p></div>
                  <div><p style={{ color: 'rgba(255,255,255,0.35)' }}>Metodo pago</p><p className="text-white">{row.paymentMethod}</p></div>
                  <div><p style={{ color: 'rgba(255,255,255,0.35)' }}>Bruto</p><p className="text-white">{fmtAmount(row.amount, row.currency)}</p></div>
                  <div><p style={{ color: 'rgba(255,255,255,0.35)' }}>Comision</p><p className="text-white">{fmtAmount(row.platformFeeAmount, row.currency)}</p></div>
                  <div><p style={{ color: 'rgba(255,255,255,0.35)' }}>Neto vendedor</p><p className="text-white">{fmtAmount(row.sellerNetAmount, row.currency)}</p></div>
                  <div><p style={{ color: 'rgba(255,255,255,0.35)' }}>Payout</p><p className="text-white">{fmtAmount(row.payoutAmount, row.currency)}</p></div>
                  <div><p style={{ color: 'rgba(255,255,255,0.35)' }}>Estado payout</p><p className="text-white">{row.payoutStatus ?? 'Sin payout'}</p></div>
                  <div><p style={{ color: 'rgba(255,255,255,0.35)' }}>Payout ID</p><p className="text-white font-mono">{row.payoutId ?? '-'}</p></div>
                </div>

                <div
                  className="rounded-lg px-2.5 py-2 text-[11px]"
                  style={{ background: toneStyle.bg, border: `1px solid ${toneStyle.border}`, color: toneStyle.color }}
                >
                  {labels.join(' · ')}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
