# AGENTS.md

## Proyecto
Turpial Sound — Next.js 14 + React 18 + TypeScript + Tailwind.

## Filosofía ORESHNIK 6D — MODO PRODUCTIVIDAD MÁXIMA
OBJETIVO: Ejecutar desarrollo acelerado usando Codex como cerebro y Gemini como músculo de ejecución masiva.

### Distribución de Roles
- **AGENTE 1 — CODEX (CEREBRO):** Backend crítico, DB, Seguridad, Arquitectura, Pagos, Auth.
- **AGENTE 2 — GEMINI (EJECUTOR UI):** Componentes, Layout, Dashboards, Render dinámico.
- **AGENTE 3 — GEMINI (EJECUTOR DATA):** Scripts, Parsers, Helpers, Utils.
- **AGENTE 4 — GEMINI (QA + TESTS):** Matrices QA, Smoke tests, Edge cases.
- **AGENTE 5 — GEMINI (DOCS + ROADMAP):** Documentación, Handoffs, Roadmap.
- **AGENTE 6 — GEMINI (SECURITY + RED TEAM):** Pruebas de abuso, Validaciones.

### Reglas de Oro
- **Un solo agente por zona de código activa.**
- **Gemini escribe libremente** en zonas no prohibidas (UI, Docs, Scripts, QA).
- **Codex define, Gemini ejecuta.**

---

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
- mostrar sala asignada por solicitud
- mostrar hora límite de pago / vencimiento del apartado

### 1C.2
Google Calendar operativo central:
- usar un calendario maestro compartido
- crear / actualizar / cancelar eventos según estado
- crear evento desde el submit cuando la solicitud entra a `pending_payment`
- incluir sala asignada en el evento
- usar color por estado operativo en el evento
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
- el bloque queda apartado mientras no expire el plazo de pago
- sin sincronización a calendarios personales como primera etapa; primero calendario operativo central

### 1C.4
Pago manual asistido:
- mostrar monto e instrucciones de pago al cliente
- ventana de pago manual de 1 hora
- la directiva solo verifica pago
- al verificar pago dentro del plazo, la solicitud pasa a `confirmed` y se refleja en agenda
- si no se verifica dentro del plazo, la solicitud pasa a `expired`
- al expirar, el bloque se libera y el evento debe cancelarse o marcarse como expirado

### 1C.4a — UX visible de pago
- añadir total a la confirmación post-submit
- añadir sala asignada visible para el cliente
- mostrar deadline en GMT-4 / America-Caracas
- selector de método de pago:
  - Pago Móvil
  - Transferencia
  - Binance
- botón `Reportar pago`

### 1C.4b — Reporte de pago
- permitir que el cliente reporte el pago
- seleccionar el método usado
- subir comprobante
- guardar referencia / datos mínimos del pago reportado
- introducir estado operativo nuevo:
  - `payment_reported`

### 1C.4c — Notificación de verificación
- al reportar pago:
  - correo al cliente: “Estamos verificando tu pago”
  - correo a Turpial Sound: “VERIFICAR PAGO”
- mantener WhatsApp automático fuera de alcance por ahora si todavía no se implementará en esta fase

### 1C.4d — Confirmación operativa
- al verificar pago:
  - cambiar a `confirmed`
  - correo al cliente: “Pago verificado”
  - correo a Turpial Sound: “Pago verificado”

### 1C.4e — Documento operativo
- recibo detallado
- orden de servicio
- incluir como base:
  - código
  - cliente
  - servicio
  - modalidad
  - sala
  - horario
  - monto
  - método
  - estado

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
- `payment_reported`
- `payment_verified`
- `confirmed`
- `cancelled`
- `expired`

Nota operativa:
- el primer estado operativo visible del submit público es `pending_payment`
- `submitted` puede mantenerse como estado técnico/transitorio, no como estado operativo principal visible

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
