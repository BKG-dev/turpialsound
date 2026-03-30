import { Button } from '@/components/ui/Button'

export default function NotFound() {
  return (
    <div className="relative flex min-h-[80vh] items-center justify-center overflow-hidden">
      {/* Background glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 50% 40% at 50% 50%, rgba(0,174,239,0.06) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      <div className="container-base relative text-center">
        <p className="font-display text-[8rem] leading-none text-brand-muted">404</p>
        <h1 className="mt-4 font-display text-display-md text-text-primary">
          Página no encontrada
        </h1>
        <p className="mx-auto mt-4 max-w-narrow text-body-base text-text-secondary">
          La página que buscas no existe o fue movida.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Button as="link" href="/" variant="primary" size="md">
            Volver al inicio
          </Button>
          <Button as="link" href="/contacto" variant="glow-cyan" size="md">
            Contactar
          </Button>
        </div>
      </div>
    </div>
  )
}
