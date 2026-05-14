---
type: master-dashboard
project: "Turpial Sound"
status: reconciling
phase: "Fase D cerrada. Reconciliando ramas Jean+Manuel para push a madre."
last_updated: "2026-05-14T00:02-04:00"
mother_branch: "integration/today-reservas-marketplace-stable-2026-05-07"
tags:
  - "#central"
  - "#map"
  - "#status/live-source"
  - "#dashboard"
  - "#manuel"
  - "#jean"
  - "#reconciliation"
---

# 🏠 Turpial Sound — Dashboard Activo

> **ESTE ES EL DOCUMENTO CANONICO. Si hay conflicto con cualquier otro archivo, este manda.**
>
> **Plan Maestro:** [[PLAN_MAESTRO_SPRINTS_2026-05-12]] | **Apertura:** [[INSTRUCCION_APERTURA_SESION]]

---

## 🚨 ESTADO ACTUAL — RECONCILIACION EN CURSO (2026-05-14 00:02 VET)

**Existen DOS ramas de integracion divergentes que deben unificarse:**

| Rama | Operador | Commits | Contenido |
|------|----------|---------|-----------|
| `Manuel/integration-s12-s14b-marketplace-closure-2026-05-13` | 👤 Manuel | 51 commits | S12, S13, S14, S14B, BCV, metodologia, QA harness, Playwright |
| `integration/preserve-dashboard-cwv-aeo-reservas-2026-05-13` | 👤 Jean | 20 commits | Booking fixes, WhatsApp lab, performance, a11y, AEO, admin dashboard |
| **Ancestro comun** | — | `20e88e1` (May 9) | — |
| **Rama madre** | — | `integration/today-reservas-marketplace-stable-2026-05-07` | ESTA es la unica rama madre valida |

**Produccion actual (turpialsound.com):** Deploy `nahska58r` de Jean (NO incluye marketplace de Manuel).

---

## 👤 JEAN (BKG-dev) — ESTADO

### Sprints cerrados por Jean

| Sprint | Descripcion | Evidencia |
|--------|-------------|-----------|
| S02 | Discovery runtime estable | ✅ Mergeado a prod via Ola1 |
| S04 | Payment proof protegido (9/9 PASS) | ✅ Mergeado a integracion |
| S06 | Payout auditable | ✅ Mergeado a integracion |
| S07 | Tasas y accounting (11/11 PASS) | ✅ Mergeado a integracion |
| S10 | Release gate (10/10 🟢) | ✅ Implementado, no mergeado |

### Trabajo de Jean fuera de metodologia (May 10-13) → YA INCORPORADO en su rama

| Fecha | Commit | Mapeo a sprint del plan |
|-------|--------|------------------------|
| May 13 | feat(admin): booking dashboard command center | 🟡 S-JB-02 parcial |
| May 13 | fix(bookings): QA hold bypass + sitemap | 🟡 S-JB-03 parcial |
| May 13 | fix(performance): mobile animations, main-thread, LCP, lighthouse | 🟡 S19 parcial |
| May 12-13 | fix(accessibility): lighthouse a11y (3 commits) | 🟡 S19 parcial |
| May 12 | feat(aeo): Caracas rehearsal room guide | 🟡 S-MK-03 parcial |
| May 11 | fix(bookings): whatsapp verification, calendar, duplicate holds, idempotent | 🟡 S-JB-01 parcial |
| May 10 | feat(lab): whatsapp webhook + meta signup | Fuera de plan |

### 🔴 LO QUE JEAN DEBE HACER AHORA

| # | Accion | Prioridad |
|---|--------|-----------|
| 1 | **Mergear `Manuel/integration-s12-s14b-marketplace-closure-2026-05-13` en su rama** o viceversa | 🔴 P0 — BLOQUEA TODO |
| 2 | **Resolver conflictos** en `actions/marketplace/auth.ts`, `app/admin/page.tsx`, `.env.example`, `next.config.mjs` | 🔴 P0 |
| 3 | **Validar pre-merge**: `git diff --check`, `npx tsc --noEmit`, `pnpm build` | 🔴 P0 |
| 4 | **Mergear rama unificada a madre** `integration/today-reservas-marketplace-stable-2026-05-07` | 🔴 P0 |
| 5 | **Smoke post-merge**: `/`, `/marketplace`, `/reservas`, `/api/bcv-rate`, `/admin/login` | 🔴 P0 |
| 6 | Ejecutar S10 release gate: `npx tsx scripts/qa/modules/qa-s10-release-gate.mjs` | 🟡 |
| 7 | Configurar `TS_MARKETPLACE_SENSITIVE_BLOB_READ_WRITE_TOKEN` en Vercel | 🟡 |
| 8 | NO desplegar a produccion hasta que Manuel confirme smoke de marketplace | 🚫 |

---

## 👤 MANUEL (Manuel Vera) — ESTADO

### Sprints cerrados por Manuel (sesion May 12-13)

| Sprint | Rama | Resultado |
|--------|------|-----------|
| S01 | Preview BKG autonomo | ✅ |
| S03 | QA Harness 12 modulos | ✅ 12/12 PASS |
| S05 | Delivery & receipt flow | ✅ 9/9 PASS |
| S08 | Action center y UX | ✅ 11/11 PASS |
| S09 | Discovery publico y SEO | ✅ 9/9 PASS |
| S11 | Playwright + login UI smoke | ✅ 3/3 PASS |
| **S12** | `Manuel/s12-purchase-flow-browser-2026-05-12` | ✅ 9/9 PASS — purchase flow browser E2E |
| **S13** | `Manuel/s13-proof-upload-browser-2026-05-12` | ✅ PASS — payment proof upload browser |
| **S14** | `Manuel/s14-admin-dashboard-payment-closure-2026-05-13` | ✅ PASS — BCV scheduler + metodologia |
| **S14B** | `Manuel/s14b-shopping-cart-share` | ✅ PASS — shopping cart + share + market analysis |
| **S-MK-01** | (incluido en S14B) | ✅ PASS — analisis de mercado y competencia |

**Rama de integracion:** `Manuel/integration-s12-s14b-marketplace-closure-2026-05-13` (YA PUSHEADA)

### 🔴 LO QUE MANUEL DEBE HACER AHORA

| # | Accion | Prioridad |
|---|--------|-----------|
| 1 | **Esperar a que Jean haga el merge de reconciliacion** a la rama madre | 🔴 P0 |
| 2 | **Hacer pull de la rama madre unificada** cuando Jean confirme | 🔴 P0 |
| 3 | **Ejecutar smoke de marketplace** sobre la rama madre unificada: `/marketplace`, compra, proof upload | 🔴 P0 |
| 4 | **Verificar que el BCV scheduler funciona** con `CRON_SECRET` en Vercel | 🟡 |
| 5 | Preparar plan de despliegue para viernes 15 mayo 11AM CDA | 🟡 |
| 6 | Verificar estado legal de la entidad (S-ADM-01) | 🟡 |

---

## 📊 TRACKS — ESTADO REAL (NO lo que dice el plan maestro obsoleto)

### 🟦 TRACK 1: Marketplace (S12-S21)

| Sprint | Descripcion | Owner | Estado |
|--------|-------------|-------|--------|
| S12 | Purchase flow browser E2E | 👤 Manuel | ✅ CERRADO |
| S13 | Payment proof upload browser | 👤 Manuel | ✅ CERRADO |
| S14 | Admin dashboard + BCV scheduler | 👤 Manuel | ✅ CERRADO |
| S14B | Shopping cart + share listing | 👤 Manuel | ✅ CERRADO |
| S15 | Location filters + listing modal | 👤 Manuel | 🔴 PENDIENTE — requiere lock doble schema |
| S16 | Notificaciones y chat | 👤 Manuel | 🔴 PENDIENTE |
| S17 | Seller dashboard browser | 👤 Jean | 🔴 PENDIENTE |
| S18 | Full regression browser | 👤 Manuel | 🔴 PENDIENTE |
| S19 | Performance + load | 👤 Jean | 🟡 PARCIAL — Jean avanzo LCP/a11y fuera de metodologia |
| S20 | SEO/AEO audit completo | 👤 Manuel | 🔴 PENDIENTE |
| S21 | Production release gate | 👤 Jean | 🔴 PENDIENTE |

### 🟩 TRACK 2: Booking

| Sprint | Descripcion | Owner | Estado |
|--------|-------------|-------|--------|
| S-JB-01 | Fixes criticos (seleccion multiple, cantidad, WhatsApp) | 👤 Jean | 🟡 PARCIAL — WhatsApp verification, calendar, holds hecho |
| S-JB-02 | Dashboard de reservas | 👤 Jean | 🟡 PARCIAL — admin booking dashboard command center hecho |
| S-JB-03 | Tasas horarias, sitemap, Vercel docs, mobile UI | 👤 Jean | 🟡 PARCIAL — sitemap fix hecho |
| S-JB-04 | Protocolo resenas Google + descuentos | 👤 Jean | 🔴 PENDIENTE |

### 🟨 TRACK 3: Crecimiento

| Sprint | Descripcion | Owner | Estado |
|--------|-------------|-------|--------|
| S-MK-01 | Analisis de mercado y competencia | 👤 Manuel | ✅ CERRADO |
| S-MK-02 | KPI dashboard inteligente | 👤 Manuel | 🔴 PENDIENTE |
| S-MK-03 | SEO/AEO full + Academia | 👤 Jean + Manuel | 🟡 PARCIAL — AEO guide hecho por Jean |
| S-MK-04 | Automatizacion RRSS | 👤 Manuel | 🔴 PENDIENTE |
| S-MK-05 | Contenido RRSS | 👤 Manuel | 🔴 PENDIENTE |
| S-MK-06 | Plan marketing | 👤 Manuel | 🔴 PENDIENTE |

### 🟪 TRACK 4: Admin-Legal

Todos 🔴 PENDIENTE. Requieren accion fisica de Manuel.

### 🟧 TRACK 5: UI/UX

Todos 🔴 PENDIENTE.

---

## 📋 PROTOCOLO DE RECONCILIACION A PRUEBA DE FALLAS

### Paso 1 — Jean unifica las ramas

```bash
# Opcion A: Jean mergea Manuel en su rama
git checkout integration/preserve-dashboard-cwv-aeo-reservas-2026-05-13
git pull origin Manuel/integration-s12-s14b-marketplace-closure-2026-05-13
# Resolver conflictos...
git push origin integration/preserve-dashboard-cwv-aeo-reservas-2026-05-13

# Opcion B: Crear nueva rama unificada desde madre
git checkout integration/today-reservas-marketplace-stable-2026-05-07
git checkout -b integration/unified-2026-05-14
git merge Manuel/integration-s12-s14b-marketplace-closure-2026-05-13
git merge integration/preserve-dashboard-cwv-aeo-reservas-2026-05-13
# Resolver conflictos...
```

### Paso 2 — Validacion pre-merge a madre

```bash
git diff --check                    # DEBE dar OK
npx tsc --noEmit                    # DEBE dar OK
pnpm build                          # DEBE dar OK
```

### Paso 3 — Merge a madre y smoke

```bash
git checkout integration/today-reservas-marketplace-stable-2026-05-07
git merge integration/unified-2026-05-14
git push origin integration/today-reservas-marketplace-stable-2026-05-07
```

**Smoke obligatorio en Preview:**
- `/` → OK
- `/marketplace` → listings visibles, no vacio
- `/reservas` → funcional, no roto
- `/api/bcv-rate` → responde JSON
- `/admin/login` → carga
- `/ops/payment-review` → carga

### Paso 4 — Manuel valida marketplace

Manuel ejecuta sobre la rama madre unificada:
```bash
npx tsx scripts/qa/run-marketplace-qa.mjs --module=QA-00   # Preflight
npx tsx scripts/qa/run-marketplace-qa.mjs --module=QA-03   # Discovery
npx tsx scripts/qa/playwright/s11-login-smoke.spec.mjs       # Login smoke
```

### Paso 5 — Jean autoriza y mergea a main

**SOLO cuando:** smoke limpio + Manuel confirma marketplace OK + sin P0 abiertos.

```bash
git checkout main
git merge integration/today-reservas-marketplace-stable-2026-05-07
git push origin main
```

---

## 🔒 REGLAS DEL BUS — RECORDATORIO

| Regla | Detalle |
|-------|---------|
| 🚫 **NO desplegar directo a produccion** | Todo merge va a madre primero, luego a `main` |
| 👤 **Merge a madre solo por Jean** | Jean es el gatekeeper de `integration/today-reservas-marketplace-stable-2026-05-07` |
| 🔒 **Schema/prisma = lock doble** | Jean + Manuel deben acordar antes de tocar `schema.prisma` |
| 🚫 **NO tocar /reservas sin Jean** | Zona exclusiva Jean |
| 📋 **Actualizar ESTE documento al cerrar** | `00_CENTRAL_TURPIAL.md` es la fuente unica de verdad |
| 🔑 **NO commitear .env ni secretos** | `.env.local`, backups, tokens |
| 🏷️ **Commits con prefijo de sprint** | `qa(s12):`, `feat(s14b):`, `fix(s-jb-01):` |
| ⚠️ **Si hay P0 → PARAR todo** | No se avanza hasta resolver |

---

## 🔗 NAVEGACION

- 🧠 [[METODOLOGIA_ORESHNIK_ANEXO]] — **NEXO de la metodologia. Leer antes de todo.**
- 📊 [[FLUJO_PROTOCOLO_TRABAJO]] — Canvas visual del proceso completo
- 📋 [[INSTRUCCION_APERTURA_SESION]] — QUE HACER al abrir Kilo (Jean y Manuel)
- 📋 [[PLAN_MAESTRO_SPRINTS_2026-05-12]] — Plan maestro (desactualizado en tracks, actualizar despues de reconciliacion)
- 📋 [[METODOLOGIA_OPTIMIZACION]] — Analisis detallado de optimizacion Oreshnik
- 📋 [[BUS_CONTROL_TURPIAL]] — Reglas del bus
- 📋 [[BUGS_CRITICOS]] — Bugs activos
- 📋 [[NEXT_PHASE_PLAN_S11_S20]] — Plan detallado S11-S20
- 📋 `docs/07_handoffs/qa-dispatcher.json` — Dispatcher QA

---

> **Ultima actualizacion:** 2026-05-14T00:02-04:00 | **Estado:** ESPERANDO RECONCILIACION DE JEAN
