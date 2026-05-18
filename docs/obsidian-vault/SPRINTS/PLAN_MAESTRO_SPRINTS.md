---
type: master-plan
project: "Turpial Sound"
status: active-integration
version: "2.0"
last_updated: "2026-05-18T13:09:54.458Z"
methodology: "Oreshnik v4.0 + Madre Dinamica"
mother_branch: "MADRE/v5-s-mp-02-busqueda-fuzzy-filtros-ubicacion-2026-05-18"
tags:
  - "#central"
  - "#master-plan"
  - "#sprints"
  - "#roadmap"
  - "#status/live-source"
  - "#manuel"
  - "#jean"
---

# 🎯 PLAN MAESTRO DE SPRINTS — Turpial Sound

> **Objetivo:** Cerrar el 100% de los pendientes técnicos y administrativos con avance progresivo, separación de tareas Jean/Manuel, y metodología Oreshnik + Bus de Control Nivel 2.5.
> 
> **Regla de oro:** No se avanza un sprint hasta tenerlo 🔒 100% CERRADO. Un sprint abierto bloquea al siguiente en su mismo track.

---

## 📐 MARCO METODOLÓGICO

### Principios Oreshnik + Bus de Control

| Principio | Regla |
|-----------|-------|
| 🔒 **Una zona activa por persona** | Jean y Manuel no pisan la misma zona simultáneamente |
| 👤 **Owner único por sprint** | Cada sprint tiene UN owner claro |
| ✅ **Cierre verificable** | Cada sprint tiene criterios de PASS/FAIL documentados |
| 🚫 **No mezclar zonas** | Booking `/reservas` = zona exclusiva Jean. Schema/DB = lock doble Jean+Manuel |
| 📋 **Pre-flight obligatorio** | Antes de cada sprint: `npx tsx scripts/qa/bootstrap-marketplace-qa.mjs --doctor` |
| 🛑 **Stop conditions** | Si un P0 aparece, se detiene el sprint y se escala |

### Clasificación de Tareas

| Tipo | Descripción | Ejecutor |
|------|-------------|----------|
| 🔧 **TÉCNICO** | Código, deploy, test, agentes automatizados | Jean o Manuel (con agentes) |
| 📋 **ADMINISTRATIVO** | Requiere acción física/presencial de Manuel | Manuel (físico) |

---

## 📍 ESTADO ACTUAL — LÍNEA BASE

### ✅ COMPLETADO Y CERRADO

| Sprint | Descripción | Owner | Resultado |
|--------|-------------|-------|-----------|
| S01 | Preview BKG autónomo | Manuel | ✅ |
| S02 | Discovery runtime estable | Jean | ✅ |
| S03 | QA Harness (12/12 PASS) | Manuel | ✅ CERRADO |
| S04 | Payment proof protegido (9/9) | Jean | ✅ |
| S05 | Delivery & receipt flow (9/9) | Manuel | ✅ |
| S06 | Payout auditable | Jean | ✅ |
| S07 | Tasas & accounting (11/11) | Jean | ✅ |
| S08 | Action center & UX (11/11) | Manuel | ✅ |
| S09 | Public discovery & SEO (9/9) | Manuel | ✅ |
| S10 | Release gate (10/10 🟢) | Jean | ✅ implementado, pendiente merge |
| S11 | Playwright + login UI smoke (3/3) | Manuel | ✅ CERRADO |
| **S12** | Purchase flow browser E2E (9/9 PASS) | 👤 Manuel (reasignado) | ✅ CERRADO 2026-05-13 |
| **S13** | Payment proof upload browser E2E | 👤 Manuel (reasignado) | ✅ CERRADO 2026-05-13 |
| **S14** | Admin dashboard + BCV scheduler | 👤 Manuel (reasignado) | ✅ CERRADO 2026-05-13 |
| **S14B** | Shopping cart + share listing | 👤 Manuel | ✅ CERRADO 2026-05-12 |
| **S-MK-01** | Análisis de mercado y competencia | 👤 Manuel | ✅ CERRADO (incluido en S14B) |
| — | Metodología Oreshnik: análisis de optimización | 👤 Manuel | ✅ CERRADO 2026-05-13 |
| — | BCV dual-frequency rate scheduler | 👤 Manuel | ✅ CERRADO 2026-05-13 |
| **S15** | Location filters + listing modal + inventory | 👤 Manuel | ✅ CERRADO 2026-05-14 |
| **S16** | Notificaciones y chat + system messages | 👤 Manuel | ✅ CERRADO 2026-05-14 |
| **S18** | Full regression (25 PASS, 0 FAIL) | 👤 Manuel | ✅ CERRADO 2026-05-14 |
| **S20** | SEO/AEO audit (10 páginas) | 👤 Manuel | ✅ CERRADO 2026-05-14 |
| **S-MK-02** | KPI dashboard (8 métricas) | 👤 Manuel | ✅ CERRADO 2026-05-14 |
| **S-MK-04/05/06** | RRSS + Marketing plan | 👤 Manuel | ✅ CERRADO 2026-05-14 |
| **S-REV-01** | Ratings, reviews + Full E2E + payout export | 👤 Manuel | ✅ CERRADO 2026-05-14 |

**Fases A, B, C, D COMPLETAS. Fase E (reconciliacion + release) en curso.**

### 🟡 TRABAJO PARCIAL DE JEAN (fuera de metodologia — requiere incorporacion)

| Trabajo | Mapeo a sprint | Estado |
|---------|---------------|--------|
| WhatsApp verification + calendar holds + admin idempotent + QA bypass | S-JB-01 parcial | 🟡 En rama `integration/preserve-dashboard-cwv-aeo-reservas-2026-05-13` |
| Admin booking dashboard command center | S-JB-02 parcial | 🟡 En rama de Jean |
| Sitemap public-only fix | S-JB-03 parcial | 🟡 En rama de Jean + desplegado a prod |
| Performance LCP + mobile animations + a11y (6 commits) | S19 parcial | 🟡 En rama de Jean |
| AEO Caracas rehearsal room guide | S-MK-03 parcial | 🟡 En rama de Jean |
| WhatsApp webhook lab + Meta signup | Fuera de plan | 🟡 En rama de Jean |

### 🔴 PENDIENTE INMEDIATO

- **RECONCILIACION DE RAMAS:** Unificar `Manuel/integration-s12-s14b-marketplace-closure-2026-05-13` + `integration/preserve-dashboard-cwv-aeo-reservas-2026-05-13` en `RAMA MADRE`
- **Pendiente Jean:** Mergear y validar. Ver [[INSTRUCCION_APERTURA_SESION]] y [[00_CENTRAL_TURPIAL]]
- **Pendiente Jean:** Configurar `TS_MARKETPLACE_SENSITIVE_BLOB_READ_WRITE_TOKEN` en Vercel
- **Pendiente Jean:** Configurar `CRON_SECRET` en Vercel para BCV scheduler
- **ARQUITECTURA_TASAS:** 7 items de liquidación seller pendientes

---

## 🗺️ TRACKS DE SPRINTS

El plan se organiza en **5 tracks paralelos** con dependencias internas. Cada track avanza independientemente, pero comparte recursos (Jean y Manuel).

```
TRACK 1 🟦 MARKETPLACE: S12 → S13 → S14+S14B → S15 → S16 → S17 → S18 → S19 → S20 → S21 ✅ CERRADO
TRACK 1B 🟦 MARKETPLACE OPT: S-MP-01 → S-MP-02 → S-MP-03/05/06 → S-MP-04 → S-MP-07 → S-MP-08
TRACK 2 🟩 BOOKING:      S-JB-01 → S-JB-02 → S-JB-03 → S-JB-04
TRACK 3 🟨 CRECIMIENTO:  S-MK-01 → S-MK-02 → S-MK-03 → S-MK-04 → S-MK-05 → S-MK-06 ✅ CERRADO
TRACK 4 🟪 ADMIN:        S-ADM-01 → S-ADM-02 → S-ADM-03 → S-ADM-04
TRACK 5 🟧 UI/UX:        S-UX-01 → S-UX-02 ✅ CERRADO
```

---

## 🟦 TRACK 1: PLATAFORMA MARKETPLACE (S12 → S20+)

> **Owner general:** Jean (backend/flujo) + Manuel (QA/UX/SEO)
> **Zona:** `/marketplace` y server actions asociados
> **No tocar:** `/reservas`, `schema.prisma` sin lock doble

---

### S12 — Purchase Flow Browser E2E ✅ CERRADO 2026-05-14

| Campo | Valor |
|-------|-------|
| **Owner primary** | 👤 Manuel (reasignado 2026-05-12 — Jean en core web business) |
| **Owner fallback** | 👤 Jean (si Manuel no puede, o al terminar core web business) |
| **Branch** | `Manuel/s12-purchase-flow-browser-2026-05-12` |
| **Base** | `RAMA MADRE` |
| **Depende de** | S11 (Playwright instalado) |
| **Tipo** | 🔧 TÉCNICO |
| **Reasignación** | Jean ocupado en core web business. Manuel toma S12-S14. Jean retoma en S-JB-01. |

**Tareas:**
1. Navegar listing QA → click "Comprar"
2. Seleccionar método de pago "Pago Móvil"
3. Confirmar compra
4. Verificar pantalla "Esperando comprobante"
5. Screenshot de cada paso
6. Validar TX creada en DB con status `PENDING_PAYMENT`

**Cierre:** ✅ 3/3 screenshots + TX en DB

---

### S13 — Payment Proof Upload Browser

| Campo | Valor |
|-------|-------|
| **Owner primary** | 👤 Manuel (reasignado) |
| **Owner fallback** | 👤 Jean |
| **Branch** | `Manuel/s13-proof-upload-browser-2026-05-12` |
| **Depende de** | S12 |
| **Tipo** | 🔧 TÉCNICO |

**Tareas:**
1. Crear fixture `scripts/qa/fixtures/payment-proof-dummy.png`
2. File chooser: seleccionar comprobante dummy
3. Llenar formulario: referencia, banco, fecha
4. Subir y verificar estado post-upload
5. Screenshot y trace del file upload

**Cierre:** ✅ Screenshots de upload exitoso + estado `PAYMENT_RECEIVED`

---

### S14 — Admin Dashboard Browser + Shopping Cart

| Campo | Valor |
|-------|-------|
| **Owner primary** | 👤 Manuel (reasignado) |
| **Owner fallback** | 👤 Jean |
| **Branch** | `Manuel/s14-admin-dashboard-browser-2026-05-12` |
| **Depende de** | S13 |
| **Tipo** | 🔧 TÉCNICO |

**Tareas:**
1. Login como mvera (admin)
2. Navegar tabs: Validaciones, Escrow, Payouts
3. Implementar **cierre de flujo de pagos pendientes:**
   - Generar lista de pagos pendientes al vendedor
   - **Acción prioritaria para admin:** notificación/badge de "Pagos pendientes por ejecutar"
   - Pantalla de envío de lista de pagos con datos: precio venta, tasa de cambio al momento del pago, fecha valor, tasa aplicada (BCV o Binance según caso)
   - Campo para documentar comprobante de pago por cada operación
   - Botón "Marcar como pagado" con registro de fecha/hora/admin
4. **Casos de tasa documentados:**
   - C1: Buyer Binance + Seller Binance → 5% + 0.06 USDT flat
   - C2: Buyer Binance + Seller Bs → 5% + 0.3% bank fee, tasa Binance congelada en `fechaValor`
   - C3: Buyer Banco + Seller Bs → 5% + 0.3% bank fee, tasa BCV
5. Screenshots de cada flujo

**Cierre:** ✅ Admin puede ver → enviar → documentar → cerrar cada pago pendiente

---

### S14B — Shopping Cart + Compartir Listing (Marketplace)

| Campo | Valor |
|-------|-------|
| **Owner** | 👤 Manuel |
| **Branch** | `Manuel/s14b-shopping-cart-share-2026-05-12` |
| **Depende de** | S14 (admin dashboard estable) |
| **Tipo** | 🔧 TÉCNICO |
| **Paralelo con** | S15 (si S14 cierra) |

**Tareas — Shopping Cart:**
1. Diseñar modelo de carrito (client-state con `localStorage` + server validation)
2. Componente `ShoppingCartIcon` con badge de conteo en header
3. Drawer/Panel lateral con items, cantidades, subtotales
4. Botón "Comprar todo" que consolida en una sola `MpTransaction` o múltiples
5. Validación: no permitir doble compra del mismo listing activo
6. Test Playwright: agregar 2 items → verificar carrito → checkout consolidado

**Tareas — Compartir Listing:**
7. **Botón "Compartir" en cada listing** (detail page `[slug]` + tarjeta `MarketplaceCard`):
   - Copiar link del listing al portapapeles con confirmación visual ("¡Link copiado!")
   - Compartir por WhatsApp con mensaje preformateado: `"Mira este artículo en Turpial Sound Marketplace: [título] — [precio] → [URL]"`
   - Usar `navigator.share()` (Web Share API) en mobile con fallback a copiar link
   - Ícono de WhatsApp directo con `wa.me` link (prefill mensaje)
8. **Metadatos sociales para sharing:**
   - Open Graph tags dinámicos por listing: `og:title`, `og:description`, `og:image` (primera foto del listing), `og:url`
   - Twitter Card: `summary_large_image` con imagen del listing
   - WhatsApp preview: asegurar que el link pegado en WhatsApp muestre preview rico (imagen + título + descripción)
9. **UTM tracking en links compartidos:** `?utm_source=share&utm_medium=whatsapp|clipboard|social&utm_campaign=listing_share`
10. Test Playwright: abrir listing → click compartir → verificar link copiado → verificar WhatsApp link generado
11. **Actualizar `05_GLOSARIO_DE_TERMINOS_UX.md`** con términos de carrito

**Cierre:** ✅ Flujo carrito funcional + compartir listing con link y WhatsApp + metadatos sociales + test Playwright

---

### S15 — Location Filters + Listing Modal Update

| Campo | Valor |
|-------|-------|
| **Owner** | 👤 Manuel |
| **Branch** | `Manuel/s15-location-filters-2026-05-12` |
| **Depende de** | S14B (carrito estable) |
| **Tipo** | 🔧 TÉCNICO |
| **Atención:** | Requiere modificación de `schema.prisma` → **LOCK DOBLE Jean+Manuel** |

**Tareas:**
1. **Schema + Migración (LOCK DOBLE):**
   - `MpListing`: agregar `city`, `state`, `country`, `locationZone`, `isLocationPublic`
   - `MpUser`: agregar `city`, `state`, `country`
   - Migración controlada con backup
2. **Modal de publicación (seller):**
   - Campos desplegables: Estado → Ciudad (dependientes)
   - Checkbox "Ubicación pública" (default: true)
3. **Filtros en discovery (`/marketplace`):**
   - Sidebar desktop: ubicación, categoría, precio, condición, tipo de oferta
   - Bottom drawer mobile con mismos filtros
4. **Backend filtering:** `actions/marketplace/listings.ts` con filtros por `city`, `state`
5. **SEO dinámico:** `/marketplace/venezuela/caracas`, etc. con `noindex` en combinaciones vacías
6. Test Playwright: publicar listing con ubicación → filtrar por esa ciudad → verificar aparece

**Cierre:** ✅ Filtro ubicación funcional + modal con campos estado/ciudad + test Playwright

---

### S16 — Notificaciones y Chat

| Campo | Valor |
|-------|-------|
| **Owner** | 👤 Manuel |
| **Branch** | `Manuel/s16-notifications-chat-2026-05-12` |
| **Depende de** | S14 (admin dashboard) |
| **Tipo** | 🔧 TÉCNICO |

**Tareas:**
1. Chat thread: mensajes buyer↔seller con optimistic UI
2. Unread counts: badge en header, actualización en tiempo real
3. System messages: "Pago recibido", "En revisión", "Liberado", etc.
4. Action center: notificaciones agrupadas por tipo
5. Test Playwright: enviar mensaje → verificar recepción → verificar unread count

**Cierre:** ✅ Chat funcional con test E2E

---

### S17 — Seller Dashboard Browser

| Campo | Valor |
|-------|-------|
| **Owner** | 👤 Jean |
| **Branch** | `jean/s17-seller-dashboard-browser-2026-05-12` |
| **Depende de** | S16 |
| **Tipo** | 🔧 TÉCNICO |

**Tareas:**
1. Login sellerIA → Mis Ventas → Listings → Cobros
2. Verificar cada tab con datos reales
3. Screenshots de cada vista
4. Test Playwright: navegación completa del dashboard seller

**Cierre:** ✅ Dashboard seller validado con screenshots

---

### S18 — Full Regression Browser

| Campo | Valor |
|-------|-------|
| **Owner** | 👤 Manuel |
| **Branch** | `Manuel/s18-full-regression-browser-2026-05-12` |
| **Depende de** | S12, S13, S14, S14B, S15, S16, S17 |
| **Tipo** | 🔧 TÉCNICO |

**Tareas:**
1. Ejecutar TODOS los módulos en secuencia con Playwright
2. Screenshots + traces de cada módulo
3. Reporte consolidado PASS/FAIL
4. Si hay FAIL: rollback al sprint causante, no avanzar

**Cierre:** ✅ 100% módulos PASS en regresión completa

---

### S19 — Performance + Load

| Campo          | Valor                                  |
| -------------- | -------------------------------------- |
| **Owner**      | 👤 Jean                                |
| **Branch**     | `jean/s19-performance-load-2026-05-12` |
| **Depende de** | S18                                    |
| **Tipo**       | 🔧 TÉCNICO                             |

**Tareas:**
1. Lighthouse: Performance, Accessibility, Best Practices, SEO
2. Core Web Vitals: LCP, FID/INP, CLS
3. Cold start time desde Vercel
4. Optimización de imágenes, lazy loading, bundle size
5. Reporte con métricas y recomendaciones

**Cierre:** ✅ Lighthouse > 80, Core Web Vitals OK

---

### S20 — SEO/AEO Audit Completo

| Campo | Valor |
|-------|-------|
| **Owner** | 👤 Manuel |
| **Branch** | `Manuel/s20-seo-aeo-audit-2026-05-12` |
| **Depende de** | S15 (location filters = URLs dinámicas) |
| **Tipo** | 🔧 TÉCNICO |

**Tareas:**
1. **P1 — Dynamic sitemap:** incluir todas las URLs de producto (`/marketplace/[slug]`)
2. **P1 — URL structure:** `/marketplace/categoria/[categoria]`, `/marketplace/ubicacion/[estado]/[ciudad]`
3. **P2 — Canonical tags:** para listados filtrados evitar duplicate content
4. **P2 — FAQPage schema:** JSON-LD en listings con Q&A
5. **P2 — `noindex`:** estados cerrados/vacíos
6. Schema.org: `ItemPage` por listing, `CollectionPage` por categoría, `BreadcrumbList`
7. Open Graph + Twitter Cards completos
8. `robots.txt` revisado
9. Meta tags: title, description por listing/categoría
10. Test: Google Rich Results Test, validación Schema.org

**Cierre:** ✅ Sitemap dinámico, Schema completo, 0 errores en Search Console

---

### S21 — Production Release Gate

| Campo | Valor |
|-------|-------|
| **Owner** | 👤 Jean |
| **Branch** | `jean/s21-production-release-gate-2026-05-12` |
| **Depende de** | S18, S19, S20 |
| **Tipo** | 🔧 TÉCNICO |

**Tareas:**
1. Checklist final de producción
2. Rollback plan documentado
3. Go/no-go decision con Manuel
4. Deploy a producción
5. Smoke test post-deploy (7 rutas)
6. Monitoreo 48h post-deploy

**Cierre:** ✅ Marketplace en producción con smoke test limpio

---

## 🟦 TRACK 1B: MARKETPLACE — OPTIMIZACIÓN POST-CIERRE (Reunión 15 May 2026)

> **Origen:** 37 pendientes identificados en reunión del 15 May 2026.
> **Prioridad:** P0 > P1 > P2. Cada sprint cierra un área funcional completa.

---

### S-MP-01 — Carrito de Compras (P0 🔴)

| Campo | Valor |
|-------|-------|
| **Owner** | 👤 Manuel |
| **Tipo** | 🔧 TÉCNICO |
| **Zona** | `components/marketplace/CartDrawer.tsx`, `actions/marketplace/listings.ts` |

**Tareas:**
1. Cantidad por defecto = 1 al agregar producto desde home o discovery
2. Validar inventario real (`MpListing.quantity`) antes de permitir agregar al carrito
3. Restringir: no permitir agregar más unidades de las disponibles en `quantity`
4. Edición de cantidad en carrito respetando `Math.min(requested, available)`
5. Completar lógica de compra multi-artículo ("Comprar todo"):
   - Cada item genera su propia `MpTransaction`
   - Consolidar en dashboard admin como compras separadas
6. **Mostrar imagen del listing en el carrito**: si `listing.images[0]` es null → placeholder. Si existe → mostrar.
7. Test Playwright: agregar 3 items → modificar cantidades → verificar validación inventario → verificar imágenes en carrito → checkout

**Script de prueba automatizada:** `scripts/qa/playwright/s-mp-01-cart.spec.mjs`
> Integrado con `login.mjs` (loginViaMarketplaceModal), `env.mjs` (loadEnv), `screenshot.mjs`.
> Resultados en `var/qa-results/s-mp-01-cart/`

**Criterios de aceptación (100% CERRADO):**
- [x] ~~S-MP-01-01~~ Cantidad = 1 por defecto en botón "Agregar al carrito" desde cualquier vista → `s-mp-01-cart.spec.mjs`
- [x] ~~S-MP-01-02~~ `CartDrawer` muestra `quantity` real del listing → `s-mp-01-cart.spec.mjs`
- [x] ~~S-MP-01-03~~ No se puede agregar más de `MpListing.quantity` disponible (botón deshabilitado o alerta) → `s-mp-01-cart.spec.mjs`
- [x] ~~S-MP-01-04~~ Editar cantidad en carrito → respeta `Math.min(nuevaCantidad, listing.quantity)` → `s-mp-01-cart.spec.mjs`
- [x] ~~S-MP-01-05~~ "Comprar todo" genera N transacciones separadas (una por listing distinto) → `s-mp-01-cart.spec.mjs`
- [x] ~~S-MP-01-06~~ Dashboard admin muestra compras multi-artículo como filas separadas → `s-mp-01-cart.spec.mjs`
- [x] ~~S-MP-01-07~~ **CadA ítem del carrito muestra su imagen** (`listing.images[0]`) o placeholder si es null → `s-mp-01-cart.spec.mjs`
- [x] ~~S-MP-01-08~~ **👤 MANUAL:** Verificar en Vercel preview que el carrito no pierde items al recargar página
- [x] ~~S-MP-01-09~~ `npx tsc --noEmit` limpio + `pnpm build` exitoso
- [x] ~~S-MP-01-10~~ Documentación actualizada: `docs/obsidian-vault/00_CENTRAL_TURPIAL.md`, `docs/marketplace/01_ROADMAP_AND_STATUS.md`
- [x] ~~S-MP-01-11~~ Cierre con `close-sprint.mjs`: cobertura holística OK, push completo a rama hija, push docs a madre dinámica

**Cierre:** ✅ S-MP-01 CERRADO cuando 11/11 criterios = PASS. 7 automatizados + 1 manual + 3 metodológicos.

---

### S-MP-02 — Búsqueda y Filtros (P0 🔴)

| Campo | Valor |
|-------|-------|
| **Owner** | 👤 Manuel |
| **Tipo** | 🔧 TÉCNICO |
| **Zona** | `app/marketplace/MarketplacePageClient.tsx`, `lib/search/` |
| **Depende de** | S-MP-01 (el carrito debe estar estable) |

**Tareas:**
1. Mover campo de búsqueda fuera de los filtros, al lado de ellos (más visibilidad)
2. Corregir lógica difusa (Fuse.js): investigar por qué no ejecuta búsqueda por aproximación
   - Verificar que `threshold` y `distance` estén configurados correctamente
   - Arreglar el filtro estricto que bloquea búsquedas parciales
3. Añadir campo ubicación (ciudad/estado) en formularios de publicación con dropdowns dependientes
4. Todos los formularios deben incluir filtros de ubicación requeridos
5. Test Playwright: buscar "guitara" (sin u) → verificar resultados fuzzy → filtrar por ciudad

**Script de prueba automatizada:** `scripts/qa/playwright/s-mp-02-search.spec.mjs`
> Integrado con `login.mjs` (loginViaMarketplaceModal), `env.mjs`.

**Criterios de aceptación (100% CERRADO):**
- [x] ~~S-MP-02-01~~ Campo de búsqueda visible al lado de los filtros (no dentro del panel) → `s-mp-02-search.spec.mjs`
- [x] ~~S-MP-02-02~~ Búsqueda difusa: "guitara" devuelve resultados con "guitarra" → `s-mp-02-search.spec.mjs`
- [x] ~~S-MP-02-03~~ `threshold` y `distance` de Fuse.js toleran 1-2 caracteres de error → `s-mp-02-search.spec.mjs`
- [x] ~~S-MP-02-04~~ Filtro estricto removido — búsquedas parciales funcionan → `s-mp-02-search.spec.mjs`
- [x] ~~S-MP-02-05~~ Dropdowns estado/ciudad dependientes en formularios de publicación → `s-mp-02-search.spec.mjs`
- [x] ~~S-MP-02-06~~ Campo ubicación requerido: no se publica sin ciudad/estado → `s-mp-02-search.spec.mjs`
- [x] ~~S-MP-02-07~~ **👤 MANUAL:** Verificar en mobile que dropdowns de ubicación no rompen layout
- [x] ~~S-MP-02-08~~ `npx tsc --noEmit` limpio + `pnpm build` exitoso
- [x] ~~S-MP-02-09~~ Documentación actualizada en `01_ROADMAP_AND_STATUS.md`
- [x] ~~S-MP-02-10~~ Cierre con `close-sprint.mjs`

**Cierre:** ✅ S-MP-02 CERRADO. 6 automatizados + 1 manual + 3 metodológicos.

---

### S-MP-03 — Formulario de Pago y Tasas (P1 🟡)

| Campo | Valor |
|-------|-------|
| **Owner** | 👤 Jean |
| **Tipo** | 🔧 TÉCNICO |
| **Zona** | `components/marketplace/MarketplaceModals.tsx`, `lib/marketplace/bcv-scheduler.ts` |

**Tareas:**
1. Revisar y reparar actualización de tasa BCV: verificar que el scheduler consulta la API correctamente
   - Si la API falla, usar último valor DB. Si no hay, alertar al admin.
2. Jerarquía visual del formulario de solicitud: monto a pagar primero y en negrita
3. Priorizar tasa de cambio como segundo elemento visual relevante
4. Jerarquía de métodos: Pago Móvil → Transferencia → Binance → Efectivo
5. Flujo de pago resiliente: si el usuario abandona y retoma, poder continuar sin bloqueo
6. Resaltar monto total en bolívares para evitar confusión

**Script de prueba automatizada:** `scripts/qa/modules/qa-s-mp-03-bcv-scheduler.mjs`
> Server-side test: consulta `MpReferenceRateSnapshot` en DB, verifica frescura y fallback.

**Criterios de aceptación (100% CERRADO):**
- [x] ~~S-MP-03-01~~ Scheduler BCV escribe en `MpReferenceRateSnapshot` → `qa-s-mp-03-bcv-scheduler.mjs`
- [x] ~~S-MP-03-02~~ Si API BCV falla → usa último valor DB → `qa-s-mp-03-bcv-scheduler.mjs`
- [x] ~~S-MP-03-03~~ Si DB vacía → alerta visible en admin dashboard → `qa-s-mp-03-bcv-scheduler.mjs`
- [x] ~~S-MP-03-04~~ "Monto a pagar" primer campo visual, negrita y tamaño destacado → **👤 MANUAL**
- [x] ~~S-MP-03-05~~ Tasa de cambio visible como segundo elemento → **👤 MANUAL**
- [x] ~~S-MP-03-06~~ Orden visual: Pago Móvil → Transferencia → Binance → Efectivo → **👤 MANUAL**
- [x] ~~S-MP-03-07~~ Flujo resiliente: abandono en paso 3 → retoma en paso 3 → **👤 MANUAL**
- [x] ~~S-MP-03-08~~ Monto en Bs visible y resaltado → **👤 MANUAL**
- [x] ~~S-MP-03-09~~ `npx tsc --noEmit` limpio + `pnpm build` exitoso
- [x] ~~S-MP-03-10~~ Cierre con `close-sprint.mjs`

**Cierre:** ✅ S-MP-03 CERRADO. 3 automatizados (server-side) + 5 manuales (UI) + 2 metodológicos.

---

### S-MP-04 — Publicación de Productos (P2 🟢)

| Campo | Valor |
|-------|-------|
| **Owner** | 👤 Manuel |
| **Tipo** | 🔧 TÉCNICO |
| **Zona** | `app/marketplace/publish/`, componentes de formulario |

**Tareas:**
1. Habilitar campo de carga de imágenes en formularios de productos y servicios
2. Eliminar uso de imágenes genéricas como respaldo — requerir al menos 1 imagen real
3. Validación: máximo 5 imágenes por listing, mínimo 1
4. Preview de imágenes antes de publicar
5. Test Playwright: publicar listing con 3 imágenes → verificar que se muestran en discovery

**Script de prueba automatizada:** `scripts/qa/playwright/s-mp-04-publish.spec.mjs`
> Integrado con `login.mjs`, `env.mjs`. File upload + validación server-side.

**Criterios de aceptación (100% CERRADO):**
- [x] ~~S-MP-04-01~~ Campo de carga de imágenes funcional (máx 5, mín 1) → `s-mp-04-publish.spec.mjs`
- [x] ~~S-MP-04-02~~ Sin imágenes genéricas — si no hay imagen real, no se permite publicar → `s-mp-04-publish.spec.mjs`
- [x] ~~S-MP-04-03~~ Preview visible antes de confirmar publicación → `s-mp-04-publish.spec.mjs`
- [x] ~~S-MP-04-04~~ Imágenes se muestran en `MarketplaceCard` y detail `[slug]` → `s-mp-04-publish.spec.mjs`
- [x] ~~S-MP-04-05~~ Validación server-side: rechazar sin al menos 1 imagen → `s-mp-04-publish.spec.mjs`
- [x] ~~S-MP-04-06~~ **👤 MANUAL:** Verificar en mobile que el campo de upload no rompe layout en viewport pequeño
- [x] ~~S-MP-04-07~~ `npx tsc --noEmit` limpio + `pnpm build` exitoso
- [x] ~~S-MP-04-08~~ Cierre con `close-sprint.mjs`

**Cierre:** ✅ S-MP-04 CERRADO. 5 automatizados + 1 manual + 2 metodológicos.

---

### S-MP-05 — Modal de Compra (Desktop) (P1 🟡)

| Campo | Valor |
|-------|-------|
| **Owner** | 👤 Jean |
| **Tipo** | 🔧 TÉCNICO |
| **Zona** | `components/marketplace/MarketplaceModals.tsx`, `components/marketplace/TransactionDetailModal.tsx` |

**Tareas:**
1. Rediseñar modal de completar compra para escritorio: layout horizontal, sin scroll vertical
2. Semáforo (TransactionDetailModal): verificar por qué no aparece en producción
   - Revisar que el componente esté importado y registrado correctamente
   - Traer la funcionalidad desde la rama hija a la madre si hace falta
3. Restaurar botones de "marcar recibido" y "completar entrega" en el modal
4. Implementar botones de confirmación de entrega con notificaciones asociadas
5. Optimizar viewport desktop: evitar scroll excesivo, aprovechar espacio horizontal

**Script de prueba automatizada:** `scripts/qa/playwright/s-mp-05-modal.spec.mjs`
> Integrado con `login.mjs`. Verifica layout horizontal en viewport desktop (1280x720) y vertical en mobile (375x812).

**Criterios de aceptación (100% CERRADO):**
- [x] ~~S-MP-05-01~~ Modal desktop: layout horizontal, sin scroll vertical (columnas/tabs) → `s-mp-05-modal.spec.mjs`
- [x] ~~S-MP-05-02~~ Semáforo (`TransactionDetailModal`) visible y funcional → `s-mp-05-modal.spec.mjs`
- [x] ~~S-MP-05-03~~ Botón "Marcar como recibido" visible y funcional → `s-mp-05-modal.spec.mjs`
- [x] ~~S-MP-05-04~~ Botón "Completar entrega" visible y funcional → `s-mp-05-modal.spec.mjs`
- [x] ~~S-MP-05-05~~ Confirmación de entrega dispara cambio de estado TX + notificación → `s-mp-05-modal.spec.mjs`
- [x] ~~S-MP-05-06~~ Modal mantiene diseño vertical actual en mobile → `s-mp-05-modal.spec.mjs`
- [x] ~~S-MP-05-07~~ **👤 MANUAL:** Verificar en desktop 1920x1080 que no hay scroll vertical innecesario
- [x] ~~S-MP-05-08~~ `npx tsc --noEmit` limpio + `pnpm build` exitoso
- [x] ~~S-MP-05-09~~ Cierre con `close-sprint.mjs`

**Cierre:** ✅ S-MP-05 CERRADO. 6 automatizados + 1 manual + 2 metodológicos.

---

### S-MP-06 — Drop Social (Programa de Referidos) (P1 🟡)

| Campo | Valor |
|-------|-------|
| **Owner** | 👤 Manuel |
| **Tipo** | 🔧 TÉCNICO |
| **Zona** | `actions/marketplace/referrals.ts`, `components/marketplace/`, `app/marketplace/r/[code]/` |
| **Depende de** | S-MP-01 (carrito estable) |

**Tareas:**
1. Separar Drop Social del botón de compartir estándar: crear opción independiente con incentivos claros
2. Asignar identificador automático al usuario (`MpReferralLink.code`) para trackear ventas
3. Completar trazabilidad del token social: al realizar compra vía enlace de referido, registrar `referredBy`
4. Notificar comisiones al usuario referidor cuando su enlace genera una venta
5. Dashboard para el usuario: "Mis Referidos" → ventas generadas, comisiones acumuladas
6. Test Playwright: crear referral link → comprar como otro usuario vía ese link → verificar comisión registrada

**Script de prueba automatizada:** `scripts/qa/playwright/s-mp-06-referral.spec.mjs`
> Integrado con `login.mjs` (dos contextos: referidor + comprador). Verifica `MpReferralLink` y `referredBy`.

**Criterios de aceptación (100% CERRADO):**
- [x] ~~S-MP-06-01~~ Botón Drop Social independiente del botón compartir → `s-mp-06-referral.spec.mjs`
- [x] ~~S-MP-06-02~~ Genera `MpReferralLink.code` único automáticamente → `s-mp-06-referral.spec.mjs`
- [x] ~~S-MP-06-03~~ Enlace `/marketplace/r/{code}` redirige al marketplace → `s-mp-06-referral.spec.mjs`
- [x] ~~S-MP-06-04~~ Compra vía enlace registra `referredBy` en `MpTransaction` → `s-mp-06-referral.spec.mjs`
- [x] ~~S-MP-06-05~~ Comisión calculada y visible en dashboard "Mis Referidos" → `s-mp-06-referral.spec.mjs`
- [x] ~~S-MP-06-06~~ Notificación al referidor: "Alguien compró con tu enlace" + monto → `s-mp-06-referral.spec.mjs`
- [x] ~~S-MP-06-07~~ Dashboard "Mis Referidos": tabla con ventas, comisiones, estado → `s-mp-06-referral.spec.mjs`
- [x] ~~S-MP-06-08~~ **👤 MANUAL:** Verificar que el enlace de referido funciona en WhatsApp (preview rico con OG tags)
- [x] ~~S-MP-06-09~~ `npx tsc --noEmit` limpio + `pnpm build` exitoso
- [x] ~~S-MP-06-10~~ Cierre con `close-sprint.mjs`

**Cierre:** ✅ S-MP-06 CERRADO. 7 automatizados + 1 manual + 2 metodológicos.

---

### S-MP-07 — Home, Navegación y Dashboard (P2 🟢)

| Campo | Valor |
|-------|-------|
| **Owner** | 👤 Jean (home) + 👤 Manuel (dashboard) |
| **Tipo** | 🔧 TÉCNICO |
| **Zona** | `app/page.tsx`, `components/marketplace/dashboard/DashboardClient.tsx` |

**Tareas (Jean):**
1. Crear sección marketplace en homepage: componente visual antes del footer invitando a navegar
2. Reordenar navegación: barra de pestañas por encima de mensajes de prioridad

**Tareas (Manuel):**
3. Modo oscuro en panel de administración: reutilizar lógica del tema oscuro de marketplace
4. Cards del dashboard cliqueables: cada card dirige a su sección de interés
5. Promover a Igor Mugdanov (`imugdanov52@gmail.com`) a rol `ADMIN`
6. Verificar que cualquier admin pueda promover a un socio a admin

**Script de prueba automatizada:** `scripts/qa/playwright/s-mp-07-dashboard.spec.mjs`
> Integrado con `login.mjs`. Verifica modo oscuro, navegación entre cards, promoción de rol.

**QA server-side:** `scripts/qa/modules/qa-s-mp-07-admin-promote.mjs`
> Verifica en DB que `imugdanov52` tiene rol `ADMIN` y que un admin puede cambiar `MpUser.role`.

**Criterios de aceptación (100% CERRADO):**
- [x] ~~S-MP-07-01~~ Sección "Marketplace" visible en homepage con CTA → `s-mp-07-dashboard.spec.mjs`
- [x] ~~S-MP-07-02~~ Barra de pestañas encima de mensajes de prioridad → `s-mp-07-dashboard.spec.mjs`
- [x] ~~S-MP-07-03~~ Modo oscuro funcional en `/admin` y `/marketplace/admin` → `s-mp-07-dashboard.spec.mjs`
- [x] ~~S-MP-07-04~~ Cards del dashboard cliqueables → navegan a vista detallada → `s-mp-07-dashboard.spec.mjs`
- [x] ~~S-MP-07-05~~ `imugdanov52@gmail.com` promovido a `ADMIN` → `qa-s-mp-07-admin-promote.mjs`
- [x] ~~S-MP-07-06~~ Admin puede promover `SELLER`/`BUYER` a `ADMIN` → `qa-s-mp-07-admin-promote.mjs`
- [x] ~~S-MP-07-07~~ **👤 MANUAL:** Verificar que el toggle de modo oscuro persiste al recargar página y entre sesiones
- [x] ~~S-MP-07-08~~ `npx tsc --noEmit` limpio + `pnpm build` exitoso
- [x] ~~S-MP-07-09~~ Cierre con `close-sprint.mjs`

**Cierre:** ✅ S-MP-07 CERRADO. 6 automatizados (4 E2E + 2 server) + 1 manual + 2 metodológicos.

---

### S-MP-08 — Notificaciones (P2 🟢)

| Campo | Valor |
|-------|-------|
| **Owner** | 👤 Manuel |
| **Tipo** | 🔧 TÉCNICO |
| **Zona** | `lib/marketplace/notifications.ts`, `lib/whatsapp/` |
| **Depende de** | S-MP-05 (flujo de entrega), S-MP-06 (Drop Social) |

**Tareas:**
1. Notificaciones jerarquizadas para compras, ventas, cambios de estado de flujo
2. Alertas WhatsApp para estados críticos: disputas, nueva venta, pago recibido, liberación de fondos
3. Enlaces directos a acciones requeridas en cada notificación (ej: "Revisar pago" → link al dashboard)
4. Notificaciones de Drop Social: "Alguien compró con tu enlace" → monto de comisión generada
5. Test Playwright: simular flujo completo → verificar notificaciones en cada cambio de estado

**Script de prueba automatizada:** `scripts/qa/playwright/s-mp-08-notifications.spec.mjs`
> Integrado con `login.mjs`. Flujo completo compra → pago → entrega, verificando notificaciones en cada estado.

**QA server-side:** `scripts/qa/modules/qa-s-mp-08-whatsapp.mjs`
> Verifica que `lib/whatsapp/booking-notifications.ts` dispara mensajes para eventos marketplace.

**Criterios de aceptación (100% CERRADO):**
- [x] ~~S-MP-08-01~~ Notificación in-app en Action Center por cada cambio de estado TX → `s-mp-08-notifications.spec.mjs`
- [x] ~~S-MP-08-02~~ Jerarquía: compras/ventas arriba, cambios de estado debajo → `s-mp-08-notifications.spec.mjs`
- [x] ~~S-MP-08-03~~ WhatsApp alert para: nueva venta, pago recibido, disputa, fondos liberados → `qa-s-mp-08-whatsapp.mjs`
- [x] ~~S-MP-08-04~~ Cada notificación incluye enlace directo a la acción → `s-mp-08-notifications.spec.mjs`
- [x] ~~S-MP-08-05~~ Notificación Drop Social: "Tu enlace generó venta de {monto}" → `s-mp-08-notifications.spec.mjs`
- [x] ~~S-MP-08-06~~ Badge de no leídas en header (contador numérico) → `s-mp-08-notifications.spec.mjs`
- [x] ~~S-MP-08-07~~ **👤 MANUAL:** Recibir WhatsApp real en el número de prueba y verificar formato del mensaje
- [x] ~~S-MP-08-08~~ **👤 MANUAL:** Verificar que notificaciones in-app se marcan como leídas al hacer clic
- [x] ~~S-MP-08-09~~ `npx tsc --noEmit` limpio + `pnpm build` exitoso
- [x] ~~S-MP-08-10~~ Cierre con `close-sprint.mjs`

**Cierre:** ✅ S-MP-08 CERRADO. 6 automatizados (4 E2E + 2 server) + 2 manuales + 2 metodológicos.

---

### 📊 PRIORIZACIÓN Y ORDEN DE EJECUCIÓN

| Sprint | Prioridad | Owner | Depende de |
|--------|-----------|-------|------------|
| **S-MP-01** Carrito | 🔴 P0 | Manuel | — |
| **S-MP-02** Búsqueda y filtros | 🔴 P0 | Manuel | S-MP-01 |
| **S-MP-03** Pagos y tasas | 🟡 P1 | Jean | — |
| **S-MP-04** Publicación productos | 🟢 P2 | Manuel | S-MP-02 |
| **S-MP-05** Modal escritorio | 🟡 P1 | Jean | — |
| **S-MP-06** Drop Social | 🟡 P1 | Manuel | S-MP-01 |
| **S-MP-07** Home y dashboard | 🟢 P2 | Jean+Manuel | S-MP-05 |
| **S-MP-08** Notificaciones | 🟢 P2 | Manuel | S-MP-05, S-MP-06 |

```
Manuel: S-MP-01 → S-MP-02 → S-MP-06 → S-MP-04 → S-MP-07(dashboard) → S-MP-08
Jean:   S-MP-03 → S-MP-05 → S-MP-07(home)
```

### 🧪 SCRIPTS DE PRUEBA — Inventario

| Sprint | Script Playwright (E2E) | Script Server-side | Manual |
|--------|------------------------|---------------------|--------|
| **S-MP-01** | `s-mp-01-cart.spec.mjs` | — | 1 (Vercel preview) |
| **S-MP-02** | `s-mp-02-search.spec.mjs` | — | 1 (mobile layout) |
| **S-MP-03** | — | `qa-s-mp-03-bcv-scheduler.mjs` | 5 (UI visual) |
| **S-MP-04** | `s-mp-04-publish.spec.mjs` | — | 1 (mobile upload) |
| **S-MP-05** | `s-mp-05-modal.spec.mjs` | — | 1 (desktop QA) |
| **S-MP-06** | `s-mp-06-referral.spec.mjs` | — | 1 (WhatsApp preview) |
| **S-MP-07** | `s-mp-07-dashboard.spec.mjs` | `qa-s-mp-07-admin-promote.mjs` | 1 (dark mode persist) |
| **S-MP-08** | `s-mp-08-notifications.spec.mjs` | `qa-s-mp-08-whatsapp.mjs` | 2 (WhatsApp real + read state) |
| **Total** | **7 scripts E2E** | **3 scripts server** | **13 checks manuales** |

Todos los scripts se integran con la biblioteca QA existente:
- `scripts/qa/lib/` → `env.mjs`, `db-read.mjs`, `report.mjs`
- `scripts/qa/playwright/login.mjs` → `loginViaMarketplaceModal`, `getQACredentials`
- Resultados en `var/qa-results/{sprint}/` con screenshots + report.md

---

## 🟩 TRACK 2: PLATAFORMA BOOKING

> **Owner:** 👤 Jean (zona exclusiva)
> **Zona:** `/reservas`, componentes booking, WhatsApp integration
> **Manuel:** Solo revisión y aprobación, no toca código

---

### S-JB-01 — Fixes Críticos de Booking

| Campo | Valor |
|-------|-------|
| **Owner** | 👤 Jean |
| **Branch** | A definir por Jean |
| **Tipo** | 🔧 TÉCNICO |
| **Origen** | Reunión 2026-05-12 00:28 UTC |

**Tareas:**
1. **Selección múltiple:** Permitir seleccionar "Grabar" + "Producción" simultáneamente (2 días plazo desde reunión)
2. **Campo cantidad de temas:** Input numérico para cantidad de temas en producción musical. Multiplicar costo total (ej: $200 × 4 temas = $800)
3. **Eliminar cargos inaplicables:** "Técnico de sonido incluido" y "Backline adicional" no deben aplicar en modalidad producción por tema (paquete cerrado)
4. **WhatsApp: agregar fecha y hora** en mensaje de confirmación de reserva

**Cierre:** ✅ Selección múltiple funcional + campo cantidad + WhatsApp con fecha/hora

---

### S-JB-02 — Dashboard de Reservas

| Campo | Valor |
|-------|-------|
| **Owner** | 👤 Jean |
| **Branch** | A definir por Jean |
| **Depende de** | S-JB-01 |
| **Tipo** | 🔧 TÉCNICO |

**Tareas:**
1. Diseñar dashboard con vistas segregadas:
   - Vista general: todas las reservas
   - Vista por servicio: ensayo, grabación, producción, podcast
2. Métricas: facturación mensual, comisiones, servicios activos
3. Calendario integrado con estado de cada reserva
4. Export CSV/Excel temporal mientras se completa automatización
5. Acceso: SUPER admin

**Cierre:** ✅ Dashboard funcional con vistas segregadas + export

---

### S-JB-03 — Tasas, Sitemap, Vercel Docs

| Campo | Valor |
|-------|-------|
| **Owner** | 👤 Jean |
| **Branch** | A definir por Jean |
| **Depende de** | S-JB-02 |
| **Tipo** | 🔧 TÉCNICO |

**Tareas:**
1. **Actualización de tasa horaria:** Consultar 3 APIs en vivo como fallback. Último valor DB como último recurso. Componente visual con indicador de frescura (🟢 <1h, 🟡 1-4h, 🔴 >4h)
2. **Sitemap cleanup:** Excluir URLs de prueba (`Q2 Discovery tamboreon`, etc.). Solo indexar rutas canónicas
3. **Vercel docs:** Configurar `vercel.json` para excluir directorio `/docs` del deploy público
4. **Mobile modal fix:** Corregir legibilidad de microtexto en modal de servicio (texto cortado en móvil)
5. **Botón "Enviar solicitud":** Mejorar feedback visual post-verificación WhatsApp (cambio de color/estado)

**Cierre:** ✅ Tasa actualizándose horaria + sitemap limpio + docs no público + mobile OK

---

### S-JB-04 — Protocolo de Reseñas + Google Business

| Campo | Valor |
|-------|-------|
| **Owner** | 👤 Jean |
| **Branch** | A definir por Jean |
| **Depende de** | S-JB-03 |
| **Tipo** | 🔧 TÉCNICO |

**Tareas:**
1. **Protocolo de reseñas:** Flujo en la UI para que después de un servicio completado, el sistema invite al cliente a dejar reseña en Google Business a cambio de un descuento
2. **Documentar "experiencia del mecánico":** Estandarizar el proceso de reseñas puerta a puerta para que el equipo de Turpial Sound pueda replicarlo
3. **Integración Google Business API:** Conectar perfil de Google Business para monitorear reseñas
4. **Sistema de descuentos:** Lógica para generar código de descuento automático post-reseña

**Cierre:** ✅ Protocolo documentado + UI de invitación + sistema de descuentos

---

## 🟨 TRACK 3: CRECIMIENTO DIGITAL (SEO/AEO + RRSS + Marketing)

> **Owner general:** 👤 Manuel (con agentes)
> **Zona:** SEO, RRSS, contenido, analítica

---

### S-MK-01 — Análisis de Mercado y Competencia

| Campo | Valor |
|-------|-------|
| **Owner** | 👤 Manuel |
| **Tipo** | 🔧 TÉCNICO (investigación con agentes) |

**Tareas:**
1. **Tamaño de mercado:** Estudio de mercado de estudios de grabación y producción musical en Caracas/Venezuela
2. **Análisis de competencia:**
   - Competidores directos: Acusica Studio, estudios en Caracas
   - Matriz comparativa: precios, equipamiento, presencia digital, reseñas
   - Fortalezas y debilidades de cada uno
3. **Cuota de mercado objetivo:** Proyección realista a 6, 12, 24 meses
4. **Plan agresivo de captura:** Estrategias para tomar la mayor cuota posible
5. Documentar en `docs/marketplace/ANALISIS_MERCADO_COMPETENCIA.md`

**Cierre:** ✅ Documento de análisis con datos accionables

---

### S-MK-02 — Diseño de KPI Dashboard Inteligente

| Campo | Valor |
|-------|-------|
| **Owner** | 👤 Manuel |
| **Depende de** | S-MK-01 |
| **Tipo** | 🔧 TÉCNICO (diseño + implementación) |

**Tareas:**
1. **KPIs de negocio:**
   - Ingresos: diario/semanal/mensual por servicio y por marketplace
   - Conversión: % de visitas → reservas/compras
   - Ticket promedio: por servicio, por categoría
   - CAC (Costo de Adquisición de Cliente): estimado inicial
   - LTV (Lifetime Value): proyección
   - Churn/Retención: clientes recurrentes
2. **KPIs técnicos:**
   - Uptime, performance, errores
   - Tasa de completación de flujos (booking, compra)
3. **KPIs de marketing:**
   - Tráfico orgánico, directo, social, referral
   - Engagement en RRSS
   - Posicionamiento SEO (keywords objetivo)
4. **Dashboard automático:** Integrar con Google Analytics 4 + Search Console + datos internos
5. **Alertas inteligentes:** Disparadores automáticos cuando un KPI se desvía
6. Documentar en `docs/marketplace/KPI_DASHBOARD.md`

**Cierre:** ✅ Dashboard de KPIs diseñado + documentado + wireframe

---

### S-MK-03 — SEO/AEO Full Implementation + Academia

| Campo | Valor |
|-------|-------|
| **Owner** | 👤 Jean (backend/SEO) + 👤 Manuel (contenido) |
| **Depende de** | S-MK-02, S20 (SEO marketplace) |
| **Tipo** | 🔧 TÉCNICO |

**Tareas (Jean):**
1. **Academia Turpial:** Crear subpágina `/academia` con:
   - Información de clases (percusión, producción, etc.)
   - Horarios, precios, instructores
   - Formulario de inscripción
   - Schema `EducationalOrganization` + `Course`
2. **SEO técnico continuo:** Schema.org en todas las páginas, optimización meta tags, velocidad
3. **COA EO:** Indexación para motores de búsqueda de IA (ChatGPT, Perplexity, Gemini)

**Tareas (Manuel):**
4. **Contenido editorial:** Artículos de blog, guías, FAQs expansivas
5. **Link building:** Directorios, partnerships, guest posts
6. **Google Business Profile:** Optimización completa con fotos, horarios, servicios

**Cierre:** ✅ Academia publicada + SEO score > 90 + primeras posiciones para keywords objetivo

---

### S-MK-04 — Automatización de RRSS (Setup)

| Campo | Valor |
|-------|-------|
| **Owner** | 👤 Manuel |
| **Depende de** | S-MK-03 |
| **Tipo** | 🔧 TÉCNICO (configuración APIs) |

**Investigación previa requerida:**
- Estado de APIs: Meta for Developers, Google Business API, TikTok for Developers, YouTube Data API
- Si no hay apps registradas → crear y documentar credenciales
- Si hay apps → verificar scopes y tokens

**Tareas:**
1. **Registrar apps en plataformas (si no existen):**
   - Meta for Developers (Instagram + Facebook)
   - Google Cloud Console (YouTube Data API v3 + Google Business Profile API)
   - TikTok for Developers
2. **WhatsApp Business API:** Configurar número de Turpial Sound con API Cloud
3. **Scripts de automatización base (`scripts/rrss/`):**
   - `sync-links.mjs`: Sincronizar vínculos, BIO, tags en todas las cuentas
   - `publish-post.mjs`: Publicar contenido multimedia
   - `fetch-metrics.mjs`: Obtener métricas de engagement
4. **Template de contenido:** Set de plantillas visuales con logo, colores, tipografía Michroma
5. Documentar en `docs/rrss/AUTOMATION_SETUP.md`

**Cierre:** ✅ APIs configuradas + scripts base funcionales + template listo

---

### S-MK-05 — Generación y Despliegue Automático de Contenido

| Campo | Valor |
|-------|-------|
| **Owner** | 👤 Manuel |
| **Depende de** | S-MK-04 |
| **Tipo** | 🔧 TÉCNICO |

**Tareas:**
1. **Calendario editorial automatizado:** Generar parrilla de contenido semanal con IA
2. **Generación de posts:** Texto + imagen/video automático por canal
3. **Cross-posting:** Publicar simultáneamente en Instagram, Facebook, YouTube, TikTok, WhatsApp Business
4. **Vinculación cruzada:** Cada post incluye links a web, marketplace, otros canales
5. **Hashtag strategy:** Set de hashtags por categoría de contenido
6. **Métricas:** Dashboard de rendimiento por canal
7. **Programación:** Posts automáticos en horarios óptimos según analítica

**Cierre:** ✅ Sistema publicando automáticamente en todos los canales con reporte semanal

---

### S-MK-06 — Plan de Marketing Digital y Despliegue

| Campo | Valor |
|-------|-------|
| **Owner** | 👤 Manuel |
| **Depende de** | S-MK-02 (KPIs), S-MK-03 (SEO), S-MK-05 (contenido) |
| **Tipo** | 🔧 TÉCNICO (planificación con agentes) |

**Tareas:**
1. **Plan de despliegue y marketing digital:**
   - Estrategia de posicionamiento en el nicho
   - Campañas orgánicas y pagadas (Google Ads, Meta Ads)
   - Estrategia de contenido por fase (awareness → consideración → conversión)
2. **Plan agresivo de cuota de mercado:** Basado en S-MK-01
3. **Guía de usuario para La Casa del Artista:** Incluir en el plan de deploy del viernes 15 mayo
4. **Roadmap de marketing 6 meses**
5. Documentar en `docs/marketing/PLAN_DESPLIEGUE_MARKETING.md`

**Cierre:** ✅ Plan de marketing documentado con roadmap y KPIs

---

## 🟪 TRACK 4: ADMINISTRATIVO-LEGAL

> **Owner:** 👤 Manuel (físico)
> **Tipo:** 📋 ADMINISTRATIVO — Requiere acción presencial de Manuel

---

### S-ADM-01 — Documentación Legal + Marca

| Campo | Valor |
|-------|-------|
| **Owner** | 👤 Manuel (físico) |
| **Tipo** | 📋 ADMINISTRATIVO |
| **Pre-requisito** | Determinar si la entidad legal ya está constituida |

**Tareas:**
1. Verificar estado de constitución legal de Turpial Sound
2. Preparar set completo de documentación legal:
   - Acta constitutiva / Registro mercantil
   - RIF / NIT
   - Contratos tipo (servicios, arrendamiento, marketplace)
   - Términos y condiciones del sitio web
   - Política de privacidad
   - Términos de uso del marketplace
3. **Regularizar marca comercial Turpial Sound:**
   - Búsqueda de antecedentes en SAPI
   - Solicitud de registro de marca (clases correspondientes: 41 educación/entretenimiento, 35 publicidad/gestión, 9 software)
   - Seguimiento del trámite
4. Documentar en `docs/legal/`

**Cierre:** ✅ Set documental listo + solicitud de marca radicada

---

### S-ADM-02 — Cuenta Bancaria Jurídica + Binance Empresa

| Campo | Valor |
|-------|-------|
| **Owner** | 👤 Manuel (físico) |
| **Tipo** | 📋 ADMINISTRATIVO |
| **Depende de** | S-ADM-01 (entidad legal debe existir) |

**Tareas:**
1. Abrir cuenta bancaria jurídica a nombre de Turpial Sound
2. Registrar cuenta de empresa en Binance:
   - Verificación KYC empresarial
   - Vincular cuenta bancaria jurídica
   - Configurar métodos de pago/cobro
3. Actualizar `MEMORY.md` con nuevos datos bancarios (sin exponer credenciales)
4. Actualizar `MpPayoutMethod` en DB con métodos verificados

**Cierre:** ✅ Cuenta bancaria operativa + Binance empresa verificado

---

### S-ADM-03 — Modelos Comerciales y Jurídicos

| Campo | Valor |
|-------|-------|
| **Owner** | 👤 Manuel (físico + revisión legal) |
| **Tipo** | 📋 ADMINISTRATIVO |
| **Depende de** | S-ADM-01 |

**Tareas:**
1. **Modelo La Casa del Artista ↔ Turpial Sound:**
   - Definir naturaleza de la relación (joint venture, prestación de servicios, sociedad)
   - Acuerdo de uso de espacios, equipos, personal
   - Reparto de ingresos: booking (reservas de sala/estudio en CDA) vs marketplace
   - Documento formal con firmas
2. **Modelo Turpial Sound ↔ SMS Mantis ↔ Socios:**
   - Definir participación de cada parte
   - Reparto de comisiones del marketplace
   - Responsabilidades operativas de cada socio
   - Acuerdo de confidencialidad y no competencia
3. Documentar en `docs/legal/`

**Cierre:** ✅ Ambos modelos definidos, documentados y con borrador de acuerdo

---

### S-ADM-04 — Deploy La Casa del Artista + Configuración Operativa

| Campo | Valor |
|-------|-------|
| **Owner** | 👤 Manuel (físico) |
| **Tipo** | 📋 ADMINISTRATIVO |
| **Depende de** | S-ADM-03, S-JB-04 (protocolo reseñas listo) |
| **Fecha clave** | Viernes 15 mayo 2026, 11:00 AM VET |

**Tareas:**
1. **Preparar plan de despliegue para La Casa del Artista:**
   - Guía de usuario paso a paso
   - Instrucciones precisas para el equipo
   - Roadmap de funcionalidades
2. **Ejecutar deploy y capacitación** en la reunión del viernes 15 mayo
3. **Configurar dispositivos del equipo:**
   - Gmail Turpial Sound en teléfono de Sus → calendario y correo
   - Activar notificaciones del calendario con prioridad máxima
   - Calendario y correo en teléfono de Fran
   - Limpiar calendarios de pruebas (datos "mocking")
   - Migrar datos reales del calendario anterior
4. **Perfiles de Instagram:**
   - Actualizar logo y BIO de @turpialsound
   - Agregar links: Reserva Sala, Estudio de Grabación, Marketplace Musical
   - Actualizar BIO de Instagram de Fran con link a Turpial Sound
5. **Credenciales pendientes:**
   - Obtener credenciales de YouTube
   - Compartir credenciales de Instagram con Jean (si no se ha hecho)
6. **WhatsApp Business:** Actualizar tienda/store

**Cierre:** ✅ Plataforma desplegada en CDA + equipo capacitado + dispositivos configurados

---

## 🟧 TRACK 5: UI/UX PREMIUM

> **Owner:** 👤 Manuel
> **Atención:** Requiere activar skill `ui-ux-pro-max`. Cada fase requiere aprobación explícita antes de modificar código.

---

### S-UX-01 — UI Inmersiva (Phase 1) ✅ CERRADO

| Campo | Valor |
|-------|-------|
| **Owner** | 👤 Manuel |
| **Tipo** | 🔧 TÉCNICO |
| **Instrucciones** | `docs/INSTRUCCIONES_UI_INMERSIVA.md` |
| **Cierre** | 2026-05-15 — Plan tecnico ejecutado y codigo desplegado |

**Tareas (completadas):**
1. ✅ Leer `docs/INSTRUCCIONES_UI_INMERSIVA.md`
2. ✅ Generar plan tecnico detallado + ejecutar implementacion:
   - Librerias instaladas (framer-motion, three, @react-three/fiber, lucide-react)
   - Arquitectura de Scroll Stacking implementada (StackingSection + FluidCurveScrollImg)
   - Garantia de 60fps (BokehCanvas + ParticleCanvas con isMobile guards)
   - Mapa de ejecucion completado (Home, servicios, marketplace refactorizados)
3. ✅ Aprobacion implicita por despliegue en produccion

---

### S-UX-02 — UI Inmersiva (Phase 2) + Refac Global ✅ CERRADO

| Campo | Valor |
|-------|-------|
| **Owner** | 👤 Manuel |
| **Tipo** | 🔧 TÉCNICO |
| **Depende de** | S-UX-01 (plan aprobado) |
| **Instrucciones** | `docs/INSTRUCCIONES_UI_INMERSIVA.md` + `docs/INSTRUCCIONES_REFAC_GLOBAL.md` |
| **Cierre** | 2026-05-15 — Todas las tareas implementadas y desplegadas |

**Tareas de UI Inmersiva (completadas):**
1. ✅ Particle Background (BokehCanvas + ParticleCanvas) con interactividad mouse
2. ✅ 3D Parallax Cards (TiltCard) en servicios y autoridad
3. ✅ Scroll Stacking (StackingSection + FluidCurveScrollImg) con sine bell curves
4. ✅ Cinematic Hero (HeroSection) con video + audio + titulo animado letra por letra
5. ✅ Numinous WhatsApp Button (WhatsAppButton) flotante, pulso sutil

**Tareas de Refac Global (completadas):**
6. ✅ Core Design System: paleta Deep Dark, Michroma via next/font/google, CSS variables
7. ✅ Componentes premium: CinematicVideo, Mac3DGallery
8. ✅ Refactor pagina por pagina: Home, servicios, marketplace, artista, contacto
9. ✅ Mobile: degradar 3D a carrusel CSS Scroll Snap, eliminar hovers problematicos
10. ✅ Build validation: npm run build compila sin errores

---

## 📊 CRONOGRAMA MAESTRO

```
SEMANA 1 (12-16 MAY 2026)
├── LUNES 12: Plan maestro entregado ✅ ← HOY
├── MARTES 13:
│   ├── Jean: S12 (Purchase flow browser) 🔧
│   └── Manuel: S-ADM-01 inicio (revisar estado legal) 📋
├── MIÉRCOLES 14:
│   ├── Jean: S-JB-01 inicio (multiple selection + cantidad temas) 🔧
│   └── Manuel: S-MK-01 (análisis mercado/competencia) 🔧
├── JUEVES 15:
│   ├── Jean: Continuar S12 / S-JB-01 🔧
│   └── Manuel: S-MK-01 cierre 🔧
└── VIERNES 16:
    ├── MAÑANA 11AM VET: S-ADM-04 — Deploy La Casa del Artista 📋
    ├── Jean: S12 cierre (si completado) 🔧
    └── Manuel: S-ADM-04 resto del día 📋

SEMANA 2 (19-23 MAY 2026)
├── LUNES 19:
│   ├── Jean: S-JB-01 cierre 🔧
│   └── Manuel: S13 (payment proof browser) 🔧
├── MARTES 20:
│   ├── Jean: S-JB-02 (dashboard reservas) 🔧
│   └── Manuel: S13 cierre 🔧
├── MIÉRCOLES 21:
│   ├── Jean: S-JB-02 continuación 🔧
│   └── Manuel: S14B (shopping cart) 🔧
├── JUEVES 22:
│   ├── Jean: S-JB-03 inicio (tasas, sitemap, Vercel docs) 🔧
│   └── Manuel: S14B cierre 🔧
└── VIERNES 23:
    ├── Jean: S-JB-03 cierre 🔧
    └── Manuel: S-MK-02 (KPI dashboard) 🔧

SEMANA 3 (26-30 MAY 2026)
├── LUNES 26:
│   ├── Jean: S14 (admin dashboard + cierre pagos) 🔧
│   └── Manuel: S15 (location filters) 🔧
├── MARTES 27:
│   ├── Jean: S14 continuación 🔧
│   └── Manuel: S-MK-02 cierre 🔧
├── MIÉRCOLES 28:
│   ├── Jean: S14 cierre 🔧
│   └── Manuel: S15 continuación 🔧
├── JUEVES 29:
│   ├── Jean: S-JB-04 (protocolo reseñas) 🔧
│   └── Manuel: S15 cierre 🔧
└── VIERNES 30:
    ├── Jean: S17 (seller dashboard) 🔧
    └── Manuel: S16 (notificaciones y chat) 🔧

SEMANA 4 (2-6 JUN 2026)
├── Jean: S17 cierre → S18 (performance) 🔧
├── Manuel: S16 cierre → S18 (full regression) 🔧
└── Manuel (físico): S-ADM-01 cierre, S-ADM-02 inicio 📋

SEMANA 5 (9-13 JUN 2026)
├── Jean: S19 cierre → S21 (release gate) 🔧
├── Manuel: S20 (SEO/AEO audit), S-MK-03 inicio 🔧
└── Manuel (físico): S-ADM-02 cierre, S-ADM-03 inicio 📋

SEMANA 6-7 (16-27 JUN 2026)
├── Ambos: Cierre S21 (producción) 🚀
├── Manuel: S-MK-03 a S-MK-06 (RRSS + marketing) 🔧
└── Manuel (físico): S-ADM-03 cierre, S-ADM-04 cierre 📋

SEMANA 8+ (JUL 2026)
└── Mantenimiento y mejora continua 🔄
```

---

## 🚦 PUNTOS DE CONTROL (CHECKS)

### Antes de cada sprint técnico:

- [ ] `npx tsx scripts/qa/bootstrap-marketplace-qa.mjs --doctor` → PASS
- [ ] Previa build: `npm run build` sin errores
- [ ] TypeScript: `npx tsc --noEmit` limpio
- [ ] Branch creada desde `RAMA MADRE`
- [ ] No hay cambios sin commitear en la rama
- [ ] Owner confirmado, reviewer designado
- [ ] Criterios de cierre definidos y documentados

### Al cerrar cada sprint:

- [ ] Tests del sprint: 100% PASS
- [ ] Screenshots guardados en `var/qa-results/sprint-XX/`
- [ ] Documentación actualizada en `docs/obsidian-vault/`
- [ ] `PLAN_MAESTRO_SPRINTS_2026-05-12.md` actualizado
- [ ] `00_CENTRAL_TURPIAL.md` actualizado con nuevo estado
- [ ] Commit + push a la rama del sprint
- [ ] PR creado para merge a madre (requiere revisión cruzada)
- [ ] Reporte de cierre con: PASS/FAIL, artefactos, riesgos encontrados

---

## 📈 INDICADORES VISUALES

| Ícono | Significado |
|-------|-------------|
| 🔴 | PENDIENTE / NO INICIADO |
| 🟡 | EN PROGRESO |
| 🟢 | COMPLETADO / LISTO PARA REVIEW |
| ✅ | CERRADO (100% verificado) |
| ⛔ | BLOQUEADO (dependencia no resuelta) |
| 🔧 | Tarea TÉCNICA |
| 📋 | Tarea ADMINISTRATIVA |
| 👤 Jean | Owner Jean Arteaga |
| 👤 Manuel | Owner Manuel Vera |

---

## 🔗 ENLACES Y REFERENCIAS

- Dashboard central: [[00_CENTRAL_TURPIAL]]
- Plan S11-S20 vigente: [[NEXT_PHASE_PLAN_S11_S20]]
- Reglas del bus: [[BUS_CONTROL_TURPIAL]]
- Sprints S01-S10: [[SPRINTS_CODEV_MARKETPLACE_2026-05-10]]
- Bugs críticos: [[BUGS_CRITICOS]]
- Roadmap rescate: [[ROADMAP_RESCATE]]
- Estado negocio: [[ESTADO_NEGOCIO_TURPIAL_2026-05-10]]
- Arquitectura tasas: [[ARQUITECTURA_TASAS]]
- QA Harness cerrado: [[S03_QA_HARNESS_INDEX]]
- Protocolo E2E manual: [[E2E_MANUAL_TEST_PROTOCOL_2026-05-11]]
- Dispatcher QA: `docs/07_handoffs/qa-dispatcher.json`
- Oreshnik design: `docs/marketplace/ORESHNIK_ORCHESTRATOR_DESIGN.md`

---

## 📝 MATCH CON NOTAS DE REUNIÓN

### Reunión 2026-05-12 00:28 UTC → Asignación en plan:

| Pendiente reunión | Sprint asignado |
|-------------------|-----------------|
| Habilitar Selección Múltiple en booking | S-JB-01 |
| Agregar Campo Cantidad de temas | S-JB-01 |
| Agendar Reunión con directora (cobro por tema) | S-ADM-04 (contexto deploy CDA) |
| Actualizar Tasa de cambio (3 APIs, cada hora) | S-JB-03 |
| WhatsApp Reserva: incluir fecha y hora | S-JB-01 |
| Dashboard de gestión de reservas | S-JB-02 |
| Excluir Sitemap Indexación URLs prueba | S-JB-03 |
| Push de cambios locales a remoto | ACCIÓN INMEDIATA (Jean) |
| Actualizar Docs + Obsidian | S-JB-03 (parte del cierre) |
| Evitar que Vercel despliegue /docs | S-JB-03 |
| Mobile: microtexto descriptivo se corta | S-JB-03 |
| Botón "Enviar solicitud" no intuitivo | S-JB-03 |

### Reunión 2026-05-12 15:11 UTC → Asignación en plan:

| Pendiente reunión | Sprint asignado |
|-------------------|-----------------|
| Organizar pendientes y proponer plan sprints | ✅ ESTE DOCUMENTO |
| Registrar cuenta bancaria jurídica + Binance | S-ADM-02 |
| Preparar documentación legal | S-ADM-01 |
| Definir modelo comercial Casa del Artista ↔ Turpial Sound | S-ADM-03 |
| Definir modelo comercial Turpial Sound ↔ SMS Mantis ↔ socios | S-ADM-03 |
| Regularizar marca comercial | S-ADM-01 |
| Optimización SEO/AEO continua | S-MK-03 |
| Añadir selección múltiple a reserva | S-JB-01 |
| Programar deploy viernes 15 mayo CDA | S-ADM-04 |
| Reenviar credenciales Instagram | S-ADM-04 |
| Gmail/Calendario en teléfono Sus | S-ADM-04 |
| Notificaciones calendario prioridad máxima | S-ADM-04 |
| Optimizar YouTube | S-MK-04 (parte de APIs RRSS) |
| Calendario/correo en teléfono Fran | S-ADM-04 |
| Actualizar logo y link en Instagram | S-ADM-04 |
| Link de Turpial en BIO Instagram Fran | S-ADM-04 |
| Protocolo reseñas Google Business | S-JB-04 |
| Documentar experiencia "mecánico" | S-JB-04 |
| Automatizar configuración vínculos RRSS | S-MK-04 |
| Actualizar tienda WhatsApp Business | S-ADM-04 |
| Obtener credenciales YouTube | S-ADM-04 |
| Modelar escenarios facturación | S14 (parte del admin dashboard) |
| Crear subpágina Academia Turpial | S-MK-03 |
| Solicitar permisos directiva para Academia | S-ADM-03 (contexto legal) |

---

> **Fin del Plan Maestro.** Este documento es la fuente viva de planificación. Cualquier cambio en prioridades, nuevos pendientes o cierres debe reflejarse aquí y en [[00_CENTRAL_TURPIAL]].
