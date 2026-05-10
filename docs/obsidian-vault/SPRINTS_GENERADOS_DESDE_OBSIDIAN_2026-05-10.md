---
tags: ["#sprints", "#marketplace", "#plan", "#status/live-source"]
fecha: 2026-05-10
base: integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07
---

# Sprints Generados desde Obsidian — 2026-05-10

Secuencia productiva de sprints para cerrar el marketplace de Turpial Sound hasta launch readiness. Cada sprint es autonomo, verificable y con dueño explicito.

---

## S00 — Documentacion / Obsidian / Control Bus Sync

| Atributo | Valor |
|----------|-------|
| **Objetivo de negocio** | Repositorio documental coherente como fuente de verdad estrategica |
| **Owner** | Manuel |
| **Rama** | `Manuel/docs-strategic-obsidian-sprints-2026-05-10` |
| **Base** | `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07` |
| **Zona de implementacion** | `docs/obsidian-vault/`, `docs/07_handoffs/` |
| **Zonas prohibidas** | `app/`, `components/`, `actions/`, `lib/`, `prisma/`, `package.json`, lockfiles, `.env`, `.vercel` |
| **Dependencias** | Ninguna |
| **Criterio de aceptacion** | Todos los docs actualizados, Obsidian central map refrescado, sprint plan generado, control bus definido |
| **Validacion** | `git diff --check` limpio, cero secretos en diff |
| **Preview/QA** | No aplica |
| **Deploy a produccion** | Prohibido |
| **Docs a actualizar** | `00_CENTRAL_TURPIAL.md`, `ROADMAP_RESCATE.md`, `BUGS_CRITICOS.md`, `session-summary-active.md`, `next-window-brief.md`, nuevos: `ESTADO_NEGOCIO_TURPIAL_2026-05-10.md`, `BUS_CONTROL_TURPIAL.md`, `SPRINTS_GENERADOS_DESDE_OBSIDIAN_2026-05-10.md`, `jean-obsidian-control-bus-brief-2026-05-10.md` |
| **Stop conditions** | Repo sucio fuera de docs permitidos, secreto en diff |

---

## S01 — BKG Preview Smoke Autonomia

| Atributo | Valor |
|----------|-------|
| **Objetivo de negocio** | Confirmar que Manuel puede desplegar preview limpio en BKG Vercel desde `Manuel/*` con DB/JWT/Blob disponibles |
| **Owner** | Manuel |
| **Rama** | `Manuel/s01-preview-smoke-autonomy-2026-05-10` |
| **Base** | `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07` |
| **Zona de implementacion** | Preview deploy unicamente, cero cambios de codigo |
| **Zonas prohibidas** | `app/`, `components/`, `actions/`, `lib/`, `prisma/`, booking, produccion |
| **Dependencias** | Preview envs ya configurados en BKG Vercel |
| **Criterio de aceptacion** | `/marketplace` responde, login buyerIA/sellerIA/admin funcional, listings visibles, `/reservas` intacto, payment proof protegido |
| **Validacion** | `npx tsx scripts/diagnostics/preview-runtime-guard.ts --base-url <preview-url>` → PASS, smoke HTTP rutas clave 200 |
| **Preview/QA** | Preview smoke corto |
| **Deploy a produccion** | Prohibido |
| **Stop conditions** | Preview no responde, DB/JWT/Blob faltante, `/reservas` roto |

---

## S02 — Marketplace Runtime Discovery Stabilization

| Atributo | Valor |
|----------|-------|
| **Objetivo de negocio** | Eliminar el riesgo de Prisma query/runtime en marketplace discovery que aparecio en intento de deploy productivo |
| **Owner** | Manuel |
| **Rama** | `Manuel/s02-discovery-stabilization-2026-05-10` |
| **Base** | `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07` |
| **Zona de implementacion** | `actions/marketplace/listings.ts`, `app/marketplace/page.tsx`, componentes de discovery |
| **Zonas prohibidas** | Booking, Prisma schema, migraciones, produccion |
| **Dependencias** | Preview funcional (S01), acceso a runtime logs |
| **Criterio de aceptacion** | Discovery carga listings sin errores Prisma, sin UI vacia por query malformada, smoke HTTP `/marketplace` → 200 con contenido |
| **Validacion** | `npx tsx scripts/diagnostics/preview-runtime-guard.ts --smoke-http --base-url <preview-url>` → PASS, cero `P2021` o `QUERY_ERROR` |
| **Preview/QA** | Preview smoke + revision de runtime logs |
| **Deploy a produccion** | Prohibido hasta que preview smoke pase y Jean de release gate |
| **Stop conditions** | Error Prisma no reproducible, requiere cambio de schema/DB |

---

## S03 — Marketplace Auth/Login QA Closure

| Atributo | Valor |
|----------|-------|
| **Objetivo de negocio** | Cerrar definitivamente la correccion de login/sesion con roles correctos en preview |
| **Owner** | Manuel |
| **Rama** | `Manuel/s03-auth-login-qa-closure-2026-05-10` |
| **Base** | `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07` |
| **Zona de implementacion** | `actions/marketplace/auth.ts`, `components/marketplace/MarketplaceAuthModal.tsx` (solo si requiere ajuste residual) |
| **Zonas prohibidas** | Booking, credenciales hardcodeadas, produccion |
| **Dependencias** | S01 (preview funcional), credenciales QA en env |
| **Criterio de aceptacion** | buyerIA/sellerIA/admin login OK en preview, sesion con `isSeller` y `role` correctos desde DB, dashboards accesibles segun rol |
| **Validacion** | `node scripts/qa-marketplace-login-smoke.mjs` → buyerIA OK, sellerIA OK, admin OK |
| **Preview/QA** | Smoke de login en preview |
| **Deploy a produccion** | Prohibido sin release gate de Jean |
| **Stop conditions** | Regresion de login, roles incorrectos |

---

## S04 — Protected Payment Proof Flow E2E

| Atributo | Valor |
|----------|-------|
| **Objetivo de negocio** | Validar flujo completo de comprobantes de pago protegidos (storage sensible, visualizacion restringida) |
| **Owner** | Manuel |
| **Rama** | `Manuel/s04-payment-proof-e2e-2026-05-10` |
| **Base** | `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07` |
| **Zona de implementacion** | `actions/marketplace/transactions.ts`, rutas de payment proof, componentes de upload/review |
| **Zonas prohibidas** | Booking, exposicion de URLs sensibles, produccion |
| **Dependencias** | S01 (preview funcional), Blob sensible configurado, buyerIA y SUPER disponibles |
| **Criterio de aceptacion** | Comprador sube proof, proof queda bajo `/api/marketplace/payment-proofs/`, NO en Blob publico, SUPER accede por proxy autenticado |
| **Validacion** | QA manual en preview: buyerIA → comprar → adjuntar proof → verificar URL protegida → SUPER revisa proof |
| **Preview/QA** | Manual preview smoke (no hay script canonico aun) |
| **Deploy a produccion** | Prohibido hasta QA matrix completa |
| **Stop conditions** | Proof termina en Blob publico, proxy autenticado falla |

---

## S05 — Buyer/Seller Delivery & Receipt Flow

| Atributo | Valor |
|----------|-------|
| **Objetivo de negocio** | Cerrar flujo de entrega/recepcion que desbloquea la operacion post-escrow |
| **Owner** | Manuel |
| **Rama** | `Manuel/s05-delivery-receipt-flow-2026-05-10` |
| **Base** | `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07` |
| **Zona de implementacion** | `actions/marketplace/transactions.ts`, componentes de dashboard buyer/seller, system messages |
| **Zonas prohibidas** | Booking, payout automatico prematuro, produccion |
| **Dependencias** | S04 (payment proof funcional), transaccion en IN_ESCROW |
| **Criterio de aceptacion** | Seller marca "Ya entregue", buyer marca "Ya recibi", estados transicionan correctamente, system messages se generan, no hay payout prematuro |
| **Validacion** | `node scripts/qa-marketplace-qa-accounts.mjs` → flujo seller entrega + buyer recibe |
| **Preview/QA** | Smoke buyer/seller en preview |
| **Deploy a produccion** | Solo preview |
| **Stop conditions** | Transicion de estado inconsistente, payout ejecutado sin confirmacion |

---

## S06 — Admin Seller Payout Registration & Closure

| Atributo | Valor |
|----------|-------|
| **Objetivo de negocio** | Formalizar ejecucion de pago a vendedor por admin despues de fondos liberables |
| **Owner** | Manuel |
| **Rama** | `Manuel/s06-admin-payout-closure-2026-05-10` |
| **Base** | `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07` |
| **Zona de implementacion** | `actions/marketplace/admin.ts`, `actions/marketplace/transactions.ts`, componentes admin payout |
| **Zonas prohibidas** | Booking, schema sin escalar |
| **Dependencias** | S05 (delivery flow cerrado), transaccion en estado RELEASED o equivalente |
| **Criterio de aceptacion** | Admin registra pago con monto, metodo, referencia/hash, fecha, tasa aplicable. Transaccion pasa a estado final. Diferencia clara entre RELEASED (fondos liberables) y PAID (pago ejecutado). |
| **Validacion** | QA manual admin: login admin → ir a payout → registrar pago → verificar estado final y metadata |
| **Preview/QA** | Manual preview |
| **Deploy a produccion** | Prohibido sin release gate |
| **Stop conditions** | Requiere cambio de schema no planificado |

---

## S07 — Rates / Finance / Accounting Hardening

| Atributo | Valor |
|----------|-------|
| **Objetivo de negocio** | Verificar y endurecer calculos de tasas, comisiones, y logica financiera del marketplace |
| **Owner** | Manuel |
| **Rama** | `Manuel/s07-rates-finance-hardening-2026-05-10` |
| **Base** | `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07` |
| **Zona de implementacion** | `lib/marketplace/reference-rate.ts`, `lib/marketplace/binance-rate.ts`, `actions/marketplace/transactions.ts`, `MpBinanceRateSnapshot` |
| **Zonas prohibidas** | Booking, BCV de produccion sin test, migraciones sin lock |
| **Dependencias** | S06 (payout logic), modelo `MpBinanceRateSnapshot`, migracion aplicada |
| **Criterio de aceptacion** | BCV fresco confirmado, snapshots Binance auditables, calculo de payout correcto (precio - comision - fees), tasa y fecha valor registradas |
| **Validacion** | `node scripts/qa-marketplace-reconcile.mjs` → lectura de tasas y conciliacion |
| **Preview/QA** | Preview smoke + verificacion de snapshots |
| **Deploy a produccion** | Prohibido hasta plan de migracion/release aprobado |
| **Stop conditions** | BCV roto, snapshot corrupto, calculo de payout incorrecto |

---

## S08 — Marketplace UX / Action Center / Notifications

| Atributo | Valor |
|----------|-------|
| **Objetivo de negocio** | Hacer obvias las acciones pendientes para buyers, sellers y admin |
| **Owner** | Manuel |
| **Rama** | `Manuel/s08-ux-action-center-2026-05-10` |
| **Base** | `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07` |
| **Zona de implementacion** | `app/marketplace/dashboard/`, `components/marketplace/`, componentes de notificaciones, badges, action center |
| **Zonas prohibidas** | Booking |
| **Dependencias** | S05, S06 (flujos operativos definidos) |
| **Criterio de aceptacion** | Buyer ve "Acciones pendientes", seller ve "Por entregar" / "Cobros pendientes", admin ve "Validaciones pendientes" / "Pagos por ejecutar". Badges/unread chips funcionales. |
| **Validacion** | QA manual buyer/seller/admin: verificar dashboards con badges y acciones contextuales |
| **Preview/QA** | Preview manual |
| **Deploy a produccion** | Solo preview |
| **Stop conditions** | Acciones duplicadas, badges incorrectos |

---

## S09 — Public Marketplace SEO/AEO / Discovery Polish

| Atributo | Valor |
|----------|-------|
| **Objetivo de negocio** | Cerrar discoverability publica del marketplace |
| **Owner** | Manuel |
| **Rama** | `Manuel/s09-seo-aeo-discovery-2026-05-10` |
| **Base** | `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07` |
| **Zona de implementacion** | `app/marketplace/page.tsx`, `app/marketplace/[slug]/page.tsx`, componentes de filtros, metadata, sitemap |
| **Zonas prohibidas** | Booking, pasarelas de pago |
| **Dependencias** | S02 (discovery estable) |
| **Criterio de aceptacion** | Listings publicos con filtros (categoria, ubicacion, precio), copy sin jerga, metadata SEO, sitemap generado |
| **Validacion** | QA visual en preview: filtros funcionales, metadata presente, listings accesibles sin login |
| **Preview/QA** | Preview |
| **Deploy a produccion** | Solo preview |
| **Stop conditions** | Filtros rompen discovery |

---

## S10 — Launch Readiness / Security Rotation / Release Gate

| Atributo | Valor |
|----------|-------|
| **Objetivo de negocio** | Preparar launch real del marketplace |
| **Owner** | Manuel + Jean |
| **Rama** | `Manuel/s10-launch-readiness-2026-05-10` |
| **Base** | `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07` |
| **Zona de implementacion** | Rotacion de secretos (Jean), verificacion de Vercel envs, release checklist, rollback plan |
| **Zonas prohibidas** | Booking runtime |
| **Dependencias** | S01-S09 completos |
| **Criterio de aceptacion** | Secretos rotados, envs verificados, QA matrix completa, release checklist firmado, Jean aprueba deploy |
| **Validacion** | Preview smoke final + QA matrix completa + revision de seguridad |
| **Preview/QA** | QA matrix completa |
| **Deploy a produccion** | **Si**, solo con release gate de Jean |
| **Stop conditions** | Cualquier item de QA matrix falla, secreto sin rotar, Jean no aprueba |

---

## Notas de secuencia

- **S00 es este mismo sprint.** Se ejecuta primero.
- **S01-S03** son independientes entre si y pueden ejecutarse en paralelo si hay capacidad.
- **S04-S06** son secuenciales: payment proof → delivery → payout.
- **S07** puede ejecutarse en paralelo con S04-S06 si no hay conflicto de schema.
- **S08** depende de S05-S06 para tener flujos cerrados que mostrar.
- **S09** es independiente, puede adelantarse.
- **S10** es el gate final, requiere todos los anteriores.

## Prioridad

1. S00 (este sprint) — documentacion y orden
2. S01 — autonomia de preview (desbloquea todo lo demas)
3. S02 — estabilidad (elimina riesgo de produccion)
4. S03 — login (cierra hotfix pendiente)
5. S04-S06 — flujo operativo completo
6. S07 — dinero correcto
7. S08-S09 — UX y discoverability
8. S10 — launch
