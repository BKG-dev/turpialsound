---
tags: ["#central", "#map", "#status/live-source"]
---

# Mapa de Contenido Principal

## Estado canonico activo (2026-05-11)

- Rama madre estable real: `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07`.
- Commit estable real: `c01ec60`.
- `/reservas` congelado como zona sana.
- `/marketplace` activo.
- BCV corregido con tasa fresca.
- **S02 Discovery Runtime: CLOSED — Error clasificado, runtime estable en Preview BKG.**
  - Ver [[S02_DISCOVERY_RUNTIME_INDEX]] para el dashboard completo.
  - Ver [[S02_FINAL_DISCOVERY_RUNTIME_CLOSURE_2026-05-11]] para el cierre consolidado.
  - Rama final S02: `jean/s02-marketplace-discovery-runtime-stabilization-2026-05-10` (commit `4c3908e`).
  - Proximo: S03 (ya cerrado 12/12 PASS), S04 en curso.

## Principio central

Codigo correcto + DB incorrecta = UI vacia.

## Reglas de conexion DB

- `DATABASE_URL` pooled/pooler.
- `DIRECT_URL` direct/no-pooler.
- Mismo proyecto/base Neon integrada para ambas.
- Nunca imprimir secretos.

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
- J2 Preview Runtime Guard (S02 CLOSED — [[S02_DISCOVERY_RUNTIME_INDEX]]).
- M1 Marketplace Protected Flow E2E.
- M2 Marketplace QA Harness (S03 CLOSED — 12/12 PASS).

## Siguiente paso

S04: Payment Proof Protected E2E (Jean owner).
Base recomendada: `jean/s04-payment-proof-protected-2026-05-11`.

## Regla de cierre de sprint

Un sprint no se considera cerrado sin: validacion, commit, push, docs/Obsidian/handoffs actualizados, siguiente paso real.

## Enlaces relacionados

- [[S02_DISCOVERY_RUNTIME_INDEX]] — Dashboard Sprint 2 Discovery Runtime
- [[ROADMAP_RESCATE]]
- [[BUGS_CRITICOS]]
- [[SPRINTS_MARKETPLACE_PARALELO]]
- [[QA_MARKETPLACE_INTEGRADO]]
- [[ARQUITECTURA_TASAS]]