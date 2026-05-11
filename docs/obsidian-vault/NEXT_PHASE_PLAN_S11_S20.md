---
type: phase-plan
project: "Turpial Sound Marketplace"
status: active
phase: "Fase D → Fase F"
last_updated: "2026-05-11T04:30-04:00"
mother_branch: "integration/today-reservas-marketplace-stable-2026-05-07"
tags:
  - "#phase-plan"
  - "#sprint/s11-s20"
  - "#manuel"
  - "#jean"
  - "#playwright"
  - "#browser-e2e"
  - "#status/active"
---

# Plan Siguiente Fase — S11 a S20

> Ver dashboard general en [[00_CENTRAL_TURPIAL]]

---

## Estado actual

- ✅ **Fase A COMPLETA** (S01-S03): Autonomía, runtime seguro, QA harness base (18 módulos server-side).
- ✅ **Fase B COMPLETA** (S04-S06): Payment proof protegido, delivery/receipt, payout auditable.
- ✅ **Fase C PARCIAL** (S07-S09): Tasas/accounting, action center UX, discovery público.
- 🟢 **S10 Release Gate:** 10/10 READY.
- 🔴 **Fase D PENDIENTE** (S11-S13): Browser/UI E2E con Playwright.

---

## Fase D — Browser/UI E2E con Playwright

> **Objetivo:** Reemplazar validación server-side con tests browser reales. Screenshots, traces, interacción UI.

### S11 — Playwright setup + Login UI smoke
- **Owner:** Manuel
- **Branch:** `Manuel/s11-playwright-login-ui-2026-05-12`
- **Base:** `integration/today-reservas-marketplace-stable-2026-05-07`
- **Tareas:**
  1. `npm install -D @playwright/test && npx playwright install chromium`
  2. Crear helpers de navegación: `scripts/qa/playwright/login.mjs`, `screenshot.mjs`
  3. Login UI: buyerIA, sellerIA, mvera. Screenshot de cada sesión.
  4. Validar modal de auth, redirección post-login, header con nombre.
  5. Generar reporte HTML con screenshots.
- **Validación:** `npx tsx scripts/qa/playwright/s11-login-smoke.spec.mjs`
- **Output:** `var/qa-results/s11-login-report/`

### S12 — Purchase flow browser E2E
- **Owner:** Jean
- **Branch:** `jean/s12-purchase-flow-browser-2026-05-12`
- **Base:** `integration/today-reservas-marketplace-stable-2026-05-07`
- **Depende de:** S11 (Playwright instalado)
- **Tareas:**
  1. Navegar listing QA → click "Comprar"
  2. Seleccionar método de pago "Pago Móvil"
  3. Confirmar compra
  4. Verificar pantalla "Esperando comprobante"
  5. Screenshot de cada paso
- **Validación:** TX creada en DB con status PENDING_PAYMENT.

### S13 — Payment proof upload browser
- **Owner:** Manuel
- **Branch:** `Manuel/s13-proof-upload-browser-2026-05-12`
- **Base:** `integration/today-reservas-marketplace-stable-2026-05-07`
- **Tareas:**
  1. Crear fixture `scripts/qa/fixtures/payment-proof-dummy.png`
  2. File chooser: seleccionar comprobante dummy
  3. Llenar formulario: referencia, banco, fecha
  4. Subir y verificar estado post-upload
  5. Screenshot y trace del file upload

---

## Fase E — Admin & Notificaciones

> **Objetivo:** Validar dashboards admin, notificaciones, chat entre buyer/seller.

### S14 — Admin dashboard browser
- **Owner:** Jean
- **Branch:** `jean/s14-admin-dashboard-browser-2026-05-12`
- **Tareas:** Login como mvera, navegar tabs: Validaciones, Escrow, Payouts. Screenshots.

### S15 — Notificaciones y chat
- **Owner:** Manuel
- **Branch:** `Manuel/s15-notifications-chat-2026-05-12`
- **Tareas:** Chat thread, mensajes buyer↔seller, unread counts, action center.

### S16 — Seller dashboard browser
- **Owner:** Jean
- **Branch:** `jean/s16-seller-dashboard-browser-2026-05-12`
- **Tareas:** Login sellerIA, Mis Ventas, listings, cobros. Screenshots.

---

## Fase F — Cobertura completa + Launch

> **Objetivo:** Full regression con Playwright, performance, SEO, y release gate de producción.

### S17 — Full regression browser
- **Owner:** Manuel
- **Branch:** `Manuel/s17-full-regression-browser-2026-05-12`
- **Tareas:** Ejecutar todos los módulos S11-S16 en secuencia con Playwright. Screenshots + traces.

### S18 — Performance + load
- **Owner:** Jean
- **Branch:** `jean/s18-performance-load-2026-05-12`
- **Tareas:** Lighthouse, métricas Core Web Vitals, cold start time. Reporte.

### S19 — SEO/AEO audit
- **Owner:** Manuel
- **Branch:** `Manuel/s19-seo-aeo-audit-2026-05-12`
- **Tareas:** Schema.org, Open Graph, Twitter Cards, sitemap.xml, robots.txt, meta tags.

### S20 — Production release gate
- **Owner:** Jean
- **Branch:** `jean/s20-production-release-gate-2026-05-12`
- **Tareas:** Checklist final, rollback plan, go/no-go, deploy a producción.

---

## Dependencias entre sprints

```
S11 (Manuel)
  └─► S12 (Jean)
        └─► S13 (Manuel)
              └─► S14 (Jean) + S15 (Manuel) [paralelo]
                    └─► S16 (Jean)
                          └─► S17 (Manuel)
                                └─► S18 (Jean) + S19 (Manuel) [paralelo]
                                      └─► S20 (Jean)
```

---

## Asignaciones

| Colaborador | Sprints asignados | Total |
|-------------|-------------------|-------|
| **Manuel** | S11, S13, S15, S17, S19 | 5 sprints |
| **Jean** | S12, S14, S16, S18, S20 | 5 sprints |

---

## ¿Qué significa "producto 100% listo"?

- [x] **Backend funcional:** Login, publish, discovery, compra, pago, delivery, receipt, payout. (S01-S10)
- [ ] **UI validada con browser:** Todos los flujos probados con Playwright + screenshots. (S11-S17)
- [ ] **Admin dashboard:** Validaciones, escrow, payouts funcionales. (S14)
- [ ] **Notificaciones:** Chat buyer↔seller, system messages. (S15)
- [ ] **Performance:** Lighthouse > 80, Core Web Vitals OK. (S18)
- [ ] **SEO/AEO:** Schema.org, sitemap, meta tags, Open Graph. (S19)
- [ ] **Release gate:** Checklist final, rollback plan, go/no-go. (S20)

---

## Enlaces

- Volver al dashboard: [[00_CENTRAL_TURPIAL]]
- Protocolo E2E manual: [[E2E_MANUAL_TEST_PROTOCOL_2026-05-11]]
- Reglas del bus: [[BUS_CONTROL_TURPIAL]]
- Sprints S01-S10: [[SPRINTS_CODEV_MARKETPLACE_2026-05-10]]
