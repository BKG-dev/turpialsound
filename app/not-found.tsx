import { Button } from '@/components/ui/Button'

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="container-base text-center">
        <p className="font-display text-8xl font-bold text-brand-muted">404</p>
        <h1 className="mt-6 text-display-md font-display font-bold text-text-primary">
          Página no encontrada
        </h1>
        <p className="mx-auto mt-4 max-w-narrow text-body-base text-text-secondary">
          La página que buscas no existe o fue movida.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Button as="link" href="/" variant="primary" size="md">
            Volver al inicio
          </Button>
          <Button as="link" href="/contacto" variant="secondary" size="md">
            Contactar
          </Button>
        </div>
      </div>
    </div>
  )
}
