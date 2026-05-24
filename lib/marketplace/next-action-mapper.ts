export type MarketplaceViewAs = 'buyer' | 'seller'

export interface MarketplaceStatusHistoryEntry {
  toStatus: string
  reason: string | null
}

export interface MarketplaceTxLike {
  status: string
  statusHistory?: MarketplaceStatusHistoryEntry[] | null
  hasSellerPayoutSent?: boolean | null
}

export type MarketplacePrimaryAction =
  | 'report_payment'
  | 'mark_delivered'
  | 'confirm_received'
  | 'open_dispute'
  | 'setup_payout'
  | 'open_messages'
  | 'view_operation'
  | 'none'

export const MARKETPLACE_TIMELINE_MILESTONES = [
  { status: 'INITIATED', label: 'Iniciado' },
  { status: 'PENDING_PAYMENT', label: 'Pago pendiente' },
  { status: 'PAYMENT_RECEIVED', label: 'Pago recibido' },
  { status: 'VALIDATING', label: 'Validando' },
  { status: 'IN_ESCROW', label: 'Fondos en custodia' },
  { status: 'DELIVERY_CONFIRMED', label: 'Entrega confirmada' },
  { status: 'RELEASED', label: 'Pago liberado' },
  { status: 'PAYOUT_SENT', label: 'Pago enviado' },
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
      buyer: 'Los fondos ya fueron liberados. El equipo gestiona el envio del pago al vendedor.',
      seller: 'Fondos liberados. El equipo debe registrar el envio del pago a tu metodo de cobro.',
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
      seller: 'Espera la confirmacion de pago enviado por el equipo. Verifica que tu metodo de cobro este actualizado.',
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

export function hasSellerPayoutSentAudit(tx: Pick<MarketplaceTxLike, 'statusHistory' | 'hasSellerPayoutSent'>) {
  if (tx.hasSellerPayoutSent) return true

  return tx.statusHistory?.some((entry) => {
    const reason = (entry.reason ?? '').toLowerCase()
    return (
      reason.includes('pago al vendedor registrado') ||
      reason.includes('pago enviado al vendedor') ||
      reason.includes('payout_sent') ||
      reason.includes('payout sent')
    )
  }) ?? false
}

export function getBuyerCtaLabel(status: string) {
  if (status === 'PENDING_PAYMENT') return 'Reportar pago'
  if (status === 'PAYMENT_RECEIVED' || status === 'VALIDATING') return 'Pago reportado / esperando validacion'
  if (status === 'IN_ESCROW') return 'Pago validado / esperando entrega'
  if (status === 'DELIVERY_CONFIRMED') return 'Recepcion confirmada / esperando liberacion admin'
  if (status === 'RELEASED') return 'Fondos liberados'
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
    if (status === 'RELEASED') return 'Fondos liberados'
    if (status === 'DISPUTED') return 'En disputa'
  }

  if (viewAs === 'seller' && status === 'RELEASED') return 'Fondos liberados'
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

function normalizeTimelineStatus(status: string) {
  if (status === 'CANCELLED' || status === 'PAYMENT_FAILED') return 'PENDING_PAYMENT'
  if (status === 'REFUNDED') return 'INITIATED'
  if (status === 'DISPUTED') return 'IN_ESCROW'
  return status
}

function buildCardTitle(
  viewAs: MarketplaceViewAs,
  status: string,
  primaryAction: MarketplacePrimaryAction,
) {
  if (status === 'DISPUTED') return 'Disputa abierta'
  if (status === 'RELEASED') return viewAs === 'buyer' ? 'Operacion completada' : 'Pago en proceso'
  if (status === 'DELIVERY_CONFIRMED') return viewAs === 'buyer' ? 'Esperando liberacion admin' : 'Esperando al equipo'
  if (primaryAction === 'mark_delivered') return 'Tu siguiente paso'
  if (primaryAction === 'confirm_received') return 'Tu siguiente paso'
  if (primaryAction === 'report_payment') return 'Tu siguiente paso'
  if (primaryAction === 'setup_payout') return 'Configura tu cobro'
  if (primaryAction === 'open_messages') {
    return viewAs === 'buyer' ? 'Esperando al vendedor' : 'Esperando al comprador'
  }
  return 'Estado de la operacion'
}

function buildPrimaryAction(
  tx: MarketplaceTxLike,
  viewAs: MarketplaceViewAs,
  deliveredBySeller: boolean,
  hasUsablePayoutMethod: boolean,
): MarketplacePrimaryAction {
  if (tx.status === 'DISPUTED') return 'open_messages'

  if (viewAs === 'buyer') {
    if (tx.status === 'PENDING_PAYMENT') return 'report_payment'
    if (tx.status === 'IN_ESCROW' && deliveredBySeller) return 'confirm_received'
    if (tx.status === 'PAYMENT_RECEIVED' || tx.status === 'VALIDATING') return 'view_operation'
    if (tx.status === 'IN_ESCROW') return 'open_messages'
    if (tx.status === 'DELIVERY_CONFIRMED' || tx.status === 'RELEASED') return 'view_operation'
    return 'none'
  }

  if (tx.status === 'IN_ESCROW' && !deliveredBySeller) return 'mark_delivered'
  if (tx.status === 'RELEASED' && !hasUsablePayoutMethod) return 'setup_payout'
  if (tx.status === 'PENDING_PAYMENT' || tx.status === 'PAYMENT_RECEIVED' || tx.status === 'VALIDATING') {
    return 'open_messages'
  }
  if (tx.status === 'IN_ESCROW' || tx.status === 'DELIVERY_CONFIRMED' || tx.status === 'RELEASED') {
    return 'view_operation'
  }
  if (tx.status === 'DISPUTED') return 'open_messages'
  return 'none'
}

function buildSecondaryActions(
  tx: MarketplaceTxLike,
  viewAs: MarketplaceViewAs,
  primaryAction: MarketplacePrimaryAction,
): MarketplacePrimaryAction[] {
  const actions: MarketplacePrimaryAction[] = []

  if (primaryAction !== 'open_messages') actions.push('open_messages')
  if (primaryAction !== 'view_operation') actions.push('view_operation')

  const canOpenDispute = viewAs === 'buyer' && tx.status === 'IN_ESCROW'
  if (canOpenDispute && primaryAction !== 'open_dispute') {
    actions.push('open_dispute')
  }

  return actions
}

export function deriveMarketplaceOperationCardState(
  tx: MarketplaceTxLike,
  viewAs: MarketplaceViewAs,
  options?: { hasUsablePayoutMethod?: boolean; fallbackLabel?: string },
) {
  const derived = deriveMarketplaceNextActionState(tx, viewAs, options?.fallbackLabel)
  const payoutSent = tx.status === 'RELEASED' && hasSellerPayoutSentAudit(tx)
  const hasUsablePayoutMethod = options?.hasUsablePayoutMethod ?? true
  const primaryAction = payoutSent
    ? 'none'
    : buildPrimaryAction(tx, viewAs, derived.deliveredBySeller, hasUsablePayoutMethod)
  const resolvedTitle = payoutSent
    ? (viewAs === 'seller' ? 'Pago enviado' : 'Operacion completada')
    : buildCardTitle(viewAs, tx.status, primaryAction)
  const resolvedHumanStatus = payoutSent ? 'Pago enviado al vendedor' : derived.statusLabel
  const resolvedStatusCopy = payoutSent
    ? 'El equipo ya registro el envio del pago al vendedor. La operacion queda cerrada a nivel operativo.'
    : derived.statusCopy
  const resolvedNextStep = payoutSent
    ? 'No hay acciones pendientes para esta operacion.'
    : derived.nextStep

  return {
    title: resolvedTitle,
    humanStatus: resolvedHumanStatus,
    statusCopy: resolvedStatusCopy,
    nextStep: resolvedNextStep,
    deliveredBySeller: derived.deliveredBySeller,
    primaryAction,
    secondaryActions: buildSecondaryActions(tx, viewAs, primaryAction),
    canOpenDispute: viewAs === 'buyer' && tx.status === 'IN_ESCROW',
    payoutSent,
    timelineCurrentStatus: payoutSent ? 'PAYOUT_SENT' : normalizeTimelineStatus(tx.status),
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
