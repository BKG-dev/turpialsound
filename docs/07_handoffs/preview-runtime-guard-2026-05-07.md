# Preview Runtime Guard (J2)

Fecha: 2026-05-07  
Owner: C2-JEAN-RUNTIME  
Scope: `scripts/diagnostics/**`

## Objetivo

Detectar de forma segura si un Preview esta apuntando a la DB correcta antes de culpar UI/filtros o tocar marketplace.

## Script canonico de esta sesion

- `npx tsx scripts/diagnostics/preview-runtime-guard.ts`

## Seguridad

Este script **no**:

- modifica datos,
- modifica schema,
- ejecuta migraciones,
- cambia variables de entorno,
- imprime secretos (`user/password/token/querystring completa`).

El fingerprint expone solo hints seguros.

## Requisitos

- `DATABASE_URL` disponible en entorno (solo para lectura metadata).
- `DIRECT_URL` opcional (si falta, se reporta como missing).
- Node runtime con `tsx` (ya disponible en repo).

## Uso

1. Solo fingerprint + metadata DB:

```bash
npx tsx scripts/diagnostics/preview-runtime-guard.ts
```

2. Con smoke HTTP opcional:

```bash
npx tsx scripts/diagnostics/preview-runtime-guard.ts --smoke-http --base-url https://tu-preview.vercel.app
```

Tambien funciona:

```bash
npx tsx scripts/diagnostics/preview-runtime-guard.ts --base-url https://tu-preview.vercel.app
```

## Que valida

1. Fingerprint seguro de `DATABASE_URL`:
- `hostHint`
- `databaseHint`
- `pooler`
- `sslmodePresent`

2. Fingerprint seguro de `DIRECT_URL`:
- `hostHint`
- `databaseHint`
- `pooler`
- `sslmodePresent`

3. Comparacion segura:
- `sameProjectOrDatabaseLikely`: `yes | no | inconclusive`
- `databaseUrlLooksPooled`: `yes | no`
- `directUrlLooksDirectNoPooler`: `yes | no`

4. Metadata DB:
- conteo `mp_*`
- existencia de:
  - `public.mp_listings`
  - `public.mp_users`
  - `public.booking_requests`
  - `public.payment_proofs`
  - `public.services`
  - `public.resources`
- conteo de `ACTIVE` en `public.mp_listings` (si la tabla existe)

5. Smoke HTTP opcional:
- `/marketplace`
- `/reservas`
- `/api/bcv-rate`
- `/admin/login`
- `/ops/payment-review`

## Criterio de salida

El script entrega bloque `Conclusion` con:

- `level`: `PASS | WARN | FAIL`
- `code`:
  - `OK`
  - `ZERO_ACTIVE`
  - `QUERY_ERROR`
  - `HTTP_ERROR`
  - `PROBABLE_DB_TARGET_MISMATCH`
- `notes`: explicacion operativa

Reglas implementadas:

- Si falta metadata por error de query: `FAIL + QUERY_ERROR`.
- Si faltan `mp_*` criticas (`mp_listings/mp_users`) o conteo `mp_*` = 0: `FAIL + PROBABLE_DB_TARGET_MISMATCH`.
- Si `mp_*` existe pero `ACTIVE=0`: `WARN + ZERO_ACTIVE`.
- Si smoke HTTP falla: `WARN + HTTP_ERROR` con ruta/status.

## Relacion con incidente 2026-05-07

Este guard apunta al principio:

`Codigo correcto + DB incorrecta = UI vacia`

y ayuda a identificar rapido mismatch de target DB en Preview (caso P2021 / `public.mp_listings` inexistente).

## Nota operativa

Mantener este script como preflight de runtime antes de abrir hipotesis de UI/filtros en marketplace.
