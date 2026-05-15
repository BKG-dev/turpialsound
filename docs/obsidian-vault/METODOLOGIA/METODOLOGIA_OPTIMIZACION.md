---
tags: ["#central", "#methodology", "#optimization", "#status/live-source"]
fecha: 2026-05-12
metodologia: Oreshnik + Bus de Control Nivel 2.5
---

# METODOLOGÍA ORESHNIK + BUS DE CONTROL — ANÁLISIS Y OPTIMIZACIÓN

## Sección 1: Evaluación del Modelo Actual

### 1.1 Lo que funciona bien

**Sistema de locks por dominio.** La matriz de locks de 9 capas (`BUS_CONTROL_TURPIAL.md:101-114`) es el mecanismo más sólido de la metodología. Lock doble para DB/schema, propietario exclusivo para booking, Jean-gate para producción — esto previene colisiones catastróficas con cero ambigüedad sobre quién puede tocar qué.

**QA dispatcher como fuente canónica de verdad.** `qa-dispatcher.json` define rutas exactas de scripts, precondiciones, fallbacks permitidos y métodos prohibidos. Esto elimina la ambigüedad de "¿qué script QA debo ejecutar?" que plagó fases anteriores. La arquitectura de capas A-B-C-D (preflight → server-side → browser smoke → E2E) proporciona validación proporcional.

**Push gating basado en checklist.** El checklist de 9 items antes de hacer push a madre (`BUS_CONTROL_TURPIAL.md:90-99`) impone disciplina: no secretos, no contaminación entre sprints, no deploy a producción. El integration gatekeeper añade la máquina de estados `LISTA_PARA_REVIEW`/`LISTA_PARA_MERGE`.

**Reglas de reasignación de sprints.** El protocolo de 6 reglas para indisponibilidad de operadores (`BUS_CONTROL_TURPIAL.md:134-143`) maneja conflictos de horario reales limpiamente. Renombrado de rama, notificación en CENTRAL_TURPIAL y handoff documentado previenen trabajo huérfano.

**Aislamiento multi-worktree.** El proyecto usa worktrees físicos de git (8 visibles en disco) para que los agentes nunca compartan el mismo directorio de trabajo. Esto elimina problemas de bloqueo de archivos a nivel de sistema operativo.

**Límites claros de roles.** Jean es dueño de producción/facturación/booking. Manuel es dueño de QA/UX/producto marketplace. Ninguno puede cruzar sin lock explícito.

### 1.2 Lo que genera fricción

**Pre-flight ahora automatizado (v3.0).** `scripts/oreshnik/preflight.mjs` ejecuta automaticamente: validacion de guardrails, comprobacion de rama base, limpieza de worktree, creacion de rama via `--sprint --operator --desc`, y evaluacion de salud del contexto. Lo que antes tomaba ~5 minutos de carga manual ahora es un solo comando. El preflight v3.0 gestiona branching automatico desde ramas madre y sugiere compaction/clear cuando el contexto se degrada.

**Oreshnik orchestrator es solo diseño.** `ORESHNIK_ORCHESTRATOR_DESIGN.md` describe `scripts/oreshnik/` con subdirectorios prompts, logs, runs, y el runner `oreshnik.ps1` — nada de esto existe. El directorio `scripts/oreshnik/` está vacío. Toda la automatización init → validate → execute → log → checkpoint es vaporware.

**Worktrees obsoletos de sprints cerrados.** Seis de ocho worktrees corresponden a sub-sprints S01/S03 que fueron cerrados y mergeados hace semanas. Consumen espacio en disco y crean confusión sobre qué está "activo".

**Scripts faltantes en el dispatcher canónico.** Tres task_ids en `qa-dispatcher.json` están anotados como `MISSING on disk — GAP OPERATIVO`: `admin_local_smoke`, `buyer_only_short`, `reconcile_read_only`. Son referenciados por los sprints pero los scripts no existen. Las notas del dispatcher dicen "reemplazar con QA-07, QA-05/06, QA-10" — pero los mapeos son inconsistentes entre las entradas legacy y sus reemplazos.

**Duplicación y drift de documentación.** La misma información vive en al menos 5 lugares: `BUS_CONTROL_TURPIAL.md`, `AGENT_CONTROL_BUS_RUNNER.md`, `SPRINTS_CODEV_MARKETPLACE_2026-05-10.md`, `PLAN_MAESTRO_SPRINTS_2026-05-12.md` y `00_CENTRAL_TURPIAL.md`. Locks, roles, reglas de checkpoint y definiciones de sprints están repetidas en todos. Cuando uno se actualiza, los otros quedan atrasados. Ejemplo: `BUS_CONTROL_TURPIAL.md` referencia `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07` como rama madre, pero `00_CENTRAL_TURPIAL.md` referencia `RAMA MADRE` — dos nombres de rama madre diferentes para el mismo código.

**Sobrecarga de reportes de cierre.** Cada cierre de sprint requiere actualizar manualmente `session-summary-active.md`, `next-window-brief.md`, `ROADMAP_RESCATE.md`, opcionalmente `BUGS_CRITICOS.md`, y escribir un reporte estructurado. Esto es overhead puro — el git log ya contiene commits, archivos tocados y autor. La plantilla de reporte podría auto-generarse.

**Hinchazón de contexto.** El AGENT_CONTROL_BUS_RUNNER instruye a los agentes a leer 6 documentos completos antes de cualquier acción. `PLAN_MAESTRO_SPRINTS_2026-05-12.md` tiene 964 líneas. Un agente ejecutando S12 no necesita 800 líneas sobre Booking, Crecimiento, Admin-Legal y UI. La mayoría del contexto es irrelevante por sprint.

**Cero automatización pre-commit o pre-push.** El directorio `.husky/` no existe. Hay cero git hooks. El checklist de 9 items pre-push es completamente manual — un agente puede olvidar verificar exclusiones `.env`, saltarse QA, o hacer push a producción sin guarda automatizada.

**Sin detección de colisiones.** Las reglas anti-colisión dicen "no trabajes en el mismo archivo" pero no hay un mapa de zonas legible por máquina. Dos agentes iniciando S12 y S-JB-01 en paralelo tienen que verificar manualmente que no colisionarán — dependiendo de memoria humana sobre qué archivos pertenecen a qué dominio.

**Sin automatización de notificación o dashboard.** Cuando un sprint se cierra, nada se actualiza automáticamente. `00_CENTRAL_TURPIAL.md` y `PLAN_MAESTRO_SPRINTS_2026-05-12.md` deben editarse manualmente. El otro operador tiene que revisar estos archivos para saber qué cambió.

### 1.3 Brechas Identificadas

| Brecha | Impacto | Severidad |
|--------|---------|-----------|
| Sin validación pre-flight automatizada | Los agentes pierden tiempo re-verificando manualmente; vars de entorno faltantes se descubren a mitad del sprint | Alta |
| Oreshnik orchestrator no construido | Sin checkpointing automatizado, sin manifiestos de ejecución, sin capacidad de halt | Alta |
| Sin mapa de zonas archivo→sprint | La detección de colisiones es completamente manual y propensa a errores | Alta |
| Drift del nombre de rama madre entre documentos | Ambigüedad sobre cuál rama es la madre canónica | Media |
| Worktrees obsoletos no auto-limpiados | Desperdicio de disco, confusión sobre trabajo activo | Media |
| Tres task_ids de QA son GAP OPERATIVO con mapeos de reemplazo inconsistentes | Un agente que encuentre uno de estos a mitad del sprint se detendrá en seco | Media |
| Sin scaffolding automatizado de sprints | Cada sprint requiere creación manual de rama + copia de plantilla + bootstrap de entorno | Media |
| Sin auto-deploy de preview Vercel por rama de sprint | La validación visual requiere deploy manual o ejecutar la app localmente | Media |
| Reportes de cierre completamente manuales | ~10 minutos de documentación por sprint que podrían automatizarse | Baja |
| Sin matriz de seguridad de consolas paralelas | Los operadores no pueden evaluar rápidamente si dos sprints son seguros de ejecutar simultáneamente | Baja |

---

## Sección 2: Optimizaciones Específicas

### 2.1 Automatización de Pre-flight

**Qué:** Auto-ejecutar los scripts doctor/bootstrap como git hooks pre-commit y pre-push en lugar de requerir invocación manual al inicio de cada sprint.

**Por qué:** El modelo actual requiere que el agente u operador ejecute manualmente:
```
powershell -ExecutionPolicy Bypass -File scripts/qa/ensure-marketplace-qa-env.ps1
npx tsx scripts/qa/doctor-marketplace-qa-env.mjs
```
cada vez que inician un nuevo sprint. Estos scripts validan que DATABASE_URL, credenciales QA y APP_URL existan y sean accesibles. Si faltan, el sprint falla a mitad de ejecución en lugar de antes de empezar. Automatizar esto como hook pre-commit significa que ningún commit sale de la máquina sin entorno validado.

**Cómo implementar:**
1. Crear `.husky/pre-commit` (instalar `husky` o usar un `.git/hooks/pre-commit` plano):
   ```bash
   #!/bin/bash
   # Turpial pre-flight: validar vars de entorno antes del commit
   node scripts/qa/doctor-marketplace-qa-env.mjs || {
     echo "Pre-flight falló. Ejecuta: powershell -File scripts/qa/ensure-marketplace-qa-env.ps1"
     exit 1
   }
   ```
2. Crear `.husky/pre-push`:
   ```bash
   #!/bin/bash
   # Turpial pre-push: verificar no .env, no secretos, no deploy a producción
   git diff --check origin/$(git rev-parse --abbrev-ref HEAD)..HEAD
   # Verificar que no hay archivos .env en el diff
   if git diff --name-only HEAD | grep -q '\.env'; then
     echo "BLOQUEADO: archivos .env en el diff. Elimínalos antes de push."
     exit 1
   fi
   # Verificar que no hay archivos de booking si es un sprint de marketplace
   if git diff --name-only HEAD | grep -q '/reservas/'; then
     echo "BLOQUEADO: archivos /reservas en el diff. Booking requiere lock explícito."
     exit 1
   fi
   ```
3. Crear `scripts/oreshnik/preflight-check.ps1` como script standalone que ejecuta: doctor env → `pnpm lint` → `npx tsc --noEmit` → reporta estado.

**Impacto esperado:** Elimina ~5 minutos de pre-flight manual por sprint. Detecta vars de entorno faltantes, errores de lint, y errores de tipo antes del commit, no después. Previene el modo de falla más común: descubrir DATABASE_URL faltante a mitad de la implementación.

**Riesgo:** Los hooks pre-commit pueden evadirse con `--no-verify`. La metodología ya prohíbe esto; el hook es defensa en profundidad.

---

### 2.2 Detección de Colisiones mediante Mapa de Zonas

**Qué:** Un archivo JSON legible por máquina que mapea cada archivo y directorio del proyecto al sprint(s) y track(s) que pueden tocarlo. Antes de que un agente empiece a trabajar o haga push, un script consulta este mapa para detectar si dos ramas activas colisionarían en los mismos archivos.

**Por qué:** Actualmente el Bus de Control dice "no trabajes en el mismo archivo" pero no proporciona ninguna herramienta para verificarlo. Con 27 sprints en 5 tracks, la verificación manual es impráctica. Ejemplo de riesgo de colisión: S15 (location filters) toca `components/marketplace/` mientras S14B (shopping cart) toca `components/marketplace/MarketplaceCard.tsx` — nadie lo sabe a menos que busque cada archivo.

**Cómo implementar:**
1. Crear `docs/07_handoffs/zone-map.json`:
   ```json
   {
     "zones": {
       "app/(public)/marketplace/**": {
         "track": "T1", "sprints": ["S09","S15","S20"], "criticality": "normal", "lock": "owner_per_sprint"
       },
       "app/(public)/reservas/**": {
         "track": "T2", "sprints": ["S-JB-01","S-JB-02","S-JB-03","S-JB-04"], "criticality": "critical", "lock": "jean_exclusive"
       },
       "prisma/schema.prisma": {
         "track": "any", "sprints": [], "criticality": "critical", "lock": "double_jean_manuel"
       },
       "prisma/migrations/**": {
         "track": "any", "sprints": [], "criticality": "critical", "lock": "double_jean_manuel"
       },
       "components/marketplace/**": {
         "track": "T1", "sprints": ["S14B","S15","S16","S17","S-UX-01","S-UX-02"], "criticality": "normal", "lock": "owner_per_sprint"
       },
       "app/api/marketplace/payment-proofs/**": {
         "track": "T1", "sprints": ["S04","S13"], "criticality": "critical", "lock": "double_jean_manuel"
       },
       "app/api/marketplace/rates/**": {
         "track": "T1", "sprints": ["S07"], "criticality": "critical", "lock": "double_jean_manuel"
       },
       "docs/**": {
         "track": "any", "sprints": ["*"], "criticality": "low", "lock": "light"
       },
       "scripts/qa/**": {
         "track": "any", "sprints": ["S03","S11","S12","S18"], "criticality": "normal", "lock": "owner_per_sprint"
       }
     }
   }
   ```
2. Crear `scripts/oreshnik/zone-check.ps1`:
   ```powershell
   # Uso: ./zone-check.ps1 -Sprint S14B
   # Lee zone-map.json, imprime "SEGURO" o "COLISIÓN: <archivo> con <sprint>"
   param([string]$Sprint)
   # 1. Resolver zonas del sprint desde zone-map.json
   # 2. Git diff de la rama actual → listar archivos tocados
   # 3. Verificar cada archivo tocado contra zone-map por sprints conflictivos
   # 4. Reportar colisiones
   ```
3. Ejecutar como hook pre-push: si el diff toca una zona bloqueada por otro sprint activo, bloquear el push y reportar la colisión.

**Impacto esperado:** Elimina el modo de falla "no sabíamos que tocamos el mismo archivo". Habilita trabajo paralelo real con confianza. Reduce bloqueos de sprints relacionados con locks al detectar conflictos antes de que el trabajo comience.

**Esfuerzo:** Medio. Escribir el mapa de zonas es el grueso del trabajo (~60 zonas a catalogar). El script verificador son ~50 líneas de PowerShell.

---

### 2.3 Scaffolding Automatizado de Sprints

**Qué:** Un solo script PowerShell `scripts/oreshnik/scaffold-sprint.ps1` que, dado un ID de sprint y nombre de operador, crea la rama desde madre, aplica la plantilla del sprint, inicializa las vars de entorno `QA_*` y abre el worktree — todo en un solo comando.

**Por qué:** Actualmente iniciar un sprint requiere:
1. `git fetch origin`
2. `node scripts/oreshnik/preflight.mjs --sprint S12 --operator Manuel --desc "..."` (preflight v3.0 automatiza este paso) 
3. Ejecutar `ensure-marketplace-qa-env.ps1` si faltan credenciales
4. Ejecutar `doctor-marketplace-qa-env.mjs` para verificar
5. Verificar manualmente las 4 categorías de guardrail del BUS runner
6. Leer 6+ documentos para contexto

Son 6 pasos manuales que podrían ser un solo comando.

**Cómo implementar:**
```powershell
# scripts/oreshnik/scaffold-sprint.ps1
param(
  [Parameter(Mandatory)] [string]$SprintId,   # ej. "S12"
  [Parameter(Mandatory)] [string]$Operator,    # "Jean" | "Manuel"
  [string]$BaseBranch = "RAMA MADRE",
  [string]$AppUrl = "https://turpialsound-5qwhe7is1-bkgs-projects-829c67c1.vercel.app"
)
# 1. Validar que el sprint existe en PLAN_MAESTRO
# 2. Verificar que el operador es el owner (o fallback válido)
# 3. Verificar que no hay worktree activo para este sprint
# 4. Verificar que la rama madre existe: git fetch origin
# 5. Crear rama: git checkout -b $Operator/$sprintName-$date origin/$BaseBranch
# 6. Crear worktree: git worktree add ../$worktreeName $branchName
# 7. Ejecutar ensure-marketplace-qa-env.ps1 en el nuevo worktree
# 8. Ejecutar doctor-marketplace-qa-env.mjs en el nuevo worktree
# 9. Ejecutar zone-check.ps1 para verificar que no hay colisiones
# 10. Imprimir estado listo: rama, ruta del worktree, próximos pasos
```

**Impacto esperado:** Reduce el inicio de sprint de ~10 minutos a ~30 segundos. Elimina errores de copiar/pegar en nombres de rama. Garantiza que el pre-flight siempre se ejecuta.

**Riesgo:** Debe validar que la plantilla del sprint existe antes de hacer scaffold. El script debe negarse a hacer scaffold de un sprint que ya está en progreso o cuyas dependencias no están cumplidas.

---

### 2.4 Implementación del Runner Oreshnik

**Qué:** Construir `scripts/oreshnik/oreshnik.ps1` exactamente como está diseñado en `ORESHNIK_ORCHESTRATOR_DESIGN.md` — un orquestador central que gestiona ciclos `init → validate → execute → log → checkpoint` con puertas human-in-the-loop.

**Por qué:** El documento de diseño existe pero se escribió cero código. El directorio `scripts/oreshnik/` está vacío. Sin el runner, cada agente reinventa su propio bucle de ejecución — sin logging estandarizado, sin pausa de checkpoint, sin capacidad de halt. Esta es la brecha más grande entre diseño e implementación.

**Cómo implementar:**
1. Crear la estructura de directorios:
   ```
   scripts/oreshnik/
   ├── prompts/         # Archivos de prompt con frontmatter (id, agent, sprint)
   ├── logs/            # Logs de ejecución por run
   ├── runs/            # Manifiestos de ejecución (YYYYMMDD-HHMM.json)
   └── oreshnik.ps1     # Runner principal
   ```
2. Implementar `oreshnik.ps1` con comandos:
   - `./oreshnik.ps1 scaffold --sprint S12 --operator Manuel` (llama a scaffold-sprint.ps1)
   - `./oreshnik.ps1 run --sprint S12 --mode execute` (lee definición del sprint, ejecuta pre-flight, ejecuta, loguea)
   - `./oreshnik.ps1 align --sprint S12` (verificación de precondiciones solo lectura, sin modificaciones)
   - `./oreshnik.ps1 close --sprint S12` (genera reporte de cierre, actualiza docs)
   - `./oreshnik.ps1 status` (muestra estado de ejecución activa)
   - `./oreshnik.ps1 halt` (detiene cualquier proceso en ejecución)
   - `./oreshnik.ps1 cleanup` (elimina worktrees obsoletos de sprints cerrados)
3. Cada ejecución crea un manifiesto:
   ```json
   {
     "timestamp": "2026-05-12T23:00:00-04:00",
     "sprint": "S12",
     "operator": "Manuel",
     "mode": "execute",
     "status": "in_progress",
     "steps": [
       { "id": "preflight", "status": "pass", "log": "logs/S12-20260512-2300/preflight.log" },
       { "id": "branch_create", "status": "pass", "log": "..." },
       { "id": "implement", "status": "pending", "log": null },
       { "id": "validate", "status": "pending", "log": null },
       { "id": "document", "status": "pending", "log": null },
       { "id": "commit", "status": "pending", "log": null },
       { "id": "push", "status": "pending", "log": null }
     ]
   }
   ```
4. Puertas human-in-the-loop: Antes de cualquier `git commit` o `git push`, oreshnik se detiene y espera confirmación. El operador escribe `continue` o `halt` en la consola.

**Impacto esperado:** La ganancia de eficiencia más grande. Estandariza el bucle de ejecución que todo sprint sigue. Crea rastro de auditoría (manifiestos de ejecución) para cada sprint. Habilita reanudabilidad — si una sesión crashea, el manifiesto de ejecución indica exactamente qué paso estaba activo.

**Esfuerzo:** Alto. ~200 líneas de PowerShell para el núcleo del runner, más integración con scripts de scaffold/preflight/QA/zone-check. 2-3 horas de implementación.

---

### 2.5 CI/CD-lite con Previews de Vercel

**Qué:** Auto-desplegar cada rama de sprint a una URL preview única de Vercel (ej. `turpialsound-s12-manuel.vercel.app`) para validación visual inmediata sin build local.

**Por qué:** Cada sprint en la metodología especifica "Preview requerido: sí". Actualmente, la validación de preview significa:
- Desplegar manualmente al preview BKG central (sobrescribiendo lo que había)
- Ejecutar `next dev` localmente

El deploy manual a preview compartido crea una condición de carrera — dos operadores desplegando ramas diferentes se sobrescriben mutuamente. El auto-preview por rama elimina ambos problemas.

**Cómo implementar:**
1. Configurar Vercel Git integration para auto-desplegar todas las ramas que coincidan con `Jean/*` y `Manuel/*` a entornos preview.
2. Añadir un comentario en el flujo de PR/merge que enlace a la URL del preview.
3. Añadir al `zone-map.json` un campo `vercel_preview_url` por sprint, poblado automáticamente.
4. El runner oreshnik lee la URL del preview y la reporta en el manifiesto de ejecución.

**Impacto esperado:** Cada sprint recibe validación visual aislada y sin conflictos. Elimina el problema de coordinación "¿quién desplegó al preview?". Reduce la necesidad de servidor Next.js dev local.

**Riesgo:** Las URLs de preview exponen trabajo en progreso públicamente. El preview BKG actual ya es público, así que esto no es un riesgo nuevo. Las vars de entorno sensibles deben estar correctamente delimitadas por preview (ya manejado por Vercel).

---

### 2.6 Reportes de Cierre Automatizados

**Qué:** Generar reportes de cierre de sprint automáticamente desde `git log`, resultados de tests e información del mapa de zonas, en lugar de escribirlos manualmente en `session-summary-active.md`, `next-window-brief.md` y la plantilla de reporte markdown.

**Por qué:** El flujo de cierre (AGENT_CONTROL_BUS_RUNNER Sección 8) requiere actualizar manualmente 3-4 documentos más escribir un reporte estructurado. Git ya conoce la rama, commits, archivos tocados y timestamps. Los scripts de test ya producen salida PASS/FAIL. El reporte de cierre es esencialmente una consulta sobre datos que ya existen.

**Cómo implementar:**
1. Crear `scripts/oreshnik/generate-closure-report.ps1`:
   ```powershell
   param([string]$SprintId)
   # 1. git log en la rama del sprint → extraer commits, hashes, archivos
   # 2. Parsear stdout/logs de QA → extraer conteos PASS/FAIL
   # 3. zone-map.json → extraer zonas tocadas, locks verificados
   # 4. Generar reporte markdown siguiendo la plantilla canónica
   # 5. Opcionalmente: auto-actualizar session-summary-active.md
   ```
2. La plantilla de reporte de `AGENT_CONTROL_BUS_RUNNER.md:262-276` ya está bien definida — el script llena los espacios en blanco.
3. El operador revisa y aprueba antes de que el reporte sea commiteado (human-in-the-loop).

**Impacto esperado:** Reduce el overhead de cierre de ~10 minutos a ~30 segundos. Elimina errores de copiar/pegar en campos del reporte. Garantiza formato consistente en todos los cierres de sprint.

---

### 2.7 Optimización de Tokens/Contexto

**Qué:** Precargar solo los archivos relevantes para un sprint específico en lugar de requerir que los agentes lean el `PLAN_MAESTRO_SPRINTS_2026-05-12.md` completo (964 líneas), los 6 documentos del BUS runner y cada referencia cruzada.

**Por qué:** El AGENT_CONTROL_BUS_RUNNER instruye a los agentes a leer 6 documentos completos antes de cualquier acción. Un agente ejecutando S12 (Playwright purchase flow browser E2E) recibe ~1500 líneas de contexto, 80% de las cuales son sobre Booking, Legal, Marketing y otros tracks irrelevantes para la tarea. Esto desperdicia tanto tokens como carga cognitiva — el agente es más propenso a pasar por alto restricciones relevantes enterradas en el ruido.

**Cómo implementar:**
1. Crear archivos de contexto por sprint: `docs/07_handoffs/sprint-context/S12.json`
   ```json
   {
     "sprint": "S12", "track": "T1", "owner": "Manuel",
     "branch": "Manuel/s12-purchase-flow-browser-2026-05-12",
     "base": "RAMA MADRE",
     "depends_on": ["S11"],
     "zonas_autorizadas": ["scripts/qa/playwright/**", "scripts/qa/fixtures/**", "var/qa-results/s12-*/**", "docs/07_handoffs/**"],
     "zonas_prohibidas": ["app/", "components/", "actions/", "lib/", "prisma/", "app/(public)/reservas/**", "app/api/marketplace/payment-proofs/**"],
     "locks_requeridos": [],
     "validacion": { "task_id": "qa_full_regression", "canonical_script": "npx tsx scripts/qa/run-marketplace-qa.mjs" },
     "stop_conditions": ["Booking files in diff", "Schema/migration required", "Secret in diff"],
     "relevant_docs": ["docs/07_handoffs/next-window-brief.md", "scripts/qa/playwright/login.mjs"]
   }
   ```
2. Modificar AGENT_CONTROL_BUS_RUNNER paso 1: en lugar de leer 6 documentos generales, leer el archivo de contexto específico del sprint. El archivo de contexto es pre-generado desde `zone-map.json` + definiciones de sprint.
3. Implementar `scripts/oreshnik/sprint-context.ps1 --sprint S12` que auto-genera el archivo de contexto desde zone-map y definiciones de sprint.

**Impacto esperado:** Reduce el consumo de ventana de contexto en ~70% por sprint. El agente recibe exactamente lo que necesita — zonas, locks, validación, condiciones de parada — sin ruido de otros tracks. Reduce la probabilidad de violaciones de restricciones causadas por sobrecarga de información.

**Esfuerzo:** Medio-bajo. Requiere generar archivos de contexto una vez por sprint. Puede ser parte del paso de scaffold.

---

### 2.8 Sistema de Notificación (Auto-Actualización del Dashboard)

**Qué:** Cuando un sprint se cierra, auto-actualizar `00_CENTRAL_TURPIAL.md` y notificar a los colaboradores tocando un archivo marcador que los sistemas de ambos operadores puedan detectar. Implementación simple: un hook git post-commit que escribe un marcador, y un script de dashboard que lo lee.

**Por qué:** Actualmente, cuando un operador cierra un sprint, el otro operador tiene cero notificación. Descubren el cambio de estado leyendo manualmente `00_CENTRAL_TURPIAL.md` o `next-window-brief.md`. En la práctica, esto significa que el estado se vuelve obsoleto y ambos operadores pueden empezar a planificar sprints basados en información desactualizada.

**Cómo implementar (versión ligera):**
1. `scripts/oreshnik/update-dashboard.ps1`:
   ```powershell
   param([string]$SprintId, [string]$NewStatus)
   # 1. Leer 00_CENTRAL_TURPIAL.md
   # 2. Actualizar fila de tabla del sprint para $SprintId: cambiar 🔴 PENDIENTE → ✅ CERRADO
   # 3. Actualizar PLAN_MAESTRO_SPRINTS_2026-05-12.md de manera similar
   # 4. Escribir marcador: var/sprint-events/$(Get-Date -Format 'yyyyMMdd-HHmmss')_$SprintId_$NewStatus.json
   # 5. Commitear ambas actualizaciones del dashboard
   ```
2. El archivo marcador `var/sprint-events/` sirve como registro de eventos. Las máquinas de ambos operadores ejecutan `oreshnik.ps1 status` para ver eventos recientes.
3. El generador de reportes de cierre (Sección 2.6) llama a esto automáticamente.

**Impacto esperado:** Elimina la falla de coordinación "no sabía que ya cerraste S13". Mantiene el dashboard central como fuente única de verdad. El archivo marcador proporciona un registro de eventos desacoplado del formato del dashboard.

**Esfuerzo:** Bajo. ~50 líneas de PowerShell. Sin dependencias externas.

---

### 2.9 Gestor de Consolas Paralelas (Matriz de Seguridad)

**Qué:** Definir una matriz formal: Sprint → Archivos Tocados → Seguro en Paralelo Con → Máximo de Consolas. Crear reglas para cuándo y cuántas consolas de agentes paralelas pueden ejecutarse de manera segura basadas en el mapa de zonas.

**Por qué:** La metodología dice "una zona activa por persona" pero con 5 tracks y 27 sprints, la pregunta "¿pueden S12 y S-JB-01 ejecutarse simultáneamente?" requiere verificación manual de solapamiento de zonas. No hay guía formal sobre cuántas consolas son seguras.

**Cómo implementar:**
1. Crear `docs/07_handoffs/parallel-console-matrix.json`
2. `scripts/oreshnik/parallel-check.ps1 --sprint S12` lee la matriz e imprime qué otros sprints son seguros de ejecutar en paralelo.
3. Integrar en el runner oreshnik: antes del modo `execute`, verificar que ningún sprint conflictivo esté activo.

**Impacto esperado:** Los operadores pueden tomar decisiones de paralelización en segundos en lugar de hacer diff manual de conjuntos de zonas. Previene el modo de falla más peligroso: dos agentes mutando archivos solapados simultáneamente.

**Recomendación de estado actual (ver Sección 4):** Basado en análisis de zonas, 3 consolas pueden ejecutarse seguras AHORA MISMO: T1 (marketplace), T2 (booking) y T3 (crecimiento) tienen cero solapamiento de archivos entre sí.

---

## Sección 3: Priorización de Implementación

### Ranking por Relación Impacto/Esfuerzo

| # | Optimización | Impacto | Esfuerzo | Relación | Categoría |
|---|-------------|--------|---------|----------|----------|
| 1 | Mapa de Zonas + Detección de Colisiones (2.2) | Previene colisiones P0 | Medio | Máxima | Seguridad |
| 2 | Automatización Pre-flight (2.1) | Detecta fallos de entorno temprano | Bajo | Máxima | Seguridad + Eficiencia |
| 3 | Archivos de Contexto por Sprint (2.7) | Reduce hinchazón de contexto 70% | Medio-Bajo | Muy Alta | Eficiencia |
| 4 | Reportes de Cierre Automatizados (2.6) | Ahorra 10 min/sprint | Bajo | Muy Alta | Eficiencia |
| 5 | Matriz de Consolas Paralelas (2.9) | Habilita paralelismo real | Bajo | Muy Alta | Seguridad + Velocidad |
| 6 | Scaffolding Automatizado de Sprints (2.3) | Ahorra 10 min/inicio de sprint | Medio | Alta | Eficiencia |
| 7 | Sistema de Notificación (2.8) | Mantiene operadores sincronizados | Bajo | Alta | Coordinación |
| 8 | Runner Oreshnik (2.4) | Estandariza todos los flujos | Alto | Media | Fundación |
| 9 | Auto-Deploy Preview Vercel (2.5) | Validación visual por sprint | Medio | Media | Calidad |

### Calendario de Implementación

**Inmediato (esta semana):**

1. **Automatización Pre-flight (2.1)** — Instalar git hooks. 30 minutos. Protección instantánea.
2. **Archivos de Contexto por Sprint (2.7)** — Generar archivos de contexto para S12, S13, S14, S-JB-01. 45 minutos. Ahorro inmediato de tokens.
3. **Mapa de Zonas (2.2)** — Construir `zone-map.json` cubriendo los 5 tracks. 2 horas. Fundación para 2.9, 2.4 y 2.3.

**Corto plazo (próximo ciclo de sprints):**

4. **Matriz de Consolas Paralelas (2.9)** — Derivar del mapa de zonas. 30 minutos.
5. **Scaffolding Automatizado de Sprints (2.3)** — Construir sobre mapa de zonas + hook pre-flight. 1.5 horas.
6. **Reportes de Cierre Automatizados (2.6)** — 1 hora.

**Mediano plazo (después de cerrar S14):**

7. **Runner Oreshnik (2.4)** — Construir el runner completo integrando scaffolding, zone-check, reportes de cierre. 3 horas. Requerido antes de escalar más allá de 3 consolas paralelas.
8. **Sistema de Notificación (2.8)** — 30 minutos una vez que exista el runner oreshnik.
9. **Auto-Deploy Preview Vercel (2.5)** — Requiere a Jean (admin Vercel). 30 minutos de configuración.

---

## Sección 4: Asignación Recomendada de Consolas para el Estado Actual

### Consolas Paralelas Seguras AHORA MISMO

Basado en análisis de zonas del estado activo actual (2026-05-12):

| Consola | Sprint | Track | Operador | Riesgo de Zona | Puede Paralelizar Con |
|---------|--------|-------|----------|----------------|----------------------|
| **Consola A** | S12 (Playwright) | T1 Marketplace | Manuel | Bajo — solo toca `scripts/qa/playwright/`, `var/qa-results/s12-*` | Consola B, Consola C |
| **Consola B** | S-JB-01 (Booking) | T2 Booking | Jean | Medio — toca `app/(public)/reservas/*`, `app/api/reservas/*` | Consola A, Consola C |
| **Consola C** | S-MK-01 (Mercado) | T3 Crecimiento | Manuel | Bajo — solo docs, cero código | Consola A, Consola B |

**Por qué estas tres son seguras:**
- T1 (Playwright marketplace) y T2 (booking) tocan árboles de archivos completamente disjuntos.
- T3 es solo docs — sin código, sin riesgo de colisión con T1 o T2.
- T4 (Admin-Legal) y T5 (UI/UX) requieren acciones físicas/de diseño de Manuel — no paralelizables como trabajo de agente.

### Lo que NO debe ejecutarse en paralelo

- **S12 y S13**: Dependencia secuencial. S13 requiere los screenshots y estado TX de S12.
- **S-JB-01 y S-JB-02**: Mismo track, secuencial. S-JB-02 depende de los fixes de S-JB-01.
- **S14B y S15**: Ambos tocan `components/marketplace/**`. Riesgo de colisión de zona.
- **S-UX-01 y cualquier sprint de código marketplace**: Refactor UX toca los mismos archivos de componentes. Debe esperar a que T1/T2 se estabilicen.

### Máximo de Consolas

| Escenario | Máx. Consolas | Explicación |
|-----------|--------------|-------------|
| **Estado actual** | **3** | 2 máquinas de operadores × 3 zonas seguras (T1, T2, T3) — pero cada operador puede manejar efectivamente solo 1 consola de agente a la vez, así que el máximo práctico es 2 con 1 en background de docs |
| **Después de zone-map + runner oreshnik** | **4** | 2 operadores × 2 consolas de agente cada uno, con detección de colisiones automatizada |
| **Máximo teórico** | **6** | Si los 5 tracks tuvieran zonas disjuntas, pero en este proyecto los tracks T1 y T5 ambos tocan `components/` así que no pueden ejecutarse todos simultáneamente |

### Mitigación de Riesgos para Trabajo Multi-Consola

1. **Antes de iniciar cualquier consola**: Ejecutar `zone-check.ps1 --sprint <ID>` para verificar que no hay colisiones activas.
2. **Disciplina de push**: No hacer push a madre sin ejecutar el hook pre-push (Sección 2.1). Esta es la guarda de mayor valor individual.
3. **Disciplina de worktree**: Cada sprint recibe su propio worktree. Nunca trabajar directamente en el checkout principal para trabajo de sprint.
4. **Convención de mensajes de commit**: Prefijar cada commit con el ID del sprint, ej. `qa(s12): purchase flow Playwright spec`. Esto hace que `git log` sea instantáneamente escaneable para saber qué sprint tocó qué.
5. **Cerrar antes de abrir**: Jean controla el merge a madre. Ninguna rama de sprint se mergea a madre sin la revisión explícita de Jean y el checklist de 9 items de BUS_CONTROL_TURPIAL.

### Próximas Acciones Inmediatas para los Operadores

**Jean:**
1. Hacer push de cambios locales pendientes (P0, bloquea todo)
2. Configurar `TS_MARKETPLACE_SENSITIVE_BLOB_READ_WRITE_TOKEN` en Vercel
3. Iniciar Consola B: `S-JB-01` en worktree `jean/s-jb-01-booking-fixes-2026-05-13`
4. Revisar el cierre de S12 de Manuel cuando esté listo

**Manuel:**
1. Iniciar Consola A: `S12` en worktree `Manuel/s12-purchase-flow-browser-2026-05-12`
2. Después de cerrar S12 → S13 → S14 (secuencial en T1)
3. Consola C: `S-MK-01` análisis de mercado puede ejecutarse en paralelo con S12 ya que es solo docs
4. S-ADM-01: Verificar estado legal de la entidad (acción física)

---

## Apéndice: Instantánea del Estado Actual (2026-05-12)

```
Rama madre:  RAMA MADRE @ 953c6af
Sprints completados: S01-S11 ✅, S14B ✅, S-MK-01/02 ✅
Ramas activas:  S12 (completado, por mergear), S13 (completado, por mergear), S14 (en progreso)
Worktrees obsoletos: 6 (sprints cerrados S01/S03, nunca limpiados)
Pendiente P0:   CRON_SECRET en Vercel para el scheduler BCV
Próximo sprint: S14 (Manuel, admin dashboard + cierre pagos)
```
