# Hitos pragmaticos marketplace

Rama madre: integration/lab-marketplace-sprint2a-selective-2026-05-04

## Para que sirve

Traduce los sprints tecnicos a resultados concretos verificables.

## Hitos principales

1. Integracion base sana: Jean resuelve flipclock y build global.
2. Reconciliacion Sprint 2A: Jean revisa/mergea commit 6512972.
3. Rates diagnosis: Manuel identifica causa de Pendiente de tasa de pago.
4. Rates implementation: tasa y fecha valor quedan auditables.
5. Payout design: se define cierre financiero real.
6. Payout implementation: admin registra pago al vendedor y cierra operacion.
7. Sync stabilization: buyer/seller/admin ven estados consistentes sin refresh confuso.
8. Transaction detail UX: modal desktop claro con timeline y CTA contextual.
9. Chat/system messages: badges accionables y cambios de estado visibles.
10. Listing state: no hay doble venta y los listings quedan reservados/cerrados correctamente.
11. Publish requirements: seller no publica ventas incompletas.
12. Filters/search: compradores encuentran productos por filtros utiles.
13. QA integral: flujo completo probado en preview integrado.

## Regla de prioridad

Primero estabilidad y dinero; luego UX estructural; luego discovery/filtros.

## Owners

Jean: repo, booking/lab, integracion, build, Vercel/envs, DB/schema autorizado, UX tecnica.
Manuel: producto marketplace, operacion, tasas, payout, reglas de negocio, QA operacional.

## Procedimiento QA integrado

Ademas de los hitos pragmaticos, el cierre de cada sprint debe seguir:

- docs/07_handoffs/marketplace-integrated-qa-procedure-2026-05-04.md
- docs/obsidian-vault/QA_MARKETPLACE_INTEGRADO.md

Estos documentos definen QA smoke, QA buyer/seller/admin, QA rates, QA payout, QA listing state, QA chat/unread, QA visual, severidad P0/P1/P2 y evidencia minima.
