# Next Window Brief — S02 Complete

> Date: 2026-05-11
> Branch: jean/s02-marketplace-discovery-runtime-stabilization-2026-05-10

## Current state: S02 CLOSED — Error clasificado, runtime estable

Sprint 2 Discovery Runtime Stabilization fully closed. Discovery error classified as `QUERY_ERROR` with stable BKG smoke.

## What to read first

1. [[00_CENTRAL_TURPIAL]] — Mapa central del proyecto (actualizado)
2. [[S02_DISCOVERY_RUNTIME_INDEX]] — Dashboard maestro Obsidian del Sprint 2
3. [[S02_FINAL_DISCOVERY_RUNTIME_CLOSURE_2026-05-11]] — Cierre consolidado S02
4. `docs/07_handoffs/qa-dispatcher.json` — Dispatcher con S02 task_id registrado

## Key facts

- Error Prisma/query clasificado como `QUERY_ERROR`. Smoke BKG estable (6/6 rutas en 200).
- Login marketplace reparado (commit `4f15e51`).
- Credentials: buyerIA, sellerIA validados via smoke. Nunca en Git.
- Preview valido: `https://turpialsound-nukiu73zg-bkgs-projects-829c67c1.vercel.app`.
- Sin cambios en booking, schema, envs, produccion.

## Canonical commands

```bash
# Diagnostico runtime en Preview BKG
npx tsx scripts/diagnostics/preview-runtime-guard.ts --smoke-http --base-url https://turpialsound-nukiu73zg-bkgs-projects-829c67c1.vercel.app

# Smoke login QA
node scripts/qa-marketplace-login-smoke.mjs
```

## Next real step

**S03 — Auth/Login QA Closure (Manuel owner).** Already executed and closed with 12/12 PASS in QA Harness.
**S04 — Payment Proof Protected E2E (Jean owner).** Base: `jean/s04-payment-proof-protected-2026-05-11`.

## Do NOT repeat

- Do not re-run S02 diagnostics.
- Do not use CDP.
- Do not touch booking/reservas.
- Do not touch production/main.
- Do not commit .env.local, var/qa-results, or secrets.

---

## S02 historical data (archived)

- **Runner fuente:** `origin/Manuel/docs-control-bus-s02-unblock-2026-05-10` @ `9a8faae`.
- **Rama:** `Jean/s02-marketplace-discovery-runtime-stabilization-2026-05-10`.
- **Base:** `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07` @ `525602c`.
- **Preview valido usado para cierre:** `https://turpialsound-nukiu73zg-bkgs-projects-829c67c1.vercel.app`.
- **Preview invalido para cierre:** cualquier `cerberus77s-projects`.
- **Clasificacion canonica S02:** `QUERY_ERROR` (diagnostico con `preview-runtime-guard` reporta `DATABASE_URL missing` local), con smoke BKG estable en rutas core.
- **Guardrails respetados:** sin booking, sin main, sin produccion, sin envs, sin schema.

## Proxima ventana recomendada

- **Sprint:** S03 - Auth/Login QA Closure
- **Owner:** Manuel
- **Reviewer:** Jean
- **Objetivo:** cerrar buyer/seller/admin login en Preview real con ruta QA canonica.

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
