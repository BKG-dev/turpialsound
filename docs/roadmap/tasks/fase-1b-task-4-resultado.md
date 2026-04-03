# Resultado 1B.4 — Pasos 4 y 5 del wizard: extras y datos del solicitante

## Estado: COMPLETADA

---

## Objetivo de la tarea

Implementar los pasos 4 (requerimientos adicionales) y 5 (datos del solicitante) del wizard público, reemplazando los placeholders con steps funcionales que capturan datos en estado local.

---

## Archivos creados/editados

| Archivo | Acción |
|---------|--------|
| `components/bookings/steps/ExtrasStep.tsx` | Creado — paso 4: toggles opcionales + textarea |
| `components/bookings/steps/ContactStep.tsx` | Creado — paso 5: nombre, email, teléfono |
| `components/bookings/BookingWizard.tsx` | Editado — imports, WizardData, canProceed, render pasos 3–4, placeholder mejorado |
| `docs/roadmap/tasks/fase-1b-task-4-resultado.md` | Creado — este archivo |

---

## Qué se hizo exactamente

### `components/bookings/steps/ExtrasStep.tsx`

Paso 4 del wizard. Completamente opcional — no bloquea avanzar.

**Dos toggles de opciones frecuentes** (`aria-pressed`, mismo patrón visual que ServiceSelectStep y VariantSelectStep):
- "Necesito técnico de sonido" → `extrasTechnician: boolean`
- "Necesito backline / equipamiento adicional" → `extrasBackline: boolean`

**Textarea de notas libres** → `extrasNotes: string`. Con feedback visual (borde dorado cuando tiene contenido). Placeholder orientado al contexto del estudio.

Props recibidas: `notes`, `technician`, `backline` + callbacks independientes por campo.

### `components/bookings/steps/ContactStep.tsx`

Paso 5 del wizard. Requiere nombre + email válido para poder avanzar.

**Campos:**
- `requesterName` — texto, requerido, `type="text"`, `autoComplete="name"`
- `requesterEmail` — email, requerido con validación básica, `type="email"`, `autoComplete="email"`
- `requesterPhone` — teléfono, **opcional**, `type="tel"`, `autoComplete="tel"`

**Validación de email:** expresión regular `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` exportada como `isValidEmail(email: string): boolean`. Error inline visible solo cuando el campo tiene contenido pero falla la validación (no al llegar al paso con campo vacío).

**Decisión sobre teléfono:** opcional. El correo es el canal primario de confirmación. El teléfono facilita coordinación rápida pero no debe ser bloqueante para el solicitante.

### `components/bookings/BookingWizard.tsx`

Cuatro grupos de cambios:

1. **Imports** — añadidos `ExtrasStep` y `ContactStep`, importada `isValidEmail` desde ContactStep.

2. **`WizardData`** — añadidos 6 campos:
   ```ts
   extrasNotes: string
   extrasTechnician: boolean
   extrasBackline: boolean
   requesterName: string
   requesterEmail: string
   requesterPhone: string
   ```
   Con sus valores iniciales en `INITIAL_DATA`.

3. **`canProceed`** — extendido con dos casos nuevos:
   ```ts
   currentStep === 3 ? true :
   currentStep === 4 ? data.requesterName.trim() !== '' && isValidEmail(data.requesterEmail) :
   ```
   - Extras (índice 3): siempre `true` — no bloquea.
   - Contacto (índice 4): nombre no vacío Y email válido.

4. **Render** — añadido `{currentStep === 3 && <ExtrasStep ...>}` y `{currentStep === 4 && <ContactStep ...>}`. El placeholder genérico pasa de `currentStep > 2` a `currentStep > 4`, con texto mejorado para el paso de resumen.

---

## Estado del wizard al cerrar esta microtarea

| Campo | Estado |
|-------|--------|
| `serviceSlug` | Funcional desde 1B.1 |
| `variantSlug` | Funcional desde 1B.2 |
| `eventDate` | Funcional desde 1B.3 |
| `startTime` | Funcional desde 1B.3 |
| `durationMinutes` | Funcional desde 1B.3 |
| `extrasNotes` | **Funcional — 1B.4** |
| `extrasTechnician` | **Funcional — 1B.4** |
| `extrasBackline` | **Funcional — 1B.4** |
| `requesterName` | **Funcional — 1B.4** |
| `requesterEmail` | **Funcional — 1B.4** |
| `requesterPhone` | **Funcional — 1B.4** |

---

## Qué no se tocó

- `prisma/schema.prisma` — sin cambios
- `prisma/seed.ts` — sin cambios
- `middleware.ts` — sin cambios
- `app/admin/page.tsx` — sin cambios
- `lib/bookings/` (constants, types, helpers, catalog, index) — sin cambios
- `lib/auth/` — sin cambios
- `app/reservas/page.tsx` — sin cambios
- `components/bookings/BookingProcessSteps.tsx` — sin cambios
- `components/bookings/steps/ServiceSelectStep.tsx` — sin cambios
- `components/bookings/steps/VariantSelectStep.tsx` — sin cambios
- `components/bookings/steps/DateTimeStep.tsx` — sin cambios
- Todos los archivos de contenido, estilos globales y configuración
- Todas las rutas públicas existentes

---

## Decisiones documentadas

| Decisión | Justificación |
|----------|--------------|
| Teléfono opcional | El email es el canal primario de confirmación. Exigir teléfono aumenta fricción sin aportar un requisito operativo real en esta fase. |
| Extras siempre válidos | Los extras son información complementaria, no condición de negocio. Bloquear el avance sin extras seleccionados sería contraproducente. |
| `isValidEmail` exportada desde ContactStep | La misma función se necesita en `BookingWizard` para `canProceed`. Exportarla evita duplicación sin crear un helper de dominio innecesario. |
| Toggles con `aria-pressed` | Coherente con el patrón de ServiceSelectStep y VariantSelectStep. Semánticamente correcto para botones de selección múltiple no exclusiva. |
| Sin reset de extras al cambiar pasos anteriores | Los extras y los datos de contacto son independientes del servicio/fecha seleccionados. |

---

## Riesgos y pendientes

| # | Riesgo / Pendiente | Fase |
|---|-------------------|------|
| 1 | El paso 5 (resumen) sigue como placeholder mejorado. Contendrá la revisión completa de todos los datos y el botón de envío habilitado. | 1B.5 |
| 2 | El botón "Enviar solicitud" en el paso 5 sigue deshabilitado. La lógica de persistencia (Server Action o API Route) se implementa en 1B.5 junto con el resumen. | 1B.5 |
| 3 | `isValidEmail` usa una regex simple. No valida dominios inexistentes ni TLDs no estándar — suficiente para este contexto; el equipo valida la solicitud manualmente de todas formas. | sin acción |
| 4 | Los toggles de extras (`extrasTechnician`, `extrasBackline`) son booleanos simples. Si en fases futuras se quieren más opciones, se añaden como nuevos campos booleanos o se migra a un `Set<string>`. | sin acción inmediata |
| 5 | `WizardData` tiene 11 campos. El estado local sigue siendo suficiente sin zustand ni context. Si en 1B.5 se añaden más campos del resumen, reevaluar entonces. | 1B.5 |

---

## Comandos a ejecutar fuera de Claude

```bash
# Verificar que TypeScript no reporta errores
pnpm build

# Verificar que no hay problemas de lint
pnpm lint
```

No aplican comandos de Prisma en esta microtarea (no se tocó el schema ni el seed).
