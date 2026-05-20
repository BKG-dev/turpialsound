# Resultado 1B.6c - Motor de cotizacion derivada en memoria

## Estado: COMPLETADA

---

## Objetivo de la tarea

Crear un motor puro de estimate en memoria para el wizard publico, capaz de producir breakdown, subtotal, ajustes, total estimado e issues de bloqueo sin persistir todavia nada en base de datos.

---

## Archivos creados/editados

| Archivo | Accion |
|---------|--------|
| `lib/bookings/types.ts` | Editado - tipos del estimate |
| `lib/bookings/estimate.ts` | Creado - motor puro de calculo derivado |
| `components/bookings/BookingWizard.tsx` | Editado - integracion minima con `useMemo` y bloqueo de submit |
| `components/bookings/steps/SummaryStep.tsx` | Editado - muestra minima de estimate y bloqueos |
| `docs/roadmap/tasks/fase-1b-task-6c-resultado.md` | Creado - este archivo |

---

## Que se hizo exactamente

### `lib/bookings/types.ts`

Se agregaron tipos claros para el resultado derivado:
- `BookingEstimateLine`
- `BookingEstimateAdjustment`
- `BookingEstimateIssue`
- `BookingEstimate`

### `lib/bookings/estimate.ts`

Se creo un modulo puro con:
- `buildBookingEstimate(input)`

El motor toma la seleccion actual del wizard y construye:
- `lines[]`
- `adjustments[]`
- `subtotalUsd`
- `estimatedTotalUsd`
- `blockingIssues[]`
- `isBlocked`

Reglas implementadas:
- Sala de Ensayo aplica recargo sabado/domingo por hora
- Podcast bloquea si supera 4 horas
- Studio Session bloquea si supera 4 horas
- `Mezcla + Master` se descompone internamente en dos lineas de 150 USD cada una
- adicionales seleccionados se muestran como lineas visibles sin precio y sin sumarse al total

### `components/bookings/BookingWizard.tsx`

Se integro el estimate derivado con `useMemo`, usando el estado actual:
- `selectedItems`
- `eventDate`
- `durationMinutes`
- extras visibles actuales

Tambien:
- se pasa el estimate al resumen
- si el estimate marca bloqueo, el boton final ya no permite enviar

### `components/bookings/steps/SummaryStep.tsx`

Se hizo una integracion minima:
- muestra lineas del estimate
- muestra ajustes
- muestra total estimado preliminar
- muestra issues de bloqueo si existen

No se rehizo el resumen completo ni se cambio el submit.

---

## Que no se toco

- `lib/bookings/actions.ts`
- `lib/bookings/pricing.ts`
- `lib/bookings/catalog.ts`
- `components/bookings/steps/ServiceSelectStep.tsx`
- persistencia de DB
- `prisma/schema.prisma`
- `prisma/seed.ts`
- auth
- admin
- calendar
- pagos
- disponibilidad real
- panel interno

---

## Riesgos o pendientes para 1B.6d

| # | Riesgo / Pendiente | Estado |
|---|-------------------|--------|
| 1 | El estimate sigue usando solo `selectedItems[0]` como item principal visible. | Esperado en esta fase |
| 2 | Los adicionales ya son visibles en el breakdown, pero todavia no tienen cotizacion real ni persistencia propia. | Pendiente |
| 3 | El total estimado aun es preliminar y no se guarda en DB. | Pendiente |
| 4 | La presentacion del resumen es funcional pero todavia simple; 1B.6d puede pulir el cierre visual del breakdown final. | Pendiente |

