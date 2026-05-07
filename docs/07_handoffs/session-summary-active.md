# Session Summary - Activa

## Estado real integrado - 2026-05-07

- Rama madre estable actual: `integration/today-reservas-marketplace-stable-2026-05-07`.
- Commit estable actual: `c01ec60` (`fix(marketplace): render active listings on public page`).
- `/reservas` queda congelado como zona sana (no tocar salvo trabajo documental).
- `/marketplace` queda activo en la rama integrada.
- BCV corregido y respondiendo con tasa fresca.

## Incidente aprendido (2026-05-07)

- Sintoma: marketplace vacio en Preview.
- No fue causa raiz de UI ni filtros.
- Causa real: Vercel Preview apuntaba a DB con booking/reservas pero sin tablas `mp_*`.
- Evidencia tecnica: Prisma `P2021` por ausencia de `public.mp_listings`.
- Solucion real aplicada: corregir `DATABASE_URL` y `DIRECT_URL` en Preview al mismo proyecto/base Neon integrada.

## Regla obligatoria de conexiones DB

- `DATABASE_URL` debe ser pooled/pooler.
- `DIRECT_URL` debe ser direct/no-pooler.
- Ambas deben apuntar al mismo proyecto/base Neon integrada.
- Nunca imprimir secretos.

## Protocolo obligatorio si marketplace carga vacio

1. Confirmar branch/commit exacto del deployment.
2. Revisar Vercel runtime logs.
3. Buscar logs `marketplace.discovery`.
4. Distinguir `DB_MISSING` / `QUERY_ERROR` / `ZERO_ACTIVE` / `FILTERED_EMPTY`.
5. Si aparece Prisma `P2021`, revisar DB target y existencia de tablas `mp_*` antes de tocar UI.
6. Comparar `DATABASE_URL` y `DIRECT_URL` con fingerprint seguro: host hint, pooler true/false, sslmode.
7. Nunca imprimir secretos.
8. Corregir env/DB en Vercel Preview solo por Jean.
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