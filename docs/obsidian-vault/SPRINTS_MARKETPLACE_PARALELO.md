# Sprints Marketplace Paralelo

Rama madre integrada: integration/lab-marketplace-sprint2a-selective-2026-05-04

## Estado actual

Jean controla repo, booking/lab, integracion, Vercel/envs y salud tecnica general.

Manuel controla producto/operacion marketplace: flujo buyer/seller/admin, tasas, payout, reglas de negocio y QA operacional.

## Pendiente inmediato para Jean

1. Resolver bloqueo global de build:
   - components/bookings/PaymentFlipCountdown.tsx
   - importa flipclock
   - flipclock no aparece en package.json ni pnpm-lock.yaml

2. Revisar y mergear/controlar la rama:
   - Manuel/reconcile-sprint2a-on-integrated-mother
   - commit 6512972 fix(marketplace): reconcile sprint 2a flow on integration

Esta rama restaura Sprint 2A perdido parcialmente en el port selectivo.

## Manuel puede comenzar

Manuel puede comenzar sus sprints en ramas propias desde la rama madre, sin tocar directo la madre.

Prioridad Manuel:
1. ~~Rates diagnosis.~~ ✅ **CERRADO** — Diagnóstico en `Manuel/marketplace-rates-diagnosis` (670b49f).
2. ~~Rates Fase 1 Schema.~~ ✅ **CERRADO** — Schema implementado en `Manuel/marketplace-rates-schema-fase1` (8ea44d4). Migraciones sin aplicar a DB.
3. **Rates Fase 2** — Integrar tasa en `initiatePurchase()` (nueva rama, autorización explícita).
4. Payout design.
5. Listing state.
6. QA operacional.

## Jean puede comenzar

Prioridad Jean:
1. flipclock / build global.
2. merge/review de reconciliacion Sprint 2A.
3. sync stabilization.
4. transaction detail UX.
5. chat/unread/system messages.

## Regla principal

Nadie trabaja codigo directo sobre la rama madre.
Cada sprint sale en rama propia.
Un solo dueno por lock critico.

## Capa de hitos pragmaticos

Ademas de la distribucion tecnica por sprints, el roadmap debe leerse junto con:

- docs/07_handoffs/marketplace-pragmatic-milestones-2026-05-04.md
- docs/obsidian-vault/HITOS_MARKETPLACE_PRACTICOS.md

Estos documentos traducen cada sprint a un resultado verificable para buyer, seller o admin.
