# Session Summary - Activa

## S03C - QA Seller Duplicate Reconcile - 2026-05-10

- **Operador:** Manuel
- **Modo:** `execute`
- **Rama activa:** `Manuel/s03c-qa-seller-duplicate-reconcile-2026-05-10`
- **Base operativa preferida usada:** `origin/Manuel/s03b-qa-login-normalization-fix-2026-05-10`
- **Base ultima de referencia:** `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07` @ `525602c`
- **Fuente de runner usada:** `origin/Manuel/docs-control-bus-s02-unblock-2026-05-10`
- **Lock explicito aplicado:** mutacion QA marketplace en Preview BKG limitada a `mpUser` buyer/seller QA, payout method seller QA y listing persistente QA si el script canonico lo requiere

## Resultado real

- **Estado:** DUPLICADO QA SELLER RECONCILIADO EN PREVIEW BKG; BLOQUEO RESTANTE SOLO EN `CDP_HARNESS_BLOCKED`
- **Proyecto BKG confirmado:** `bkgs-projects-829c67c1/turpialsound`
- **Preview BKG valido confirmado:** `https://turpialsound-qc6k39eh1-bkgs-projects-829c67c1.vercel.app`
- **Env names confirmados sin imprimir valores:** `DATABASE_URL`, `DIRECT_URL`, `QA_BUYER_EMAIL`, `QA_BUYER_IDENTIFIER`, `QA_BUYER_PASSWORD`, `QA_SELLER_EMAIL`, `QA_SELLER_IDENTIFIER`, `QA_SELLER_PASSWORD`
- **`task_id=qa_accounts_normalization`:** ruta exacta confirmada en dispatcher y ejecutada con exito
- **Cambio real aplicado al script:** si existe un usuario QA canonico por `email` y aparece otro usuario extra solo con el `displayName` QA, ese duplicado se aparta del namespace QA con un `displayName` legacy deterministico, sin borrar cuentas ni fusionar registros
- **Resultado de normalizacion canonica:** `ok: true`; buyer reconciliado, seller reconciliado, payout QA seller asegurado, listing QA persistente asegurado
- **Verificacion read-only posterior:** seller QA quedo unico otra vez por `email` exacto + `displayName` exacto; `candidateCount=1`
- **`task_id=marketplace_login_smoke`:** ruta exacta confirmada en dispatcher y reintentada contra Preview BKG Ready
- **Resultado del smoke local:** `CDP_HARNESS_BLOCKED`; el harness aborta antes de buyer/seller por `fetch failed` en esta maquina, aunque `APP_URL` responde `200`
- **Buyer login result:** sin validar por bloqueo de harness
- **Seller login result:** sin validar por bloqueo de harness
- **Validaciones de rama S03C:** `git diff --check` OK, `npx tsc --noEmit` OK, `npm run build` OK

## Diagnostico raiz

- El duplicado seller de S03B ya no bloquea la normalizacion canonica. El problema de datos QA en Preview BKG quedo corregido en S03C.
- La unica ruta canonica de login en el dispatcher sigue siendo `node scripts/qa-marketplace-login-smoke.mjs`.
- El estado pendiente ya no es drift de cuentas QA; es solamente incapacidad local del harness para abrir Chrome/CDP en esta maquina.

## Bloqueo rojo

- No queda bloqueo rojo de datos QA seller en Preview BKG.
- Sigue bloqueada la verificacion UI buyer/seller en esta maquina por `CDP_HARNESS_BLOCKED`.
- No se tocaron produccion, `main`, booking, schema, migrations ni envs remotas desde Codex.

## Proxima accion

- Manuel debe reintentar `task_id=marketplace_login_smoke` desde una maquina/worktree donde Chrome exponga CDP util con el harness canonico.
- Si buyer y seller pasan alli, S03 puede cerrarse y S01 puede reintentarse/cerrarse.
- Jean **NO** debe pasar `S04 execute`; solo puede continuar en `S04 align/prep` hasta que el smoke canonico de login quede verde.
