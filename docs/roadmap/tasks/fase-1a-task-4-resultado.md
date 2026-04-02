# Resultado 1A.4 — Helpers de dominio y contratos básicos

## Estado: COMPLETADA

---

## Archivos creados/editados

| Archivo | Acción |
|---------|--------|
| `lib/bookings/types.ts` | Creado — tipos puros del dominio |
| `lib/bookings/constants.ts` | Creado — constantes, listas y label maps |
| `lib/bookings/helpers.ts` | Creado — funciones puras del dominio |
| `lib/bookings/index.ts` | Editado — re-exporta los tres módulos |
| `docs/roadmap/tasks/fase-1a-task-4-resultado.md` | Creado — este archivo |

---

## Qué se creó y por qué

### `lib/bookings/types.ts` — fuente canónica del dominio

Contiene los tipos del dominio como union types de TypeScript, sin depender de Prisma Client ni de `generated/prisma`. Esto permite usar los tipos en cualquier capa (UI, API, tests) sin acoplar al ORM.

**Tipos definidos:**
- `BookingStatus` — 10 estados canónicos del workflow
- `UserRole` — 4 roles internos
- `ApprovalDecision` — 3 decisiones de aprobación
- `PriorityLevel` — low / normal / high
- `RequestSource` — web / phone / in_person / referral (extensible)
- `ServiceSummary`, `ServiceVariantSummary`, `ResourceSummary` — resúmenes de catálogo para formularios y listados
- `BookingRequestSummary` — vista plana de una solicitud para el panel y el wizard
- `BookingRequestItemInput` — input para crear ítems en una solicitud
- `ApprovalStepSummary` — paso de aprobación para el panel interno
- `PublicCodeParts` — estructura descompuesta de un código público (TUR-2026-001)

### `lib/bookings/constants.ts` — constantes y label maps

Centraliza todas las listas y mapas de dominio:
- `BOOKING_STATUSES` — lista ordenada según flujo del workflow
- `TERMINAL_BOOKING_STATUSES` — `['rejected', 'confirmed']`
- `BOOKING_STATUS_TRANSITIONS` — Record que define las transiciones válidas por estado
- `BOOKING_STATUS_LABELS` — etiquetas en español para UI
- `USER_ROLES`, `USER_ROLE_LABELS`
- `APPROVAL_DECISIONS`, `APPROVAL_DECISION_LABELS`
- `PRIORITY_LEVELS`, `PRIORITY_LEVEL_LABELS`, `PRIORITY_WEIGHTS`
- `REQUEST_SOURCES`, `REQUEST_SOURCE_LABELS`
- Defaults: `DEFAULT_CURRENCY`, `DEFAULT_PRIORITY`, `DEFAULT_SOURCE`, `DEFAULT_STATUS`
- `PUBLIC_CODE_PREFIX = 'TUR'`

### `lib/bookings/helpers.ts` — funciones puras del dominio

Funciones sin IO, sin side effects, testeables aisladas:

| Función | Qué hace |
|---------|----------|
| `isTerminalBookingStatus(status)` | True si el estado no tiene transiciones posibles |
| `canTransitionBookingStatus(from, to)` | True si la transición está permitida por el workflow |
| `getNextBookingStatuses(current)` | Lista de estados alcanzables desde el actual |
| `isApprovalComplete(decision)` | True si la decisión cierra el paso (approved o rejected) |
| `parsePublicCode(code)` | Descompone "TUR-2026-001" en `PublicCodeParts` o null |
| `formatPublicCode(parts)` | Recompone `PublicCodeParts` al string canónico |
| `buildPublicCode(year, sequence)` | Construye el código dado año y secuencia (la consulta a DB vive fuera) |
| `normalizeRequestSource(source)` | Normaliza cualquier input a un `RequestSource` válido con fallback a 'web' |
| `getPriorityWeight(priority)` | Peso numérico de la prioridad para ordenamiento |
| `comparePriority(a, b)` | Comparador compatible con `Array.sort()` |

### `lib/bookings/index.ts` — barrel del módulo

Re-exporta `constants`, `types` y `helpers`. El resto del proyecto importa desde `lib/bookings` sin conocer la estructura interna.

---

## Decisiones de dominio que quedan cerradas con esta tarea

1. **`lib/bookings/types.ts` es la fuente canónica** de tipos del dominio en código. `types/bookings.ts` queda intacto como placeholder vacío y no se usa como segunda fuente de verdad.
2. **Las transiciones del workflow están explicitadas** en `BOOKING_STATUS_TRANSITIONS`. Ningún componente ni API Route debe inventar transiciones fuera de este mapa.
3. **`rejected` y `confirmed` son los únicos estados terminales.** `needs_adjustment` no es terminal: la solicitud regresa al flujo.
4. **`buildPublicCode` no lee la base de datos.** Recibe el año y la secuencia como parámetros; la lógica de obtener el correlativo desde la DB se implementa en 1B en la capa de servicio.
5. **`RequestSource` es extensible** como string libre con fallback a `'web'`, alineado con la decisión del schema (campo `String` no enumerado).
6. **No hay lógica de auth, UI ni Prisma Client** en este módulo.

---

## Qué no se tocó

- `prisma/schema.prisma` — sin cambios
- `prisma/seed.ts` — sin cambios
- `prisma.config.ts` — sin cambios
- `types/bookings.ts` — intacto (placeholder vacío, no se convirtió en segunda fuente de verdad)
- `package.json` — sin cambios
- Todos los archivos en `app/`
- Todos los archivos de contenido, estilos, UI y configuración global

---

## Qué prepara exactamente para 1B

| Elemento | Cómo lo usa 1B |
|----------|---------------|
| `BookingRequestSummary` | Tipo de retorno de la query que carga el estado de la solicitud en el wizard |
| `BookingRequestItemInput` | Input del formulario al añadir servicios a la solicitud |
| `BOOKING_STATUS_TRANSITIONS` | El API Route que cambia el estado valida la transición antes de escribir a la DB |
| `buildPublicCode(year, seq)` | La capa de servicio en 1B llama esto después de obtener el correlativo con `SELECT COUNT` o similar |
| `normalizeRequestSource` | Se aplica al recibir el source desde el formulario público antes de persistir |
| `BOOKING_STATUS_LABELS` | El wizard y el panel muestran etiquetas legibles sin texto hardcodeado |
| `isTerminalBookingStatus` | El panel desactiva controles de acción si el estado es terminal |
| `canTransitionBookingStatus` | Los API Routes de transición de estado validan antes de ejecutar el UPDATE |

---

## Riesgos y pendientes

| # | Riesgo / Pendiente | Fase |
|---|-------------------|------|
| 1 | `types/bookings.ts` existe como placeholder vacío. Si en alguna fase futura se importa desde ahí en lugar de `lib/bookings`, se creará una segunda fuente de verdad. Mantener la regla: importar siempre desde `lib/bookings`. | ongoing |
| 2 | `BOOKING_STATUS_TRANSITIONS` es el contrato de flujo pero no está validado en DB (no hay constraint a nivel PostgreSQL). La validación vive solo en la capa de aplicación. | 1B |
| 3 | `buildPublicCode` no garantiza unicidad por sí solo. El correlativo debe obtenerse con lógica transaccional en la capa de servicio para evitar colisiones en concurrencia. | 1B |
| 4 | Los `REQUEST_SOURCE_LABELS` usan `Record<string, string>` en lugar de `Record<RequestSource, string>` porque `RequestSource` incluye `string & {}`. Esto es intencional para permitir extensión sin migración. | sin acción |

---

## Comandos a ejecutar fuera de Claude

```bash
# Verificar que TypeScript no reporta errores en el módulo
pnpm build

# Verificar que no hay problemas de lint
pnpm lint
```

No aplican comandos de Prisma en esta microtarea (no se tocó el schema ni el seed).
