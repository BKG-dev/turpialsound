# QA Credentials Team Setup (Secure)

Objetivo: usar un set comun de credenciales QA para buyer/seller/admin sin exponer secretos en codigo ni en git.

## 1) Que debe hacer cada desarrollador

1. Si ya tienes `.env.local`, NO lo sobrescribas.
2. Agrega solo el bloque QA al final del `.env.local` existente.
3. Si no tienes `.env.local`, crea uno nuevo solo para tu entorno local.
4. Los valores reales de passwords QA se comparten unicamente por canal seguro.
5. No pegar passwords en PRs, issues, docs ni chat.
6. Verificar que `.env.local` este ignorado por git:
   - `git check-ignore .env.local`
7. Ejecutar QA normalmente; los scripts ya leen `QA_*` desde `env`.

Motivo de seguridad:
- `.env.local` puede contener tokens reales de DB, Blob, APIs y otros secretos operativos.
- Reemplazar el archivo completo puede romper funcionalidad local o exponer secretos por error.
- Solo se debe anexar/actualizar el bloque QA.

## 2) Variables requeridas por scripts QA

- `QA_BUYER_IDENTIFIER`
- `QA_BUYER_EMAIL`
- `QA_BUYER_PASSWORD`
- `QA_SELLER_IDENTIFIER`
- `QA_SELLER_EMAIL`
- `QA_SELLER_PASSWORD`
- `QA_ADMIN_IDENTIFIER`
- `QA_ADMIN_PASSWORD`

Variables opcionales:

- `APP_URL` (default local del script cuando aplique)
- `DEBUG_PORT`
- `REUSE_BROWSER`

## 3) Scripts que ya dependen de `QA_*`

- `scripts/setup-marketplace-qa-accounts.ts`
- `scripts/qa-marketplace-qa-accounts.mjs`
- `scripts/qa-marketplace-seller-smoke.mjs`

Si falta una variable requerida, el script falla de forma explicita por seguridad.

## 4) Rotacion sin romper desarrollo

1. Cambiar password QA por canal seguro.
2. Cada dev actualiza solo su `.env.local`.
3. No se requiere cambio de codigo ni de DB para distribuir el nuevo secreto.
