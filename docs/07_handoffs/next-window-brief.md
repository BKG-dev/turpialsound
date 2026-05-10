# Next Window Brief - Turpial Sound

**Fecha de actualizacion:** 2026-05-10
**Frente activo:** S03B - QA Login Normalization Fix
**Tipo de nota:** Control Tower / fix de reconciliacion aplicado, bloqueo real restante en duplicado QA seller y smoke local sin CDP util

## Estado actual de S03B

- **Rama de trabajo:** `Manuel/s03b-qa-login-normalization-fix-2026-05-10`
- **Base inmediata:** `origin/Manuel/s03a-qa-accounts-normalization-2026-05-10`
- **Runner fuente:** `origin/Manuel/docs-control-bus-s02-unblock-2026-05-10`
- **Preview BKG valido:** `https://turpialsound-qc6k39eh1-bkgs-projects-829c67c1.vercel.app`
- **Lock explicito vigente:** mutacion permitida solo sobre cuentas QA marketplace en Preview BKG; no produccion, no main, no booking, no schema, no migrations, no env changes remotas
- **Env names confirmados sin valores:** `DATABASE_URL`, `DIRECT_URL`, `QA_BUYER_EMAIL`, `QA_BUYER_IDENTIFIER`, `QA_BUYER_PASSWORD`, `QA_SELLER_EMAIL`, `QA_SELLER_IDENTIFIER`, `QA_SELLER_PASSWORD`
- **Fix de script aplicado:** `scripts/setup-marketplace-qa-accounts.ts` ahora reconcilia por `email` exacto o `displayName` exacto y corta con `DUPLICATE_QA_CONFLICT` ante duplicados QA ambiguos
- **Resultado de `task_id=qa_accounts_normalization`:** sigue bloqueado por duplicado QA real en seller
- **Resultado de `task_id=marketplace_login_smoke`:** sigue bloqueado localmente por `CDP_HARNESS_BLOCKED`
- **Validaciones:** `git diff --check` OK, `npx tsc --noEmit` OK, `npm run build` OK

## Bloqueo rojo

- El conflicto sellerIA `displayName` no se resolvio por magia: el script ahora lo clasifica bien como un duplicado QA real en Preview BKG.
- No existe otra ruta canonica de login en el dispatcher fuera de `node scripts/qa-marketplace-login-smoke.mjs`.
- Mientras el harness no pueda abrir CDP y el duplicado seller no se sanee, buyer/seller login siguen sin cierre operativo.

## Siguiente ventana recomendada

1. Jean debe sanear el duplicado QA real de seller en Preview BKG para dejar un solo registro QA canonico.
2. Manuel debe reintentar `task_id=marketplace_login_smoke` desde una maquina/worktree con Chrome y CDP util.
3. Solo si buyer y seller pasan despues de eso, S03 puede reintentarse/cerrarse y S01 puede reintentarse/cerrarse.
4. Jean debe permanecer fuera de S04 execute mientras S03 siga abierto.
