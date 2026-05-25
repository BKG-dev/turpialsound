'use client'

type BuyerPaymentDetailsCardProps = {
  paymentMethodLabel: string
  paymentReference?: string | null
  paymentSenderBank?: string | null
  paymentPaidAtLabel?: string | null
  paymentProofUrl?: string | null
  isBinancePayment: boolean
  status: string
  nextStep: string
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

function buyerValidationStatus(status: string) {
  if (status === 'PENDING_PAYMENT') return 'Pendiente de pago'
  if (status === 'PAYMENT_RECEIVED' || status === 'VALIDATING') return 'Pago reportado'
  if (status === 'IN_ESCROW') return 'Pago aprobado y fondos en custodia'
  if (status === 'DELIVERY_CONFIRMED') return 'Recepcion confirmada'
  if (status === 'RELEASED') return 'Operacion cerrada'
  if (status === 'DISPUTED') return 'En disputa'
  if (status === 'PAYMENT_FAILED') return 'Pago rechazado'
  if (status === 'REFUNDED') return 'Reembolsada'
  if (status === 'CANCELLED') return 'Cancelada'
  return 'Estado no disponible'
}

export function BuyerPaymentDetailsCard({
  paymentMethodLabel,
  paymentReference,
  paymentSenderBank,
  paymentPaidAtLabel,
  paymentProofUrl,
  isBinancePayment,
  status,
  nextStep,
}: BuyerPaymentDetailsCardProps) {
  return (
    <div
      className="space-y-3 rounded-2xl p-4"
      style={{ background: 'var(--mp-card-subtle)', border: '1px solid var(--mp-border)' }}
    >
      <div className="space-y-1">
        <p className="text-sm font-semibold" style={{ color: 'var(--mp-text-strong)' }}>Tu pago a la plataforma</p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--mp-text-muted)' }}>
          Aqui ves el pago que reportaste a Turpial Market y su estado de validacion.
        </p>
      </div>

      <div className="space-y-2">
        <DetailRow label="Metodo de pago" value={paymentMethodLabel} />
        <DetailRow
          label={isBinancePayment ? 'Referencia / hash Binance' : 'Referencia'}
          value={paymentReference?.trim() || 'No registrado'}
        />
        {!isBinancePayment && (
          <DetailRow label="Banco emisor" value={paymentSenderBank?.trim() || 'No registrado'} />
        )}
        <DetailRow label="Fecha reportada de pago" value={paymentPaidAtLabel || 'No registrado'} />
        <DetailRow label="Estado de validacion" value={buyerValidationStatus(status)} />
      </div>

      {paymentProofUrl ? (
        <a
          href={paymentProofUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex rounded-xl px-3 py-2 text-xs font-semibold"
          style={{ background: 'rgba(0,174,239,0.12)', color: '#00aeef', border: '1px solid rgba(0,174,239,0.24)' }}
        >
          Ver comprobante
        </a>
      ) : (
        <p className="text-xs" style={{ color: 'var(--mp-text-faint)' }}>Comprobante: No registrado</p>
      )}

      <p className="text-xs leading-relaxed" style={{ color: 'var(--mp-text-faint)' }}>
        Cuando confirmes recepcion, el equipo podra liberar los fondos al vendedor. Siguiente paso: {nextStep}
      </p>
    </div>
  )
}
