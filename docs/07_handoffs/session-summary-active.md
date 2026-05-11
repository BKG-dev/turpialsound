# Session Summary - Activa

## S03D - Login Smoke Harness Validation - 2026-05-10

- **Operador:** Manuel
- **Modo:** `execute`
- **Rama activa:** `Manuel/s03d-login-smoke-harness-validation-2026-05-10`
- **Base operativa preferida usada:** `origin/Manuel/s03c-qa-seller-duplicate-reconcile-2026-05-10`
- **Fuente de runner usada:** `origin/Manuel/docs-control-bus-s02-unblock-2026-05-10`
- **Lock operativo heredado:** sin produccion, sin `main`, sin DB mutation, sin schema, sin migrations, sin S04 execute

## Resultado real

- **Estado:** HARNESS REFORZADO, PERO BUYER/SELLER SIGUEN SIN VALIDACION VERDE POR BLOQUEO LOCAL DE CDP/WEBSOCKET EN WINDOWS
- **Preview BKG confirmado:** `https://turpialsound-qc6k39eh1-bkgs-projects-829c67c1.vercel.app`
- **APP_URL:** `200`
- **Env presence confirmada sin valores:** `DATABASE_URL`, `DIRECT_URL`, `QA_BUYER_EMAIL`, `QA_BUYER_IDENTIFIER`, `QA_BUYER_PASSWORD`, `QA_SELLER_EMAIL`, `QA_SELLER_IDENTIFIER`, `QA_SELLER_PASSWORD`
- **`task_id=marketplace_login_smoke`:** ruta exacta confirmada en dispatcher y reintentada multiples veces
- **Causa exacta del `CDP_HARNESS_BLOCKED`:**
  - `node fetch` contra CDP local falla en esta maquina aunque el preview responde `200`
  - Chrome local anuncia DevTools pero cae por fatal de GPU process
  - Edge local puede exponer CDP con `--in-process-gpu` en prueba aislada, pero el harness canonico sigue quedando colgado antes de producir resultado buyer/seller; el bloqueo restante ya es de handshake/sesion websocket local, no de credenciales ni de DB
- **Buyer login result:** sin validar
- **Seller login result:** sin validar

## Cambio real aplicado al harness

- deteccion de browser por `QA_BROWSER_PATH` o `CHROME_PATH`
- fallback entre rutas comunes de Chrome y Edge en Windows
- prioridad de Edge antes de Chrome si no hay override explicito
- `--remote-debugging-address=127.0.0.1`
- reemplazo de `fetch` por `http.get` para el descubrimiento CDP local
- `Start-Process` en Windows para el arranque del browser
- `--in-process-gpu` para evitar el fatal inmediato del GPU subprocess en Edge
- timeouts explicitos para comandos CDP y apertura de websocket
- mensajes de error mas utiles sin secretos

## Diagnostico operativo

- El bloqueo de datos QA seller de S03C ya no existe.
- No hay evidencia nueva de `ENV_VALUE_WRONG`, `DB_USER_MISSING`, `DB_PASSWORD_MISMATCH` ni `LOGIN_CODE_BUG`.
- El estado restante sigue siendo de harness local. La clasificacion practica continua siendo `UNKNOWN` dentro del smoke, pero el frente tecnico ya esta acotado a CDP/websocket local en esta maquina.

## Validaciones

- `git diff --check` OK
- `npx tsc --noEmit` OK
- `npm run build` OK

## Proxima accion

- S03 no queda cerrado ni desbloqueado del todo porque buyer/seller login no llego a verde.
- S01 no puede cerrarse todavia.
- S04 **no** puede pasar a `execute`; como maximo puede seguir en `align/prep`.
