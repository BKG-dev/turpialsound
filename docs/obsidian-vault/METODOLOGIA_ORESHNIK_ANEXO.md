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

## 🏗️ Analogía: Una fábrica de software

Turpial Sound es una fábrica con **dos operadores** (Jean y Manuel) y una **línea de producción** de 5 estaciones que va de la idea al producto en `turpialsound.com`.

```
  ESTACIÓN 1        ESTACIÓN 2        ESTACIÓN 3        ESTACIÓN 4           ESTACIÓN 5
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    ┌──────────────┐
│ DOCS         │  │ RAMA PROPIA  │  │ CÓDIGO + QA  │  │ VALIDACIÓN   │    │ PRODUCCIÓN   │
│ CANÓNICOS    │→ │              │→ │              │→ │ + MERGE GATE │ →  │ turpialsound │
│              │  │              │  │              │  │              │    │ .com         │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    └──────────────┘
   Ambos leen        Ambos crean       Ambos codean       Jean mergea         Jean + Manuel
   docs              rama/sprint       + testean          Manuel valida       validan prod
```

---

## 📋 Las 5 Estaciones — Detalle

| # | Estación | Quién | Qué hace | Evidencia |
|---|----------|-------|----------|-----------|
| 1 | **Docs canónicos** | Ambos | Leer [[INSTRUCCION_APERTURA_SESION]] + [[00_CENTRAL_TURPIAL]] | Sesión iniciada |
| 2 | **Rama propia** | Ambos | `git checkout -b {Op}/{sprint}-{fecha}` desde `integration/today-reservas-marketplace-stable-2026-05-07` | Rama creada |
| 3 | **Código + QA** | Ambos | Implementar scope. QA modules. Playwright. Commits con prefijo `qa(sXX):` | Commits |
| 4 | **Validación + Gate** | Jean (mergea), Manuel (valida) | `tsc --noEmit` + `pnpm build` + QA PASS + sin secrets + sin `/reservas` | Checklist 8/8 |
| 5 | **Producción** | Jean | `git merge` a main → Vercel auto-deploy → smoke post-prod | `turpialsound.com` OK |

---

## 🔒 Las 4 Reglas de Oro

| # | Regla | Razón |
|---|-------|-------|
| 1 | **Una sola rama madre** | `integration/today-reservas-marketplace-stable-2026-05-07`. Sin esto, divergencia de ramas. |
| 2 | **Jean es el gatekeeper** | Solo Jean mergea a madre y main. Nadie despliega directo a prod. |
| 3 | **Zonas exclusivas** | `/reservas` = Jean. `schema.prisma` = lock doble Jean+Manuel. |
| 4 | **Cerrar antes de abrir** | Un sprint no empieza hasta que el anterior en su track está ✅ CERRADO. |

---

## 👥 Roles

| | Jean (BKG-dev) | Manuel (Manuel Vera) |
|---|---|---|
| **Zona** | `/reservas`, DB/schema, prod, merge gate, Vercel envs | `/marketplace`, QA, Playwright, docs, SEO, vault |
| **Puede** | Mergear a madre y main, gatekeeper de prod | Ejecutar sprints marketplace, QA, smoke, docs |
| **NO puede** | Desplegar sin validación de Manuel | Tocar `/reservas`, mergear a madre, tocar schema sin Jean |

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
VALIDAR → tsc + build + QA PASS + sin secrets + sin /reservas
  ↓
CERRAR → Actualizar 00_CENTRAL + PLAN_MAESTRO + commit + push + notificar
  ↓
JEAN MERGE GATE → Revisar + git merge a madre + push
  ↓
MANUEL SMOKE → /, /marketplace, /reservas, /api/bcv-rate, /admin/login → OK
  ↓
JEAN RELEASE → git merge a main → Vercel → turpialsound.com
```

> **Canvas visual interactivo:** [[FLUJO_PROTOCOLO_TRABAJO]]

---

## 🧠 Oreshnik: HOY vs FUTURO

| Componente | HOY (manual) | FUTURO (Oreshnik automatizado) |
|-----------|-------------|-------------------------------|
| Pre-flight | Ejecutar QA-00 manual | `.husky/pre-commit` automático |
| Zone check | Leer tabla en 00_CENTRAL | `zone-map.json` + `zone-check.ps1` |
| Crear rama | `git checkout -b` manual | `scaffold-sprint.ps1` un comando |
| Ejecutar | Manual | `oreshnik.ps1 run --sprint S15` |
| Cerrar | Editar docs a mano | `generate-closure-report.ps1` |
| Notificar | Manual (mirar git) | `update-dashboard.ps1` + marcadores |
| Vercel preview | Auto por push | Preview único por rama `Manuel/*` |

---

## ⚡ Estado Actual — 2026-05-14

```
FASE: RECONCILIACIÓN (PASO 0 — BLOQUEA TODO)

  Manuel/integration-s12-s14b-... ──┐
                                      ├──→ Jean unifica → madre → validar → main
  integration/preserve-dashboard-... ──┘
```

| Track | Cerrado | Parcial | Pendiente |
|-------|---------|---------|-----------|
| 🟦 Marketplace | S01-S14B | S19 | S15-S21 |
| 🟩 Booking | — | S-JB-01/02/03 | S-JB-04 |
| 🟨 Crecimiento | S-MK-01 | S-MK-03 | S-MK-02/04/05/06 |
| 🟪 Admin-Legal | — | — | S-ADM-01 a 04 |
| 🟧 UI/UX | — | — | S-UX-01/02 |

---

## 📖 Documentos Canónicos (en orden de autoridad)

| # | Documento | Función |
|---|-----------|---------|
| 1 | [[00_CENTRAL_TURPIAL]] | **Fuente única de verdad.** Estado de todo. Manda sobre cualquier otro. |
| 2 | [[INSTRUCCION_APERTURA_SESION]] | Qué hacer al abrir Kilo. Instrucciones separadas Jean/Manuel. |
| 3 | [[PLAN_MAESTRO_SPRINTS_2026-05-12]] | Definiciones de los 27 sprints en 5 tracks. |
| 4 | [[BUS_CONTROL_TURPIAL]] | Reglas del bus, locks, checklist de push. |
| 5 | [[METODOLOGIA_OPTIMIZACION]] | Análisis detallado de optimizaciones (lo que se va a construir). |
| 6 | `docs/07_handoffs/qa-dispatcher.json` | Despacho canónico de QA. |

---

## 🔗 Enlaces rápidos

- 📊 **Canvas visual:** [[FLUJO_PROTOCOLO_TRABAJO]]
- 🚀 **Apertura de sesión:** [[INSTRUCCION_APERTURA_SESION]]
- 🏠 **Dashboard central:** [[00_CENTRAL_TURPIAL]]
- 📋 **Plan maestro:** [[PLAN_MAESTRO_SPRINTS_2026-05-12]]
- 🐛 **Bugs críticos:** [[BUGS_CRITICOS]]
- 💱 **Flujo de tasas:** [[FLUJO_TASAS_BCV]]
- 🧪 **QA Harness:** [[QA_HARNESS_CANVAS_2026-05-10]]
