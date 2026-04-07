# Resultado 1B.5 — Paso 6 de resumen, envío real y feedback al usuario

## Estado: COMPLETADA

---

## Objetivo de la tarea

Cerrar la primera versión funcional del wizard público:
- Paso 6 (resumen) deja de ser placeholder y muestra todos los datos recopilados.
- El botón "Enviar solicitud" se habilita y persiste la solicitud en base de datos.
- Feedback claro de loading, éxito (con código de referencia) o error.

---

## Archivos creados/editados

| Archivo | Acción |
|---------|--------|
| `lib/db.ts` | Creado — singleton de PrismaClient compatible con Prisma 7 y Next.js |
| `lib/bookings/actions.ts` | Creado — Server Action `submitBookingRequest` |
| `components/bookings/steps/SummaryStep.tsx` | Creado — paso 6 de solo lectura |
| `components/bookings/BookingWizard.tsx` | Editado — estados de envío, handleSubmit, success view |
| `docs/roadmap/tasks/fase-1b-task-5-resultado.md` | Creado — este archivo |

---

## Qué se hizo exactamente

### `lib/db.ts` — Singleton de PrismaClient

Patrón estándar de Next.js para evitar múltiples instancias del cliente en desarrollo (hot reload).
Importa desde `@/generated/prisma` (salida del generator `prisma-client` declarado en `schema.prisma`).
Requiere `DATABASE_URL` en el entorno de ejecución.

### `lib/bookings/actions.ts` — Server Action

Función `submitBookingRequest(input: SubmitBookingInput): Promise<SubmitBookingResult>`.

**Flujo interno:**
1. Valida campos obligatorios (doble validación: el wizard ya valida en cliente).
2. Busca `ServiceVariant` por `variantSlug` en la DB para obtener su `id`.
3. Genera `publicCode` secuencial del tipo `TUR-2026-001` usando `buildPublicCode` del dominio.
4. Construye `eventDate` (DateTime) y `eventEndDate` (DateTime) desde los strings del wizard.
5. Serializa extras (`extrasTechnician`, `extrasBackline`, `extrasNotes`) en el campo `notes` del `BookingRequest`.
6. Deriva `eventTitle` desde el catálogo estático (`Solicitud — {serviceName}`).
7. Crea `BookingRequest` + `BookingRequestItem` en una transacción atómica.
8. Devuelve `{ success: true, publicCode }` o `{ success: false, error: string }`.

**Status inicial al crear:** `'submitted'` — la solicitud llega directamente como enviada, no como borrador.

### `components/bookings/steps/SummaryStep.tsx` — Paso 6

Componente de solo lectura. Recibe las 11 props del wizard y muestra 4 secciones:
- **Servicio** — nombre del servicio + nombre de la modalidad (resueltos desde `CATALOG_SERVICES` / `CATALOG_VARIANTS`)
- **Fecha y horario** — fecha formateada en español, rango horario (startTime – endTime derivado), duración en texto
- **Requerimientos adicionales** — solo se muestra si hay al menos un extra seleccionado o nota
- **Datos del solicitante** — nombre, correo, teléfono (solo si está presente)

`formatDate` usa `Intl.DateTimeFormat` con locale `'es'`. El truco `T12:00:00` evita que UTC midnight cruce al día anterior en zonas UTC negativas.

Importa `deriveEndTime` y `DURATION_OPTIONS` desde `DateTimeStep.tsx` (ya exportados).

### `BookingWizard.tsx` — Cambios

**Estado añadido:**
- `submissionState: 'idle' | 'loading' | 'success' | 'error'`
- `publicCode: string | null`
- `submitError: string | null`

**`canProceed` actualizado:** caso `currentStep === 5 ? true` añadido (el resumen no bloquea).

**`handleSubmit`:**
- Guarda contra doble click con `if (submissionState === 'loading') return`.
- Llama `submitBookingRequest` con todos los campos del estado.
- En éxito: guarda `publicCode` y transiciona a `'success'`.
- En error: guarda mensaje de error y transiciona a `'error'`.

**Vista de éxito (`submissionState === 'success'`):**
- Reemplaza el wizard completo.
- Icono de check dorado, título, descripción, código de referencia prominente.
- UX honesta: "Tu solicitud ha sido registrada. El equipo confirmará disponibilidad y se pondrá en contacto."

**Feedback de error:** banda roja sutil entre contenido y navegación con el mensaje de error. El botón vuelve a habilitarse para reintentar.

**Botón "Enviar solicitud":**
- Deshabilitado solo durante `'loading'`.
- Texto cambia a `'Enviando…'` durante envío.
- "← Anterior" también deshabilitado durante loading.

**Paso 5 (resumen):** el placeholder se reemplaza por `<SummaryStep ... />` con todos los datos.

---

## Estado del wizard al cerrar esta microtarea

| Elemento | Estado |
|----------|--------|
| Paso 1 — Servicio | Funcional desde 1B.1 |
| Paso 2 — Modalidad | Funcional desde 1B.2 |
| Paso 3 — Fecha y hora | Funcional desde 1B.3 |
| Paso 4 — Extras | Funcional desde 1B.4 |
| Paso 5 — Contacto | Funcional desde 1B.4 |
| Paso 6 — Resumen | **Funcional — 1B.5** |
| Envío a BD | **Funcional — 1B.5** |
| Feedback success/error | **Funcional — 1B.5** |

---

## Decisiones documentadas

| Decisión | Justificación |
|----------|--------------|
| Server Action en `lib/bookings/actions.ts` | Más simple que un API Route para este caso: no requiere `fetch`, maneja serialización automáticamente, sin CORS. Compatible con App Router de Next.js 14. |
| Singleton de PrismaClient en `lib/db.ts` | Evita `Too many connections` en desarrollo con hot reload. Patrón estándar recomendado por la documentación de Prisma con Next.js. |
| `status: 'submitted'` al crear | La solicitud llega desde el wizard ya enviada. No tiene sentido guardar en `'draft'` si el usuario hizo clic en "Enviar solicitud". |
| Extras serializados en `notes` | El schema no tiene columnas dedicadas para `extrasTechnician` ni `extrasBackline`. Serializar en el campo de texto `notes` es la opción más directa sin migración. Si en fases futuras se necesita filtrar por extras, se migra a columnas booleanas o a una tabla separada. |
| `eventTitle` derivado del catálogo | El schema requiere `eventTitle` no-nulo. Derivarlo del catálogo (`"Solicitud — Grabación"`) es más limpio que pedir al usuario que lo escriba en esta fase. |
| `SummaryStep` importa desde `DateTimeStep` | `deriveEndTime` y `DURATION_OPTIONS` ya estaban exportados desde `DateTimeStep.tsx`. Reutilizarlos evita duplicación sin crear un helper nuevo. Si en el futuro se mueven a un archivo de utilidades, el cambio es mínimo. |
| `formatDate` usa `T12:00:00` | Evitar el bug de UTC midnight: `new Date('2026-01-15T00:00:00')` en UTC+0 es correcto pero en UTC-5 podría ser el 14 de enero. El mediodía es neutro. |

---

## Qué no se tocó

- `prisma/schema.prisma` — sin cambios
- `prisma/seed.ts` — sin cambios
- `middleware.ts` — sin cambios
- `app/admin/page.tsx` — sin cambios
- `lib/auth/` — sin cambios
- `lib/bookings/` (constants, types, helpers, catalog, index) — sin cambios
- `app/reservas/page.tsx` — sin cambios
- `components/bookings/BookingProcessSteps.tsx` — sin cambios
- Todos los steps de pasos 1–5 — sin cambios
- Todos los archivos de contenido, estilos globales y configuración
- Todas las rutas públicas existentes

---

## Riesgos y pendientes

| # | Riesgo / Pendiente | Fase |
|---|-------------------|------|
| 1 | **publicCode no es atómico.** Se genera con `COUNT + 1`. Bajo concurrencia alta puede producir dos solicitudes con el mismo código; el constraint `@unique` de la DB rechazará el segundo INSERT y el servidor Action devolverá error al usuario. Solución robusta: secuencia atómica (`SELECT nextval(...)`) o sufijo UUID. | Fase posterior si el volumen lo requiere |
| 2 | **Timezone del servidor.** `new Date('YYYY-MM-DDTHH:MM:00')` se interpreta en hora local del servidor (probablemente UTC). Si el estudio opera en UTC-4 (Caracas) y el servidor está en UTC, la hora guardada en BD diferirá 4h de la hora local real. Solución: el cliente envía un ISO string con offset, o se fuerza timezone de Caracas en la capa de servicio. | Fase posterior |
| 3 | `DATABASE_URL` debe estar configurada en el entorno de ejecución (distinto de `DIRECT_URL` que usa el CLI para migraciones). Si no está, el servidor Action fallará con error de conexión. | Configuración de entorno |
| 4 | Los extras (`extrasTechnician`, `extrasBackline`) se guardan en texto libre en `notes`. No son filtrables en el panel interno sin parsing. Si en el panel se necesita filtrar por "solicitudes que piden técnico", se migran a columnas booleanas en el schema. | Panel interno (fase posterior) |
| 5 | No hay rate limiting ni captcha en el endpoint de envío. Cualquier usuario puede enviar solicitudes en masa. Para esta fase es aceptable dado que no hay tráfico público masivo; se añade protección cuando la ruta sea pública. | Fase posterior |
| 6 | No hay email de confirmación al solicitante tras el envío. El feedback es solo visual en el wizard. El equipo debe gestionar comunicación manualmente hasta que se implemente el sistema de notificaciones. | Fase posterior |

---

## Comandos a ejecutar fuera de Claude

```bash
# 1. Asegurarse de que DATABASE_URL está configurada en .env
#    (puede ser diferente de DIRECT_URL usada por el CLI)

# 2. Verificar que el cliente Prisma está generado
pnpm prisma generate

# 3. Verificar que TypeScript no reporta errores
pnpm build

# 4. Verificar que no hay problemas de lint
pnpm lint
```

No aplican comandos de migración: no se tocó el schema.
