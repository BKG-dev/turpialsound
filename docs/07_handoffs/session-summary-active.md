# Session Summary - Activa

## Estado real integrado - 2026-05-07

- Rama madre estable actual: `integration/today-reservas-marketplace-stable-2026-05-07`.
- HEAD base de referencia de integracion: `cbc72e3`.
- Commit estable operativo validado: `c01ec60` (`fix(marketplace): render active listings on public page`).
- `/reservas` queda congelado como zona sana.
- `/marketplace` queda activo y visible en rama integrada.
- BCV corregido y respondiendo con tasa fresca (incluye fix `a96c247`).
- Main y produccion no tocados.

## Incidente aprendido - Marketplace vacio en Preview (2026-05-07)

- Sintoma: `/marketplace` vacio en Preview.
- No fue causa raiz de UI ni filtros.
- Causa real: Preview apuntando a DB incorrecta sin tablas `mp_*`.
- Evidencia tecnica: Prisma `P2021` por ausencia de `public.mp_listings`.
- Solucion real: corregir `DATABASE_URL` y `DIRECT_URL` al mismo proyecto/base Neon integrada.

## Regla obligatoria de conexiones DB

- `DATABASE_URL` debe ser pooled/pooler.
- `DIRECT_URL` debe ser direct/no-pooler.
- Ambas deben apuntar al mismo proyecto/base Neon integrada.
- Nunca imprimir secretos.

## Protocolo obligatorio si marketplace carga vacio

1. Confirmar branch/commit exacto del deployment.
2. Revisar runtime logs del deployment.
3. Buscar logs `marketplace.discovery`.
4. Distinguir `DB_MISSING` / `QUERY_ERROR` / `ZERO_ACTIVE` / `FILTERED_EMPTY`.
5. Si hay `P2021`, validar DB target y existencia real de tablas `mp_*` antes de tocar UI.
6. Comparar `DATABASE_URL` y `DIRECT_URL` con fingerprint seguro (host hint, pooler, sslmode).
7. Corregir env/DB de Preview solo por Jean.
8. Redeployar el mismo commit tras corregir target DB.
9. Solo tocar UI si DB/query/data ya estan correctas.

## Smoke base esperado en Preview integrado

- `/` responde.
- `/marketplace` responde.
- `/reservas` responde.
- `/api/bcv-rate` responde.
- `/admin/login` responde.
- `/ops/payment-review` responde con control de acceso.
- `/payment-proofs/view` sin token responde error controlado (no `500`).

## Metodologia Oreshnik-Codex 2.0

- 1 rama madre estable.
- N worktrees separados.
- N agentes Codex.
- 1 owner por lock.
- 1 commit/push por sprint cerrado.
- 0 trabajo directo sobre madre.
- 0 `main`.
- 0 produccion.
- 0 cambios en zonas sanas fuera de scope.

## Roles operativos

- Jean: integracion, merges, Vercel/envs, DB/Prisma/schema/migrations, rama madre, preview integrado, booking/reservas.
- Manuel: marketplace producto, buyer/seller/admin flow, QA operacional, rates, payout, estados, copy/UX operativo.

## Ola 1 (fuente activa)

- J1 Docs Control Tower.
- J2 Preview Runtime Guard.
- M2 Marketplace QA Harness.
- J3 Integration Gatekeeper.
- M1 Marketplace Protected Flow E2E: fuera de esta integracion prep hasta autorizacion.
