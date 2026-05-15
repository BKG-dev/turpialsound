---
type: methodology-nexus
project: "Turpial Sound"
fecha: 2026-05-14
metodologia: "Oreshnik + Bus de Control Nivel 2.5"
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
| 1 | **Una sola rama madre** | `integration/today-reservas-marketplace-stable-2026-05-07`. Sin esto, divergencia. |
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

## 🤝 Sincronización Bidireccional

Protocolo para que Jean y Manuel SIEMPRE vean la misma versión de docs.

### Al abrir sesión (AMBOS)

```bash
git fetch origin --prune
git checkout integration/today-reservas-marketplace-stable-2026-05-07
git pull origin integration/today-reservas-marketplace-stable-2026-05-07
# Verificar:
Select-String "last_updated" docs/obsidian-vault/00_CENTRAL_TURPIAL.md
```

Si `last_updated` no coincide con la última fecha conocida → **ALERTA**.

### Al cerrar sprint

1. Actualizar `00_CENTRAL_TURPIAL.md`
2. `last_updated` = fecha/hora actual
3. Commit + push a rama del sprint
4. **Avisar al otro operador:** "SXX cerrado, rama lista"
5. Jean mergea a madre + push
6. Ambos: `git fetch && git pull madre` en próxima sesión

### ⚠️ Obsidian

**Cerrar Obsidian antes de `git checkout`.** Si estuvo abierto:

```bash
git checkout HEAD -- docs/obsidian-vault/
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

| Componente | HOY (manual) | FUTURO (Oreshnik) |
|-----------|-------------|-------------------|
| Pre-flight | QA-00 manual | `.husky/pre-commit` |
| Zone check | Leer 00_CENTRAL | `zone-map.json` + `zone-check.ps1` |
| Crear rama | `git checkout -b` | `scaffold-sprint.ps1` |
| Pre-push | Manual 10 checks | `.husky/pre-push` |
| Cerrar | Editar docs a mano | `generate-closure-report.ps1` |
| Vercel preview | `npx vercel list` | Link en commit message |

---

## 📖 Documentos Canónicos

| # | Documento | Función |
|---|-----------|---------|
| 1 | [[00_CENTRAL_TURPIAL]] | **Fuente única de verdad.** Manda sobre todos. |
| 2 | [[INSTRUCCION_APERTURA_SESION]] | Qué hacer al abrir Kilo (Jean + Manuel). |
| 3 | [[PLAN_MAESTRO_SPRINTS_2026-05-12]] | 27 sprints en 5 tracks. |
| 4 | [[BUS_CONTROL_TURPIAL]] | Reglas del bus, locks, checklist. |
| 5 | [[METODOLOGIA_OPTIMIZACION]] | Detalle de automatizaciones Oreshnik. |
| 6 | `docs/07_handoffs/qa-dispatcher.json` | Despacho canónico QA. |

---

## 🔗 Enlaces rápidos

- 📊 **Canvas:** [[FLUJO_PROTOCOLO_TRABAJO]]
- 🚀 **Apertura:** [[INSTRUCCION_APERTURA_SESION]]
- 🏠 **Dashboard:** [[00_CENTRAL_TURPIAL]]
- 📋 **Plan:** [[PLAN_MAESTRO_SPRINTS_2026-05-12]]
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
