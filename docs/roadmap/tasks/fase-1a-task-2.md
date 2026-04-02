# Microtarea 1A.2 — Schema de base de datos inicial

## Modelo recomendado
Opus 4.6 para diseñar el schema si la arquitectura actual es compleja.
Luego Sonnet 4.6 para implementar.

## Objetivo
Crear el schema inicial del sistema de reservas con relaciones, campos y enums coherentes con la hoja de ruta definida.

Esta tarea debe dejar la base lista para crecer hacia aprobaciones, Calendar, pagos y ODS sin rediseñarla luego.

---

## Alcance exacto
Claude debe:
- revisar el método actual de acceso a datos del proyecto
- identificar si existe Prisma u otra capa equivalente
- crear o extender el schema de forma consistente
- incluir entidades núcleo del dominio reservas
- usar nombres canónicos
- definir enums de estados y roles si corresponde al stack

Claude no debe:
- implementar UI
- integrar Google Calendar
- crear automatizaciones de aprobación completas
- mezclar contenido editorial con entidades transaccionales

---

## Entidades de referencia
- `services`
- `service_variants`
- `resources`
- `booking_requests`
- `booking_request_items`
- `approvals`
- `users`
- `audit_log`

## Campos de referencia
Usar como guía, adaptando al stack real:
- IDs estables
- slugs canónicos
- timestamps
- estados
- prioridad
- referencias a recurso y variante
- `calendar_event_id` reservado para fase posterior
- notas internas y externas cuando proceda

---

## Requisitos de calidad
- relaciones claras
- nombres consistentes
- estructura extensible
- no meter campos prematuros innecesarios
- dejar listo para seed y migraciones

---

## Archivos permitidos
- schema de datos principal
- tipos o enums relacionados si el stack lo requiere
- documentación corta del modelo si ayuda

## Archivos prohibidos
- páginas públicas
- panel admin visual
- integración con APIs externas

---

## Entregable esperado
- schema inicial funcional
- explicación breve de las decisiones de modelado
- lista de riesgos o campos reservados para fases futuras

---

## Validación externa sugerida
Claude no ejecuta comandos. Debe proponer los que apliquen, por ejemplo:
- `pnpm prisma validate`
- `pnpm prisma format`
- `pnpm prisma migrate dev --name init_reservas`
- `pnpm build`

---

## Cierre obligatorio
Termina con:
- Archivos creados/editados
- Qué hizo exactamente
- Qué no tocó
- Riesgos o pendientes
- Comandos a ejecutar fuera de Claude

