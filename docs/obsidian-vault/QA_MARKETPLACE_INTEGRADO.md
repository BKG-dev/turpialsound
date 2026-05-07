# QA Marketplace Integrado

## Estado base 2026-05-07

- Rama madre estable: `integration/today-reservas-marketplace-stable-2026-05-07`.
- Commit estable: `c01ec60`.
- `/reservas` congelado como zona sana.
- `/marketplace` activo.

## Regla de despacho QA (obligatoria)

- Fuente de despacho por objetivo: `docs/07_handoffs/qa-dispatcher.json`.
- Antes de cualquier QA, resolver `task_id` exacto en dispatcher.
- Si no existe ruta canonica exacta, detener y reportar `GAP OPERATIVO`.
- No usar `LEGACY` ni `EXPERIMENTAL` como primera opcion si existe ruta canonica/supporting exacta.

## Regla de incidente marketplace vacio

Si aparece UI vacia en marketplace, aplicar este protocolo y no improvisar:

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

## Regla de conexiones

- `DATABASE_URL`: pooled/pooler.
- `DIRECT_URL`: direct/no-pooler.
- Ambas al mismo proyecto/base Neon integrada.