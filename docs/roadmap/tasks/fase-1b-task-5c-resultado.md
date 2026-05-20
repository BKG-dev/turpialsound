# Resultado 1B.5c - Persistencia minima real de la solicitud

## Estado: COMPLETADA

---

## Objetivo de la tarea

Cerrar la primera version funcional del envio del wizard publico:
- crear un `BookingRequest` real en la base de datos
- crear al menos un `BookingRequestItem` asociado a la variante elegida
- guardar la informacion minima capturada por el wizard
- mostrar feedback basico de loading, exito o error

---

## Archivos creados/editados

| Archivo | Accion |
|---------|--------|
| `lib/bookings/actions.ts` | Editado - validaciones minimas del submit y persistencia transaccional |
| `components/bookings/BookingWizard.tsx` | Editado - textos y feedback honesto de envio |
| `docs/roadmap/tasks/fase-1b-task-5c-resultado.md` | Creado - este archivo |

---

## Que se hizo exactamente

### `lib/bookings/actions.ts`

Se dejo la server action `submitBookingRequest` como punto de entrada del envio final del wizard.

**Persistencia real implementada:**
- busca la `ServiceVariant` seleccionada por `variantSlug`
- valida que la variante pertenezca al `serviceSlug` elegido
- genera un `publicCode` simple con formato `TUR-AAAA-NNN`
- construye `eventDate` y `eventEndDate` a partir de fecha, hora y duracion del wizard
- serializa extras y notas en el campo `notes` del `BookingRequest`
- crea `BookingRequest` con `status = submitted` y `source = web`
- crea `BookingRequestItem` asociado a la variante elegida
- ejecuta ambas escrituras dentro de una transaccion

**Validaciones minimas en servidor:**
- campos obligatorios
- email con formato basico valido
- coherencia servicio/modalidad
- fecha y hora parseables

### `components/bookings/BookingWizard.tsx`

El wizard ya tenia el wiring principal del submit. En esta tarea se dejo coherente con 1B.5c:
- mantiene estado `loading | success | error`
- muestra error si la action devuelve fallo
- muestra confirmacion visual si la solicitud se crea correctamente
- ensena el `publicCode` al usuario
- deja un mensaje honesto: la solicitud fue recibida y queda pendiente de revision, no es una reserva instantanea

Tambien se actualizaron comentarios internos que todavia describian el wizard como si no tuviera persistencia.

---

## Datos del wizard que si quedan guardados

En `BookingRequest`:
- `publicCode`
- `status`
- `source`
- `requesterName`
- `requesterEmail`
- `requesterPhone`
- `eventTitle`
- `eventDate`
- `eventEndDate`
- `notes`
- `submittedAt`

En `BookingRequestItem`:
- `bookingRequestId`
- `serviceVariantId`
- `quantity`

---

## Que no se toco

- `prisma/schema.prisma`
- `prisma/seed.ts`
- auth
- admin
- middleware
- Google Calendar
- pagos
- aprobaciones internas
- disponibilidad real de agenda
- diseno global del sitio

---

## Riesgos y pendientes

| # | Riesgo / Pendiente | Estado |
|---|-------------------|--------|
| 1 | `publicCode` se genera con `COUNT + 1`, no es atomico bajo concurrencia alta. | Pendiente posterior |
| 2 | La hora se interpreta con la timezone del servidor al construir `Date`. | Pendiente posterior |
| 3 | Los extras se guardan serializados dentro de `notes`, no en columnas separadas. | Aceptado para esta fase |
| 4 | No hay email automatico al cliente ni integracion con calendar. | Fuera de alcance |

---

## Comandos a ejecutar fuera de Codex

```bash
pnpm build
pnpm lint
```

Si quieres probar el flujo completo manualmente despues:

```bash
pnpm dev
```

Luego abre `/reservas`, completa el wizard y verifica en la base de datos que existan:
- un `booking_requests`
- al menos un `booking_request_items` asociado
