---
tags: ["#status/live-source", "#area/backend", "#area/ui", "#area/ops"]
---

# Bugs Criticos

Este archivo registra los bloqueos y riesgos operativos activos del marketplace al 2026-04-29.

## 1. Bloqueador de migracion/schema para `paymentSenderBank`
- **Estado real**: Resuelto en la DB activa.

## 2. QA operativa end-to-end pendiente
- **Estado real**: Pendiente crítica.
- **Accion inmediata**: Ejecutar QA solo por ruta despachada en `docs/07_handoffs/qa-dispatcher.json`.

## 3. Storage productivo definitivo
- **Estado real**: Public media validada; proofs sensibles implementados técnicamente y validados manualmente en preview.
- **Accion inmediata**: Mantener `payment-proof` fuera del Blob público no-booking.

## 4. Base64 fuera del camino productivo
- **Estado real**: Resuelto.

## 5. Checkout manual temporal
- **Estado real**: Vigente y esperado.

## 6. Cierre final de payout aun no auditado
- **Estado real**: Pendiente alta.

## 7. Cron T+7 no implementado
- **Estado real**: Pendiente.

## 8. SEO/AEO restricción transversal
- **Estado real**: Restricción vigente.

## 9. Hallazgos funcionales - Dashboard y Operación (Sprint 3)
- [x] Contador Mis compras (Resuelto)
- [x] Detalle compra/venta (Resuelto)
- [ ] Tabs Operativo vs Todos (Media-Alta)
- [x] CSV con UTF-8 BOM (Resuelto)
- [x] Datos cobro vendedor en Pagos (Resuelto)
- [ ] Totales/comisiones inconsistentes (Alta abierta)
- [ ] Tab comisiones en cero (Alta abierta)
- [x] Nota interna corregida (Resuelto)
- [x] Badge mensajes funcional (Resuelto)
- [ ] Tab mensajes desalineado (Media-Alta abierta)
- [x] Mensaje tranquilidad post Pago (Resuelto)
- [ ] Desajuste métricas/tabs/flujo real (Crítica abierta)

## 10. QA residual y Segunda pasada
- **Estado real**: Pendiente alta.
- **Accion**: Ejecutar QA completa buyer -> admin -> escrow -> payout siguiendo runbook; ajustar residuales antes de abrir nuevos frentes.

## 11. Sprint 2 Bugs internos (Resueltos)
- [x] Guardar método de cobro (Normalizado, validado)
- [x] Nota interna Admin (Foco estable)

## 12. Sprint 3B1 - Disponibilidad por transacción activa
- [x] Bloqueo de compra con transacción activa.
- [ ] Validación manual local pendiente.

## 13. Binance rate snapshot
- [ ] Aplicar migración contra DB productiva y asociar a transacciones.
