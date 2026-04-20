---
tags: ["#roadmap", "#status/urgent", "#status/live-source"]
---

# Roadmap de Rescate

Obsidian es la fuente de trazabilidad viva del proyecto. Este archivo refleja primero el estado operativo real del marketplace al 2026-04-20 y funciona como checkpoint de cierre de sesion.

## Estado actual del marketplace

El marketplace esta funcional, separado del booking y estabilizado sobre un flujo manual temporal:

- checkout manual temporal para el buyer,
- conciliacion manual por admin,
- entrada a escrow solo despues de validacion real,
- payout manual al seller como cierre operativo actual.

Hoy ya quedo fuera del flujo productivo el uso de base64 para imagenes de listings y comprobantes. La media ahora se persiste como URL en un storage temporal local desacoplado, listo para migrar luego a storage productivo definitivo sin rehacer formularios ni render.

## Hecho y confirmado

- [x] Marketplace funcional y separado del booking.
- [x] TypeScript limpio con `npx tsc --noEmit` en el checkpoint actual.
- [x] Checkout manual temporal operativo con metodos visibles para el comprador.
- [x] Conciliacion manual activa a nivel de codigo: banco emisor, fecha de pago y numero de operacion persistidos.
- [x] `initiatePurchase()` crea la transaccion sin agotar el listing antes de pago validado.
- [x] El listing pasa a `SOLD_OUT` solo cuando el pago es aprobado y entra en escrow.
- [x] El admin dashboard muestra datos utiles para conciliacion manual.
- [x] El seller solo recibe la solicitud de datos de cobro cuando corresponde por estado operativo.
- [x] `Total operativo` del seller usa `IN_ESCROW`, `DELIVERY_CONFIRMED` y `RELEASED`.
- [x] `Total a recibir` del seller usa solo transacciones `RELEASED`.
- [x] La validacion admin ya no puede aprobar compras desde `PENDING_PAYMENT`; solo desde `PAYMENT_RECEIVED` o `VALIDATING`.
- [x] Imagenes y comprobantes salieron del flujo productivo de base64.
- [x] El marketplace ya usa persistencia de media por URL con storage temporal local desacoplado.
- [x] El marketplace ya se documenta en Obsidian como fuente viva antes que en docs de resumen tecnico.

## Bloqueos criticos

- [ ] Confirmar o aplicar en la base real la migracion de conciliacion manual (`paymentSenderBank`, `paymentPaidAt` e indices).
- [ ] Ejecutar QA manual end-to-end buyer -> admin -> escrow -> payout manual seller.
- [ ] Sustituir el storage temporal actual por storage productivo definitivo y durable.

## Pendiente importante

- [ ] Verificar operativamente que `paymentSenderBank` no siga rompiendo el flujo real por falta de migracion aplicada.
- [ ] Definir el cierre operativo del payout: cuando una transaccion `RELEASED` deja de estar "lista para pagar" y pasa a "pagada al vendedor".
- [ ] Implementar cron T+7 para auto-release.
- [ ] Decidir si `BANK_TRANSFER` sigue absorbido por el flujo manual actual o se separa mejor a nivel de auditoria backend.
- [ ] Definir la secuencia futura para integrar pasarelas sin romper el flujo manual vigente.

## Pendiente de validar

- [ ] QA completa con imagenes reales en cards, detalle y dashboard.
- [ ] QA completa con comprobante real en checkout/admin.
- [ ] Confirmacion de que el storage temporal actual funciona correctamente en el entorno que se use al retomar.
- [ ] Confirmacion real de que la base operativa ya incluye `paymentSenderBank`.

## Diferido de forma explicita

- [ ] Integracion Mercantil.
- [ ] Integracion Binance Pay.

## Foco operativo vigente

Hasta nuevo aviso, el foco es estabilizacion operativa del marketplace:

1. checkout manual temporal,
2. conciliacion manual real,
3. payout manual controlado,
4. migracion real de conciliacion,
5. QA end-to-end,
6. luego storage productivo definitivo.

## Requisito transversal

SEO/AEO es requisito transversal del sitio completo. Cualquier cambio de listings, categorias, slugs, metadata, landings o estructura publica debe revisarse con impacto de SEO/AEO, aunque el frente activo siga siendo marketplace.

## Siguiente paso exacto al retomar

Antes de tocar otro frente, trabajar en este orden:

1. verificar en la base real si existen `paymentSenderBank`, `paymentPaidAt` e indices,
2. si no existen, aplicar la migracion real,
3. ejecutar QA manual completa buyer -> admin -> escrow -> payout manual seller,
4. registrar los hallazgos,
5. luego definir y ejecutar la migracion al storage productivo definitivo.

## Instruccion breve de reanudacion

Reanudar por base real y QA real. No reabrir otros frentes antes de confirmar migracion y operacion.

## Regla de mantenimiento

Si cambia el estado real del proyecto, este archivo se actualiza antes que los docs de resumen tecnico.
