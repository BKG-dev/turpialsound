---
type: handoff-brief
project: "Turpial Sound"
status: active
date: "2026-05-12"
last_updated: "2026-05-12T14:27-04:00"
from: "Plan Maestro de Sprints"
to: "Jean y Manuel — Ejecución S12 + Tracks paralelos"
tags:
  - "#handoff"
  - "#plan-maestro"
  - "#manuel"
  - "#jean"
---

# 📋 Handoff — Plan Maestro 2026-05-12

> **Resumen ejecutivo del plan para el siguiente ciclo de trabajo.**

---

## 🎯 OBJETIVO DE ESTA FASE

Cerrar el 100% de los pendientes del proyecto Turpial Sound — técnicos y administrativos — con avance progresivo en 5 tracks paralelos, ajustado a la metodología Oreshnik y el Bus de Control Nivel 2.5.

**Producto final:** Marketplace en producción + Booking optimizado + RRSS automatizadas + Estructura legal operativa + UI premium desplegada.

---

## 📊 RESUMEN DE LO CERRADO (S01-S11)

- ✅ 11 sprints completados (Fases A, B, C, inicio D)
- ✅ 18 módulos QA automatizados, 0 FAIL
- ✅ Playwright instalado, login UI smoke 3/3 PASS
- ✅ Marketplace funcional: listings, compra, pago, escrow, payout
- ✅ Tasas BCV y Binance implementadas (falta liquidación seller)
- ✅ Preview Vercel activa y funcional

---

## 🚀 PLAN DE EJECUCIÓN

### 🟦 TRACK 1 — Marketplace (Prioridad MÁXIMA)

**Secuencia estricta:** S12 → S13 → S14 → S14B → S15 → S16 → S17 → S18 → S19 → S20 → S21

| Sprint | Owner | Objetivo | Semana |
|--------|-------|----------|--------|
| **S12** | 👤 Jean | Purchase flow browser E2E | SEM 1 |
| **S13** | 👤 Manuel | Payment proof upload browser | SEM 1-2 |
| **S14** | 👤 Jean | Admin dashboard + cierre de pagos pendientes | SEM 2-3 |
| **S14B** | 👤 Manuel | Shopping cart marketplace | SEM 2-3 |
| **S15** | 👤 Manuel | Location filters + listing modal con estado/ciudad | SEM 3 |
| **S16** | 👤 Manuel | Notificaciones y chat | SEM 3-4 |
| **S17** | 👤 Jean | Seller dashboard browser | SEM 4 |
| **S18** | 👤 Manuel | Full regression browser | SEM 4-5 |
| **S19** | 👤 Jean | Performance + load | SEM 5 |
| **S20** | 👤 Manuel | SEO/AEO audit completo | SEM 5-6 |
| **S21** | 👤 Jean | Production release gate | SEM 6 |

### 🟩 TRACK 2 — Booking (Jean exclusivo)

| Sprint | Owner | Objetivo |
|--------|-------|----------|
| **S-JB-01** | 👤 Jean | Selección múltiple + cantidad temas + WhatsApp fecha/hora |
| **S-JB-02** | 👤 Jean | Dashboard de reservas con vistas segregadas |
| **S-JB-03** | 👤 Jean | Tasas horarias, sitemap cleanup, Vercel docs, mobile UI, botón |
| **S-JB-04** | 👤 Jean | Protocolo reseñas Google + sistema de descuentos |

### 🟨 TRACK 3 — Crecimiento (Manuel)

| Sprint | Owner | Objetivo |
|--------|-------|----------|
| **S-MK-01** | 👤 Manuel | Análisis de mercado y competencia |
| **S-MK-02** | 👤 Manuel | KPI dashboard inteligente |
| **S-MK-03** | 👤 Jean + Manuel | SEO/AEO full + Academia Turpial |
| **S-MK-04** | 👤 Manuel | APIs RRSS setup |
| **S-MK-05** | 👤 Manuel | Contenido automático RRSS |
| **S-MK-06** | 👤 Manuel | Plan marketing + despliegue |

### 🟪 TRACK 4 — Admin-Legal (Manuel físico)

| Sprint | Owner | Objetivo |
|--------|-------|----------|
| **S-ADM-01** | 👤 Manuel | Documentación legal + marca |
| **S-ADM-02** | 👤 Manuel | Cuenta bancaria + Binance empresa |
| **S-ADM-03** | 👤 Manuel | Modelos comerciales entre entidades |
| **S-ADM-04** | 👤 Manuel | Deploy CDA viernes 15 mayo + config operativa |

### 🟧 TRACK 5 — UI/UX Premium (Manuel)

| Sprint | Owner | Objetivo |
|--------|-------|----------|
| **S-UX-01** | 👤 Manuel | Plan técnico UI Inmersiva (sin tocar código) | ✅ CERRADO 2026-05-15 |
| **S-UX-02** | 👤 Manuel | Implementación UI Inmersiva + Refac Global | ✅ CERRADO 2026-05-15 |

---

## ⚡ ACCIONES INMEDIATAS (HOY)

### Jean Arteaga:
- [ ] **PUSH de cambios locales** al repo (rama actual o nueva rama)
- [ ] Configurar `TS_MARKETPLACE_SENSITIVE_BLOB_READ_WRITE_TOKEN` en Vercel
- [ ] Leer [[PLAN_MAESTRO_SPRINTS_2026-05-12]]
- [ ] Crear branch `jean/s12-purchase-flow-browser-2026-05-12` desde madre
- [ ] Iniciar S12

### Manuel Vera:
- [ ] Verificar estado de constitución legal de Turpial Sound (¿existe la entidad?)
- [ ] Revisar estado de APIs RRSS (Meta, Google, TikTok, YouTube)
- [ ] Confirmar reunión viernes 15 mayo 11AM VET con directora CDA
- [ ] Preparar guía de usuario y plan de despliegue para CDA
- [ ] Compartir credenciales de Instagram con Jean (si no se ha hecho)

---

## 🚫 ZONAS PROHIBIDAS

| Zona | Regla |
|------|-------|
| `/reservas` | 🚫 Zona exclusiva Jean. Manuel no toca código. |
| `schema.prisma` | 🔒 Lock doble. No modificar sin acuerdo Jean+Manuel. |
| `.env` / `.env.local` | 🚫 Nunca commitear. |
| `.obsidian/` | 🚫 Workspace local, no commitear. |
| `var/qa-results/` | 🚫 Resultados de tests, no commitear. |

---

## 🔗 REFERENCIAS

- Plan completo: [[PLAN_MAESTRO_SPRINTS_2026-05-12]]
- Dashboard: [[00_CENTRAL_TURPIAL]]
- Bus de control: [[BUS_CONTROL_TURPIAL]]
- Próxima fase S11-S20: [[NEXT_PHASE_PLAN_S11_S20]]
- Índice del vault: [[VAULT_INDEX]]

---

> **Próximo hito:** Viernes 15 mayo 2026 — Deploy La Casa del Artista + S12 cerrado (Jean) + S-MK-01 cerrado (Manuel)
