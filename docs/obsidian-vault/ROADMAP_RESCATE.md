---
tags: ["#roadmap", "#status/urgent", "#status/live-source"]
---

# Roadmap de Rescate

## S02 — Marketplace Discovery Runtime Stabilization: CLOSED (2026-05-11)

- Sprint: `S02` — CLOSED.
- Owner: Jean. Reviewer: Manuel.
- Rama final: `jean/s02-marketplace-discovery-runtime-stabilization-2026-05-10`.
- Commit final: `4c3908e` (5 commits total).
- Resultado: Error clasificado como `QUERY_ERROR` con smoke BKG estable (6/6 rutas 200).
- Preview de cierre: `https://turpialsound-nukiu73zg-bkgs-projects-829c67c1.vercel.app`.
- Clasificacion canonica: `QUERY_ERROR` por `DATABASE_URL missing` local de diagnostico.
- Sin cambios en booking, main, produccion, envs ni schema.
- Ver [[S02_DISCOVERY_RUNTIME_INDEX]] para dashboard completo.
- Ver [[S02_FINAL_DISCOVERY_RUNTIME_CLOSURE_2026-05-11]] para cierre consolidado.
- Proximo: S03 (ya cerrado 12/12 PASS QA Harness), S04 en curso.

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
