# Next Window Brief - Turpial Sound

**Fecha de actualizacion:** 2026-04-29
**Frente activo:** Marketplace
**Tipo de nota:** Checkpoint operativo para siguiente ventana
**Estado de sincronización:** Asistente IA público implementado y validado.

---

## Estado resumido

El asistente IA público del marketplace está implementado y técnicamente validado. El marketplace sigue funcional y separado del booking.

El checkout y la conciliación siguen siendo manuales temporales. La media se maneja correctamente por URLs de storage.

## Estado Asistente IA (Sprint Actual)
- Implementación completa en `/api/marketplace/assistant` y `components/marketplace/MarketplaceAssistant.tsx`.
- Corrección de truncamiento (ajuste a 900 tokens).
- Ampliación de KB (foco musical, guardrails, métodos de pago públicos, artesanía musical/no musical).
- UI responsiva (sin cortes, light/dark mode nativo).
- Validaciones: `npm run build`, `tsc`, `lint` OK.
- QA Matrix: `docs/marketplace/ASSISTANT_QA_MATRIX.md` creada.
- Smoke Script: `scripts/qa-marketplace-assistant-smoke.mjs` creado.
- Pendiente QA manual, commit y push a rama `Marketplace-Pure`.

## Bloqueos activos
- Critico: Ejecutar QA manual completa buyer -> admin -> escrow -> payout manual seller.
- Alto: QA manual del asistente IA (verificación de guardrails y tono).
- Pendiente: Polish UX/copy (chips musicales).

## Resuelto (Hitos clave)
- Separación marketplace/booking.
- Checkout manual temporal operativo.
- Asistente IA público implementado y validado.
- Polish visual completo (Dark/Light mode, responsive).
- Bloqueo de compra por transacción activa implementado.
- Admin Pagos/Vendedores UX alineada.
- Binance rate snapshot implementado (migración pendiente).
- SEO/AEO público implementado.

## Siguiente accion exacta

1. Ejecutar QA manual E2E (buyer -> admin -> escrow -> payout seller) siguiendo el runbook.
2. Validar el asistente IA público en entorno real usando la matriz de QA.
3. Aplicar polish de UX/copy sugerido en auditoría previa.
4. Una vez validado, realizar el commit y push a `Marketplace-Pure`.
5. NO implementar filtros por ciudad/categoría hasta nuevo sprint (brief de diseño creado en `docs/marketplace/LOCATION_FILTERS_DESIGN_BRIEF.md`).
6. NO tocar booking ni `/reservas`.

## Proximo prompt operativo exacto

```text
Lee primero:
- docs/obsidian-vault/ROADMAP_RESCATE.md
- docs/07_handoffs/session-summary-active.md
- docs/07_handoffs/qa-dispatcher.json

Confirma el estado del marketplace y el asistente IA.
Ejecuta QA manual E2E (buyer -> admin -> escrow -> payout seller) siguiendo el runbook.
Valida el asistente IA usando la matriz de QA (docs/marketplace/ASSISTANT_QA_MATRIX.md).
Si hay residuales, documenta en Obsidian y handoff antes de hacer commits.
No toques booking ni /reservas.
```
