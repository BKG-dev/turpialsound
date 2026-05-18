---
type: master-dashboard
project: "Turpial Sound"
status: active-integration
phase: "Fase G: Optimizacion marketplace post-cierre. 8 sprints nuevos (S-MP-01 a S-MP-08)."
last_updated: "17/05/26 20:22"
mother_branch: "MADRE/v4-oreshnik-docs-sync-2026-05-18"
mother_head: "RAMAMADRE_BASE"
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

## ESTADO ACTUAL — INTEGRACION DE RAMAS HIJAS (2026-05-16 21:04 VET)

**Ambas ramas hijas listas con documentacion actualizada. Code merge a madre PENDIENTE (Jean).**

| Rama | Operador | Commits | Contenido |
|------|----------|---------|-----------|
| `Jean/s12-reservas-v2-politica-paga-primero-2026-05-16` | 👤 Jean | 25 commits (vs base) | Booking fixes, WhatsApp notifications, performance, a11y, AEO, sitemap, admin dashboard |
| `Manuel/s-adm-01-legal-entity-2026-05-15` | 👤 Manuel | 114 commits (vs base) | S12-S20 marketplace, S-UX-01/02 UI Inmersiva, S-REV-01 reviews, S-MK marketing, BCV, metodologia |
| **NUEVA Rama madre** | — | `MADRE/v2-jean-s12-reservas-manuel-s-adm-01-2026-05-16` | DOCS INTEGRADOS. Codigo pendiente de merge. |
| **Produccion** | — | `prod/current-www-turpialsound-2026-05-08` @ `92fd6a3` | Deploy `nahska58r` en `turpialsound.com` |

> **PENDIENTE UNICO:** Jean integra el CODIGO de ambas ramas hijas en la rama madre. Los docs ya estan sincronizados.

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

### Rama activa: `Jean/s12-reservas-v2-politica-paga-primero-2026-05-16`

| Commit | Descripcion |
|--------|-------------|
| `e747e15` | fix(bookings): complete whatsapp reservation event notifications |
| `5fc3e60` | merge: integrate marketplace cart dropsocial oreshnik s12-s20 |
| `ae3904f` | fix(seo): polish AEO article and add to sitemap |
| `2671ad6` | fix(admin): force Caracas timezone in dashboard date rendering |
| `111e29b` | fix(bookings): allow qa hold bypass by phone env |

### Trabajo incorporado

| Sprint | Descripcion | Estado |
|--------|-------------|--------|
| S-JB-01 | Booking fixes (WhatsApp, calendar, holds) | 🟡 En rama hija |
| S-JB-02 | Admin booking dashboard command center | 🟡 En rama hija |
| S-JB-03 | Sitemap public-only, Vercel docs | 🟡 En rama hija |
| S19 | Performance LCP + mobile a11y | 🟡 En rama hija |
| S-MK-03 | AEO Caracas rehearsal room guide | 🟡 En rama hija |

### 🔴 LO QUE JEAN DEBE HACER AHORA

| # | Accion | Prioridad |
|---|--------|-----------|
| 1 | **S-MP-03: Formulario de pago y tasas** (P1) | 🟡 |
| 2 | **S-MP-05: Modal de compra desktop + semaforo** (P1) | 🟡 |
| 3 | **S-MP-07: Home — seccion marketplace + navegacion** (P2) | 🟢 |
| 4 | NO desplegar a produccion sin aprobacion explicita de ambos | 🚫 |
| 5 | Configurar `TS_MARKETPLACE_SENSITIVE_BLOB_READ_WRITE_TOKEN` en Vercel | 🟡 |

---

## 👤 MANUEL (Manuel Vera) — ESTADO

### Rama activa: `Manuel/s-adm-01-legal-entity-2026-05-15`

| Commit | Descripcion |
|--------|-------------|
| `93e4536` | fix(search): eliminar filtro estricto que bloqueaba busqueda difusa Fuse.js |
| `be609b0` | fix(sync): date mismatch no bloquea push |
| `c423d46` | merge: consolidar sprints marketplace + docs RAMA-MADRE + preflight v3.0 |

### Sprints cerrados

| Sprint | Descripcion | Fecha |
|--------|-------------|-------|
| S12-S14B | Purchase flow, proof upload, admin dashboard, shopping cart | ✅ May 13-14 |
| S15 | Location filters + listing modal | ✅ May 14 |
| S16 | Notificaciones y chat | ✅ May 14 |
| S18 | Full regression (25 PASS) | ✅ May 14 |
| S20 | SEO/AEO audit | ✅ May 14 |
| S-REV-01 | Ratings, reviews + Full E2E | ✅ May 14 |
| S-MK-01 a 06 | Mercado, KPIs, SEO, RRSS, Marketing | ✅ May 14 |
| S-UX-01 | Plan tecnico UI Inmersiva | ✅ May 15 |
| S-UX-02 | Implementacion UI Inmersiva + Refac Global | ✅ May 15 |
| S-ADM-01 | Verificar estado legal de la entidad | ✅ En rama hija |

### 🔴 LO QUE MANUEL DEBE HACER AHORA

| # | Accion | Prioridad |
|---|--------|-----------|
| 1 | **S-MP-01: Carrito de compras** (P0) | ✅ Implementado en rama hija |
| 2 | **S-MP-02: Búsqueda y filtros** (P0) | 🔴 Prioridad máxima |
| 3 | **S-MP-06: Drop Social** (P1) | 🟡 |
| 4 | **S-MP-04: Publicación de productos** (P2) | 🟢 |
| 5 | **S-MP-07: Dashboard** (P2) — modo oscuro, cards cliqueables | 🟢 |
| 6 | **S-MP-08: Notificaciones** (P2) | 🟢 |
| 7 | S-ADM-02: Cuenta bancaria juridica + Binance empresa | 📋 Pendiente fisico |
| 8 | S-ADM-03: Modelos comerciales y juridicos | 📋 Pendiente fisico |
| 9 | S-ADM-04: Deploy + capacitacion CDA | 📋 Pendiente fisico |

---

## Actualizacion Manuel — S-MP-01 Carrito consolidado (2026-05-17 17:30 VET)

| Campo | Valor |
|-------|-------|
| Rama | `Manuel/s-mp-01-carrito-2026-05-17` |
| Estado | Implementado y documentado |
| QA canonico | `smp01_cart_consolidated_checkout` |
| Script | `npx tsx scripts/qa/run-marketplace-qa.mjs --module=S-MP-01` |
| Validacion | 2026-05-17T21:24:48Z — 17/17 PASS |
| Preview | `https://turpialsound-egsoseogk-bkgs-projects-829c67c1.vercel.app` |

### Entregado

- Carrito con cantidad maxima limitada por inventario real descontando ventas/operaciones previas.
- Listing detail con cantidad disponible y compra por cantidad.
- Orden consolidada `MpOrder` para carrito.
- `MpTransaction.quantity`, `unitPrice`, `orderId` para hijas por seller/listing.
- Comprobante obligatorio para reportar pago desde carrito.
- Entrega, confirmacion, liberacion y payout independientes por transaccion hija.
- Dashboard usuario reorganizado: tabs arriba y bandeja prioritaria colapsable.
- Preflight Oreshnik reparado para sintaxis de sync docs y JSON con BOM/cache invalida.

### Documentacion

- `docs/07_handoffs/S_MP_01_CART_SESSION_CLOSURE_2026-05-17.md`
- `docs/marketplace/CART_CONSOLIDATED_QA_MATRIX.md`
- `docs/07_handoffs/qa-dispatcher.json`
- `docs/07_handoffs/qa-canonical-runbook.md`

### Pendiente separado

- Browser E2E Playwright de clicks reales del carrito en preview. No usar CDP ni HTTP ad hoc.

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

> **Ultima actualizacion:** 17/05/26 20:22 VET | **Estado:** S-MP-01 CERRADO | **Tag:** `close-manuel-s-mp-01-2026-05-18`

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
﻿---
type: master-dashboard
project: "Turpial Sound"
status: active-integration
phase: "Fase G: Optimizacion marketplace post-cierre. 8 sprints nuevos (S-MP-01 a S-MP-08)."
last_updated: "18/05/26 09:09"
mother_branch: "MADRE/v5-s-mp-02-busqueda-fuzzy-filtros-ubicacion-2026-05-18"
mother_head: "RAMAMADRE_BASE"
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

## ESTADO ACTUAL — INTEGRACION DE RAMAS HIJAS (2026-05-16 21:04 VET)

**Ambas ramas hijas listas con documentacion actualizada. Code merge a madre PENDIENTE (Jean).**

| Rama | Operador | Commits | Contenido |
|------|----------|---------|-----------|
| `Jean/s12-reservas-v2-politica-paga-primero-2026-05-16` | 👤 Jean | 25 commits (vs base) | Booking fixes, WhatsApp notifications, performance, a11y, AEO, sitemap, admin dashboard |
| `Manuel/s-adm-01-legal-entity-2026-05-15` | 👤 Manuel | 114 commits (vs base) | S12-S20 marketplace, S-UX-01/02 UI Inmersiva, S-REV-01 reviews, S-MK marketing, BCV, metodologia |
| **NUEVA Rama madre** | — | `MADRE/v2-jean-s12-reservas-manuel-s-adm-01-2026-05-16` | DOCS INTEGRADOS. Codigo pendiente de merge. |
| **Produccion** | — | `prod/current-www-turpialsound-2026-05-08` @ `92fd6a3` | Deploy `nahska58r` en `turpialsound.com` |

> **PENDIENTE UNICO:** Jean integra el CODIGO de ambas ramas hijas en la rama madre. Los docs ya estan sincronizados.

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

### Rama activa: `Jean/s12-reservas-v2-politica-paga-primero-2026-05-16`

| Commit | Descripcion |
|--------|-------------|
| `e747e15` | fix(bookings): complete whatsapp reservation event notifications |
| `5fc3e60` | merge: integrate marketplace cart dropsocial oreshnik s12-s20 |
| `ae3904f` | fix(seo): polish AEO article and add to sitemap |
| `2671ad6` | fix(admin): force Caracas timezone in dashboard date rendering |
| `111e29b` | fix(bookings): allow qa hold bypass by phone env |

### Trabajo incorporado

| Sprint | Descripcion | Estado |
|--------|-------------|--------|
| S-JB-01 | Booking fixes (WhatsApp, calendar, holds) | 🟡 En rama hija |
| S-JB-02 | Admin booking dashboard command center | 🟡 En rama hija |
| S-JB-03 | Sitemap public-only, Vercel docs | 🟡 En rama hija |
| S19 | Performance LCP + mobile a11y | 🟡 En rama hija |
| S-MK-03 | AEO Caracas rehearsal room guide | 🟡 En rama hija |

### 🔴 LO QUE JEAN DEBE HACER AHORA

| # | Accion | Prioridad |
|---|--------|-----------|
| 1 | **S-MP-03: Formulario de pago y tasas** (P1) | 🟡 |
| 2 | **S-MP-05: Modal de compra desktop + semaforo** (P1) | 🟡 |
| 3 | **S-MP-07: Home — seccion marketplace + navegacion** (P2) | 🟢 |
| 4 | NO desplegar a produccion sin aprobacion explicita de ambos | 🚫 |
| 5 | Configurar `TS_MARKETPLACE_SENSITIVE_BLOB_READ_WRITE_TOKEN` en Vercel | 🟡 |

---

## 👤 MANUEL (Manuel Vera) — ESTADO

### Rama activa: `Manuel/s-adm-01-legal-entity-2026-05-15`

| Commit | Descripcion |
|--------|-------------|
| `93e4536` | fix(search): eliminar filtro estricto que bloqueaba busqueda difusa Fuse.js |
| `be609b0` | fix(sync): date mismatch no bloquea push |
| `c423d46` | merge: consolidar sprints marketplace + docs RAMA-MADRE + preflight v3.0 |

### Sprints cerrados

| Sprint | Descripcion | Fecha |
|--------|-------------|-------|
| S12-S14B | Purchase flow, proof upload, admin dashboard, shopping cart | ✅ May 13-14 |
| S15 | Location filters + listing modal | ✅ May 14 |
| S16 | Notificaciones y chat | ✅ May 14 |
| S18 | Full regression (25 PASS) | ✅ May 14 |
| S20 | SEO/AEO audit | ✅ May 14 |
| S-REV-01 | Ratings, reviews + Full E2E | ✅ May 14 |
| S-MK-01 a 06 | Mercado, KPIs, SEO, RRSS, Marketing | ✅ May 14 |
| S-UX-01 | Plan tecnico UI Inmersiva | ✅ May 15 |
| S-UX-02 | Implementacion UI Inmersiva + Refac Global | ✅ May 15 |
| S-ADM-01 | Verificar estado legal de la entidad | ✅ En rama hija |

### 🔴 LO QUE MANUEL DEBE HACER AHORA

| # | Accion | Prioridad |
|---|--------|-----------|
| 1 | **S-MP-01: Carrito de compras** (P0) | ✅ Implementado en rama hija |
| 2 | **S-MP-02: Búsqueda y filtros** (P0) | 🔴 Prioridad máxima |
| 3 | **S-MP-06: Drop Social** (P1) | 🟡 |
| 4 | **S-MP-04: Publicación de productos** (P2) | 🟢 |
| 5 | **S-MP-07: Dashboard** (P2) — modo oscuro, cards cliqueables | 🟢 |
| 6 | **S-MP-08: Notificaciones** (P2) | 🟢 |
| 7 | S-ADM-02: Cuenta bancaria juridica + Binance empresa | 📋 Pendiente fisico |
| 8 | S-ADM-03: Modelos comerciales y juridicos | 📋 Pendiente fisico |
| 9 | S-ADM-04: Deploy + capacitacion CDA | 📋 Pendiente fisico |

---

## Actualizacion Manuel — S-MP-01 Carrito consolidado (2026-05-17 17:30 VET)

| Campo | Valor |
|-------|-------|
| Rama | `Manuel/s-mp-01-carrito-2026-05-17` |
| Estado | Implementado y documentado |
| QA canonico | `smp01_cart_consolidated_checkout` |
| Script | `npx tsx scripts/qa/run-marketplace-qa.mjs --module=S-MP-01` |
| Validacion | 2026-05-17T21:24:48Z — 17/17 PASS |
| Preview | `https://turpialsound-egsoseogk-bkgs-projects-829c67c1.vercel.app` |

### Entregado

- Carrito con cantidad maxima limitada por inventario real descontando ventas/operaciones previas.
- Listing detail con cantidad disponible y compra por cantidad.
- Orden consolidada `MpOrder` para carrito.
- `MpTransaction.quantity`, `unitPrice`, `orderId` para hijas por seller/listing.
- Comprobante obligatorio para reportar pago desde carrito.
- Entrega, confirmacion, liberacion y payout independientes por transaccion hija.
- Dashboard usuario reorganizado: tabs arriba y bandeja prioritaria colapsable.
- Preflight Oreshnik reparado para sintaxis de sync docs y JSON con BOM/cache invalida.

### Documentacion

- `docs/07_handoffs/S_MP_01_CART_SESSION_CLOSURE_2026-05-17.md`
- `docs/marketplace/CART_CONSOLIDATED_QA_MATRIX.md`
- `docs/07_handoffs/qa-dispatcher.json`
- `docs/07_handoffs/qa-canonical-runbook.md`

### Pendiente separado

- Browser E2E Playwright de clicks reales del carrito en preview. No usar CDP ni HTTP ad hoc.

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

> **Ultima actualizacion:** 18/05/26 09:09 VET | **Estado:** S-MP-02 CERRADO | **Tag:** `close-manuel-s-mp-02-2026-05-18`

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
﻿---
type: master-dashboard
project: "Turpial Sound"
status: active-integration
phase: "Fase G: Optimizacion marketplace post-cierre. 8 sprints nuevos (S-MP-01 a S-MP-08)."
last_updated: "18/05/26 09:10"
mother_branch: "MADRE/v6-s-mp-06-drop-social-referidos-dashboard-2026-05-18"
mother_head: "RAMAMADRE_BASE"
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

## ESTADO ACTUAL — INTEGRACION DE RAMAS HIJAS (2026-05-16 21:04 VET)

**Ambas ramas hijas listas con documentacion actualizada. Code merge a madre PENDIENTE (Jean).**

| Rama | Operador | Commits | Contenido |
|------|----------|---------|-----------|
| `Jean/s12-reservas-v2-politica-paga-primero-2026-05-16` | 👤 Jean | 25 commits (vs base) | Booking fixes, WhatsApp notifications, performance, a11y, AEO, sitemap, admin dashboard |
| `Manuel/s-adm-01-legal-entity-2026-05-15` | 👤 Manuel | 114 commits (vs base) | S12-S20 marketplace, S-UX-01/02 UI Inmersiva, S-REV-01 reviews, S-MK marketing, BCV, metodologia |
| **NUEVA Rama madre** | — | `MADRE/v2-jean-s12-reservas-manuel-s-adm-01-2026-05-16` | DOCS INTEGRADOS. Codigo pendiente de merge. |
| **Produccion** | — | `prod/current-www-turpialsound-2026-05-08` @ `92fd6a3` | Deploy `nahska58r` en `turpialsound.com` |

> **PENDIENTE UNICO:** Jean integra el CODIGO de ambas ramas hijas en la rama madre. Los docs ya estan sincronizados.

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

### Rama activa: `Jean/s12-reservas-v2-politica-paga-primero-2026-05-16`

| Commit | Descripcion |
|--------|-------------|
| `e747e15` | fix(bookings): complete whatsapp reservation event notifications |
| `5fc3e60` | merge: integrate marketplace cart dropsocial oreshnik s12-s20 |
| `ae3904f` | fix(seo): polish AEO article and add to sitemap |
| `2671ad6` | fix(admin): force Caracas timezone in dashboard date rendering |
| `111e29b` | fix(bookings): allow qa hold bypass by phone env |

### Trabajo incorporado

| Sprint | Descripcion | Estado |
|--------|-------------|--------|
| S-JB-01 | Booking fixes (WhatsApp, calendar, holds) | 🟡 En rama hija |
| S-JB-02 | Admin booking dashboard command center | 🟡 En rama hija |
| S-JB-03 | Sitemap public-only, Vercel docs | 🟡 En rama hija |
| S19 | Performance LCP + mobile a11y | 🟡 En rama hija |
| S-MK-03 | AEO Caracas rehearsal room guide | 🟡 En rama hija |

### 🔴 LO QUE JEAN DEBE HACER AHORA

| # | Accion | Prioridad |
|---|--------|-----------|
| 1 | **S-MP-03: Formulario de pago y tasas** (P1) | 🟡 |
| 2 | **S-MP-05: Modal de compra desktop + semaforo** (P1) | 🟡 |
| 3 | **S-MP-07: Home — seccion marketplace + navegacion** (P2) | 🟢 |
| 4 | NO desplegar a produccion sin aprobacion explicita de ambos | 🚫 |
| 5 | Configurar `TS_MARKETPLACE_SENSITIVE_BLOB_READ_WRITE_TOKEN` en Vercel | 🟡 |

---

## 👤 MANUEL (Manuel Vera) — ESTADO

### Rama activa: `Manuel/s-adm-01-legal-entity-2026-05-15`

| Commit | Descripcion |
|--------|-------------|
| `93e4536` | fix(search): eliminar filtro estricto que bloqueaba busqueda difusa Fuse.js |
| `be609b0` | fix(sync): date mismatch no bloquea push |
| `c423d46` | merge: consolidar sprints marketplace + docs RAMA-MADRE + preflight v3.0 |

### Sprints cerrados

| Sprint | Descripcion | Fecha |
|--------|-------------|-------|
| S12-S14B | Purchase flow, proof upload, admin dashboard, shopping cart | ✅ May 13-14 |
| S15 | Location filters + listing modal | ✅ May 14 |
| S16 | Notificaciones y chat | ✅ May 14 |
| S18 | Full regression (25 PASS) | ✅ May 14 |
| S20 | SEO/AEO audit | ✅ May 14 |
| S-REV-01 | Ratings, reviews + Full E2E | ✅ May 14 |
| S-MK-01 a 06 | Mercado, KPIs, SEO, RRSS, Marketing | ✅ May 14 |
| S-UX-01 | Plan tecnico UI Inmersiva | ✅ May 15 |
| S-UX-02 | Implementacion UI Inmersiva + Refac Global | ✅ May 15 |
| S-ADM-01 | Verificar estado legal de la entidad | ✅ En rama hija |

### 🔴 LO QUE MANUEL DEBE HACER AHORA

| # | Accion | Prioridad |
|---|--------|-----------|
| 1 | **S-MP-01: Carrito de compras** (P0) | ✅ Implementado en rama hija |
| 2 | **S-MP-02: Búsqueda y filtros** (P0) | 🔴 Prioridad máxima |
| 3 | **S-MP-06: Drop Social** (P1) | 🟡 |
| 4 | **S-MP-04: Publicación de productos** (P2) | 🟢 |
| 5 | **S-MP-07: Dashboard** (P2) — modo oscuro, cards cliqueables | 🟢 |
| 6 | **S-MP-08: Notificaciones** (P2) | 🟢 |
| 7 | S-ADM-02: Cuenta bancaria juridica + Binance empresa | 📋 Pendiente fisico |
| 8 | S-ADM-03: Modelos comerciales y juridicos | 📋 Pendiente fisico |
| 9 | S-ADM-04: Deploy + capacitacion CDA | 📋 Pendiente fisico |

---

## Actualizacion Manuel — S-MP-01 Carrito consolidado (2026-05-17 17:30 VET)

| Campo | Valor |
|-------|-------|
| Rama | `Manuel/s-mp-01-carrito-2026-05-17` |
| Estado | Implementado y documentado |
| QA canonico | `smp01_cart_consolidated_checkout` |
| Script | `npx tsx scripts/qa/run-marketplace-qa.mjs --module=S-MP-01` |
| Validacion | 2026-05-17T21:24:48Z — 17/17 PASS |
| Preview | `https://turpialsound-egsoseogk-bkgs-projects-829c67c1.vercel.app` |

### Entregado

- Carrito con cantidad maxima limitada por inventario real descontando ventas/operaciones previas.
- Listing detail con cantidad disponible y compra por cantidad.
- Orden consolidada `MpOrder` para carrito.
- `MpTransaction.quantity`, `unitPrice`, `orderId` para hijas por seller/listing.
- Comprobante obligatorio para reportar pago desde carrito.
- Entrega, confirmacion, liberacion y payout independientes por transaccion hija.
- Dashboard usuario reorganizado: tabs arriba y bandeja prioritaria colapsable.
- Preflight Oreshnik reparado para sintaxis de sync docs y JSON con BOM/cache invalida.

### Documentacion

- `docs/07_handoffs/S_MP_01_CART_SESSION_CLOSURE_2026-05-17.md`
- `docs/marketplace/CART_CONSOLIDATED_QA_MATRIX.md`
- `docs/07_handoffs/qa-dispatcher.json`
- `docs/07_handoffs/qa-canonical-runbook.md`

### Pendiente separado

- Browser E2E Playwright de clicks reales del carrito en preview. No usar CDP ni HTTP ad hoc.

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

> **Ultima actualizacion:** 18/05/26 09:10 VET | **Estado:** S-MP-06 CERRADO | **Tag:** `close-manuel-s-mp-06-2026-05-18`

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
