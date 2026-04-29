---
tags: ["#roadmap", "#status/urgent", "#status/live-source"]
---

# Roadmap de Rescate

Obsidian es la fuente de trazabilidad viva del proyecto. Este archivo refleja el estado operativo real del marketplace al 2026-04-29 y deja el checkpoint para retomar sin rearmar contexto.

## Estado actual real del marketplace (2026-04-29)

El marketplace está funcional y separado del booking.

El flujo operativo vigente es manual temporal: checkout manual para buyer, conciliación manual por admin, escrow manual y payout manual al seller.

### Hitos completados (Sprint IA & Marketplace)
- **Asistente IA Público:** Implementado y técnicamente validado (`/api/marketplace/assistant`). KB y guardrails configurados. QA Matrix y smoke script creados.
- **UX Responsive:** Marketplace público responsive (mobile/desktop), dark/light mode scoped, contraste mejorado, Q&A legible, banco select y normalización de teléfonos venezolanos.
- **Sprint 2/3 Fixes:** Payout methods corregidos, nota interna admin estable, bloqueo de compra por transacción activa, tasas Binance persistidas, Admin Pagos alineado.

### Bloqueos activos
- [ ] Ejecutar QA manual E2E buyer -> admin -> escrow -> payout seller siguiendo runbook.
- [ ] Validar asistente IA en entorno real según `docs/marketplace/ASSISTANT_QA_MATRIX.md`.
- [ ] Aplicar polish final de UX/copy.
- [ ] Commit y push a `Marketplace-Pure`.

### Pendientes posteriores (Nivel 2)
- [ ] Ubicación/filtros (Brief: `docs/marketplace/LOCATION_FILTERS_DESIGN_BRIEF.md`, no implementar aún).
- [ ] Flujo de conformidad/fondos por liberar.
- [ ] Liquidación seller y tasa snapshot (Migración pendiente).
- [ ] Plan contable/P&L.
- [ ] SEO/AEO dinámico.

## Reglas de oro
- No tocar `booking` ni `/reservas`.
- No implementar nuevas migraciones sin aprobación explícita.
- No tocar `paymentProofUrl` ni proxy `SUPER`.
- Si un objetivo no está en `docs/07_handoffs/qa-dispatcher.json`, reportar `GAP OPERATIVO` y no improvisar.
