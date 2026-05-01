'use client'

import { cn } from '@/lib/utils'

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
  onNameChange,
  onEmailChange,
  onPhoneChange,
  onWhatsappConsentChange,
}: ContactStepProps) {
  const emailHasContent = email.length > 0
  const emailInvalid = emailHasContent && !isValidEmail(email)
  const phoneHasContent = phone.trim().length > 0
  const phoneInvalid = phoneHasContent && !isValidWhatsappVe(phone)

  return (
    <div className="space-y-4 md:space-y-3">
      <p className="text-sm text-text-secondary md:text-[11px]">
        Necesitamos tus datos para contactarte y confirmar tu solicitud.
      </p>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-2">
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
                <span className="block text-text-primary">
                  Autorizo a Turpial Sound a contactarme por WhatsApp al numero indicado para el
                  seguimiento operativo de esta reserva.
                </span>
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
        </div>
      </div>
    </div>
  )
}
