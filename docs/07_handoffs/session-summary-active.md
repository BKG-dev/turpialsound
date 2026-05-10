# Session Summary - Activa

## S03B - QA Login Normalization Fix - 2026-05-10

- **Operador:** Manuel
- **Modo:** `execute`
- **Rama activa:** `Manuel/s03b-qa-login-normalization-fix-2026-05-10`
- **Base operativa preferida usada:** `origin/Manuel/s03a-qa-accounts-normalization-2026-05-10`
- **Base ultima de referencia:** `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07` @ `525602c`
- **Fuente de runner usada:** `origin/Manuel/docs-control-bus-s02-unblock-2026-05-10`
- **Lock explicito aplicado:** mutacion QA marketplace en Preview BKG limitada a `mpUser` buyer/seller QA, payout method seller QA y listing persistente QA si el script canonico lo requiere

## Resultado real

- **Estado:** FIX DE SCRIPT APLICADO; BLOQUEO ROJO REAL RESTANTE EN `DUPLICATE_QA_CONFLICT` SELLER + `CDP_HARNESS_BLOCKED`
- **Proyecto BKG confirmado:** `bkgs-projects-829c67c1/turpialsound`
- **Preview BKG valido confirmado:** `https://turpialsound-qc6k39eh1-bkgs-projects-829c67c1.vercel.app`
- **Alias valido de rama S01:** `https://turpialsound-git-manuel-s01-previ-f46263-bkgs-projects-829c67c1.vercel.app`
- **Env names confirmados sin imprimir valores:** `DATABASE_URL`, `DIRECT_URL`, `QA_BUYER_EMAIL`, `QA_BUYER_IDENTIFIER`, `QA_BUYER_PASSWORD`, `QA_SELLER_EMAIL`, `QA_SELLER_IDENTIFIER`, `QA_SELLER_PASSWORD`
- **`task_id=qa_accounts_normalization`:** ruta exacta confirmada en dispatcher, script reforzado y reejecutado
- **Cambio real aplicado al script:** reconciliacion idempotente por `email` exacto o `displayName` exacto, actualizacion a canon QA y corte seguro sin fusionar ni borrar cuando aparecen dos registros QA distintos
- **Resultado de normalizacion canonica:** `DUPLICATE_QA_CONFLICT` real en seller QA; quedaron dos ids distintos candidatos para `sellerIA`, reportados solo enmascarados en log local
- **`task_id=marketplace_login_smoke`:** unica ruta canonica de login en dispatcher; reintentada contra Preview BKG Ready
- **Resultado del smoke local:** `CDP_HARNESS_BLOCKED`; el harness aborta antes de buyer/seller porque Chrome local no expone CDP util con los flags canonicos, aunque `APP_URL` responde `200`
- **Buyer login result:** sin validar por bloqueo de harness
- **Seller login result:** sin validar por bloqueo de harness
- **Validaciones de rama S03B:** `git diff --check` OK, `npx tsc --noEmit` OK, `npm run build` OK

## Diagnostico raiz

- El bloqueo inicial de S03A ya no depende del script viejo: el nuevo reconciliador confirma que Preview BKG tiene drift real de auth data QA en seller.
- El fix aplicado evita un falso positivo por conflicto de `displayName` y deja una clasificacion util para soporte operativo: si email/displayName QA apuntan a dos ids distintos, el script corta con `DUPLICATE_QA_CONFLICT`.
- El dispatcher no expone una ruta canonica alternativa a `node scripts/qa-marketplace-login-smoke.mjs` para login UI. En esta maquina ese smoke queda bloqueado por CDP local, no por indisponibilidad del preview.

## Bloqueo rojo

- Preview BKG conserva un duplicado QA real para seller y el script canonico, correctamente, no fusiona ni borra.
- La verificacion UI de buyer/seller sigue bloqueada en esta maquina por `CDP_HARNESS_BLOCKED`.
- No se tocaron produccion, `main`, booking, schema, migrations ni envs remotas desde Codex.

## Proxima accion

- Jean debe sanear en Preview BKG el duplicado QA real de seller o habilitar una ventana autorizada donde ese dato quede reducido a un solo registro QA canonico.
- Manuel debe reintentar `task_id=marketplace_login_smoke` solo desde una maquina/worktree donde Chrome exponga CDP util con el harness canonico.
- Hasta que ambas condiciones se resuelvan, S03 no puede cerrarse/reintentarse como OK, S01 no puede cerrarse/reintentarse como OK y Jean no debe pasar S04 execute.
