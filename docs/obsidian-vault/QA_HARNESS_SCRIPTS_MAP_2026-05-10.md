# QA Harness Scripts Map — Turpial Marketplace

> Status: S03E architecture/base (2026-05-10)
> Branch: origin/Manuel/s03e-marketplace-qa-harness-architecture-2026-05-10
> Ref: `docs/marketplace/QA_HARNESS_ARCHITECTURE.md`

---

## Script Inventory

### Setup / Normalization (CANONICAL)

| Script | Status | Capa | Qué valida | Entrada | Salida | Depende de | Próximo sprint |
|--------|--------|------|------------|---------|--------|------------|----------------|
| `scripts/setup-marketplace-qa-accounts.ts` | **CANONICAL** | DB direct | Normaliza buyerIA, sellerIA, payout seller, listing persistente | `DATABASE_URL`, `QA_BUYER_*`, `QA_SELLER_*` env vars | JSON summary | Prisma, bcrypt | Preliminar a cualquier QA |

### Legacy CDP Scripts (LEGACY/FLAKY)

| Script | Status | Capa | Qué valida | Entrada | Salida | Depende de | Próximo sprint |
|--------|--------|------|------------|---------|--------|------------|----------------|
| `scripts/qa-marketplace-login-smoke.mjs` | **LEGACY** — CDP bloqueado en Windows | C | Login UI de buyer y seller via Chrome headless | `APP_URL`, `QA_BUYER_*`, `QA_SELLER_*`, Chrome instalado | JSON (ok/fail) | Chrome CDP | Migrar a QA-01 (S03F) |
| `scripts/qa-marketplace-qa-accounts.mjs` | **LEGACY** — CDP | D | Flujo buyer→seller→admin completo | `APP_URL`, cuentas QA normalizadas, Chrome | JSON | `setup-marketplace-qa-accounts.ts`, CDP | Migrar a QA-04 a QA-11 (S03G–S03I) |
| `scripts/qa-marketplace-seller-smoke.mjs` | **LEGACY** — CDP | C | Dashboard seller: ventas, mensajes, cobros | `APP_URL`, seller QA, Chrome | JSON | CDP, seller creds | Migrar a QA-11 (S03I) |
| `scripts/qa-marketplace-assistant-smoke.mjs` | **LEGACY** — CDP | C | AI assistant FAB smoke | `APP_URL`, Chrome | JSON | CDP | Migrar o integrar en QA-11 (S03I) |

### Missing — Referenced in Dispatcher (GAP OPERATIVO)

| Script | Status |
|--------|--------|
| `scripts/qa-marketplace-admin-smoke.mjs` | **MISSING** — no existe en disco. Reemplazar por QA-07. |
| `scripts/qa-marketplace-buyer.mjs` | **MISSING** — no existe en disco. Reemplazar por QA-05 + QA-06. |
| `scripts/qa-marketplace-reconcile.mjs` | **MISSING** — no existe en disco. Reemplazar por QA-10. |

---

### Library Helpers (scripts/qa/lib/) — S03E

| Script | Status | Capa | Qué valida | Browser? | DB touch? | Depende de | Próximo sprint |
|--------|--------|------|------------|----------|-----------|------------|----------------|
| `env.mjs` | **IMPLEMENTED** | A | Carga `.env.local`/`.env`, `requireEnv()`, `maskSecret()`. Errores incluyen mensaje accionable: `Run: powershell ... ensure-marketplace-qa-env.ps1` | No | No | `node:fs` | S03F ✅ |
| `report.mjs` | **READY** | A | `ReportBuilder`: JSON + MD reports, summary | No | No | `node:fs` | S03F |
| `app-url.mjs` | **READY** | A | `checkAppUrl()`, `waitForAppUrl()` — TCP reachability | No | No | `env.mjs`, `fetch` | S03F |
| `assets.mjs` | **READY** | A | `findAssets()`, `validateAsset()`, `pickPaymentProof()` desde `D:\Users\mvera\Downloads` | No | No | `node:fs` | S03G |
| `failures.mjs` | **READY** | A | 23 failure codes, `classifyError()`, `formatFailure()` | No | No | None | S03F |
| `retry.mjs` | **READY** | A | `withRetry(fn, {maxAttempts})` con límites por código de fallo | No | No | `failures.mjs` | S03F |
| `db-read.mjs` | **IMPLEMENTED** | B | Safe read-only Prisma queries: getPrisma, checkDbTables, findUserByIdentifier, findListingBySlug | No | **Solo reads** | `DATABASE_URL`, Prisma, tsx | S03F ✅ |
| `server-action.mjs` | **IMPLEMENTED** | B | HTTP server action call helper + session cookie header builder | No | **Solo reads** | App URL, fetch | S03F ✅ |
| `session.mjs` | **IMPLEMENTED** | B | Server-side login validation: bcrypt verify + profile checks (isSeller, role, isBanned) | No | **Solo reads** | `db-read.mjs`, bcryptjs | S03F ✅ |

### Bootstrap & Doctor (scripts/qa/) — S03F

| Script | Status | Capa | Qué hace | Browser? | DB touch? | Depende de | Próximo sprint |
|--------|--------|------|----------|----------|-----------|------------|----------------|
| `ensure-marketplace-qa-env.ps1` | **IMPLEMENTED** | A | Bootstrap: verifica/pull/crea .env.local con QA_* vars. Pide contraseña segura UNA vez. Nunca imprime secretos. | No | No | vercel CLI | S03F ✅ |
| `doctor-marketplace-qa-env.mjs` | **IMPLEMENTED** | A | Doctor: JSON seguro con presencia booleana de todas las env vars necesarias. Exit code 1 con mensaje accionable si faltan. | No | No | `env.mjs` | S03F ✅ |

---

### Module Stubs (scripts/qa/modules/) — S03E → S03J

| Script | Status | Capa | Qué valida | Browser? | DB touch? | Assets? | Depende de | Próximo sprint |
|--------|--------|------|------------|----------|-----------|---------|------------|----------------|
| `qa-00-preflight.mjs` | **IMPLEMENTED** — env, appURL, DB, tables, accounts, candidateCount | A | Env vars presentes, app URL responde 200, DB tables, QA users | No | No | No | `env.mjs`, `app-url.mjs`, `db-read.mjs` | S03F ✅ |
| `qa-01-login.mjs` | **IMPLEMENTED** — bcrypt + Prisma | B | Login server-side: bcrypt password hash + profile checks | No | **Solo reads** | No | `session.mjs`, QA-00 | S03F ✅ |
| `qa-02-publish.mjs` | **IMPLEMENTED** — Prisma direct mutation | B | Crear/reconciliar listing QA via Prisma (slug=qa-e2e-s03f-selleria-discovery) | No | **Escribe listing QA** | No | QA-01 | S03F ✅ |
| `qa-03-discovery.mjs` | **IMPLEMENTED** — DB + HTTP fetch | C | DB read + HTTP fetch /marketplace, classify DATA_PASS/UI_PASS/BROWSER_REQUIRED | **Parcial** (HTTP fetch) | No | No | QA-02 | S03F ✅ |
| `qa-04-qa.mjs` | **STUB** | B | Q&A: `askQuestion()` + `answerQuestion()` via server | No | **Solo reads** | No | QA-01 | S03G |
| `qa-05-purchase.mjs` | **STUB** | B | `initiatePurchase()` via server + DB verify | No | **Solo reads** | No | QA-01 | S03G |
| `qa-06-proof.mjs` | **STUB** | D | Upload payment proof usando asset local | **Sí** (file picker) | No | **Sí** — `D:\Users\mvera\Downloads` | QA-05, `assets.mjs` | S03G |
| `qa-07-admin.mjs` | **STUB** | B/C | Admin: `validatePayment()` server + proof proxy UI | Opcional (UI) | **Solo reads** | No | QA-06, SUPER login | S03I |
| `qa-08-delivery.mjs` | **STUB** | B | `sellerDeliver()` via server | No | **Solo reads** | No | QA-07 | S03H |
| `qa-09-receipt.mjs` | **STUB** | B | `confirmDelivery()` via server | No | **Solo reads** | No | QA-08 | S03H |
| `qa-10-payout.mjs` | **STUB** | B/D | `releaseEscrow()` + `adminMarkSellerPaid()` | Opcional (UI) | **Solo reads** | No | QA-09, SUPER login | S03I |
| `qa-11-dashboards.mjs` | **STUB** | C/D | Dashboards buyer/seller/admin + notificaciones | **Sí** | No | No | QA-01 a QA-10 | S03I |
| `qa-12-regression.mjs` | **STUB** | A-D | Full suite orchestration | Ambas | No | No | QA-00 a QA-11 | S03J |

### Orchestrator

| Script | Status | Capa | Qué valida | Próximo sprint |
|--------|--------|------|------------|----------------|
| `run-marketplace-qa.mjs` | **PARTIAL** — QA-00..QA-03 implemented, supports --modules= & --app-url= | A-D | Corre todos los módulos en secuencia. Soporta `--module=<ID>`, `--modules=<ID1,ID2,...>`, `--app-url=<URL>`. | S03F (partial) → S03J (full) |

---

## Clasificación por riesgo

### Sin browser (Layer B) — 7 módulos
QA-01, QA-02, QA-04, QA-05, QA-08, QA-09, + helpers

### Requiere browser real (Layer C/D) — 5 módulos
QA-03, QA-06, QA-07 (UI), QA-10 (UI), QA-11

### Preflight (Layer A) — 1 módulo
QA-00

---

## No deben tocar producción / DB

- **Ningún script QA** debe correr contra producción o DB de producción.
- Solo el script `setup-marketplace-qa-accounts.ts` escribe en DB (y solo si `DATABASE_URL` apunta a dev local).
- Los módulos QA usan solo DB reads para verificar estado; nunca insertan/actualizan/eliminan.
- `releaseEscrow()`, `adminMarkSellerPaid()`, etc. se llaman via server actions de la app (no directo a DB).

---

## Sprint assignment

| Sprint | Módulos | Browser? |
|--------|---------|----------|
| **S03E** (actual) | Arquitectura + lib helpers + stubs | No |
| **S03F** | QA-00 (complete), QA-01, QA-02, QA-03 | Sí (QA-03) |
| **S03G** | QA-04, QA-05, QA-06 | Sí (QA-06) |
| **S03H** | QA-08, QA-09 | **No** (sprint sin browser) |
| **S03I** | QA-07, QA-10, QA-11 | Sí (dashboards) |
| **S03J** | QA-12 + dispatcher cleanup + CDP deprecation | Full suite |
