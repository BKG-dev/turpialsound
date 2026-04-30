# Matriz QA: Env & Ops Readiness

## Objetivo

Validar que `scripts/checks/env-readiness-check.mjs` reporta el estado del entorno sin imprimir secretos, sin conectar a DB, sin enviar emails y sin llamar APIs externas.

## Alcance

- Script read-only que lee solo `process.env`.
- Validacion de flags reales del script.
- Validacion de presencia/ausencia de variables inventariadas.
- No valida credenciales reales ni servicios externos.

## Flags reales

- `--help`: muestra uso, opciones y modelo de seguridad.
- `--strict`: devuelve error si falta cualquier variable critica en cualquier entorno.
- `--json`: imprime el reporte en JSON sin valores secretos.

## Casos de prueba

### 1. Ayuda

- **Comando**: `node scripts/checks/env-readiness-check.mjs --help`
- **Esperado**: muestra `--help`, `--strict` y `--json`; no muestra secretos.

### 2. Ejecucion local sin envs cargadas

- **Comando**: `node scripts/checks/env-readiness-check.mjs`
- **Esperado**: devuelve `warning`, exit code `0`, lista variables faltantes por nombre y no imprime valores.

### 3. Modo strict

- **Comando**: `node scripts/checks/env-readiness-check.mjs --strict`
- **Esperado**: devuelve error si faltan variables criticas, incluso fuera de produccion.

### 4. Modo JSON

- **Comando**: `node scripts/checks/env-readiness-check.mjs --json`
- **Esperado**: imprime JSON estructurado sin valores de variables de entorno.

### 5. Produccion o Vercel Production

- **Condicion**: `NODE_ENV=production` o `VERCEL_ENV=production`.
- **Comando**: `node scripts/checks/env-readiness-check.mjs`
- **Esperado**: devuelve `blocked` y exit code `1` si falta cualquier variable critica.

## Env vars inventariadas

- `database`: `DATABASE_URL`, `DIRECT_URL`.
- `pagos manuales`: `BOOKINGS_PAYMENT_MOBILE_ID_TYPE`, `BOOKINGS_PAYMENT_MOBILE_ID_NUMBER`, `BOOKINGS_PAYMENT_MOBILE_BANK`, `BOOKINGS_PAYMENT_MOBILE_PHONE`, `BOOKINGS_BANK_TRANSFER_BANK`, `BOOKINGS_BANK_TRANSFER_ACCOUNT_NUMBER`, `BOOKINGS_BANK_TRANSFER_BENEFICIARY`, `BOOKINGS_BINANCE_PAY_ID`, `BOOKINGS_BINANCE_PHONE`.
- `email Resend`: `RESEND_API_KEY`, `BOOKINGS_EMAIL_FROM`, `BOOKINGS_EMAIL_REPLY_TO`, `BOOKINGS_ADMIN_NOTIFICATIONS_EMAIL`.
- `Google Calendar`: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GOOGLE_CALENDAR_ID`, `GOOGLE_CALENDAR_TIMEZONE`.
- `Blob/proofs`: `BLOB_READ_WRITE_TOKEN`.
- `BCV/rates`: `RATE_SOURCE_A_NAME`, `RATE_SOURCE_A_URL`, `RATE_SOURCE_B_NAME`, `RATE_SOURCE_B_URL`, `RATE_SOURCE_B_PATH`, `RATE_SOURCE_C_NAME`, `RATE_SOURCE_C_URL`, `RATE_SOURCE_C_FORMAT`, `RATE_SOURCE_C_PATH`, `RATE_DELTA_PCT`, `RATE_MAX_JUMP_PCT`, `RATE_LAST_GOOD_MIN_PERSIST_SECONDS`, `BCV_EMERGENCY_FALLBACK_RATE`, `BCV_FALLBACK_RATE`, `ADMIN_API_TOKEN`.
- `cron expiracion`: `BOOKINGS_EXPIRE_CRON_SECRET`.
- `booking core` y `WhatsApp`: sin variables dedicadas detectadas en el alcance inspeccionado.

## Fuera de inventario

- No documentar `--mode=[dev|preview|prod]`; ese flag no existe.
- No documentar `BOOKINGS_APP_BASE_URL`; el script no valida esa variable.
