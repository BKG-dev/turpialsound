# AGENT CONTROL BUS RUNNER — Turpial Sound Marketplace

> **Version:** 1.0.0
> **Fecha:** 2026-05-10
> **Proposito:** Prompt universal para cualquier agente Codex (Jean o Manuel) que ejecute sprints del Bus de Control Marketplace.
> **Instruccion unica de entrada:** `Lee docs/07_handoffs/AGENT_CONTROL_BUS_RUNNER.md y ejecuta tu carril segun tu rol.`

---

## 0. ENTRADA OBLIGATORIA

Antes de ejecutar cualquier accion, el agente DEBE determinar o preguntar:

```text
OPERATOR=Jean | Manuel
SPRINT_ID=S01 | S02 | S03 | S04 | S05 | S06 | S07 | S08 | S09 | S10
MODE=align | execute | close
```

Si el operador humano no especifica OPERATOR o SPRINT_ID, el agente DEBE preguntar explicitamente antes de continuar. No inferir. No adivinar.

### Significado de MODE

| MODE | Que hace el agente |
|------|-------------------|
| `align` | Solo lee, verifica precondiciones, confirma que el sprint es ejecutable. No modifica nada. No crea rama. Reporta readiness. |
| `execute` | Ejecuta el sprint completo: crea rama, implementa, valida, documenta, commitea, pushea. |
| `close` | Cierra el sprint: actualiza docs de cierre, verifica checklist, reporta resultado final. No vuelve a ejecutar. |

---

## 1. LECTURA DEL ESTADO ESTRATEGICO

El agente DEBE leer en este orden para comprender el contexto antes de ejecutar:

1. `docs/obsidian-vault/00_CENTRAL_TURPIAL.md` — mapa central, rama madre, roles, guardrails
2. `docs/obsidian-vault/BUS_CONTROL_TURPIAL.md` — reglas del bus, locks, checklist de push
3. `docs/obsidian-vault/SPRINTS_CODEV_MARKETPLACE_2026-05-10.md` — definiciones completas de sprints S01-S10
4. `docs/obsidian-vault/BUGS_CRITICOS.md` — riesgos activos que pueden bloquear el sprint
5. `docs/07_handoffs/session-summary-active.md` — estado de la sesion anterior
6. `docs/07_handoffs/next-window-brief.md` — siguiente ventana recomendada

Si alguno de estos archivos no existe o esta desactualizado, el agente debe reportarlo como precondicion fallida.

---

## 2. IDENTIFICACION DE ROL

El agente determina su rol a partir de OPERATOR:

### OPERATOR=Jean

**Zonas autorizadas por defecto:**
- Todo el runtime de marketplace (codevia con Manuel)
- Discovery / listings
- Payment proof / protected media
- Payout / finance / rates
- Integracion, merge a madre
- Docs de su sprint

**Zonas prohibidas:**
- Booking `/reservas` (es su zona, pero solo en sprints de booking — NUNCA en sprints marketplace)
- `main` como base operativa
- Produccion sin release gate explicito
- Envs de Vercel sin documentar
- Schema/migrations sin lock Jean + Manuel
- Zonas activas de Manuel en marketplace: `components/marketplace/dashboard/*`, `lib/marketplace/notifications.ts`, `actions/marketplace/transactions.ts`

**Gate keeper de:**
- Push a `main`
- Deploy a produccion
- Vercel production envs
- Dominios, billing, release config
- Rotacion de secretos
- Rollback

### OPERATOR=Manuel

**Zonas autorizadas por defecto:**
- Marketplace runtime (codevia con Jean)
- QA buyer/seller/admin
- UX operativa, action center, dashboards
- Delivery/receipt flow
- SEO/AEO / discovery publico
- Docs de marketplace, obsidian, handoffs
- Preview BKG desde `Manuel/*`

**Zonas prohibidas:**
- Booking `/reservas`
- `main` como base operativa
- Produccion
- Envs de Vercel production
- Schema/migrations sin lock Jean + Manuel
- Dominios, billing, release config

**Gate keeper de:**
- QA de marketplace
- UX y copy operativo
- Docs de negocio marketplace

---

## 3. DEFINICIONES DE SPRINT (fuente canonica)

Las definiciones completas y actualizadas de cada sprint estan en:
`docs/obsidian-vault/SPRINTS_CODEV_MARKETPLACE_2026-05-10.md`

El agente DEBE leer la entrada de su SPRINT_ID en ese archivo y extraer:

| Campo | Significado |
|-------|-------------|
| Owner principal | Quien ejecuta |
| Segundo par/reviewer | Quien revisa |
| Objetivo de negocio | Que se logra |
| Que avance queda cerrado | Resultado concreto |
| Rama recomendada | Nombre de branch a crear |
| Base branch | De donde partir |
| Zonas autorizadas | Que archivos/carpetas puede tocar |
| Zonas prohibidas | Que NO puede tocar |
| Validacion minima | Que evidencia se requiere |
| Preview requerido | Si necesita preview |
| Push a madre permitido | Si puede integrar a madre |
| Production permitido | Si puede ir a produccion |
| Stop condition | Que detiene el sprint |

---

## 4. RESUMEN RAPIDO DE SPRINTS (referencia)

| Sprint | Owner | Reviewer | Cierre |
|--------|-------|----------|--------|
| S01 | Manuel | Jean | Preview BKG autonomo |
| S02 | Jean | Manuel | Discovery estable o error clasificado |
| S03 | Manuel | Jean | Login QA cerrado |
| S04 | Jean | Manuel | Payment proof protegido validado |
| S05 | Manuel | Jean | Delivery/receipt operativo |
| S06 | Jean | Manuel | Payout admin auditable |
| S07 | Jean | Manuel | Tasas y accounting listos |
| S08 | Manuel | Jean | Action center y UX claros |
| S09 | Manuel | Jean | Discovery publico listo |
| S10 | Jean | Manuel | Release gate de launch |

### Fase A — Autonomia y runtime seguro (S01-S03)
### Fase B — Flujo transaccional critico (S04-S06)
### Fase C — Finanzas, UX y lanzamiento (S07-S10)

### Secuencia

- **Paralelo real:** S01 y S02 pueden arrancar en ventanas distintas.
- **Secuencia critica:** S04 → S05 → S06.
- **S10:** solo cuando S01-S09 esten cerrados.

---

## 5. GUARDRAILS GLOBALES (obligatorio verificar antes de ejecutar)

El agente DEBE verificar estos guardrails antes de cualquier accion:

### Anti-colision
- [ ] El sprint NO esta siendo ejecutado por otro agente simultaneamente.
- [ ] El owner del sprint coincide con OPERATOR.
- [ ] Si el sprint requiere reviewer, el reviewer fue notificado.
- [ ] Si la zona es critica (DB, schema, envs, auth/SUPER, payment proof, rates/finance), el lock Jean + Manuel esta confirmado.

### Anti-corrupcion
- [ ] No se tocara booking `/reservas`.
- [ ] No se usara `main` como base.
- [ ] No se desplegara a produccion sin gate explicito.
- [ ] No se hardcodearan credenciales ni secretos.
- [ ] No se imprimiran valores de env, tokens, URLs con credenciales.
- [ ] No se mezclaran dos sprints en la misma rama.

### Anti-fragmentacion
- [ ] El agente NO pedira prompts fragmentados al operador humano.
- [ ] Si encuentra un bloqueo rojo (stop condition), reportara el bloqueo exacto y se detendra.
- [ ] Si encuentra GAP OPERATIVO (ruta QA no canonica), reportara el gap y se detendra.
- [ ] Si encuentra una dependencia externa no resuelta, la reportara sin improvisar.

---

## 6. FLUJO DE EJECUCION (MODE=execute)

### Paso 1 — Preflight

1. Leer `SPRINTS_CODEV_MARKETPLACE_2026-05-10.md` → extraer definicion del SPRINT_ID.
2. Verificar que OPERATOR coincide con Owner principal del sprint.
3. Verificar guardrails globales (seccion 5).
4. Verificar que la base branch existe en remote.
5. Verificar working tree: si esta sucio fuera de docs permitidos, reportar y detener.

### Paso 2 — Crear rama

```bash
git fetch origin
git checkout -b <rama_recomendada> origin/<base_branch>
```

Si la rama ya existe localmente, preguntar si reusar o crear nueva.

### Paso 3 — Implementar

Ejecutar las tareas del sprint dentro de las zonas autorizadas. Reglas:
- Cero cambios fuera de zonas autorizadas.
- Cero cambios en zonas prohibidas.
- Si el sprint es docs-only, solo tocar archivos `.md` en `docs/`.
- Si el sprint requiere codigo, solo tocar archivos en zonas autorizadas del sprint.

### Paso 4 — Validar

Ejecutar la validacion minima definida en el sprint. Reglas:
- Antes de cualquier QA, resolver `task_id` exacto en `docs/07_handoffs/qa-dispatcher.json`.
- Si la validacion requiere un `task_id` que no existe en el dispatcher, detenerse y reportar `GAP OPERATIVO`.
- Si la validacion requiere un `task_id` que existe, usar la ruta canonica exacta del dispatcher.
- No improvisar metodos de validacion alternos.
- No usar scripts LEGACY o EXPERIMENTAL como primera opcion.

### Paso 5 — Documentar

Actualizar los siguientes archivos con el resultado del sprint:

1. `docs/07_handoffs/session-summary-active.md`
   - Actualizar con: sprint ejecutado, rama, commits, resultado, riesgos, next step.
2. `docs/07_handoffs/next-window-brief.md`
   - Actualizar con: proximo sprint recomendado, estado de guardrails.
3. Si el sprint modifico el estado de riesgos:
   - `docs/obsidian-vault/BUGS_CRITICOS.md`
   - `docs/obsidian-vault/ROADMAP_RESCATE.md`

### Paso 6 — Commit

```bash
git add <archivos del sprint>
git commit -m "<tipo>(<alcance>): <descripcion concisa>"
```

Formato de commit:
- `docs(...):` para cambios documentales
- `fix(marketplace):` para fixes de runtime
- `feat(marketplace):` para features nuevas
- `qa(...):` para scripts o evidencia de QA

Verificar antes de commit:
- [ ] Solo archivos del sprint estan staged.
- [ ] No hay `.env`, secretos, tokens, URLs con credenciales.
- [ ] No hay archivos de booking, schema, migraciones (salvo sprint autorizado).
- [ ] No hay `.obsidian/` staged (workspace local).
- [ ] `git diff --check` limpio.

### Paso 7 — Push

```bash
git push -u origin <rama_recomendada>
```

Reglas:
- Si el sprint permite push a madre, hacer push de la rama de sprint. El merge a madre lo hace el gatekeeper (Jean) o el owner con checklist.
- Si el sprint NO permite push a madre, solo push de la rama de sprint.

### Paso 8 — Reportar

Formato de reporte final (obligatorio):

```markdown
# REPORTE — <SPRINT_ID> <NOMBRE>

- **Operador:** <OPERATOR>
- **Sprint:** <SPRINT_ID>
- **Rama:** <rama_usada>
- **Base:** <base_branch> @ <commit>
- **Archivos modificados:** <lista>
- **Resultado:** <exito | bloqueado | gap>
- **Validacion:** <evidencia>
- **Riesgos:** <nuevos o actualizados>
- **Proximo sprint:** <SPRINT_ID recomendado>
- **Commit:** <hash>
- **Push:** <status>
```

---

## 7. FLUJO DE ALINEACION (MODE=align)

Solo lectura. No modifica nada. No crea rama.

1. Leer `SPRINTS_CODEV_MARKETPLACE_2026-05-10.md` → extraer definicion.
2. Verificar que OPERATOR coincide con Owner.
3. Verificar guardrails globales.
4. Verificar que la base branch existe.
5. Verificar precondiciones del sprint.
6. Reportar:

```markdown
# ALINEACION — <SPRINT_ID>

- **Precondiciones:** <ok | falla: X>
- **Base branch existe:** <si | no>
- **Zonas autorizadas:** <ok>
- **Zonas prohibidas:** <ok>
- **Stop conditions presentes:** <ninguna | X>
- **Dependencias externas:** <resueltas | pendiente: X>
- **Listo para execute:** <si | no>
- **Bloqueantes:** <lista si aplica>
```

---

## 8. FLUJO DE CIERRE (MODE=close)

Cierre administrativo. No re-ejecuta el sprint.

1. Leer `session-summary-active.md` para recuperar el estado del sprint.
2. Verificar que el sprint fue ejecutado (commits existen).
3. Actualizar `ROADMAP_RESCATE.md` marcando el sprint como cerrado.
4. Actualizar `next-window-brief.md` apuntando al siguiente sprint.
5. Si el sprint cerro un riesgo, actualizar `BUGS_CRITICOS.md`.
6. Reportar cierre:

```markdown
# CIERRE — <SPRINT_ID>

- **Commits asociados:** <hashes>
- **Rama:** <rama>
- **Validacion final:** <evidencia>
- **Riesgos cerrados:** <lista>
- **Riesgos abiertos remanentes:** <lista>
- **Proximo sprint:** <SPRINT_ID>
```

---

## 9. REGLAS DE QA CANONICO

Fuente de despacho obligatoria: `docs/07_handoffs/qa-dispatcher.json`

### Procedimiento

1. Identificar el `task_id` requerido por el sprint.
2. Buscar `task_id` en `qa-dispatcher.json`.
3. Si el `task_id` NO existe → detenerse y reportar `GAP OPERATIVO`. No improvisar.
4. Si el `task_id` existe:
   - Usar `canonical_script` si mode es `script`.
   - Seguir `canonical_manual_route` si mode es `manual_preview`.
   - Verificar `preconditions` — si alguna falla, corregir solo la precondicion documentada.
   - No usar `allowed_fallbacks` como primera opcion.
   - NUNCA usar metodos listados en `forbidden_fallbacks`.

### Task IDs disponibles (al 2026-05-10)

| task_id | Modo | Script canonico |
|---------|------|----------------|
| `qa_accounts_normalization` | script | `npx tsx scripts/setup-marketplace-qa-accounts.ts` |
| `marketplace_login_smoke` | script | `node scripts/qa-marketplace-login-smoke.mjs` |
| `buyer_seller_admin_smoke` | script | `node scripts/qa-marketplace-qa-accounts.mjs` |
| `seller_publish_blob_public_preview` | manual_preview | N/A — manual |
| `payment_proof_sensitive_preview` | manual_preview | N/A — manual |
| `admin_local_smoke` | script | `node scripts/qa-marketplace-admin-smoke.mjs` |
| `buyer_only_short` | script | `node scripts/qa-marketplace-buyer.mjs` |
| `seller_shell_local` | script | `node scripts/qa-marketplace-seller-smoke.mjs` |
| `reconcile_read_only` | script | `node scripts/qa-marketplace-reconcile.mjs` |

---

## 10. CHECKLIST MINIMO ANTES DE PUSH A MADRE

Si el sprint permite push a madre (ver definicion del sprint), verificar:

1. [ ] Rama propia y sprint unico identificado.
2. [ ] Working tree limpio o con diff estrictamente dentro del scope del sprint.
3. [ ] Lock confirmado si la zona es critica.
4. [ ] Sin secretos, sin `.env`, sin valores de Vercel, sin cambios de billing.
5. [ ] Sin cambios fuera del sprint.
6. [ ] Sin `main`, sin produccion, sin deploy productivo.
7. [ ] Preview/QA proporcional ejecutado o documentado como pendiente real.
8. [ ] Reporte corto listo: objetivo, archivos, validacion, riesgo, stop condition.
9. [ ] Si toca zona critica, el otro fue avisado antes del push.

---

## 11. LOCKS POR DOMINIO

Antes de tocar cualquiera de estos dominios, verificar lock:

| Dominio | Lock requerido | Quien lockea |
|---------|---------------|-------------|
| DB / schema / Prisma / migrations | Doble (Jean + Manuel) | Jean + Manuel |
| Env / Vercel production / domains / billing | Jean gate | Jean |
| Booking `/reservas` | Owner exclusivo | Jean |
| Payment proof / protected media | Doble (Jean + Manuel) | Jean + Manuel |
| Rates / finance / payouts | Doble (Jean + Manuel) | Jean + Manuel |
| Auth / session / admin / SUPER | Doble (Jean + Manuel) | Jean + Manuel |

Si el sprint toca un dominio con lock y el lock no esta confirmado, DETENERSE y reportar el lock faltante.

---

## 12. STOP CONDITIONS UNIVERSALES

Independientemente del sprint, el agente DEBE detenerse si:

1. **CRIT-001:** El sprint requiere tocar secretos o rotar credenciales fuera de S10.
2. **CRIT-002:** El sprint requiere investigar discovery sin acceso a runtime logs.
3. **CRIT-003:** El sprint intenta deploy a produccion sin gate de Jean.
4. **GAP OPERATIVO:** La validacion requiere un `task_id` que no existe en `qa-dispatcher.json`.
5. **LOCK FALTANTE:** El sprint toca un dominio con lock y el lock no esta confirmado.
6. **COLISION:** Otro agente esta ejecutando el mismo sprint o tocando la misma zona critica.
7. **SCHEMA/ENV NO AUTORIZADO:** El fix requiere schema, migration, env change o DB manual sin lock.
8. **BOOKING TOCADO:** El diff incluye archivos de booking `/reservas`.
9. **MAIN TOCADO:** El diff incluye cambios que afectan `main`.
10. **SECRETO EN DIFF:** El diff contiene credenciales, tokens o secretos en texto plano.

---

## 13. REFERENCIAS CRUZADAS

| Documento | Proposito |
|-----------|-----------|
| `docs/obsidian-vault/00_CENTRAL_TURPIAL.md` | Mapa central, estado vivo del proyecto |
| `docs/obsidian-vault/BUS_CONTROL_TURPIAL.md` | Reglas del bus, locks, checklist |
| `docs/obsidian-vault/SPRINTS_CODEV_MARKETPLACE_2026-05-10.md` | Definiciones canonicas de sprints S01-S10 |
| `docs/obsidian-vault/BUGS_CRITICOS.md` | Riesgos activos |
| `docs/obsidian-vault/ROADMAP_RESCATE.md` | Roadmap, items cerrados/pendientes |
| `docs/obsidian-vault/ESTADO_NEGOCIO_TURPIAL_2026-05-10.md` | Estado del negocio |
| `docs/07_handoffs/session-summary-active.md` | Sesion activa, ultimo estado |
| `docs/07_handoffs/next-window-brief.md` | Siguiente ventana recomendada |
| `docs/07_handoffs/qa-dispatcher.json` | Despacho canonico de QA |
| `docs/07_handoffs/qa-canonical-runbook.md` | Narrativa humana de QA (no sustituye al dispatcher) |
| `docs/07_handoffs/AGENT_CONTROL_BUS_RUNNER.md` | Este archivo — prompt universal |

---

## 14. EJEMPLO DE TRABAJO — S01 Manuel

```
OPERATOR=Manuel
SPRINT_ID=S01
MODE=execute
```

### Que hace el agente:

1. Lee `SPRINTS_CODEV_MARKETPLACE_2026-05-10.md` → S01:
   - Owner: Manuel ✓ coincide con OPERATOR
   - Rama: `Manuel/s01-preview-smoke-autonomy-2026-05-10`
   - Base: `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07`
   - Zonas autorizadas: docs, preview deploy, validaciones de runtime, smoke
   - Zonas prohibidas: `app/`, `components/`, `actions/`, `lib/`, `prisma/`, booking, main, prod, env values
   - Validacion: `preview-runtime-guard.ts`, smoke pasivo, `marketplace_login_smoke` si QA envs existen
   - Preview: si, BKG Vercel
   - Push a madre: si (solo docs/reportes)
   - Produccion: NO

2. Verifica guardrails → ok.
3. Crea rama desde base.
4. Despliega preview en BKG Vercel.
5. Ejecuta `preview-runtime-guard.ts`.
6. Smoke HTTP de rutas clave.
7. Si `QA_*` envs existen, ejecuta `marketplace_login_smoke` via dispatcher.
8. Documenta en `session-summary-active.md` y `next-window-brief.md`.
9. Commitea solo docs.
10. Pushea rama.
11. Reporta.

---

## 15. NOTAS FINALES

- Este archivo es el unico punto de entrada que un agente Codex necesita leer.
- Si el agente encuentra una situacion no cubierta por este runner, debe reportarla sin improvisar.
- El dispatcher `qa-dispatcher.json` es la unica fuente de verdad para ejecucion de QA.
- Los archivos en `docs/obsidian-vault/` son la fuente de verdad para estado de negocio, roadmap, bugs y sprints.
- Este runner no autoriza deploy a produccion. Solo Jean con release gate explicito.
- Este runner no autoriza cambios en booking. Booking es zona exclusiva de Jean.
- Los locks son sagrados. Sin lock, no se toca el dominio.
# AGENT CONTROL BUS RUNNER — Turpial Sound Marketplace

> **Version:** 1.0.0
> **Fecha:** 2026-05-10
> **Proposito:** Prompt universal para cualquier agente Codex (Jean o Manuel) que ejecute sprints del Bus de Control Marketplace.
> **Instruccion unica de entrada:** `Lee docs/07_handoffs/AGENT_CONTROL_BUS_RUNNER.md y ejecuta tu carril segun tu rol.`

---

## 0. ENTRADA OBLIGATORIA

Antes de ejecutar cualquier accion, el agente DEBE determinar o preguntar:

```text
OPERATOR=Jean | Manuel
SPRINT_ID=S01 | S02 | S03 | S04 | S05 | S06 | S07 | S08 | S09 | S10
MODE=align | execute | close
```

Si el operador humano no especifica OPERATOR o SPRINT_ID, el agente DEBE preguntar explicitamente antes de continuar. No inferir. No adivinar.

### Significado de MODE

| MODE | Que hace el agente |
|------|-------------------|
| `align` | Solo lee, verifica precondiciones, confirma que el sprint es ejecutable. No modifica nada. No crea rama. Reporta readiness. |
| `execute` | Ejecuta el sprint completo: crea rama, implementa, valida, documenta, commitea, pushea. |
| `close` | Cierra el sprint: actualiza docs de cierre, verifica checklist, reporta resultado final. No vuelve a ejecutar. |

---

## 1. LECTURA DEL ESTADO ESTRATEGICO

El agente DEBE leer en este orden para comprender el contexto antes de ejecutar:

1. `docs/obsidian-vault/00_CENTRAL_TURPIAL.md` — mapa central, rama madre, roles, guardrails
2. `docs/obsidian-vault/BUS_CONTROL_TURPIAL.md` — reglas del bus, locks, checklist de push
3. `docs/obsidian-vault/SPRINTS_CODEV_MARKETPLACE_2026-05-10.md` — definiciones completas de sprints S01-S10
4. `docs/obsidian-vault/BUGS_CRITICOS.md` — riesgos activos que pueden bloquear el sprint
5. `docs/07_handoffs/session-summary-active.md` — estado de la sesion anterior
6. `docs/07_handoffs/next-window-brief.md` — siguiente ventana recomendada

Si alguno de estos archivos no existe o esta desactualizado, el agente debe reportarlo como precondicion fallida.

---

## 2. IDENTIFICACION DE ROL

El agente determina su rol a partir de OPERATOR:

### OPERATOR=Jean

**Zonas autorizadas por defecto:**
- Todo el runtime de marketplace (codevia con Manuel)
- Discovery / listings
- Payment proof / protected media
- Payout / finance / rates
- Integracion, merge a madre
- Docs de su sprint

**Zonas prohibidas:**
- Booking `/reservas` (es su zona, pero solo en sprints de booking — NUNCA en sprints marketplace)
- `main` como base operativa
- Produccion sin release gate explicito
- Envs de Vercel sin documentar
- Schema/migrations sin lock Jean + Manuel

**Gate keeper de:**
- Push a `main`
- Deploy a produccion
- Vercel production envs
- Dominios, billing, release config
- Rotacion de secretos
- Rollback

### OPERATOR=Manuel

**Zonas autorizadas por defecto:**
- Marketplace runtime (codevia con Jean)
- QA buyer/seller/admin
- UX operativa, action center, dashboards
- Delivery/receipt flow
- SEO/AEO / discovery publico
- Docs de marketplace, obsidian, handoffs
- Preview BKG desde `Manuel/*`

**Zonas prohibidas:**
- Booking `/reservas`
- `main` como base operativa
- Produccion
- Envs de Vercel production
- Schema/migrations sin lock Jean + Manuel
- Dominios, billing, release config

**Gate keeper de:**
- QA de marketplace
- UX y copy operativo
- Docs de negocio marketplace

---

## 3. DEFINICIONES DE SPRINT (fuente canonica)

Las definiciones completas y actualizadas de cada sprint estan en:
`docs/obsidian-vault/SPRINTS_CODEV_MARKETPLACE_2026-05-10.md`

El agente DEBE leer la entrada de su SPRINT_ID en ese archivo y extraer:

| Campo | Significado |
|-------|-------------|
| Owner principal | Quien ejecuta |
| Segundo par/reviewer | Quien revisa |
| Objetivo de negocio | Que se logra |
| Que avance queda cerrado | Resultado concreto |
| Rama recomendada | Nombre de branch a crear |
| Base branch | De donde partir |
| Zonas autorizadas | Que archivos/carpetas puede tocar |
| Zonas prohibidas | Que NO puede tocar |
| Validacion minima | Que evidencia se requiere |
| Preview requerido | Si necesita preview |
| Push a madre permitido | Si puede integrar a madre |
| Production permitido | Si puede ir a produccion |
| Stop condition | Que detiene el sprint |

---

## 4. RESUMEN RAPIDO DE SPRINTS (referencia)

| Sprint | Owner | Reviewer | Cierre |
|--------|-------|----------|--------|
| S01 | Manuel | Jean | Preview BKG autonomo |
| S02 | Jean | Manuel | Discovery estable o error clasificado |
| S03 | Manuel | Jean | Login QA cerrado |
| S04 | Jean | Manuel | Payment proof protegido validado |
| S05 | Manuel | Jean | Delivery/receipt operativo |
| S06 | Jean | Manuel | Payout admin auditable |
| S07 | Jean | Manuel | Tasas y accounting listos |
| S08 | Manuel | Jean | Action center y UX claros |
| S09 | Manuel | Jean | Discovery publico listo |
| S10 | Jean | Manuel | Release gate de launch |

### Fase A — Autonomia y runtime seguro (S01-S03)
### Fase B — Flujo transaccional critico (S04-S06)
### Fase C — Finanzas, UX y lanzamiento (S07-S10)

### Secuencia

- **Paralelo real:** S01 y S02 pueden arrancar en ventanas distintas.
- **Secuencia critica:** S04 → S05 → S06.
- **S10:** solo cuando S01-S09 esten cerrados.

---

## 5. GUARDRAILS GLOBALES (obligatorio verificar antes de ejecutar)

El agente DEBE verificar estos guardrails antes de cualquier accion:

### Anti-colision
- [ ] El sprint NO esta siendo ejecutado por otro agente simultaneamente.
- [ ] El owner del sprint coincide con OPERATOR.
- [ ] Si el sprint requiere reviewer, el reviewer fue notificado.
- [ ] Si la zona es critica (DB, schema, envs, auth/SUPER, payment proof, rates/finance), el lock Jean + Manuel esta confirmado.

### Anti-corrupcion
- [ ] No se tocara booking `/reservas`.
- [ ] No se usara `main` como base.
- [ ] No se desplegara a produccion sin gate explicito.
- [ ] No se hardcodearan credenciales ni secretos.
- [ ] No se imprimiran valores de env, tokens, URLs con credenciales.
- [ ] No se mezclaran dos sprints en la misma rama.

### Anti-fragmentacion
- [ ] El agente NO pedira prompts fragmentados al operador humano.
- [ ] Si encuentra un bloqueo rojo (stop condition), reportara el bloqueo exacto y se detendra.
- [ ] Si encuentra GAP OPERATIVO (ruta QA no canonica), reportara el gap y se detendra.
- [ ] Si encuentra una dependencia externa no resuelta, la reportara sin improvisar.

---

## 6. FLUJO DE EJECUCION (MODE=execute)

### Paso 1 — Preflight

1. Leer `SPRINTS_CODEV_MARKETPLACE_2026-05-10.md` → extraer definicion del SPRINT_ID.
2. Verificar que OPERATOR coincide con Owner principal del sprint.
3. Verificar guardrails globales (seccion 5).
4. Verificar que la base branch existe en remote.
5. Verificar working tree: si esta sucio fuera de docs permitidos, reportar y detener.

### Paso 2 — Crear rama

```bash
git fetch origin
git checkout -b <rama_recomendada> origin/<base_branch>
```

Si la rama ya existe localmente, preguntar si reusar o crear nueva.

### Paso 3 — Implementar

Ejecutar las tareas del sprint dentro de las zonas autorizadas. Reglas:
- Cero cambios fuera de zonas autorizadas.
- Cero cambios en zonas prohibidas.
- Si el sprint es docs-only, solo tocar archivos `.md` en `docs/`.
- Si el sprint requiere codigo, solo tocar archivos en zonas autorizadas del sprint.

### Paso 4 — Validar

Ejecutar la validacion minima definida en el sprint. Reglas:
- Antes de cualquier QA, resolver `task_id` exacto en `docs/07_handoffs/qa-dispatcher.json`.
- Si la validacion requiere un `task_id` que no existe en el dispatcher, detenerse y reportar `GAP OPERATIVO`.
- Si la validacion requiere un `task_id` que existe, usar la ruta canonica exacta del dispatcher.
- No improvisar metodos de validacion alternos.
- No usar scripts LEGACY o EXPERIMENTAL como primera opcion.

### Paso 5 — Documentar

Actualizar los siguientes archivos con el resultado del sprint:

1. `docs/07_handoffs/session-summary-active.md`
   - Actualizar con: sprint ejecutado, rama, commits, resultado, riesgos, next step.
2. `docs/07_handoffs/next-window-brief.md`
   - Actualizar con: proximo sprint recomendado, estado de guardrails.
3. Si el sprint modifico el estado de riesgos:
   - `docs/obsidian-vault/BUGS_CRITICOS.md`
   - `docs/obsidian-vault/ROADMAP_RESCATE.md`

### Paso 6 — Commit

```bash
git add <archivos del sprint>
git commit -m "<tipo>(<alcance>): <descripcion concisa>"
```

Formato de commit:
- `docs(...):` para cambios documentales
- `fix(marketplace):` para fixes de runtime
- `feat(marketplace):` para features nuevas
- `qa(...):` para scripts o evidencia de QA

Verificar antes de commit:
- [ ] Solo archivos del sprint estan staged.
- [ ] No hay `.env`, secretos, tokens, URLs con credenciales.
- [ ] No hay archivos de booking, schema, migraciones (salvo sprint autorizado).
- [ ] No hay `.obsidian/` staged (workspace local).
- [ ] `git diff --check` limpio.

### Paso 7 — Push

```bash
git push -u origin <rama_recomendada>
```

Reglas:
- Si el sprint permite push a madre, hacer push de la rama de sprint. El merge a madre lo hace el gatekeeper (Jean) o el owner con checklist.
- Si el sprint NO permite push a madre, solo push de la rama de sprint.

### Paso 8 — Reportar

Formato de reporte final (obligatorio):

```markdown
# REPORTE — <SPRINT_ID> <NOMBRE>

- **Operador:** <OPERATOR>
- **Sprint:** <SPRINT_ID>
- **Rama:** <rama_usada>
- **Base:** <base_branch> @ <commit>
- **Archivos modificados:** <lista>
- **Resultado:** <exito | bloqueado | gap>
- **Validacion:** <evidencia>
- **Riesgos:** <nuevos o actualizados>
- **Proximo sprint:** <SPRINT_ID recomendado>
- **Commit:** <hash>
- **Push:** <status>
```

---

## 7. FLUJO DE ALINEACION (MODE=align)

Solo lectura. No modifica nada. No crea rama.

1. Leer `SPRINTS_CODEV_MARKETPLACE_2026-05-10.md` → extraer definicion.
2. Verificar que OPERATOR coincide con Owner.
3. Verificar guardrails globales.
4. Verificar que la base branch existe.
5. Verificar precondiciones del sprint.
6. Reportar:

```markdown
# ALINEACION — <SPRINT_ID>

- **Precondiciones:** <ok | falla: X>
- **Base branch existe:** <si | no>
- **Zonas autorizadas:** <ok>
- **Zonas prohibidas:** <ok>
- **Stop conditions presentes:** <ninguna | X>
- **Dependencias externas:** <resueltas | pendiente: X>
- **Listo para execute:** <si | no>
- **Bloqueantes:** <lista si aplica>
```

---

## 8. FLUJO DE CIERRE (MODE=close)

Cierre administrativo. No re-ejecuta el sprint.

1. Leer `session-summary-active.md` para recuperar el estado del sprint.
2. Verificar que el sprint fue ejecutado (commits existen).
3. Actualizar `ROADMAP_RESCATE.md` marcando el sprint como cerrado.
4. Actualizar `next-window-brief.md` apuntando al siguiente sprint.
5. Si el sprint cerro un riesgo, actualizar `BUGS_CRITICOS.md`.
6. Reportar cierre:

```markdown
# CIERRE — <SPRINT_ID>

- **Commits asociados:** <hashes>
- **Rama:** <rama>
- **Validacion final:** <evidencia>
- **Riesgos cerrados:** <lista>
- **Riesgos abiertos remanentes:** <lista>
- **Proximo sprint:** <SPRINT_ID>
```

---

## 9. REGLAS DE QA CANONICO

Fuente de despacho obligatoria: `docs/07_handoffs/qa-dispatcher.json`

### Procedimiento

1. Identificar el `task_id` requerido por el sprint.
2. Buscar `task_id` en `qa-dispatcher.json`.
3. Si el `task_id` NO existe → detenerse y reportar `GAP OPERATIVO`. No improvisar.
4. Si el `task_id` existe:
   - Usar `canonical_script` si mode es `script`.
   - Seguir `canonical_manual_route` si mode es `manual_preview`.
   - Verificar `preconditions` — si alguna falla, corregir solo la precondicion documentada.
   - No usar `allowed_fallbacks` como primera opcion.
   - NUNCA usar metodos listados en `forbidden_fallbacks`.

### Task IDs disponibles (al 2026-05-10)

| task_id | Modo | Script canonico |
|---------|------|----------------|
| `qa_accounts_normalization` | script | `npx tsx scripts/setup-marketplace-qa-accounts.ts` |
| `marketplace_login_smoke` | script | `node scripts/qa-marketplace-login-smoke.mjs` |
| `buyer_seller_admin_smoke` | script | `node scripts/qa-marketplace-qa-accounts.mjs` |
| `seller_publish_blob_public_preview` | manual_preview | N/A — manual |
| `payment_proof_sensitive_preview` | manual_preview | N/A — manual |
| `admin_local_smoke` | script | `node scripts/qa-marketplace-admin-smoke.mjs` |
| `buyer_only_short` | script | `node scripts/qa-marketplace-buyer.mjs` |
| `seller_shell_local` | script | `node scripts/qa-marketplace-seller-smoke.mjs` |
| `reconcile_read_only` | script | `node scripts/qa-marketplace-reconcile.mjs` |

---

## 10. CHECKLIST MINIMO ANTES DE PUSH A MADRE

Si el sprint permite push a madre (ver definicion del sprint), verificar:

1. [ ] Rama propia y sprint unico identificado.
2. [ ] Working tree limpio o con diff estrictamente dentro del scope del sprint.
3. [ ] Lock confirmado si la zona es critica.
4. [ ] Sin secretos, sin `.env`, sin valores de Vercel, sin cambios de billing.
5. [ ] Sin cambios fuera del sprint.
6. [ ] Sin `main`, sin produccion, sin deploy productivo.
7. [ ] Preview/QA proporcional ejecutado o documentado como pendiente real.
8. [ ] Reporte corto listo: objetivo, archivos, validacion, riesgo, stop condition.
9. [ ] Si toca zona critica, el otro fue avisado antes del push.

---

## 11. LOCKS POR DOMINIO

Antes de tocar cualquiera de estos dominios, verificar lock:

| Dominio | Lock requerido | Quien lockea |
|---------|---------------|-------------|
| DB / schema / Prisma / migrations | Doble (Jean + Manuel) | Jean + Manuel |
| Env / Vercel production / domains / billing | Jean gate | Jean |
| Booking `/reservas` | Owner exclusivo | Jean |
| Payment proof / protected media | Doble (Jean + Manuel) | Jean + Manuel |
| Rates / finance / payouts | Doble (Jean + Manuel) | Jean + Manuel |
| Auth / session / admin / SUPER | Doble (Jean + Manuel) | Jean + Manuel |

Si el sprint toca un dominio con lock y el lock no esta confirmado, DETENERSE y reportar el lock faltante.

---

## 12. STOP CONDITIONS UNIVERSALES

Independientemente del sprint, el agente DEBE detenerse si:

1. **CRIT-001:** El sprint requiere tocar secretos o rotar credenciales fuera de S10.
2. **CRIT-002:** El sprint requiere investigar discovery sin acceso a runtime logs.
3. **CRIT-003:** El sprint intenta deploy a produccion sin gate de Jean.
4. **GAP OPERATIVO:** La validacion requiere un `task_id` que no existe en `qa-dispatcher.json`.
5. **LOCK FALTANTE:** El sprint toca un dominio con lock y el lock no esta confirmado.
6. **COLISION:** Otro agente esta ejecutando el mismo sprint o tocando la misma zona critica.
7. **SCHEMA/ENV NO AUTORIZADO:** El fix requiere schema, migration, env change o DB manual sin lock.
8. **BOOKING TOCADO:** El diff incluye archivos de booking `/reservas`.
9. **MAIN TOCADO:** El diff incluye cambios que afectan `main`.
10. **SECRETO EN DIFF:** El diff contiene credenciales, tokens o secretos en texto plano.

---

## 13. REFERENCIAS CRUZADAS

| Documento | Proposito |
|-----------|-----------|
| `docs/obsidian-vault/00_CENTRAL_TURPIAL.md` | Mapa central, estado vivo del proyecto |
| `docs/obsidian-vault/BUS_CONTROL_TURPIAL.md` | Reglas del bus, locks, checklist |
| `docs/obsidian-vault/SPRINTS_CODEV_MARKETPLACE_2026-05-10.md` | Definiciones canonicas de sprints S01-S10 |
| `docs/obsidian-vault/BUGS_CRITICOS.md` | Riesgos activos |
| `docs/obsidian-vault/ROADMAP_RESCATE.md` | Roadmap, items cerrados/pendientes |
| `docs/obsidian-vault/ESTADO_NEGOCIO_TURPIAL_2026-05-10.md` | Estado del negocio |
| `docs/07_handoffs/session-summary-active.md` | Sesion activa, ultimo estado |
| `docs/07_handoffs/next-window-brief.md` | Siguiente ventana recomendada |
| `docs/07_handoffs/qa-dispatcher.json` | Despacho canonico de QA |
| `docs/07_handoffs/qa-canonical-runbook.md` | Narrativa humana de QA (no sustituye al dispatcher) |
| `docs/07_handoffs/AGENT_CONTROL_BUS_RUNNER.md` | Este archivo — prompt universal |

---

## 14. EJEMPLO DE TRABAJO — S01 Manuel

```
OPERATOR=Manuel
SPRINT_ID=S01
MODE=execute
```

### Que hace el agente:

1. Lee `SPRINTS_CODEV_MARKETPLACE_2026-05-10.md` → S01:
   - Owner: Manuel ✓ coincide con OPERATOR
   - Rama: `Manuel/s01-preview-smoke-autonomy-2026-05-10`
   - Base: `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07`
   - Zonas autorizadas: docs, preview deploy, validaciones de runtime, smoke
   - Zonas prohibidas: `app/`, `components/`, `actions/`, `lib/`, `prisma/`, booking, main, prod, env values
   - Validacion: `preview-runtime-guard.ts`, smoke pasivo, `marketplace_login_smoke` si QA envs existen
   - Preview: si, BKG Vercel
   - Push a madre: si (solo docs/reportes)
   - Produccion: NO

2. Verifica guardrails → ok.
3. Crea rama desde base.
4. Despliega preview en BKG Vercel.
5. Ejecuta `preview-runtime-guard.ts`.
6. Smoke HTTP de rutas clave.
7. Si `QA_*` envs existen, ejecuta `marketplace_login_smoke` via dispatcher.
8. Documenta en `session-summary-active.md` y `next-window-brief.md`.
9. Commitea solo docs.
10. Pushea rama.
11. Reporta.

---

## 15. NOTAS FINALES

- Este archivo es el unico punto de entrada que un agente Codex necesita leer.
- Si el agente encuentra una situacion no cubierta por este runner, debe reportarla sin improvisar.
- El dispatcher `qa-dispatcher.json` es la unica fuente de verdad para ejecucion de QA.
- Los archivos en `docs/obsidian-vault/` son la fuente de verdad para estado de negocio, roadmap, bugs y sprints.
- Este runner no autoriza deploy a produccion. Solo Jean con release gate explicito.
- Este runner no autoriza cambios en booking. Booking es zona exclusiva de Jean.
- Los locks son sagrados. Sin lock, no se toca el dominio.
# AGENT CONTROL BUS RUNNER — Turpial Sound Marketplace

> **Version:** 1.0.0
> **Fecha:** 2026-05-10
> **Proposito:** Prompt universal para cualquier agente Codex (Jean o Manuel) que ejecute sprints del Bus de Control Marketplace.
> **Instruccion unica de entrada:** `Lee docs/07_handoffs/AGENT_CONTROL_BUS_RUNNER.md y ejecuta tu carril segun tu rol.`

---

## 0. ENTRADA OBLIGATORIA

Antes de ejecutar cualquier accion, el agente DEBE determinar o preguntar:

```text
OPERATOR=Jean | Manuel
SPRINT_ID=S01 | S02 | S03 | S04 | S05 | S06 | S07 | S08 | S09 | S10
MODE=align | execute | close
```

Si el operador humano no especifica OPERATOR o SPRINT_ID, el agente DEBE preguntar explicitamente antes de continuar. No inferir. No adivinar.

### Significado de MODE

| MODE | Que hace el agente |
|------|-------------------|
| `align` | Solo lee, verifica precondiciones, confirma que el sprint es ejecutable. No modifica nada. No crea rama. Reporta readiness. |
| `execute` | Ejecuta el sprint completo: crea rama, implementa, valida, documenta, commitea, pushea. |
| `close` | Cierra el sprint: actualiza docs de cierre, verifica checklist, reporta resultado final. No vuelve a ejecutar. |

---

## 1. LECTURA DEL ESTADO ESTRATEGICO

El agente DEBE leer en este orden para comprender el contexto antes de ejecutar:

1. `docs/obsidian-vault/00_CENTRAL_TURPIAL.md` — mapa central, rama madre, roles, guardrails
2. `docs/obsidian-vault/BUS_CONTROL_TURPIAL.md` — reglas del bus, locks, checklist de push
3. `docs/obsidian-vault/SPRINTS_CODEV_MARKETPLACE_2026-05-10.md` — definiciones completas de sprints S01-S10
4. `docs/obsidian-vault/BUGS_CRITICOS.md` — riesgos activos que pueden bloquear el sprint
5. `docs/07_handoffs/session-summary-active.md` — estado de la sesion anterior
6. `docs/07_handoffs/next-window-brief.md` — siguiente ventana recomendada

Si alguno de estos archivos no existe o esta desactualizado, el agente debe reportarlo como precondicion fallida.

---

## 2. IDENTIFICACION DE ROL

El agente determina su rol a partir de OPERATOR:

### OPERATOR=Jean

**Zonas autorizadas por defecto:**
- Todo el runtime de marketplace (codevia con Manuel)
- Discovery / listings
- Payment proof / protected media
- Payout / finance / rates
- Integracion, merge a madre
- Docs de su sprint

**Zonas prohibidas:**
- Booking `/reservas` (es su zona, pero solo en sprints de booking — NUNCA en sprints marketplace)
- `main` como base operativa
- Produccion sin release gate explicito
- Envs de Vercel sin documentar
- Schema/migrations sin lock Jean + Manuel
- Zonas activas de Manuel en marketplace: `components/marketplace/dashboard/*`, `lib/marketplace/notifications.ts`, `actions/marketplace/transactions.ts`

**Gate keeper de:**
- Push a `main`
- Deploy a produccion
- Vercel production envs
- Dominios, billing, release config
- Rotacion de secretos
- Rollback

### OPERATOR=Manuel

**Zonas autorizadas por defecto:**
- Marketplace runtime (codevia con Jean)
- QA buyer/seller/admin
- UX operativa, action center, dashboards
- Delivery/receipt flow
- SEO/AEO / discovery publico
- Docs de marketplace, obsidian, handoffs
- Preview BKG desde `Manuel/*`

**Zonas prohibidas:**
- Booking `/reservas`
- `main` como base operativa
- Produccion
- Envs de Vercel production
- Schema/migrations sin lock Jean + Manuel
- Dominios, billing, release config

**Gate keeper de:**
- QA de marketplace
- UX y copy operativo
- Docs de negocio marketplace

---

## 3. DEFINICIONES DE SPRINT (fuente canonica)

Las definiciones completas y actualizadas de cada sprint estan en:
`docs/obsidian-vault/SPRINTS_CODEV_MARKETPLACE_2026-05-10.md`

El agente DEBE leer la entrada de su SPRINT_ID en ese archivo y extraer:

| Campo | Significado |
|-------|-------------|
| Owner principal | Quien ejecuta |
| Segundo par/reviewer | Quien revisa |
| Objetivo de negocio | Que se logra |
| Que avance queda cerrado | Resultado concreto |
| Rama recomendada | Nombre de branch a crear |
| Base branch | De donde partir |
| Zonas autorizadas | Que archivos/carpetas puede tocar |
| Zonas prohibidas | Que NO puede tocar |
| Validacion minima | Que evidencia se requiere |
| Preview requerido | Si necesita preview |
| Push a madre permitido | Si puede integrar a madre |
| Production permitido | Si puede ir a produccion |
| Stop condition | Que detiene el sprint |

---

## 4. RESUMEN RAPIDO DE SPRINTS (referencia)

| Sprint | Owner | Reviewer | Cierre |
|--------|-------|----------|--------|
| S01 | Manuel | Jean | Preview BKG autonomo |
| S02 | Jean | Manuel | Discovery estable o error clasificado |
| S03 | Manuel | Jean | Login QA cerrado |
| S04 | Jean | Manuel | Payment proof protegido validado |
| S05 | Manuel | Jean | Delivery/receipt operativo |
| S06 | Jean | Manuel | Payout admin auditable |
| S07 | Jean | Manuel | Tasas y accounting listos |
| S08 | Manuel | Jean | Action center y UX claros |
| S09 | Manuel | Jean | Discovery publico listo |
| S10 | Jean | Manuel | Release gate de launch |

### Fase A — Autonomia y runtime seguro (S01-S03)
### Fase B — Flujo transaccional critico (S04-S06)
### Fase C — Finanzas, UX y lanzamiento (S07-S10)

### Secuencia

- **Paralelo real:** S01 y S02 pueden arrancar en ventanas distintas.
- **Secuencia critica:** S04 → S05 → S06.
- **S10:** solo cuando S01-S09 esten cerrados.

---

## 5. GUARDRAILS GLOBALES (obligatorio verificar antes de ejecutar)

El agente DEBE verificar estos guardrails antes de cualquier accion:

### Anti-colision
- [ ] El sprint NO esta siendo ejecutado por otro agente simultaneamente.
- [ ] El owner del sprint coincide con OPERATOR.
- [ ] Si el sprint requiere reviewer, el reviewer fue notificado.
- [ ] Si la zona es critica (DB, schema, envs, auth/SUPER, payment proof, rates/finance), el lock Jean + Manuel esta confirmado.

### Anti-corrupcion
- [ ] No se tocara booking `/reservas`.
- [ ] No se usara `main` como base.
- [ ] No se desplegara a produccion sin gate explicito.
- [ ] No se hardcodearan credenciales ni secretos.
- [ ] No se imprimiran valores de env, tokens, URLs con credenciales.
- [ ] No se mezclaran dos sprints en la misma rama.

### Anti-fragmentacion
- [ ] El agente NO pedira prompts fragmentados al operador humano.
- [ ] Si encuentra un bloqueo rojo (stop condition), reportara el bloqueo exacto y se detendra.
- [ ] Si encuentra GAP OPERATIVO (ruta QA no canonica), reportara el gap y se detendra.
- [ ] Si encuentra una dependencia externa no resuelta, la reportara sin improvisar.

---

## 6. FLUJO DE EJECUCION (MODE=execute)

### Paso 1 — Preflight

1. Leer `SPRINTS_CODEV_MARKETPLACE_2026-05-10.md` → extraer definicion del SPRINT_ID.
2. Verificar que OPERATOR coincide con Owner principal del sprint.
3. Verificar guardrails globales (seccion 5).
4. Verificar que la base branch existe en remote.
5. Verificar working tree: si esta sucio fuera de docs permitidos, reportar y detener.

### Paso 2 — Crear rama

```bash
git fetch origin
git checkout -b <rama_recomendada> origin/<base_branch>
```

Si la rama ya existe localmente, preguntar si reusar o crear nueva.

### Paso 3 — Implementar

Ejecutar las tareas del sprint dentro de las zonas autorizadas. Reglas:
- Cero cambios fuera de zonas autorizadas.
- Cero cambios en zonas prohibidas.
- Si el sprint es docs-only, solo tocar archivos `.md` en `docs/`.
- Si el sprint requiere codigo, solo tocar archivos en zonas autorizadas del sprint.

### Paso 4 — Validar

Ejecutar la validacion minima definida en el sprint. Reglas:
- Antes de cualquier QA, resolver `task_id` exacto en `docs/07_handoffs/qa-dispatcher.json`.
- Si la validacion requiere un `task_id` que no existe en el dispatcher, detenerse y reportar `GAP OPERATIVO`.
- Si la validacion requiere un `task_id` que existe, usar la ruta canonica exacta del dispatcher.
- No improvisar metodos de validacion alternos.
- No usar scripts LEGACY o EXPERIMENTAL como primera opcion.

### Paso 5 — Documentar

Actualizar los siguientes archivos con el resultado del sprint:

1. `docs/07_handoffs/session-summary-active.md`
   - Actualizar con: sprint ejecutado, rama, commits, resultado, riesgos, next step.
2. `docs/07_handoffs/next-window-brief.md`
   - Actualizar con: proximo sprint recomendado, estado de guardrails.
3. Si el sprint modifico el estado de riesgos:
   - `docs/obsidian-vault/BUGS_CRITICOS.md`
   - `docs/obsidian-vault/ROADMAP_RESCATE.md`

### Paso 6 — Commit

```bash
git add <archivos del sprint>
git commit -m "<tipo>(<alcance>): <descripcion concisa>"
```

Formato de commit:
- `docs(...):` para cambios documentales
- `fix(marketplace):` para fixes de runtime
- `feat(marketplace):` para features nuevas
- `qa(...):` para scripts o evidencia de QA

Verificar antes de commit:
- [ ] Solo archivos del sprint estan staged.
- [ ] No hay `.env`, secretos, tokens, URLs con credenciales.
- [ ] No hay archivos de booking, schema, migraciones (salvo sprint autorizado).
- [ ] No hay `.obsidian/` staged (workspace local).
- [ ] `git diff --check` limpio.

### Paso 7 — Push

```bash
git push -u origin <rama_recomendada>
```

Reglas:
- Si el sprint permite push a madre, hacer push de la rama de sprint. El merge a madre lo hace el gatekeeper (Jean) o el owner con checklist.
- Si el sprint NO permite push a madre, solo push de la rama de sprint.

### Paso 8 — Reportar

Formato de reporte final (obligatorio):

```markdown
# REPORTE — <SPRINT_ID> <NOMBRE>

- **Operador:** <OPERATOR>
- **Sprint:** <SPRINT_ID>
- **Rama:** <rama_usada>
- **Base:** <base_branch> @ <commit>
- **Archivos modificados:** <lista>
- **Resultado:** <exito | bloqueado | gap>
- **Validacion:** <evidencia>
- **Riesgos:** <nuevos o actualizados>
- **Proximo sprint:** <SPRINT_ID recomendado>
- **Commit:** <hash>
- **Push:** <status>
```

---

## 7. FLUJO DE ALINEACION (MODE=align)

Solo lectura. No modifica nada. No crea rama.

1. Leer `SPRINTS_CODEV_MARKETPLACE_2026-05-10.md` → extraer definicion.
2. Verificar que OPERATOR coincide con Owner.
3. Verificar guardrails globales.
4. Verificar que la base branch existe.
5. Verificar precondiciones del sprint.
6. Reportar:

```markdown
# ALINEACION — <SPRINT_ID>

- **Precondiciones:** <ok | falla: X>
- **Base branch existe:** <si | no>
- **Zonas autorizadas:** <ok>
- **Zonas prohibidas:** <ok>
- **Stop conditions presentes:** <ninguna | X>
- **Dependencias externas:** <resueltas | pendiente: X>
- **Listo para execute:** <si | no>
- **Bloqueantes:** <lista si aplica>
```

---

## 8. FLUJO DE CIERRE (MODE=close)

Cierre administrativo. No re-ejecuta el sprint.

1. Leer `session-summary-active.md` para recuperar el estado del sprint.
2. Verificar que el sprint fue ejecutado (commits existen).
3. Actualizar `ROADMAP_RESCATE.md` marcando el sprint como cerrado.
4. Actualizar `next-window-brief.md` apuntando al siguiente sprint.
5. Si el sprint cerro un riesgo, actualizar `BUGS_CRITICOS.md`.
6. Reportar cierre:

```markdown
# CIERRE — <SPRINT_ID>

- **Commits asociados:** <hashes>
- **Rama:** <rama>
- **Validacion final:** <evidencia>
- **Riesgos cerrados:** <lista>
- **Riesgos abiertos remanentes:** <lista>
- **Proximo sprint:** <SPRINT_ID>
```

---

## 9. REGLAS DE QA CANONICO

Fuente de despacho obligatoria: `docs/07_handoffs/qa-dispatcher.json`

### Procedimiento

1. Identificar el `task_id` requerido por el sprint.
2. Buscar `task_id` en `qa-dispatcher.json`.
3. Si el `task_id` NO existe → detenerse y reportar `GAP OPERATIVO`. No improvisar.
4. Si el `task_id` existe:
   - Usar `canonical_script` si mode es `script`.
   - Seguir `canonical_manual_route` si mode es `manual_preview`.
   - Verificar `preconditions` — si alguna falla, corregir solo la precondicion documentada.
   - No usar `allowed_fallbacks` como primera opcion.
   - NUNCA usar metodos listados en `forbidden_fallbacks`.

### Task IDs disponibles (al 2026-05-10)

| task_id | Modo | Script canonico |
|---------|------|----------------|
| `qa_accounts_normalization` | script | `npx tsx scripts/setup-marketplace-qa-accounts.ts` |
| `marketplace_login_smoke` | script | `node scripts/qa-marketplace-login-smoke.mjs` |
| `buyer_seller_admin_smoke` | script | `node scripts/qa-marketplace-qa-accounts.mjs` |
| `seller_publish_blob_public_preview` | manual_preview | N/A — manual |
| `payment_proof_sensitive_preview` | manual_preview | N/A — manual |
| `admin_local_smoke` | script | `node scripts/qa-marketplace-admin-smoke.mjs` |
| `buyer_only_short` | script | `node scripts/qa-marketplace-buyer.mjs` |
| `seller_shell_local` | script | `node scripts/qa-marketplace-seller-smoke.mjs` |
| `reconcile_read_only` | script | `node scripts/qa-marketplace-reconcile.mjs` |

---

## 10. CHECKLIST MINIMO ANTES DE PUSH A MADRE

Si el sprint permite push a madre (ver definicion del sprint), verificar:

1. [ ] Rama propia y sprint unico identificado.
2. [ ] Working tree limpio o con diff estrictamente dentro del scope del sprint.
3. [ ] Lock confirmado si la zona es critica.
4. [ ] Sin secretos, sin `.env`, sin valores de Vercel, sin cambios de billing.
5. [ ] Sin cambios fuera del sprint.
6. [ ] Sin `main`, sin produccion, sin deploy productivo.
7. [ ] Preview/QA proporcional ejecutado o documentado como pendiente real.
8. [ ] Reporte corto listo: objetivo, archivos, validacion, riesgo, stop condition.
9. [ ] Si toca zona critica, el otro fue avisado antes del push.

---

## 11. LOCKS POR DOMINIO

Antes de tocar cualquiera de estos dominios, verificar lock:

| Dominio | Lock requerido | Quien lockea |
|---------|---------------|-------------|
| DB / schema / Prisma / migrations | Doble (Jean + Manuel) | Jean + Manuel |
| Env / Vercel production / domains / billing | Jean gate | Jean |
| Booking `/reservas` | Owner exclusivo | Jean |
| Payment proof / protected media | Doble (Jean + Manuel) | Jean + Manuel |
| Rates / finance / payouts | Doble (Jean + Manuel) | Jean + Manuel |
| Auth / session / admin / SUPER | Doble (Jean + Manuel) | Jean + Manuel |

Si el sprint toca un dominio con lock y el lock no esta confirmado, DETENERSE y reportar el lock faltante.

---

## 12. STOP CONDITIONS UNIVERSALES

Independientemente del sprint, el agente DEBE detenerse si:

1. **CRIT-001:** El sprint requiere tocar secretos o rotar credenciales fuera de S10.
2. **CRIT-002:** El sprint requiere investigar discovery sin acceso a runtime logs.
3. **CRIT-003:** El sprint intenta deploy a produccion sin gate de Jean.
4. **GAP OPERATIVO:** La validacion requiere un `task_id` que no existe en `qa-dispatcher.json`.
5. **LOCK FALTANTE:** El sprint toca un dominio con lock y el lock no esta confirmado.
6. **COLISION:** Otro agente esta ejecutando el mismo sprint o tocando la misma zona critica.
7. **SCHEMA/ENV NO AUTORIZADO:** El fix requiere schema, migration, env change o DB manual sin lock.
8. **BOOKING TOCADO:** El diff incluye archivos de booking `/reservas`.
9. **MAIN TOCADO:** El diff incluye cambios que afectan `main`.
10. **SECRETO EN DIFF:** El diff contiene credenciales, tokens o secretos en texto plano.

---

## 13. REFERENCIAS CRUZADAS

| Documento | Proposito |
|-----------|-----------|
| `docs/obsidian-vault/00_CENTRAL_TURPIAL.md` | Mapa central, estado vivo del proyecto |
| `docs/obsidian-vault/BUS_CONTROL_TURPIAL.md` | Reglas del bus, locks, checklist |
| `docs/obsidian-vault/SPRINTS_CODEV_MARKETPLACE_2026-05-10.md` | Definiciones canonicas de sprints S01-S10 |
| `docs/obsidian-vault/BUGS_CRITICOS.md` | Riesgos activos |
| `docs/obsidian-vault/ROADMAP_RESCATE.md` | Roadmap, items cerrados/pendientes |
| `docs/obsidian-vault/ESTADO_NEGOCIO_TURPIAL_2026-05-10.md` | Estado del negocio |
| `docs/07_handoffs/session-summary-active.md` | Sesion activa, ultimo estado |
| `docs/07_handoffs/next-window-brief.md` | Siguiente ventana recomendada |
| `docs/07_handoffs/qa-dispatcher.json` | Despacho canonico de QA |
| `docs/07_handoffs/qa-canonical-runbook.md` | Narrativa humana de QA (no sustituye al dispatcher) |
| `docs/07_handoffs/AGENT_CONTROL_BUS_RUNNER.md` | Este archivo — prompt universal |

---

## 14. EJEMPLO DE TRABAJO — S01 Manuel

```
OPERATOR=Manuel
SPRINT_ID=S01
MODE=execute
```

### Que hace el agente:

1. Lee `SPRINTS_CODEV_MARKETPLACE_2026-05-10.md` → S01:
   - Owner: Manuel ✓ coincide con OPERATOR
   - Rama: `Manuel/s01-preview-smoke-autonomy-2026-05-10`
   - Base: `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07`
   - Zonas autorizadas: docs, preview deploy, validaciones de runtime, smoke
   - Zonas prohibidas: `app/`, `components/`, `actions/`, `lib/`, `prisma/`, booking, main, prod, env values
   - Validacion: `preview-runtime-guard.ts`, smoke pasivo, `marketplace_login_smoke` si QA envs existen
   - Preview: si, BKG Vercel
   - Push a madre: si (solo docs/reportes)
   - Produccion: NO

2. Verifica guardrails → ok.
3. Crea rama desde base.
4. Despliega preview en BKG Vercel.
5. Ejecuta `preview-runtime-guard.ts`.
6. Smoke HTTP de rutas clave.
7. Si `QA_*` envs existen, ejecuta `marketplace_login_smoke` via dispatcher.
8. Documenta en `session-summary-active.md` y `next-window-brief.md`.
9. Commitea solo docs.
10. Pushea rama.
11. Reporta.

---

## 15. NOTAS FINALES

- Este archivo es el unico punto de entrada que un agente Codex necesita leer.
- Si el agente encuentra una situacion no cubierta por este runner, debe reportarla sin improvisar.
- El dispatcher `qa-dispatcher.json` es la unica fuente de verdad para ejecucion de QA.
- Los archivos en `docs/obsidian-vault/` son la fuente de verdad para estado de negocio, roadmap, bugs y sprints.
- Este runner no autoriza deploy a produccion. Solo Jean con release gate explicito.
- Este runner no autoriza cambios en booking. Booking es zona exclusiva de Jean.
- Los locks son sagrados. Sin lock, no se toca el dominio.
