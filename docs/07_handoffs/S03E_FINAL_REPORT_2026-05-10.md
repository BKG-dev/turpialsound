# S03E Final Report — Marketplace QA Harness Architecture

> Sprint: S03E
> Date: 2026-05-10
> Operator: Manuel
> Branch: `Manuel/s03e-marketplace-qa-harness-architecture-2026-05-10`
> Base: S03D commit `f3b26ee`
> Mode: architecture + implementation-plan (no E2E execution)
> Status: **CLOSED**

---

## 1. Sprint Objective

Diseñar una arquitectura QA profesional para Turpial Marketplace que reemplace scripts frágiles (CDP) por módulos determinísticos, escalables y con fallos clasificados. No ejecutar flujos E2E completos. No tocar producción. No booking. No DB mutation.

---

## 2. Commits

```
e8ddf2c docs(qa): add Obsidian scripts map and canvas for QA harness navigation
e6ee1cf feat(qa): design layered QA architecture for marketplace E2E harness
```

Base: `f3b26ee` (S03D — login smoke harness stabilization)

---

## 3. Repo Study — Findings

### 3.1 Server Actions Inventoried

| File | Functions | Prisma Models |
|------|-----------|---------------|
| `actions/marketplace/auth.ts` | `registerMpUser`, `loginMpUser`, `logoutMpUser`, `requestPasswordReset`, `resetPassword` | `MpUser` |
| `actions/marketplace/listings.ts` | `getActiveListings`, `getListingById`, `getListingBySlug`, `getListingsByCategory`, `getUserListings`, `updateListingStatus`, `incrementListingView`, `createListing` | `MpListing`, `MpUser`, `MpTransaction` |
| `actions/marketplace/transactions.ts` | `initiatePurchase`, `submitPaymentProof`, `validatePayment`, `sellerDeliver`, `confirmDelivery`, `releaseEscrow`, `openDispute`, `resolveDispute`, `cancelTransaction`, `getTransaction`, `getMyTransactions` | `MpTransaction`, `MpTransactionStatusHistory`, `MpListing`, `MpDispute`, `MpUser` |
| `actions/marketplace/admin.ts` | `getAdminStats`, `getEscrowList`, `getPayoutReport`, `adminValidatePayment`, `adminReleaseEscrow`, `adminMarkSellerPaid`, `adminResolveDispute`, `adminCancelTransaction`, `adminGetUsers`, `adminBanUser`, `adminUnbanUser`, `adminSetUserRole`, `adminVerifyUser` | `MpTransaction`, `MpListing`, `MpUser`, `MpDispute`, `MpPayout`, `MpPayoutMethod` |
| `actions/marketplace/chat.ts` | `getOrCreateThread`, `sendMessage`, `sendSystemMessage`, `getThreadMessages`, `getMyThreads`, `markMessagesRead`, `getUnreadCount`, `closeThread` | `MpChatThread`, `MpMessage` |
| `actions/marketplace/questions.ts` | `getMyInteractedListings`, `getListingQuestions`, `askQuestion`, `answerQuestion` | `MpListingQuestion`, `MpListing`, `MpChatThread`, `MpMessage` |
| `actions/marketplace/users.ts` | `getMyProfile`, `updateProfile`, `getUserProfile`, `becomeSeller`, `addPayoutMethod`, `getPayoutMethods`, `setDefaultPayoutMethod`, `removePayoutMethod` | `MpUser`, `MpListing`, `MpPayoutMethod` |
| `actions/marketplace/favorites.ts` | `toggleFavorite`, `getMyFavorites`, `getMyFavoriteIds` | `MpUser`, `MpListing` |

**Total: 55 server action functions across 8 files.**

### 3.2 Components Inventoried

| Component | File | Flow |
|-----------|------|------|
| `MarketplaceAuthModal` | `components/marketplace/MarketplaceAuthModal.tsx` | Auth (login/register/password reset) |
| `MarketplaceAuthBar` | `components/marketplace/MarketplaceAuthBar.tsx` | Session bar + provider |
| `MarketplaceCard` | `components/marketplace/MarketplaceCard.tsx` | Listing card in grid |
| `SellFormModal` | `components/marketplace/MarketplaceModals.tsx` | Create listing wizard |
| `CheckoutModal` | `components/marketplace/CheckoutModal.tsx` | Purchase + payment proof |
| `ListingDetailActions` | `components/marketplace/ListingDetailActions.tsx` | Buy/Message/Favorite actions |
| `TransactionChat` | `components/marketplace/TransactionChat.tsx` | Chat overlay |
| `ListingQASection` | `components/marketplace/ListingQASection.tsx` | Public Q&A on listing |
| `DashboardClient` | `components/marketplace/dashboard/DashboardClient.tsx` | Unified buyer/seller dashboard |
| `AdminDashboard` | `components/marketplace/admin/AdminDashboard.tsx` | Admin management panel |
| `AdminCopilotClient` | `components/marketplace/admin/AdminCopilotClient.tsx` | Admin AI copilot |

### 3.3 Prisma Models — Marketplace Domain

| Model | Table | Key Purpose |
|-------|-------|-------------|
| `MpUser` | `mp_users` | Marketplace users (USER/SOCIO/SUPER) |
| `MpListing` | `mp_listings` | Products/services for sale (ACTIVE/DRAFT/SOLD_OUT) |
| `MpTransaction` | `mp_transactions` | Payment lifecycle (11-status state machine) |
| `MpTransactionStatusHistory` | `mp_transaction_status_history` | Audit trail |
| `MpDispute` | `mp_disputes` | Conflict resolution |
| `MpPayout` | `mp_payouts` | Seller withdrawals |
| `MpPayoutMethod` | `mp_payout_methods` | Seller payment config |
| `MpChatThread` | `mp_chat_threads` | Buyer-seller conversations |
| `MpMessage` | `mp_messages` | Chat messages |
| `MpListingQuestion` | `mp_listing_questions` | Combined Q&A model |

### 3.4 Legacy QA Scripts Assessed

| Script | Filesize | Status | Verdict |
|--------|----------|--------|---------|
| `qa-marketplace-login-smoke.mjs` | 342 lines | CANONICAL / **LEGACY** | CDP blocked on Windows. Maintain temporarily; deprecate after S03F migration. |
| `qa-marketplace-qa-accounts.mjs` | 646 lines | CANONICAL / **LEGACY** | CDP-based full flow. Replace with modular QA-04 through QA-11. |
| `qa-marketplace-seller-smoke.mjs` | 626 lines | SUPPORTING / **LEGACY** | CDP seller dashboard. Migrate to QA-11. |
| `qa-marketplace-assistant-smoke.mjs` | 198 lines | Not classified | Migrate or integrate into QA-11. |
| `qa-marketplace-admin-smoke.mjs` | MISSING | **GAP OPERATIVO** | Referenced in dispatcher, not on disk. Replace with QA-07. |
| `qa-marketplace-buyer.mjs` | MISSING | **GAP OPERATIVO** | Replace with QA-05 + QA-06. |
| `qa-marketplace-reconcile.mjs` | MISSING | **GAP OPERATIVO** | Replace with QA-10. |
| `setup-marketplace-qa-accounts.ts` | 307 lines | **CANONICAL / SOLID** | Prisma-based. No browser. Keep as foundation. |

---

## 4. Architecture Design

### 4.1 Four Validation Layers

```
Layer A — PREFLIGHT: env vars, app URL, DB tables (no browser, no DB write)
Layer B — SERVER-SIDE: Prisma reads, server actions, session validation (no browser)
Layer C — BROWSER SMOKE: minimal UI verification (browser required)
Layer D — E2E MODULAR: full flow with browser + assets
```

### 4.2 Module Map

| Module | Layer | Name | Browser? | Sprint |
|--------|-------|------|----------|--------|
| QA-00 | A | Preflight | No | S03E (partial) → S03F |
| QA-01 | B | Login | No | S03F |
| QA-02 | B | Publish Listing | No | S03F |
| QA-03 | C | Home Discovery | Yes | S03F |
| QA-04 | B | Q&A | No | S03G |
| QA-05 | B | Purchase Initiation | No | S03G |
| QA-06 | D | Payment Proof | Yes | S03G |
| QA-07 | B/C | Admin Review | Opt | S03I |
| QA-08 | B | Seller Delivery | No | S03H |
| QA-09 | B | Buyer Receipt | No | S03H |
| QA-10 | B/D | Admin Payout | Opt | S03I |
| QA-11 | C/D | Dashboards + Notifications | Yes | S03I |
| QA-12 | A-D | Final Regression | Both | S03J |

### 4.3 CDP → Playwright Migration Decision

CDP scripts are classified **LEGACY/FLAKY** because:
1. Raw CDP over WebSocket requires ~200 lines of boilerplate per script.
2. Blocked on Windows (persistent `BROWSER_CDP_BLOCKED` in S03D).
3. No retry, no screenshots, no trace, no cross-platform support.

**Recommendation:** Install Playwright as devDependency for Layer C/D modules. NOT installed yet — pending authorization in S03F.

### 4.4 Server-Side Validation Strategy

- **Prefer Prisma direct reads** for state verification (safest).
- **Use QA-only protected endpoints** for server-side write operations (NODE_ENV-gated).
- **Use browser only** for file picker, modal interactions, visual render verification.
- **Do NOT reverse-engineer Next.js Server Action protocol** (Next-Action headers) unless explicitly proven stable.

---

## 5. Deliverables Created

### Documentation

| File | Lines | Purpose |
|------|-------|---------|
| `docs/marketplace/QA_HARNESS_ARCHITECTURE.md` | ~440 | Full architecture: layers, modules, inventory, CDP assessment, failures, file structure, appendices |
| `docs/07_handoffs/QA_E2E_ROADMAP_2026-05-10.md` | ~240 | Sprint-by-sprint roadmap S03E→S03J with preconditions, tasks, success criteria, risk register |
| `docs/obsidian-vault/QA_HARNESS_SCRIPTS_MAP_2026-05-10.md` | ~100 | 30-script inventory table: status, layer, browser, DB, assets, sprint targets |
| `docs/obsidian-vault/QA_HARNESS_CANVAS_2026-05-10.canvas` | ~90 | 17-node Obsidian Canvas with 35 directed edges |

### Dispatcher

| File | Change |
|------|--------|
| `docs/07_handoffs/qa-dispatcher.json` | Version 2 — added `architecture` section, 14 new task_ids, `_s03e_note` annotations on legacy entries |

### Code — Library (6 files)

| File | Exports |
|------|---------|
| `scripts/qa/lib/env.mjs` | `loadEnv()`, `requireEnv()`, `getEnv()`, `requireEnvs()`, `maskSecret()` |
| `scripts/qa/lib/report.mjs` | `ReportBuilder` class: `start()`, `addModule()`, `addCheck()`, `summary()`, `writeJSON()`, `writeMD()` |
| `scripts/qa/lib/app-url.mjs` | `checkAppUrl()`, `waitForAppUrl()` |
| `scripts/qa/lib/assets.mjs` | `findAssets()`, `validateAsset()`, `pickListingImage()`, `pickPaymentProof()`, `copyToQaAssets()`, `isSensitiveName()`, `scrubSensitiveName()` |
| `scripts/qa/lib/failures.mjs` | `FailureCode` enum (23 codes), `classifyError()`, `formatFailure()` |
| `scripts/qa/lib/retry.mjs` | `withRetry()`, `getRetryLimit()` |

### Code — Modules (13 files)

| File | Status | Layer |
|------|--------|-------|
| `scripts/qa/modules/qa-00-preflight.mjs` | **PARTIAL** — env + appUrl functional | A |
| `scripts/qa/modules/qa-01-login.mjs` through `qa-12-regression.mjs` | **STUB** — structured skeleton with MODULE_ID, MODULE_NAME, LAYER | B/C/D |

### Code — Orchestrator

| File | Status |
|------|--------|
| `scripts/qa/run-marketplace-qa.mjs` | **SCAFFOLD** — sequential module runner with `--module=<ID>` selector, report generation |

---

## 6. Technical Inventory (Complete Flow Mapping)

| Flujo | Server Action | UI Component | Modelo |
|-------|--------------|-------------|--------|
| Login | `loginMpUser()` | `MarketplaceAuthModal` | `MpUser` |
| Publish | `createListing()` | `SellFormModal` | `MpListing` |
| Discovery | `getActiveListings()` | `MarketplacePageClient` | `MpListing`, `MpUser` |
| Detail | `getListingBySlug()` | `[slug]/page.tsx` | `MpListing` |
| Q&A | `askQuestion()`, `answerQuestion()` | `ListingQASection` | `MpListingQuestion` |
| Purchase | `initiatePurchase()` | `CheckoutModal` | `MpTransaction` |
| Proof | `submitPaymentProof()` + upload API | `CheckoutModal` | `MpTransaction`, `MpBlobObjectMetadata` |
| Admin Review | `validatePayment()` | `AdminDashboard` | `MpTransaction`, `MpTransactionStatusHistory` |
| Delivery | `sellerDeliver()` | `DashboardClient` (ActionCenter) | `MpTransactionStatusHistory` |
| Receipt | `confirmDelivery()` | `DashboardClient` (ActionCenter) | `MpTransaction` |
| Payout | `adminMarkSellerPaid()`, `releaseEscrow()` | `AdminDashboard` | `MpPayout`, `MpTransaction` |
| Notifications | `getUnreadCount()`, `getMyThreads()` | `DashboardClient` (ActionCenterSection) | `MpMessage`, `MpChatThread` |

---

## 7. Failure Classification (23 Codes)

| Code | Retries | Layer |
|------|---------|-------|
| `ENV_MISSING` | 1 | A |
| `PREVIEW_NOT_BKG` | 1 | A |
| `APP_URL_NOT_200` | 2 | A |
| `DB_MISSING_TABLE` | 1 | A |
| `QA_USER_MISSING` | 1 | B |
| `QA_PASSWORD_MISMATCH` | 1 | B |
| `BROWSER_CDP_BLOCKED` | 2 | C/D |
| `BROWSER_ENGINE_MISSING` | 1 | C/D |
| `SELECTOR_MISSING` | 2 | C/D |
| `LOGIN_FAILED` | 2 | B |
| `LISTING_CREATE_FAILED` | 2 | B |
| `LISTING_NOT_VISIBLE_HOME` | 3 | C |
| `QUESTION_NOT_CREATED` | 2 | B |
| `ANSWER_NOT_VISIBLE` | 3 | B |
| `PURCHASE_NOT_CREATED` | 2 | B |
| `PAYMENT_PROOF_UPLOAD_FAILED` | 2 | D |
| `ADMIN_REVIEW_NOT_VISIBLE` | 2 | C |
| `STATUS_TRANSITION_FAILED` | 1 | B |
| `NOTIFICATION_MISSING` | 3 | C/D |
| `DASHBOARD_BAD_STATE` | 2 | C/D |
| `PROTECTED_PROOF_ACCESS_FAILED` | 1 | C |
| `ASSET_MISSING` | 1 | D |
| `UNKNOWN` | 1 | All |

---

## 8. UI Selectors Needing `data-testid` (17 Identified)

| Element | Current Strategy | Proposed `data-testid` |
|---------|-----------------|----------------------|
| Login trigger button | Text search | `auth-trigger-login` |
| Login identifier input | Placeholder hints | `auth-input-identifier` |
| Login password input | type=password + hint | `auth-input-password` |
| Login submit button | Form scope text search | `auth-submit-login` |
| Logout button | Text search `'salir'` | `auth-logout` |
| Sell FAB/CTA | Text search (varies) | `sell-cta-open` |
| Sell form fields | Placeholder hints | `sell-input-*` |
| Listing card | Grid item link | `listing-card` |
| Checkout button | Text in action bar | `checkout-open` |
| Proof file input | input[type=file] | `proof-file-input` |
| Proof submit button | Text in modal | `proof-submit` |
| Admin validate button | Text in admin panel | `admin-validate-approve` |
| Seller deliver button | Text in action center | `seller-deliver` |
| Buyer confirm button | Text in action center | `buyer-confirm-receipt` |
| Tab navigation | Role/text search | `tab-*` |
| Chat message button | Action bar button | `chat-open` |
| Notification badge | Unread count element | `notification-badge` |

---

## 9. Asset Management Rules

- Source: `D:\Users\mvera\Downloads`
- Copy only to `var/qa-assets/` if needed for upload
- Validate extension (`.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`) and max size (10 MB)
- Block sensitive filenames (patterns: `comprobante`, `pago`, `cedula`, `cuenta`, `banco`, `firma`, `documento`, `identidad`, `pasaporte`)
- Report only basename in QA output (privacy)
- Never commit images or payment proofs

---

## 10. Validation Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | Clean (0 errors) |
| `npm run build` | Successful |
| `git diff --check` | Clean |
| `qa-dispatcher.json` JSON parse | Valid |
| `QA_HARNESS_CANVAS.canvas` JSON parse | Valid |

---

## 11. Next Sprints

### S03F — Login + Publish + Discovery
- Complete `lib/db-read.mjs`, `lib/session.mjs`
- Implement QA-01 (server-side login for 3 roles)
- Implement QA-02 (server-side create listing)
- Implement QA-03 (browser smoke: listing visible on home)
- Decision: authorize Playwright installation if CDP still blocked

### S03G — Purchase + Payment Proof
- Implement QA-04 (server-side Q&A)
- Implement QA-05 (server-side purchase)
- Implement QA-06 (browser + local asset upload)

### S03H — Delivery + Receipt (Zero browser sprint)
- Implement QA-08 (server-side seller delivery)
- Implement QA-09 (server-side buyer receipt)

### S03I — Admin + Payout + Notifications
- Implement QA-07 (admin review + proof proxy)
- Implement QA-10 (admin payout)
- Implement QA-11 (dashboards + notifications browser smoke)

### S03J — Final Regression
- Implement QA-12 (full suite)
- Update runbook
- Deprecate CDP scripts
- Dispatcher final validation

---

## 12. Outstanding Caveats

1. **QA_ADMIN_IDENTIFIER / QA_ADMIN_PASSWORD:** Contrato pendiente de confirmar. El repo usa `loginMpUser()` para todos los roles pero `setup-marketplace-qa-accounts.ts` no normaliza cuenta admin con rol SUPER. Confirmar antes de implementar QA-07/QA-10.

2. **Playwright:** No instalado aún. Requiere autorización en S03F. Mientras tanto, CDP scripts legacy se mantienen temporalmente.

3. **Missing scripts (GAP OPERATIVO):** `qa-marketplace-admin-smoke.mjs`, `qa-marketplace-buyer.mjs`, `qa-marketplace-reconcile.mjs` — reemplazados por módulos QA-07, QA-05/QA-06, QA-10 respectivamente.

4. **Server action protocol:** No se implementó `callServerAction()` HTTP — la estrategia validada prefiere Prisma reads + QA-only endpoints.

5. **`data-testid` attributes:** Ninguno existe aún en los componentes. Los 17 selectores identificados deben instrumentarse en el código fuente como parte de S03F.

---

## 13. Files Modified/Created — Complete List

```
docs/marketplace/QA_HARNESS_ARCHITECTURE.md           (CREATED)
docs/07_handoffs/QA_E2E_ROADMAP_2026-05-10.md         (CREATED)
docs/07_handoffs/qa-dispatcher.json                   (MODIFIED v1→v2)
docs/obsidian-vault/QA_HARNESS_SCRIPTS_MAP_2026-05-10.md  (CREATED)
docs/obsidian-vault/QA_HARNESS_CANVAS_2026-05-10.canvas   (CREATED)
scripts/qa/lib/env.mjs                                (CREATED)
scripts/qa/lib/report.mjs                             (CREATED)
scripts/qa/lib/app-url.mjs                            (CREATED)
scripts/qa/lib/assets.mjs                             (CREATED)
scripts/qa/lib/failures.mjs                           (CREATED)
scripts/qa/lib/retry.mjs                              (CREATED)
scripts/qa/modules/qa-00-preflight.mjs                (CREATED)
scripts/qa/modules/qa-01-login.mjs                    (CREATED)
scripts/qa/modules/qa-02-publish.mjs                  (CREATED)
scripts/qa/modules/qa-03-discovery.mjs                (CREATED)
scripts/qa/modules/qa-04-qa.mjs                       (CREATED)
scripts/qa/modules/qa-05-purchase.mjs                 (CREATED)
scripts/qa/modules/qa-06-proof.mjs                    (CREATED)
scripts/qa/modules/qa-07-admin.mjs                    (CREATED)
scripts/qa/modules/qa-08-delivery.mjs                 (CREATED)
scripts/qa/modules/qa-09-receipt.mjs                  (CREATED)
scripts/qa/modules/qa-10-payout.mjs                   (CREATED)
scripts/qa/modules/qa-11-dashboards.mjs               (CREATED)
scripts/qa/modules/qa-12-regression.mjs               (CREATED)
scripts/qa/run-marketplace-qa.mjs                     (CREATED)
```

**25 files total (22 created, 3 modified). No production impact. No DB changes. No payment proof real. No schema migrations.**
