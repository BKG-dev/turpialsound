# Resultado 1B.6a - Base interna del wizard preparada para items

## Estado: COMPLETADA

---

## Objetivo de la tarea

Preparar la base tecnica del wizard publico para dejar de depender estructuralmente de un unico `serviceSlug` + `variantSlug` y empezar a pensar internamente en items seleccionados, sin romper el flujo actual ni rehacer la persistencia existente.

---

## Archivos creados/editados

| Archivo | Accion |
|---------|--------|
| `components/bookings/BookingWizard.tsx` | Editado - migracion del estado interno a `selectedItems` |
| `lib/bookings/types.ts` | Editado - nuevo tipo minimo `SelectedBookingItem` |
| `docs/roadmap/tasks/fase-1b-task-6a-resultado.md` | Creado - este archivo |

---

## Que se hizo exactamente

### `lib/bookings/types.ts`

Se introdujo un tipo minimo:

- `SelectedBookingItem`

Campos:
- `serviceSlug`
- `variantSlug`
- `quantity`

La intencion es que el wizard deje de modelar su seleccion principal como dos campos sueltos y pueda evolucionar despues a multiples items sin rehacer los contratos internos.

### `components/bookings/BookingWizard.tsx`

Se migro el estado del wizard de:

- `serviceSlug`
- `variantSlug`

a:

- `selectedItems: SelectedBookingItem[]`

Para no romper el flujo actual:
- el wizard sigue usando solo el primer item como seleccion activa
- la UI de pasos permanece igual para el usuario
- `ServiceSelectStep` sigue escogiendo el servicio principal actual
- `VariantSelectStep` sigue escogiendo la modalidad del servicio actual
- `SummaryStep` sigue recibiendo los mismos props que antes
- el submit existente sigue funcionando porque se siguen derivando `serviceSlug` y `variantSlug` desde el item principal

Tambien se agrego un helper local para actualizar el item principal sin dispersar la logica del array por todo el componente.

---

## Resultado tecnico

Al terminar esta tarea:
- el wizard ya piensa internamente en items
- el servicio principal actual queda representado como primer item del arreglo
- `serviceSlug` y `variantSlug` dejan de ser la fuente estructural central del estado
- el flujo actual conserva compatibilidad visual y funcional

---

## Que no se toco

- `lib/bookings/actions.ts`
- `components/bookings/steps/ServiceSelectStep.tsx`
- `components/bookings/steps/VariantSelectStep.tsx`
- `components/bookings/steps/SummaryStep.tsx`
- `prisma/schema.prisma`
- `prisma/seed.ts`
- auth
- admin
- middleware
- Google Calendar
- pagos
- pricing completo
- disponibilidad real
- layout global del wizard

---

## Riesgos y pendientes

| # | Riesgo / Pendiente | Estado |
|---|-------------------|--------|
| 1 | Por ahora solo se usa `selectedItems[0]`; la seleccion multiple visible todavia no existe. | Esperado para esta fase |
| 2 | El submit sigue enviando un unico servicio/modalidad porque la persistencia actual aun responde a ese contrato. | Pendiente para fases siguientes |
| 3 | `SelectedBookingItem` es minimo y aun no incluye conceptos de pricing, notas por item ni metadatos tarifarios. | Preparado para 1B.6b |

---

## Validacion

La validacion la ejecutara el usuario manualmente fuera de Codex.
