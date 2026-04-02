# Resultado 1A.2 — Schema de base de datos inicial

## Estado: COMPLETADA

---

## Decisiones de modelado

### Provider
- **PostgreSQL** como provider de producción.
- Para desarrollo local, se puede usar `provider = "postgresql"` con una instancia local o Docker, o cambiar temporalmente a `provider = "sqlite"` con `url = "file:./dev.db"` (requiere quitar los campos `Json?` del AuditLog o aceptar que Prisma los mapee a TEXT).

### IDs
- `cuid()` en todas las entidades. Opción segura, sin dependencias externas, compatible con Prisma.

### Enums
Definidos en el schema (nivel PostgreSQL):
- `BookingStatus` — 10 estados canónicos del workflow
- `UserRole` — 4 roles internos
- `ApprovalDecision` — 3 valores para la decisión de aprobación

### Separación requester / User
- `BookingRequest` almacena `requesterName`, `requesterEmail`, `requesterPhone` como campos planos.
- No hay relación `BookingRequest → User` para el solicitante: el solicitante es un visitante externo, no un usuario interno.
- `User` solo representa staff/directivos internos. Auth completa se prepara en 1A.5.

### ResourceId opcional en BookingRequestItem
- `resourceId` es `String?` (nullable). El recurso físico no se asigna al crear la solicitud; se asigna durante la revisión interna.
- Permite que el seed y el wizard de la fase 1B funcionen sin requerir asignación de recurso.

### calendarEventId reservado
- `BookingRequest.calendarEventId` es `String?`. No se usa en fases 1A–1C. Se mantiene para no tener que migrar el schema al integrar Google Calendar en fase posterior.

### AuditLog con Json
- `previousState` y `nextState` son `Json?`. Con PostgreSQL almacena JSONB. Con SQLite, Prisma los mapea a TEXT automáticamente.
- Suficiente para snapshots de estado simples en esta fase.

### Índices
- `booking_requests`: índices en `status` y `eventDate` (filtros más frecuentes del panel interno).
- `booking_request_items`: índice en `bookingRequestId` y `serviceVariantId`.
- `approvals`: índice en `bookingRequestId`.
- `audit_log`: índices en `bookingRequestId` y `createdAt`.

---

## Variable de entorno requerida

Crear el archivo `.env` en la raíz del proyecto con:

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/turpialsound"
```

No se crea `.env` desde Claude para no exponer credenciales ni sobreescribir configuración existente.

---

## Riesgos y pendientes

| # | Riesgo / Pendiente | Fase |
|---|-------------------|------|
| 1 | `prisma` y `@prisma/client` no están instalados todavía. Requiere instalación manual antes de `prisma validate`. | 1A.2 (ahora) |
| 2 | `DATABASE_URL` debe configurarse antes de `prisma migrate dev`. | 1A.2 (ahora) |
| 3 | Si se usa SQLite en dev, los campos `Json?` funcionan pero se almacenan como TEXT. Aceptable solo para desarrollo. | decisión del equipo |
| 4 | `User` no tiene campo `passwordHash` ni integración con NextAuth. Se completa en 1A.5. | 1A.5 |
| 5 | `BookingRequest.eventDate` no tiene validación de solapamiento de recursos. La disponibilidad se valida a nivel de lógica, no a nivel de schema. | 1B o posterior |
| 6 | El seed de `services`, `service_variants` y `resources` se hace en 1A.3. Sin seed no hay datos de referencia para las relaciones de `BookingRequestItem`. | 1A.3 |

---

## Archivos creados en esta microtarea

- `prisma/schema.prisma` — schema inicial del dominio reservas
- `docs/roadmap/tasks/fase-1a-task-2-resultado.md` — este archivo

## Archivos no tocados

- `lib/bookings/index.ts` — se completa en 1A.4
- `lib/bookings/types.ts` — se crea en 1A.4
- `types/bookings.ts` — se completa en 1A.4
- `package.json` — instalación de Prisma es tarea del usuario fuera de Claude
- Todas las rutas en `app/`
- Todos los archivos de contenido y configuración global

---

## Comandos a ejecutar fuera de Claude (en orden)

```bash
# 1. Instalar Prisma
pnpm add prisma @prisma/client

# 2. Crear .env con DATABASE_URL antes de continuar

# 3. Validar que el schema es correcto
pnpm prisma validate

# 4. Formatear el schema (opcional pero recomendado)
pnpm prisma format

# 5. Crear la primera migración
pnpm prisma migrate dev --name init_reservas

# 6. Verificar que el build no se rompe
pnpm build
```
