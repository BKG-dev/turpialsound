# Next Window Brief - Turpial Sound

**Fecha de actualizacion:** 2026-05-10
**Frente activo:** S03 - Auth/Login QA Closure
**Tipo de nota:** Control Tower / bloqueo real en normalizacion QA y auth data

## Estado actual de S03

- **Rama de trabajo:** `Manuel/s03-auth-login-qa-closure-2026-05-10`
- **Base inmediata:** `origin/Manuel/s01-preview-smoke-autonomy-2026-05-10`
- **Base operativa ultima:** `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07` @ `525602c`
- **Runner fuente:** `origin/Manuel/docs-control-bus-s02-unblock-2026-05-10`
- **Preview BKG valido heredado de S01:** `https://turpialsound-qc6k39eh1-bkgs-projects-829c67c1.vercel.app`
- **Estado de smoke heredado:** `/` `200`, `/marketplace` `200`, `/reservas` `200`, `/api/bcv-rate` `200`, `/admin/login` `200`, `/ops/payment-review` `200`, `/payment-proofs/view` `400` controlado
- **`task_id=marketplace_login_smoke`:** buyer falla con `usuario o contrasena incorrectos`; seller no corre por corte temprano
- **`task_id=qa_accounts_normalization`:** existe en dispatcher, pero no es ejecutable aqui con las precondiciones disponibles
- **Precondiciones faltantes para normalizacion:** `QA_BUYER_EMAIL` y `QA_SELLER_EMAIL` no estan en Preview ni en env local de este worktree

## Bloqueo rojo

- S03 no esta bloqueado por Preview BKG ni por `QA_*` basicos.
- El bloqueo real queda en saneamiento de auth data QA fuera del scope operativo normal de S03.
- Cerberus no cierra nada y no se uso como fallback.

## Siguiente ventana recomendada

1. Confirmar si Jean + Manuel autorizan lock para normalizacion QA/auth data.
2. Si el lock existe y se dispone de `QA_BUYER_EMAIL` y `QA_SELLER_EMAIL` autorizados, correr `task_id=qa_accounts_normalization`.
3. Reintentar `task_id=marketplace_login_smoke`.
4. Si buyer y seller pasan, cerrar S03 y reintentar/cerrar S01.
5. Jean debe quedarse en `S04 align` hasta que buyer/seller QA quede realmente cerrado, porque S04 exige `buyerIA` operativo como precondicion funcional.

**Fecha de actualizacion:** 2026-05-09
**Frente activo:** Hotfix marketplace login QA/produccion
**Tipo de nota:** Control Tower / siguiente ventana

## Estado urgente

- Produccion debe recibir solo el fix runtime de login marketplace si el objetivo es no cambiar nada mas.
- Commit runtime recomendado: `4f15e51` (`fix(marketplace): repair marketplace user login`).
- Archivos runtime tocados por ese commit: `actions/marketplace/auth.ts`, `components/marketplace/MarketplaceAuthModal.tsx`.
- No tocar BCV/tasas: produccion ya devuelve tasa fresca y no necesita cambios en este hotfix.
- No tocar booking, `/reservas`, Prisma schema, migrations, DB, Vercel envs ni Neon.
- Usuario QA correcto: `sellerIA`; `sellerID` no es usuario QA canonico.
- Credenciales QA no se documentan en texto plano; scripts usan `QA_*` desde env autorizado.
- Rama de documentacion/QA scripts: `Manuel/s04d-qa-env-login-fix-2026-05-09` en commit `8d43d53`.

## Validacion login

- Preview validado: `https://turpialsound-j5062s7m3-cerberus77s-projects.vercel.app`.
- Smoke corto validado: `node scripts/qa-marketplace-login-smoke.mjs`.
- Resultado: `buyerIA` OK, `sellerIA` OK.
- `sellerID` falla correctamente si no existe.

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
