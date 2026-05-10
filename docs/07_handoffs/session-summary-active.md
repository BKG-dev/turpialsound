# Session Summary - Activa

## S03A - QA Accounts Normalization - 2026-05-10

- **Operador:** Manuel
- **Modo:** `execute`
- **Rama activa:** `Manuel/s03a-qa-accounts-normalization-2026-05-10`
- **Base operativa preferida usada:** `origin/Manuel/s03-auth-login-qa-closure-2026-05-10`
- **Base ultima de referencia:** `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07` @ `525602c`
- **Fuente de runner usada:** `origin/Manuel/docs-control-bus-s02-unblock-2026-05-10`
- **Lock explicito aplicado:** mutacion QA marketplace en Preview BKG limitada a `mpUser` buyer/seller QA, payout method seller QA y listing persistente QA si el script canonico lo requiere

## Resultado real

- **Estado:** BLOQUEADO EN NORMALIZACION QA / AUTH DATA + SMOKE LOCAL SIN CDP UTIL
- **Proyecto BKG confirmado:** `bkgs-projects-829c67c1/turpialsound`
- **Identidad Vercel confirmada:** `jcarlosleon81-1948`
- **`.vercel/project.json`:** recreado localmente solo para habilitar `vercel env pull` en el worktree limpio
- **Preview BKG valido confirmado:** `https://turpialsound-qc6k39eh1-bkgs-projects-829c67c1.vercel.app`
- **Alias valido de rama S01:** `https://turpialsound-git-manuel-s01-previ-f46263-bkgs-projects-829c67c1.vercel.app`
- **Env names confirmados sin imprimir valores:** `DATABASE_URL`, `DIRECT_URL`, `QA_BUYER_EMAIL`, `QA_BUYER_IDENTIFIER`, `QA_BUYER_PASSWORD`, `QA_SELLER_EMAIL`, `QA_SELLER_IDENTIFIER`, `QA_SELLER_PASSWORD`
- **`task_id=qa_accounts_normalization`:** ruta exacta confirmada en dispatcher y ejecutada
- **Resultado de normalizacion canonica:** falla por conflicto real de `displayName` en Preview BKG para `sellerIA` asociado a otro correo ya existente
- **`task_id=marketplace_login_smoke`:** ruta exacta confirmada en dispatcher y reintentada contra Preview BKG Ready
- **Resultado del smoke local:** el harness aborta antes de buyer/seller porque Chrome local no expone puerto CDP util bajo los flags canonicos; `APP_URL` del preview responde `200`

## Diagnostico raiz

- El dispatcher SI contiene `task_id=qa_accounts_normalization` con script canonico `npx tsx scripts/setup-marketplace-qa-accounts.ts` y `task_id=marketplace_login_smoke` con script canonico `node scripts/qa-marketplace-login-smoke.mjs`.
- En esta ventana las ocho variables requeridas estuvieron presentes via `vercel env pull` de Preview BKG al worktree local, sin imprimir valores.
- El bloqueo rojo real de Preview BKG no fue falta de variables: fue drift de auth data en DB, especificamente conflicto de `displayName` para `sellerIA` contra otro correo ya existente. Eso impide que el upsert canonico normalice seller QA sin saneamiento previo del dato conflictivo.
- El smoke de login no aporta señal buyer/seller en esta maquina porque el harness canonico depende de Chrome con CDP local y, bajo los flags actuales del script, el puerto de depuracion no queda accesible. Eso deja el smoke bloqueado por precondicion local/harness, no por indisponibilidad del preview.

## Bloqueo rojo

- Se activa bloqueo real de S03A: **Preview BKG conserva una colision de auth data QA en `mpUser` para `sellerIA`, y la ruta canonica de smoke local no puede completarse en esta maquina por CDP de Chrome no utilizable**.
- El frente queda en estos estados no cerrables desde aqui:
  - drift real de cuenta QA en DB Preview BKG,
  - normalizacion canonica abortada antes de completar seller/payout/listing,
  - login smoke canonico sin buyer/seller ejecutados por bloqueo local de browser harness.
- No se tocaron produccion, `main`, booking, schema, migrations ni envs remotas desde Codex.

## Proxima accion

- Jean debe sanear en Preview BKG el conflicto real de `displayName` sobre `sellerIA` o habilitar una ventana autorizada donde el script canonico pueda completar el upsert sin colision.
- En paralelo, Manuel debe reintentar `task_id=marketplace_login_smoke` solo desde una maquina/worktree donde Chrome exponga CDP util con el harness canonico.
- Hasta que ambas condiciones se resuelvan, S03 no puede cerrarse/reintentarse como OK y S01 tampoco puede cerrarse/reintentarse como OK.

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
