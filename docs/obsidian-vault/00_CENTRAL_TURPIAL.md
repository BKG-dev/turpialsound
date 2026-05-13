---
type: master-dashboard
project: "Turpial Sound"
status: active
phase: "Fase D en curso + Tracks paralelos activados (Plan Maestro 2026-05-12)"
last_updated: "2026-05-13T01:13-04:00"
mother_branch: "integration/today-reservas-marketplace-stable-2026-05-07"
mother_commit: "f7f2d1e"
preview: "https://turpialsound-5qwhe7is1-bkgs-projects-829c67c1.vercel.app"
tags:
  - "#central"
  - "#map"
  - "#status/live-source"
  - "#dashboard"
  - "#multi-agent"
  - "#manuel"
  - "#jean"
---

# 🏠 Turpial Sound — Dashboard Activo

> **Abrí este archivo al inicio de cada sesión. Tiene todo lo que necesitás.**

> **📋 Plan Maestro vigente:** [[PLAN_MAESTRO_SPRINTS_2026-05-12]] — Leer antes de ejecutar cualquier sprint.

---

## 📍 ¿Dónde estamos?

- **Rama madre:** `integration/today-reservas-marketplace-stable-2026-05-07` (commit `f7f2d1e`)
- **Preview Vercel:** `https://turpialsound-5qwhe7is1-bkgs-projects-829c67c1.vercel.app`
- **Fase A, B y C COMPLETAS.** Fase D en curso.
- **18 módulos QA automatizados** + **1 spec Playwright (S11 login UI smoke).** 0 FAIL. Release Gate 🟢.
- **/reservas congelado** (zona exclusiva Jean). /marketplace activo y funcional.
- **5 Tracks de trabajo paralelo activados** con el Plan Maestro 2026-05-12.

---

## 🗺️ Mapa rápido de tracks

| Track | Color | Descripción | Owner principal |
|-------|-------|-------------|-----------------|
| 🟦 **T1 Marketplace** | S12-S21 | Flujo marketplace completo + carrito + location filters + release | Jean + Manuel |
| 🟩 **T2 Booking** | S-JB-01 a S-JB-04 | Fixes booking + dashboard + tasas + reseñas | 👤 Jean |
| 🟨 **T3 Crecimiento** | S-MK-01 a S-MK-06 | Mercado, KPIs, SEO/AEO, RRSS, marketing | 👤 Manuel |
| 🟪 **T4 Admin-Legal** | S-ADM-01 a S-ADM-04 | Documentación legal, banco, Binance, marca, deploy CDA | 👤 Manuel (físico) |
| 🟧 **T5 UI/UX** | S-UX-01 a S-UX-02 | UI Inmersiva + Refac Global | 👤 Manuel |

---

## ✅ ¿Qué se ha hecho? — S01-S11 COMPLETOS

| Sprint | Owner | Qué resolvió | Resultado |
|--------|-------|-------------|-----------|
| S01 | 👤 Manuel | Preview BKG autónomo | ✅ |
| S02 | 👤 Jean | Discovery runtime estable | ✅ |
| S03 | 👤 Manuel | QA Harness 12 módulos | ✅ 12/12 PASS |
| S04 | 👤 Jean | Payment proof protegido | ✅ 9/9 PASS |
| S05 | 👤 Manuel | Delivery & receipt flow | ✅ 9/9 PASS |
| S06 | 👤 Jean | Payout auditable (migración) | ✅ PASS |
| S07 | 👤 Jean | Tasas y accounting | ✅ 11/11 PASS |
| S08 | 👤 Manuel | Action center y UX | ✅ 11/11 PASS |
| S09 | 👤 Manuel | Discovery público y SEO | ✅ 9/9 PASS |
| S10 | 👤 Jean | Release gate | 🟢 10/10 |
| S11 | 👤 Manuel | Playwright + login UI smoke | ✅ 3/3 PASS |
| S12 | 👤 Manuel | Purchase flow browser E2E | ✅ 9/9 PASS |
| S13 | 👤 Manuel | Payment proof upload browser | ✅ PASS |
| S14B | 👤 Manuel | Shopping cart + share listing | ✅ PASS |
| S-MK-01 | 👤 Manuel | Análisis mercado + KPIs | ✅ PASS |
| — | 👤 Manuel | Scheduler BCV dual frecuencia | ✅ PASS |
| — | 👤 Manuel | Análisis metodología Oreshnik | ✅ PASS |

> Ver detalle: [[S03_QA_HARNESS_INDEX]] | [[NEXT_PHASE_PLAN_S11_S20]]

---

## 🔴 PRÓXIMO SPRINT — S12 (Manuel, reasignado)

| Campo | Valor |
|-------|-------|
| **Sprint** | S12 — Purchase flow browser E2E |
| **Owner** | 👤 Manuel (← reasignado de Jean. Jean en core web business) |
| **Branch** | `Manuel/s12-purchase-flow-browser-2026-05-12` |
| **Depende de** | S11 (Playwright instalado) |
| **Estado** | 🔴 PENDIENTE |

**Tareas:**
- Navegar listing QA → click "Comprar" → Pago Móvil → Confirmar → Screenshots
- Validar TX creada en DB con status `PENDING_PAYMENT`
- Cierre: 3/3 screenshots + TX en DB
- Al terminar: continuar S13 → S14 (Manuel) o entregar a Jean si ya está libre

---

## 🔴 PENDIENTES INMEDIATOS (Jean)

| # | Pendiente | Sprint | Prioridad |
|---|-----------|--------|-----------|
| 1 | ⚠️ **Configurar Vercel Previews por Sprint** — Ver [[ACCION_P1_JEAN_VERCEL_PREVIEWS]] | LOCK GLOBAL | 🔴 P0 |
| 2 | Push de cambios locales del core web business al repo | ACCIÓN INMEDIATA | 🔴 P0 |
| 3 | Configurar `TS_MARKETPLACE_SENSITIVE_BLOB_READ_WRITE_TOKEN` en Vercel | ACCIÓN INMEDIATA | 🔴 P0 |
| 4 | S12-S14 REASIGNADOS a Manuel temporalmente | — | ℹ️ |
| 5 | Retomar S-JB-01 (Booking fixes) al liberarse | S-JB-01 | 🟡 |

---

## 🔴 PENDIENTES INMEDIATOS (Manuel)

| # | Pendiente | Sprint | Prioridad |
|---|-----------|--------|-----------|
| 1 | Verificar estado de constitución legal de Turpial Sound | S-ADM-01 | 🔴 P0 |
| 2 | Preparar plan de despliegue para viernes 15 mayo 11AM CDA | S-ADM-04 | 🔴 P0 |
| 3 | S-MK-01 — Análisis de mercado y competencia | S-MK-01 | 🟡 |
| 4 | Revisar APIs RRSS disponibles | S-MK-04 (investigación) | 🟡 |

---

## 📊 RESUMEN DE ESTADO DE TRACKS

### 🟦 TRACK 1: Marketplace (S12-S21)

| Sprint | Descripción | Owner | Estado |
|--------|-------------|-------|--------|
| S12 | Purchase flow browser E2E | 👤 Jean | 🔴 PENDIENTE |
| S13 | Payment proof upload browser | 👤 Manuel | 🔴 PENDIENTE |
| S14 | Admin dashboard + cierre pagos | 👤 Jean | 🔴 PENDIENTE |
| S14B | Shopping cart marketplace | 👤 Manuel | 🔴 PENDIENTE |
| S15 | Location filters + listing modal | 👤 Manuel | 🔴 PENDIENTE |
| S16 | Notificaciones y chat | 👤 Manuel | 🔴 PENDIENTE |
| S17 | Seller dashboard browser | 👤 Jean | 🔴 PENDIENTE |
| S18 | Full regression browser | 👤 Manuel | 🔴 PENDIENTE |
| S19 | Performance + load | 👤 Jean | 🔴 PENDIENTE |
| S20 | SEO/AEO audit completo | 👤 Manuel | 🔴 PENDIENTE |
| S21 | Production release gate | 👤 Jean | 🔴 PENDIENTE |

### 🟩 TRACK 2: Booking

| Sprint | Descripción | Owner | Estado |
|--------|-------------|-------|--------|
| S-JB-01 | Fixes críticos (selección múltiple, cantidad, WhatsApp) | 👤 Jean | 🔴 PENDIENTE |
| S-JB-02 | Dashboard de reservas | 👤 Jean | 🔴 PENDIENTE |
| S-JB-03 | Tasas horarias, sitemap, Vercel docs, mobile UI | 👤 Jean | 🔴 PENDIENTE |
| S-JB-04 | Protocolo reseñas Google + descuentos | 👤 Jean | 🔴 PENDIENTE |

### 🟨 TRACK 3: Crecimiento Digital

| Sprint | Descripción | Owner | Estado |
|--------|-------------|-------|--------|
| S-MK-01 | Análisis de mercado y competencia | 👤 Manuel | 🔴 PENDIENTE |
| S-MK-02 | Diseño KPI dashboard inteligente | 👤 Manuel | 🔴 PENDIENTE |
| S-MK-03 | SEO/AEO full + Academia Turpial | 👤 Jean + Manuel | 🔴 PENDIENTE |
| S-MK-04 | Automatización RRSS (setup APIs) | 👤 Manuel | 🔴 PENDIENTE |
| S-MK-05 | Generación y despliegue contenido RRSS | 👤 Manuel | 🔴 PENDIENTE |
| S-MK-06 | Plan marketing digital + despliegue | 👤 Manuel | 🔴 PENDIENTE |

### 🟪 TRACK 4: Administrativo-Legal

| Sprint | Descripción | Owner | Estado |
|--------|-------------|-------|--------|
| S-ADM-01 | Documentación legal + marca | 👤 Manuel (físico) | 🔴 PENDIENTE |
| S-ADM-02 | Cuenta bancaria jurídica + Binance empresa | 👤 Manuel (físico) | 🔴 PENDIENTE |
| S-ADM-03 | Modelos comerciales y jurídicos | 👤 Manuel (físico) | 🔴 PENDIENTE |
| S-ADM-04 | Deploy CDA + configuración operativa | 👤 Manuel (físico) | 🔴 PENDIENTE |

### 🟧 TRACK 5: UI/UX Premium

| Sprint | Descripción | Owner | Estado |
|--------|-------------|-------|--------|
| S-UX-01 | UI Inmersiva Phase 1 (plan) | 👤 Manuel | 🔴 PENDIENTE |
| S-UX-02 | UI Inmersiva Phase 2 + Refac Global | 👤 Manuel | 🔴 PENDIENTE |

---

## 📋 PRÓXIMO HITO CRÍTICO: Viernes 15 mayo 2026 — 11:00 AM VET

**Deploy de la plataforma en La Casa del Artista:**
- [ ] Preparar plan de despliegue con instrucciones precisas
- [ ] Guía de usuario para el equipo de CDA
- [ ] Roadmap de funcionalidades
- [ ] Capacitación del equipo
- [ ] Configuración de dispositivos (calendario, Gmail, notificaciones)

---

## 🔒 REGLAS DEL BUS (recordatorio rápido)

| Zona | Regla |
|------|-------|
| `/reservas` | 🚫 Zona exclusiva Jean. Manuel no toca. |
| `schema.prisma` | 🔒 Lock doble Jean+Manuel. No se modifica sin acuerdo. |
| `.env` / secretos | 🚫 Nunca se commitean. |
| `docs/obsidian-vault/` | 📋 Actualizar al cerrar cada sprint. |
| `.obsidian/` | 🚫 Nunca se commitea (workspace local). |
| `var/qa-results/` | 🚫 No se commitea. |

---

## 🔗 NAVEGACIÓN RÁPIDA

**Documentos centrales:**
- 📋 [[PLAN_MAESTRO_SPRINTS_2026-05-12]] — Plan maestro vigente con todos los tracks
- 📋 [[NEXT_PHASE_PLAN_S11_S20]] — Plan detallado S11-S20
- 📋 [[BUS_CONTROL_TURPIAL]] — Reglas del bus de control
- 📋 [[BUGS_CRITICOS]] — Bugs y riesgos activos
- 📋 [[ROADMAP_RESCATE]] — Roadmap de rescate
- 📋 [[ESTADO_NEGOCIO_TURPIAL_2026-05-10]] — Estado del negocio
- 📋 [[ARQUITECTURA_TASAS]] — Motor de tasas BCV/Binance

**QA y Testing:**
- 📋 [[S03_QA_HARNESS_INDEX]] — QA Harness (CERRADO 12/12)
- 📋 [[E2E_MANUAL_TEST_PROTOCOL_2026-05-11]] — Protocolo E2E manual
- 📋 [[QA_MARKETPLACE_INTEGRADO]] — Reglas de despacho QA
- 📋 [[QA_HARNESS_SCRIPTS_MAP_2026-05-10]] — Inventario de scripts QA

**Sprints:**
- 📋 [[SPRINTS_CODEV_MARKETPLACE_2026-05-10]] — Definiciones S01-S10
- 📋 [[SPRINTS_MARKETPLACE_PARALELO]] — Metodología paralela
- 📋 [[SPRINTS_GENERADOS_DESDE_OBSIDIAN_2026-05-10]] — Índice ejecutivo

**Marketplace docs:**
- `docs/marketplace/00_IMPLEMENTATION_SUMMARY.md`
- `docs/marketplace/01_ROADMAP_AND_STATUS.md`
- `docs/marketplace/02_PAYMENT_ARCHITECTURE.md`
- `docs/marketplace/03_API_INTEGRATION_PLAN.md`
- `docs/marketplace/04_DISPUTES_&_SECURITY.md`
- `docs/marketplace/05_GLOSARIO_DE_TERMINOS_UX.md`
- `docs/marketplace/LOCATION_FILTERS_DESIGN_BRIEF.md`
- `docs/marketplace/SEO_AEO_NEXT_AUDIT.md`

**Handoffs:**
- `docs/07_handoffs/qa-dispatcher.json`
- `docs/07_handoffs/qa-canonical-runbook.md`
- `docs/07_handoffs/next-window-brief.md`

**Notas de reunión (intake):**
- `docs/intake/Reunión iniciada a las 2026_05_12 00_28 UTC - Notas de Gemini.md`
- `docs/intake/Reunión iniciada a las 2026_05_12 15_11 UTC - Notas de Gemini.md`
- `docs/intake/cuestionario_maestro_cliente_turpial_song.md`

**Instrucciones de diseño:**
- `docs/INSTRUCCIONES_UI_INMERSIVA.md`
- `docs/INSTRUCCIONES_REFAC_GLOBAL.md`

**Control points:**
- `docs/control-points/turpial_sound_control_point_01.md`

---

> **Última actualización:** 2026-05-12T14:27-04:00 | **Plan Maestro:** [[PLAN_MAESTRO_SPRINTS_2026-05-12]]
