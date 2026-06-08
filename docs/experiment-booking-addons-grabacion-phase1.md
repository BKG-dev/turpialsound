# Experimental Booking Addons Phase 1

Branch: `experiment/booking-addons-grabacion-viewport-safe-2026-06`

Base state: `feature/ecosistema-creativo-web-2026-05-31` at `d7b3eaf`

## Objetivo

Evaluar una Fase 1 experimental para mostrar adicionales de grabacion dentro del paso `Extras` sin tocar el flujo real de reserva, cobro, WhatsApp, email, admin, Prisma ni disponibilidad.

## Que se implemento

- Se creo un catalogo local y estructurado para los 9 adicionales de grabacion.
- Se agrego soporte visual de seleccion opcional en `Extras`.
- Se agruparon los adicionales por familia:
  - Recomendados
  - Percusion / Salsa
  - Instrumentos individuales
  - Metales
  - Cuerdas
- En mobile, la familia completa se oculta por defecto y se abre con `Ver mas instrumentos`.
- En el resumen, la seleccion experimental aparece como seccion visual separada y el subtotal experimental se muestra solo como referencia.
- La seleccion sigue siendo opcional y el usuario puede continuar sin elegir adicionales.

## Archivos tocados

- `components/bookings/BookingWizard.tsx`
- `components/bookings/steps/ExtrasStep.tsx`
- `components/bookings/steps/SummaryStep.tsx`
- `lib/bookings/recording-addons.ts`

## Lo que no se toco

- Prisma schema
- migraciones
- base de datos
- flujo de pago
- verificacion de WhatsApp
- logica de disponibilidad
- creacion real de reserva
- email operativo
- WhatsApp operativo
- admin dashboard
- estados operativos
- recuperacion de pago
- Google Calendar

## QA visual resumida

### Mobile

- 360 x 740: sin overflow horizontal; CTA accesible; `Extras` entra con scroll vertical y el boton de continuar queda visible.
- 375 x 812: sin overflow horizontal; CTA visible; familias quedan como progressive disclosure.
- 390 x 844: sin overflow horizontal; seleccion reversible; resumen estable.
- 414 x 896: sin overflow horizontal; cards legibles; stepper usable.
- 430 x 932: sin overflow horizontal; no se rompe el resumen.

### Desktop

- 1366 x 768: sin overflow horizontal; el bloque de legacy extras quedo apilado y mas respirable; CTA visible.
- 1440 x 900: layout estable; resumen claro; sin roturas visibles.
- 1920 x 1080: layout estable; stepper visible; sin desbordes horizontales.

## Riesgos pendientes

- La vista experimental sigue siendo solo visual: el subtotal no afecta cobro real.
- Los adicionales no estan persistidos como estructura operativa aun.
- El precio de `Grabacion instrumentos adicionales` puede seguir generando confusion si no se refuerza el copy en Fase 2.

## Recomendacion para Fase 2

- Persistir addons como entidad estructurada.
- Generalizar estimado, resumen y notificaciones con un desglosado por addon.
- Mantener el paso `Extras` como progressive disclosure, no como lista plana.
- Llevar la semantica de `requiere revision` al flujo operativo antes de tocar backend real.
