---
type: methodology-nexus
project: "Turpial Sound"
fecha: 2026-05-19
actualizado: "2026-05-19T23:31:05.412Z"
metodologia: "Oreshnik v4.0 + Madre Dinamica + Cierre Automatizado"
tags:
  - "#central"
  - "#methodology"
  - "#nexus"
  - "#status/live-source"
  - "#jean"
  - "#manuel"
---

# 🧠 METODOLOGÍA ORESHNIK + BUS DE CONTROL

> **Este es el nexo central de la metodología.** Leer antes de cualquier sprint.
> **Canvas visual:** [[FLUJO_PROTOCOLO_TRABAJO]]

---

## 🏗️ Resumen en 30 segundos

Turpial Sound = **2 operadores** (Jean + Manuel) + **5 estaciones** de trabajo + **1 rama madre** + **4 reglas de oro**.

```
ABRIR SESIÓN → Leer docs → Crear rama → Codear → Validar (10 checks) → Push → Vercel preview → Jean merge a madre → Smoke → Main
```

**Cada push requiere:** `tsc --noEmit` + `pnpm build` + `git diff --check` + sin ESLint errors + vercel preview OK.

---

## 📋 Las 5 Estaciones

| # | Estación | Quién | Qué hace | Evidencia |
|---|----------|-------|----------|-----------|
| 1 | **Docs canónicos** | Ambos | Leer [[INSTRUCCION_APERTURA_SESION]] + [[00_CENTRAL_TURPIAL]] | Sesión iniciada |
| 2 | **Rama propia** | Ambos | `git checkout -b {Op}/{sprint}-{fecha}` desde madre | Rama creada |
| 3 | **Código + QA** | Ambos | Implementar scope, QA modules, Playwright, commits con prefijo | Commits |
| 4 | **Validación + Gate** | Jean (mergea), Manuel (valida) | 10 checks pre-push + Vercel preview | Checklist 10/10 |
| 5 | **Producción** | Jean | `git merge` a main → Vercel auto-deploy → smoke | `turpialsound.com` OK |

---

## 🔒 Las 4 Reglas de Oro

| # | Regla | Razón |
|---|-------|-------|
| 1 | **Una sola rama madre** | `RAMA MADRE`. Sin esto, divergencia. |
| 2 | **Jean es el gatekeeper** | Solo Jean mergea a madre y main. Nadie despliega directo a prod. |
| 3 | **Zonas exclusivas** | `/reservas` = Jean. `schema.prisma` = lock doble Jean+Manuel. |
| 4 | **Cerrar antes de abrir** | Sprint no empieza hasta que el anterior en su track está ✅ CERRADO. |

---

## 👥 Roles

| | Jean (BKG-dev) | Manuel (Manuel Vera) |
|---|---|---|
| **Zona** | `/reservas`, DB/schema, prod, merge gate, Vercel envs | `/marketplace`, QA, Playwright, docs, SEO, vault |
| **Puede** | Mergear a madre y main, gatekeeper de prod | Ejecutar sprints marketplace, QA, smoke, docs |
| **NO puede** | Desplegar sin validación de Manuel | Tocar `/reservas`, mergear a madre, tocar schema sin Jean |

---

## ✅ Pre-Push Checklist — OBLIGATORIO

> **Sin excepción. Si un solo check falla, el push se cancela.**

| # | Check | Comando | Bloquea |
|---|-------|---------|---------|
| 1 | **ESLint** | `pnpm run lint` | ✅ Error fatal |
| 2 | **TypeScript** | `npx tsc --noEmit` | ✅ No compila |
| 3 | **Build** | `pnpm run build` | ✅ No despliega |
| 4 | **Diff whitespace** | `git diff --check` | ✅ Whitespace corrupto |
| 5 | **Indentación** | Revisar tabs/spaces | ⚠️ Advertencia |
| 6 | **No .env en diff** | `git diff --name-only \| grep .env` | ✅ Riesgo seguridad |
| 7 | **No /reservas** | Si el sprint es marketplace | ✅ Zona exclusiva Jean |
| 8 | **No `as any`** | ESLint `no-explicit-any` | ✅ Error Vercel |
| 9 | **No type sin usar** | ESLint `no-unused-vars` | ✅ Error Vercel |
| 10 | **Vercel preview** | Verificar deploy OK | ✅ Sin preview no hay smoke |

### Script de validación pre-push

```bash
npx tsc --noEmit || return
pnpm run build || return
git diff --check || return
git diff --name-only HEAD~1..HEAD | grep "\.env" && echo "SECRETS!" && return
git push origin <rama>
npx vercel list | head -3
```

---

## 🚀 Vercel Preview Link

Al pushear, Vercel auto-despliega una preview. Obtener el link:

```bash
npx vercel list | head -3
# https://turpialsound-XXXXX-bkgs-projects-829c67c1.vercel.app
```

**Compartir el link con el otro operador.** Si falla el build, inspeccionar:

```bash
npx vercel inspect <url> --logs
```

---

## 🤝 Sincronizacion Bidireccional v4.0

Protocolo para que Jean y Manuel SIEMPRE vean la misma version de docs.

### Contrato anti-pisada

El resultado esperado de Obsidian/docs es:

1. La documentacion final es la fusion de lo ultimo de Manuel + lo ultimo de Jean.
2. Obsidian no es fuente de verdad; Git + madre dinamica + merge de tres vias son la fuente de verdad.
3. El cierre/reapertura automatica de Obsidian solo evita cache/escrituras tardias del vault.
4. Si ambos editan secciones distintas, `close-sprint.mjs` debe fusionarlas automaticamente.
5. Si ambos editan la misma seccion y Git no puede resolver, el cierre se bloquea con conflicto explicito. Nunca se elige silenciosamente a un operador.
6. Prohibido reemplazar `docs/` con `git checkout <rama> -- docs/` durante el cierre de madre. Eso es "ultimo writer wins" y rompe este contrato.

### Al abrir sesion (AMBOS)

```bash
node scripts/oreshnik/preflight.mjs --sprint SXX --operator Jean|Manuel --desc "descripcion"
```

El preflight v4.0 ejecuta automaticamente:
1. Fetch origin + sync forzado de docs desde la rama madre dinamica
2. Deteccion de ramas del otro operador con docs mas nuevos
3. Verificacion de cobertura de documentacion
4. Gestion de ramas (crea hija desde madre dinamica)

**La madre ya NO es un nombre fijo.** Cada cierre de sprint genera una nueva madre versionada: `MADRE/v{N}-{tags}-{fecha}`

### Actualizacion tecnica 2026-05-17 — Preflight v4.0 reparado

Durante S-MP-01 se corrigieron dos fallos del preflight:

- Se cerro correctamente el bloque de sync de docs desde madre en `scripts/oreshnik/preflight.mjs`. Antes el script podia abortar por error de sintaxis antes de validar rama/env/locks.
- Se agrego `readJsonFile(path, fallback)` para leer JSON operativos con tolerancia a BOM (`^\uFEFF`) y fallback seguro. Antes un cache o assignment JSON con BOM podia bloquear la apertura de sesion.

Archivos cubiertos:
- `.preflight-cache.json`
- `.mother-version.json`
- `.sprint-assignments.json`
- `.out-of-band.json`
- `docs/07_handoffs/zone-map.json`

Resultado:
- El Paso 0 vuelve a ser ejecutable end-to-end y mantiene sync de docs, branch management, bus de control y resiliencia sin quedar bloqueado por cache JSON invalida.

### Al cerrar sprint

```bash
node scripts/oreshnik/close-sprint.mjs --sprint SXX --operator Jean|Manuel --desc "desc"
```

El cierre v2.0 ejecuta automaticamente:
1. **Cobertura:** Verifica que TODOS los docs relacionados al codigo modificado esten actualizados
2. **Mecanica:** Actualiza timestamps, estados, y docs canonicos
3. **Git:** Commitea docs en rama hija, pushea hija, crea NUEVA rama madre con merge real de `docs/`
4. **Evento:** Registra cierre en `var/sprint-events/`

Desde 2026-05-18, el cierre usa `scripts/oreshnik/merge-docs-union.mjs` para fusionar exclusivamente `docs/` entre la madre vigente y la rama hija. El codigo de producto permanece en la rama hija. Para Markdown/texto usa merge automatico tipo union; para JSON aplica merge semantico basico. El objetivo operativo es no requerir intervencion humana en conflictos normales de documentacion.

### Flujo completo

```
ABRIR SESION → preflight v4.0 (jala docs de madre dinamica)
  ↓
CREAR RAMA HIJA → desde madre dinamica (hereda docs actualizados)
  ↓
EJECUTAR SPRINT → Codigo + docs
  ↓
CERRAR SPRINT → close-sprint v2.0 (verifica cobertura, actualiza docs, pushea)
  ↓
  ├─ Push COMPLETO a rama hija (codigo + docs)
  └─ Push SOLO docs a NUEVA rama madre dinamica
  ↓
JEAN INTEGRA CODIGO → mergea ramas hijas a madre
  ↓
PRODUCCION → main → Vercel → turpialsound.com
```

---

## 🔄 Flujo Completo

```
ABRIR SESIÓN → Leer INSTRUCCION_APERTURA_SESION + 00_CENTRAL
  ↓
PRE-FLIGHT → git fetch + QA-00 + verificar .env.local
  ↓
CREAR RAMA → git checkout -b {Operador}/{sprint}-{fecha}
  ↓
EJECUTAR → Código + QA + Playwright + commits con prefijo
  ↓
VALIDAR → 10 checks pre-push (tsc + build + diff + ESLint + preview)
  ↓
CERRAR → Actualizar 00_CENTRAL + commit + push + avisar al otro
  ↓
JEAN MERGE GATE → git merge a madre + push + Vercel preview link
  ↓
MANUEL SMOKE → /, /marketplace, /reservas, /api/bcv-rate, /admin/login
  ↓
JEAN RELEASE → git merge a main → Vercel → turpialsound.com
```

---

## 🧠 Oreshnik: HOY vs FUTURO

| Componente | HOY (v3.0) | FUTURO (Oreshnik) |
|-----------|-------------|-------------------|
| Pre-flight | ✅ `preflight.mjs` v3.0 automatico | `.husky/pre-commit` |
| Zone check | ✅ `zone-check.ps1` via preflight | Integrado en CI |
| Crear rama | ✅ `preflight.mjs` automatico (`{op}/{sprint}-{desc}-{fecha}`) | `scaffold-sprint.ps1` |
| Sync docs | ✅ `sync-obsidian.ps1` (respeta vault) | Integrado en pre-commit |
| Pre-push | Manual 10 checks | `.husky/pre-push` |
| Cerrar | Editar docs a mano | `generate-closure-report.ps1` |
| Vercel preview | `npx vercel list` | Link en commit message |

**Preflight v3.0** ya automatiza: sync docs, gestion de ramas, zone check, env check, bus de control (10 stop conditions), resiliencia.

---

## 📖 Documentos Canónicos

| # | Documento | Función |
|---|-----------|---------|
| 1 | [[00_CENTRAL_TURPIAL]] | **Fuente única de verdad.** Manda sobre todos. |
| 2 | [[INSTRUCCION_APERTURA_SESION]] | Qué hacer al abrir Kilo (Jean + Manuel). |
| 3 | [[PLAN_MAESTRO_SPRINTS]] | 27 sprints en 5 tracks. |
| 4 | [[BUS_CONTROL]] | Reglas del bus, locks, checklist. |
| 5 | [[METODOLOGIA_OPTIMIZACION]] | Detalle de automatizaciones Oreshnik. |
| 6 | `docs/07_handoffs/qa-dispatcher.json` | Despacho canónico QA. |

---

## 🚀 Ejecución Paralela Multi-Agente (v4.0+)

**Regla permanente:** El agente DEBE paralelizar sprints independientes siempre que sea posible.

### Condiciones para paralelizar

| Condición | Requisito |
|-----------|-----------|
| Zonas de código | Los sprints NO comparten archivos (sin riesgo de conflicto) |
| Dependencias | Ningún sprint depende del otro |
| Ramas | Cada sprint en su propia rama hija desde la misma madre |
| Agentes | Un agente Task por sprint, ejecutando en paralelo |

### Flujo de orquestación

```
1. Identificar sprints sin dependencias entre sí
2. Crear ramas hijas paralelas desde madre
3. Lanzar agentes Task en paralelo (uno por sprint)
4. Cada agente implementa, verifica (tsc + build), pero NO commitea
5. El orquestador commitea, pushea y cierra cada sprint con close-sprint.mjs
6. Merge a madre con --strategy=subtree para docs
```

### Ejemplo

```
Manuel pendientes: S-MP-02, S-MP-04, S-MP-06, S-MP-07, S-MP-08
Dependencias: S-MP-04 depende de S-MP-02, S-MP-07 depende de S-MP-05, S-MP-08 depende de S-MP-05+S-MP-06

Fase 1 (paralelo): S-MP-02 || S-MP-06  ← zonas distintas, sin dependencias
Fase 2 (paralelo): S-MP-04 || S-MP-07(dashboard)  ← S-MP-02 ya cerrado
Fase 3 (secuencial): S-MP-08 ← depende de S-MP-06
```

### Verificación post-agente

Cada agente devuelve:
- Archivos modificados
- Resultado de `tsc --noEmit`
- Resultado de `pnpm run build`

El orquestador verifica que no hay conflictos entre agentes antes de commitear.

---

## 🔗 Enlaces rápidos

- 📊 **Canvas:** [[FLUJO_PROTOCOLO_TRABAJO]]
- 🚀 **Apertura:** [[INSTRUCCION_APERTURA_SESION]]
- 🏠 **Dashboard:** [[00_CENTRAL_TURPIAL]]
- 📋 **Plan:** [[PLAN_MAESTRO_SPRINTS]]
- 🐛 **Bugs:** [[BUGS_CRITICOS]]
- 💱 **Tasas:** [[FLUJO_TASAS_BCV]]
- 🧪 **QA:** [[QA_HARNESS_CANVAS_2026-05-10]]

---

## 📋 Actualización Automática de Documentación — Protocolo anti-recurrencia

> **Objetivo:** Cada sprint cerrado deja TODOS los documentos actualizados.

### Documentos que DEBEN actualizarse al cerrar sprint

| # | Documento | Qué actualizar |
|---|-----------|---------------|
| 1 | `00_CENTRAL_TURPIAL.md` | `last_updated`, estado sprint, tracks, Vercel link |
| 2 | `PLAN_MAESTRO_SPRINTS` | `last_updated`, sprint a COMPLETADO |
| 3 | `S03_QA_HARNESS_INDEX` | Nuevos modulos QA, decisiones |
| 4 | `docs/marketplace/01_ROADMAP_AND_STATUS` | Nuevas features, APIs |
| 5 | `qa-dispatcher.json` | Registrar task_id canonico |
| 6 | `qa-canonical-runbook.md` | Documentar entradas nuevas |

### Trazabilidad código → docs

- `prisma/schema.prisma` → `ARQUITECTURA_TASAS`, `01_ROADMAP_AND_STATUS`
- `actions/marketplace/*.ts` → `01_ROADMAP_AND_STATUS`
- `scripts/qa/modules/*.mjs` → `qa-dispatcher.json`, `S03_QA_HARNESS_INDEX`
- `scripts/qa/playwright/*.mjs` → `qa-dispatcher.json`, `qa-canonical-runbook`
- `components/marketplace/*.tsx` / `app/marketplace/**` → `01_ROADMAP_AND_STATUS`

### Verificación de consistencia

```bash
Select-String "last_updated|actualizado" docs/obsidian-vault/00_CENTRAL_TURPIAL.md docs/obsidian-vault/PLAN_MAESTRO_SPRINTS_2026-05-12.md docs/obsidian-vault/INSTRUCCION_APERTURA_SESION.md docs/obsidian-vault/METODOLOGIA_ORESHNIK_ANEXO.md docs/marketplace/01_ROADMAP_AND_STATUS.md
# Todas las fechas deben coincidir
```
﻿---
type: methodology-nexus
project: "Turpial Sound"
fecha: 2026-05-17
actualizado: "2026-05-18T13:09:54.458Z"
metodologia: "Oreshnik v4.0 + Madre Dinamica + Cierre Automatizado"
tags:
  - "#central"
  - "#methodology"
  - "#nexus"
  - "#status/live-source"
  - "#jean"
  - "#manuel"
---

# 🧠 METODOLOGÍA ORESHNIK + BUS DE CONTROL

> **Este es el nexo central de la metodología.** Leer antes de cualquier sprint.
> **Canvas visual:** [[FLUJO_PROTOCOLO_TRABAJO]]

---

## 🏗️ Resumen en 30 segundos

Turpial Sound = **2 operadores** (Jean + Manuel) + **5 estaciones** de trabajo + **1 rama madre** + **4 reglas de oro**.

```
ABRIR SESIÓN → Leer docs → Crear rama → Codear → Validar (10 checks) → Push → Vercel preview → Jean merge a madre → Smoke → Main
```

**Cada push requiere:** `tsc --noEmit` + `pnpm build` + `git diff --check` + sin ESLint errors + vercel preview OK.

---

## 📋 Las 5 Estaciones

| # | Estación | Quién | Qué hace | Evidencia |
|---|----------|-------|----------|-----------|
| 1 | **Docs canónicos** | Ambos | Leer [[INSTRUCCION_APERTURA_SESION]] + [[00_CENTRAL_TURPIAL]] | Sesión iniciada |
| 2 | **Rama propia** | Ambos | `git checkout -b {Op}/{sprint}-{fecha}` desde madre | Rama creada |
| 3 | **Código + QA** | Ambos | Implementar scope, QA modules, Playwright, commits con prefijo | Commits |
| 4 | **Validación + Gate** | Jean (mergea), Manuel (valida) | 10 checks pre-push + Vercel preview | Checklist 10/10 |
| 5 | **Producción** | Jean | `git merge` a main → Vercel auto-deploy → smoke | `turpialsound.com` OK |

---

## 🔒 Las 4 Reglas de Oro

| # | Regla | Razón |
|---|-------|-------|
| 1 | **Una sola rama madre** | `RAMA MADRE`. Sin esto, divergencia. |
| 2 | **Jean es el gatekeeper** | Solo Jean mergea a madre y main. Nadie despliega directo a prod. |
| 3 | **Zonas exclusivas** | `/reservas` = Jean. `schema.prisma` = lock doble Jean+Manuel. |
| 4 | **Cerrar antes de abrir** | Sprint no empieza hasta que el anterior en su track está ✅ CERRADO. |

---

## 👥 Roles

| | Jean (BKG-dev) | Manuel (Manuel Vera) |
|---|---|---|
| **Zona** | `/reservas`, DB/schema, prod, merge gate, Vercel envs | `/marketplace`, QA, Playwright, docs, SEO, vault |
| **Puede** | Mergear a madre y main, gatekeeper de prod | Ejecutar sprints marketplace, QA, smoke, docs |
| **NO puede** | Desplegar sin validación de Manuel | Tocar `/reservas`, mergear a madre, tocar schema sin Jean |

---

## ✅ Pre-Push Checklist — OBLIGATORIO

> **Sin excepción. Si un solo check falla, el push se cancela.**

| # | Check | Comando | Bloquea |
|---|-------|---------|---------|
| 1 | **ESLint** | `pnpm run lint` | ✅ Error fatal |
| 2 | **TypeScript** | `npx tsc --noEmit` | ✅ No compila |
| 3 | **Build** | `pnpm run build` | ✅ No despliega |
| 4 | **Diff whitespace** | `git diff --check` | ✅ Whitespace corrupto |
| 5 | **Indentación** | Revisar tabs/spaces | ⚠️ Advertencia |
| 6 | **No .env en diff** | `git diff --name-only \| grep .env` | ✅ Riesgo seguridad |
| 7 | **No /reservas** | Si el sprint es marketplace | ✅ Zona exclusiva Jean |
| 8 | **No `as any`** | ESLint `no-explicit-any` | ✅ Error Vercel |
| 9 | **No type sin usar** | ESLint `no-unused-vars` | ✅ Error Vercel |
| 10 | **Vercel preview** | Verificar deploy OK | ✅ Sin preview no hay smoke |

### Script de validación pre-push

```bash
npx tsc --noEmit || return
pnpm run build || return
git diff --check || return
git diff --name-only HEAD~1..HEAD | grep "\.env" && echo "SECRETS!" && return
git push origin <rama>
npx vercel list | head -3
```

---

## 🚀 Vercel Preview Link

Al pushear, Vercel auto-despliega una preview. Obtener el link:

```bash
npx vercel list | head -3
# https://turpialsound-XXXXX-bkgs-projects-829c67c1.vercel.app
```

**Compartir el link con el otro operador.** Si falla el build, inspeccionar:

```bash
npx vercel inspect <url> --logs
```

---

## 🤝 Sincronizacion Bidireccional v4.0

Protocolo para que Jean y Manuel SIEMPRE vean la misma version de docs.

### Contrato anti-pisada

El resultado esperado de Obsidian/docs es:

1. La documentacion final es la fusion de lo ultimo de Manuel + lo ultimo de Jean.
2. Obsidian no es fuente de verdad; Git + madre dinamica + merge de tres vias son la fuente de verdad.
3. El cierre/reapertura automatica de Obsidian solo evita cache/escrituras tardias del vault.
4. Si ambos editan secciones distintas, `close-sprint.mjs` debe fusionarlas automaticamente.
5. Si ambos editan la misma seccion y Git no puede resolver, el cierre se bloquea con conflicto explicito. Nunca se elige silenciosamente a un operador.
6. Prohibido reemplazar `docs/` con `git checkout <rama> -- docs/` durante el cierre de madre. Eso es "ultimo writer wins" y rompe este contrato.

### Al abrir sesion (AMBOS)

```bash
node scripts/oreshnik/preflight.mjs --sprint SXX --operator Jean|Manuel --desc "descripcion"
```

El preflight v4.0 ejecuta automaticamente:
1. Fetch origin + sync forzado de docs desde la rama madre dinamica
2. Deteccion de ramas del otro operador con docs mas nuevos
3. Verificacion de cobertura de documentacion
4. Gestion de ramas (crea hija desde madre dinamica)

**La madre ya NO es un nombre fijo.** Cada cierre de sprint genera una nueva madre versionada: `MADRE/v{N}-{tags}-{fecha}`

### Actualizacion tecnica 2026-05-17 — Preflight v4.0 reparado

Durante S-MP-01 se corrigieron dos fallos del preflight:

- Se cerro correctamente el bloque de sync de docs desde madre en `scripts/oreshnik/preflight.mjs`. Antes el script podia abortar por error de sintaxis antes de validar rama/env/locks.
- Se agrego `readJsonFile(path, fallback)` para leer JSON operativos con tolerancia a BOM (`^\uFEFF`) y fallback seguro. Antes un cache o assignment JSON con BOM podia bloquear la apertura de sesion.

Archivos cubiertos:
- `.preflight-cache.json`
- `.mother-version.json`
- `.sprint-assignments.json`
- `.out-of-band.json`
- `docs/07_handoffs/zone-map.json`

Resultado:
- El Paso 0 vuelve a ser ejecutable end-to-end y mantiene sync de docs, branch management, bus de control y resiliencia sin quedar bloqueado por cache JSON invalida.

### Al cerrar sprint

```bash
node scripts/oreshnik/close-sprint.mjs --sprint SXX --operator Jean|Manuel --desc "desc"
```

El cierre v2.0 ejecuta automaticamente:
1. **Cobertura:** Verifica que TODOS los docs relacionados al codigo modificado esten actualizados
2. **Mecanica:** Actualiza timestamps, estados, y docs canonicos
3. **Git:** Commitea docs en rama hija, pushea hija, crea NUEVA rama madre con merge real de `docs/`
4. **Evento:** Registra cierre en `var/sprint-events/`

Desde 2026-05-18, el cierre usa `scripts/oreshnik/merge-docs-union.mjs` para fusionar exclusivamente `docs/` entre la madre vigente y la rama hija. El codigo de producto permanece en la rama hija. Para Markdown/texto usa merge automatico tipo union; para JSON aplica merge semantico basico. El objetivo operativo es no requerir intervencion humana en conflictos normales de documentacion.

### Flujo completo

```
ABRIR SESION → preflight v4.0 (jala docs de madre dinamica)
  ↓
CREAR RAMA HIJA → desde madre dinamica (hereda docs actualizados)
  ↓
EJECUTAR SPRINT → Codigo + docs
  ↓
CERRAR SPRINT → close-sprint v2.0 (verifica cobertura, actualiza docs, pushea)
  ↓
  ├─ Push COMPLETO a rama hija (codigo + docs)
  └─ Push SOLO docs a NUEVA rama madre dinamica
  ↓
JEAN INTEGRA CODIGO → mergea ramas hijas a madre
  ↓
PRODUCCION → main → Vercel → turpialsound.com
```

---

## 🔄 Flujo Completo

```
ABRIR SESIÓN → Leer INSTRUCCION_APERTURA_SESION + 00_CENTRAL
  ↓
PRE-FLIGHT → git fetch + QA-00 + verificar .env.local
  ↓
CREAR RAMA → git checkout -b {Operador}/{sprint}-{fecha}
  ↓
EJECUTAR → Código + QA + Playwright + commits con prefijo
  ↓
VALIDAR → 10 checks pre-push (tsc + build + diff + ESLint + preview)
  ↓
CERRAR → Actualizar 00_CENTRAL + commit + push + avisar al otro
  ↓
JEAN MERGE GATE → git merge a madre + push + Vercel preview link
  ↓
MANUEL SMOKE → /, /marketplace, /reservas, /api/bcv-rate, /admin/login
  ↓
JEAN RELEASE → git merge a main → Vercel → turpialsound.com
```

---

## 🧠 Oreshnik: HOY vs FUTURO

| Componente | HOY (v3.0) | FUTURO (Oreshnik) |
|-----------|-------------|-------------------|
| Pre-flight | ✅ `preflight.mjs` v3.0 automatico | `.husky/pre-commit` |
| Zone check | ✅ `zone-check.ps1` via preflight | Integrado en CI |
| Crear rama | ✅ `preflight.mjs` automatico (`{op}/{sprint}-{desc}-{fecha}`) | `scaffold-sprint.ps1` |
| Sync docs | ✅ `sync-obsidian.ps1` (respeta vault) | Integrado en pre-commit |
| Pre-push | Manual 10 checks | `.husky/pre-push` |
| Cerrar | Editar docs a mano | `generate-closure-report.ps1` |
| Vercel preview | `npx vercel list` | Link en commit message |

**Preflight v3.0** ya automatiza: sync docs, gestion de ramas, zone check, env check, bus de control (10 stop conditions), resiliencia.

---

## 📖 Documentos Canónicos

| # | Documento | Función |
|---|-----------|---------|
| 1 | [[00_CENTRAL_TURPIAL]] | **Fuente única de verdad.** Manda sobre todos. |
| 2 | [[INSTRUCCION_APERTURA_SESION]] | Qué hacer al abrir Kilo (Jean + Manuel). |
| 3 | [[PLAN_MAESTRO_SPRINTS]] | 27 sprints en 5 tracks. |
| 4 | [[BUS_CONTROL]] | Reglas del bus, locks, checklist. |
| 5 | [[METODOLOGIA_OPTIMIZACION]] | Detalle de automatizaciones Oreshnik. |
| 6 | `docs/07_handoffs/qa-dispatcher.json` | Despacho canónico QA. |

---

## 🚀 Ejecución Paralela Multi-Agente (v4.0+)

**Regla permanente:** El agente DEBE paralelizar sprints independientes siempre que sea posible.

### Condiciones para paralelizar

| Condición | Requisito |
|-----------|-----------|
| Zonas de código | Los sprints NO comparten archivos (sin riesgo de conflicto) |
| Dependencias | Ningún sprint depende del otro |
| Ramas | Cada sprint en su propia rama hija desde la misma madre |
| Agentes | Un agente Task por sprint, ejecutando en paralelo |

### Flujo de orquestación

```
1. Identificar sprints sin dependencias entre sí
2. Crear ramas hijas paralelas desde madre
3. Lanzar agentes Task en paralelo (uno por sprint)
4. Cada agente implementa, verifica (tsc + build), pero NO commitea
5. El orquestador commitea, pushea y cierra cada sprint con close-sprint.mjs
6. Merge a madre con --strategy=subtree para docs
```

### Ejemplo

```
Manuel pendientes: S-MP-02, S-MP-04, S-MP-06, S-MP-07, S-MP-08
Dependencias: S-MP-04 depende de S-MP-02, S-MP-07 depende de S-MP-05, S-MP-08 depende de S-MP-05+S-MP-06

Fase 1 (paralelo): S-MP-02 || S-MP-06  ← zonas distintas, sin dependencias
Fase 2 (paralelo): S-MP-04 || S-MP-07(dashboard)  ← S-MP-02 ya cerrado
Fase 3 (secuencial): S-MP-08 ← depende de S-MP-06
```

### Verificación post-agente

Cada agente devuelve:
- Archivos modificados
- Resultado de `tsc --noEmit`
- Resultado de `pnpm run build`

El orquestador verifica que no hay conflictos entre agentes antes de commitear.

---

## 🔗 Enlaces rápidos

- 📊 **Canvas:** [[FLUJO_PROTOCOLO_TRABAJO]]
- 🚀 **Apertura:** [[INSTRUCCION_APERTURA_SESION]]
- 🏠 **Dashboard:** [[00_CENTRAL_TURPIAL]]
- 📋 **Plan:** [[PLAN_MAESTRO_SPRINTS]]
- 🐛 **Bugs:** [[BUGS_CRITICOS]]
- 💱 **Tasas:** [[FLUJO_TASAS_BCV]]
- 🧪 **QA:** [[QA_HARNESS_CANVAS_2026-05-10]]

---

## 📋 Actualización Automática de Documentación — Protocolo anti-recurrencia

> **Objetivo:** Cada sprint cerrado deja TODOS los documentos actualizados.

### Documentos que DEBEN actualizarse al cerrar sprint

| # | Documento | Qué actualizar |
|---|-----------|---------------|
| 1 | `00_CENTRAL_TURPIAL.md` | `last_updated`, estado sprint, tracks, Vercel link |
| 2 | `PLAN_MAESTRO_SPRINTS` | `last_updated`, sprint a COMPLETADO |
| 3 | `S03_QA_HARNESS_INDEX` | Nuevos modulos QA, decisiones |
| 4 | `docs/marketplace/01_ROADMAP_AND_STATUS` | Nuevas features, APIs |
| 5 | `qa-dispatcher.json` | Registrar task_id canonico |
| 6 | `qa-canonical-runbook.md` | Documentar entradas nuevas |

### Trazabilidad código → docs

- `prisma/schema.prisma` → `ARQUITECTURA_TASAS`, `01_ROADMAP_AND_STATUS`
- `actions/marketplace/*.ts` → `01_ROADMAP_AND_STATUS`
- `scripts/qa/modules/*.mjs` → `qa-dispatcher.json`, `S03_QA_HARNESS_INDEX`
- `scripts/qa/playwright/*.mjs` → `qa-dispatcher.json`, `qa-canonical-runbook`
- `components/marketplace/*.tsx` / `app/marketplace/**` → `01_ROADMAP_AND_STATUS`

### Verificación de consistencia

```bash
Select-String "last_updated|actualizado" docs/obsidian-vault/00_CENTRAL_TURPIAL.md docs/obsidian-vault/PLAN_MAESTRO_SPRINTS_2026-05-12.md docs/obsidian-vault/INSTRUCCION_APERTURA_SESION.md docs/obsidian-vault/METODOLOGIA_ORESHNIK_ANEXO.md docs/marketplace/01_ROADMAP_AND_STATUS.md
# Todas las fechas deben coincidir
```
﻿---
type: methodology-nexus
project: "Turpial Sound"
fecha: 2026-05-19
actualizado: "2026-05-19T23:27:00Z"
metodologia: "Oreshnik v4.0 + Madre Dinamica + Cierre Automatizado"
tags:
  - "#central"
  - "#methodology"
  - "#nexus"
  - "#status/live-source"
  - "#jean"
  - "#manuel"
---

# 🧠 METODOLOGÍA ORESHNIK + BUS DE CONTROL

> **Este es el nexo central de la metodología.** Leer antes de cualquier sprint.
> **Canvas visual:** [[FLUJO_PROTOCOLO_TRABAJO]]

---

## 🏗️ Resumen en 30 segundos

Turpial Sound = **2 operadores** (Jean + Manuel) + **5 estaciones** de trabajo + **1 rama madre** + **4 reglas de oro**.

```
ABRIR SESIÓN → Leer docs → Crear rama → Codear → Validar (10 checks) → Push → Vercel preview → Jean merge a madre → Smoke → Main
```

**Cada push requiere:** `tsc --noEmit` + `pnpm build` + `git diff --check` + sin ESLint errors + vercel preview OK.

---

## 📋 Las 5 Estaciones

| # | Estación | Quién | Qué hace | Evidencia |
|---|----------|-------|----------|-----------|
| 1 | **Docs canónicos** | Ambos | Leer [[INSTRUCCION_APERTURA_SESION]] + [[00_CENTRAL_TURPIAL]] | Sesión iniciada |
| 2 | **Rama propia** | Ambos | `git checkout -b {Op}/{sprint}-{fecha}` desde madre | Rama creada |
| 3 | **Código + QA** | Ambos | Implementar scope, QA modules, Playwright, commits con prefijo | Commits |
| 4 | **Validación + Gate** | Jean (mergea), Manuel (valida) | 10 checks pre-push + Vercel preview | Checklist 10/10 |
| 5 | **Producción** | Jean | `git merge` a main → Vercel auto-deploy → smoke | `turpialsound.com` OK |

---

## 🔒 Las 4 Reglas de Oro

| # | Regla | Razón |
|---|-------|-------|
| 1 | **Una sola rama madre** | `RAMA MADRE`. Sin esto, divergencia. |
| 2 | **Jean es el gatekeeper** | Solo Jean mergea a madre y main. Nadie despliega directo a prod. |
| 3 | **Zonas exclusivas** | `/reservas` = Jean. `schema.prisma` = lock doble Jean+Manuel. |
| 4 | **Cerrar antes de abrir** | Sprint no empieza hasta que el anterior en su track está ✅ CERRADO. |

---

## 👥 Roles

| | Jean (BKG-dev) | Manuel (Manuel Vera) |
|---|---|---|
| **Zona** | `/reservas`, DB/schema, prod, merge gate, Vercel envs | `/marketplace`, QA, Playwright, docs, SEO, vault |
| **Puede** | Mergear a madre y main, gatekeeper de prod | Ejecutar sprints marketplace, QA, smoke, docs |
| **NO puede** | Desplegar sin validación de Manuel | Tocar `/reservas`, mergear a madre, tocar schema sin Jean |

---

## ✅ Pre-Push Checklist — OBLIGATORIO

> **Sin excepción. Si un solo check falla, el push se cancela.**

| # | Check | Comando | Bloquea |
|---|-------|---------|---------|
| 1 | **ESLint** | `pnpm run lint` | ✅ Error fatal |
| 2 | **TypeScript** | `npx tsc --noEmit` | ✅ No compila |
| 3 | **Build** | `pnpm run build` | ✅ No despliega |
| 4 | **Diff whitespace** | `git diff --check` | ✅ Whitespace corrupto |
| 5 | **Indentación** | Revisar tabs/spaces | ⚠️ Advertencia |
| 6 | **No .env en diff** | `git diff --name-only \| grep .env` | ✅ Riesgo seguridad |
| 7 | **No /reservas** | Si el sprint es marketplace | ✅ Zona exclusiva Jean |
| 8 | **No `as any`** | ESLint `no-explicit-any` | ✅ Error Vercel |
| 9 | **No type sin usar** | ESLint `no-unused-vars` | ✅ Error Vercel |
| 10 | **Vercel preview** | Verificar deploy OK | ✅ Sin preview no hay smoke |

### Script de validación pre-push

```bash
npx tsc --noEmit || return
pnpm run build || return
git diff --check || return
git diff --name-only HEAD~1..HEAD | grep "\.env" && echo "SECRETS!" && return
git push origin <rama>
npx vercel list | head -3
```

---

## 🚀 Vercel Preview Link

Al pushear, Vercel auto-despliega una preview. Obtener el link:

```bash
npx vercel list | head -3
# https://turpialsound-XXXXX-bkgs-projects-829c67c1.vercel.app
```

**Compartir el link con el otro operador.** Si falla el build, inspeccionar:

```bash
npx vercel inspect <url> --logs
```

---

## 🤝 Sincronizacion Bidireccional v4.0

Protocolo para que Jean y Manuel SIEMPRE vean la misma version de docs.

### Contrato anti-pisada

El resultado esperado de Obsidian/docs es:

1. La documentacion final es la fusion de lo ultimo de Manuel + lo ultimo de Jean.
2. Obsidian no es fuente de verdad; Git + madre dinamica + merge de tres vias son la fuente de verdad.
3. El cierre/reapertura automatica de Obsidian solo evita cache/escrituras tardias del vault.
4. Si ambos editan secciones distintas, `close-sprint.mjs` debe fusionarlas automaticamente.
5. Si ambos editan la misma seccion y Git no puede resolver, el cierre se bloquea con conflicto explicito. Nunca se elige silenciosamente a un operador.
6. Prohibido reemplazar `docs/` con `git checkout <rama> -- docs/` durante el cierre de madre. Eso es "ultimo writer wins" y rompe este contrato.

### Al abrir sesion (AMBOS)

```bash
node scripts/oreshnik/preflight.mjs --sprint SXX --operator Jean|Manuel --desc "descripcion"
```

El preflight v4.0 ejecuta automaticamente:
1. Fetch origin + sync forzado de docs desde la rama madre dinamica
2. Deteccion de ramas del otro operador con docs mas nuevos
3. Verificacion de cobertura de documentacion
4. Gestion de ramas (crea hija desde madre dinamica)

**La madre ya NO es un nombre fijo.** Cada cierre de sprint genera una nueva madre versionada: `MADRE/v{N}-{tags}-{fecha}`

### Actualizacion tecnica 2026-05-17 — Preflight v4.0 reparado

Durante S-MP-01 se corrigieron dos fallos del preflight:

- Se cerro correctamente el bloque de sync de docs desde madre en `scripts/oreshnik/preflight.mjs`. Antes el script podia abortar por error de sintaxis antes de validar rama/env/locks.
- Se agrego `readJsonFile(path, fallback)` para leer JSON operativos con tolerancia a BOM (`^\uFEFF`) y fallback seguro. Antes un cache o assignment JSON con BOM podia bloquear la apertura de sesion.

Archivos cubiertos:
- `.preflight-cache.json`
- `.mother-version.json`
- `.sprint-assignments.json`
- `.out-of-band.json`
- `docs/07_handoffs/zone-map.json`

Resultado:
- El Paso 0 vuelve a ser ejecutable end-to-end y mantiene sync de docs, branch management, bus de control y resiliencia sin quedar bloqueado por cache JSON invalida.

### Al cerrar sprint

```bash
node scripts/oreshnik/close-sprint.mjs --sprint SXX --operator Jean|Manuel --desc "desc"
```

El cierre v2.0 ejecuta automaticamente:
1. **Cobertura:** Verifica que TODOS los docs relacionados al codigo modificado esten actualizados
2. **Mecanica:** Actualiza timestamps, estados, y docs canonicos
3. **Git:** Commitea docs en rama hija, pushea hija, crea NUEVA rama madre con merge real de `docs/`
4. **Evento:** Registra cierre en `var/sprint-events/`

Desde 2026-05-18, el cierre usa `scripts/oreshnik/merge-docs-union.mjs` para fusionar exclusivamente `docs/` entre la madre vigente y la rama hija. El codigo de producto permanece en la rama hija. Para Markdown/texto usa merge automatico tipo union; para JSON aplica merge semantico basico. El objetivo operativo es no requerir intervencion humana en conflictos normales de documentacion.

### Flujo completo

```
ABRIR SESION → preflight v4.0 (jala docs de madre dinamica)
  ↓
CREAR RAMA HIJA → desde madre dinamica (hereda docs actualizados)
  ↓
EJECUTAR SPRINT → Codigo + docs
  ↓
CERRAR SPRINT → close-sprint v2.0 (verifica cobertura, actualiza docs, pushea)
  ↓
  ├─ Push COMPLETO a rama hija (codigo + docs)
  └─ Push SOLO docs a NUEVA rama madre dinamica
  ↓
JEAN INTEGRA CODIGO → mergea ramas hijas a madre
  ↓
PRODUCCION → main → Vercel → turpialsound.com
```

---

## 🔄 Flujo Completo

```
ABRIR SESIÓN → Leer INSTRUCCION_APERTURA_SESION + 00_CENTRAL
  ↓
PRE-FLIGHT → git fetch + QA-00 + verificar .env.local
  ↓
CREAR RAMA → git checkout -b {Operador}/{sprint}-{fecha}
  ↓
EJECUTAR → Código + QA + Playwright + commits con prefijo
  ↓
VALIDAR → 10 checks pre-push (tsc + build + diff + ESLint + preview)
  ↓
CERRAR → Actualizar 00_CENTRAL + commit + push + avisar al otro
  ↓
JEAN MERGE GATE → git merge a madre + push + Vercel preview link
  ↓
MANUEL SMOKE → /, /marketplace, /reservas, /api/bcv-rate, /admin/login
  ↓
JEAN RELEASE → git merge a main → Vercel → turpialsound.com
```

---

## 🧠 Oreshnik: HOY vs FUTURO

| Componente | HOY (v3.0) | FUTURO (Oreshnik) |
|-----------|-------------|-------------------|
| Pre-flight | ✅ `preflight.mjs` v3.0 automatico | `.husky/pre-commit` |
| Zone check | ✅ `zone-check.ps1` via preflight | Integrado en CI |
| Crear rama | ✅ `preflight.mjs` automatico (`{op}/{sprint}-{desc}-{fecha}`) | `scaffold-sprint.ps1` |
| Sync docs | ✅ `sync-obsidian.ps1` (respeta vault) | Integrado en pre-commit |
| Pre-push | Manual 10 checks | `.husky/pre-push` |
| Cerrar | Editar docs a mano | `generate-closure-report.ps1` |
| Vercel preview | `npx vercel list` | Link en commit message |

**Preflight v3.0** ya automatiza: sync docs, gestion de ramas, zone check, env check, bus de control (10 stop conditions), resiliencia.

---

## 📖 Documentos Canónicos

| # | Documento | Función |
|---|-----------|---------|
| 1 | [[00_CENTRAL_TURPIAL]] | **Fuente única de verdad.** Manda sobre todos. |
| 2 | [[INSTRUCCION_APERTURA_SESION]] | Qué hacer al abrir Kilo (Jean + Manuel). |
| 3 | [[PLAN_MAESTRO_SPRINTS]] | 27 sprints en 5 tracks. |
| 4 | [[BUS_CONTROL]] | Reglas del bus, locks, checklist. |
| 5 | [[METODOLOGIA_OPTIMIZACION]] | Detalle de automatizaciones Oreshnik. |
| 6 | `docs/07_handoffs/qa-dispatcher.json` | Despacho canónico QA. |

---

## 🚀 Ejecución Paralela Multi-Agente (v4.0+)

**Regla permanente:** El agente DEBE paralelizar sprints independientes siempre que sea posible.

### Condiciones para paralelizar

| Condición | Requisito |
|-----------|-----------|
| Zonas de código | Los sprints NO comparten archivos (sin riesgo de conflicto) |
| Dependencias | Ningún sprint depende del otro |
| Ramas | Cada sprint en su propia rama hija desde la misma madre |
| Agentes | Un agente Task por sprint, ejecutando en paralelo |

### Flujo de orquestación

```
1. Identificar sprints sin dependencias entre sí
2. Crear ramas hijas paralelas desde madre
3. Lanzar agentes Task en paralelo (uno por sprint)
4. Cada agente implementa, verifica (tsc + build), pero NO commitea
5. El orquestador commitea, pushea y cierra cada sprint con close-sprint.mjs
6. Merge a madre con --strategy=subtree para docs
```

### Ejemplo

```
Manuel pendientes: S-MP-02, S-MP-04, S-MP-06, S-MP-07, S-MP-08
Dependencias: S-MP-04 depende de S-MP-02, S-MP-07 depende de S-MP-05, S-MP-08 depende de S-MP-05+S-MP-06

Fase 1 (paralelo): S-MP-02 || S-MP-06  ← zonas distintas, sin dependencias
Fase 2 (paralelo): S-MP-04 || S-MP-07(dashboard)  ← S-MP-02 ya cerrado
Fase 3 (secuencial): S-MP-08 ← depende de S-MP-06
```

### Verificación post-agente

Cada agente devuelve:
- Archivos modificados
- Resultado de `tsc --noEmit`
- Resultado de `pnpm run build`

El orquestador verifica que no hay conflictos entre agentes antes de commitear.

---

## 🔗 Enlaces rápidos

- 📊 **Canvas:** [[FLUJO_PROTOCOLO_TRABAJO]]
- 🚀 **Apertura:** [[INSTRUCCION_APERTURA_SESION]]
- 🏠 **Dashboard:** [[00_CENTRAL_TURPIAL]]
- 📋 **Plan:** [[PLAN_MAESTRO_SPRINTS]]
- 🐛 **Bugs:** [[BUGS_CRITICOS]]
- 💱 **Tasas:** [[FLUJO_TASAS_BCV]]
- 🧪 **QA:** [[QA_HARNESS_CANVAS_2026-05-10]]

---

## 📋 Actualización Automática de Documentación — Protocolo anti-recurrencia

> **Objetivo:** Cada sprint cerrado deja TODOS los documentos actualizados.

### Documentos que DEBEN actualizarse al cerrar sprint

| # | Documento | Qué actualizar |
|---|-----------|---------------|
| 1 | `00_CENTRAL_TURPIAL.md` | `last_updated`, estado sprint, tracks, Vercel link |
| 2 | `PLAN_MAESTRO_SPRINTS` | `last_updated`, sprint a COMPLETADO |
| 3 | `S03_QA_HARNESS_INDEX` | Nuevos modulos QA, decisiones |
| 4 | `docs/marketplace/01_ROADMAP_AND_STATUS` | Nuevas features, APIs |
| 5 | `qa-dispatcher.json` | Registrar task_id canonico |
| 6 | `qa-canonical-runbook.md` | Documentar entradas nuevas |

### Trazabilidad código → docs

- `prisma/schema.prisma` → `ARQUITECTURA_TASAS`, `01_ROADMAP_AND_STATUS`
- `actions/marketplace/*.ts` → `01_ROADMAP_AND_STATUS`
- `scripts/qa/modules/*.mjs` → `qa-dispatcher.json`, `S03_QA_HARNESS_INDEX`
- `scripts/qa/playwright/*.mjs` → `qa-dispatcher.json`, `qa-canonical-runbook`
- `components/marketplace/*.tsx` / `app/marketplace/**` → `01_ROADMAP_AND_STATUS`

### Verificación de consistencia

```bash
Select-String "last_updated|actualizado" docs/obsidian-vault/00_CENTRAL_TURPIAL.md docs/obsidian-vault/PLAN_MAESTRO_SPRINTS_2026-05-12.md docs/obsidian-vault/INSTRUCCION_APERTURA_SESION.md docs/obsidian-vault/METODOLOGIA_ORESHNIK_ANEXO.md docs/marketplace/01_ROADMAP_AND_STATUS.md
# Todas las fechas deben coincidir
```
﻿---
type: methodology-nexus
project: "Turpial Sound"
fecha: 2026-05-17
actualizado: "2026-05-18T13:39:32.728Z"
metodologia: "Oreshnik v4.0 + Madre Dinamica + Cierre Automatizado"
tags:
  - "#central"
  - "#methodology"
  - "#nexus"
  - "#status/live-source"
  - "#jean"
  - "#manuel"
---

# 🧠 METODOLOGÍA ORESHNIK + BUS DE CONTROL

> **Este es el nexo central de la metodología.** Leer antes de cualquier sprint.
> **Canvas visual:** [[FLUJO_PROTOCOLO_TRABAJO]]

---

## 🏗️ Resumen en 30 segundos

Turpial Sound = **2 operadores** (Jean + Manuel) + **5 estaciones** de trabajo + **1 rama madre** + **4 reglas de oro**.

```
ABRIR SESIÓN → Leer docs → Crear rama → Codear → Validar (10 checks) → Push → Vercel preview → Jean merge a madre → Smoke → Main
```

**Cada push requiere:** `tsc --noEmit` + `pnpm build` + `git diff --check` + sin ESLint errors + vercel preview OK.

---

## 📋 Las 5 Estaciones

| # | Estación | Quién | Qué hace | Evidencia |
|---|----------|-------|----------|-----------|
| 1 | **Docs canónicos** | Ambos | Leer [[INSTRUCCION_APERTURA_SESION]] + [[00_CENTRAL_TURPIAL]] | Sesión iniciada |
| 2 | **Rama propia** | Ambos | `git checkout -b {Op}/{sprint}-{fecha}` desde madre | Rama creada |
| 3 | **Código + QA** | Ambos | Implementar scope, QA modules, Playwright, commits con prefijo | Commits |
| 4 | **Validación + Gate** | Jean (mergea), Manuel (valida) | 10 checks pre-push + Vercel preview | Checklist 10/10 |
| 5 | **Producción** | Jean | `git merge` a main → Vercel auto-deploy → smoke | `turpialsound.com` OK |

---

## 🔒 Las 4 Reglas de Oro

| # | Regla | Razón |
|---|-------|-------|
| 1 | **Una sola rama madre** | `RAMA MADRE`. Sin esto, divergencia. |
| 2 | **Jean es el gatekeeper** | Solo Jean mergea a madre y main. Nadie despliega directo a prod. |
| 3 | **Zonas exclusivas** | `/reservas` = Jean. `schema.prisma` = lock doble Jean+Manuel. |
| 4 | **Cerrar antes de abrir** | Sprint no empieza hasta que el anterior en su track está ✅ CERRADO. |

---

## 👥 Roles

| | Jean (BKG-dev) | Manuel (Manuel Vera) |
|---|---|---|
| **Zona** | `/reservas`, DB/schema, prod, merge gate, Vercel envs | `/marketplace`, QA, Playwright, docs, SEO, vault |
| **Puede** | Mergear a madre y main, gatekeeper de prod | Ejecutar sprints marketplace, QA, smoke, docs |
| **NO puede** | Desplegar sin validación de Manuel | Tocar `/reservas`, mergear a madre, tocar schema sin Jean |

---

## ✅ Pre-Push Checklist — OBLIGATORIO

> **Sin excepción. Si un solo check falla, el push se cancela.**

| # | Check | Comando | Bloquea |
|---|-------|---------|---------|
| 1 | **ESLint** | `pnpm run lint` | ✅ Error fatal |
| 2 | **TypeScript** | `npx tsc --noEmit` | ✅ No compila |
| 3 | **Build** | `pnpm run build` | ✅ No despliega |
| 4 | **Diff whitespace** | `git diff --check` | ✅ Whitespace corrupto |
| 5 | **Indentación** | Revisar tabs/spaces | ⚠️ Advertencia |
| 6 | **No .env en diff** | `git diff --name-only \| grep .env` | ✅ Riesgo seguridad |
| 7 | **No /reservas** | Si el sprint es marketplace | ✅ Zona exclusiva Jean |
| 8 | **No `as any`** | ESLint `no-explicit-any` | ✅ Error Vercel |
| 9 | **No type sin usar** | ESLint `no-unused-vars` | ✅ Error Vercel |
| 10 | **Vercel preview** | Verificar deploy OK | ✅ Sin preview no hay smoke |

### Script de validación pre-push

```bash
npx tsc --noEmit || return
pnpm run build || return
git diff --check || return
git diff --name-only HEAD~1..HEAD | grep "\.env" && echo "SECRETS!" && return
git push origin <rama>
npx vercel list | head -3
```

---

## 🚀 Vercel Preview Link

Al pushear, Vercel auto-despliega una preview. Obtener el link:

```bash
npx vercel list | head -3
# https://turpialsound-XXXXX-bkgs-projects-829c67c1.vercel.app
```

**Compartir el link con el otro operador.** Si falla el build, inspeccionar:

```bash
npx vercel inspect <url> --logs
```

---

## 🤝 Sincronizacion Bidireccional v4.0

Protocolo para que Jean y Manuel SIEMPRE vean la misma version de docs.

### Contrato anti-pisada

El resultado esperado de Obsidian/docs es:

1. La documentacion final es la fusion de lo ultimo de Manuel + lo ultimo de Jean.
2. Obsidian no es fuente de verdad; Git + madre dinamica + merge de tres vias son la fuente de verdad.
3. El cierre/reapertura automatica de Obsidian solo evita cache/escrituras tardias del vault.
4. Si ambos editan secciones distintas, `close-sprint.mjs` debe fusionarlas automaticamente.
5. Si ambos editan la misma seccion y Git no puede resolver, el cierre se bloquea con conflicto explicito. Nunca se elige silenciosamente a un operador.
6. Prohibido reemplazar `docs/` con `git checkout <rama> -- docs/` durante el cierre de madre. Eso es "ultimo writer wins" y rompe este contrato.

### Al abrir sesion (AMBOS)

```bash
node scripts/oreshnik/preflight.mjs --sprint SXX --operator Jean|Manuel --desc "descripcion"
```

El preflight v4.0 ejecuta automaticamente:
1. Fetch origin + sync forzado de docs desde la rama madre dinamica
2. Deteccion de ramas del otro operador con docs mas nuevos
3. Verificacion de cobertura de documentacion
4. Gestion de ramas (crea hija desde madre dinamica)

**La madre ya NO es un nombre fijo.** Cada cierre de sprint genera una nueva madre versionada: `MADRE/v{N}-{tags}-{fecha}`

### Actualizacion tecnica 2026-05-17 — Preflight v4.0 reparado

Durante S-MP-01 se corrigieron dos fallos del preflight:

- Se cerro correctamente el bloque de sync de docs desde madre en `scripts/oreshnik/preflight.mjs`. Antes el script podia abortar por error de sintaxis antes de validar rama/env/locks.
- Se agrego `readJsonFile(path, fallback)` para leer JSON operativos con tolerancia a BOM (`^\uFEFF`) y fallback seguro. Antes un cache o assignment JSON con BOM podia bloquear la apertura de sesion.

Archivos cubiertos:
- `.preflight-cache.json`
- `.mother-version.json`
- `.sprint-assignments.json`
- `.out-of-band.json`
- `docs/07_handoffs/zone-map.json`

Resultado:
- El Paso 0 vuelve a ser ejecutable end-to-end y mantiene sync de docs, branch management, bus de control y resiliencia sin quedar bloqueado por cache JSON invalida.

### Al cerrar sprint

```bash
node scripts/oreshnik/close-sprint.mjs --sprint SXX --operator Jean|Manuel --desc "desc"
```

El cierre v2.0 ejecuta automaticamente:
1. **Cobertura:** Verifica que TODOS los docs relacionados al codigo modificado esten actualizados
2. **Mecanica:** Actualiza timestamps, estados, y docs canonicos
3. **Git:** Commitea docs en rama hija, pushea hija, crea NUEVA rama madre con merge real de `docs/`
4. **Evento:** Registra cierre en `var/sprint-events/`

Desde 2026-05-18, el cierre usa `scripts/oreshnik/merge-docs-union.mjs` para fusionar exclusivamente `docs/` entre la madre vigente y la rama hija. El codigo de producto permanece en la rama hija. Para Markdown/texto usa merge automatico tipo union; para JSON aplica merge semantico basico. El objetivo operativo es no requerir intervencion humana en conflictos normales de documentacion.

### Flujo completo

```
ABRIR SESION → preflight v4.0 (jala docs de madre dinamica)
  ↓
CREAR RAMA HIJA → desde madre dinamica (hereda docs actualizados)
  ↓
EJECUTAR SPRINT → Codigo + docs
  ↓
CERRAR SPRINT → close-sprint v2.0 (verifica cobertura, actualiza docs, pushea)
  ↓
  ├─ Push COMPLETO a rama hija (codigo + docs)
  └─ Push SOLO docs a NUEVA rama madre dinamica
  ↓
JEAN INTEGRA CODIGO → mergea ramas hijas a madre
  ↓
PRODUCCION → main → Vercel → turpialsound.com
```

---

## 🔄 Flujo Completo

```
ABRIR SESIÓN → Leer INSTRUCCION_APERTURA_SESION + 00_CENTRAL
  ↓
PRE-FLIGHT → git fetch + QA-00 + verificar .env.local
  ↓
CREAR RAMA → git checkout -b {Operador}/{sprint}-{fecha}
  ↓
EJECUTAR → Código + QA + Playwright + commits con prefijo
  ↓
VALIDAR → 10 checks pre-push (tsc + build + diff + ESLint + preview)
  ↓
CERRAR → Actualizar 00_CENTRAL + commit + push + avisar al otro
  ↓
JEAN MERGE GATE → git merge a madre + push + Vercel preview link
  ↓
MANUEL SMOKE → /, /marketplace, /reservas, /api/bcv-rate, /admin/login
  ↓
JEAN RELEASE → git merge a main → Vercel → turpialsound.com
```

---

## 🧠 Oreshnik: HOY vs FUTURO

| Componente | HOY (v3.0) | FUTURO (Oreshnik) |
|-----------|-------------|-------------------|
| Pre-flight | ✅ `preflight.mjs` v3.0 automatico | `.husky/pre-commit` |
| Zone check | ✅ `zone-check.ps1` via preflight | Integrado en CI |
| Crear rama | ✅ `preflight.mjs` automatico (`{op}/{sprint}-{desc}-{fecha}`) | `scaffold-sprint.ps1` |
| Sync docs | ✅ `sync-obsidian.ps1` (respeta vault) | Integrado en pre-commit |
| Pre-push | Manual 10 checks | `.husky/pre-push` |
| Cerrar | Editar docs a mano | `generate-closure-report.ps1` |
| Vercel preview | `npx vercel list` | Link en commit message |

**Preflight v3.0** ya automatiza: sync docs, gestion de ramas, zone check, env check, bus de control (10 stop conditions), resiliencia.

---

## 📖 Documentos Canónicos

| # | Documento | Función |
|---|-----------|---------|
| 1 | [[00_CENTRAL_TURPIAL]] | **Fuente única de verdad.** Manda sobre todos. |
| 2 | [[INSTRUCCION_APERTURA_SESION]] | Qué hacer al abrir Kilo (Jean + Manuel). |
| 3 | [[PLAN_MAESTRO_SPRINTS]] | 27 sprints en 5 tracks. |
| 4 | [[BUS_CONTROL]] | Reglas del bus, locks, checklist. |
| 5 | [[METODOLOGIA_OPTIMIZACION]] | Detalle de automatizaciones Oreshnik. |
| 6 | `docs/07_handoffs/qa-dispatcher.json` | Despacho canónico QA. |

---

## 🔗 Enlaces rápidos

- 📊 **Canvas:** [[FLUJO_PROTOCOLO_TRABAJO]]
- 🚀 **Apertura:** [[INSTRUCCION_APERTURA_SESION]]
- 🏠 **Dashboard:** [[00_CENTRAL_TURPIAL]]
- 📋 **Plan:** [[PLAN_MAESTRO_SPRINTS]]
- 🐛 **Bugs:** [[BUGS_CRITICOS]]
- 💱 **Tasas:** [[FLUJO_TASAS_BCV]]
- 🧪 **QA:** [[QA_HARNESS_CANVAS_2026-05-10]]

---

## 📋 Actualización Automática de Documentación — Protocolo anti-recurrencia

> **Objetivo:** Cada sprint cerrado deja TODOS los documentos actualizados.

### Documentos que DEBEN actualizarse al cerrar sprint

| # | Documento | Qué actualizar |
|---|-----------|---------------|
| 1 | `00_CENTRAL_TURPIAL.md` | `last_updated`, estado sprint, tracks, Vercel link |
| 2 | `PLAN_MAESTRO_SPRINTS` | `last_updated`, sprint a COMPLETADO |
| 3 | `S03_QA_HARNESS_INDEX` | Nuevos modulos QA, decisiones |
| 4 | `docs/marketplace/01_ROADMAP_AND_STATUS` | Nuevas features, APIs |
| 5 | `qa-dispatcher.json` | Registrar task_id canonico |
| 6 | `qa-canonical-runbook.md` | Documentar entradas nuevas |

### Trazabilidad código → docs

- `prisma/schema.prisma` → `ARQUITECTURA_TASAS`, `01_ROADMAP_AND_STATUS`
- `actions/marketplace/*.ts` → `01_ROADMAP_AND_STATUS`
- `scripts/qa/modules/*.mjs` → `qa-dispatcher.json`, `S03_QA_HARNESS_INDEX`
- `scripts/qa/playwright/*.mjs` → `qa-dispatcher.json`, `qa-canonical-runbook`
- `components/marketplace/*.tsx` / `app/marketplace/**` → `01_ROADMAP_AND_STATUS`

### Verificación de consistencia

```bash
Select-String "last_updated|actualizado" docs/obsidian-vault/00_CENTRAL_TURPIAL.md docs/obsidian-vault/PLAN_MAESTRO_SPRINTS_2026-05-12.md docs/obsidian-vault/INSTRUCCION_APERTURA_SESION.md docs/obsidian-vault/METODOLOGIA_ORESHNIK_ANEXO.md docs/marketplace/01_ROADMAP_AND_STATUS.md
# Todas las fechas deben coincidir
```
﻿---
type: methodology-nexus
project: "Turpial Sound"
fecha: 2026-05-17
actualizado: "2026-05-18T13:09:54.458Z"
metodologia: "Oreshnik v4.0 + Madre Dinamica + Cierre Automatizado"
tags:
  - "#central"
  - "#methodology"
  - "#nexus"
  - "#status/live-source"
  - "#jean"
  - "#manuel"
---

# 🧠 METODOLOGÍA ORESHNIK + BUS DE CONTROL

> **Este es el nexo central de la metodología.** Leer antes de cualquier sprint.
> **Canvas visual:** [[FLUJO_PROTOCOLO_TRABAJO]]

---

## 🏗️ Resumen en 30 segundos

Turpial Sound = **2 operadores** (Jean + Manuel) + **5 estaciones** de trabajo + **1 rama madre** + **4 reglas de oro**.

```
ABRIR SESIÓN → Leer docs → Crear rama → Codear → Validar (10 checks) → Push → Vercel preview → Jean merge a madre → Smoke → Main
```

**Cada push requiere:** `tsc --noEmit` + `pnpm build` + `git diff --check` + sin ESLint errors + vercel preview OK.

---

## 📋 Las 5 Estaciones

| # | Estación | Quién | Qué hace | Evidencia |
|---|----------|-------|----------|-----------|
| 1 | **Docs canónicos** | Ambos | Leer [[INSTRUCCION_APERTURA_SESION]] + [[00_CENTRAL_TURPIAL]] | Sesión iniciada |
| 2 | **Rama propia** | Ambos | `git checkout -b {Op}/{sprint}-{fecha}` desde madre | Rama creada |
| 3 | **Código + QA** | Ambos | Implementar scope, QA modules, Playwright, commits con prefijo | Commits |
| 4 | **Validación + Gate** | Jean (mergea), Manuel (valida) | 10 checks pre-push + Vercel preview | Checklist 10/10 |
| 5 | **Producción** | Jean | `git merge` a main → Vercel auto-deploy → smoke | `turpialsound.com` OK |

---

## 🔒 Las 4 Reglas de Oro

| # | Regla | Razón |
|---|-------|-------|
| 1 | **Una sola rama madre** | `RAMA MADRE`. Sin esto, divergencia. |
| 2 | **Jean es el gatekeeper** | Solo Jean mergea a madre y main. Nadie despliega directo a prod. |
| 3 | **Zonas exclusivas** | `/reservas` = Jean. `schema.prisma` = lock doble Jean+Manuel. |
| 4 | **Cerrar antes de abrir** | Sprint no empieza hasta que el anterior en su track está ✅ CERRADO. |

---

## 👥 Roles

| | Jean (BKG-dev) | Manuel (Manuel Vera) |
|---|---|---|
| **Zona** | `/reservas`, DB/schema, prod, merge gate, Vercel envs | `/marketplace`, QA, Playwright, docs, SEO, vault |
| **Puede** | Mergear a madre y main, gatekeeper de prod | Ejecutar sprints marketplace, QA, smoke, docs |
| **NO puede** | Desplegar sin validación de Manuel | Tocar `/reservas`, mergear a madre, tocar schema sin Jean |

---

## ✅ Pre-Push Checklist — OBLIGATORIO

> **Sin excepción. Si un solo check falla, el push se cancela.**

| # | Check | Comando | Bloquea |
|---|-------|---------|---------|
| 1 | **ESLint** | `pnpm run lint` | ✅ Error fatal |
| 2 | **TypeScript** | `npx tsc --noEmit` | ✅ No compila |
| 3 | **Build** | `pnpm run build` | ✅ No despliega |
| 4 | **Diff whitespace** | `git diff --check` | ✅ Whitespace corrupto |
| 5 | **Indentación** | Revisar tabs/spaces | ⚠️ Advertencia |
| 6 | **No .env en diff** | `git diff --name-only \| grep .env` | ✅ Riesgo seguridad |
| 7 | **No /reservas** | Si el sprint es marketplace | ✅ Zona exclusiva Jean |
| 8 | **No `as any`** | ESLint `no-explicit-any` | ✅ Error Vercel |
| 9 | **No type sin usar** | ESLint `no-unused-vars` | ✅ Error Vercel |
| 10 | **Vercel preview** | Verificar deploy OK | ✅ Sin preview no hay smoke |

### Script de validación pre-push

```bash
npx tsc --noEmit || return
pnpm run build || return
git diff --check || return
git diff --name-only HEAD~1..HEAD | grep "\.env" && echo "SECRETS!" && return
git push origin <rama>
npx vercel list | head -3
```

---

## 🚀 Vercel Preview Link

Al pushear, Vercel auto-despliega una preview. Obtener el link:

```bash
npx vercel list | head -3
# https://turpialsound-XXXXX-bkgs-projects-829c67c1.vercel.app
```

**Compartir el link con el otro operador.** Si falla el build, inspeccionar:

```bash
npx vercel inspect <url> --logs
```

---

## 🤝 Sincronizacion Bidireccional v4.0

Protocolo para que Jean y Manuel SIEMPRE vean la misma version de docs.

### Contrato anti-pisada

El resultado esperado de Obsidian/docs es:

1. La documentacion final es la fusion de lo ultimo de Manuel + lo ultimo de Jean.
2. Obsidian no es fuente de verdad; Git + madre dinamica + merge de tres vias son la fuente de verdad.
3. El cierre/reapertura automatica de Obsidian solo evita cache/escrituras tardias del vault.
4. Si ambos editan secciones distintas, `close-sprint.mjs` debe fusionarlas automaticamente.
5. Si ambos editan la misma seccion y Git no puede resolver, el cierre se bloquea con conflicto explicito. Nunca se elige silenciosamente a un operador.
6. Prohibido reemplazar `docs/` con `git checkout <rama> -- docs/` durante el cierre de madre. Eso es "ultimo writer wins" y rompe este contrato.

### Al abrir sesion (AMBOS)

```bash
node scripts/oreshnik/preflight.mjs --sprint SXX --operator Jean|Manuel --desc "descripcion"
```

El preflight v4.0 ejecuta automaticamente:
1. Fetch origin + sync forzado de docs desde la rama madre dinamica
2. Deteccion de ramas del otro operador con docs mas nuevos
3. Verificacion de cobertura de documentacion
4. Gestion de ramas (crea hija desde madre dinamica)

**La madre ya NO es un nombre fijo.** Cada cierre de sprint genera una nueva madre versionada: `MADRE/v{N}-{tags}-{fecha}`

### Actualizacion tecnica 2026-05-17 — Preflight v4.0 reparado

Durante S-MP-01 se corrigieron dos fallos del preflight:

- Se cerro correctamente el bloque de sync de docs desde madre en `scripts/oreshnik/preflight.mjs`. Antes el script podia abortar por error de sintaxis antes de validar rama/env/locks.
- Se agrego `readJsonFile(path, fallback)` para leer JSON operativos con tolerancia a BOM (`^\uFEFF`) y fallback seguro. Antes un cache o assignment JSON con BOM podia bloquear la apertura de sesion.

Archivos cubiertos:
- `.preflight-cache.json`
- `.mother-version.json`
- `.sprint-assignments.json`
- `.out-of-band.json`
- `docs/07_handoffs/zone-map.json`

Resultado:
- El Paso 0 vuelve a ser ejecutable end-to-end y mantiene sync de docs, branch management, bus de control y resiliencia sin quedar bloqueado por cache JSON invalida.

### Al cerrar sprint

```bash
node scripts/oreshnik/close-sprint.mjs --sprint SXX --operator Jean|Manuel --desc "desc"
```

El cierre v2.0 ejecuta automaticamente:
1. **Cobertura:** Verifica que TODOS los docs relacionados al codigo modificado esten actualizados
2. **Mecanica:** Actualiza timestamps, estados, y docs canonicos
3. **Git:** Commitea docs en rama hija, pushea hija, crea NUEVA rama madre con merge real de `docs/`
4. **Evento:** Registra cierre en `var/sprint-events/`

Desde 2026-05-18, el cierre usa `scripts/oreshnik/merge-docs-union.mjs` para fusionar exclusivamente `docs/` entre la madre vigente y la rama hija. El codigo de producto permanece en la rama hija. Para Markdown/texto usa merge automatico tipo union; para JSON aplica merge semantico basico. El objetivo operativo es no requerir intervencion humana en conflictos normales de documentacion.

### Flujo completo

```
ABRIR SESION → preflight v4.0 (jala docs de madre dinamica)
  ↓
CREAR RAMA HIJA → desde madre dinamica (hereda docs actualizados)
  ↓
EJECUTAR SPRINT → Codigo + docs
  ↓
CERRAR SPRINT → close-sprint v2.0 (verifica cobertura, actualiza docs, pushea)
  ↓
  ├─ Push COMPLETO a rama hija (codigo + docs)
  └─ Push SOLO docs a NUEVA rama madre dinamica
  ↓
JEAN INTEGRA CODIGO → mergea ramas hijas a madre
  ↓
PRODUCCION → main → Vercel → turpialsound.com
```

---

## 🔄 Flujo Completo

```
ABRIR SESIÓN → Leer INSTRUCCION_APERTURA_SESION + 00_CENTRAL
  ↓
PRE-FLIGHT → git fetch + QA-00 + verificar .env.local
  ↓
CREAR RAMA → git checkout -b {Operador}/{sprint}-{fecha}
  ↓
EJECUTAR → Código + QA + Playwright + commits con prefijo
  ↓
VALIDAR → 10 checks pre-push (tsc + build + diff + ESLint + preview)
  ↓
CERRAR → Actualizar 00_CENTRAL + commit + push + avisar al otro
  ↓
JEAN MERGE GATE → git merge a madre + push + Vercel preview link
  ↓
MANUEL SMOKE → /, /marketplace, /reservas, /api/bcv-rate, /admin/login
  ↓
JEAN RELEASE → git merge a main → Vercel → turpialsound.com
```

---

## 🧠 Oreshnik: HOY vs FUTURO

| Componente | HOY (v3.0) | FUTURO (Oreshnik) |
|-----------|-------------|-------------------|
| Pre-flight | ✅ `preflight.mjs` v3.0 automatico | `.husky/pre-commit` |
| Zone check | ✅ `zone-check.ps1` via preflight | Integrado en CI |
| Crear rama | ✅ `preflight.mjs` automatico (`{op}/{sprint}-{desc}-{fecha}`) | `scaffold-sprint.ps1` |
| Sync docs | ✅ `sync-obsidian.ps1` (respeta vault) | Integrado en pre-commit |
| Pre-push | Manual 10 checks | `.husky/pre-push` |
| Cerrar | Editar docs a mano | `generate-closure-report.ps1` |
| Vercel preview | `npx vercel list` | Link en commit message |

**Preflight v3.0** ya automatiza: sync docs, gestion de ramas, zone check, env check, bus de control (10 stop conditions), resiliencia.

---

## 📖 Documentos Canónicos

| # | Documento | Función |
|---|-----------|---------|
| 1 | [[00_CENTRAL_TURPIAL]] | **Fuente única de verdad.** Manda sobre todos. |
| 2 | [[INSTRUCCION_APERTURA_SESION]] | Qué hacer al abrir Kilo (Jean + Manuel). |
| 3 | [[PLAN_MAESTRO_SPRINTS]] | 27 sprints en 5 tracks. |
| 4 | [[BUS_CONTROL]] | Reglas del bus, locks, checklist. |
| 5 | [[METODOLOGIA_OPTIMIZACION]] | Detalle de automatizaciones Oreshnik. |
| 6 | `docs/07_handoffs/qa-dispatcher.json` | Despacho canónico QA. |

---

## 🚀 Ejecución Paralela Multi-Agente (v4.0+)

**Regla permanente:** El agente DEBE paralelizar sprints independientes siempre que sea posible.

### Condiciones para paralelizar

| Condición | Requisito |
|-----------|-----------|
| Zonas de código | Los sprints NO comparten archivos (sin riesgo de conflicto) |
| Dependencias | Ningún sprint depende del otro |
| Ramas | Cada sprint en su propia rama hija desde la misma madre |
| Agentes | Un agente Task por sprint, ejecutando en paralelo |

### Flujo de orquestación

```
1. Identificar sprints sin dependencias entre sí
2. Crear ramas hijas paralelas desde madre
3. Lanzar agentes Task en paralelo (uno por sprint)
4. Cada agente implementa, verifica (tsc + build), pero NO commitea
5. El orquestador commitea, pushea y cierra cada sprint con close-sprint.mjs
6. Merge a madre con --strategy=subtree para docs
```

### Ejemplo

```
Manuel pendientes: S-MP-02, S-MP-04, S-MP-06, S-MP-07, S-MP-08
Dependencias: S-MP-04 depende de S-MP-02, S-MP-07 depende de S-MP-05, S-MP-08 depende de S-MP-05+S-MP-06

Fase 1 (paralelo): S-MP-02 || S-MP-06  ← zonas distintas, sin dependencias
Fase 2 (paralelo): S-MP-04 || S-MP-07(dashboard)  ← S-MP-02 ya cerrado
Fase 3 (secuencial): S-MP-08 ← depende de S-MP-06
```

### Verificación post-agente

Cada agente devuelve:
- Archivos modificados
- Resultado de `tsc --noEmit`
- Resultado de `pnpm run build`

El orquestador verifica que no hay conflictos entre agentes antes de commitear.

---

## 🔗 Enlaces rápidos

- 📊 **Canvas:** [[FLUJO_PROTOCOLO_TRABAJO]]
- 🚀 **Apertura:** [[INSTRUCCION_APERTURA_SESION]]
- 🏠 **Dashboard:** [[00_CENTRAL_TURPIAL]]
- 📋 **Plan:** [[PLAN_MAESTRO_SPRINTS]]
- 🐛 **Bugs:** [[BUGS_CRITICOS]]
- 💱 **Tasas:** [[FLUJO_TASAS_BCV]]
- 🧪 **QA:** [[QA_HARNESS_CANVAS_2026-05-10]]

---

## 📋 Actualización Automática de Documentación — Protocolo anti-recurrencia

> **Objetivo:** Cada sprint cerrado deja TODOS los documentos actualizados.

### Documentos que DEBEN actualizarse al cerrar sprint

| # | Documento | Qué actualizar |
|---|-----------|---------------|
| 1 | `00_CENTRAL_TURPIAL.md` | `last_updated`, estado sprint, tracks, Vercel link |
| 2 | `PLAN_MAESTRO_SPRINTS` | `last_updated`, sprint a COMPLETADO |
| 3 | `S03_QA_HARNESS_INDEX` | Nuevos modulos QA, decisiones |
| 4 | `docs/marketplace/01_ROADMAP_AND_STATUS` | Nuevas features, APIs |
| 5 | `qa-dispatcher.json` | Registrar task_id canonico |
| 6 | `qa-canonical-runbook.md` | Documentar entradas nuevas |

### Trazabilidad código → docs

- `prisma/schema.prisma` → `ARQUITECTURA_TASAS`, `01_ROADMAP_AND_STATUS`
- `actions/marketplace/*.ts` → `01_ROADMAP_AND_STATUS`
- `scripts/qa/modules/*.mjs` → `qa-dispatcher.json`, `S03_QA_HARNESS_INDEX`
- `scripts/qa/playwright/*.mjs` → `qa-dispatcher.json`, `qa-canonical-runbook`
- `components/marketplace/*.tsx` / `app/marketplace/**` → `01_ROADMAP_AND_STATUS`

### Verificación de consistencia

```bash
Select-String "last_updated|actualizado" docs/obsidian-vault/00_CENTRAL_TURPIAL.md docs/obsidian-vault/PLAN_MAESTRO_SPRINTS_2026-05-12.md docs/obsidian-vault/INSTRUCCION_APERTURA_SESION.md docs/obsidian-vault/METODOLOGIA_ORESHNIK_ANEXO.md docs/marketplace/01_ROADMAP_AND_STATUS.md
# Todas las fechas deben coincidir
```
﻿---
type: methodology-nexus
project: "Turpial Sound"
fecha: 2026-05-19
actualizado: "2026-05-19T23:27:00Z"
metodologia: "Oreshnik v4.0 + Madre Dinamica + Cierre Automatizado"
tags:
  - "#central"
  - "#methodology"
  - "#nexus"
  - "#status/live-source"
  - "#jean"
  - "#manuel"
---

# 🧠 METODOLOGÍA ORESHNIK + BUS DE CONTROL

> **Este es el nexo central de la metodología.** Leer antes de cualquier sprint.
> **Canvas visual:** [[FLUJO_PROTOCOLO_TRABAJO]]

---

## 🏗️ Resumen en 30 segundos

Turpial Sound = **2 operadores** (Jean + Manuel) + **5 estaciones** de trabajo + **1 rama madre** + **4 reglas de oro**.

```
ABRIR SESIÓN → Leer docs → Crear rama → Codear → Validar (10 checks) → Push → Vercel preview → Jean merge a madre → Smoke → Main
```

**Cada push requiere:** `tsc --noEmit` + `pnpm build` + `git diff --check` + sin ESLint errors + vercel preview OK.

---

## 📋 Las 5 Estaciones

| # | Estación | Quién | Qué hace | Evidencia |
|---|----------|-------|----------|-----------|
| 1 | **Docs canónicos** | Ambos | Leer [[INSTRUCCION_APERTURA_SESION]] + [[00_CENTRAL_TURPIAL]] | Sesión iniciada |
| 2 | **Rama propia** | Ambos | `git checkout -b {Op}/{sprint}-{fecha}` desde madre | Rama creada |
| 3 | **Código + QA** | Ambos | Implementar scope, QA modules, Playwright, commits con prefijo | Commits |
| 4 | **Validación + Gate** | Jean (mergea), Manuel (valida) | 10 checks pre-push + Vercel preview | Checklist 10/10 |
| 5 | **Producción** | Jean | `git merge` a main → Vercel auto-deploy → smoke | `turpialsound.com` OK |

---

## 🔒 Las 4 Reglas de Oro

| # | Regla | Razón |
|---|-------|-------|
| 1 | **Una sola rama madre** | `RAMA MADRE`. Sin esto, divergencia. |
| 2 | **Jean es el gatekeeper** | Solo Jean mergea a madre y main. Nadie despliega directo a prod. |
| 3 | **Zonas exclusivas** | `/reservas` = Jean. `schema.prisma` = lock doble Jean+Manuel. |
| 4 | **Cerrar antes de abrir** | Sprint no empieza hasta que el anterior en su track está ✅ CERRADO. |

---

## 👥 Roles

| | Jean (BKG-dev) | Manuel (Manuel Vera) |
|---|---|---|
| **Zona** | `/reservas`, DB/schema, prod, merge gate, Vercel envs | `/marketplace`, QA, Playwright, docs, SEO, vault |
| **Puede** | Mergear a madre y main, gatekeeper de prod | Ejecutar sprints marketplace, QA, smoke, docs |
| **NO puede** | Desplegar sin validación de Manuel | Tocar `/reservas`, mergear a madre, tocar schema sin Jean |

---

## ✅ Pre-Push Checklist — OBLIGATORIO

> **Sin excepción. Si un solo check falla, el push se cancela.**

| # | Check | Comando | Bloquea |
|---|-------|---------|---------|
| 1 | **ESLint** | `pnpm run lint` | ✅ Error fatal |
| 2 | **TypeScript** | `npx tsc --noEmit` | ✅ No compila |
| 3 | **Build** | `pnpm run build` | ✅ No despliega |
| 4 | **Diff whitespace** | `git diff --check` | ✅ Whitespace corrupto |
| 5 | **Indentación** | Revisar tabs/spaces | ⚠️ Advertencia |
| 6 | **No .env en diff** | `git diff --name-only \| grep .env` | ✅ Riesgo seguridad |
| 7 | **No /reservas** | Si el sprint es marketplace | ✅ Zona exclusiva Jean |
| 8 | **No `as any`** | ESLint `no-explicit-any` | ✅ Error Vercel |
| 9 | **No type sin usar** | ESLint `no-unused-vars` | ✅ Error Vercel |
| 10 | **Vercel preview** | Verificar deploy OK | ✅ Sin preview no hay smoke |

### Script de validación pre-push

```bash
npx tsc --noEmit || return
pnpm run build || return
git diff --check || return
git diff --name-only HEAD~1..HEAD | grep "\.env" && echo "SECRETS!" && return
git push origin <rama>
npx vercel list | head -3
```

---

## 🚀 Vercel Preview Link

Al pushear, Vercel auto-despliega una preview. Obtener el link:

```bash
npx vercel list | head -3
# https://turpialsound-XXXXX-bkgs-projects-829c67c1.vercel.app
```

**Compartir el link con el otro operador.** Si falla el build, inspeccionar:

```bash
npx vercel inspect <url> --logs
```

---

## 🤝 Sincronizacion Bidireccional v4.0

Protocolo para que Jean y Manuel SIEMPRE vean la misma version de docs.

### Contrato anti-pisada

El resultado esperado de Obsidian/docs es:

1. La documentacion final es la fusion de lo ultimo de Manuel + lo ultimo de Jean.
2. Obsidian no es fuente de verdad; Git + madre dinamica + merge de tres vias son la fuente de verdad.
3. El cierre/reapertura automatica de Obsidian solo evita cache/escrituras tardias del vault.
4. Si ambos editan secciones distintas, `close-sprint.mjs` debe fusionarlas automaticamente.
5. Si ambos editan la misma seccion y Git no puede resolver, el cierre se bloquea con conflicto explicito. Nunca se elige silenciosamente a un operador.
6. Prohibido reemplazar `docs/` con `git checkout <rama> -- docs/` durante el cierre de madre. Eso es "ultimo writer wins" y rompe este contrato.

### Al abrir sesion (AMBOS)

```bash
node scripts/oreshnik/preflight.mjs --sprint SXX --operator Jean|Manuel --desc "descripcion"
```

El preflight v4.0 ejecuta automaticamente:
1. Fetch origin + sync forzado de docs desde la rama madre dinamica
2. Deteccion de ramas del otro operador con docs mas nuevos
3. Verificacion de cobertura de documentacion
4. Gestion de ramas (crea hija desde madre dinamica)

**La madre ya NO es un nombre fijo.** Cada cierre de sprint genera una nueva madre versionada: `MADRE/v{N}-{tags}-{fecha}`

### Actualizacion tecnica 2026-05-17 — Preflight v4.0 reparado

Durante S-MP-01 se corrigieron dos fallos del preflight:

- Se cerro correctamente el bloque de sync de docs desde madre en `scripts/oreshnik/preflight.mjs`. Antes el script podia abortar por error de sintaxis antes de validar rama/env/locks.
- Se agrego `readJsonFile(path, fallback)` para leer JSON operativos con tolerancia a BOM (`^\uFEFF`) y fallback seguro. Antes un cache o assignment JSON con BOM podia bloquear la apertura de sesion.

Archivos cubiertos:
- `.preflight-cache.json`
- `.mother-version.json`
- `.sprint-assignments.json`
- `.out-of-band.json`
- `docs/07_handoffs/zone-map.json`

Resultado:
- El Paso 0 vuelve a ser ejecutable end-to-end y mantiene sync de docs, branch management, bus de control y resiliencia sin quedar bloqueado por cache JSON invalida.

### Al cerrar sprint

```bash
node scripts/oreshnik/close-sprint.mjs --sprint SXX --operator Jean|Manuel --desc "desc"
```

El cierre v2.0 ejecuta automaticamente:
1. **Cobertura:** Verifica que TODOS los docs relacionados al codigo modificado esten actualizados
2. **Mecanica:** Actualiza timestamps, estados, y docs canonicos
3. **Git:** Commitea docs en rama hija, pushea hija, crea NUEVA rama madre con merge real de `docs/`
4. **Evento:** Registra cierre en `var/sprint-events/`

Desde 2026-05-18, el cierre usa `scripts/oreshnik/merge-docs-union.mjs` para fusionar exclusivamente `docs/` entre la madre vigente y la rama hija. El codigo de producto permanece en la rama hija. Para Markdown/texto usa merge automatico tipo union; para JSON aplica merge semantico basico. El objetivo operativo es no requerir intervencion humana en conflictos normales de documentacion.

### Flujo completo

```
ABRIR SESION → preflight v4.0 (jala docs de madre dinamica)
  ↓
CREAR RAMA HIJA → desde madre dinamica (hereda docs actualizados)
  ↓
EJECUTAR SPRINT → Codigo + docs
  ↓
CERRAR SPRINT → close-sprint v2.0 (verifica cobertura, actualiza docs, pushea)
  ↓
  ├─ Push COMPLETO a rama hija (codigo + docs)
  └─ Push SOLO docs a NUEVA rama madre dinamica
  ↓
JEAN INTEGRA CODIGO → mergea ramas hijas a madre
  ↓
PRODUCCION → main → Vercel → turpialsound.com
```

---

## 🔄 Flujo Completo

```
ABRIR SESIÓN → Leer INSTRUCCION_APERTURA_SESION + 00_CENTRAL
  ↓
PRE-FLIGHT → git fetch + QA-00 + verificar .env.local
  ↓
CREAR RAMA → git checkout -b {Operador}/{sprint}-{fecha}
  ↓
EJECUTAR → Código + QA + Playwright + commits con prefijo
  ↓
VALIDAR → 10 checks pre-push (tsc + build + diff + ESLint + preview)
  ↓
CERRAR → Actualizar 00_CENTRAL + commit + push + avisar al otro
  ↓
JEAN MERGE GATE → git merge a madre + push + Vercel preview link
  ↓
MANUEL SMOKE → /, /marketplace, /reservas, /api/bcv-rate, /admin/login
  ↓
JEAN RELEASE → git merge a main → Vercel → turpialsound.com
```

---

## 🧠 Oreshnik: HOY vs FUTURO

| Componente | HOY (v3.0) | FUTURO (Oreshnik) |
|-----------|-------------|-------------------|
| Pre-flight | ✅ `preflight.mjs` v3.0 automatico | `.husky/pre-commit` |
| Zone check | ✅ `zone-check.ps1` via preflight | Integrado en CI |
| Crear rama | ✅ `preflight.mjs` automatico (`{op}/{sprint}-{desc}-{fecha}`) | `scaffold-sprint.ps1` |
| Sync docs | ✅ `sync-obsidian.ps1` (respeta vault) | Integrado en pre-commit |
| Pre-push | Manual 10 checks | `.husky/pre-push` |
| Cerrar | Editar docs a mano | `generate-closure-report.ps1` |
| Vercel preview | `npx vercel list` | Link en commit message |

**Preflight v3.0** ya automatiza: sync docs, gestion de ramas, zone check, env check, bus de control (10 stop conditions), resiliencia.

---

## 📖 Documentos Canónicos

| # | Documento | Función |
|---|-----------|---------|
| 1 | [[00_CENTRAL_TURPIAL]] | **Fuente única de verdad.** Manda sobre todos. |
| 2 | [[INSTRUCCION_APERTURA_SESION]] | Qué hacer al abrir Kilo (Jean + Manuel). |
| 3 | [[PLAN_MAESTRO_SPRINTS]] | 27 sprints en 5 tracks. |
| 4 | [[BUS_CONTROL]] | Reglas del bus, locks, checklist. |
| 5 | [[METODOLOGIA_OPTIMIZACION]] | Detalle de automatizaciones Oreshnik. |
| 6 | `docs/07_handoffs/qa-dispatcher.json` | Despacho canónico QA. |

---

## 🚀 Ejecución Paralela Multi-Agente (v4.0+)

**Regla permanente:** El agente DEBE paralelizar sprints independientes siempre que sea posible.

### Condiciones para paralelizar

| Condición | Requisito |
|-----------|-----------|
| Zonas de código | Los sprints NO comparten archivos (sin riesgo de conflicto) |
| Dependencias | Ningún sprint depende del otro |
| Ramas | Cada sprint en su propia rama hija desde la misma madre |
| Agentes | Un agente Task por sprint, ejecutando en paralelo |

### Flujo de orquestación

```
1. Identificar sprints sin dependencias entre sí
2. Crear ramas hijas paralelas desde madre
3. Lanzar agentes Task en paralelo (uno por sprint)
4. Cada agente implementa, verifica (tsc + build), pero NO commitea
5. El orquestador commitea, pushea y cierra cada sprint con close-sprint.mjs
6. Merge a madre con --strategy=subtree para docs
```

### Ejemplo

```
Manuel pendientes: S-MP-02, S-MP-04, S-MP-06, S-MP-07, S-MP-08
Dependencias: S-MP-04 depende de S-MP-02, S-MP-07 depende de S-MP-05, S-MP-08 depende de S-MP-05+S-MP-06

Fase 1 (paralelo): S-MP-02 || S-MP-06  ← zonas distintas, sin dependencias
Fase 2 (paralelo): S-MP-04 || S-MP-07(dashboard)  ← S-MP-02 ya cerrado
Fase 3 (secuencial): S-MP-08 ← depende de S-MP-06
```

### Verificación post-agente

Cada agente devuelve:
- Archivos modificados
- Resultado de `tsc --noEmit`
- Resultado de `pnpm run build`

El orquestador verifica que no hay conflictos entre agentes antes de commitear.

---

## 🔗 Enlaces rápidos

- 📊 **Canvas:** [[FLUJO_PROTOCOLO_TRABAJO]]
- 🚀 **Apertura:** [[INSTRUCCION_APERTURA_SESION]]
- 🏠 **Dashboard:** [[00_CENTRAL_TURPIAL]]
- 📋 **Plan:** [[PLAN_MAESTRO_SPRINTS]]
- 🐛 **Bugs:** [[BUGS_CRITICOS]]
- 💱 **Tasas:** [[FLUJO_TASAS_BCV]]
- 🧪 **QA:** [[QA_HARNESS_CANVAS_2026-05-10]]

---

## 📋 Actualización Automática de Documentación — Protocolo anti-recurrencia

> **Objetivo:** Cada sprint cerrado deja TODOS los documentos actualizados.

### Documentos que DEBEN actualizarse al cerrar sprint

| # | Documento | Qué actualizar |
|---|-----------|---------------|
| 1 | `00_CENTRAL_TURPIAL.md` | `last_updated`, estado sprint, tracks, Vercel link |
| 2 | `PLAN_MAESTRO_SPRINTS` | `last_updated`, sprint a COMPLETADO |
| 3 | `S03_QA_HARNESS_INDEX` | Nuevos modulos QA, decisiones |
| 4 | `docs/marketplace/01_ROADMAP_AND_STATUS` | Nuevas features, APIs |
| 5 | `qa-dispatcher.json` | Registrar task_id canonico |
| 6 | `qa-canonical-runbook.md` | Documentar entradas nuevas |

### Trazabilidad código → docs

- `prisma/schema.prisma` → `ARQUITECTURA_TASAS`, `01_ROADMAP_AND_STATUS`
- `actions/marketplace/*.ts` → `01_ROADMAP_AND_STATUS`
- `scripts/qa/modules/*.mjs` → `qa-dispatcher.json`, `S03_QA_HARNESS_INDEX`
- `scripts/qa/playwright/*.mjs` → `qa-dispatcher.json`, `qa-canonical-runbook`
- `components/marketplace/*.tsx` / `app/marketplace/**` → `01_ROADMAP_AND_STATUS`

### Verificación de consistencia

```bash
Select-String "last_updated|actualizado" docs/obsidian-vault/00_CENTRAL_TURPIAL.md docs/obsidian-vault/PLAN_MAESTRO_SPRINTS_2026-05-12.md docs/obsidian-vault/INSTRUCCION_APERTURA_SESION.md docs/obsidian-vault/METODOLOGIA_ORESHNIK_ANEXO.md docs/marketplace/01_ROADMAP_AND_STATUS.md
# Todas las fechas deben coincidir
```
