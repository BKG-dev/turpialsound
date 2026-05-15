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

## Resiliencia — Reasignación de Sprints (2026-05-14)

El Bus de Control es **resiliente a la ausencia de un operador.** Si uno está durmiendo, enfermo, o en days off, el otro PUEDE tomar sus sprints.

### Protocolo automático (preflight)

El `preflight.mjs` paso 9 (RESILIENCIA) registra automáticamente cada asignación de sprint. Cuando un sprint toca zonas con lock doble, el preflight advierte y pregunta si el otro operador está disponible.

### Reglas de reasignación

| Escenario | Acción |
|-----------|--------|
| **Lock doble + otro operador en consola** | Coordinar. El lock requiere ambos. |
| **Lock doble + otro operador ausente <48h** | El disponible PUEDE tomar el sprint. Se registra reasignación. |
| **Lock doble + otro operador ausente >48h** | El disponible toma el sprint sin restricción. Booking requiere autorización explícita. |
| **Zona exclusiva (booking)** | Manuel SOLO toca booking si Jean ausente >48h Y autoriza explícitamente. |
| **Zona sin lock** | Cualquier operador disponible puede tomar el sprint. |

### Trazabilidad

Cada reasignación queda registrada en:
1. `scripts/oreshnik/runs/.sprint-assignments.json` — registro automático del preflight
2. `00_CENTRAL_TURPIAL.md` — actualizar tabla de sprints con nuevo owner
3. Commit message — prefijo `reassign:`

### Trabajo fuera de metodología

Si un operador hace trabajo que no corresponde a un sprint documentado:
1. `preflight.mjs` paso 10 registra automáticamente en `.out-of-band.json`
2. El operador DEBE documentarlo en `00_CENTRAL_TURPIAL.md` mapeándolo al sprint más cercano
3. Sin trazabilidad, el trabajo fuera de metodología genera deuda de documentación

### Reasignación de Sprints (Original — 2026-05-12)

1. **Notificación:** Actualizar `00_CENTRAL_TURPIAL` y `PLAN_MAESTRO_SPRINTS` con la reasignación ANTES de comenzar.
2. **Branch renombrada:** El nuevo owner crea su propia branch (ej: `jean/s12` → `Manuel/s12`).
3. **Zonas críticas con lock doble:** S12-S14 (purchase → proof → admin) pueden ser tomados por Manuel porque son zona marketplace (Manuel tiene acceso full).
4. **Zona booking `/reservas`:** Jean es dueño exclusivo. Manuel puede tomar S-JB-01 a S-JB-04 SOLO si Jean está inactivo >48h Y autoriza explícitamente. Booking NO se toca sin autorización.
5. **Al retomar:** El owner original hace pull de la branch del sustituto, revisa el diff, y continúa o crea nueva branch desde donde quedó.
6. **Documentación:** Cada reasignación debe registrarse en el handoff y en el commit message.

## Pendiente

- Registrar cobertura QA exacta adicional en dispatcher cuando haga falta para sprints no cubiertos.
- Mantener sincronizados este bus, el roadmap y los prompts operativos.

## Riesgo principal del modelo

Permitir push de ambos a madre mejora velocidad, pero solo funciona si el lock por dominio y el checklist se respetan sin excepciones.

---

> **Análisis completo de evolución y roadmap:** [[BUS_CONTROL_EVOLUCION]]
> **Versión actual:** 2.5.0 | **Automatización:** 48% | **Próximo hito:** 3.0 (Mayo 16)
