// Turpial Sound — Pasos del proceso de solicitud
// Componente visual (server). Muestra el flujo general al visitante.
// No contiene lógica de estado ni interacción.

interface ProcessStep {
  number: number
  title: string
  description: string
}

const PROCESS_STEPS: ProcessStep[] = [
  {
    number: 1,
    title: 'Solicita tu fecha',
    description: 'Completa el formulario con los detalles de tu proyecto y el servicio que necesitas.',
  },
  {
    number: 2,
    title: 'Revisamos disponibilidad',
    description: 'El equipo verifica disponibilidad de espacios y recursos para tu fecha.',
  },
  {
    number: 3,
    title: 'Aprobación interna',
    description: 'Los directivos confirman las condiciones y se genera una propuesta formal.',
  },
  {
    number: 4,
    title: 'Confirmación oficial',
    description: 'Recibes la confirmación con todos los detalles para agendar tu sesión.',
  },
]

export function BookingProcessSteps() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {PROCESS_STEPS.map((step) => (
        <div
          key={step.number}
          className="relative rounded-xl border border-brand-border bg-brand-surface p-6"
        >
          <span
            className="mb-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent-gold/10 text-sm font-bold text-accent-gold"
            aria-hidden="true"
          >
            {step.number}
          </span>
          <h3 className="font-display text-base font-semibold text-text-primary">
            {step.title}
          </h3>
          <p className="mt-2 text-sm text-text-secondary">{step.description}</p>
        </div>
      ))}
    </div>
  )
}
