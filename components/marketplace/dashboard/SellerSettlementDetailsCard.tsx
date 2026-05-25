'use client'

type SellerSettlementDetailsCardProps = {
  grossAmountLabel: string
  platformFeeLabel?: string | null
  netAmountLabel?: string | null
  payoutStatusLabel: string
  payoutStatusHint: string
  paymentMethodLabel: string
  onOpenPayouts?: () => void
  payoutActionLabel?: string
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-xs"
      style={{ background: 'var(--mp-card-subtle)', border: '1px solid var(--mp-border)' }}
    >
      <span style={{ color: 'var(--mp-text-muted)' }}>{label}</span>
      <span className="text-right font-semibold" style={{ color: 'var(--mp-text-strong)' }}>{value}</span>
    </div>
  )
}

export function SellerSettlementDetailsCard({
  grossAmountLabel,
  platformFeeLabel,
  netAmountLabel,
  payoutStatusLabel,
  payoutStatusHint,
  paymentMethodLabel,
  onOpenPayouts,
  payoutActionLabel = 'Ir a Cobros',
}: SellerSettlementDetailsCardProps) {
  return (
    <div
      className="space-y-3 rounded-2xl p-4"
      style={{ background: 'var(--mp-card-subtle)', border: '1px solid var(--mp-border)' }}
    >
      <div className="space-y-1">
        <p className="text-sm font-semibold" style={{ color: 'var(--mp-text-strong)' }}>Tu cobro como vendedor</p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--mp-text-muted)' }}>
          Aqui ves el resumen de tu cobro por esta venta.
        </p>
      </div>

      <div className="space-y-2">
        <DetailRow label="Monto bruto de venta" value={grossAmountLabel} />
        <DetailRow label="Comision plataforma" value={platformFeeLabel || 'No disponible'} />
        <DetailRow label="Neto estimado a cobrar" value={netAmountLabel || 'No disponible'} />
        <DetailRow label="Metodo de pago del comprador" value={paymentMethodLabel} />
        <DetailRow label="Estado de fondos" value={payoutStatusLabel} />
      </div>

      <p className="text-xs leading-relaxed" style={{ color: 'var(--mp-text-faint)' }}>
        {payoutStatusHint}
      </p>

      {onOpenPayouts && (
        <button
          type="button"
          onClick={onOpenPayouts}
          className="inline-flex rounded-xl px-3 py-2 text-xs font-semibold"
          style={{ background: 'rgba(0,174,239,0.12)', color: '#00aeef', border: '1px solid rgba(0,174,239,0.24)' }}
        >
          {payoutActionLabel}
        </button>
      )}
    </div>
  )
}
