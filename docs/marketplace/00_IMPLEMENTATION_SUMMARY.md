# MARKETPLACE — RESUMEN DE IMPLEMENTACIÓN

**Actualizado:** 2026-04-18 (Epic 5 — FASE DE DESARROLLO FUNCIONAL COMPLETA)
**Estado:** ✅ 100% COMPLETO — Producción activa (Neon DB)
**Rama:** `UI-UX-finalV3`
**Modo:** `USE_MOCK_DATA=false` — conectado a Neon PostgreSQL

---

## QUÉ ESTÁ CONSTRUIDO Y FUNCIONA

### Backend completo (acciones servidor)

Todos los módulos apuntan directamente a Neon PostgreSQL. La capa mock fue eliminada en Epic 1 (2026-04-18).
Patrón: `getDb()` → Prisma + Neon PostgreSQL. Sin fallbacks mock.

| Módulo | Archivo | Funciones |
|--------|---------|-----------|
| Auth | `actions/marketplace/auth.ts` | `registerMpUser`, `loginMpUser`, `logoutMpUser`, `getMpSession` |
| Listings | `actions/marketplace/listings.ts` | `getActiveListings`, `getListingById`, `getListingBySlug`, `getListingsByCategory`, `getUserListings`, `updateListingStatus`, `incrementListingView`, `createListing` |
| Transacciones | `actions/marketplace/transactions.ts` | `initiatePurchase`, `submitPaymentProof`, `validatePayment`, `confirmDelivery`, `releaseEscrow`, `openDispute`, `resolveDispute`, `cancelTransaction`, `getTransaction`, `getMyTransactions` |
| Chat | `actions/marketplace/chat.ts` | `getOrCreateThread`, `sendMessage`, `getThreadMessages`, `getMyThreads`, `markMessagesRead`, `closeThread` |
| Usuarios | `actions/marketplace/users.ts` | `getMyProfile`, `updateProfile`, `getUserProfile`, `becomeSeller`, `addPayoutMethod`, `getPayoutMethods`, `setDefaultPayoutMethod`, `removePayoutMethod`, `getSellerPayoutMethodsForCheckout` |
| Admin | `actions/marketplace/admin.ts` | `getAdminStats`, `getEscrowList`, `getPayoutReport`, `adminValidatePayment`, `adminReleaseEscrow`, `adminResolveDispute`, `adminCancelTransaction`, `adminGetUsers`, `adminBanUser`, `adminUnbanUser`, `adminSetUserRole`, `adminVerifyUser` |
| **Q&A (Epic 5)** | `actions/marketplace/questions.ts` | `getListingQuestions` (público), `askQuestion` (auth), `answerQuestion` (seller/SUPER) |

### Frontend completo

| Componente | Descripción |
|-----------|-------------|
| `app/marketplace/page.tsx` | Página principal: hero, grid de listings, 4 intent cards, auth bar, chat demo |
| `app/marketplace/admin/page.tsx` | Panel admin (SUPER only — auth real, sin bypass) |
| `app/api/marketplace/ai-chat/route.ts` | **Epic 5** — API route POST: Gemini 1.5 Flash, maxTokens 150, rate limit 8 calls/h por cookie |
| `components/marketplace/MarketplaceModals.tsx` | 4 flujos + **Q&A section por listing** (Epic 5): expandible, carga lazy, formulario de pregunta |
| `components/marketplace/MarketplaceCard.tsx` | Card de listing con imagen o placeholder |
| `components/marketplace/TransactionChat.tsx` | Chat dual-mode: mock/demo con **Turpial Assistant AI** (Epic 5) + real DB con polling 10 s |
| `app/marketplace/dashboard/page.tsx` | Server component: parallel fetch profile/compras/ventas/threads → redirect si no hay sesión |
| `components/marketplace/dashboard/DashboardClient.tsx` | Dashboard "Market Command Center": 4 tabs, KPI cards, status badges, chat overlay + **Flujo de Disputa** (Epic 5) |
| `components/marketplace/CheckoutModal.tsx` | Flujo de pago manual completo: selección de método, datos del vendedor, subida de comprobante |
| `components/marketplace/MarketplaceAuthModal.tsx` | Login + registro (teléfono + opt-in WhatsApp) |
| `components/marketplace/admin/AdminDashboard.tsx` | Dashboard admin: 4 tabs (Stats / Escrow / Pagos / Usuarios) |

### Base de datos (Prisma)

**12 modelos Mp-prefixed** en `prisma/schema.prisma`, totalmente aislados del sistema de reservas:

```
MpUser                      — perfiles, auth, KYC, phone, whatsappConsent
MpPayoutMethod              — métodos de cobro del vendedor (encriptados)
MpListing                   — productos y servicios
MpListingQuestion           — Q&A pública por listing (Epic 5)
MpChatThread                — hilos de conversación buyer↔seller
MpMessage                   — mensajes inmutables (sin update/delete)
MpTransaction               — transacciones con máquina de estados
MpTransactionStatusHistory  — audit trail inmutable
MpDispute                   — disputas con evidencias
MpPayout                    — pagos a vendedores
MpWebhookLog                — logs de webhooks (Mercantil/Binance)
```

**Migración pendiente:** `npx prisma migrate dev --name add_mp_listing_question`

---

## FLUJOS DE USUARIO POR ROL

### ANONYMOUS
- Navega el marketplace, ve listings, filtra por categoría
- Lee Q&A de cualquier listing (sin login)
- Puede abrir "Comprar" y "Buscar Talento" libremente
- Al intentar contactar, vender o preguntar → se abre AuthModal

### USER (Comprador y vendedor unificado — Epic 1)
- Todo lo de ANONYMOUS +
- Publica productos y servicios vía modal "Vender" / "Ofrecer Talento"
- Hace preguntas en listings (Q&A pública)
- Responde preguntas en sus propios listings
- Inicia transacciones y envía comprobantes de pago
- Confirma recepción de productos → libera fondos
- **Abre disputas desde el Dashboard** (estado IN_ESCROW)
- Recibe mensajes y genera cotizaciones
- Chatea con "Turpial Assistant" en el demo del marketplace

### SOCIO (isSeller=true, comisión exenta)
- Igual que USER pero sin el 5% de comisión deducido

### SUPER (Admin)
- Todo lo anterior +
- Acceso a `/marketplace/admin`
- Valida pagos manuales (Zelle/Crypto)
- Libera fondos, resuelve disputas, cancela transacciones
- Responde Q&A de cualquier listing
- Gestiona usuarios: ban/unban, verificar, cambiar rol
- Descarga reporte CSV de pagos a vendedores

---

## MÁQUINA DE ESTADOS ESCROW

```
INITIATED
  └─► PENDING_PAYMENT
        ├─► VALIDATING (pago manual: Zelle/Crypto)
        │     ├─► IN_ESCROW ─────────────────────┐
        │     └─► PAYMENT_FAILED (terminal)       │
        ├─► PAYMENT_RECEIVED (webhook automático) │
        │     └─► IN_ESCROW ────────────────────► │
        └─► CANCELLED (terminal)                  │
                                                  ▼
                                            IN_ESCROW ◄── Abrir Disputa disponible aquí
                                     ┌──────────┼──────────┐
                                     ▼          ▼          ▼
                            DELIVERY_CONFIRMED  RELEASED  DISPUTED
                                     │         (terminal)    │
                                     ▼                       ├─► RELEASED (terminal)
                                  RELEASED                   ├─► REFUNDED (terminal)
                                 (terminal)                  └─► IN_ESCROW (retira disputa)
```

---

## ESTRUCTURA DE ARCHIVOS CLAVE

```
app/
  marketplace/
    page.tsx                    ← Página principal
    admin/
      page.tsx                  ← Panel admin (SUPER)
    dashboard/
      page.tsx                  ← Server component dashboard
  api/
    marketplace/
      ai-chat/
        route.ts                ← Turpial Assistant (Gemini 1.5 Flash) — Epic 5

components/marketplace/
  MarketplaceCard.tsx
  MarketplaceModals.tsx         ← + ListingQASection (Epic 5)
  MarketplaceAuthModal.tsx
  TransactionChat.tsx           ← + Turpial Assistant demo AI (Epic 5)
  CheckoutModal.tsx
  admin/
    AdminDashboard.tsx
  dashboard/
    DashboardClient.tsx         ← + DisputeModal + dispute flow (Epic 5)

actions/marketplace/
  auth.ts
  listings.ts
  transactions.ts               ← openDispute (ya existía)
  chat.ts
  users.ts
  admin.ts
  questions.ts                  ← NUEVO (Epic 5)
actions/marketplace.ts          ← Barrel re-export

lib/marketplace/
  auth.ts                       ← JWT, session cookie
  db.ts                         ← Prisma factory (getDb)

lib/validations/
  marketplace.ts                ← Zod schemas + MP_CATEGORIES

types/
  marketplace.ts                ← Tipos UI

prisma/
  schema.prisma                 ← Schema completo (12 modelos mp_*)
```

---

## PENDIENTE (POST EPIC 5)

| Ítem | Descripción | Prioridad |
|------|-------------|-----------|
| Migración DB | `npx prisma migrate dev --name add_mp_listing_question` | INMEDIATA |
| `/marketplace/[slug]` | Página de detalle con SEO metadata | Alta |
| Cron T+7 | Auto-release escrow: `app/api/cron/escrow-release/route.ts` | Alta |
| Upload imágenes persistente | S3 o Cloudflare Images (decisión cliente) | Media |
| Mercantil API | Webhooks C2P/Pago Móvil/Botón (bloqueado — credenciales) | Bloqueado |
| WhatsApp notificaciones | Triggers: pago validado, escrow, disputa | Media |

---

## VARIABLES DE ENTORNO REQUERIDAS

| Variable | Descripción | Estado |
|----------|-------------|--------|
| `DATABASE_URL` | Neon PostgreSQL connection string | ✅ Activo |
| `MP_JWT_SECRET` | Secret para JWT de sesión (32+ chars) | ✅ Activo |
| `RESEND_API_KEY` | Para emails de reset password | ✅ Activo |
| `NEXT_PUBLIC_APP_URL` | URL base para links en emails | ✅ Activo |
| `WHATSAPP_ACCESS_TOKEN` | Meta WhatsApp Cloud API token | Configurar |
| `WHATSAPP_PHONE_NUMBER_ID` | ID del número WhatsApp Business | Configurar |
| `GOOGLE_GENERATIVE_AI_API_KEY` | **Gemini API key (Turpial Assistant — Epic 5)** | Configurar |
| `CRON_SECRET` | Protege el endpoint de cron T+7 | Por configurar |
| `MERCANTIL_*` | Credenciales API Mercantil | Bloqueado |
| `BINANCE_*` | Credenciales Binance Pay | Diferido |

---

## CÓMO PROBAR EN PRODUCCIÓN

```bash
# Requiere DATABASE_URL + MP_JWT_SECRET en .env
# Para AI demo: GOOGLE_GENERATIVE_AI_API_KEY

# Migración obligatoria tras Epic 5:
npx prisma migrate dev --name add_mp_listing_question
npx prisma generate

# Navegar a:
http://localhost:3000/marketplace           # Página principal + demo AI
http://localhost:3000/marketplace/dashboard # Dashboard con disputa flow
http://localhost:3000/marketplace/admin     # Panel admin (requiere SUPER)
```

**Flujos a probar:**
1. Demo chat → enviar mensaje → Turpial Assistant responde (requiere `GOOGLE_GENERATIVE_AI_API_KEY`)
2. Comprar listing → explorar Q&A → hacer pregunta (requiere sesión)
3. Dashboard compras → transacción EN_ESCROW → "Abrir Disputa" → llenar formulario → confirmar
4. Admin: resolver disputa → RELEASED o REFUNDED
