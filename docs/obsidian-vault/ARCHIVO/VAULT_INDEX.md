---
type: vault-index
project: "Turpial Sound"
status: active
last_updated: "2026-05-12T14:27-04:00"
tags:
  - "#central"
  - "#index"
  - "#navigation"
  - "#status/live-source"
---

# 🏠 Turpial Sound — Vault Index

> **Punto de entrada al Obsidian Vault.** Todos los documentos están interconectados y clasificados con íconos visuales.

---

## 📊 LEYENDA DE ÍCONOS

| Ícono | Significado |
|-------|-------------|
| 🏠 | Dashboard / Central |
| 📋 | Documento de planificación |
| 🔴 | Pendiente / No iniciado |
| 🟡 | En progreso |
| 🟢 | Completado / Listo |
| ✅ | Cerrado (100% verificado) |
| ⛔ | Bloqueado |
| 🔧 | Tarea técnica |
| 📋 | Tarea administrativa |
| 👤 Jean | Owner Jean Arteaga |
| 👤 Manuel | Owner Manuel Vera |
| 🔒 | Requiere lock doble (Jean+Manuel) |
| 🚫 | Zona prohibida |
| 📦 | Arquitectura / Diseño |
| 🧪 | QA / Testing |
| 🐛 | Bugs / Riesgos |
| 📈 | Negocio / KPIs |
| 🌐 | SEO / Web |
| 💰 | Pagos / Finanzas |
| 🛒 | Marketplace |

---

## 🗺️ MAPA DEL VAULT

```
docs/obsidian-vault/
├── 🏠 00_CENTRAL_TURPIAL.md              ← ABRIR PRIMERO
├── 📋 PLAN_MAESTRO_SPRINTS_2026-05-12.md ← PLAN VIGENTE
│
├── 📋 GOVERNANCE & CONTROL
│   ├── 📋 BUS_CONTROL_TURPIAL.md
│   ├── 📋 ROADMAP_RESCATE.md
│   └── 📋 QA_MARKETPLACE_INTEGRADO.md
│
├── 📋 SPRINTS & PLANNING
│   ├── 📋 NEXT_PHASE_PLAN_S11_S20.md
│   ├── 📋 SPRINTS_CODEV_MARKETPLACE_2026-05-10.md
│   ├── 📋 SPRINTS_MARKETPLACE_PARALELO.md
│   └── 📋 SPRINTS_GENERADOS_DESDE_OBSIDIAN_2026-05-10.md
│
├── 📈 ESTADO
│   ├── 📈 ESTADO_NEGOCIO_TURPIAL_2026-05-10.md
│   ├── 📋 HITOS_MARKETPLACE_PRACTICOS.md
│   └── 🐛 BUGS_CRITICOS.md
│
├── 🧪 QA & TESTING
│   ├── ✅ S03_QA_HARNESS_INDEX.md          ← CERRADO 12/12
│   ├── 🧪 E2E_MANUAL_TEST_PROTOCOL_2026-05-11.md
│   ├── 🧪 QA_HARNESS_SCRIPTS_MAP_2026-05-10.md
│   ├── 🗺️ QA_HARNESS_CANVAS_2026-05-10.canvas
│   └── 🗺️ FLUJO_TASAS_BCV.canvas
│
└── 📦 ARQUITECTURA
    └── 📦 ARQUITECTURA_TASAS.md
```

---

## 📋 ESTADO GENERAL DEL PROYECTO

```
🟦 TRACK 1 — Marketplace ............... ✅ S12 CERRADO (9 sprints por delante)
🟩 TRACK 2 — Booking ................... 🔴 S-JB-01 PENDIENTE (4 sprints)
🟨 TRACK 3 — Crecimiento ............... ✅ S-MK-01 CERRADO (5 sprints)
🟪 TRACK 4 — Admin-Legal ............... 🔴 S-ADM-01 PENDIENTE (4 sprints)
🟧 TRACK 5 — UI/UX Premium ............. ✅ S-UX-01/02 COMPLETADO (0 sprints)

🏁 Meta: 100% sprints cerrados → Marketplace en producción + Booking optimizado +
         RRSS automatizadas + Legal operativo + UI premium
```

---

## 📊 SPRINTS COMPLETADOS (S01-S11)

| Sprint | Track | Owner | Qué resolvió | Resultado |
|--------|-------|-------|-------------|-----------|
| S01 | 🟦 Mkt | 👤 Manuel | Preview BKG autónomo | ✅ |
| S02 | 🟦 Mkt | 👤 Jean | Discovery runtime | ✅ |
| S03 | 🟦 Mkt | 👤 Manuel | QA Harness 12 módulos | ✅ 12/12 |
| S04 | 🟦 Mkt | 👤 Jean | Payment proof protegido | ✅ 9/9 |
| S05 | 🟦 Mkt | 👤 Manuel | Delivery & receipt | ✅ 9/9 |
| S06 | 🟦 Mkt | 👤 Jean | Payout auditable | ✅ |
| S07 | 🟦 Mkt | 👤 Jean | Tasas & accounting | ✅ 11/11 |
| S08 | 🟦 Mkt | 👤 Manuel | Action center & UX | ✅ 11/11 |
| S09 | 🟦 Mkt | 👤 Manuel | Discovery público & SEO | ✅ 9/9 |
| S10 | 🟦 Mkt | 👤 Jean | Release gate | 🟢 10/10 |
| S11 | 🟦 Mkt | 👤 Manuel | Playwright login smoke | ✅ 3/3 |

**Total cerrado: 11/27 sprints (41%)** | **Meta final: 27 sprints cerrados**

---

## 🔗 RELACIONES ENTRE DOCUMENTOS

```
PLAN_MAESTRO_SPRINTS_2026-05-12
  ├── referencia → 00_CENTRAL_TURPIAL
  ├── referencia → BUS_CONTROL_TURPIAL
  ├── referencia → NEXT_PHASE_PLAN_S11_S20
  ├── referencia → ARQUITECTURA_TASAS
  ├── referencia → SPRINTS_CODEV_MARKETPLACE_2026-05-10
  ├── alimenta → 00_CENTRAL_TURPIAL (dashboard)
  └── alimenta → docs/07_handoffs/plan-maestro-handoff-2026-05-12.md

00_CENTRAL_TURPIAL
  ├── referencia → PLAN_MAESTRO_SPRINTS_2026-05-12
  ├── referencia → BUS_CONTROL_TURPIAL
  ├── referencia → BUGS_CRITICOS
  ├── referencia → ROADMAP_RESCATE
  ├── referencia → ESTADO_NEGOCIO_TURPIAL_2026-05-10
  ├── referencia → NEXT_PHASE_PLAN_S11_S20
  ├── referencia → S03_QA_HARNESS_INDEX
  └── referencia → E2E_MANUAL_TEST_PROTOCOL_2026-05-11

BUS_CONTROL_TURPIAL
  ├── gobierno → todos los sprints
  ├── gobierno → zonas de código
  └── referencia → qa-dispatcher.json
```

---

## 🎯 PRÓXIMA ACCIÓN (HOY)

1. ✅ Plan Maestro creado → [[PLAN_MAESTRO_SPRINTS_2026-05-12]]
2. 🔴 **Jean:** Push de cambios locales al repo (ACCIÓN INMEDIATA)
3. 🔴 **Jean:** Configurar `TS_MARKETPLACE_SENSITIVE_BLOB_READ_WRITE_TOKEN` en Vercel
4. 🔴 **Jean:** Iniciar S12 — Purchase flow browser E2E
5. 🔴 **Manuel:** Verificar estado legal de Turpial Sound (S-ADM-01)
6. 🟡 **Manuel:** Preparar plan de despliegue CDA (viernes 15 mayo)

---

> **Este índice debe actualizarse al cerrar cada sprint.** Referencia viva del estado del vault.
