# Prompt Operativo - S01 Manuel - Preview Smoke Autonomy

## Contexto

Trabaja solo sobre documentacion, preview y validacion. No implementes codigo producto. No toques runtime, schema, env values, secretos, booking ni produccion.

- **Base branch:** `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07`
- **Rama de trabajo:** `Manuel/s01-preview-smoke-autonomy-2026-05-10`
- **Proyecto Vercel esperado:** BKG `turpialsound`

## Objetivo

Demostrar que Manuel puede validar un Preview real de marketplace desde `Manuel/*` sin depender de produccion.

## Reglas duras

- Preview only. Produccion prohibida.
- No tocar `app/`, `components/`, `actions/`, `lib/`, `prisma/`, `.env`, Vercel env values ni secretos.
- Antes de cualquier QA, resolver primero el `task_id` exacto en `docs/07_handoffs/qa-dispatcher.json`.
- Si una validacion requerida no tiene ruta canonica exacta, detenerse y reportar `GAP OPERATIVO`.

## Tareas

1. Crear la rama `Manuel/s01-preview-smoke-autonomy-2026-05-10` desde la madre operativa.
2. Confirmar que el Preview desplegado pertenece al proyecto BKG `turpialsound`.
3. Validar solo presencia de nombres de env en Preview. No imprimir valores.
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `MP_JWT_SECRET`
   - `TS_WEB_BLOB_READ_WRITE_TOKEN`
   - `TS_MARKETPLACE_SENSITIVE_BLOB_READ_WRITE_TOKEN`
   - `QA_BUYER_IDENTIFIER`
   - `QA_BUYER_PASSWORD`
   - `QA_SELLER_IDENTIFIER`
   - `QA_SELLER_PASSWORD`
4. Hacer deploy Preview only desde la rama.
5. Correr `preview-runtime-guard.ts` contra el Preview para confirmar runtime y DB target.
6. Hacer smoke pasivo de rutas:
   - `/`
   - `/marketplace`
   - `/reservas`
   - `/api/bcv-rate`
   - `/admin/login`
   - `/ops/payment-review`
   - `/payment-proofs/view`
7. Para login smoke:
   - resolver `task_id=marketplace_login_smoke`
   - ejecutar solo si las credenciales QA estan disponibles por env
   - no hardcodear credenciales
8. Actualizar docs con resultado real:
   - `docs/07_handoffs/session-summary-active.md`
   - `docs/07_handoffs/next-window-brief.md`
   - cualquier nota adicional si hace falta evidencia operativa
9. Si solo cambian docs, commit/push de docs. Si no hay cambios documentales, reportar resultado sin forzar commit.

## Criterio de cierre

- Preview accesible y atribuible a la rama `Manuel/*`
- Nombres de env criticos confirmados
- Runtime guard sin evidencia de DB target incorrecta
- `/marketplace` y `/reservas` responden sin regresion evidente
- Login smoke ejecutado o marcado como pendiente real por falta de env QA
- Cierre documentado sin tocar producto ni produccion

## Stop conditions

- Preview no despliega o no responde
- Falta cualquiera de los env names criticos
- `/reservas` presenta regresion
- El dispatcher no tiene ruta canonica exacta para la validacion requerida
- El trabajo requiere tocar env values, schema, DB manual, booking o produccion
