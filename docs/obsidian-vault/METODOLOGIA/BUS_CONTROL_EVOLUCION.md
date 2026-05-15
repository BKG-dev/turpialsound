---
type: architecture-assessment
area: "Bus de Control"
version_actual: "2.5.0"
version_objetivo: "4.0.0"
fecha: 2026-05-14
last_updated: "2026-05-14T20:19-04:00"
status: "En evolucion activa"
tags: ["#central", "#control-bus", "#governance", "#oreshnik", "#roadmap"]
---

# BUS DE CONTROL — Análisis, Evolución y Roadmap

> **Documento canónico de evolución del Bus de Control.**
> Se actualiza cada vez que se implementa una mejora al bus.
> Vinculado a [[METODOLOGIA_ORESHNIK_ANEXO]] y [[METODOLOGIA_OPTIMIZACION]].

---

## 1. ¿Qué es el Bus de Control?

El Bus de Control es la **capa de gobernanza automatizada** que coordina el trabajo de Jean y Manuel sobre el código de Turpial Sound. No es un documento estático — es un **sistema vivo** compuesto por reglas documentadas, scripts de verificación, hooks de git, y protocolos de agente.

### Componentes del Bus

```
                    ┌──────────────────────────┐
                    │   BUS DE CONTROL 2.5      │
                    │   Capa de Gobernanza       │
                    └──────────┬───────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
   ┌────▼─────┐         ┌─────▼──────┐        ┌─────▼──────┐
   │ DOCS     │         │ SCRIPTS    │        │ GIT        │
   │ Reglas   │         │ Verifican  │        │ Bloquea    │
   └──────────┘         └────────────┘        └────────────┘
        │                      │                      │
   BUS_CONTROL         preflight.mjs           .husky/pre-push
   AGENT_CONTROL       zone-check.ps1          git config hooks
   zone-map.json       sync-obsidian.ps1       PASO 0 AGENTS.md
   METODOLOGIA         10 stop conditions      32 zonas locks
```

---

## 2. Evolución histórica

| Versión | Fecha | Qué se implementó | Quién |
|---------|-------|-------------------|-------|
| **1.0** | Abr 2026 | Reglas manuales. Jean gate keeper. Sin automatización. | Jean |
| **2.0** | May 7 | `integration-gatekeeper-2026-05-07.md`. Merge solo por Jean. Checklist manual de 8 pasos. | Jean |
| **2.1** | May 10 | `BUS_CONTROL_TURPIAL.md`. Nivel 2.5 Co-development. Locks por dominio. 10 stop conditions. | Jean + Manuel |
| **2.2** | May 10 | `AGENT_CONTROL_BUS_RUNNER.md`. Prompt universal para agentes Codex. MODE=align/execute/close. | Manuel |
| **2.3** | May 14 | `zone-map.json` + `zone-check.ps1`. 32 zonas con locks. Detección de colisiones. | Manuel |
| **2.4** | May 14 | `preflight.mjs`. 8 checks automáticos. Contexto, sync, git, zone, env, vercel, bus stop conditions. | Manuel |
| **2.5** | May 14 | `.husky/pre-push` hook. AGENTS.md PASO 0. `sync-obsidian.ps1`. Sistema integrado. | Manuel |
| **3.0** | — | **PRÓXIMO** — Lock enforcement programático, notificaciones cross-agente, auto-reportes de cierre. | — |
| **4.0** | — | **OBJETIVO** — Bus completamente autónomo. Cero intervención manual en gobernanza. | — |

---

## 3. Estado actual — Evaluación objetiva

### Nivel de automatización por componente

| Componente | Automatización | Eval |
|-----------|---------------|------|
| Pre-flight | 85% — 7 pasos automáticos, prompt sugerido | 🟢 |
| Zone check | 60% — Detecta colisiones, no bloquea automáticamente | 🟡 |
| Doc sync | 90% — Restaura automático, cache inteligente | 🟢 |
| Git hooks | 70% — Pre-push funcional, pre-commit no implementado | 🟡 |
| Lock enforcement | 20% — Documentado, no programático | 🔴 |
| Context health | 50% — Básico (horas/tareas/errores), sin métricas de precisión | 🟡 |
| Stop conditions | 40% — Listadas y reportadas, no verificadas contra diff real | 🔴 |
| Sprint lifecycle | 60% — Scaffold y close documentados, execute manual | 🟡 |
| Cross-agent | 0% — Sin notificaciones ni coordinación automática | 🔴 |
| Reporting | 10% — Manual, sin generación automática de cierre | 🔴 |

### Promedio general: **48% automatizado**

### Aporte medible al avance del proyecto

| Métrica | Sin Bus | Con Bus 2.5 | Impacto |
|---------|---------|-------------|---------|
| Ramas divergentes | 2 (May 13) | 0 (May 14) | **Previno caos** |
| Docs desactualizados | Frecuente (>5 incidentes) | 0 desde sync-obsidian | **Eliminó ruido** |
| Secrets commiteados | 1 bloqueado por GitHub | 0 con pre-push | **Previno filtración** |
| Colisiones de zona | No detectadas (Jean tocó marketplace sin avisar) | Detectadas y reportadas | **Visibilidad** |
| Contexto degradado | Sesiones de 6h sin compact | Sugiere /compact a las 3h | **Calidad de respuesta** |
| Tiempo de setup por sprint | ~15 min manual | ~2 min con preflight | **7.5x más rápido** |

---

## 4. Qué se puede mejorar — Priorizado por impacto

### 🔴 P0 — Bloqueantes (próximo sprint de bus)

| # | Mejora | Impacto | Esfuerzo |
|---|--------|---------|----------|
| 1 | **Lock confirmation workflow** — Cuando Manuel toca schema, Jean recibe notificación y debe aprobar antes de commit | Previene conflictos DB | Medio |
| 2 | **Stop conditions verificadas contra diff real** — preflight analiza `git diff` y detecta si toca booking, main, schema, secrets | Cobertura 100% de stops | Bajo |
| 3 | **Zone-check bloqueante** — Si zone-check detecta colisión, preflight la reporta como FAIL (hoy es WARN) | Previene trabajo en zona ajena | Bajo |

### 🟡 P1 — Alta prioridad (2-3 sprints)

| # | Mejora | Impacto | Esfuerzo |
|---|--------|---------|----------|
| 4 | **Auto-reporte de cierre de sprint** — `oreshnik close` genera reporte markdown automático | Elimina trabajo manual repetitivo | Medio |
| 5 | **Pre-commit hook** — Verifica zone-check + stop conditions antes de commit, no solo antes de push | Detecta problemas más temprano | Bajo |
| 6 | **Notificación cross-agente** — Cuando un operador inicia sprint, el otro ve estado en 00_CENTRAL | Coordinación en tiempo real | Medio |
| 7 | **Métricas de rendimiento del bus** — Contador de colisiones prevenidas, sprints cerrados, tiempo ahorrado | Visibilidad objetiva del valor del bus | Bajo |

### 🟢 P2 — Media prioridad (versión 3.5)

| # | Mejora | Impacto | Esfuerzo |
|---|--------|---------|----------|
| 8 | **Integración Vercel** — preflight verifica build status y bloquea si último deploy = Error | Previene trabajo sobre build roto | Bajo |
| 9 | **Health score del contexto** — Más allá de horas/tareas: mide precisión de respuestas, tasa de re-trabajo | Calidad del agente | Alto |
| 10 | **Parent branch auto-verification** — preflight confirma que la rama de sprint desciende de madre | Previene divergencia silenciosa | Bajo |

### ⚪ P3 — Visión 4.0

| # | Mejora | Impacto | Esfuerzo |
|---|--------|---------|----------|
| 11 | **Bus completamente autónomo** — El agente decide solo si continuar, compactar, o detenerse | Cero intervención humana en gobernanza | Muy alto |
| 12 | **Dashboard de gobernanza** — UI en tiempo real de estado del bus, locks activos, sprints en curso | Transparencia total | Alto |

---

## 5. Roadmap a versión 4.0

```
HOY (2.5) ──→ 3.0 ──→ 3.5 ──→ 4.0
  │            │        │        │
  │            │        │        └── Bus autónomo + Dashboard gobernanza
  │            │        │
  │            │        └── Auto-reportes + Cross-agent + Métricas + Vercel
  │            │
  │            └── Lock workflow + Stop conditions diffs + Zone-check bloqueante
  │
  └── Preflight 7 pasos + Zone map + Sync docs + Pre-push hook + 10 stops listados
```

### Hitos y fechas objetivo

| Versión | Fecha objetivo | Entregables clave |
|---------|---------------|-------------------|
| **3.0** | Mayo 16 | Lock workflow + Stop conditions vs diff + Zone-check bloqueante |
| **3.5** | Mayo 20 | Auto-reportes cierre + Cross-agent notif + Métricas + Vercel integración + Pre-commit |
| **4.0** | Junio 1 | Bus autónomo + Dashboard gobernanza |

---

## 6. Mejor momento para implementar mejoras

### Regla de oro

> **Cada vez que un fallo del bus cause un incidente real, se implementa la mejora que lo habría prevenido. Sin excepción.**

### Calendario táctico

| Cuándo | Qué mejorar | Gatillo |
|--------|------------|---------|
| **AHORA** (May 14) | P0 #2 y #3: Stop conditions vs diff + Zone-check bloqueante | Ya tuvimos divergencia de ramas (May 13) y Vercel build roto por `as any` |
| **Próximo incidente** | P0 #1: Lock confirmation workflow | Cuando ocurra un conflicto de schema sin lock |
| **Después de 5 sprints cerrados** | P1 #4: Auto-reporte de cierre | Acumulación de trabajo manual repetitivo |
| **Cuando Jean retome** | P1 #6: Cross-agent notificación | Necesidad de coordinación activa |

---

## 7. Integración con Metodología de Optimización

El Bus de Control es la **implementación operativa** de la [[METODOLOGIA_OPTIMIZACION]]. Cada componente del bus corresponde a una sección del documento de optimización:

| METODOLOGIA_OPTIMIZACION | Implementación Bus 2.5 | Estado |
|--------------------------|----------------------|--------|
| 2.1 Pre-flight automation | `preflight.mjs` | ✅ |
| 2.2 Zone map collision detection | `zone-map.json` + `zone-check.ps1` | ✅ |
| 2.3 Sprint scaffolding | `scaffold-sprint.ps1` | ✅ |
| 2.4 Oreshnik runner | `oreshnik.ps1` | ✅ |
| 2.5 CI/CD Vercel previews | `.husky/pre-push` + Vercel auto-deploy | ✅ |
| 2.6 Automated closure reports | `oreshnik.ps1 close` (manual) | 🟡 |
| 2.7 Context optimization | `preflight.mjs` step 2/7 | ✅ |
| 2.8 Notification system | No implementado | 🔴 |
| 2.9 Parallel console management | No implementado | 🔴 |

---

## 8. Conclusión

El Bus de Control 2.5 ha demostrado valor medible: **previno divergencia de ramas, eliminó docs desactualizados, bloqueó secrets, redujo tiempo de setup 7.5x, y mejoró la calidad de contexto del agente.**

Sin embargo, está al **48% de su potencial de automatización**. Las 3 mejoras P0 (lock workflow, stop conditions vs diff, zone-check bloqueante) deben implementarse **esta semana** para alcanzar 65% de automatización.

El camino a 4.0 es claro, priorizado por impacto, y vinculado a incidentes reales. Cada fallo del bus genera su propia mejora.

---

> **Próxima revisión:** Mayo 16, al implementar versión 3.0.
> **Responsable:** Manuel (arquitecto del bus).
> **Aprobador:** Jean (gatekeeper).
