# AGENTS.md

## Proyecto
Turpial Sound — plataforma web en Next.js 14 + React 18 + TypeScript + Tailwind.

## Estado actual

### Fase 1A — completada
- Estructura base del módulo de reservas
- Prisma 7 configurado
- Neon conectado
- Migración inicial aplicada
- Seed base funcionando
- Dominio puro de reservas en `lib/bookings`
- Base mínima de auth/roles interna
- Ruta `/admin` placeholder protegida por middleware mínimo

### Fase 1B — estado actual
- 1B.1 cerrado: entrada pública `/reservas`
- 1B.2 cerrado: servicio + variante
- 1B.3 cerrado: fecha + bloque horario
- 1B.4 cerrado: extras + datos del solicitante
- 1B.5a resuelto manualmente: fix de runtime Prisma en la app
- 1B.5b aparentemente resuelto: resumen visual del wizard ya existe
- Próxima tarea real: **1B.5c persistencia mínima de la solicitud**
- Después: **1B.5d confirmación de éxito/error**

## Objetivo inmediato
Cerrar la primera versión funcional del wizard público:
1. guardar una solicitud real en DB
2. crear `BookingRequest`
3. crear `BookingRequestItem`
4. mostrar feedback claro de envío exitoso o error

## Stack y reglas técnicas
- Usar `pnpm`
- Next.js App Router
- Prisma 7
- Neon PostgreSQL
- Tailwind existente del proyecto
- No usar imports incompatibles con Prisma 7
- No tocar `schema.prisma` ni `seed.ts` salvo que la tarea lo pida explícitamente
- Mantener compatibilidad con el cliente generado y la config actual de Prisma 7

## Reglas de trabajo
- Una tarea = un objetivo = un diff revisable
- No expandir alcance
- No rehacer arquitectura ya decidida
- No tocar rutas o módulos fuera del alcance
- Mantener cambios pequeños, verificables y reversibles
- Preferir soluciones mínimas y claras sobre abstracciones grandes
- Si una tarea falla por segunda vez con el mismo error, detenerse y proponer corrección acotada
- No mezclar persistencia, Calendar, pagos y aprobación en una sola tarea

## Validación obligatoria
Después de cada tarea:
- `pnpm build`
- `pnpm lint`

## Checkpoints
Crear commit antes y después de cada tarea importante.

## Qué está fuera de alcance por ahora
- Google Calendar
- pagos
- ODS
- aprobaciones internas completas
- panel admin funcional completo
- auth pública de clientes
- disponibilidad real por recurso
- bloqueo real de agenda

## Rutas y módulos sensibles
- `app/reservas/*`
- `components/bookings/*`
- `lib/bookings/*`
- `lib/db.ts`
- `prisma/*`

## Fuente de verdad del dominio
- Dominio puro: `lib/bookings/*`
- Catálogo temporal del wizard: `lib/bookings/catalog.ts`
- Schema y persistencia: `prisma/schema.prisma`

## Política de tareas para el wizard público
### Ya funcional
- servicio
- modalidad
- fecha/bloque
- extras
- datos del solicitante
- resumen visual

### Pendiente inmediato
- persistencia mínima real
- feedback post-envío

## Próximas tareas
### 1B.5c
Persistencia mínima de la solicitud:
- crear `BookingRequest`
- crear `BookingRequestItem`
- guardar datos del wizard
- generar `publicCode` simple y coherente
- estado inicial correcto
- source = `web`

### 1B.5d
Confirmación post-envío:
- loading
- success
- error
- mensaje honesto de “solicitud recibida, pendiente de revisión”

## Estilo de implementación
- No introducir librerías nuevas salvo necesidad real
- No mover archivos sin motivo fuerte
- No convertir todo a una arquitectura grande
- No tocar diseño global del sitio
- Mantener UX honesta: solicitud, no reserva instantánea