---
tags: ["#central", "#map", "#status/live-source"]
fecha: 2026-05-10
---

# Mapa de Contenido Principal — Turpial Sound

## Estado canonico activo (2026-05-10)

- **Rama madre operativa real:** `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07`
- **HEAD:** `525602c`
- **Rama madre anterior (obsoleta):** `integration/today-reservas-marketplace-stable-2026-05-07` (commit `c01ec60`)
- **`/reservas`:** Congelado como zona sana. Owner: Jean.
- **`/marketplace`:** Activo en preview, no en produccion. Owner: Manuel.
- **BCV:** Corregido con tasa fresca en produccion.
- **Login marketplace:** Reparado (commit `4f15e51`), smoke validado en preview.
- **Preview env `Manuel/*`:** Resuelto con DB, JWT, Blob funcionales en BKG Vercel `turpialsound`.

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
- 0 `main`.
- 0 produccion sin release gate.
- 0 zonas sanas tocadas.

## Roles operativos

- **Jean:** Integracion, merges, Vercel/envs, DB/Prisma/schema/migrations, rama madre, preview integrado, produccion, booking/reservas.
- **Manuel:** Marketplace producto, buyer/seller/admin flow, QA operacional, rates, payout, estados, copy/UX operativo, docs de negocio.

## Bus de Control

- **Nivel 2 (actual):** Dos carriles — Jean (integracion/release/booking) + Manuel (marketplace producto/operaciones).
- **Nivel 4 (futuro):** Cuatro carriles — Integracion/Release, Marketplace, Booking, Plataforma/Finanzas/Compliance.
- Ver: [[BUS_CONTROL_TURPIAL]]

## Estado del negocio

- Ver: [[ESTADO_NEGOCIO_TURPIAL_2026-05-10]]

## Sprints activos

- Ver: [[SPRINTS_GENERADOS_DESDE_OBSIDIAN_2026-05-10]]

## Enlaces del vault

- [[ESTADO_NEGOCIO_TURPIAL_2026-05-10]]
- [[BUS_CONTROL_TURPIAL]]
- [[ROADMAP_RESCATE]]
- [[BUGS_CRITICOS]]
- [[SPRINTS_GENERADOS_DESDE_OBSIDIAN_2026-05-10]]
- [[SPRINTS_MARKETPLACE_PARALELO]]
- [[QA_MARKETPLACE_INTEGRADO]]
- [[ARQUITECTURA_TASAS]]
- [[HITOS_MARKETPLACE_PRACTICOS]]

## Handoffs activos

- `docs/07_handoffs/session-summary-active.md`
- `docs/07_handoffs/next-window-brief.md`
- `docs/07_handoffs/qa-dispatcher.json` (fuente de despacho QA)
- `docs/07_handoffs/qa-canonical-runbook.md`
- `docs/07_handoffs/jean-obsidian-control-bus-brief-2026-05-10.md`

## Lo que NO se toca

- `/reservas` y runtime de booking
- `main` como base de trabajo
- Schema/Prisma sin sprint de arquitectura
- Secretos en texto plano
- Produccion sin release gate de Jean
