---
tags: ["#roadmap", "#status/urgent", "#status/live-source"]
---

# Roadmap de Rescate

## Actualizacion S02 (2026-05-10)

- Sprint ejecutado: `S02` (Jean) en rama `Jean/s02-marketplace-discovery-runtime-stabilization-2026-05-10`.
- Runner aplicado: `AGENT_CONTROL_BUS_RUNNER.md` v1.0.1 desde `origin/Manuel/docs-control-bus-s02-unblock-2026-05-10` (`9a8faae`).
- Preview de cierre usado: `https://turpialsound-nukiu73zg-bkgs-projects-829c67c1.vercel.app`.
- Clasificacion canonica registrada: `QUERY_ERROR` en `preview-runtime-guard` por `DATABASE_URL missing` local de diagnostico.
- Smoke BKG estable: `/`, `/marketplace`, `/reservas`, `/api/bcv-rate`, `/admin/login`, `/ops/payment-review` en `200`; `/payment-proofs/view` en `400` controlado.
- Sin cambios en booking, main, produccion, envs ni schema.
- Siguiente ventana recomendada: `S03` (Auth/Login QA Closure, Manuel owner).

## Preview 3spd7suth - Lab Meta/WhatsApp Mapping

- URL: `https://turpialsound-3spd7suth-bkgs-projects-829c67c1.vercel.app/`
- Deployment id: `dpl_BsfocbQfmiCQmyUvob7TFGRbovqY`
- Rama inferida: `origin/lab/meta-embedded-signup-coexistence-2026-05-10`
- Commit candidato: `53477ff`
- Estado: rama lab paralela validada
- No integrada en: `integration/today`, `integration-prep`, `prod/current`
- Decision: requiere consolidacion selectiva posterior; no merge ciego.

## Estado real activo (2026-05-07)

- Rama madre estable: `integration/today-reservas-marketplace-stable-2026-05-07`.
- Commit estable: `c01ec60`.
- `/reservas` congelado como zona sana.
- `/marketplace` activo.
- BCV corregido con tasa fresca.

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
- M2 Marketplace QA Harness.
