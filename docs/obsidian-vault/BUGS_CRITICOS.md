---
tags: ["#status/live-source", "#area/backend", "#area/ui", "#area/ops"]
---

# Bugs Criticos

Este archivo registra los bloqueos y riesgos operativos activos del marketplace al 2026-05-03 (segunda revision).

## 1. Franja negra superior (UI Shell)
- **Estado real**: Resuelto en P0-A. Se implementó `MainContentShell` para anular el `pt-16` global en rutas de marketplace.

## 2. QA operativa end-to-end (P0-B)
- **Estado real**: Resuelto. P0-B Chat Unread implementado y validado en QA manual.
- **Badge unread**: OK — navega a messages/focus unread.
- **Focus unread**: OK — dashboard abre primer thread unread.
- **Mark-as-read diferido**: OK — no marca al montar, solo con interacción explícita.

## 3. Storage productivo definitivo
- **Estado real**: Public media validada; proofs sensibles implementados técnicamente y validados manualmente en preview.
- **Accion inmediata**: Mantener `payment-proof` fuera del Blob público no-booking.

## 4. Cierre final de payout (MpPayout)
- **Estado real**: Pendiente alta. Requiere formalizar el registro de pagos realizados por admin.
- **Advertencia**: No tocar sin diseño de arquitectura. Codex-only.

## 5. Cron T+7 no implementado
- **Estado real**: Pendiente.

## 6. Sprint 3B1 - Disponibilidad por transacción activa
- **Estado real**: Resuelto. El sistema bloquea compras si existe una transacción activa en estado no terminal.

## 7. Binance rate snapshot
- **Estado real**: Resuelto e implementado en DB-Rates MVP.

## 8. Hallazgos funcionales - Dashboard y Operación (Sprint 3)
- [x] Contador Mis compras (Resuelto)
- [x] Detalle compra/venta (Resuelto)
- [x] Franja negra superior (Resuelto)
- [x] CSV con UTF-8 BOM (Resuelto)
- [x] Datos cobro vendedor en Pagos (Resuelto)
- [ ] Totales/comisiones inconsistentes (Alta abierta - pendiente QA post tasas)
- [ ] Tab comisiones en cero (Alta abierta)
- [x] Nota interna corregida (Resuelto)
- [x] Badge mensajes funcional (Resuelto — P0-B)
- [x] Tab mensajes desalineado (Resuelto — P0-B)
- [x] Mensaje tranquilidad post Pago (Resuelto)
- [ ] Desajuste métricas/tabs/flujo real (Crítica abierta)

## 9. Sprint 2 Bugs internos (Resueltos)
- [x] Guardar método de cobro (Normalizado, validado)
- [x] Nota interna Admin (Foco estable)

## 10. WebGL Wave - No continuar ahora
- **Estado real**: Exploración problemática que generó loop. Cerrada para este sprint.
- **Regla**: No mezclar con otros sprints. Si se retoma, debe ser sprint visual separado con aprobación previa.

## 11. Prototipo gptrfix08 - En observación
- **Estado real**: Preview NO oficial. Preservado como candidato visual.
- **Regla**: No tratar como oficial. No mezclar con checkpoint `t18pj01z8`.

## 12. P0-C AuthBar Sticky
- **Estado real**: Resuelto. AuthBar sticky confirmado en runtime.
- **Causa real**: `.mp-route-shell` creaba scroll container vertical.
- **Fix**: `overflow-y: visible; overflow-x: clip` en `styles/globals.css`.
- **QA runtime**: `AUTHBAR_RECT_AFTER_SCROLL.top = 0`.
- **Riesgo residual**: Verificar en mobile Safari y con modales/checkout abiertos.

## 13. P0-B.2 System Messages (diseño pendiente)
- **Estado real**: Pendiente de diseño.
- **Restricción**: NO usar `senderId = SYSTEM` porque `MpMessage.senderId` es FK obligatoria a `MpUser`.
- **Requiere**: diseño de usuario sistema, schema/type, o statusHistory virtual.
