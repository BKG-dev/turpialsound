---
type: master-dashboard
project: "Turpial Sound"
status: post-reconciliation
phase: "Fase E: Sprints marketplace cerrados. Pre-release."
last_updated: "15/05/26 14:26"
mother_branch: "RAMA MADRE"
mother_head: "dfca178"
production_branch: "prod/current-www-turpialsound-2026-05-08"
production_head: "92fd6a3"
tags:
  - "#central"
  - "#map"
  - "#status/live-source"
  - "#dashboard"
  - "#manuel"
  - "#jean"
---

# Turpial Sound — Dashboard Activo

> **ESTE ES EL DOCUMENTO CANONICO. Si hay conflicto con cualquier otro archivo, este manda.**

## ESTADO ACTUAL — RECONCILIACION COMPLETADA (2026-05-14 13:58 VET)

**Existen DOS ramas de integracion (UNIFICADAS en madre `01cdb73`):**

| Rama | Operador | Commits | Contenido |
|------|----------|---------|-----------|
| `Manuel/integration-s12-s14b-marketplace-closure-2026-05-13` | 👤 Manuel | 51 commits | S12, S13, S14, S14B, BCV, metodologia, QA harness, Playwright |
| `integration/preserve-dashboard-cwv-aeo-reservas-2026-05-13` | 👤 Jean | 20 commits | Booking fixes, WhatsApp lab, performance, a11y, AEO, admin dashboard, sitemap |
| **Ancestro comun** | — | `20e88e1` (May 9) | — |
| **Rama madre** | — | `RAMA MADRE` | ESTA es la unica rama madre valida |
| **Produccion** | — | `prod/current-www-turpialsound-2026-05-08` @ `92fd6a3` | Deploy `nahska58r` en `turpialsound.com` |

---

## 🌐 Produccion actual

| Campo | Valor |
|-------|-------|
| **Rama** | `prod/current-www-turpialsound-2026-05-08` |
| **HEAD** | `92fd6a3` — `fix(seo): restrict sitemap to approved public urls` |
| **Deploy Vercel** | `nahska58r` |
| **URL** | `https://www.turpialsound.com` |
| **Sitemap** | Restringido a 9 URLs publicas aprobadas (ver [[#Sitemap Hotfix]]) |
| **/reservas** | Congelado como zona sana |
| **/marketplace** | Activo y funcional (sin trabajo de Manuel — solo base Jean) |

### Sitemap Hotfix

| Campo | Valor |
|-------|-------|
| **Rama hotfix** | `hotfix/prod-sitemap-public-only-2026-05-11` |
| **Origen** | `hotfix/sitemap-public-only-from-20be7a2-2026-05-11` |
| **Fecha** | 2026-05-11 |
| **Objetivo** | Sitemap limpio para Google Search Console sin DB, slugs dinamicos ni rutas privas |

**9 URLs aprobadas:** `/`, `/reservas`, `/salas-de-ensayo`, `/estudio-de-grabacion`, `/servicios`, `/contacto`, `/recursos`, `/recursos/preguntas-frecuentes`, `/marketplace`

**Exclusiones:** `/admin`, `/ops`, `/api`, `/payment-proofs`, `/marketplace/admin`, `/marketplace/dashboard`, `/lab`, listings individuales, slugs dinamicos, query params, previews Vercel

---

## 📐 Metodologia

- **1 rama madre estable:** `RAMA MADRE`
- **Preflight v3.0:** `node scripts/oreshnik/preflight.mjs --sprint SXX --operator Op --desc "desc"` automatiza la creacion de ramas desde madre
- **N worktrees separados** — un worktree por sprint
- **N agentes Codex** — un agente por operador por sprint
- **1 owner por lock** — Jean o Manuel, no ambos
- **1 commit/push por sprint cerrado**
- **0 trabajo directo sobre madre**
- **0 main sin validacion**
- **0 produccion sin release gate**
- **0 zonas sanas tocadas** sin lock explicito

> Ver detalle completo: [[METODOLOGIA_ORESHNIK_ANEXO]]

---

## 👤 JEAN (BKG-dev) — ESTADO

### Sprints cerrados

| Sprint | Descripcion | Evidencia |
|--------|-------------|-----------|
| S02 | Discovery runtime estable | ✅ Mergeado a prod via Ola1 |
| S04 | Payment proof protegido (9/9 PASS) | ✅ Mergeado a integracion |
| S06 | Payout auditable | ✅ Mergeado a integracion |
| S07 | Tasas y accounting (11/11 PASS) | ✅ Mergeado a integracion |
| S10 | Release gate (10/10 🟢) | ✅ Implementado, pendiente merge |

### Trabajo fuera de metodologia (May 10-13) — YA INCORPORADO en su rama

| Fecha | Commit | Mapeo a sprint |
|-------|--------|----------------|
| May 13 | feat(admin): booking dashboard command center | 🟡 S-JB-02 parcial |
| May 13 | fix(bookings): QA hold bypass + sitemap | 🟡 S-JB-03 parcial |
| May 13 | fix(performance): mobile animations, LCP, lighthouse | 🟡 S19 parcial |
| May 12-13 | fix(accessibility): lighthouse a11y (3 commits) | 🟡 S19 parcial |
| May 12 | feat(aeo): Caracas rehearsal room guide | 🟡 S-MK-03 parcial |
| May 11 | fix(bookings): whatsapp, calendar, holds, idempotent | 🟡 S-JB-01 parcial |
| May 10 | feat(lab): whatsapp webhook + meta signup | Fuera de plan |

### 🔴 LO QUE JEAN DEBE HACER AHORA

| # | Accion | Prioridad |
|---|--------|-----------|
| 1 | **Mergear `Manuel/integration-s12-s14b-marketplace-closure-2026-05-13` en su rama** | 🔴 P0 |
| 2 | **Resolver conflictos** en `actions/marketplace/auth.ts`, `app/admin/page.tsx`, `.env.example` | 🔴 P0 |
| 3 | **Validar pre-merge**: `git diff --check`, `npx tsc --noEmit`, `pnpm build` | 🔴 P0 |
| 4 | **Mergear rama unificada a madre** | 🔴 P0 |
| 5 | **Smoke post-merge**: `/`, `/marketplace`, `/reservas`, `/api/bcv-rate`, `/admin/login` | 🔴 P0 |
| 6 | Ejecutar S10 release gate: `npx tsx scripts/qa/modules/qa-s10-release-gate.mjs` | 🟡 |
| 7 | Configurar `TS_MARKETPLACE_SENSITIVE_BLOB_READ_WRITE_TOKEN` en Vercel | 🟡 |
| 8 | NO desplegar a produccion hasta que Manuel confirme smoke de marketplace | 🚫 |
| 9 | Arreglar GitHub↔Vercel: Dashboard → Git Settings → Branch pattern incluir `Manuel/*` | 🟡 |

---

## 👤 MANUEL (Manuel Vera) — ESTADO

### Sprints cerrados (sesion May 12-13)

| Sprint | Rama | Resultado |
|--------|------|-----------|
| S01 | Preview BKG autonomo | ✅ |
| S03 | QA Harness 12 modulos | ✅ 12/12 PASS |
| S05 | Delivery & receipt flow | ✅ 9/9 PASS |
| S08 | Action center y UX | ✅ 11/11 PASS |
| S09 | Discovery publico y SEO | ✅ 9/9 PASS |
| S11 | Playwright + login UI smoke | ✅ 3/3 PASS |
| **S12** | `Manuel/s12-purchase-flow-browser-2026-05-12` | ✅ 9/9 PASS |
| **S13** | `Manuel/s13-proof-upload-browser-2026-05-12` | ✅ PASS |
| **S14** | `Manuel/s14-admin-dashboard-payment-closure-2026-05-13` | ✅ BCV scheduler + metodologia |
| **S14B** | `Manuel/s14b-shopping-cart-share` | ✅ Shopping cart + share + market analysis |
| **S15** | `Manuel/s15-location-filters-2026-05-14` | ✅ Location filters + listing modal + inventory |
| **S-MK-01** | (incluido en S14B) | ✅ Analisis de mercado |
| — | Metodologia Oreshnik | ✅ Analisis de optimizacion |
| — | BCV dual-frequency scheduler | ✅ Implementado |

**Rama de integracion:** `Manuel/integration-s12-s14b-marketplace-closure-2026-05-13`

### 🔴 LO QUE MANUEL DEBE HACER AHORA

| # | Accion | Prioridad |
|---|--------|-----------|
| 1 | **Preparar plan de despliegue CDA** (viernes 15 mayo 11AM) | 🔴 P0 |
| 2 | **Verificar estado legal de la entidad** (S-ADM-01) | 🔴 P0 |
| 3 | **S-UX-01 y S-UX-02:** UI Inmersiva + Refac Global | ✅ CERRADO 2026-05-15 |
| 4 | Ejecutar QA full regression post-merge Jean | 🟡 |

---

## 📊 TRACKS — ESTADO REAL

### 🟦 TRACK 1: Marketplace (S12-S21)

| Sprint | Descripcion | Owner | Estado |
|--------|-------------|-------|--------|
| S12 | Purchase flow browser E2E | 👤 Manuel | ✅ CERRADO |
| S13 | Payment proof upload browser | 👤 Manuel | ✅ CERRADO |
| S14 | Admin dashboard + BCV scheduler | 👤 Manuel | ✅ CERRADO |
| S14B | Shopping cart + share listing | 👤 Manuel | ✅ CERRADO |
| S15 | Location filters + listing modal | 👤 Manuel | ✅ CERRADO 2026-05-14 |
| S16 | Notificaciones y chat | 👤 Manuel | ✅ CERRADO 2026-05-14 |
| S17 | Seller dashboard browser | 👤 Jean | 🔴 PENDIENTE |
| S18 | Full regression browser | 👤 Manuel | ✅ CERRADO 2026-05-14 |
| S19 | Performance + load | 👤 Jean | 🟡 PARCIAL (LCP/a11y) |
| S20 | SEO/AEO audit completo | 👤 Manuel | ✅ CERRADO 2026-05-14 |
| S-REV-01 | Ratings, reviews + Full E2E | 👤 Manuel | ✅ CERRADO 2026-05-14 |

### 🟩 TRACK 2: Booking

| Sprint | Descripcion | Owner | Estado |
|--------|-------------|-------|--------|
| S-JB-01 | Fixes criticos (multiple, cantidad, WhatsApp) | 👤 Jean | 🟡 PARCIAL |
| S-JB-02 | Dashboard de reservas | 👤 Jean | 🟡 PARCIAL |
| S-JB-03 | Tasas horarias, sitemap, Vercel docs | 👤 Jean | 🟡 PARCIAL |
| S-JB-04 | Protocolo resenas Google + descuentos | 👤 Jean | 🔴 PENDIENTE |

### 🟨 TRACK 3: Crecimiento

| Sprint | Descripcion | Owner | Estado |
|--------|-------------|-------|--------|
| S-MK-01 | Analisis de mercado y competencia | 👤 Manuel | ✅ CERRADO |
| S-MK-02 | KPI dashboard inteligente | 👤 Manuel | ✅ CERRADO 2026-05-14 |
| S-MK-03 | SEO/AEO full + Academia | 👤 Jean + Manuel | 🟡 PARCIAL |
| S-MK-04 | Automatizacion RRSS | 👤 Manuel | ✅ CERRADO 2026-05-14 |
| S-MK-05 | Contenido RRSS | 👤 Manuel | ✅ CERRADO 2026-05-14 |
| S-MK-06 | Plan marketing | 👤 Manuel | ✅ CERRADO 2026-05-14 |

### 🟪 TRACK 4: Admin-Legal — 🔴 todo pendiente (accion fisica Manuel)
### 🟧 TRACK 5: UI/UX — ✅ COMPLETADO (S-UX-01, S-UX-02)

| Sprint | Descripcion | Owner | Estado |
|--------|-------------|-------|--------|
| S-UX-01 | Plan tecnico UI Inmersiva | 👤 Manuel | ✅ CERRADO 2026-05-15 |
| S-UX-02 | Implementacion UI Inmersiva + Refac Global | 👤 Manuel | ✅ CERRADO 2026-05-15 |

**Entregables:** Particle Background, 3D Parallax Cards, Scroll Stacking, Cinematic Hero, WhatsApp Button, Core Design System (Deep Dark + Michroma), CinematicVideo, Mac3DGallery, refactor pagina por pagina, mobile degradation. Build limpio validado.

---

## 🟢 Ola 1 — Completada

| Componente | Descripcion | Estado |
|-----------|-------------|--------|
| J1 Docs Control Tower | Jean | ✅ |
| J2 Preview Runtime Guard | Jean | ✅ |
| M1 Marketplace Protected Flow E2E | Manuel | ✅ |
| M2 Marketplace QA Harness | Manuel | ✅ |

---

## 📋 PROTOCOLO DE RECONCILIACION

> **Nota:** Preflight v3.0 (`node scripts/oreshnik/preflight.mjs --sprint SXX --operator Op --desc "desc"`) automatiza la creacion de ramas desde madre. Los pasos manuales de `git checkout -b` abajo quedan como referencia historica del protocolo de reconciliacion entre ramas.

### Paso 1 — Jean unifica las ramas
```bash
git checkout RAMA MADRE
git checkout -b integration/unified-2026-05-14
git merge Manuel/integration-s12-s14b-marketplace-closure-2026-05-13
git merge integration/preserve-dashboard-cwv-aeo-reservas-2026-05-13
```

### Paso 2 — Validacion
```bash
git diff --check && npx tsc --noEmit && pnpm build
```

### Paso 3 — Merge a madre
```bash
git checkout RAMA MADRE
git merge integration/unified-2026-05-14
git push origin RAMA MADRE
```

### Paso 4 — Smoke (Manuel)
`/`, `/marketplace`, `/reservas`, `/api/bcv-rate`, `/admin/login`, `/ops/payment-review`

### Paso 5 — Release a main (Jean, solo si smoke OK)
```bash
git checkout main
git merge RAMA MADRE
git push origin main
```

---

## 🔒 REGLAS DEL BUS

| Regla | Detalle |
|-------|---------|
| 🚫 **NO desplegar directo a produccion** | Todo va madre → validacion → main → Vercel |
| 👤 **Merge a madre solo por Jean** | Jean es el gatekeeper |
| 🔒 **Schema/prisma = lock doble** | Jean + Manuel deben acordar |
| 🚫 **NO tocar /reservas sin Jean** | Zona exclusiva Jean |
| 📋 **Actualizar ESTE documento al cerrar sprint** | Fuente unica de verdad |
| 🔑 **NO commitear .env ni secretos** | `.env.local`, backups, tokens |
| 🏷️ **Commits con prefijo de sprint** | `qa(s12):`, `feat(s14b):`, `fix(s-jb-01):` |
| ⚠️ **Si hay P0 → PARAR todo** | No se avanza hasta resolver |
| 💱 **Reglas DB:** `DATABASE_URL` pooled, `DIRECT_URL` direct, misma BD Neon | Nunca imprimir secretos |

---

## 📖 NAVEGACION

- 🧠 [[METODOLOGIA_ORESHNIK_ANEXO]] — **NEXO metodologia. Leer antes de todo.**
- 📊 [[FLUJO_PROTOCOLO_TRABAJO]] — Canvas visual del proceso completo
- 📋 [[INSTRUCCION_APERTURA_SESION]] — QUE HACER al abrir Kilo (Jean y Manuel)
- 📋 [[PLAN_MAESTRO_SPRINTS_2026-05-12]] — Plan maestro 5 tracks 27 sprints
- 📋 [[METODOLOGIA_OPTIMIZACION]] — Analisis detallado de optimizacion Oreshnik
- 📋 [[BUS_CONTROL_TURPIAL]] — Reglas del bus, locks, checklist
- 📋 [[BUGS_CRITICOS]] — Bugs activos
- 📋 [[ROADMAP_RESCATE]] — Roadmap de rescate
- 📋 [[ARQUITECTURA_TASAS]] — Motor de tasas BCV/Binance
- 📋 [[S03_QA_HARNESS_INDEX]] — QA Harness (CERRADO 12/12)
- 📋 `docs/07_handoffs/qa-dispatcher.json` — Dispatcher QA
- 📋 `docs/07_handoffs/integration-gatekeeper-2026-05-07.md` — Gatekeeper

---

> **Ultima actualizacion:** 2026-05-14T13:04-04:00 | **Estado:** S-REV-01 cerrado. Ratings + Full E2E + Export payouts. | **Tag:** `cp-manuel-s12-s14b-pre-merge-jean-2026-05-14`

---

## 🚀 Vercel Preview Links

> **Actualizado en cada push. Ambos operadores verifican el deploy.**

| Rama | Ultimo Preview | Fecha | Estado |
|------|---------------|-------|--------|
| **Madre** `RAMA MADRE` | `25fdca6` | 2026-05-15 12:30 | ✅ Actualizada con docs |
| `Manuel/s-ds-01-dropsocial-referral` | — | 2026-05-14 16:18 | En deploy |
| `Manuel/s-opt-01-loc-inv-src-lang` | `8dl39wqiw` | 2026-05-14 15:40 | ● Ready |
| `Manuel/s-rev-01-reviews-ratings-full-e2e` | `2z0aoc1rc` | 2026-05-14 13:00 | ● Ready |
| `Manuel/s-mk-04-05-06-rrss-marketing` | `66cd47d` | 2026-05-14 12:33 | ● Ready |
| `Manuel/s-mk-02-kpi-dashboard` | `68d8886` | 2026-05-14 | ● Ready |
| `Manuel/s20-seo-aeo-audit` | `4c16ae1` | 2026-05-14 | ● Ready |
| `Manuel/s18-full-regression` | `7dad444` | 2026-05-14 | ● Ready |
| `Manuel/s16-notifications-chat` | `a6b1a87` | 2026-05-14 | ● Ready |
| `Manuel/s15-location-filters` | `ec61354` | 2026-05-14 | ● Ready |
| `Jean/s-jb-01-booking-fixes` | — | — | 🔴 Pendiente |

**Formato:** `https://turpialsound-XXXXX-bkgs-projects-829c67c1.vercel.app`
