# Next Window Brief - Turpial Sound

**Fecha de actualizacion:** 2026-05-10
**Frente activo:** S03A - QA Accounts Normalization
**Tipo de nota:** Control Tower / bloqueo real en auth data Preview BKG y smoke local sin CDP util

## Estado actual de S03A

- **Rama de trabajo:** `Manuel/s03a-qa-accounts-normalization-2026-05-10`
- **Base inmediata:** `origin/Manuel/s03-auth-login-qa-closure-2026-05-10`
- **Base operativa ultima:** `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07` @ `525602c`
- **Runner fuente:** `origin/Manuel/docs-control-bus-s02-unblock-2026-05-10`
- **Preview BKG valido heredado de S01:** `https://turpialsound-qc6k39eh1-bkgs-projects-829c67c1.vercel.app`
- **Lock explicito vigente:** mutacion permitida solo sobre cuentas QA marketplace en Preview BKG; no produccion, no main, no booking, no schema, no migrations, no env changes remotas
- **Env names confirmados sin valores:** `DATABASE_URL`, `DIRECT_URL`, `QA_BUYER_EMAIL`, `QA_BUYER_IDENTIFIER`, `QA_BUYER_PASSWORD`, `QA_SELLER_EMAIL`, `QA_SELLER_IDENTIFIER`, `QA_SELLER_PASSWORD`
- **`task_id=qa_accounts_normalization`:** ejecutado por ruta exacta del dispatcher; falla por conflicto real de `displayName` para `sellerIA` contra otro correo ya presente en Preview BKG
- **`task_id=marketplace_login_smoke`:** reintentado por ruta exacta del dispatcher; el harness aborta antes de buyer/seller porque Chrome local no abre CDP util bajo los flags canonicos
- **Chequeo de preview:** `APP_URL` responde `200`, asi que el bloqueo del smoke no apunta a caida del deployment

## Bloqueo rojo

- S03A queda bloqueado por dos causas reales simultaneas:
  - colision de auth data QA en Preview BKG para `sellerIA`,
  - precondicion local del smoke canonico no satisfecha porque Chrome no expone CDP util en esta maquina.
- No se uso fallback fuera del dispatcher.
- Cerberus no participa en el cierre de este frente.

## Siguiente ventana recomendada

1. Jean debe resolver el conflicto real de `sellerIA` en Preview BKG o habilitar una ventana autorizada donde el script canonico pueda normalizar sin colision.
2. Manuel debe reintentar `task_id=marketplace_login_smoke` desde una maquina/worktree con Chrome y CDP util para el harness canonico.
3. Solo si buyer y seller pasan despues de eso, S03 puede reintentarse/cerrarse y S01 puede reintentarse/cerrarse.
4. Jean debe permanecer en `S04 align` y no pasar a `S04 execute` mientras S03 siga abierto.

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
