# Prompt Operativo - S02 Jean - Discovery Runtime Stabilization

## Contexto

Trabaja desde la madre operativa actual. Toca solo discovery/listings runtime si el error se reproduce. No tocar booking, produccion, env values, schema ni DB manual sin lock.

- **Base branch:** `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07`
- **Rama recomendada:** `Jean/s02-marketplace-discovery-runtime-stabilization-2026-05-10`

## Objetivo

Investigar el error Prisma/query de marketplace discovery observado en el intento de deploy productivo y dejar el hallazgo en uno de estos estados:

1. reproducido y corregido con fix minimo, o
2. reproducido y bloqueado por schema/env/DB, o
3. no reproducible pero clasificado con evidencia suficiente

## Reglas duras

- No tocar booking `/reservas`.
- No tocar produccion.
- No tocar schema, migrations, env values o DB manual sin lock Jean + Manuel.
- Logs concisos, sin secretos.
- Si la investigacion no exige cambio de codigo, cerrar solo con docs y evidencia.

## Tareas

1. Partir de `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07`.
2. Crear la rama `Jean/s02-marketplace-discovery-runtime-stabilization-2026-05-10`.
3. Confirmar Preview objetivo y commit probado.
4. Recolectar logs concisos del fallo de discovery y clasificar:
   - `DB_MISSING`
   - `QUERY_ERROR`
   - `ZERO_ACTIVE`
   - `FILTERED_EMPTY`
5. Ejecutar `preview-runtime-guard.ts` como diagnostico seguro.
6. Si el error se reproduce y el fix es minimo, tocar solo runtime de marketplace discovery/listings.
7. No tocar auth global, booking, schema ni config de release.
8. Actualizar docs con el resultado:
   - `docs/07_handoffs/session-summary-active.md`
   - `docs/07_handoffs/next-window-brief.md`
   - `docs/obsidian-vault/ROADMAP_RESCATE.md` si cambia el estado del riesgo
9. Commit/push de la rama si hubo cambio de docs o fix minimo validado.

## Criterio de cierre

- Discovery queda estable en Preview, o
- el error queda clasificado con evidencia operativa y stop condition real
- diff acotado al sprint
- sin booking, sin produccion, sin schema/env

## Stop conditions

- El fix requiere schema o migration
- El fix requiere cambio de env o DB manual
- El problema real cae en booking o auth/admin fuera del scope autorizado
- No existe evidencia suficiente para distinguir si el problema es DB/query/data y haria falta improvisar
