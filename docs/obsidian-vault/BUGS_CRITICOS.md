---
tags: ["#status/live-source", "#area/backend", "#area/ui", "#area/ops"]
---

# Bugs Criticos

## Estado real 2026-05-07

- Rama madre estable: `integration/today-reservas-marketplace-stable-2026-05-07`.
- Commit estable: `c01ec60`.
- `/reservas` congelado como zona sana.
- `/marketplace` activo.

## S02 Discovery Runtime Closure (2026-05-11)

- [x] S02 cerrado documentalmente. Discovery runtime estabilizado en Preview BKG.
- [x] Clasificacion canonica: `QUERY_ERROR` con smoke BKG estable (6/6 rutas).
- [x] Ver [[S02_DISCOVERY_RUNTIME_INDEX]] y [[S02_FINAL_DISCOVERY_RUNTIME_CLOSURE_2026-05-11]].

## P0 cerrado del dia

- [x] Marketplace vacio por UI/filtros (descartado).
- [x] Causa raiz real identificada: DB target de Preview sin tablas `mp_*`.
- [x] Prisma `P2021` asociado a `public.mp_listings` inexistente.
- [x] BCV corregido con tasa fresca.
- [x] Login marketplace reparado (commit `4f15e51`).

## Guardrails operativos (obligatorios)

- `DATABASE_URL` pooled/pooler.
- `DIRECT_URL` direct/no-pooler.
- Ambas al mismo proyecto/base Neon integrada.
- Nunca imprimir secretos.
- Correccion env/DB Preview solo por Jean.

## Protocolo obligatorio si marketplace carga vacio

1. Confirmar branch/commit exacto del deployment.
2. Revisar Vercel runtime logs.
3. Buscar logs `marketplace.discovery`.
4. Distinguir `DB_MISSING` / `QUERY_ERROR` / `ZERO_ACTIVE` / `FILTERED_EMPTY`.
5. Si aparece Prisma `P2021`, revisar DB target y tablas `mp_*` antes de tocar UI.
6. Comparar `DATABASE_URL` y `DIRECT_URL` con fingerprint seguro (host hint, pooler true/false, sslmode).
7. Nunca imprimir secretos.
8. Corregir env/DB en Preview solo por Jean.
9. Redeployar mismo commit.
10. Solo tocar UI si DB y query estan correctas.