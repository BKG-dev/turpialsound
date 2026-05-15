# Integration Gatekeeper - 2026-05-07

## 1) Proposito de la compuerta

Esta compuerta existe para:
- proteger la rama madre `RAMA MADRE`;
- evitar regresion de `/reservas` (zona sana congelada);
- evitar confundir DB incorrecta con UI rota en `/marketplace`;
- evitar liberacion prematura de fondos en flujo marketplace.

Principio operativo:
- `Codigo correcto + DB incorrecta = UI vacia`.

## 2) Estados permitidos de una rama

- `EN_EJECUCION`
- `BLOQUEADA`
- `LISTA_PARA_REVIEW`
- `RECHAZADA`
- `LISTA_PARA_MERGE`
- `MERGEADA`
- `REVERTIDA`

Definicion corta:
- `EN_EJECUCION`: trabajo activo dentro del scope autorizado.
- `BLOQUEADA`: stop condition o dependencia externa impide avanzar.
- `LISTA_PARA_REVIEW`: cumple minimos de calidad y reporte para revision.
- `RECHAZADA`: no cumple criterios de integracion o introduce riesgo.
- `LISTA_PARA_MERGE`: cumple gate tecnico/QA y no tiene P0 abiertos.
- `MERGEADA`: integrada por autorizacion explicita.
- `REVERTIDA`: salida de rama madre por regresion o riesgo operativo.

## 3) Minimos para `LISTA_PARA_REVIEW`

- rama propia (no rama madre, no `main`);
- worktree propio;
- diff acotado al lock/scope autorizado;
- scope respetado (sin tocar rutas prohibidas);
- sin secrets ni leakage de credenciales/tokens;
- reporte estructurado con `PASS/FAIL/P0/P1/P2`;
- validaciones proporcionales ejecutadas segun tipo de cambio.

## 4) Minimos para `LISTA_PARA_MERGE`

- `git diff --check` en `OK`.
- `npx tsc --noEmit` en `OK` si se toco `*.ts`, `*.tsx` o config TS.
- `pnpm build` en `OK` si se toco producto, rutas, config, scripts ejecutables o dependencias.
- smoke HTTP cuando aplique al tipo de cambio.
- QA manual si toca flujo de marketplace.
- runtime guard obligatorio si el sintoma es marketplace vacio o preview inconsistente.
- sin P0 abiertos.

## 5) Smoke obligatorio post-merge en Preview integrado

Validar como minimo:
- `/`
- `/marketplace`
- `/reservas`
- `/api/bcv-rate`
- `/admin/login`
- `/ops/payment-review`
- `/payment-proofs/view` sin token: debe responder error controlado (no `500`).

## 6) Arbol de decision si `/marketplace` esta vacio

1. Confirmar branch/commit realmente desplegado en Preview.
2. Revisar runtime logs del deployment.
3. Revisar logs `marketplace.discovery`.
4. Ejecutar/usar `Preview Runtime Guard`.
5. Si aparece `P2021` o faltan tablas `mp_*`: concluir `DB target incorrecto probable`.
6. Si `mp_*` existe pero `ACTIVE=0`: concluir `data issue / ZERO_ACTIVE`.
7. Solo tocar UI cuando DB/query/data esten correctos.

## 7) Reglas anti-P0 marketplace

- admin no puede liberar fondos desde `IN_ESCROW`;
- seller marco entregado no libera fondos por si solo;
- buyer recibio no pasa directo a `RELEASED`;
- admin libera/cierra solo desde `DELIVERY_CONFIRMED`;
- doble venta debe estar bloqueada o reportada como `P0`;
- operacion nueva sin tasa requerida es `P0` o stop condition segun implementacion vigente.

## 8) Reglas de merge

- no usar `git push` generico si tracking es ambiguo;
- usar push explicito de rama;
- merge solo por autorizacion de Jean;
- no tocar `main`;
- no tocar produccion;
- no ejecutar `vercel --prod`;
- no tocar env sin autorizacion de Jean;
- no tocar `schema/migrations` sin lock explicito;
- no tocar `/reservas` salvo sprint explicito de Jean.

## 9) Orden recomendado de integracion (Ola 1)

1. J1 Docs
2. J2 Runtime Guard
3. M2 QA Harness
4. J3 Gatekeeper
5. M1 Protected Flow (solo si no trae P0)

## 10) Formato estandar de reporte de agente

Campos obligatorios:
- `agente`
- `rama`
- `commit`
- `push`
- `archivos tocados`
- `validaciones`
- `QA`
- `P0/P1/P2`
- `stop conditions`
- `recomendacion`

Plantilla sugerida:

```text
[AGENTE][REPORTE]
1. Agente:
2. Rama:
3. Commit:
4. Push:
5. Archivos tocados:
6. Validaciones:
7. QA:
8. P0:
9. P1:
10. P2:
11. Stop conditions:
12. Recomendacion:
```
