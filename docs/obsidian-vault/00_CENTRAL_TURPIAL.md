---
type: master-dashboard
project: "Turpial Sound Marketplace"
status: active
phase: "Fase B completa → iniciando Fase D"
last_updated: "2026-05-11T04:30-04:00"
mother_branch: "integration/today-reservas-marketplace-stable-2026-05-07"
mother_commit: "8999e32"
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

---

## 📍 ¿Dónde estamos?

- **Rama madre:** `integration/today-reservas-marketplace-stable-2026-05-07` (commit `8999e32`)
- **Preview Vercel:** `https://turpialsound-5qwhe7is1-bkgs-projects-829c67c1.vercel.app`
- **Fase A, B y parte de C COMPLETAS.** Iniciando Fase D (browser/Playwright).
- **18 módulos QA automatizados.** 0 FAIL. Release Gate 🟢.
- **/reservas congelado.** /marketplace activo y funcional.

---

## ✅ ¿Qué se ha hecho? — S01-S10 COMPLETOS

| Sprint | Owner | Qué resolvió | Resultado |
|--------|-------|-------------|-----------|
| [[S01]] | Manuel | Preview BKG autónomo | ✅ |
| [[S02]] | Jean | Discovery runtime estable | ✅ |
| [[S03]] | Manuel | QA Harness 12 módulos | 12/12 PASS |
| [[S04]] | Jean | Payment proof protegido | 9/9 PASS |
| [[S05]] | Manuel | Delivery & receipt flow | 9/9 PASS |
| [[S06]] | Jean | Payout auditable (migración) | PASS |
| [[S07]] | Jean | Tasas y accounting | 11/11 PASS |
| [[S08]] | Manuel | Action center y UX | 11/11 PASS |
| [[S09]] | Manuel | Discovery público y SEO | 9/9 PASS |
| [[S10]] | Jean | Release gate | 10/10 🟢 |

> Ver detalle completo: [[S03_QA_HARNESS_INDEX]] | [[NEXT_PHASE_PLAN_S11_S20]]

---

## 🚀 ¿Qué falta? — Fases D, E, F (S11-S20)

### Fase D — Browser/UI E2E con Playwright

| Sprint | Owner | Objetivo | Branch |
|--------|-------|----------|--------|
| **S11** 🔴 | Manuel | Playwright setup + login UI smoke | `Manuel/s11-playwright-login-ui` |
| **S12** | Jean | Purchase flow browser E2E | `jean/s12-purchase-flow-browser` |
| **S13** | Manuel | Payment proof upload browser | `Manuel/s13-proof-upload-browser` |

### Fase E — Admin & Notificaciones

| Sprint | Owner | Objetivo | Branch |
|--------|-------|----------|--------|
| **S14** | Jean | Admin dashboard browser | `jean/s14-admin-dashboard-browser` |
| **S15** | Manuel | Notificaciones y chat | `Manuel/s15-notifications-chat` |
| **S16** | Jean | Seller dashboard browser | `jean/s16-seller-dashboard-browser` |

### Fase F — Cobertura completa + Launch

| Sprint | Owner | Objetivo | Branch |
|--------|-------|----------|--------|
| **S17** | Manuel | Full regression browser | `Manuel/s17-full-regression-browser` |
| **S18** | Jean | Performance + load | `jean/s18-performance-load` |
| **S19** | Manuel | SEO/AEO audit | `Manuel/s19-seo-aeo-audit` |
| **S20** | Jean | Production release gate | `jean/s20-production-release-gate` |

> Ver plan detallado: [[NEXT_PHASE_PLAN_S11_S20]]

---

## 👤 ¿Quién hace qué?

### Manuel
**Gate keeper de:** QA de marketplace, UX operativa, copy, estados, dashboards, SEO.
**Próximo sprint:** **S11** — Instalar Playwright, login UI smoke con screenshots.
```
git checkout -b Manuel/s11-playwright-login-ui-2026-05-12 origin/integration/today-reservas-marketplace-stable-2026-05-07
```

### Jean
**Gate keeper de:** Integración, Vercel, DB, schema, merges a madre, preview, producción.
**Próximo sprint:** **S12** — Purchase flow browser E2E (depende de S11).
```
git checkout -b jean/s12-purchase-flow-browser-2026-05-12 origin/integration/today-reservas-marketplace-stable-2026-05-07
```
**Pendiente Jean:** Configurar `TS_MARKETPLACE_SENSITIVE_BLOB_READ_WRITE_TOKEN` en Vercel.

---

## 🔧 Comandos canónicos (cada sesión)

```bash
# 1. Asegurar credenciales QA (pide contraseña UNA vez)
powershell -ExecutionPolicy Bypass -File scripts/qa/ensure-marketplace-qa-env.ps1

# 2. Verificar env vars
npx tsx scripts/qa/doctor-marketplace-qa-env.mjs

# 3. Full automated test suite (18 módulos)
npx tsx scripts/qa/run-marketplace-qa.mjs \
  "--modules=qa-12,s05,s07,s08,s09" \
  "--app-url=https://turpialsound-5qwhe7is1-bkgs-projects-829c67c1.vercel.app"

# 4. Release gate check
npx tsx scripts/qa/modules/qa-s10-release-gate.mjs
```

---

## 📋 Reglas permanentes

- ❌ No `main`. No producción sin release gate.
- ❌ No booking `/reservas`. Es zona exclusiva de Jean.
- ❌ No imprimir secrets, tokens, DATABASE_URL ni contraseñas.
- ❌ No commitear `.env.local`, `var/qa-results/`, `.obsidian/`.
- ✅ Sprint cerrado = validación + commit + push + docs + siguiente paso.
- ✅ Multi-agente: Jean y Manuel en ramas separadas desde madre.
- ✅ Locks: DB/schema requieren doble lock Jean+Manuel.

---

## 🔗 Navegación rápida

| ¿Qué busco? | Archivo |
|-------------|---------|
| Dashboard de QA S03 | [[S03_QA_HARNESS_INDEX]] |
| Plan siguiente fase S11-S20 | [[NEXT_PHASE_PLAN_S11_S20]] |
| Protocolo de pruebas manuales | [[E2E_MANUAL_TEST_PROTOCOL_2026-05-11]] |
| Roadmap de rescate | [[ROADMAP_RESCATE]] |
| Bugs y guardrails | [[BUGS_CRITICOS]] |
| Reglas del bus de control | [[BUS_CONTROL_TURPIAL]] |
| Inventario de scripts QA | [[QA_HARNESS_SCRIPTS_MAP_2026-05-10]] |
| Reporte cierre S03 | [[S03_FINAL_QA_HARNESS_CLOSURE_2026-05-11]] |
| Cierres S04-S10 | `docs/07_handoffs/S04_PAYMENT_PROOF_CLOSURE*.md` → |
| Dispatcher QA (task_ids) | `docs/07_handoffs/qa-dispatcher.json` |
| Runner multi-agente | [[AGENT_CONTROL_BUS_RUNNER]] |
| Estado del negocio | [[ESTADO_NEGOCIO_TURPIAL_2026-05-10]] |
