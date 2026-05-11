---
tags: ["#central", "#control-bus", "#governance", "#status/live-source"]
fecha: 2026-05-10
---

# Bus de Control - Turpial Sound

## Decision activa

El modelo vigente pasa de un bus Nivel 2 centralizado a un **Bus de Control Nivel 2.5 - Co-development Marketplace**.

Esto significa:

- Jean y Manuel desarrollan marketplace.
- Ambos pueden pushear a la rama madre operativa.
- Jean sigue gateando `main`, produccion, release, booking, envs criticos y DB/schema.
- Nadie trabaja sin ownership, lock y checklist de cierre.

## Confirmado

- **Rama madre operativa:** `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07`
- **Gate de `main`/produccion:** Jean
- **Owner de booking `/reservas`:** Jean
- **Owner de QA marketplace:** Manuel
- **Modelo de trabajo:** sprint cerrado, preview antes de produccion, cero trabajo exploratorio directo sobre madre

## Nivel 2.5 - Co-development Marketplace

### Jean

**Rol**

- Co-desarrollador marketplace
- Gatekeeper de `main`/produccion
- Owner de booking `/reservas`
- Owner/reviewer fuerte de integracion, Vercel production, envs criticos, DB/schema/migrations y release

**Puede**

- Tomar sprints marketplace asignados
- Pushear a rama madre operativa tras checklist
- Revisar y cerrar sprints de Manuel
- Ejecutar merge/release hacia `main`/produccion
- Bloquear un sprint si detecta riesgo de release, infra o booking

**No debe**

- Cambiar flujos marketplace asignados a Manuel sin lock
- Mezclar booking y marketplace en un mismo sprint salvo integracion autorizada
- Saltar preview, QA o release gate antes de produccion

### Manuel

**Rol**

- Co-desarrollador marketplace
- Product owner marketplace
- Owner de QA buyer/seller/admin
- Owner de UX operativa, action center, delivery/receipt, admin marketplace y docs

**Puede**

- Tomar sprints marketplace asignados
- Pushear a rama madre operativa tras checklist
- Crear previews BKG desde ramas `Manuel/*`
- Cerrar sprints marketplace con reporte corto y evidencia

**No debe**

- Pushear a `main` o produccion
- Cambiar booking `/reservas`
- Tocar envs production, dominios, billing o release config
- Tocar schema/migrations sin lock Jean + Manuel explicito

## Rama madre operativa

**Definicion**

- `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07`

**Reglas**

- Ambos pueden pushear a madre operativa.
- Preferido: trabajar en rama de sprint y luego integrar a madre.
- Permitido push directo solo para docs o hotfix minimo ya validado.
- Prohibido trabajo exploratorio directo sobre madre.
- Prohibido mezclar dos sprints en una misma rama o push.

## Checklist minimo antes de push a madre

1. Rama propia y sprint unico identificado.
2. Working tree limpio o con diff estrictamente dentro del scope del sprint.
3. Lock confirmado si la zona es critica.
4. Sin secretos, sin `.env`, sin valores de Vercel, sin cambios de billing.
5. Sin cambios fuera del sprint.
6. Sin `main`, sin produccion, sin deploy productivo.
7. Preview/QA proporcional ejecutado o documentado como pendiente real.
8. Reporte corto listo: objetivo, archivos, validacion, riesgo, stop condition.
9. Si toca zona critica, avisar al otro antes del push.

## Locks por dominio

| Dominio | Regla de lock | Owner / Gate |
|---------|---------------|--------------|
| DB / schema / Prisma / migrations | Lock obligatorio doble | Jean + Manuel |
| Env / Vercel production / domains / billing | Jean gate | Jean |
| Booking `/reservas` | Owner exclusivo | Jean |
| Marketplace payment proof / protected media | Lock obligatorio | Jean + Manuel |
| Rates / finance / payouts | Lock obligatorio | Jean + Manuel |
| Auth / session / admin / SUPER | Lock obligatorio | Jean + Manuel |
| Public UI / copy / docs | Lock ligero | Owner del sprint |
| Discovery / listings | Owner por sprint | Sprint owner |
| Dashboard buyer / seller / admin | Owner por sprint | Sprint owner |

## Reglas anti-colision

- No trabajar dos personas sobre el mismo archivo o la misma zona critica sin lock.
- No tocar una zona asignada al otro por intuicion.
- Si aparece dependencia externa, se detiene el sprint o se reabre el lock.
- Reviewer cruzado es opcional para superficie normal y obligatorio para zona critica.
- Si una tarea requiere schema, envs, booking o auth/SUPER, el sprint no se cierra sin acuerdo explicito.

## Que sigue gateado por Jean

- push a `main`
- deploy a produccion
- release final
- Vercel production envs
- dominios, billing, config de release
- DB/schema/migrations
- booking `/reservas`
- rotacion de secretos y rollback

## Pendiente

- Registrar cobertura QA exacta adicional en dispatcher cuando haga falta para sprints no cubiertos.
- Mantener sincronizados este bus, el roadmap y los prompts operativos.

## Riesgo principal del modelo

Permitir push de ambos a madre mejora velocidad, pero solo funciona si el lock por dominio y el checklist se respetan sin excepciones.
