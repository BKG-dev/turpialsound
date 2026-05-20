# Resultado 1B.2 — Pasos 1 y 2 funcionales del wizard: servicio y modalidad

## Estado: COMPLETADA

---

## Objetivo de la tarea

Hacer funcionales los primeros dos pasos del wizard público:
1. Selección de servicio (ya existía)
2. Selección de modalidad/variante (nuevo)

Y eliminar la duplicación frágil del catálogo estático que vivía incrustado en `ServiceSelectStep.tsx`.

---

## Archivos creados/editados

| Archivo | Acción |
|---------|--------|
| `lib/bookings/catalog.ts` | Creado — fuente única de catálogo estático (servicios + variantes + helper) |
| `components/bookings/steps/ServiceSelectStep.tsx` | Editado — reemplaza array inline por import desde `catalog.ts` |
| `components/bookings/steps/VariantSelectStep.tsx` | Creado — paso 2: selección de modalidad/variante |
| `components/bookings/BookingWizard.tsx` | Editado — añade `variantSlug`, cablea paso 2, resetea variante al cambiar servicio |
| `docs/roadmap/tasks/fase-1b-task-2-resultado.md` | Creado — este archivo |

---

## Qué se hizo exactamente

### `lib/bookings/catalog.ts`

Fuente compartida de catálogo estático para el wizard:
- `CatalogService` y `CatalogVariant` — tipos mínimos para UI
- `CATALOG_SERVICES` — 7 servicios, alineados con `prisma/seed.ts`
- `CATALOG_VARIANTS` — 9 variantes, alineadas con `prisma/seed.ts` (sala-ensayo con 3 variantes específicas; resto con 1 estándar)
- `getVariantsForService(serviceSlug)` — helper que filtra variantes por servicio

Ventaja: cuando se implemente la capa de persistencia, `catalog.ts` se reemplaza por una query real sin tocar los step components.

### `ServiceSelectStep.tsx`

Eliminado el array `CATALOG_SERVICES` inline (7 entradas duplicadas). Reemplazado por `import { CATALOG_SERVICES } from '@/lib/bookings/catalog'`. El componente en sí no cambió su comportamiento ni su interfaz.

### `VariantSelectStep.tsx`

Nuevo componente de paso 2. Recibe:
- `serviceSlug: string` — para filtrar las variantes del catálogo
- `selected: string | null` — slug de la variante seleccionada
- `onChange: (slug: string) => void` — callback al seleccionar

Mismo patrón visual y de accesibilidad que `ServiceSelectStep` (botones con `aria-pressed`, borde dorado al seleccionar, clases Tailwind del design system existente).

### `BookingWizard.tsx`

Cuatro cambios:
1. **Import** de `VariantSelectStep` añadido.
2. **`WizardData`** — añadido `variantSlug: string | null`.
3. **`canProceed`** — extendido: paso 0 requiere `serviceSlug`, paso 1 requiere `variantSlug`, resto `false`.
4. **Contenido del paso** — paso 1 (`currentStep === 1`) ahora renderiza `VariantSelectStep` con el `serviceSlug` del estado. El placeholder pasa a mostrarse solo para pasos 2+. El onChange del servicio incluye reset explícito de `variantSlug` si el servicio cambia.

---

## Comportamiento del reset

Si el usuario selecciona "Grabación" → avanza → elige "Estándar" → retrocede → cambia a "Sala de Ensayo", `variantSlug` se pone a `null`. Cuando vuelva al paso 2 verá las 3 variantes de sala-ensayo sin ninguna preseleccionada. Si en cambio vuelve y confirma el mismo servicio, `variantSlug` se mantiene.

---

## Qué no se tocó

- `prisma/schema.prisma` — sin cambios
- `prisma/seed.ts` — sin cambios
- `middleware.ts` — sin cambios
- `app/admin/page.tsx` — sin cambios
- `lib/auth/` — sin cambios
- `lib/bookings/` (constants, types, helpers, index) — sin cambios
- `app/reservas/page.tsx` — sin cambios
- `components/bookings/BookingProcessSteps.tsx` — sin cambios
- Todos los archivos de contenido, estilos globales y configuración
- Todas las rutas públicas existentes

---

## Riesgos y pendientes

| # | Riesgo / Pendiente | Fase |
|---|-------------------|------|
| 1 | `lib/bookings/catalog.ts` sigue siendo estático. Si cambia el catálogo en el seed, debe actualizarse manualmente aquí hasta que se implemente la query real. | 1B.3+ |
| 2 | `WizardData` tiene solo `serviceSlug` y `variantSlug`. Al implementar pasos siguientes (fecha, extras, contacto) se añadirán campos — sin cambio de arquitectura. | 1B.x |
| 3 | Pasos 2–5 (índices 2 a 5 en el array) muestran placeholder. Cada uno se implementa en microtareas posteriores. | 1B.x |
| 4 | El botón "Enviar solicitud" sigue deshabilitado. La lógica de persistencia (Server Action o API Route) es una microtarea posterior. | 1B.x |
| 5 | `lib/bookings/catalog.ts` no está re-exportado desde `lib/bookings/index.ts` intencionalmente: es datos de UI, no dominio puro. Si en el futuro se necesita desde la capa de aplicación, se evalúa entonces. | sin acción |

---

## Comandos a ejecutar fuera de Claude

```bash
# Verificar que TypeScript no reporta errores
pnpm build

# Verificar que no hay problemas de lint
pnpm lint
```

No aplican comandos de Prisma en esta microtarea (no se tocó el schema ni el seed).
