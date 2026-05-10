# Next Window Brief - Turpial Sound

**Fecha de actualizacion:** 2026-05-10
**Frente activo:** S03C - QA Seller Duplicate Reconcile
**Tipo de nota:** Control Tower / duplicado QA seller reconciliado, bloqueo restante solo en smoke local sin CDP util

## Estado actual de S03C

- **Rama de trabajo:** `Manuel/s03c-qa-seller-duplicate-reconcile-2026-05-10`
- **Base inmediata:** `origin/Manuel/s03b-qa-login-normalization-fix-2026-05-10`
- **Runner fuente:** `origin/Manuel/docs-control-bus-s02-unblock-2026-05-10`
- **Preview BKG valido:** `https://turpialsound-qc6k39eh1-bkgs-projects-829c67c1.vercel.app`
- **Lock explicito vigente:** mutacion permitida solo sobre cuentas QA marketplace en Preview BKG; no produccion, no main, no booking, no schema, no migrations, no env changes remotas
- **Env names confirmados sin valores:** `DATABASE_URL`, `DIRECT_URL`, `QA_BUYER_EMAIL`, `QA_BUYER_IDENTIFIER`, `QA_BUYER_PASSWORD`, `QA_SELLER_EMAIL`, `QA_SELLER_IDENTIFIER`, `QA_SELLER_PASSWORD`
- **Resultado de `task_id=qa_accounts_normalization`:** OK
- **Resultado read-only posterior:** seller QA quedo unico de nuevo para `email` y `displayName` canonicos
- **Resultado de `task_id=marketplace_login_smoke`:** sigue bloqueado localmente por `CDP_HARNESS_BLOCKED`
- **Validaciones:** `git diff --check` OK, `npx tsc --noEmit` OK, `npm run build` OK

## Bloqueo rojo

- El bloqueo rojo de datos QA seller ya no existe.
- El unico bloqueo vigente es la imposibilidad local de completar el smoke canonico de login en esta maquina.
- No existe otra ruta canonica de login en el dispatcher.

## Siguiente ventana recomendada

1. Manuel debe reintentar `task_id=marketplace_login_smoke` desde una maquina/worktree con Chrome y CDP util.
2. Si buyer y seller pasan, S03 puede cerrarse y S01 puede reintentarse/cerrarse.
3. Jean no debe pasar `S04 execute`; solo puede seguir `S04 align/prep` hasta que el smoke canonico quede verde.
