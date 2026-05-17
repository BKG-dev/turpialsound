---
type: user-guide
tool: "Oreshnik Runner"
version: "1.0"
fecha: 2026-05-14
para: "Jean y Manuel"
---

# 🧠 Oreshnik Runner — Guia de Uso

## Que es

Oreshnik es el **orquestador central de sprints** de Turpial Sound. Automatiza los pasos repetitivos del flujo de trabajo para que Jean y Manuel puedan enfocarse en codigo en lugar de gestion.

```
./oreshnik.ps1 <comando> [opciones]
```

---

## Comandos

| Comando | Que hace | Cuando usarlo |
|---------|----------|---------------|
| `scaffold` | Crea rama desde madre, ejecuta pre-flight, zone-check, y worktree opcional | Al INICIAR un sprint nuevo |
| `align` | Solo lectura: verifica precondiciones sin modificar nada | Para confirmar que un sprint es ejecutable antes de invertir tiempo |
| `status` | Muestra rama actual, worktrees, tags recientes, docs canonicos | Al ABRIR sesion, para saber donde estamos |
| `close` | Checklist de cierre interactivo | Al TERMINAR un sprint, antes del merge gate |
| `cleanup` | Busca y elimina worktrees de sprints ya mergeados | Limpieza periodica |

---

## Flujo completo de un sprint con Oreshnik

### 1. INICIO — `status`
```powershell
./oreshnik.ps1 status
```
Muestra donde estas parado: rama actual, rama madre, worktrees activos, tags.

### 2. PRE-FLIGHT — `align`
```powershell
./oreshnik.ps1 align -SprintId S15
```
Verifica que el entorno esta listo y no hay colisiones. **No modifica nada.**

### 3. CREAR RAMA — `scaffold`
```powershell
./oreshnik.ps1 scaffold -SprintId S15 -Operator Manuel
```
Crea la rama `Manuel/s15-2026-05-14` desde madre, ejecuta pre-flight y zone-check automaticamente. Pregunta si queres worktree dedicado.

### 4. TRABAJAR — Manual (con Kilo)
```bash
# En la nueva rama, ejecuta tu agente Kilo
# Commits con prefijo: qa(s15):, feat(s15):, fix(s15):
```

### 5. VALIDAR — Manual
```bash
git diff --check
npx tsc --noEmit
pnpm build
```
QA modules y Playwright specs segun el sprint.

### 6. CERRAR — `close`
```powershell
./oreshnik.ps1 close -SprintId S15
```
Muestra checklist interactivo. Al confirmar, te indica que actualizar en docs.

### 7. MERGE GATE — Jean
Jean mergea la rama a madre `integration/today-reservas-marketplace-stable-2026-05-07` usando el checklist del gatekeeper.

### 8. LIMPIEZA — `cleanup`
```powershell
./oreshnik.ps1 cleanup
```
Elimina worktrees de sprints ya mergeados.

---

## Archivos creados por Oreshnik

| Archivo | Funcion |
|---------|---------|
| `scripts/oreshnik/oreshnik.ps1` | Runner principal |
| `scripts/oreshnik/scaffold-sprint.ps1` | Creacion de rama + pre-flight |
| `scripts/oreshnik/preflight-check.ps1` | Validacion de entorno (5 pasos) |
| `scripts/oreshnik/zone-check.ps1` | Deteccion de colisiones de zona |
| `docs/07_handoffs/zone-map.json` | 32 zonas definidas con locks y sprints autorizados |

---

## Zone Map — Como evita colisiones

Cada archivo del proyecto esta mapeado a una zona. Cada zona define:
- Que **sprints** pueden tocarla
- Que **track** le pertenece
- Que **lock** requiere (jean_exclusive, double_jean_manuel, owner_per_sprint)

```
Ejemplo:
  prisma/schema.prisma → lock: double_jean_manuel → AMBOS deben acordar
  app/(public)/reservas/** → lock: jean_exclusive → SOLO Jean
  components/marketplace/** → lock: owner_per_sprint → el dueño del sprint
```

`zone-check.ps1` compara los archivos modificados en tu rama contra el zone-map y reporta colisiones ANTES de que trabajes en archivos conflictivos.

---

## Ejemplo real: Primera prueba guiada (S15)

```powershell
# Paso 1: Ver donde estamos
./oreshnik.ps1 status

# Paso 2: Alinear S15 (verificar que es ejecutable)
./oreshnik.ps1 align -SprintId S15

# Paso 3: Crear rama y worktree
./oreshnik.ps1 scaffold -SprintId S15 -Operator Manuel
# Responde "s" cuando pregunte si crear worktree

# Paso 4: Trabajar en la nueva rama con Kilo
# ...

# Paso 5: Validar
git diff --check && npx tsc --noEmit && pnpm build

# Paso 6: Cerrar
./oreshnik.ps1 close -SprintId S15
```
