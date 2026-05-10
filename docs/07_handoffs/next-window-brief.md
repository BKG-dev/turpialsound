# Next Window Brief - Turpial Sound

**Fecha de actualizacion:** 2026-05-10
**Frente activo:** S01 - BKG Preview Smoke Autonomy
**Tipo de nota:** Control Tower / bloqueo real de preflight

## Estado actual de S01

- **Rama de trabajo:** `Manuel/s01-preview-smoke-autonomy-2026-05-10`
- **Base:** `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07` @ `525602c`
- **Runner fuente:** `origin/Manuel/docs-control-bus-s02-unblock-2026-05-10`
- **Scope validado:** `bkgs-projects-829c67c1/turpialsound`
- **Preview nuevo:** no desplegado
- **Smoke:** no ejecutado
- **Motivo:** faltan `QA_BUYER_IDENTIFIER`, `QA_BUYER_PASSWORD`, `QA_SELLER_IDENTIFIER`, `QA_SELLER_PASSWORD` en Preview BKG

## Bloqueo rojo

- S01 no puede continuar porque la validacion minima exige los env names QA presentes en Preview.
- No se permite corregir eso desde este sprint porque tocar envs esta prohibido.
- Cerberus no cierra nada y no se uso como fallback.

## Siguiente ventana recomendada

1. Restaurar en Preview BKG los env names `QA_BUYER_IDENTIFIER`, `QA_BUYER_PASSWORD`, `QA_SELLER_IDENTIFIER`, `QA_SELLER_PASSWORD`.
2. Reintentar S01 desde el mismo branch/worktree limpio.
3. Solo despues de eso:
   - desplegar Preview BKG desde `Manuel/*`,
   - correr `preview-runtime-guard.ts`,
   - hacer smoke de `/`, `/marketplace`, `/reservas`, `/api/bcv-rate`, `/admin/login`, `/ops/payment-review`, `/payment-proofs/view`,
   - resolver y correr `task_id=marketplace_login_smoke` si los `QA_*` ya existen.

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
