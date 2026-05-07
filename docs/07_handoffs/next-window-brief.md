# Next Window Brief - Turpial Sound

**Fecha de actualizacion:** 2026-05-07
**Frente activo:** Integracion reservas + marketplace estable
**Tipo de nota:** Control Tower / siguiente ventana

## Estado resumido

- Rama madre real: `integration/today-reservas-marketplace-stable-2026-05-07`.
- Commit estable: `c01ec60`.
- `/reservas` congelado como zona sana.
- `/marketplace` activo y funcional en la rama integrada.
- BCV corregido con tasa fresca.

## Regla de entorno DB (obligatoria)

- `DATABASE_URL`: pooled/pooler.
- `DIRECT_URL`: direct/no-pooler.
- Ambas al mismo proyecto/base Neon integrada.
- Nunca imprimir secretos.

## Protocolo obligatorio si marketplace carga vacio

1. Confirmar branch/commit exacto del deployment.
2. Revisar Vercel runtime logs.
3. Buscar logs `marketplace.discovery`.
4. Distinguir `DB_MISSING` / `QUERY_ERROR` / `ZERO_ACTIVE` / `FILTERED_EMPTY`.
5. Si aparece Prisma `P2021`, revisar DB target y tablas `mp_*` antes de tocar UI.
6. Comparar `DATABASE_URL` y `DIRECT_URL` por fingerprint seguro (host hint, pooler true/false, sslmode).
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