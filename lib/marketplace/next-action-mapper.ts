export type MarketplaceViewAs = 'buyer' | 'seller'

export interface MarketplaceStatusHistoryEntry {
  toStatus: string
  reason: string | null
}

export interface MarketplaceTxLike {
  status: string
  statusHistory?: MarketplaceStatusHistoryEntry[] | null
}

export const MARKETPLACE_TIMELINE_MILESTONES = [
  { status: 'INITIATED', label: 'Iniciado' },
  { status: 'PENDING_PAYMENT', label: 'Pago pendiente' },
  { status: 'PAYMENT_RECEIVED', label: 'Pago recibido' },
  { status: 'VALIDATING', label: 'Validando' },
  { status: 'IN_ESCROW', label: 'Fondos en custodia' },
  { status: 'DELIVERY_CONFIRMED', label: 'Entrega confirmada' },
  { status: 'RELEASED', label: 'Pago liberado' },
] as const

export const MARKETPLACE_TERMINAL_STATUSES = ['CANCELLED', 'PAYMENT_FAILED', 'REFUNDED'] as const

function getOperationalStatusCopy(status: string, viewAs: MarketplaceViewAs) {
  const copy: Record<string, { buyer: string; seller: string }> = {
    PENDING_PAYMENT: {
      buyer: 'Completa el pago para iniciar la validacion.',
      seller: 'El comprador inicio la compra, pero aun no ha reportado el pago.',
    },
    PAYMENT_RECEIVED: {
      buyer: 'Estamos validando tu pago. Te avisaremos cuando avance.',
      seller: 'El comprador ya reporto el pago. Estamos verificando y te notificaremos cuando la operacion avance.',
    },
    VALIDATING: {
      buyer: 'Estamos validando tu pago. Te avisaremos cuando avance.',
      seller: 'El pago esta siendo verificado. Te notificaremos cuando quede conciliado.',
    },
    IN_ESCROW: {
      buyer: 'Los fondos estan protegidos. Coordina la entrega con el vendedor.',
      seller: 'El pago ya fue validado. Completa la entrega para avanzar al cierre de la venta.',
    },
    DELIVERY_CONFIRMED: {
      buyer: 'Confirmaste la recepcion. La operacion esta lista para liberacion admin si no hay disputa.',
      seller: 'El comprador confirmo recepcion. El pago al vendedor queda pendiente de liberacion admin.',
    },
    RELEASED: {
      buyer: 'La operacion esta completa. El vendedor recibira su pago.',
      seller: 'El pago esta siendo procesado por el equipo. Asegurate de tener tus datos de cobro actualizados.',
    },
    DISPUTED: {
      buyer: 'La operacion esta en revision. No se liberaran fondos hasta resolverla.',
      seller: 'La transaccion entro en disputa. El dinero queda retenido hasta la resolucion.',
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
      seller: 'La disputa se resolvio a favor del comprador y no habra cobro para esta operacion.',
    },
  }

  return copy[status]?.[viewAs] ?? 'Consulta el estado de la transaccion para continuar con el siguiente paso.'
}

function getOperationalNextStep(status: string, viewAs: MarketplaceViewAs) {
  const nextStep: Record<string, { buyer: string; seller: string }> = {
    PENDING_PAYMENT: {
      buyer: 'Reporta tu pago con referencia, fecha y comprobante para iniciar la validacion.',
      seller: 'Espera a que el comprador reporte el pago para que el equipo pueda validarlo.',
    },
    PAYMENT_RECEIVED: {
      buyer: 'Espera la validacion manual. No hace falta reenviar el comprobante salvo que soporte lo solicite.',
      seller: 'Espera la conciliacion manual. Te notificaremos cuando la operacion avance o si hace falta revision adicional.',
    },
    VALIDATING: {
      buyer: 'Mantente atento a la confirmacion del equipo mientras termina la conciliacion.',
      seller: 'Mantente atento a la confirmacion del equipo mientras termina la conciliacion.',
    },
    IN_ESCROW: {
      buyer: 'Coordina la entrega y abre disputa solo si aparece una incidencia real.',
      seller: 'Completa la entrega para que la venta pueda avanzar a cierre y cobro.',
    },
    DELIVERY_CONFIRMED: {
      buyer: 'Espera la liberacion admin. La operacion todavia no esta cerrada.',
      seller: 'Espera la liberacion admin antes de considerar cobrable la operacion.',
    },
    RELEASED: {
      buyer: 'El pago al vendedor esta siendo gestionado. No necesitas hacer nada adicional.',
      seller: 'El pago esta en cola para ser enviado. Si tu metodo de cobro esta actualizado, no necesitas hacer nada mas.',
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

  return nextStep[status]?.[viewAs] ?? 'Revisa la linea de estado para identificar el siguiente paso.'
}

export function hasSellerDeliveryAudit(tx: Pick<MarketplaceTxLike, 'statusHistory'>) {
  return tx.statusHistory?.some(entry =>
    entry.toStatus === 'IN_ESCROW' &&
    (entry.reason ?? '').includes('seller_delivered'),
  ) ?? false
}

export function getBuyerCtaLabel(status: string) {
  if (status === 'PENDING_PAYMENT') return 'Reportar pago'
  if (status === 'PAYMENT_RECEIVED' || status === 'VALIDATING') return 'Pago reportado / esperando validacion'
  if (status === 'IN_ESCROW') return 'Pago validado / esperando entrega'
  if (status === 'DELIVERY_CONFIRMED') return 'Recepcion confirmada / esperando liberacion admin'
  if (status === 'RELEASED') return 'Pago al vendedor pendiente'
  if (status === 'DISPUTED') return 'En disputa / esperando resolucion'
  return 'Ver detalle'
}

export function getStatusLabelForView(
  status: string,
  viewAs: MarketplaceViewAs,
  fallbackLabel?: string,
) {
  if (viewAs === 'buyer') {
    if (status === 'PENDING_PAYMENT') return 'Reportar pago'
    if (status === 'PAYMENT_RECEIVED' || status === 'VALIDATING') return 'Pago reportado'
    if (status === 'IN_ESCROW') return 'Pago validado'
    if (status === 'DELIVERY_CONFIRMED') return 'Recepcion confirmada'
    if (status === 'RELEASED') return 'Pago al vendedor pendiente'
    if (status === 'DISPUTED') return 'En disputa'
  }

  return fallbackLabel ?? status
}

export function deriveMarketplaceNextActionState(
  tx: MarketplaceTxLike,
  viewAs: MarketplaceViewAs,
  fallbackLabel?: string,
) {
  const deliveredBySeller = tx.status === 'IN_ESCROW' && hasSellerDeliveryAudit(tx)

  let statusLabel: string
  if (deliveredBySeller) {
    statusLabel = viewAs === 'buyer' ? 'Entrega registrada' : 'Entrega reportada'
  } else if (tx.status === 'DELIVERY_CONFIRMED') {
    statusLabel = 'Recepcion confirmada'
  } else {
    statusLabel = getStatusLabelForView(tx.status, viewAs, fallbackLabel)
  }

  let statusCopy: string
  if (deliveredBySeller) {
    statusCopy = viewAs === 'buyer'
      ? 'El vendedor registro la entrega. Confirma recepcion solo si ya revisaste y estas conforme.'
      : 'La entrega quedo registrada. Los fondos siguen protegidos hasta que el comprador confirme y admin libere.'
  } else if (tx.status === 'DELIVERY_CONFIRMED') {
    statusCopy = viewAs === 'buyer'
      ? 'Confirmaste la recepcion. El admin debe liberar el pago al vendedor si no hay disputa activa.'
      : 'El comprador confirmo la recepcion. El admin debe liberar el pago antes de marcarlo como enviado.'
  } else {
    statusCopy = getOperationalStatusCopy(tx.status, viewAs)
  }

  let nextStep: string
  if (deliveredBySeller) {
    nextStep = viewAs === 'buyer'
      ? 'Confirma recibido solo si estas conforme, o abre disputa si hay una incidencia real.'
      : 'Espera la confirmacion del comprador. No hay fondos liberados todavia.'
  } else if (tx.status === 'DELIVERY_CONFIRMED') {
    nextStep = 'Espera la liberacion admin. La operacion todavia no esta pagada al vendedor.'
  } else {
    nextStep = getOperationalNextStep(tx.status, viewAs)
  }

  return {
    deliveredBySeller,
    statusLabel,
    statusCopy,
    nextStep,
    buyerCtaLabel: getBuyerCtaLabel(tx.status),
  }
}

export function getMarketplaceTimelineState(
  currentStatus: string,
  milestoneStatus: string,
): 'completed' | 'current' | 'pending' {
  const currentIdx = MARKETPLACE_TIMELINE_MILESTONES.findIndex(m => m.status === currentStatus)
  const milestoneIdx = MARKETPLACE_TIMELINE_MILESTONES.findIndex(m => m.status === milestoneStatus)

  if (milestoneIdx === -1) return 'pending'
  if (currentIdx === -1) return 'pending'
  if (milestoneIdx < currentIdx) return 'completed'
  if (milestoneIdx === currentIdx) return 'current'
  return 'pending'
}
