'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

const WHATSAPP_ALLOWED_REGEX = /^\+58(412|414|416|424|426)\d{7}$/

export function normalizeWhatsappVe(value: string): string {
  const compact = value.replace(/[^\d+]/g, '')

  if (compact.startsWith('+58')) return compact
  if (compact.startsWith('58')) return `+${compact}`
  if (compact.startsWith('0')) return `+58${compact.slice(1)}`

  return compact
}

export function isValidWhatsappVe(value: string): boolean {
  return WHATSAPP_ALLOWED_REGEX.test(normalizeWhatsappVe(value))
}

interface ContactStepProps {
  name: string
  email: string
  phone: string
  whatsappConsentAccepted: boolean
  whatsappConsentError?: string | null
  whatsappVerificationStatus:
    | 'idle'
    | 'loading'
    | 'pending'
    | 'verified'
    | 'failed'
    | 'expired'
    | 'not_found'
  whatsappVerificationCode?: string | null
  whatsappVerificationError?: string | null
  whatsappVerificationChallengeId?: string | null
  whatsappVerificationExpiresAt?: string | null
  whatsappVerificationVerifiedAt?: string | null
  whatsappVerificationPhone?: string | null
  whatsappFlowMode: 'manual_code' | 'secure_link'
  secureLinkRequestState?: 'idle' | 'loading' | 'sent' | 'failed'
  secureLinkExpiresAt?: string | null
  secureLinkError?: string | null
  onPrimarySecureLinkAction: () => void
  onStartWhatsappVerification: () => void
  onSendSecureLink: () => void
  onUseManualCodeFallback: () => void
  onRetryOpenWhatsapp: () => void
  onCopyWhatsappCode: () => void
  onManualWhatsappStatusCheck: () => void
  onNameChange: (value: string) => void
  onEmailChange: (value: string) => void
  onPhoneChange: (value: string) => void
  onWhatsappConsentChange: (value: boolean) => void
}

export function ContactStep({
  name,
  email,
  phone,
  whatsappConsentAccepted,
  whatsappConsentError,
  whatsappVerificationStatus,
  whatsappVerificationCode,
  whatsappVerificationError,
  whatsappVerificationChallengeId,
  whatsappVerificationExpiresAt,
  whatsappVerificationVerifiedAt,
  whatsappVerificationPhone,
  whatsappFlowMode,
  secureLinkRequestState = 'idle',
  secureLinkExpiresAt,
  secureLinkError,
  onPrimarySecureLinkAction,
  onStartWhatsappVerification,
  onSendSecureLink,
  onUseManualCodeFallback,
  onRetryOpenWhatsapp,
  onCopyWhatsappCode,
  onManualWhatsappStatusCheck,
  onNameChange,
  onEmailChange,
  onPhoneChange,
  onWhatsappConsentChange,
}: ContactStepProps) {
  const emailHasContent = email.length > 0
  const emailInvalid = emailHasContent && !isValidEmail(email)
  const phoneHasContent = phone.trim().length > 0
  const phoneInvalid = phoneHasContent && !isValidWhatsappVe(phone)
  const canStartVerification = !phoneInvalid && phoneHasContent
  const isSecureLinkMode = whatsappFlowMode === 'secure_link'
  const secureLinkPrimaryLabel =
    secureLinkRequestState === 'loading'
      ? 'Enviando enlace seguro...'
      : 'Enviar enlace seguro a mi WhatsApp'
  return (
    <div className="space-y-3 md:space-y-2.5">
      <p className="text-[12px] text-text-secondary md:text-[11px]">
        Necesitamos tus datos para contactarte y confirmar tu solicitud.
      </p>

      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 md:gap-2">
        <div>
          <label
            htmlFor="requester-name"
            className="mb-1.5 block text-sm font-medium text-text-primary md:text-[11px]"
          >
            Nombre completo
            <span className="ml-1.5 text-xs font-normal text-accent-gold">*</span>
          </label>
          <input
            id="requester-name"
            type="text"
            autoComplete="name"
            placeholder="Tu nombre"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className={cn(
              'w-full rounded-lg border bg-brand-surface px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors md:text-[13px]',
              'focus:border-accent-gold',
              name.trim() ? 'border-accent-gold/50' : 'border-brand-border',
            )}
          />
        </div>

        <div>
          <label
            htmlFor="requester-email"
            className="mb-1.5 block text-sm font-medium text-text-primary md:text-[11px]"
          >
            Correo electronico
            <span className="ml-1.5 text-xs font-normal text-accent-gold">*</span>
          </label>
          <input
            id="requester-email"
            type="email"
            autoComplete="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            className={cn(
              'w-full rounded-lg border bg-brand-surface px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors md:text-[13px]',
              'focus:border-accent-gold',
              emailInvalid
                ? 'border-red-500/70'
                : emailHasContent
                  ? 'border-accent-gold/50'
                  : 'border-brand-border',
            )}
          />
          {emailInvalid && (
            <p className="mt-1 text-[11px] text-red-400">Introduce un correo electronico valido.</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor="requester-phone"
            className="mb-1.5 block text-sm font-medium text-text-primary md:text-[11px]"
          >
            WhatsApp
            <span className="ml-1.5 text-xs font-normal text-accent-gold">*</span>
          </label>
          <input
            id="requester-phone"
            type="tel"
            autoComplete="tel"
            placeholder="0412 123 4567 o +58 412 123 4567"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            className={cn(
              'w-full rounded-lg border bg-brand-surface px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors md:text-[13px]',
              'focus:border-accent-gold',
              phoneInvalid
                ? 'border-red-500/70'
                : phoneHasContent
                  ? 'border-accent-gold/50'
                  : 'border-brand-border',
            )}
          />
          {phoneInvalid ? (
            <p className="mt-1 text-[11px] text-red-400">
              Introduce un numero movil de Venezuela valido. Ejemplos: 04121234567 o +584121234567.
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-text-muted">
              Usaremos este numero para coordinar por WhatsApp.
            </p>
          )}

          <div
            id="requester-whatsapp-consent-block"
            tabIndex={-1}
            className={cn(
              'mt-3 rounded-md border bg-brand-bg/20 px-3 py-2 outline-none transition-colors',
              whatsappConsentError
                ? 'border-red-500/70 bg-red-500/10 ring-1 ring-red-500/30'
                : 'border-brand-border/80',
            )}
          >
            <label
              htmlFor="requester-whatsapp-consent"
              className="flex cursor-pointer items-start gap-2"
            >
              <input
                id="requester-whatsapp-consent"
                type="checkbox"
                checked={whatsappConsentAccepted}
                onChange={(event) => onWhatsappConsentChange(event.target.checked)}
                aria-invalid={Boolean(whatsappConsentError)}
                aria-describedby={whatsappConsentError ? 'requester-whatsapp-consent-error' : undefined}
                className="mt-0.5 h-4 w-4 rounded border-brand-border bg-brand-surface accent-accent-gold"
              />
              <span className="space-y-1 text-[11px] leading-snug">
                <span className="block text-text-primary">Acepto recibir por WhatsApp mensajes de Turpial Sound.</span>
                <span className="block text-text-muted">
                  Sin esta autorizacion no podremos dar seguimiento operativo a tu reserva por
                  WhatsApp.
                </span>
              </span>
            </label>

            {whatsappConsentError && (
              <p
                id="requester-whatsapp-consent-error"
                className="mt-2 text-[11px] text-red-300"
                role="alert"
              >
                {whatsappConsentError}
              </p>
            )}
          </div>

          {isSecureLinkMode && whatsappVerificationStatus !== 'verified' && (
            <div className="mt-2 flex justify-stretch sm:justify-end">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={onPrimarySecureLinkAction}
                disabled={secureLinkRequestState === 'loading'}
                className="w-full sm:w-auto"
              >
                {secureLinkPrimaryLabel}
              </Button>
            </div>
          )}

          <div className="mt-2.5 rounded-lg border border-brand-border/80 bg-brand-bg/20 p-2.5">
            <p className="text-[10px] text-text-secondary">
              Confirmamos tu WhatsApp para proteger la disponibilidad de las salas.
            </p>

            {isSecureLinkMode ? (
              <div className="mt-2 space-y-2">
                <div className="rounded-md border border-brand-border/70 bg-brand-bg/30 px-2.5 py-1.5">
                  <p className="text-[11px] font-medium text-text-primary">
                    Te enviaremos un enlace seguro para continuar tu solicitud desde este numero.
                  </p>
                  {secureLinkRequestState === 'sent' && (
                    <p className="mt-0.5 text-[10px] text-emerald-300">
                      Enlace enviado. Abre WhatsApp y toca el enlace para volver al resumen.
                    </p>
                  )}
                  {secureLinkRequestState === 'loading' && (
                    <p className="mt-0.5 text-[10px] text-text-muted">Enviando enlace seguro...</p>
                  )}
                  {secureLinkExpiresAt && secureLinkRequestState === 'sent' && (
                    <p className="mt-0.5 text-[10px] text-text-muted">
                      Vence: {new Date(secureLinkExpiresAt).toLocaleString('es-VE')}
                    </p>
                  )}
                  {secureLinkError && (
                    <p className="mt-0.5 text-[10px] text-red-300">{secureLinkError}</p>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onUseManualCodeFallback}
                  >
                    Prefiero verificar con codigo
                  </Button>
                  {secureLinkRequestState === 'sent' && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={onSendSecureLink}
                      disabled={!canStartVerification}
                    >
                      Reenviar enlace
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <>

            {whatsappVerificationStatus === 'verified' ? (
              <div className="mt-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5">
                <p className="text-[11px] font-medium text-emerald-300">WhatsApp verificado</p>
                <p className="text-[10px] text-emerald-200/90">
                  Numero validado: {whatsappVerificationPhone ?? normalizeWhatsappVe(phone)}
                </p>
                {whatsappVerificationVerifiedAt ? (
                  <p className="text-[10px] text-emerald-200/90">
                    Verificado: {new Date(whatsappVerificationVerifiedAt).toLocaleString('es-VE')}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                {whatsappVerificationStatus === 'pending' && (
                  <div className="rounded-md border border-accent-gold/30 bg-accent-gold/10 px-2.5 py-1.5">
                    <p className="text-[11px] font-medium text-text-primary">Esperando verificacion...</p>
                    {whatsappVerificationExpiresAt ? (
                      <p className="mt-0.5 text-[10px] text-text-muted">
                        Expira: {new Date(whatsappVerificationExpiresAt).toLocaleString('es-VE')}
                      </p>
                    ) : null}
                  </div>
                )}

                {(whatsappVerificationStatus === 'pending' ||
                  whatsappVerificationStatus === 'failed' ||
                  whatsappVerificationStatus === 'expired' ||
                  whatsappVerificationStatus === 'not_found') && (
                  <div className="grid grid-cols-2 gap-1.5">
                    <Button type="button" variant="ghost" size="sm" onClick={onRetryOpenWhatsapp}>
                      Abrir WhatsApp de nuevo
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={onCopyWhatsappCode}
                      disabled={!whatsappVerificationCode}
                    >
                      Copiar codigo
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={onManualWhatsappStatusCheck}
                      disabled={!whatsappVerificationChallengeId}
                    >
                      Ya envie el mensaje
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={onStartWhatsappVerification}
                      disabled={!canStartVerification}
                    >
                      Cambiar numero
                    </Button>
                  </div>
                )}

                {whatsappVerificationStatus === 'expired' && (
                  <p className="text-[10px] text-amber-300">
                    La verificacion vencio. Verifica nuevamente para continuar.
                  </p>
                )}

                {whatsappVerificationError && (
                  <p className="text-[10px] text-red-300">{whatsappVerificationError}</p>
                )}
              </div>
            )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
