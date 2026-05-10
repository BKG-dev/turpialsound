# Session Summary - Activa

## S03 - Auth/Login QA Closure - 2026-05-10

- **Operador:** Manuel
- **Modo:** `execute`
- **Rama activa:** `Manuel/s03-auth-login-qa-closure-2026-05-10`
- **Base operativa preferida usada:** `origin/Manuel/s01-preview-smoke-autonomy-2026-05-10`
- **Base ultima de referencia:** `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07` @ `525602c`
- **Fuente de runner usada:** `origin/Manuel/docs-control-bus-s02-unblock-2026-05-10`

## Resultado real

- **Estado:** BLOQUEADO EN NORMALIZACION QA / AUTH DATA
- **Proyecto BKG confirmado:** `bkgs-projects-829c67c1/turpialsound`
- **Identidad Vercel confirmada:** `jcarlosleon81-1948`
- **`.vercel/project.json`:** recreado localmente via `vercel link` y validado contra `turpialsound`
- **Preview BKG valido confirmado:** `https://turpialsound-qc6k39eh1-bkgs-projects-829c67c1.vercel.app`
- **Alias valido de rama S01:** `https://turpialsound-git-manuel-s01-previ-f46263-bkgs-projects-829c67c1.vercel.app`
- **Env names confirmados sin imprimir valores:** `QA_BUYER_IDENTIFIER`, `QA_BUYER_PASSWORD`, `QA_SELLER_IDENTIFIER`, `QA_SELLER_PASSWORD`, `DATABASE_URL`, `DIRECT_URL`
- **`task_id=marketplace_login_smoke`:** ruta exacta confirmada en dispatcher
- **Fallo reproducido en S01 y heredado a S03:** buyer devuelve `usuario o contrasena incorrectos`; seller no llega a ejecutarse porque el script corta en buyer

## Diagnostico raiz

- El dispatcher SI contiene `task_id=qa_accounts_normalization` con script canonico `npx tsx scripts/setup-marketplace-qa-accounts.ts`.
- Pero esa ruta NO aparece como validacion minima ni fallback documentado de S03; S03 solo cierra con `task_id=marketplace_login_smoke`.
- El script `qa_accounts_normalization` muta `mpUser`, `mpPayoutMethod` y `mpListing`, por lo que sale del frente "docs y ajustes menores de login" de S03 y entra en datos/auth operativos.
- En este worktree no existe `.env.local` ni `.env`.
- En Preview BKG existen `QA_BUYER_IDENTIFIER`, `QA_BUYER_PASSWORD`, `QA_SELLER_IDENTIFIER`, `QA_SELLER_PASSWORD`, pero NO existen `QA_BUYER_EMAIL` ni `QA_SELLER_EMAIL`, que el script canonico de normalizacion requiere para upsert de cuentas.
- Por lo tanto, aun ignorando el alcance, `qa_accounts_normalization` no es ejecutable aqui con las precondiciones disponibles sin introducir credenciales nuevas o tocar secretos.

## Bloqueo rojo

- Se activa bloqueo real de S03: **la ruta canonica alternativa de normalizacion QA no es ejecutable en este carril con las precondiciones actuales y toca auth/data fuera del scope operativo de S03**.
- Esto deja el frente en uno de estos estados todavia no cerrables desde aqui:
  - drift de credencial QA,
  - drift de cuenta QA en DB Preview,
  - colision de auth data que requiere saneamiento controlado.
- No se autorizo cambio de secretos ni lock doble explicito para mutar auth/DB desde este sprint.

## Proxima accion

- Si Jean + Manuel autorizan lock y existe fuente segura para `QA_BUYER_EMAIL` / `QA_SELLER_EMAIL`, ejecutar `task_id=qa_accounts_normalization` en un frente autorizado y luego reintentar `task_id=marketplace_login_smoke`.
- Si no hay lock o no existen esos email vars autorizados, S03 queda formalmente bloqueado y no debe forzarse con metodos alternos.
- S01 no puede cerrarse mientras `marketplace_login_smoke` siga fallando en buyer.

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
