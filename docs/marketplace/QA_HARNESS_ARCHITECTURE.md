# QA Harness Architecture — Turpial Marketplace

> Version: 1.0.0
> Sprint: S03E (architecture + roadmap)
> Branch: Manuel/s03e-marketplace-qa-harness-architecture-2026-05-10
> Date: 2026-05-10
> Status: DESIGN — no production impact

---

## 1. Executive Summary

This document defines a modular, layered QA architecture for Turpial Marketplace that replaces fragile CDP-based scripts with deterministic, classified, and scalable validation modules. The architecture minimizes browser dependency by using server-side validation as the primary gate, and restricts real browser to UI flows that cannot be validated otherwise.

### Key Design Decisions

- **CDP scripts are classified as LEGACY/FLAKY.** The current `qa-marketplace-login-smoke.mjs` and sibling scripts depend on raw Chrome DevTools Protocol over WebSocket, which is blocked on Windows environments. These will NOT be patched further.
- **Server-side validation is the primary strategy.** Login, data integrity, and state transitions are validated via server actions and DB reads without a browser.
- **Browser is only required for: image upload, modal interactions, file picker dialogs, and visual proof capture.**
- **Playwright is recommended for browser replacement** but NOT installed yet — pending authorization.
- **Fallo clasificado** for every possible failure mode, with max retries defined.

---

## 2. Validation Layers (A → B → C → D)

```
Layer A — PREFLIGHT (no browser, no DB write)
  ├── QA-00: App URL reachable, env vars present, DB tables exist
  └── Fail: ENV_MISSING, PREVIEW_NOT_BKG, APP_URL_NOT_200, DB_MISSING_TABLE

Layer B — SERVER-SIDE (no browser)
  ├── QA-01: Login via loginMpUser() server action, verify session cookie
  ├── QA-02: Create listing via createListing(), verify DB record
  ├── QA-04: Ask/answer via askQuestion()/answerQuestion(), verify DB
  └── Fail: QA_USER_MISSING, QA_PASSWORD_MISMATCH, LOGIN_FAILED, ...

Layer C — BROWSER SMOKE (browser required, minimal UI)
  ├── QA-03: Verify listing appears on /marketplace home
  ├── QA-07: Admin review UI
  └── Fail: SELECTOR_MISSING, BROWSER_CDP_BLOCKED, BROWSER_ENGINE_MISSING

Layer D — E2E MODULAR (browser + server + assets)
  ├── QA-05: Purchase flow (initiate + proof upload with local asset)
  ├── QA-06: Payment proof upload using local asset
  ├── QA-08: Seller delivery
  ├── QA-09: Buyer receipt
  ├── QA-10: Admin payout/closure
  ├── QA-11: Notifications, dashboards
  └── Fail: Full classified failure set
```

---

## 3. Module Inventory (QA-00 through QA-12)

| Module | Name | Layer | Browser? | Dependencies |
|--------|------|-------|----------|-------------|
| QA-00 | Preflight | A | No | Env, DB read |
| QA-01 | Login validation | B | No | Server action: `loginMpUser` |
| QA-02 | Publish listing | B | No | Server action: `createListing` |
| QA-03 | Home discovery | C | Yes | `/marketplace` page |
| QA-04 | Q&A | B | No | Server actions: `askQuestion`, `answerQuestion` |
| QA-05 | Purchase initiation | B/D | Opt | Server action: `initiatePurchase` |
| QA-06 | Payment proof upload | D | Yes | `/api/marketplace/upload`, local asset |
| QA-07 | Admin review | C | Yes | `/marketplace/admin` |
| QA-08 | Seller delivery | B | No | Server action: `sellerDeliver` |
| QA-09 | Buyer receipt | B | No | Server action: `confirmDelivery` |
| QA-10 | Admin payout/closure | B/D | Opt | Server actions: `adminMarkSellerPaid`, `releaseEscrow` |
| QA-11 | Notifications + dashboards | C/D | Yes | Dashboard UI, action center |
| QA-12 | Final regression | A-D | Both | All modules combined |
| S-MP-01 | Cart consolidated checkout | B/D | No | Prisma direct; validates consolidated order, inventory quantity, proof propagation, independent seller flow |

---

## 4. Technical Inventory — Flujo x Acción x Componente x Modelo

### 4.1 Complete Flow Mapping

| Flujo | Ruta UI | Componente | Server Action/API | Modelo Prisma | Usuario QA | Estado Inicial | Estado Esperado | Riesgo | Script QA Futuro |
|-------|---------|------------|-------------------|---------------|-------------|----------------|-----------------|--------|-----------------|
| **Login buyer** | `/marketplace` (modal) | `MarketplaceAuthModal` | `loginMpUser()` | `MpUser` | buyerIA | session nula | session activa, cookie set | MEDIO | `modules/qa-01-login.mjs` |
| **Login seller** | `/marketplace` (modal) | `MarketplaceAuthModal` | `loginMpUser()` | `MpUser` | sellerIA | session nula | session activa, cookie set | MEDIO | `modules/qa-01-login.mjs` |
| **Login admin** | `/marketplace` (modal) | `MarketplaceAuthModal` | `loginMpUser()` | `MpUser` | SUPER | session nula | session activa, cookie set | MEDIO | `modules/qa-01-login.mjs` |
> **QA_ADMIN_IDENTIFIER / QA_ADMIN_PASSWORD: contrato pendiente de confirmar.** El repo usa login via `loginMpUser()` para todos los roles (USER/SOCIO/SUPER), pero las credenciales admin QA no están formalmente documentadas en el setup script `setup-marketplace-qa-accounts.ts`. Antes de implementar QA-07/QA-10, confirmar qué usuario tiene rol `SUPER` y cómo autenticarlo.
| **Publish listing** | `/marketplace` (sell modal) | `SellFormModal` (in `MarketplaceModals`) | `createListing()` | `MpListing` | sellerIA | no listing | `ACTIVE`, visible | BAJO | `modules/qa-02-publish.mjs` |
| **Home discovery** | `/marketplace` | `MarketplacePageClient` | `getActiveListings()` | `MpListing`, `MpUser` | (public) | listing ACTIVE | aparece en grid | MEDIO | `modules/qa-03-discovery.mjs` |
| **Listing detail** | `/marketplace/[slug]` | `[slug]/page.tsx` | `getListingBySlug()` | `MpListing` | buyerIA | listing visible | carga detalle completo | BAJO | `modules/qa-03-discovery.mjs` |
| **Q&A ask** | `/marketplace/[slug]` | `ListingQASection` | `askQuestion()` | `MpListingQuestion` | buyerIA | 0 preguntas | pregunta creada | BAJO | `modules/qa-04-qa.mjs` |
| **Q&A answer** | `/marketplace/dashboard?tab=my_store` | `DashboardClient` (Mi Tienda tab) | `answerQuestion()` | `MpListingQuestion` | sellerIA | pregunta sin respuesta | respuesta visible | BAJO | `modules/qa-04-qa.mjs` |
| **Initiate purchase** | `/marketplace/[slug]` → modal | `CheckoutModal` | `initiatePurchase()` | `MpTransaction` | buyerIA | listing ACTIVE | TX `PENDING_PAYMENT` | ALTO | `modules/qa-05-purchase.mjs` |
| **Upload proof** | `/marketplace/[slug]` → checkout modal | `CheckoutModal` | `POST /api/marketplace/upload` → `submitPaymentProof()` | `MpTransaction`, `MpBlobObjectMetadata` | buyerIA | TX PENDING_PAYMENT | proof URL cargada, TX `PAYMENT_RECEIVED` | ALTO | `modules/qa-06-proof.mjs` |
| **Admin review** | `/marketplace/admin?tab=validations` | `AdminDashboard` (Validaciones tab) | `validatePayment()` / `adminValidatePayment()` | `MpTransaction`, `MpTransactionStatusHistory` | SUPER | TX PAYMENT_RECEIVED | TX `IN_ESCROW` | ALTO | `modules/qa-07-admin.mjs` |
| **Dashboard buyer** | `/marketplace/dashboard?tab=purchases` | `DashboardClient` (Compras tab) | `getMyTransactions('buyer')` | `MpTransaction` | buyerIA | TX IN_ESCROW | compra visible, estado OK | MEDIO | `modules/qa-11-dashboards.mjs` |
| **Dashboard seller** | `/marketplace/dashboard?tab=sales` | `DashboardClient` (Ventas tab) | `getMyTransactions('seller')` | `MpTransaction` | sellerIA | TX IN_ESCROW | venta visible | MEDIO | `modules/qa-11-dashboards.mjs` |
| **Dashboard admin** | `/marketplace/admin` | `AdminDashboard` | `getAdminStats()`, `getEscrowList()` | `MpTransaction`, `MpUser` | SUPER | TX IN_ESCROW | stats OK, TX en lista | BAJO | `modules/qa-11-dashboards.mjs` |
| **Seller delivery** | `/marketplace/dashboard?tab=sales` | `DashboardClient` (ActionCenter) | `sellerDeliver()` | `MpTransactionStatusHistory` | sellerIA | TX IN_ESCROW | estado seller_delivered registrado | BAJO | `modules/qa-08-delivery.mjs` |
| **Buyer receipt** | `/marketplace/dashboard?tab=purchases` | `DashboardClient` (ActionCenter) | `confirmDelivery()` | `MpTransaction` | buyerIA | seller delivered | TX `DELIVERY_CONFIRMED` | BAJO | `modules/qa-09-receipt.mjs` |
| **Notifications** | `/marketplace/dashboard` | `DashboardClient` (ActionCenterSection) | `getMyThreads()`, `getUnreadCount()` | `MpMessage`, `MpChatThread` | buyerIA/sellerIA | post-delivery | mensaje de sistema recibido | BAJO | `modules/qa-11-dashboards.mjs` |
| **Protected proof** | `/marketplace/admin?tab=validations` | `AdminDashboard` → proxy | `GET /api/marketplace/payment-proofs/*` | `MpTransaction` | SUPER | proof cargado | proof visible solo a SUPER/buyer | ALTO | `modules/qa-07-admin.mjs` |
| **Admin payout** | `/marketplace/admin` | `AdminDashboard` (Escrow/Payouts tabs) | `adminMarkSellerPaid()`, `releaseEscrow()` | `MpTransaction`, `MpPayout` | SUPER | TX DELIVERY_CONFIRMED | payout creado, TX `RELEASED` | ALTO | `modules/qa-10-payout.mjs` |
| **Cart consolidated checkout** | `/marketplace` carrito | `CartDrawer`, `CartCheckoutModal` | `checkoutCart()`, `submitOrderPaymentProof()` | `MpOrder`, `MpTransaction`, `MpListing` | buyerIA | carrito con 1+ sellers | una orden consolidada, hijas por seller/listing, proof obligatorio, inventario descontado por cantidad | ALTO | `modules/qa-smp01-cart-consolidated.mjs` |

---

## 5. Server Actions — Validatable Without Browser

Validation strategy for server actions (no browser required):

- **Prefer Prisma direct reads** for state verification (e.g., query MpTransaction status, check MpListing visibility). This is the safest approach — it reads the DB directly without depending on internal Next.js protocols.
- **Use QA-only protected endpoints** if server-side write operations are needed during QA (e.g., a dedicated `/api/qa/*` endpoint that wraps the action logic). These must be `NODE_ENV=development`-gated.
- **Use browser real only** for flows that truly require it (file picker, modal interactions, visual render verification).
- **Do NOT depend on reverse-engineering the Next.js Server Action protocol** (Next-Action headers, RSC payloads) unless explicitly proven stable against a specific build. The internal protocol can change between Next.js versions.

Server actions that can be validated without browser (via Prisma reads or QA endpoints):

| Action | File | What It Validates |
|--------|------|-------------------|
| `loginMpUser(raw)` | `actions/marketplace/auth.ts` | User can authenticate; returns session cookie |
| `registerMpUser(raw)` | `actions/marketplace/auth.ts` | User registration works |
| `getActiveListings()` | `actions/marketplace/listings.ts` | Listings are returned; pagination/count OK |
| `getListingBySlug(slug)` | `actions/marketplace/listings.ts` | Single listing detail resolvable |
| `createListing(input)` | `actions/marketplace/listings.ts` | Listing creation from server side |
| `getUserListings()` | `actions/marketplace/listings.ts` | Seller sees own listings |
| `initiatePurchase(listingId, method)` | `actions/marketplace/transactions.ts` | Purchase creates TX atomically |
| `submitPaymentProof(txId, ref, details, url)` | `actions/marketplace/transactions.ts` | Proof submission works |
| `validatePayment(txId, approved, notes)` | `actions/marketplace/transactions.ts` | Admin validation works |
| `sellerDeliver(txId)` | `actions/marketplace/transactions.ts` | Seller can mark delivery |
| `confirmDelivery(txId)` | `actions/marketplace/transactions.ts` | Buyer can confirm receipt |
| `releaseEscrow(txId)` | `actions/marketplace/transactions.ts` | Admin can release escrow |
| `getTransaction(txId)` | `actions/marketplace/transactions.ts` | Full TX details resolvable |
| `getMyTransactions(role)` | `actions/marketplace/transactions.ts` | Dashboard data resolvable |
| `askQuestion(listingId, q)` | `actions/marketplace/questions.ts` | Q&A creation works |
| `answerQuestion(questionId, a)` | `actions/marketplace/questions.ts` | Answer posting works |
| `getListingQuestions(listingId)` | `actions/marketplace/questions.ts` | Q&A retrieval works |
| `adminMarkSellerPaid(txId, extId)` | `actions/marketplace/admin.ts` | Payout creation works |
| `getAdminStats()` | `actions/marketplace/admin.ts` | Admin dashboard data |
| `getEscrowList(filter)` | `actions/marketplace/admin.ts` | Escrow visibility |
| `getOrCreateThread(sellerId, listingId)` | `actions/marketplace/chat.ts` | Chat thread creation |
| `sendMessage(threadId, content)` | `actions/marketplace/chat.ts` | Message sending |
| `getThreadMessages(threadId)` | `actions/marketplace/chat.ts` | Message retrieval |
| `getMyThreads()` | `actions/marketplace/chat.ts` | Thread list |
| `getUnreadCount()` | `actions/marketplace/chat.ts` | Unread notification count |

---

## 6. UI Selectors Requiring `data-testid` Stabilization

These selectors are currently fragile (text-matching, class-dependent) and should be instrumented with `data-testid` attributes for reliable automation:

| UI Element | Current Selector Strategy | Proposed `data-testid` | Risk |
|------------|--------------------------|------------------------|------|
| Login trigger button | Text search `'entrar'` / `'iniciar sesion'` | `data-testid="auth-trigger-login"` | HIGH |
| Login email/username input | Placeholder hint matching | `data-testid="auth-input-identifier"` | HIGH |
| Login password input | `type="password"` + hint | `data-testid="auth-input-password"` | HIGH |
| Login submit button | Text search in form scope | `data-testid="auth-submit-login"` | HIGH |
| Logout button | Text search `'salir'` | `data-testid="auth-logout"` | MEDIUM |
| Sell FAB/CTA | Text search (varies) | `data-testid="sell-cta-open"` | MEDIUM |
| Sell form fields | Placeholder hints | `data-testid="sell-input-*"` | MEDIUM |
| Listing card | Grid item with link | `data-testid="listing-card"` | LOW |
| Checkout/Purchase button | Text in `ListingDetailActions` | `data-testid="checkout-open"` | HIGH |
| Payment proof file input | `input[type="file"]` in modal | `data-testid="proof-file-input"` | HIGH |
| Submit proof button | Text in `CheckoutModal` | `data-testid="proof-submit"` | HIGH |
| Admin validate button | Text in `AdminDashboard` | `data-testid="admin-validate-approve"` | HIGH |
| Seller deliver button | Text in `ActionCenterSection` | `data-testid="seller-deliver"` | MEDIUM |
| Buyer confirm button | Text in `ActionCenterSection` | `data-testid="buyer-confirm-receipt"` | MEDIUM |
| Tab navigation | Role/text search | `data-testid="tab-*"` | MEDIUM |
| Chat/FAB message button | `ListingDetailActions` button | `data-testid="chat-open"` | MEDIUM |
| Notification badge | Unread count element | `data-testid="notification-badge"` | LOW |

---

## 7. Routes Requiring Real Browser

| Route / UI Flow | Why Browser Is Required | Layer |
|-----------------|------------------------|-------|
| `/marketplace` (listing grid render) | SSR + client hydration, image loading verification | C |
| `/marketplace/[slug]` (detail + gallery) | Visual confirmation of images, Q&A visibility, action buttons | C |
| Sell modal (create listing wizard) | Multi-step form, image upload via file picker | D |
| Checkout modal (payment method selection) | Modal interaction, dynamic payment instructions | D |
| File upload (listing images, payment proof) | Native file picker dialog is browser-only | D |
| Admin validations tab (proof viewer) | Proxy-authenticated image loading via browser session | C |
| Dashboard (ActionCenter, tabs) | Client-side state, conditional rendering, real-time updates | C |
| Chat overlay (TransactionChat) | Real-time message bubbles, read receipts | D |
| Admin dashboard (stats, tabs, escrow) | Client-side rendering, tab switching, data loading | C |

**Server-side-only routes (no browser needed):**
- All API routes (`/api/marketplace/*`)
- All server actions called via programmatic HTTP
- DB reads for state verification
- Payment proof proxy URL resolution (can check auth with fetch + cookie)

---

## 8. Decision Table: CDP vs Playwright vs Server-Side

| Flujo | Validación sin browser posible | Browser requerido | Riesgo CDP | Estrategia Recomendada |
|-------|-------------------------------|-------------------|------------|------------------------|
| Login buyer/seller/admin | YES — server action + cookie check | NO (solo smoke UI) | ALTO | Server-side validation (Layer B); browser smoke secundario (Layer C) |
| Publish listing | YES — `createListing()` + DB read | Solo para image upload | ALTO | Server-side (Layer B); image upload en Layer D con Playwright |
| Home discovery | NO — necesita render SSR completo | YES | MEDIO | Playwright smoke (Layer C); verificar conteo de listings |
| Listing detail | NO — necesita render | YES | MEDIO | Playwright smoke (Layer C) |
| Q&A | YES — `askQuestion()` / `answerQuestion()` | NO (solo ver UI) | ALTO | Server-side (Layer B); UI opcional |
| Initiate purchase | YES — `initiatePurchase()` server-side | NO (solo ver UI modal) | ALTO | Server-side (Layer B) |
| Upload payment proof | NO — requiere file picker | YES | ALTO | Playwright (Layer D) + asset local |
| Admin review | PARCIAL — `validatePayment()` server-side | Para ver proof UI | MEDIO | Server-side para estado; Playwright para UI proof viewer |
| Seller delivery | YES — `sellerDeliver()` server-side | NO | ALTO | Server-side (Layer B) |
| Buyer receipt | YES — `confirmDelivery()` server-side | NO | ALTO | Server-side (Layer B) |
| Admin payout | YES — `adminMarkSellerPaid()` server-side | Para ver payout UI | MEDIO | Server-side (Layer B); UI opcional |
| Notifications | PARCIAL — `getUnreadCount()` server-side | Para ver badge/dashboard render | MEDIO | Server-side para data; Playwright para UI |
| Dashboards | NO — render client-side | YES | MEDIO | Playwright (Layer C) |
| Protected proof | PARCIAL — proxy auth verificable | Para visualizar proof | MEDIO | Fetch auth check sin browser; Playwright para visual |

---

## 9. CDP Classification — Current Scripts Assessment

| Script | Status | Classification | Action |
|--------|--------|---------------|--------|
| `qa-marketplace-login-smoke.mjs` | **LEGACY/FLAKY** — bloqueado por CDP en Windows | CANONICAL → debe migrarse | Mantener temporalmente hasta que `qa-01-login.mjs` (server-side) esté operativo. Luego deprecar. No seguir parchando. |
| `qa-marketplace-qa-accounts.mjs` | **LEGACY/FLAKY** — depende de CDP | CANONICAL | Migrar a módulo Layer B/D con Playwright. Mantener como referencia de flows. |
| `qa-marketplace-seller-smoke.mjs` | **LEGACY/FLAKY** — CDP | SUPPORTING | Migrar a `modules/qa-11-dashboards.mjs`. |
| `qa-marketplace-assistant-smoke.mjs` | **LEGACY/FLAKY** — CDP | No clasificado | Migrar a módulo dedicado o integrar en QA-11. |
| `setup-marketplace-qa-accounts.ts` | **SOLID** — Prisma directo, sin browser | CANONICAL + MAINTAIN | Conservar. Es la base de normalización QA. |
| `qa-marketplace-admin-smoke.mjs` | **MISSING** — referenciado en dispatcher, no en disco | GAP OPERATIVO | Crear como `modules/qa-07-admin.mjs`. |
| `qa-marketplace-buyer.mjs` | **MISSING** — referenciado en dispatcher, no en disco | GAP OPERATIVO | Reemplazar por `modules/qa-05-purchase.mjs` + `qa-06-proof.mjs`. |
| `qa-marketplace-reconcile.mjs` | **MISSING** — referenciado en dispatcher, no en disco | GAP OPERATIVO | Reemplazar por `modules/qa-10-payout.mjs`. |

### Justification for Deprecating CDP

1. **Raw CDP over WebSocket is too low-level.** Every script duplicates ~200 lines of boilerplate (spawn, connect, waitFor, evalExpr, navigate, CDP methods).
2. **Blocked on Windows.** The `BROWSER_CDP_BLOCKED` error observed in S03D is persistent — Chrome headless CDP binding fails on the local environment.
3. **No recovery path.** Patching timeouts and fallback browsers has not resolved the issue across S03D attempts.
4. **Better alternative exists.** Playwright provides the same browser automation with built-in retries, selectors, wait strategies, screenshots, and trace recording — without raw CDP management.

---

## 10. Playwright Migration Recommendation

### Current State
- **Playwright NOT installed.** `package.json` has zero browser automation dependencies.
- CDP scripts use `spawn(chrome)` + WebSocket directly.
- `tsx` is the only TypeScript runner available for scripts.

### Recommendation
Install Playwright as a **devDependency only for QA scripts** (not runtime):

```bash
pnpm add -D @playwright/test
npx playwright install chromium
```

### Comparison

| Criterion | CDP Manual | Playwright | Server-Side Only |
|-----------|-----------|------------|-----------------|
| Browser dependency | Chrome exe + debug port | Chromium (managed) | None |
| Selector engine | Custom evalExpr + text search | Built-in locators (role, text, testid, CSS) | N/A |
| Retry / wait | Manual loops (bug-prone) | Auto-wait, auto-retry | N/A |
| Screenshots | Manual base64 via CDP | `page.screenshot()` | N/A |
| Trace/debug | None | Trace Viewer, video | N/A |
| Cross-platform | Windows-only hardcoded paths | Works on Win/Mac/Linux | Any |
| Maintenance burden | HIGH (boilerplate per script) | LOW (framework handles it) | ZERO |
| Blocked on Windows | YES (observed) | NO | NO |

**Veredict: Playwright is the recommended path for Layer C and D modules. Server-side validation for Layer B.**

---

## 11. Asset Management — Local Files

### Source Directory
```
D:\Users\mvera\Downloads
```

### Rules
1. **Never commit images to the repo.** `.gitignore` must block `var/qa-assets/`.
2. **Never upload real sensitive payment proofs** unless explicitly authorized.
3. **Copy only to `var/qa-assets/` if needed** for upload flows.
4. **Validate extension and size** before using.
5. **Report only basename** in QA output, not full paths (privacy).
6. **Block sensitive files** — reject filenames matching: `*comprobante*`, `*pago*`, `*cedula*`, `*cuenta*` patterns unless explicitly allowed.

### Asset Discovery Helper (proposed)
```js
// scripts/qa/lib/assets.mjs
// Functions:
//   findAssets(pattern) — list files matching glob pattern in Downloads
//   pickListingImage() — returns { path, basename, ext, sizeBytes } for listing
//   pickPaymentProof() — returns { path, basename, ext, sizeBytes } for proof
//   copyToQaAssets(src) — copies to var/qa-assets/ for upload
//   validateAsset(file) — checks extension (jpg, png, webp), max size
//   scrubSensitiveName(name) — returns basename only
```

---

## 12. Failure Classification — Complete Set

| Failure Code | Description | Retry? | Max Attempts |
|-------------|-------------|--------|-------------|
| `ENV_MISSING` | Required env var not found | No | 1 |
| `PREVIEW_NOT_BKG` | Preview URL not from BKG deploy | No | 1 |
| `APP_URL_NOT_200` | App URL returns non-200 | Yes (wait 5s) | 2 |
| `DB_MISSING_TABLE` | Required `mp_*` table missing | No | 1 |
| `QA_USER_MISSING` | QA user not in DB | No | 1 (run normalization first) |
| `QA_PASSWORD_MISMATCH` | Stored password doesn't match | No | 1 (run normalization) |
| `BROWSER_CDP_BLOCKED` | CDP WebSocket not reachable | Yes (alt browser) | 2 |
| `BROWSER_ENGINE_MISSING` | Chrome/Chromium not installed | No | 1 |
| `SELECTOR_MISSING` | UI element not found within timeout | Yes (refresh page) | 2 |
| `LOGIN_FAILED` | Login server action returned error | Yes (wait + retry) | 2 |
| `LISTING_CREATE_FAILED` | createListing server action error | Yes (different data) | 2 |
| `LISTING_NOT_VISIBLE_HOME` | Listing not on /marketplace grid | Yes (wait cache) | 3 |
| `QUESTION_NOT_CREATED` | askQuestion server action error | Yes | 2 |
| `ANSWER_NOT_VISIBLE` | Answer not in Q&A response | Yes (wait cache) | 3 |
| `PURCHASE_NOT_CREATED` | initiatePurchase error | Yes | 2 |
| `PAYMENT_PROOF_UPLOAD_FAILED` | Upload API returned error | Yes (different file) | 2 |
| `ADMIN_REVIEW_NOT_VISIBLE` | TX not in admin validations list | Yes (wait cache) | 2 |
| `STATUS_TRANSITION_FAILED` | State change rejected (guard) | No (investigate guard) | 1 |
| `NOTIFICATION_MISSING` | System message not found | Yes (wait delivery) | 3 |
| `DASHBOARD_BAD_STATE` | Dashboard shows wrong data | Yes (refresh) | 2 |
| `PROTECTED_PROOF_ACCESS_FAILED` | Proof proxy returned 403/404 | No (investigate auth) | 1 |
| `UNKNOWN` | Unclassified error | Depends | 1 |

### Global Stop Conditions
- **Never infinite loops.** Every wait/poll has a hard timeout (max 30s).
- **Browser launch max 2 attempts.** Then classify as `BROWSER_CDP_BLOCKED` or `BROWSER_ENGINE_MISSING`.
- **Selector wait max 15s.**
- **Upload max 2 attempts** (different files each).
- **DB read verification max 3 attempts.**
- **State transition max 2 attempts** (no retry for guard violations).
- **Screenshots only on failure.** Not on success (keep reports small).

---

## 13. File Structure — Proposed

```
scripts/qa/
├── lib/
│   ├── env.mjs              # Load .env.local/.env, requireEnv(), requireEnvs()
│   ├── report.mjs           # ReportBuilder: addResult(), finalize(), writeJSON(), writeMD()
│   ├── app-url.mjs          # checkAppUrl(), waitForAppUrl()
│   ├── assets.mjs           # findAssets(), pickListingImage(), pickPaymentProof(),
│   │                        # copyToQaAssets(), validateAsset(), scrubSensitiveName()
│   ├── db-read.mjs          # queryDb() — safe read-only Prisma queries
│   ├── server-action.mjs    # QA-only endpoint or Prisma-based validation helpers
│   ├── session.mjs          # loginServerSide() — validate login via Prisma user+password check
│   │                        # and session verification (cookie or token, per repo auth)
│   ├── retry.mjs            # withRetry(fn, maxAttempts, failureCode)
│   └── failures.mjs         # FailureCodes enum, classifyError(), formatFailure()
├── modules/
│   ├── qa-00-preflight.mjs
│   ├── qa-01-login.mjs
│   ├── qa-02-publish.mjs
│   ├── qa-03-discovery.mjs
│   ├── qa-04-qa.mjs
│   ├── qa-05-purchase.mjs
│   ├── qa-06-proof.mjs
│   ├── qa-07-admin.mjs
│   ├── qa-08-delivery.mjs
│   ├── qa-09-receipt.mjs
│   ├── qa-10-payout.mjs
│   ├── qa-11-dashboards.mjs
│   └── qa-12-regression.mjs
├── run-marketplace-qa.mjs   # Orchestrator: run modules in order, skip on dependency fail
└── marketplace-e2e-checklist.md  # Existing manual checklist
```

---

## 14. What NOT to Automate Yet

| Scope | Reason | Risk |
|-------|--------|------|
| Real payment processing (Mercantil, Binance) | No sandbox; real money at risk | CRITICAL |
| Booking system (`/reservas`, `/admin/bookings`) | Out of scope; separate domain | HIGH |
| WhatsApp notification delivery | Requires real phone numbers + provider | HIGH |
| Email delivery (Resend) | Requires real email addresses; not marketplace-critical | MEDIUM |
| Vercel Blob storage direct writes | Tested via upload API; Blob internals not QA concern | LOW |
| Rate limiting bypass | Should respect limits, not bypass them | MEDIUM |
| Multi-session concurrent users | Requires orchestration complexity not needed yet | HIGH |
| Dispute resolution flow (buyer opens dispute) | Complex state machine; manual testing preferred until stable | MEDIUM |

---

## 15. Pre-existing QA Data Required Before Each Module

| Module | Required Data | How to Ensure |
|--------|--------------|---------------|
| QA-00 | `.env.local` with `DATABASE_URL`, `APP_URL`, `QA_*` vars | Manual; validated by QA-00 itself |
| QA-01 | `buyerIA`, `sellerIA`, SUPER users (no ban, correct password) | Run `setup-marketplace-qa-accounts.ts` |
| QA-02 | `sellerIA` logged in; payout method exists | QA-01 must pass |
| QA-03 | At least 1 ACTIVE listing by sellerIA | QA-02 must pass (or pre-existing `selleria-qa-e2e-persistente`) |
| QA-04 | Listing with slug; buyerIA and sellerIA logged in | QA-01 + QA-02/03 |
| QA-05 | ACTIVE listing; buyerIA logged in; sellerIA not same as buyer | QA-01 + QA-03 |
| QA-06 | TX in PENDING_PAYMENT; local proof image in `D:\Users\mvera\Downloads` | QA-05 must pass |
| QA-07 | TX with PAYMENT_RECEIVED; SUPER logged in | QA-06 must pass |
| QA-08 | TX in IN_ESCROW; sellerIA logged in | QA-07 must pass |
| QA-09 | seller delivered; buyerIA logged in | QA-08 must pass |
| QA-10 | TX DELIVERY_CONFIRMED; SUPER logged in; seller payout method active | QA-09 must pass |
| QA-11 | Various TX states for dashboard data | QA-01 through QA-10 |
| QA-12 | All prior modules must pass | QA-00 through QA-11 |

---

## 16. Sprint Roadmap

| Sprint | Scope | Modules | Browser? | Est. Effort |
|--------|-------|---------|----------|-------------|
| **S03E** (current) | Architecture + base helpers + roadmap | `lib/*`, stubs, docs | No browser | Done |
| **S03F** | Login + Publish + Discovery | QA-00, QA-01, QA-02, QA-03 | Playwright smoke optional | Medium |
| **S03G** | Purchase + Payment Proof | QA-04, QA-05, QA-06 | Playwright for upload | High |
| **S03H** | Seller Delivery + Buyer Receipt | QA-08, QA-09 | No browser | Low |
| **S03I** | Admin Review + Payout + Notifications | QA-07, QA-10, QA-11 | Playwright for UI | Medium |
| **S03J** | Final Regression + Dispatcher Update | QA-12, dispatcher, runbook | Full suite | Medium |

---

## 17. Implementation Status — S03E

### Created / Modified Files
| File | Status |
|------|--------|
| `docs/marketplace/QA_HARNESS_ARCHITECTURE.md` | CREATED (this file) |
| `docs/07_handoffs/QA_E2E_ROADMAP_2026-05-10.md` | CREATED |
| `scripts/qa/lib/env.mjs` | CREATED |
| `scripts/qa/lib/report.mjs` | CREATED |
| `scripts/qa/lib/app-url.mjs` | CREATED |
| `scripts/qa/lib/assets.mjs` | CREATED |
| `scripts/qa/lib/failures.mjs` | CREATED |
| `scripts/qa/lib/retry.mjs` | CREATED |
| `scripts/qa/modules/qa-00-preflight.mjs` | STUB |
| `scripts/qa/modules/qa-01-login.mjs` | STUB |
| `scripts/qa/run-marketplace-qa.mjs` | SCAFFOLD |
| `scripts/qa/marketplace-e2e-checklist.md` | EXISTING (unchanged) |
| `docs/07_handoffs/qa-dispatcher.json` | UPDATED (added new tasks) |

### Ready Modules
- `lib/env.mjs` — env loading + validation
- `lib/report.mjs` — JSON + Markdown report generation
- `lib/app-url.mjs` — App URL reachability check
- `lib/assets.mjs` — Local asset discovery and validation
- `lib/failures.mjs` — Failure codes and classification
- `lib/retry.mjs` — Retry wrapper with max attempts

### Pending Modules
- `lib/db-read.mjs` — Safe DB read queries (S03F)
- `lib/server-action.mjs` — Server action invocation (S03F)
- `lib/session.mjs` — Server-side login (S03F)
- QA-01 through QA-12 full implementations (S03F-S03J)
- Playwright integration (S03F, pending authorization)

---

## 18. Appendix — Prisma Models Quick Reference

| Model / Table | Key Fields |
|---------------|-----------|
| `MpUser` / `mp_users` | id, email, displayName, passwordHash, role(USER/SOCIO/SUPER), isSeller, isBanned, isVerified |
| `MpListing` / `mp_listings` | id, sellerId, title, slug, category, price, status(DRAFT/ACTIVE/PAUSED/SOLD_OUT/ARCHIVED), coverImageUrl |
| `MpTransaction` / `mp_transactions` | id, buyerId, sellerId, listingId, status (11 states), paymentMethod, amount, paymentProofUrl, escrowHeldAt, escrowReleaseAt, buyerConfirmedAt |
| `MpTransactionStatusHistory` / `mp_transaction_status_history` | id, transactionId, fromStatus, toStatus, changedBy, reason, metadata |
| `MpPayout` / `mp_payouts` | id, sellerId, amount, method, status(PENDING/PROCESSING/COMPLETED/FAILED/CANCELLED), transactionIds[] |
| `MpPayoutMethod` / `mp_payout_methods` | id, userId, methodType(ZELLE/PAGO_MOVIL/CRYPTO_WALLET/BANK_TRANSFER), isDefault, encryptedData |
| `MpListingQuestion` / `mp_listing_questions` | id, listingId, askerId, question, answer, answeredAt |
| `MpChatThread` / `mp_chat_threads` | id, buyerId, sellerId, listingId, isActive, lastMessageAt |
| `MpMessage` / `mp_messages` | id, threadId, senderId, receiverId, content, isRead, readAt |
| `MpDispute` / `mp_disputes` | id, transactionId, openedById, reason, status |
| `MpBlobObjectMetadata` / `mp_blob_object_metadata` | id, url, pathname, entityType, entityId |
