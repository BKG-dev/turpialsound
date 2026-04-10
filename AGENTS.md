# AGENTS.md

## Proyecto
Turpial Sound — Next.js 14 + React 18 + TypeScript + Tailwind.

## Estado actual
### 1A — completada
- Prisma 7 configurado
- Neon conectado
- migración inicial aplicada
- seed base funcionando
- dominio puro en `lib/bookings`
- base mínima de auth/roles interna

### 1B — funcional
- `/reservas` pública operativa
- wizard completo: servicio, modalidad, fecha, extras, contacto, resumen
- persistencia mínima real implementada
- confirmación post-envío funcional
- submit exitoso con `publicCode`

## Nuevo objetivo inmediato
Evolucionar el wizard de “solicitud simple” a “orden de servicio”:

### 1B.6a
Preparar el estado interno para trabajar con ítems seleccionados, no solo con un servicio único.

### 1B.6b
Introducir catálogo tarifario / pricing a partir del sheet aprobado.

### 1B.6c
Implementar motor de cotización derivada en memoria a partir del catálogo tarifario aprobado.
Debe calcular breakdown, subtotal, ajustes, total estimado e issues de bloqueo, sin persistencia todavía.

### 1B.6d
Conectar el estimate derivado al `SummaryStep` para mostrar desglose económico y total estimado en UI.

### 1B.6e
Persistir múltiples `BookingRequestItem` y guardar `estimatedTotal`.

## Lo que viene después
### 1C.1
Panel interno mínimo: listado simple de solicitudes.

## Reglas duras
- Una tarea = un objetivo = un diff revisable.
- No expandir alcance.
- No rehacer arquitectura sin necesidad.
- No tocar rutas o módulos fuera del alcance.
- Preferir cambios pequeños y reversibles.
- Si el bug es puntual, corregir el bug puntual.
- No mezclar pricing, panel interno, Calendar y pagos en una sola tarea.
- En 1B.6c no tocar persistencia final ni rehacer el resumen completo; solo cálculo derivado en memoria y conexión mínima al estado actual del wizard.

## Validación
Codex NO debe ejecutar:
- `pnpm build`
- `pnpm lint`
- `npm run dev`
- tests
- comandos de validación automática

Codex debe:
1. leer este archivo
2. aplicar cambios
3. revisar el diff
4. resumir qué cambió
5. detenerse

La validación final la hace el usuario manualmente en su terminal local.

## Stack y reglas técnicas
- usar `pnpm`
- Next.js App Router
- Prisma 7
- Neon PostgreSQL
- mantener compatibilidad con el cliente generado y la config actual de Prisma 7
- no tocar `schema.prisma` ni `seed.ts` salvo que la tarea lo pida explícitamente
- no editar archivos generados manualmente

## Fuente de verdad
- dominio: `lib/bookings/*`
- catálogo temporal del wizard: `lib/bookings/catalog.ts`
- pricing canónico: `lib/bookings/pricing.ts`
- persistencia: `prisma/schema.prisma`
- UI del flujo: `components/bookings/*`

## Carpetas que debe ignorar
No leer ni usar como fuente principal de contexto:
- `.next/`
- `node_modules/`
- `.git/`
- `dist/`
- `build/`
- `.turbo/`
- `coverage/`

No proponer cambios manuales dentro de esas carpetas.

## Archivos generados
No editar manualmente:
- `generated/prisma/`

Se puede importar desde ahí si corresponde.

## Orden de inspección
1. `AGENTS.md`
2. `docs/roadmap/tasks/` relevantes
3. archivos fuente en:
   - `app/`
   - `components/`
   - `lib/`
   - `prisma/`
   - `content/`

## Rutas y módulos sensibles
- `app/reservas/*`
- `components/bookings/*`
- `lib/bookings/*`
- `lib/db.ts`
- `prisma/*`

## Fuera de alcance por ahora
- Google Calendar
- pagos
- ODS
- aprobaciones internas completas
- panel admin completo
- auth pública de clientes
- disponibilidad real por recurso
- bloqueo real de agenda
- notificaciones por email o WhatsApp
- rediseño global del sitio

## Estilo de implementación
- no introducir librerías nuevas salvo necesidad real
- no mover archivos sin motivo fuerte
- no convertir todo en una arquitectura grande
- mantener UX honesta: solicitud / orden de servicio, no reserva instantánea

## Formato de salida esperado de Codex
Al terminar una tarea, responder con:
- archivos creados/editados
- qué hizo exactamente
- qué no tocó
- riesgos o pendientes

No incluir comandos de validación dentro de Codex.
Indicar que la validación la hará el usuario manualmente fuera de Codex.