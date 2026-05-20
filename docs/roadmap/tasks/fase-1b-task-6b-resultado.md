# Resultado 1B.6b - Catalogo tarifario aprobado y separacion correcta de servicios

## Estado: COMPLETADA

---

## Objetivo de la tarea

Introducir una fuente de verdad clara para pricing y ajustar el catalogo del wizard para reflejar correctamente los servicios, subtipos y reglas aprobadas, sin rehacer el flujo actual ni romper lo ya funcional.

---

## Archivos creados/editados

| Archivo | Accion |
|---------|--------|
| `lib/bookings/pricing.ts` | Creado - fuente de verdad del pricing aprobado |
| `lib/bookings/catalog.ts` | Editado - adaptacion del catalogo consumido por el wizard |
| `components/bookings/steps/VariantSelectStep.tsx` | Editado - visualizacion minima de precio, reglas y adicionales |
| `docs/roadmap/tasks/fase-1b-task-6b-resultado.md` | Creado - este archivo |

---

## Que se hizo exactamente

### `lib/bookings/pricing.ts`

Se creo una fuente de verdad dedicada para el catalogo tarifario aprobado.

Incluye:
- unidad tarifaria (`hour`, `track`, `episode`, `fixed`)
- monto base en USD
- si el precio puede mostrarse al cliente o no
- recargo de fin de semana para Sala de Ensayo
- maximos de horas donde aplica
- regla de bloqueo para servicios que no deben superar 4 horas
- metadatos de standalone/complemento para preparar siguientes fases

Se modelaron correctamente los servicios aprobados:
- Sala de Ensayo con Flexible, Premium y Prioritaria
- Grabacion con Grabacion de ensayo y Hora de grabacion
- Produccion Musical por tema
- Arreglos Musicales por tema
- Mezcla y Masterizacion con Mezcla, Master y Mezcla + Master
- Podcast / Locucion con Podcast y Locucion
- Video Session con Studio Session y Diseno de sonido para video
- Consultoria como servicio disponible

Tambien se dejaron adicionales visibles como catalogo aparte, sin precio visible al cliente.

### `lib/bookings/catalog.ts`

Se mantuvo `catalog.ts` como adaptador compatible con el wizard actual, pero enriquecido con metadata de pricing:
- `priceUsd`
- `priceUnit`
- `showPriceToClient`
- `maxHours`
- `blockWhenExceedingMaxHours`
- `weekendSurchargeUsd`
- `canBeStandalone`
- `canBeComplement`
- `badges`

Ademas:
- se corrigieron variantes que antes estaban colapsadas en un solo `standard`
- se agrego `consultoria` al catalogo de servicios
- se incorporaron helpers para precio legible y addons por servicio

### `components/bookings/steps/VariantSelectStep.tsx`

Se hizo una mejora visual minima y dentro de alcance:
- si una variante puede mostrar precio, ahora lo enseña
- si una variante tiene reglas clave, las muestra como badges
- si el servicio tiene adicionales catalogados, aparecen en una caja informativa
- los adicionales se muestran sin precio, como pediste

El flujo sigue siendo casi igual para el usuario:
- paso 1 sigue siendo seleccion simple de servicio
- paso 2 sigue siendo seleccion simple de subtipo/modalidad

---

## Que no se toco

- `components/bookings/BookingWizard.tsx`
- `components/bookings/steps/ServiceSelectStep.tsx`
- `components/bookings/steps/SummaryStep.tsx`
- `lib/bookings/actions.ts`
- `prisma/schema.prisma`
- `prisma/seed.ts`
- auth
- admin
- middleware
- Google Calendar
- pagos
- persistencia multiple
- total final / estimatedTotal definitivo
- layout global del wizard

---

## Riesgos y pendientes

| # | Riesgo / Pendiente | Estado |
|---|-------------------|--------|
| 1 | El wizard todavia selecciona un solo item visible por flujo, aunque el catalogo ya esta preparado para conceptos mas ricos. | Esperado para esta fase |
| 2 | Las reglas de maximo 4 horas y recargo fin de semana ya estan modeladas en datos, pero todavia no se aplican como logica de bloqueo/calculo en tiempo real. | Pendiente para fases siguientes |
| 3 | `Mezcla + Master` queda representado como subtipo empaquetado para no forzar seleccion multiple visible todavia. | Decision intencional de transicion |
| 4 | Los adicionales visibles siguen como metadata de catalogo y presentacion informativa; su seleccion/cotizacion detallada puede ampliarse despues. | Pendiente posterior |

---

## Validacion

La validacion la ejecutara el usuario manualmente fuera de Codex.
