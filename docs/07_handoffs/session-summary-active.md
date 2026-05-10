# Session Summary - Activa

## S02 — Marketplace Discovery Runtime Stabilization (Jean) — 2026-05-10

- **Runner fuente:** `origin/Manuel/docs-control-bus-s02-unblock-2026-05-10` @ `9a8faae`.
- **Modo:** `OPERATOR=Jean SPRINT_ID=S02 MODE=execute`.
- **Rama de sprint:** `Jean/s02-marketplace-discovery-runtime-stabilization-2026-05-10`.
- **Base real:** `origin/integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07` @ `525602c`.
- **Worktree:** ejecucion en arbol limpio (`C:\proyectos\turpialsound-jean-s02-clean-2026-05-10`) por workspace original sucio (`?? var/`), sin borrar `var/`.

### Validacion canonica S02 (dispatcher)

- `task_id`: `S02_MARKETPLACE_DISCOVERY_RUNTIME_STABILIZATION` (manual_preview) presente en `docs/07_handoffs/qa-dispatcher.json`.
- `vercel whoami`: `jcarlosleon81-1948`.
- `.vercel/project.json` verificado tras `vercel link --project turpialsound --scope bkgs-projects-829c67c1`.
- Preview usado (valido BKG): `https://turpialsound-nukiu73zg-bkgs-projects-829c67c1.vercel.app`.
- Preview rechazado para cierre: cualquier URL `cerberus77s-projects`.
- Diagnostico: `npx tsx scripts/diagnostics/preview-runtime-guard.ts --smoke-http --base-url <preview_bkg_url>`.
  - Conclusion del guard: `QUERY_ERROR` por `DATABASE_URL missing` en entorno local de diagnostico.
  - Smoke HTTP del guard: `/marketplace`, `/reservas`, `/api/bcv-rate`, `/admin/login`, `/ops/payment-review` en `200`.
- Smoke adicional de rutas requeridas:
  - `/` `200`
  - `/marketplace` `200`
  - `/reservas` `200`
  - `/api/bcv-rate` `200`
  - `/admin/login` `200`
  - `/ops/payment-review` `200`
  - `/payment-proofs/view` `400` (error controlado, no `500`)

### Clasificacion S02

- **Estado clasificado:** `QUERY_ERROR`.
- **Lectura operativa:** discovery responde en Preview BKG sin ruptura HTTP, pero el diagnostico canonicamente arroja `QUERY_ERROR` por falta de `DATABASE_URL` local para metadatos DB.
- **Stop condition:** no se activo (`sin booking`, `sin schema`, `sin env change`, `sin produccion`, `sin main`).

### Resultado del sprint

- S02 ejecutado con evidencia canonicamente trazable en Preview BKG.
- Cambio de esta ventana: documental/handoff (sin cambios runtime de producto).
- Proximo sprint sugerido: `S03` (Auth/Login QA Closure) con Manuel.

## Actualizacion urgente - Marketplace login QA/produccion - 2026-05-09

- Objetivo cerrado: reparar login marketplace sin tocar tasas, booking, `/reservas`, DB, schema, migrations ni envs.
- Commit productivo de login: `4f15e51` (`fix(marketplace): repair marketplace user login`).
- Rama con fix runtime: `Manuel/s04b-marketplace-auth-login-fix-2026-05-09` / `deploy/s04b-auth-login-prod-2026-05-09`.
- Rama actual de documentacion/QA scripts: `Manuel/s04d-qa-env-login-fix-2026-05-09`.
- Commit de documentacion/QA scripts: `8d43d53` (`fix(qa): load marketplace credentials from env`).
- Usuario QA correcto: `sellerIA`. `sellerID` no es el usuario QA acordado y debe fallar si no existe.
- Password QA: no documentar en texto plano; se lee desde `QA_SELLER_PASSWORD` en env local/entorno autorizado.
- Validacion preview `https://turpialsound-j5062s7m3-cerberus77s-projects.vercel.app`: `buyerIA` y `sellerIA` login OK via smoke `node scripts/qa-marketplace-login-smoke.mjs`.
- BCV/tasas no forman parte de este hotfix. Produccion ya resuelve BCV fresco; no tocar `lib/bookings/reference-rate.ts` en este frente.
- Para produccion sin cambios colaterales, desplegar/mergear solo el commit runtime `4f15e51`; no usar cambios de tasas ni refactors.

## Diagnostico login sellerIA - 2026-05-09

- Problema de codigo previo: `loginMpUser` usaba busqueda ambigua por `email OR displayName`, sin orden deterministico ni fallback case-insensitive.
- Problema de sesion UI previo: `MarketplaceAuthModal` reconstruia la sesion de login con `isSeller: false`, falseando capacidades del usuario devuelto por DB.
- Fix aplicado en `4f15e51`:
  - `identifier.trim()` y password exacto sin trim.
  - prioridad deterministica: email exacto, email case-insensitive, displayName exacto, displayName case-insensitive.
  - errores genericos para evitar enumeracion.
  - sesion devuelta desde DB con `userId`, `email`, `displayName`, `isSeller` y `role`.
  - modal usa `result.data` sin hardcodear `isSeller`.
- QA scripts actualizados en `8d43d53` para leer credenciales desde `QA_*` y no hardcodear claves.

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
