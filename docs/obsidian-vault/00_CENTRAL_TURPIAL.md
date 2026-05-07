---
tags: ["#central", "#map", "#status/live-source"]
---

# Mapa de Contenido Principal

## Estado canonico activo (2026-05-07)

- Rama madre estable real: `integration/today-reservas-marketplace-stable-2026-05-07`.
- Commit estable real: `c01ec60`.
- `/reservas` congelado como zona sana.
- `/marketplace` activo.
- BCV corregido con tasa fresca.

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
- M2 Marketplace QA Harness.

## Enlaces relacionados

- [[ROADMAP_RESCATE]]
- [[BUGS_CRITICOS]]
- [[SPRINTS_MARKETPLACE_PARALELO]]
- [[QA_MARKETPLACE_INTEGRADO]]
- [[ARQUITECTURA_TASAS]]