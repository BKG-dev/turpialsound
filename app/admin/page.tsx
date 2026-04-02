// app/admin/page.tsx — Panel interno Turpial Sound
// Fase 1A.5: placeholder estructural.
// La experiencia completa del panel (listado de solicitudes, aprobaciones, etc.)
// se construye en Fase 1C.

export default function AdminPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Panel interno</h1>
        <p className="mt-4 text-gray-600">
          Esta área es de acceso restringido para el equipo de Turpial Sound.
        </p>
        <p className="mt-2 text-sm text-gray-400">
          El sistema de autenticación y el panel completo se implementan en Fase 1C.
        </p>
      </div>
    </main>
  )
}
