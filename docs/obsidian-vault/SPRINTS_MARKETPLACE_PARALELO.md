---
tags: ["#marketplace", "#sprints", "#paralelo", "#status/live-source"]
---

# SPRINTS MARKETPLACE PARALELO

## Base estable real (2026-05-07)

- Rama madre estable: `RAMA MADRE`.
- Commit estable: `c01ec60`.
- Regla: cero trabajo directo sobre rama madre.

## Metodologia Oreshnik-Codex 2.0

- 1 rama madre estable.
- N worktrees separados.
- N agentes Codex.
- 1 owner por lock.
- 1 commit/push por sprint cerrado.
- 0 trabajo directo sobre madre.
- 0 main.
- 0 produccion.
- 0 zonas sanas tocadas.

## Roles

- Jean: integracion, Vercel/envs, DB/Prisma/schema/migrations, booking/reservas, rama madre, merges, preview integrado.
- Manuel: marketplace producto, buyer/seller/admin flow, QA operacional, rates, payout, estados, copy/UX operativo.

## Ola 1

- J1 Docs Control Tower.
- J2 Preview Runtime Guard.
- M1 Marketplace Protected Flow E2E.
- M2 Marketplace QA Harness.

## Regla de zonas

- `/reservas` congelado como zona sana.
- `/marketplace` activo en la rama integrada.

## Actualizacion 2026-05-17 — S-MP-01 Carrito de Compras

### Estado

- S-MP-01 queda implementado en rama `Manuel/s-mp-01-carrito-2026-05-17`.
- Preview vigente de la sesion: `https://turpialsound-egsoseogk-bkgs-projects-829c67c1.vercel.app`.
- QA server-side canonico agregado: `smp01_cart_consolidated_checkout`.
- Validacion QA: 2026-05-17T21:24:48Z — 17/17 PASS.

### Entregables

- Carrito con selector de cantidad y tope por disponible real.
- Detalle de listing con cantidad disponible y compra por cantidad.
- Checkout de carrito con `MpOrder` consolidada.
- Transacciones hijas por seller/listing.
- Comprobante obligatorio en modal de carrito.
- Flujo de entrega/liberacion/payout independiente por seller.
- Dashboard usuario con tabs arriba y bandeja prioritaria colapsable.
- Documentacion de cierre: `docs/07_handoffs/S_MP_01_CART_SESSION_CLOSURE_2026-05-17.md`.
- Matriz QA: `docs/marketplace/CART_CONSOLIDATED_QA_MATRIX.md`.

### Comando QA

```powershell
npx tsx scripts/qa/run-marketplace-qa.mjs --module=S-MP-01
```

### Pendiente separado

- Crear ruta Playwright/browser para validar clicks reales de carrito en preview. No usar CDP improvisado.
