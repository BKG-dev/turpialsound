# Resultado 1B.1 — Shell del wizard público de solicitud

## Estado: COMPLETADA

---

## Objetivo de la tarea

Crear el punto de entrada público del flujo de reservas (`/reservas`) y el shell base del wizard multi-step, sin persistencia real todavía.

---

## Archivos creados

| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `app/reservas/page.tsx` | Creado | Página pública `/reservas` — server component |
| `components/bookings/BookingProcessSteps.tsx` | Creado | Pasos visuales del proceso (server component) |
| `components/bookings/BookingWizard.tsx` | Creado | Shell multi-step con estado local (client component) |
| `components/bookings/steps/ServiceSelectStep.tsx` | Creado | Paso 1: selección de servicio (client component) |
| `docs/roadmap/tasks/fase-1b-task-1-resultado.md` | Creado | Este archivo |

---

## Qué se construyó exactamente

### `app/reservas/page.tsx`

Página pública en `/reservas`. Server component.

- Metadatos SEO via `generatePageMetadata`.
- Hero (`PageHero`) con título y bajada que comunica "solicita y aparta", no "reserva instantánea".
- Sección "Cómo funciona" que muestra los 4 pasos del proceso usando `BookingProcessSteps`.
- Sección del wizard con `BookingWizard` centrado en columna de `max-w-2xl`.
- Aviso explícito al pie: "Al enviar tu solicitud no estás reservando todavía."

### `components/bookings/BookingProcessSteps.tsx`

Cuatro pasos del proceso de solicitud, puramente visual:
1. Solicita tu fecha
2. Revisamos disponibilidad
3. Aprobación interna
4. Confirmación oficial

Cada paso tiene número destacado, título y descripción. Sin estado ni interacción.

### `components/bookings/BookingWizard.tsx`

Shell multi-step con estado local (`useState`). Sin persistencia ni Prisma Client.

**Pasos definidos:**

| # | ID | Label | Título |
|---|----|-------|--------|
| 1 | `service` | Servicio | ¿Qué tipo de servicio necesitas? |
| 2 | `variant` | Modalidad | Elige la modalidad |
| 3 | `date` | Fecha | Fecha y bloque horario |
| 4 | `extras` | Extras | Requerimientos adicionales |
| 5 | `contact` | Tus datos | Datos del solicitante |
| 6 | `summary` | Resumen | Revisa tu solicitud |

**Comportamiento actual:**
- Indicador de progreso en la parte superior (pasos numerados, con check al completar).
- Paso 1 (`ServiceSelectStep`) totalmente funcional: selección visual de servicio.
- Pasos 2–6: placeholder con mensaje "Este paso se habilitará próximamente."
- Botón "Continuar" habilitado solo cuando el paso actual está completo (paso 1 = servicio seleccionado).
- Botón "Anterior" disponible desde el paso 2.
- Botón "Enviar solicitud" en el último paso — deshabilitado hasta que la persistencia esté implementada.

**Estado local:**
```ts
interface WizardData {
  serviceSlug: string | null
}
```
Mínimo. Se expande en microtareas siguientes conforme se implementen los pasos.

### `components/bookings/steps/ServiceSelectStep.tsx`

Grilla de botones de selección. Datos estáticos alineados con `prisma/seed.ts` — mismos 7 slugs y nombres, sin importar Prisma Client.

Usa `aria-pressed` para accesibilidad. Estado visual claro: borde dorado + fondo sutil al seleccionar.

---

## Decisiones tomadas

1. **Sin Prisma Client en el wizard**: el catálogo de servicios vive como array estático en `ServiceSelectStep.tsx`, alineado manualmente con el seed. En fases siguientes se reemplazará con una query al momento de persistir la solicitud.

2. **`BookingWizard` es el único client component de nivel alto**: `app/reservas/page.tsx` es server component. `BookingProcessSteps` es server component. Solo el wizard y su step hijo usan `'use client'`.

3. **Estado local simple**: `useState` con objeto `WizardData`. Sin context, sin zustand, sin reducers. Suficiente para el alcance actual.

4. **UX honesta**: el texto de la página y el aviso al pie comunican explícitamente que es una solicitud con revisión, no una reserva instantánea. Alineado con el modelo funcional objetivo de `CLAUDE.md`.

5. **Estilos existentes**: se usaron exactamente las clases custom de Tailwind ya presentes en el proyecto (`container-base`, `font-display`, `text-accent-gold`, `bg-brand-surface`, etc.).

---

## Qué no se tocó

- `prisma/schema.prisma` — sin cambios
- `prisma/seed.ts` — sin cambios
- `middleware.ts` — sin cambios
- `app/admin/page.tsx` — sin cambios
- `lib/bookings/` — sin cambios (solo se importa desde ahí en futuras microtareas)
- `lib/auth/` — sin cambios
- Todos los archivos de contenido, estilos globales y configuración
- Todas las rutas públicas existentes

---

## Riesgos y pendientes

| # | Riesgo / Pendiente | Fase |
|---|-------------------|------|
| 1 | El catálogo de servicios en `ServiceSelectStep.tsx` es estático. Si el seed cambia (nuevos servicios, slugs renombrados), debe actualizarse manualmente en este archivo hasta que se implemente la query real. | 1B siguiente microtarea |
| 2 | `BookingWizard` no persiste nada. El botón "Enviar solicitud" está deshabilitado. La lógica de persistencia (Server Action o API Route) es la siguiente microtarea. | 1B.2 |
| 3 | Pasos 2–6 muestran placeholder. Cada paso se implementa en microtareas posteriores a medida que se validen los datos y el flujo. | 1B.x |
| 4 | `WizardData` tiene solo `serviceSlug`. Al implementar cada paso se añadirán campos (`variantSlug`, `eventDate`, `requesterEmail`, etc.) — la interfaz se expande sin cambio de arquitectura. | 1B.x |
| 5 | Sin validación de formulario todavía. Se añade al implementar cada campo concreto. | 1B.x |
| 6 | La ruta `/reservas` no está protegida ni en el header de navegación todavía. Depende de decisiones editoriales y de cuándo se quiere exponer públicamente. | decisión del equipo |

---

## Comandos a ejecutar fuera de Claude

```bash
# Verificar que TypeScript no reporta errores
pnpm build

# Verificar que no hay problemas de lint
pnpm lint
```

No aplican comandos de Prisma en esta microtarea (no se tocó el schema ni el seed).
