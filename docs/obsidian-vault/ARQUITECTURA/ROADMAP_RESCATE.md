---
tags: ["#roadmap", "#status/urgent", "#status/live-source"]
last_updated: "2026-05-12T14:27-04:00"
---

# Roadmap de Rescate → Roadmap de Consolidación

> **Actualización 2026-05-12:** El rescate de S01-S11 está COMPLETO. Ahora entramos en fase de **consolidación total** con el Plan Maestro de Sprints.

## Estado real activo (2026-05-12)

- Rama madre estable: `RAMA MADRE`.
- Commit estable: `f7f2d1e`.
- `/reservas` congelado como zona sana (zona exclusiva Jean).
- `/marketplace` activo.
- BCV corregido con tasa fresca.
- **S11 CLOSED:** Playwright + login UI smoke 3/3 PASS en rama madre.
- **S12 READY:** Purchase flow browser E2E (Jean).
- **Plan Maestro vigente:** [[PLAN_MAESTRO_SPRINTS_2026-05-12]] — 5 tracks, 27 sprints totales.

## Del rescate a la consolidación

| Fase anterior | Fase actual |
|---------------|-------------|
| Rescate S01-S11 (completado ✅) | Consolidación S12-S21 + Tracks paralelos (en curso 🔴) |
| Enfoque: reparar, estabilizar, QA base | Enfoque: completar, automatizar, producir, crecer |
| Solo Marketplace | Marketplace + Booking + SEO/RRSS + Legal + UI |

## Incidente clave aprendido

- Marketplace vacio en Preview no fue problema de UI/filtros.
- Causa raiz: DB target incorrecta sin tablas `mp_*`.
- Error tecnico observado: Prisma `P2021` (`public.mp_listings` inexistente).
- Solucion real: alinear `DATABASE_URL` (pooled) y `DIRECT_URL` (direct) al mismo proyecto Neon integrado.

## Protocolo obligatorio: marketplace vacio

1. Confirmar branch/commit exacto del deployment.
2. Revisar Vercel runtime logs.
3. Buscar logs `marketplace.discovery`.
4. Distinguir `DB_MISSING` / `QUERY_ERROR` / `ZERO_ACTIVE` / `FILTERED_EMPTY`.
5. Ante Prisma `P2021`, revisar DB target y tablas `mp_*` antes de tocar UI.
6. Comparar `DATABASE_URL` vs `DIRECT_URL` con fingerprint seguro: host hint, pooler true/false, sslmode.
7. Nunca imprimir secretos.
8. Corregir env/DB en Preview solo por Jean.
9. Redeployar mismo commit.
10. Solo tocar UI si DB y query estan correctas.

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
- M2 Marketplace QA Harness: **S03 CLOSED — 12/12 PASS (2026-05-11).**
  - S03F: login + publish + discovery validados. Bootstrap + doctor creados.
  - S03G: purchase initiation + payment report + proof upload validados.
  - S03H: seller delivery + buyer receipt validados.
  - S03I: admin review + payout + dashboards validados.
  - S03J: full regression 12/12 PASS.
  - Sin Playwright. Sin CDP. Todo server-side Prisma directo.
  - Ver [[S03_QA_HARNESS_INDEX]] para dashboard completo.
- M3 Playwright UI Smoke: **S11 CLOSED — 3/3 PASS (2026-05-11).**
  - Playwright + Chromium instalado en rama madre.
  - Helpers `login.mjs` y `screenshot.mjs` reusables.
  - Spec `s11-login-smoke.spec.mjs`: buyerIA, sellerIA, mvera.
  - 6 screenshots en `var/qa-results/s11-login-report/`.
  - Próximo: S12 purchase flow browser E2E (Jean).