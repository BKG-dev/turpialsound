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
- [ ] Aplicar migración `20260429_marketplace_binance_rate_snapshots` contra DB productiva.
- [x] Schema `MpBinanceRateSnapshot` existe en `prisma/schema.prisma`.

## 14. Fase 1 Schema de Tasas Marketplace (CERRADA — Commit 8ea44d4)
- [x] `MpTransaction` con columnas: `frozenRate`, `frozenRateSource`, `frozenRateFechaValor`, `rateSnapshotId`.
- [x] `MpReferenceRateSnapshot` creado (análogo a `MpBinanceRateSnapshot`).
- [x] Migración `20260505_marketplace_rate_schema_fase1` creada (no aplicada a DB).
- [x] `resolveReferenceRate()` persiste snapshots BCV en DB.
- [x] Fallback correcto: nunca usa `rate=1` ni constante inventada.
- [ ] Migraciones sin aplicar a DB productiva — pendiente autorización.
- [ ] Fase 2: integrar tasa en `initiatePurchase()` — pendiente nueva rama.

---

## Checkpoint operativo - rama madre integrada y trabajo paralelo

Fecha: 2026-05-04
Rama madre: integration/lab-marketplace-sprint2a-selective-2026-05-04

Se documento el metodo de trabajo paralelo para Jean y Manuel.

### Estado

La rama madre es controlada por Jean y funciona como base integrada. No se debe trabajar codigo directo sobre ella.

### Pendiente inmediato Jean

- Resolver bloqueo global de build por flipclock en components/bookings/PaymentFlipCountdown.tsx.
- Revisar/mergear Manuel/reconcile-sprint2a-on-integrated-mother, commit 6512972, que restaura piezas criticas de Sprint 2A en la integracion.

### Manuel

Manuel puede iniciar sus sprints en ramas propias desde la rama madre, priorizando rates diagnosis, payout design, listing state y QA operacional.

### Documentos fuente

- docs/07_handoffs/parallel-sprint-distribution-2026-05-04.md
- docs/obsidian-vault/SPRINTS_MARKETPLACE_PARALELO.md

---

## Checkpoint operativo - hitos pragmaticos marketplace

Fecha: 2026-05-04
Rama madre: integration/lab-marketplace-sprint2a-selective-2026-05-04

Se agrego una capa de hitos pragmaticos / Definition of Done para traducir cada sprint tecnico a resultados concretos verificables.

Documentos:
- docs/07_handoffs/marketplace-pragmatic-milestones-2026-05-04.md
- docs/obsidian-vault/HITOS_MARKETPLACE_PRACTICOS.md

Uso:
- Jean y Manuel deben leer estos hitos al iniciar sesion.
- Cada sprint debe cerrar con un resultado verificable, no solo con archivos modificados.
- La division tecnica de locks se mantiene en parallel-sprint-distribution.
