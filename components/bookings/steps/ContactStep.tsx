'use client'

// Turpial Sound — Paso 5 del wizard: datos del solicitante
// Campos: nombre (requerido), email (requerido + validación básica), teléfono (opcional).
// Decisión: teléfono es opcional — el email es el canal primario de confirmación;
//           el teléfono facilita coordinación rápida pero no debe bloquear el envío.

import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────────
// VALIDACIÓN
// ─────────────────────────────────────────────────────────────────

/** Validación de email básica. Se exporta para que BookingWizard pueda usarla en canProceed. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

// ─────────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────────

interface ContactStepProps {
  name: string
  email: string
  phone: string
  onNameChange: (value: string) => void
  onEmailChange: (value: string) => void
  onPhoneChange: (value: string) => void
}

// ─────────────────────────────────────────────────────────────────
// COMPONENTE
// ─────────────────────────────────────────────────────────────────

export function ContactStep({
  name,
  email,
  phone,
  onNameChange,
  onEmailChange,
  onPhoneChange,
}: ContactStepProps) {
  const emailHasContent = email.length > 0
  const emailInvalid = emailHasContent && !isValidEmail(email)

  return (
    <div className="space-y-6">
      <p className="text-sm text-text-secondary">
        Necesitamos tus datos para contactarte y confirmar tu solicitud.
      </p>

      {/* Nombre completo */}
      <div>
        <label
          htmlFor="requester-name"
          className="mb-2 block text-sm font-medium text-text-primary"
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
            'w-full rounded-lg border bg-brand-surface px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors',
            'focus:border-accent-gold',
            name.trim() ? 'border-accent-gold/50' : 'border-brand-border',
          )}
        />
      </div>

      {/* Correo electrónico */}
      <div>
        <label
          htmlFor="requester-email"
          className="mb-2 block text-sm font-medium text-text-primary"
        >
          Correo electrónico
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
            'w-full rounded-lg border bg-brand-surface px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors',
            'focus:border-accent-gold',
            emailInvalid
              ? 'border-red-500/70'
              : emailHasContent
                ? 'border-accent-gold/50'
                : 'border-brand-border',
          )}
        />
        {emailInvalid && (
          <p className="mt-1.5 text-xs text-red-400">
            Introduce un correo electrónico válido.
          </p>
        )}
      </div>

      {/* Teléfono — opcional */}
      <div>
        <label
          htmlFor="requester-phone"
          className="mb-2 block text-sm font-medium text-text-primary"
        >
          Teléfono
          <span className="ml-1.5 text-xs font-normal text-text-muted">(opcional)</span>
        </label>
        <input
          id="requester-phone"
          type="tel"
          autoComplete="tel"
          placeholder="+58 412 000 0000"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          className={cn(
            'w-full rounded-lg border bg-brand-surface px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors',
            'focus:border-accent-gold',
            phone.trim() ? 'border-accent-gold/50' : 'border-brand-border',
          )}
        />
        <p className="mt-1.5 text-xs text-text-muted">
          Útil para coordinación rápida antes de la confirmación oficial.
        </p>
      </div>
    </div>
  )
}
