import { AlertTriangle, CheckCircle2, Clock3, MessageSquare, PackageCheck, Wallet } from 'lucide-react'
import {
  getMarketplaceTimelineState,
  type MarketplacePrimaryAction,
  type MarketplaceViewAs,
} from '@/lib/marketplace/next-action-mapper'

interface OperationNextStepCardState {
  title: string
  humanStatus: string
  statusCopy: string
  nextStep: string
  primaryAction: MarketplacePrimaryAction
  secondaryActions: MarketplacePrimaryAction[]
  deliveredBySeller: boolean
  timelineCurrentStatus: string
}

interface OperationNextStepCardProps {
  state: OperationNextStepCardState
  role: MarketplaceViewAs
  onReportPayment?: () => void
  onMarkDelivered?: () => void
  onConfirmReceived?: () => void
  onOpenDispute?: () => void
  onOpenMessages?: () => void
  onViewOperation?: () => void
  onSetupPayout?: () => void
}

type ActionConfig = {
  label: string
  onClick?: () => void
  tone: 'primary' | 'neutral' | 'warning'
  icon: typeof Clock3
}

const SIMPLE_TIMELINE = [
  { key: 'INITIATED', label: 'Compra creada' },
  { key: 'PAYMENT_RECEIVED', label: 'Pago reportado' },
  { key: 'IN_ESCROW', label: 'Pago aprobado' },
  { key: 'SELLER_DELIVERED', label: 'Entregado' },
  { key: 'DELIVERY_CONFIRMED', label: 'Confirmado' },
  { key: 'RELEASED', label: 'Liberado' },
] as const

function actionToConfig(
  action: MarketplacePrimaryAction,
  handlers: Pick<
    OperationNextStepCardProps,
    | 'onReportPayment'
    | 'onMarkDelivered'
    | 'onConfirmReceived'
    | 'onOpenDispute'
    | 'onOpenMessages'
    | 'onViewOperation'
    | 'onSetupPayout'
  >,
): ActionConfig | null {
  if (action === 'report_payment') {
    return { label: 'Reportar pago', onClick: handlers.onReportPayment, tone: 'primary', icon: Wallet }
  }
  if (action === 'mark_delivered') {
    return { label: 'Marcar entregado', onClick: handlers.onMarkDelivered, tone: 'primary', icon: PackageCheck }
  }
  if (action === 'confirm_received') {
    return { label: 'Confirmar recibido', onClick: handlers.onConfirmReceived, tone: 'primary', icon: CheckCircle2 }
  }
  if (action === 'open_dispute') {
    return { label: 'Abrir disputa', onClick: handlers.onOpenDispute, tone: 'warning', icon: AlertTriangle }
  }
  if (action === 'setup_payout') {
    return { label: 'Configurar cobro', onClick: handlers.onSetupPayout, tone: 'primary', icon: Wallet }
  }
  if (action === 'open_messages') {
    return { label: 'Ir a mensajes', onClick: handlers.onOpenMessages, tone: 'neutral', icon: MessageSquare }
  }
  if (action === 'view_operation') {
    return { label: 'Ver operacion', onClick: handlers.onViewOperation, tone: 'neutral', icon: Clock3 }
  }
  return null
}

function toneStyles(tone: ActionConfig['tone'], disabled: boolean) {
  if (disabled) {
    return {
      background: 'rgba(255,255,255,0.03)',
      color: 'var(--mp-text-disabled)',
      border: '1px solid var(--mp-border)',
    }
  }
  if (tone === 'primary') {
    return {
      background: 'rgba(0,174,239,0.12)',
      color: '#00aeef',
      border: '1px solid rgba(0,174,239,0.24)',
    }
  }
  if (tone === 'warning') {
    return {
      background: 'rgba(249,115,22,0.12)',
      color: '#f97316',
      border: '1px solid rgba(249,115,22,0.24)',
    }
  }
  return {
    background: 'var(--mp-card-subtle)',
    color: 'var(--mp-text-strong)',
    border: '1px solid var(--mp-border)',
  }
}

export function OperationNextStepCard({
  state,
  role,
  onReportPayment,
  onMarkDelivered,
  onConfirmReceived,
  onOpenDispute,
  onOpenMessages,
  onViewOperation,
  onSetupPayout,
}: OperationNextStepCardProps) {
  const primaryConfig = actionToConfig(state.primaryAction, {
    onReportPayment,
    onMarkDelivered,
    onConfirmReceived,
    onOpenDispute,
    onOpenMessages,
    onViewOperation,
    onSetupPayout,
  })

  const secondaryConfigs = state.secondaryActions
    .map(action => actionToConfig(action, {
      onReportPayment,
      onMarkDelivered,
      onConfirmReceived,
      onOpenDispute,
      onOpenMessages,
      onViewOperation,
      onSetupPayout,
    }))
    .filter((config): config is ActionConfig => Boolean(config))

  const deliveredCompleted = state.deliveredBySeller || ['DELIVERY_CONFIRMED', 'RELEASED'].includes(state.timelineCurrentStatus)

  return (
    <section
      className="rounded-2xl p-4 space-y-4"
      style={{ background: 'var(--mp-card-subtle)', border: '1px solid var(--mp-border)' }}
    >
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--mp-text-faint)' }}>
          {state.title}
        </p>
        <h4 className="text-sm font-semibold" style={{ color: 'var(--mp-text-strong)' }}>
          {state.humanStatus}
        </h4>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--mp-text-muted)' }}>
          {state.statusCopy}
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--mp-text-faint)' }}>
          <span className="font-medium" style={{ color: 'var(--mp-text-strong)' }}>Siguiente paso:</span> {state.nextStep}
        </p>
      </div>

      {primaryConfig && (
        <button
          type="button"
          onClick={primaryConfig.onClick}
          disabled={!primaryConfig.onClick}
          className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:cursor-not-allowed"
          style={toneStyles(primaryConfig.tone, !primaryConfig.onClick)}
        >
          <primaryConfig.icon size={14} />
          {primaryConfig.label}
        </button>
      )}

      {secondaryConfigs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {secondaryConfigs.map(config => {
            const disabled = !config.onClick
            return (
              <button
                key={`${config.label}-${role}`}
                type="button"
                onClick={config.onClick}
                disabled={disabled}
                className="rounded-xl px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:cursor-not-allowed"
                style={toneStyles(config.tone, disabled)}
              >
                <config.icon size={12} />
                {config.label}
              </button>
            )
          })}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--mp-text-faint)' }}>
          Progreso
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {SIMPLE_TIMELINE.map(step => {
            let stateValue: 'completed' | 'current' | 'pending'
            if (step.key === 'SELLER_DELIVERED') {
              stateValue = deliveredCompleted ? 'completed' : (state.timelineCurrentStatus === 'IN_ESCROW' ? 'current' : 'pending')
            } else {
              stateValue = getMarketplaceTimelineState(state.timelineCurrentStatus, step.key)
            }

            const isCompleted = stateValue === 'completed'
            const isCurrent = stateValue === 'current'

            return (
              <div
                key={step.key}
                className="rounded-xl px-2.5 py-2 text-[11px] leading-tight"
                style={{
                  background: isCompleted ? 'rgba(74,222,128,0.09)' : isCurrent ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.02)',
                  border: isCompleted
                    ? '1px solid rgba(74,222,128,0.26)'
                    : isCurrent
                      ? '1px solid rgba(245,158,11,0.28)'
                      : '1px solid var(--mp-border)',
                  color: isCompleted ? '#4ade80' : isCurrent ? '#f59e0b' : 'var(--mp-text-faint)',
                }}
              >
                {step.label}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
