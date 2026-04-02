# Resultado 1A.2-b — Corrección del schema de reservas

## Estado: COMPLETADA

---

## Qué cambió y por qué

### 1. Nuevo enum `PriorityLevel`

```prisma
enum PriorityLevel { low | normal | high }
```

**Por qué enum en lugar de `Int?`:**
- Un `Int?` requiere documentación externa para saber que `1 = low`, `2 = normal`, etc.
- El enum es autoexplicativo, filtrable explícitamente en el panel, consistente con el resto del schema, y previene valores fuera de rango sin validación adicional.
- `@default(normal)` evita que solicitudes nuevas queden sin nivel definido.

---

### 2. Campos añadidos a `BookingRequest`

| Campo | Tipo | Decisión |
|-------|------|----------|
| `publicCode` | `String @unique` | Requerido al crear la solicitud. Código legible para comunicaciones externas (ej: "TUR-2026-001"). La lógica de generación vive en la capa de aplicación, no en el schema. |
| `priorityLevel` | `PriorityLevel @default(normal)` | Enum. Ver punto 1. |
| `source` | `String @default("web")` | String libre con default `"web"`. Valores esperados: `"web"`, `"phone"`, `"in_person"`, `"referral"`. No se enumera porque puede ampliarse sin migración. |
| `estimatedTotal` | `Decimal? @db.Decimal(10,2)` | Nullable. Se rellena durante revisión interna, no al crear la solicitud. Precisión 10,2 suficiente para montos de producción. |
| `currency` | `String @default("USD")` | String con default. No enumerado: puede ampliarse sin migración. Preparado para operaciones internacionales. |

Índice añadido en `publicCode` (ya tiene `@unique`, el índice adicional es para lecturas por código sin JOIN).

---

### 3. `internalNotes` sin cambios

Ya estaba presente como nombre canónico. Sin modificaciones.

---

### 4. Campos añadidos a `Approval`

| Campo | Tipo | Decisión |
|-------|------|----------|
| `roleRequired` | `UserRole` | Indica qué rol mínimo debe realizar esta aprobación. Permite que el panel filtre tareas por rol sin leer el `User` del aprobador. Facilita el flujo de dos pasos: operaciones → directivo. |
| `decidedAt` | `DateTime?` | Nullable. Se rellena al registrar la decisión. Permite medir tiempos de respuesta. Distinto de `createdAt` (registro del registro) y `updatedAt` (última edición). |
| `updatedAt` | `DateTime @updatedAt` | Para trazabilidad completa de ediciones al registro de aprobación. |

---

### 5. `resourceId` — Decisión y justificación

**Decisión: se mantiene SOLO en `BookingRequestItem`. No se añade a `BookingRequest`.**

Razones:
- Una reserva de Turpial Sound puede requerir múltiples recursos simultáneos (ej: Studio A para grabación + cabina de control para mezcla). Poner `resourceId` en `BookingRequest` solo permite un recurso por solicitud.
- El modelo actual refleja correctamente que el recurso se asigna por ítem, no por solicitud completa.
- Duplicar `resourceId` en ambos niveles crearía dos fuentes de verdad que podrían desincronizarse.
- Si en fases futuras se necesita un "recurso principal" por solicitud, se añade entonces con migración explícita, no especulativamente.

No hay cambios estructurales en `BookingRequestItem` ni en `Resource`.

---

## Riesgos y pendientes actualizados

| # | Riesgo / Pendiente | Fase |
|---|-------------------|------|
| 1 | `prisma` y `@prisma/client` no instalados. Requiere `pnpm add` antes de `prisma validate`. | 1A.2 (ahora) |
| 2 | `DATABASE_URL` debe configurarse antes de `prisma migrate dev`. | 1A.2 (ahora) |
| 3 | `publicCode` es `String @unique` requerido. La lógica de generación del código (ej: `"TUR-" + año + correlativo`) debe implementarse en la capa de aplicación antes de 1B. No bloquea 1A.3. | 1B |
| 4 | `estimatedTotal` es `Decimal?`. El campo `@db.Decimal(10,2)` es una anotación de PostgreSQL. Con SQLite en dev, Prisma lo ignora y usa REAL. Aceptable solo para desarrollo. | decisión del equipo |
| 5 | `source` es `String` libre. Si se quiere validación de valores, añadir enum `RequestSource` en una migración posterior. Por ahora el default `"web"` es suficiente. | opcional |
| 6 | `User` sin campo de auth. Se completa en 1A.5. | 1A.5 |
| 7 | Sin seed, no hay datos de referencia para `services`, `service_variants`, `resources`. El seed define también los `publicCode` de prueba. | 1A.3 |

---

## Impacto sobre 1A.3 (seed)

- El seed debe incluir `publicCode` en los fixtures de `BookingRequest` de prueba (si los hay).
- `priorityLevel`, `source`, `currency` tienen defaults → no son obligatorios en el seed.
- `estimatedTotal` es nullable → no bloquea el seed.
- `roleRequired` en `Approval` debe incluirse en los fixtures de aprobación del seed.
- `resourceId` en `BookingRequestItem` sigue siendo nullable → no bloquea el seed de ítems.

---

## Archivos creados/editados en esta microtarea

- `prisma/schema.prisma` — editado (correcciones sobre 1A.2)
- `docs/roadmap/tasks/fase-1a-task-2b-resultado.md` — creado (este archivo)

## Archivos no tocados

- `lib/bookings/` — se completa en 1A.4
- `types/bookings.ts` — se completa en 1A.4
- `package.json` — sin cambios
- Todas las rutas en `app/`
- Todos los archivos de contenido, estilos y configuración global

---

## Comandos a ejecutar fuera de Claude

```bash
# Si Prisma aún no está instalado:
pnpm add prisma @prisma/client

# Validar que el schema es coherente
pnpm prisma validate

# Formatear (opcional)
pnpm prisma format

# Crear o actualizar la migración
# Si es la primera vez:
pnpm prisma migrate dev --name init_reservas
# Si ya existe una migración previa de 1A.2:
pnpm prisma migrate dev --name correctiva_1a2b

# Verificar que el build no se rompe
pnpm build
```
