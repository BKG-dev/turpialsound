import { MessageCircle } from 'lucide-react'
import { siteConfig } from '@/content/site'
import { formatWhatsAppUrl } from '@/lib/utils'

interface ContactBlockProps {
  heading?: string
  subheading?: string
  showEmail?: boolean
}

export function ContactBlock({
  heading = 'Hablemos',
  subheading = 'Cuéntanos sobre tu proyecto y revisamos disponibilidad.',
  showEmail = true,
}: ContactBlockProps) {
  const whatsappUrl = formatWhatsAppUrl(
    siteConfig.phoneWhatsApp,
    'Hola, me interesa saber más sobre Turpial Sound.', // SUGGESTED — adjust per service page
  )

  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface p-8 md:p-12">
      <h2 className="text-display-md font-display font-bold text-text-primary">{heading}</h2>
      <p className="mt-3 text-body-base text-text-secondary">{subheading}</p>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] px-8 py-4 text-base font-semibold leading-none text-white transition-colors duration-250 hover:bg-[#1ebe5e]"
        >
          <MessageCircle size={20} aria-hidden="true" />
          Escribir por WhatsApp
        </a>

        {showEmail && siteConfig.email && (
          <a
            href={`mailto:${siteConfig.email}`}
            className="text-sm text-text-secondary transition-colors hover:text-accent-gold"
          >
            {siteConfig.email}
          </a>
        )}
      </div>

      <p className="mt-6 text-sm text-text-muted">
        {/* CLIENT_REQUIRED: horario de atención real */}
        Respondemos en menos de 24 horas en días hábiles.{/* SUGGESTED */}
      </p>
    </div>
  )
}
