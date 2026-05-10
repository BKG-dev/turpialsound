---
tags: ["#central", "#map", "#status/live-source"]
fecha: 2026-05-10
---

# Mapa de Contenido Principal - Turpial Sound

## Estado canonico activo (2026-05-10)

- **Rama madre operativa real:** `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07`
- **HEAD base de referencia:** `525602c`
- **Bus de Control activo:** Nivel 2.5 - Co-development Marketplace
- **`/reservas`:** congelado como zona sana. Owner: Jean.
- **`/marketplace`:** activo en preview, no en produccion.
- **Preview `Manuel/*`:** funcional en BKG Vercel `turpialsound`.
- **Login marketplace:** corregido a nivel runtime; cierre QA formal queda en S03.
- **Payment proof protegido:** implementado a nivel tecnico; cierre operativo queda en S04.

## Principio central

Codigo correcto + DB incorrecta = UI vacia.

## Reglas de conexion DB

- `DATABASE_URL` pooled/pooler.
- `DIRECT_URL` direct/no-pooler.
- Mismo proyecto/base Neon integrada para ambas.
- Nunca imprimir secretos.

## Metodologia activa

- 1 rama madre operativa.
- 2 co-desarrolladores marketplace con ownership claro.
- 1 owner principal por sprint.
- 1 lock por dominio critico.
- 1 reviewer cruzado cuando la zona lo amerite.
- 1 commit/push por sprint cerrado o hotfix minimo validado.
- 0 trabajo exploratorio directo sobre madre.
- 0 `main` como base operativa.
- 0 produccion sin gate explicito de Jean.
- 0 cambios en booking, schema o envs sin acuerdo y lock.

## Roles operativos

- **Jean:** co-desarrollador marketplace, gatekeeper de `main`/produccion, owner de booking `/reservas`, owner fuerte de integracion, release, Vercel production, envs criticos, DB/schema/migrations.
- **Manuel:** co-desarrollador marketplace, product owner marketplace, owner de QA buyer/seller/admin, UX operativa, action center, delivery/receipt, admin marketplace, docs de marketplace.

## Bus de Control

- **Nivel 2.5 (actual):** Jean y Manuel desarrollan marketplace en paralelo con locks, checklist de push a madre y gate de Jean para `main`/produccion.
- **Nivel 4 (futuro):** Integracion/Release, Marketplace, Booking, Plataforma/Finanzas/Compliance.
- Ver: [[BUS_CONTROL_TURPIAL]]

## Estado del negocio

- Ver: [[ESTADO_NEGOCIO_TURPIAL_2026-05-10]]

## Sprints activos

- **S00B:** replanteo documental y bus de control para co-development marketplace.
- **Plan ejecutivo:** [[SPRINTS_GENERADOS_DESDE_OBSIDIAN_2026-05-10]]
- **Plan operativo segregado:** [[SPRINTS_CODEV_MARKETPLACE_2026-05-10]]

## Enlaces del vault

- [[ESTADO_NEGOCIO_TURPIAL_2026-05-10]]
- [[BUS_CONTROL_TURPIAL]]
- [[ROADMAP_RESCATE]]
- [[BUGS_CRITICOS]]
- [[SPRINTS_GENERADOS_DESDE_OBSIDIAN_2026-05-10]]
- [[SPRINTS_CODEV_MARKETPLACE_2026-05-10]]
- [[ARQUITECTURA_TASAS]]
- [[HITOS_MARKETPLACE_PRACTICOS]]

## Handoffs activos

- `docs/07_handoffs/session-summary-active.md`
- `docs/07_handoffs/next-window-brief.md`
- `docs/07_handoffs/qa-dispatcher.json`
- `docs/07_handoffs/qa-canonical-runbook.md`
- `docs/07_handoffs/jean-obsidian-control-bus-brief-2026-05-10.md`
- `docs/07_handoffs/prompt-s01-manuel-preview-smoke-autonomy-2026-05-10.md`
- `docs/07_handoffs/prompt-s02-jean-discovery-runtime-stabilization-2026-05-10.md`

## Lo que NO se toca

- `/reservas` y runtime de booking sin sprint explicito de Jean
- `main` como base de trabajo
- produccion sin release gate de Jean
- schema/Prisma/migrations sin lock Jean + Manuel
- envs, dominios, billing o release config sin Jean
- dos sprints mezclados en una misma rama
- dos personas sobre el mismo archivo/zona critica sin lock previo
