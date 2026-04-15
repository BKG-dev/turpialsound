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

### 1B.6b — alcanzada
- catálogo tarifario / pricing aprobado cargado en código
- wizard ya trabaja con pricing visible y breakdown preliminar
- persistencia mínima actual validada manualmente por el usuario

## Nuevo objetivo inmediato
Cerrar una V1 operativa real para producción.

### 1C.1
Booking Command Center mínimo:
- listado interno de solicitudes
- filtros por fecha, estado y recurso
- vista operativa básica del día
- acción manual para verificar pago
- vista mínima de agenda interna

### 1C.2
Google Calendar operativo central:
- usar un calendario maestro compartido
- crear / actualizar / cancelar eventos según estado
- reflejar al menos estados:
  - `pending_payment`
  - `payment_verified`
  - `confirmed`
  - `cancelled`

### 1C.3
Disponibilidad real mínima:
- el cliente solo puede solicitar bloques realmente disponibles
- el sistema debe bloquear choques por recurso y horario
- los estados `pending_payment`, `payment_verified` y `confirmed` bloquean agenda
- sin sincronización a calendarios personales como primera etapa; primero calendario operativo central

### 1C.4
Pago manual asistido:
- mostrar monto e instrucciones de pago al cliente
- la directiva solo verifica pago
- al verificar pago, la solicitud pasa a confirmada y se refleja en agenda

### 1C.5
Reglas de recursos físicas:
- Sala 1 grande: `grabacion` y/o `sala-ensayo`
- Sala 2: `podcast-locucion`
- Sala 3: solo `sala-ensayo`

Reglas operativas iniciales de asignación:
- `grabacion` usa solo Sala 1
- `podcast-locucion` usa solo Sala 2
- `sala-ensayo` usa preferentemente Sala 3; si no está libre, puede usar Sala 1
- otros servicios no bloquean recurso físico todavía, hasta que se definan sus reglas

### 1C.6
Estados operativos mínimos:
- `submitted`
- `pending_payment`
- `payment_verified`
- `confirmed`
- `cancelled`
- `expired`

## Fase posterior aplazada
### 1B.6c
Motor de cotización derivada en memoria más robusto.

### 1B.6d
Conexión extendida del estimate derivado al `SummaryStep`.

### 1B.6e
Persistencia múltiple de `BookingRequestItem` y `estimatedTotal`.

### Futuro cercano
- integración Mercantil
- pagos automáticos / conciliación automática
- replicación avanzada a calendarios personales si hace falta

## Reglas duras
- Una tarea = un objetivo = un diff revisable.
- No expandir alcance.
- No rehacer arquitectura sin necesidad.
- No tocar rutas o módulos fuera del alcance.
- Preferir cambios pequeños y reversibles.
- Si el bug es puntual, corregir el bug puntual.
- No mezclar dashboard completo, Google Calendar, pagos y rediseño global en una sola tarea.
- Resolver primero operación mínima real; después refinamientos.
- La prioridad actual no es una reserva instantánea completa, sino una operación mínima real con disponibilidad, solicitud, pago manual verificado y agenda operativa.
- La directiva no debe gestionar cálculos manuales ni agenda manual si el sistema puede resolverlo.
- Si una tarea depende de credenciales o valores externos, asumir configuración por variables de entorno o settings operativos; no hardcodear secretos.

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
- no introducir librerías nuevas salvo necesidad real
- no mover archivos sin motivo fuerte

## Fuente de verdad
- dominio booking: `lib/bookings/*`
- catálogo temporal del wizard: `lib/bookings/catalog.ts`
- pricing canónico: `lib/bookings/pricing.ts`
- persistencia: `prisma/schema.prisma`
- UI del flujo: `components/bookings/*`

## Fuente operativa adicional
- configuración de recursos / disponibilidad: `lib/bookings/operations.ts` o equivalente
- integración Google Calendar: `lib/bookings/google-calendar.ts` o equivalente
- estados operativos de solicitudes: dominio en `lib/bookings/*`
- settings operativos / datos de pago: DB o configuración operativa, no secretos hardcodeados

## Credenciales y configuración externa
- usar un Google Calendar operativo central, no calendarios personales como fuente primaria
- las credenciales y secretos deben vivir en variables de entorno
- valores operativos cambiables deben centralizarse en configuración o DB
- la cuenta central de agenda debe ser una cuenta operativa del negocio

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
- integración Mercantil en vivo
- pagos automáticos / conciliación bancaria automática
- panel admin completo
- aprobaciones internas completas multi-rol
- auth pública de clientes
- bloqueo multi-recurso avanzado
- notificaciones automáticas por email o WhatsApp
- rediseño global del sitio

## Estilo de implementación
- no convertir todo en una arquitectura grande
- mantener UX honesta: solicitud / pago manual verificado / confirmación operativa
- priorizar dashboards y vistas funcionales antes que efectos visuales
- si una pantalla nueva se crea, debe salir de datos reales, no mockups permanentes
- el Booking Command Center debe construirse funcional primero; refinamiento visual después

## Formato de salida esperado de Codex
Al terminar una tarea, responder con:
- archivos creados/editados
- qué hizo exactamente
- qué no tocó
- riesgos o pendientes

No incluir comandos de validación dentro de Codex.
Indicar que la validación la hará el usuario manualmente fuera de Codex.