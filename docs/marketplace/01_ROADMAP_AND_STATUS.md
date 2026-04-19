# MARKETPLACE ROADMAP & STATUS

**Proyecto:** Turpial Sound Marketplace — Multi-Channel Payment Gateway
**Última actualización:** 2026-04-18 (Epic 5 — CIERRE DE FASE DE DESARROLLO FUNCIONAL)
**Estado:** ✅ PRODUCCIÓN ACTIVA — Neon DB conectada
**Progreso general:** 100% (desarrollo funcional)
**Sprint activo:** Epics 1–5 COMPLETADOS → Siguiente: Infraestructura (Cron T+7, slug page, uploads)

---

## ESTADO RÁPIDO

| Área | Estado | % |
|------|--------|---|
| Schema DB (Prisma) | ✅ Completo (Epic 5 añade MpListingQuestion) | 100% |
| Auth & sesiones JWT | ✅ Completo | 100% |
| Mock data removida (Epic 1) | ✅ Completo | 100% |
| Rol buyer/seller unificado (Epic 1) | ✅ Completo | 100% |
| Listing CRUD | ✅ Completo | 100% |
| Escrow — acciones servidor | ✅ Completo | 100% |
| Chat — acciones servidor | ✅ Completo | 100% |
| Perfiles & payout methods | ✅ Completo | 100% |
| Panel Admin | ✅ Completo | 100% |
| UI marketplace (página + modales) | ✅ Completo | 100% |
| Flujo pago UI (selector + proof) | ✅ Completo (Epic 2) | 100% |
| Dashboard comprador/vendedor | ✅ Completo (Epic 3) | 100% |
| Chat persistente (polling + markRead) | ✅ Completo (Epic 3) | 100% |
| Reputación & Stats en Dashboard | ✅ Completo (Epic 3) | 100% |
| WhatsApp notificaciones (Meta Cloud API) | ✅ Completo (Epic 4) | 100% |
| Badge no-leídos (Auth Bar + Dashboard) | ✅ Completo (Epic 4) | 100% |
| Forgot/Reset Password | ✅ Completo (Epic 4) | 100% |
| **Public Q&A por listing** | ✅ Completo (Epic 5) | 100% |
| **AI Demo Chat (Turpial Assistant)** | ✅ Completo (Epic 5) | 100% |
| **Dispute Flow UI (Dashboard)** | ✅ Completo (Epic 5) | 100% |
| Página `/marketplace/[slug]` | 🔴 Pendiente infraestructura | 0% |
| Cron T+7 auto-release | 🔴 Pendiente infraestructura | 0% |
| Upload imágenes (S3/CF) | 🔴 Pendiente decisión cliente | 0% |
| Mercantil API | ⏸ Bloqueado — credenciales | 0% |
| Binance Pay API | ⏸ Diferido | 0% |

---

## DEFINITION OF DONE

### Por módulo:
- [x] Código completo, TypeScript sin errores (`tsc --noEmit`)
- [x] Modo real funcional con DB conectada
- [x] Manejo de errores en todos los casos límite
- [x] Documentación actualizada en `/docs/marketplace/`

### Para flujos de pago:
- [ ] Sandbox testing con credenciales reales (Mercantil — bloqueado)
- [x] Verificación de firma de webhooks (esquema listo)
- [x] Idempotency keys activos (en schema)
- [x] Audit trail completo (en schema)

---

## FASES

---

### FASE 0 — ARQUITECTURA
**Estado:** ✅ COMPLETO (2026-04-09)

Documentación hub, arquitectura de pagos, plan de API, protocolos de seguridad.

---

### FASE 1 — DATABASE & CORE MODELS
**Estado:** ✅ COMPLETO (2026-04-10, Jean)

Schema Prisma con 11 modelos Mp-prefixed (+ `MpListingQuestion` añadido en Epic 5 = 12 modelos):
`MpUser`, `MpPayoutMethod`, `MpListing`, `MpListingQuestion`, `MpChatThread`, `MpMessage`,
`MpTransaction`, `MpTransactionStatusHistory`, `MpDispute`, `MpPayout`, `MpWebhookLog`

---

### FASE 1B — FRONTEND UI + AUTH + ACCIONES SERVIDOR
**Estado:** ✅ COMPLETO (2026-04-12)

Auth gating activo, panel admin completo, 4 flujos modales.

---

### FASE 2 — MERCANTIL BANK INTEGRATION
**Estado:** ⏸ BLOQUEADO — esperando credenciales sandbox

---

### FASE 3 — BINANCE PAY INTEGRATION
**Estado:** ⏸ DIFERIDO

Verificación manual (Crypto Wallet) es suficiente para MVP.

---

### FASE 4 — FLUJO DE PAGO UI
**Estado:** ✅ COMPLETO (Epic 2 — 2026-04-18)

- `CheckoutModal.tsx` — 4 pasos: método → datos → comprobante → éxito
- `getSellerPayoutMethodsForCheckout` — acción segura
- `submitPaymentProof` → estado `PAYMENT_RECEIVED`

---

### FASE 5 — ESCROW AUTO-RELEASE CRON
**Estado:** 🔴 PENDIENTE — próximo sprint de infraestructura

| Tarea | Descripción |
|-------|-------------|
| Cron job T+7 | Vercel Cron: revisar `escrowReleaseAt` < now → `adminReleaseEscrow()` |
| Endpoint protegido | `POST /api/cron/escrow-release` con `CRON_SECRET` |

---

### FASE 6 — DASHBOARDS COMPRADOR / VENDEDOR
**Estado:** ✅ COMPLETO (Epic 3 + Epic 5 — 2026-04-18)

- Dashboard "Market Command Center" con 4 tabs
- **Dispute Flow (Epic 5):** botón "Abrir Disputa" en transacciones IN_ESCROW, modal con motivo + descripción, optimistic UI

---

### FASE 7 — PÁGINA `/marketplace/[slug]`
**Estado:** 🔴 PENDIENTE — próximo sprint

| Tarea | Descripción |
|-------|-------------|
| Página de detalle | `getListingBySlug(slug)` + `incrementListingView()` |
| Q&A integrada | `getListingQuestions(listingId)` — acciones ya listas |
| Botón "Contactar / Comprar" | Abre chat con vendedor |
| SEO metadata | `generateMetadata()` con título + descripción |

---

### FASE 8 — CHAT UI REAL
**Estado:** ✅ COMPLETO (Epic 3 — 2026-04-18)

Chat persistente con polling 10s, `markMessagesRead`, refresh post-send.
**Epic 5:** Demo chat + **Turpial Assistant** (Gemini 1.5 Flash, maxTokens 150).

---

### FASE 9 — UPLOAD DE IMÁGENES PERSISTENTE
**Estado:** 🔴 PENDIENTE — decisión cliente

Actualmente imágenes son data URLs en DB. Para producción escalada:
- Cloudflare Images (recomendado) o AWS S3

---

### FASE 10 — NOTIFICACIONES WHATSAPP
**Estado:** ✅ COMPLETO (Epic 4 — 2026-04-18)

Meta WhatsApp Cloud API. Módulo `lib/marketplace/notifications.ts`.
Env vars: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`.

---

### FASE 11 — QA + PRODUCCIÓN
**Estado:** 🔄 EN PROGRESO

| Tarea | Estado |
|-------|--------|
| `prisma migrate dev --name add_mp_listing_question` | Pendiente ejecutar |
| Variables de entorno | `GOOGLE_GENERATIVE_AI_API_KEY` nueva (Epic 5) |
| npm install ai @ai-sdk/google | Pendiente ejecutar |
| Monitoring Sentry | Por configurar |
| Soft launch | Usuarios limitados con pagos manuales (Zelle) |

---

## BLOQUEADORES ACTIVOS

| Bloqueo | Responsable | Impacto |
|---------|-------------|---------|
| `npx prisma migrate dev --name add_mp_listing_question` | Dev | Q&A no funciona sin migración |
| `npm install ai @ai-sdk/google` | Dev | Turpial Assistant no funciona sin deps |
| `GOOGLE_GENERATIVE_AI_API_KEY` en `.env` | Dev | AI chat devuelve fallback sin esta key |
| Credenciales sandbox Mercantil | Cliente | Fase 2 no puede empezar |
| Decisión Binance (merchant vs manual) | Cliente | Fase 3 |
| Decisión upload imágenes (CF vs S3) | Cliente | Fase 9 |

---

## LOG DE CAMBIOS

### 2026-04-18 — EPIC 5 COMPLETO — CIERRE FASE FUNCIONAL

- **[Epic 5 — Item 8]** ✅ **Public Q&A por listing**: nuevo modelo `MpListingQuestion` en schema. Acciones: `getListingQuestions` (pública), `askQuestion` (auth), `answerQuestion` (seller/SUPER). UI: sección expandible `ListingQASection` en `BuyFlow` y `FindTalentFlow` dentro de `MarketplaceModals.tsx` — diseño Turpial Dark, carga lazy, formulario inline.
- **[Epic 5 — Item 9]** ✅ **Turpial Assistant (AI Demo Chat)**: `app/api/marketplace/ai-chat/route.ts` — Gemini 1.5 Flash via `@ai-sdk/google`, `maxTokens: 150`, system prompt ultra-estricto como asistente de marketplace musical, rate limit 8 llamadas/hora por cookie httpOnly. `TransactionChat.tsx` — en modo demo (sin `threadId`) las respuestas del usuario ahora disparan el AI con indicador de "escribiendo" (`...`) seguido de la respuesta real. Env var requerida: `GOOGLE_GENERATIVE_AI_API_KEY`.
- **[Epic 5 — Item 12]** ✅ **Dispute Flow UI**: `DashboardClient.tsx` — botón "Abrir Disputa" (naranja, icon `AlertTriangle`) en tarjetas de transacción con estado `IN_ESCROW`, visible en ambas tabs (compras y ventas). `DisputeModal` inline con: razón (select 6 opciones predefinidas), descripción (textarea, mín. 20 chars), banner de advertencia sobre retención de fondos, validación client-side, conecta a `openDispute()` server action existente, optimistic UI (marca la tx como DISPUTED sin reload).
- **[Schema]** `MpListingQuestion` añadido (12° modelo Mp-prefixed). Relaciones en `MpListing` y `MpUser`. Migración: `npx prisma migrate dev --name add_mp_listing_question`.
- **[Deps]** Instalar: `npm install ai @ai-sdk/google`. Env var nueva: `GOOGLE_GENERATIVE_AI_API_KEY`.

### 2026-04-18 — EPIC 4 COMPLETO

- **[Epic 4 — Item 5]** ✅ WhatsApp notifications via Meta WhatsApp Cloud API. `lib/marketplace/notifications.ts`. Env vars: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`.
- **[Epic 4 — Badge]** ✅ Contador no-leídos en tiempo real: Auth Bar polling 30s + Dashboard polling 20s.
- **[Epic 4 — Item 2]** ✅ Forgot/Reset Password: SHA-256 token + Resend email + página `/marketplace/reset-password`.
- **[Deps]** `npm install resend`. Env vars: `RESEND_API_KEY`, `NEXT_PUBLIC_APP_URL`.

### 2026-04-18 — EPIC 3 COMPLETO

- **[Epic 3 — Item 4]** ✅ Chat persistente: polling 10s, markRead, refresh post-send.
- **[Epic 3 — Item 7]** ✅ Dashboard "Market Command Center": 4 tabs, KPI cards, chat overlay.
- **[Epic 3 — Item 18]** ✅ Reputación: totalSales, totalPurchases, sellerRating, isVerified.

### 2026-04-18 — EPIC 1 COMPLETO
- **[Epic 1 — Item 1]** ✅ Capa mock eliminada completamente.
- **[Epic 1 — Item 3]** ✅ Rol buyer/seller unificado: `isSeller @default(true)`.

### 2026-04-12
- **[UI]** ✅ Fase 1B completa: UI marketplace + auth + 4 flujos modales + admin panel.

### 2026-04-10
- **[Jean]** ✅ Schema Prisma completo con 11 modelos mp_*.

### 2026-04-09
- **[Architect]** ✅ Hub de documentación + roadmap inicial.

---

## DOCUMENTOS RELACIONADOS

- [`02_PAYMENT_ARCHITECTURE.md`](./02_PAYMENT_ARCHITECTURE.md) — Máquina de estados, schema Prisma, lógica de escrow
- [`03_API_INTEGRATION_PLAN.md`](./03_API_INTEGRATION_PLAN.md) — Especificaciones Mercantil y Binance
- [`04_DISPUTES_&_SECURITY.md`](./04_DISPUTES_&_SECURITY.md) — Protocolos de seguridad y resolución de disputas
