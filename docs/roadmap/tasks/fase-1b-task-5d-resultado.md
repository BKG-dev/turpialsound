# Resultado 1B.5d - UX post-envio y cierre coherente del wizard

## Estado: COMPLETADA

---

## Objetivo de la tarea

Cerrar la experiencia post-envio del wizard publico:
- feedback claro de loading
- feedback claro de exito
- feedback claro de error
- estado final coherente tras enviar
- tono honesto: solicitud recibida, pendiente de revision

---

## Archivos creados/editados

| Archivo | Accion |
|---------|--------|
| `components/bookings/BookingWizard.tsx` | Editado - loading visible, mensajes de exito/error y reset controlado |
| `docs/roadmap/tasks/fase-1b-task-5d-resultado.md` | Creado - este archivo |

---

## Que se hizo exactamente

### `components/bookings/BookingWizard.tsx`

Se pulio el cierre del wizard sin rehacer la persistencia existente:

- se agrego `aria-busy` al contenedor principal durante el envio
- en el paso final aparece un bloque visible de estado mientras `submissionState === 'loading'`
- el boton final mantiene el estado disabled mientras se envia y ahora muestra el texto `Enviando solicitud...`
- el feedback de error ahora tiene encabezado claro y mensaje accionable para reintentar
- la vista de exito refuerza que la solicitud fue recibida pero sigue pendiente de revision interna
- la vista de exito mantiene visible el `publicCode`
- se agrego una salida simple de cierre con `Crear una nueva solicitud`, que resetea el wizard de forma controlada

### Estado final del flujo

Despues de enviar:
- si el envio esta en progreso, el usuario ve un estado activo y entiende que debe esperar
- si el envio falla, permanece en el resumen con contexto para corregir o reintentar
- si el envio sale bien, el wizard se reemplaza por una confirmacion limpia y final

---

## Que no se toco

- `lib/bookings/actions.ts`
- `components/bookings/steps/SummaryStep.tsx`
- `prisma/schema.prisma`
- `prisma/seed.ts`
- auth
- admin
- middleware
- Google Calendar
- pagos
- aprobaciones internas
- layout global de `/reservas`
- pasos anteriores del wizard

---

## Riesgos y pendientes

| # | Riesgo / Pendiente | Estado |
|---|-------------------|--------|
| 1 | El loading sigue siendo visual local; no hay cancelacion ni progreso granular. | Aceptado para esta fase |
| 2 | El error depende del mensaje devuelto por la action; si mas adelante se quieren mensajes mas finos por tipo de fallo, se amplia alli. | Pendiente posterior |
| 3 | No hay notificacion por email ni seguimiento automatico, solo confirmacion visual en pantalla. | Fuera de alcance |

---

## Validacion

La validacion la ejecutara el usuario manualmente fuera de Codex.
