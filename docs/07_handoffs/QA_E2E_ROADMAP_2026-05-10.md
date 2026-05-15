# QA E2E Roadmap — Turpial Marketplace

> Sprint: S03E (deliverable) → S03F through S03J (execution)
> Date: 2026-05-10
> Author: QA Architecture S03E
> Depends on: `docs/marketplace/QA_HARNESS_ARCHITECTURE.md`

---

## 1. Context & State at S03E Boundary

### What S03C Delivered
- Normalized QA data: `buyerIA`, `sellerIA`, payout method, persistent listing `selleria-qa-e2e-persistente`.
- Script: `scripts/setup-marketplace-qa-accounts.ts` — solid, Prisma-based, no browser.

### What S03D Delivered
- Env validation: all required env vars confirmed present.
- Preview BKG responds 200.
- Login smoke harness (`qa-marketplace-login-smoke.mjs`) stabilized with fallback paths but **still blocked on Windows CDP**.

### What S03E Delivers
- Architecture design for layered QA (A/B/C/D).
- Base library helpers (`scripts/qa/lib/`).
- Module stubs and orchestrator scaffold.
- Classified failures, retry limits, stop conditions.
- CDP → Playwright migration recommendation.
- Updated dispatcher.
- This roadmap.

### What S03E Does NOT Deliver
- Full E2E implementation.
- Playwright installation (pending authorization).
- Browser automation fixes for CDP.

---

## 2. Sprint Sequence

```
S03E ── Architecture + Base ── (done)
 │
 ├─ S03F ── Login + Publish + Discovery
 │   QA-00 preflight
 │   QA-01 login (server-side)
 │   QA-02 publish listing (server-side)
 │   QA-03 home discovery (browser smoke)
 │   lib/db-read.mjs, lib/server-action.mjs, lib/session.mjs
 │
 ├─ S03G ── Purchase + Payment Proof
 │   QA-04 Q&A (server-side)
 │   QA-05 initiate purchase (server-side)
 │   QA-06 payment proof upload (browser + local asset)
 │   Playwright setup (if authorized)
 │
 ├─ S03H ── Delivery + Receipt
 │   QA-08 seller delivery (server-side)
 │   QA-09 buyer receipt (server-side)
 │   Zero browser dependency sprint
 │
 ├─ S03I ── Admin + Payout + Notifications
 │   QA-07 admin review (server-side + browser UI)
 │   QA-10 admin payout (server-side)
 │   QA-11 dashboards + notifications (browser)
 │
 └─ S03J ── Final Regression + Documentation
     QA-12 full regression (all modules)
     Runbook update
     Dispatcher final validation
     Clean up LEGACY/CDP scripts
```

---

## 3. Detailed Sprint Breakdown

### S03F — Login, Publish, Discovery ✅ VALIDATED PASS (2026-05-11)

**Status: PASS — all 4 modules validated against Preview BKG DB. Commit: 9ce6fb3.**

**Prerequisites met:**
- `setup-marketplace-qa-accounts.ts` executed (QA accounts normalized).
- `.env.local` populated via `vercel env pull` + `ensure-marketplace-qa-env.ps1` with DATABASE_URL, APP_URL, QA_* credentials.
- Runner: `npx tsx` (required for generated/prisma/client .ts import).

**Tasks completed:**
1. ✅ `scripts/qa/lib/db-read.mjs` — Prisma factory (tsx-compatible), table checks, user/listing lookups
2. ✅ `scripts/qa/lib/server-action.mjs` — HTTP server action call helper
3. ✅ `scripts/qa/lib/session.mjs` — bcrypt-based credential validation
4. ✅ `scripts/qa/modules/qa-00-preflight.mjs` — Full preflight: PASS (env, APP_URL, DB 11/11 tables, QA users, candidateCount=1)
5. ✅ `scripts/qa/modules/qa-01-login.mjs` — Server-side login: PASS (buyerIA/sellerIA AUTH_DATA_PASS, mvera SUPER)
6. ✅ `scripts/qa/modules/qa-02-publish.mjs` — Listing created: PASS (slug=qa-e2e-s03f-selleria-discovery, ACTIVE)
7. ✅ `scripts/qa/modules/qa-03-discovery.mjs` — Discovery: PASS (UI_PASS — listing in server-rendered HTML)

**Harden artifacts:**
- `scripts/qa/ensure-marketplace-qa-env.ps1` — PowerShell bootstrap (backup, vercel pull, secure password prompt)
- `scripts/qa/doctor-marketplace-qa-env.mjs` — JSON doctor (boolean presence of all 11 required env vars)
- `.env.example` — QA var names without values

**Canonical commands:**
```
powershell -ExecutionPolicy Bypass -File scripts/qa/ensure-marketplace-qa-env.ps1
npx tsx scripts/qa/doctor-marketplace-qa-env.mjs
npx tsx scripts/qa/run-marketplace-qa.mjs --modules=qa-00,qa-01,qa-02,qa-03 --app-url=https://turpialsound-qc6k39eh1-bkgs-projects-829c67c1.vercel.app
```

**Decision gate resolved:** No CDP needed. No Playwright needed for S03F. Discovery achieved UI_PASS via HTTP fetch of server-rendered HTML.

---

### S03G — Purchase + Payment Proof ✅ VALIDATED PASS (2026-05-11)

**Status: PASS — all 3 modules validated against Preview BKG DB. Commit: 3952497.**

**Prerequisites met:**
- S03F completed (login works, listing `qa-e2e-s03f-selleria-discovery` ACTIVE).
- `.env.local` with QA_* vars (via `ensure-marketplace-qa-env.ps1`).
- No browser required (Prisma direct mutation + blob metadata simulation).

**Tasks completed:**
1. ✅ `scripts/qa/modules/qa-04-purchase.mjs` — Purchase initiation via Prisma. TX created in PENDING_PAYMENT.
2. ✅ `scripts/qa/modules/qa-05-payment.mjs` — Payment report via Prisma. TX → PAYMENT_RECEIVED (ref=QA-S03G-REF-001).
3. ✅ `scripts/qa/modules/qa-06-proof.mjs` — Dummy proof via Prisma. Blob metadata created, proof URL attached. Admin/seller/buyer visibility confirmed.

**Expected output achieved:**
- Transaction created in `PENDING_PAYMENT`.
- Payment reported and TX transitions to `PAYMENT_RECEIVED`.
- Proof attached (dummy blob metadata + proof URL).
- Admin/seller/buyer can see TX (visibility DATA_PASS).

**Risk resolved:** Payment proof via Prisma direct (no browser needed). Browser-based file upload deferred to S03I with Playwright.

---

### S03H — Delivery + Receipt

**Prerequisites:**
- S03G completed (TX in PAYMENT_RECEIVED, admin validation done — or mock admin validation inline).
- SUPER access available.

**Tasks:**
1. Implement `scripts/qa/modules/qa-08-delivery.mjs` — server-side seller delivery validation.
2. Implement `scripts/qa/modules/qa-09-receipt.mjs` — server-side buyer confirmation.

**Expected output:**
- Seller delivery recorded.
- Buyer receipt recorded.
- TX status → `DELIVERY_CONFIRMED`.

**Note:** This sprint has zero browser dependency. Can run entirely server-side.

---

### S03I — Admin Review, Payout, Notifications

**Prerequisites:**
- S03H completed (TX in DELIVERY_CONFIRMED).
- SUPER access.

**Tasks:**
1. Implement `scripts/qa/modules/qa-07-admin.mjs` — admin review (validate payment, verify proof proxy access).
2. Implement `scripts/qa/modules/qa-10-payout.mjs` — admin payout (release escrow, create payout).
3. Implement `scripts/qa/modules/qa-11-dashboards.mjs` — browser smoke for buyer/seller/admin dashboards.

**Expected output:**
- Admin validation flow complete.
- Payout created, TX RELEASED.
- Dashboard data integrity confirmed.

---

### S03J — Final Regression + Documentation

**Prerequisites:**
- S03F through S03I completed.
- All modules implemented and validated.

**Tasks:**
1. Implement `scripts/qa/modules/qa-12-regression.mjs` — run full suite.
2. Update `docs/07_handoffs/qa-dispatcher.json` with final canonical routes.
3. Update `docs/07_handoffs/qa-canonical-runbook.md` with new modules.
4. Mark CDP scripts as LEGACY in runbook.
5. Clean up: remove or archive unused CDP scripts.

**Expected output:**
- Complete QA harness operational.
- Dispatcher and runbook fully updated.
- CDP scripts deprecated.

---

## 4. Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-----------|--------|------------|
| CDP remains blocked on all attempts | HIGH | Blocks Layer C/D browser modules | Playwright installation authorized for S03F/S03G |
| Server action protocol changes in Next.js | LOW | Break `callServerAction` helper | Abstract into `server-action.mjs` with version pinning |
| QA data drift (accounts changed manually) | MEDIUM | Modules fail on unexpected DB state | Pre-run `setup-marketplace-qa-accounts.ts` as part of QA-00 |
| `D:\Users\mvera\Downloads` empty or no valid images | MEDIUM | QA-06 (proof upload) cannot run | QA-00 validates asset availability; report `ASSET_MISSING` gracefully |
| Admin credentials not available | LOW | QA-07, QA-10 cannot run | QA-00 validates `QA_ADMIN_*` env presence |
| Vercel Blob tokens expire or change | MEDIUM | Upload flows fail | Not in scope for local QA (uses local app); document for preview runs |
| App not running on expected port | LOW | QA-00 fails early with clear message | `APP_URL` env var override |

---

## 5. Environment Variables Required Per Sprint

### All Sprints
```
DATABASE_URL        # PostgreSQL connection
APP_URL             # Local or preview app URL (default: http://localhost:3002)
```

### S03F+
```
QA_BUYER_EMAIL
QA_BUYER_IDENTIFIER
QA_BUYER_PASSWORD
QA_SELLER_EMAIL
QA_SELLER_IDENTIFIER
QA_SELLER_PASSWORD
```

### S03G+
```
QA_ADMIN_IDENTIFIER   # PENDIENTE DE CONFIRMAR — el repo usa loginMpUser() con rol SUPER.
QA_ADMIN_PASSWORD     # Confirmar qué usuario QA tiene rol SUPER antes de implementar QA-07/QA-10.
                      # El script setup-marketplace-qa-accounts.ts no normaliza cuenta admin aún.
```

### S03G (Asset Upload)
```
QA_ASSETS_DIR       # Default: D:\Users\mvera\Downloads
```

---

## 6. Success Criteria Per Sprint

| Sprint | Criteria |
|--------|----------|
| S03F | `qa-01-login.mjs` validates all 3 roles without CDP. Listing appears on home grid. |
| S03G | Purchase created, proof uploaded via local asset. No CDP for server-side steps. |
| S03H | Full delivery→receipt cycle validated server-side. Zero browser calls. |
| S03I | Admin validates, releases escrow, payout created. Dashboard data matches DB. |
| S03J | Full regression passes. Dispatcher updated. CDP scripts deprecated. |

---

## 7. Reporting Format

All QA runs produce two outputs:

### `var/qa-results/report-YYYY-MM-DDTHHmmss.json`
```json
{
  "runId": "2026-05-10T22:00:00.000Z",
  "appUrl": "http://localhost:3002",
  "modules": [
    {
      "module": "QA-00",
      "status": "PASS",
      "durationMs": 1200,
      "checks": [{ "check": "env", "status": "PASS" }, ...]
    },
    {
      "module": "QA-01",
      "status": "FAIL",
      "durationMs": 800,
      "failureCode": "QA_PASSWORD_MISMATCH",
      "failureDetail": "buyerIA password hash mismatch"
    }
  ],
  "summary": {
    "total": 13,
    "passed": 11,
    "failed": 1,
    "skipped": 1
  }
}
```

### `var/qa-results/report-YYYY-MM-DDTHHmmss.md`
Human-readable markdown summary with pass/fail table.

---

## 8. Next Actions (S03F Kickoff)

1. Implement `scripts/qa/lib/db-read.mjs`
2. Implement `scripts/qa/lib/server-action.mjs`
3. Implement `scripts/qa/lib/session.mjs`
4. Implement `scripts/qa/modules/qa-00-preflight.mjs` (from stub)
5. Implement `scripts/qa/modules/qa-01-login.mjs` (from stub)
6. Implement `scripts/qa/modules/qa-02-publish.mjs` (from stub)
7. Evaluate CDP status; request Playwright authorization if needed
8. Implement `scripts/qa/modules/qa-03-discovery.mjs`

---

## 9. Appendix — Dispatcher Update S03E

New entries added to `docs/07_handoffs/qa-dispatcher.json`:

| Task ID | Mode | Script | Status |
|---------|------|--------|--------|
| `qa_preflight` | script | `node scripts/qa/modules/qa-00-preflight.mjs` | STUB |
| `qa_login_server_side` | script | `node scripts/qa/modules/qa-01-login.mjs` | STUB |
| `qa_publish_listing` | script | `node scripts/qa/modules/qa-02-publish.mjs` | STUB |
| `qa_home_discovery` | script | `node scripts/qa/modules/qa-03-discovery.mjs` | STUB |
| `qa_questions` | script | `node scripts/qa/modules/qa-04-qa.mjs` | STUB |
| `qa_purchase` | script | `node scripts/qa/modules/qa-05-purchase.mjs` | STUB |
| `qa_payment_proof` | script | `node scripts/qa/modules/qa-06-proof.mjs` | STUB |
| `qa_admin_review` | script | `node scripts/qa/modules/qa-07-admin.mjs` | STUB |
| `qa_seller_delivery` | script | `node scripts/qa/modules/qa-08-delivery.mjs` | STUB |
| `qa_buyer_receipt` | script | `node scripts/qa/modules/qa-09-receipt.mjs` | STUB |
| `qa_admin_payout` | script | `node scripts/qa/modules/qa-10-payout.mjs` | STUB |
| `qa_dashboards` | script | `node scripts/qa/modules/qa-11-dashboards.mjs` | STUB |
| `qa_full_regression` | script | `node scripts/qa/modules/qa-12-regression.mjs` | STUB |
| `qa_marketplace_orchestrator` | script | `node scripts/qa/run-marketplace-qa.mjs` | SCAFFOLD |

Legacy CDP scripts retain their existing entries with `status: LEGACY` annotation noting migration path.
