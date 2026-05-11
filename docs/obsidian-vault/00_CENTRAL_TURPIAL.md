---
tags: ["#central", "#map", "#status/live-source"]
---

# Mapa de Contenido Principal

## Estado canonico activo (2026-05-11)

- Rama madre estable real: `integration/today-reservas-marketplace-stable-2026-05-07`.
- Commit estable real: `c01ec60`.
- `/reservas` congelado como zona sana.
- `/marketplace` activo.
- BCV corregido con tasa fresca.
- **QA Harness Sprint 3: CLOSED / 12/12 PASS.**
  - Ver [[S03_QA_HARNESS_INDEX]] para el dashboard completo.
  - Ver [[S03_FINAL_QA_HARNESS_CLOSURE_2026-05-11]] para el cierre consolidado.
  - Rama final S03: `Manuel/s03j-qa-final-regression-2026-05-11` (commit `dda740f`).
  - Rama docs-only para madre: `Manuel/docs-sync-s03-complete-obsidian-to-mother-2026-05-11`.
  - Próximo paso: S04 browser/UI E2E con Playwright o siguiente sprint funcional marketplace.

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
- J2 Preview Runtime Guard.
- M1 Marketplace Protected Flow E2E.
- M2 Marketplace QA Harness (S03 CLOSED — 12/12 PASS — [[S03_QA_HARNESS_INDEX]]).

## Siguiente paso

S04: Browser/UI E2E con Playwright (autorizado) o siguiente sprint funcional marketplace.
Base recomendada: `Manuel/s03j-qa-final-regression-2026-05-11`.

## Enlaces relacionados

- [[S03_QA_HARNESS_INDEX]] — Dashboard Sprint 3 QA Harness
- [[ROADMAP_RESCATE]]
- [[BUGS_CRITICOS]]
- [[SPRINTS_MARKETPLACE_PARALELO]]
- [[QA_MARKETPLACE_INTEGRADO]]
- [[QA_HARNESS_SCRIPTS_MAP_2026-05-10]]
- [[ARQUITECTURA_TASAS]]

## Regla de cierre de sprint

Un sprint no se considera cerrado sin: validacion, commit, push, docs/Obsidian/handoffs actualizados, siguiente paso real.