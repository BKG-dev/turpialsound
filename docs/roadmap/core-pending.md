# Core Booking System - Pending Roadmap Items

This document tracks the remaining operational work for the Turpial Sound Core Booking System. It keeps the P0/P1/P2 approval order while preserving the useful implementation context from the previous roadmap.

## Functional Baseline To Keep

The core already has a real partial V1:

- `/reservas` public submit creates a real `pending_payment` booking.
- `/admin` exists as the current minimum Booking Command Center.
- Assigned room/resource and payment deadline are displayed.
- Payment method selector and payment reporting exist.
- Private payment proofs and signed operational links exist.
- Resend email notifications exist for key booking events.
- Google Calendar sync exists in `lib/bookings/google-calendar.ts`.
- Submit-time availability and resource collision checks exist for managed physical-room services.
- Expiration logic exists in `lib/bookings/operations.ts` and can be called by `/admin` or `POST /api/bookings/expire`.
- Env/Ops readiness check exists in `scripts/checks/env-readiness-check.mjs`.

## Approval Gate Closed Blocks

- [x] **Env/Ops approved:** `env-readiness-check.mjs`, `docs/ops/*`, and `docs/qa/env-readiness-qa.md` are accepted for operational readiness validation.
- [x] **Expiracion approved:** Reusable expiration operation, internal endpoint, `payment_reported` protection, active `PaymentProof` protection, read-only checker, QA docs, and security docs are accepted.
- [x] **Atomicidad technically approved:** Code review accepted for serializable transaction, retry, public code generation inside transaction, and resource locking. Caveat: concurrent smoke/QA remains pending until there is a safe local/test DB or explicit Neon test branch.

## Roadmap Prioritization

### P0 - Approval Gate / Immediate Production Readiness

- [ ] **Validacion concurrente de Atomicidad:** Run the concurrency smoke or assisted QA against a safe DB local/test or explicit Neon test branch. Do not use production or suspicious remote DBs.
- [ ] **Pre-commit review:** Confirm the approved blocks remain separated from marketplace, `Mp*`, Prisma migrations/schema, generated files, `.env*`, `package.json`, and `pnpm-lock.yaml`.

### P1 - Operational Hardening

- [ ] **Scheduler / Vercel Cron:** Configure an external scheduler for `POST /api/bookings/expire` using `Authorization: Bearer <BOOKINGS_EXPIRE_CRON_SECRET>`.
- [ ] **Retry / Outbox Calendar-Email:** Add a durable retry or reconciliation strategy for failed Google Calendar sync and Resend email delivery.
- [ ] **QA recurrente DB local/test:** Keep a repeatable local/test DB or explicit Neon test branch for concurrency, expiration, payment proof, Calendar, and email smoke tests.

### P2 - Assisted Operation Improvements

- [ ] **Auth/RBAC Admin:** Refine admin access levels for staff/director roles before wider production use.
- [ ] **Recibo / Orden operativa:** Generate or display an operational receipt/service order with code, client, service, modality, room, schedule, amount, method, and status.
- [ ] **Rate limit / Captcha:** Add abuse protection for public booking submit and payment report flows.
- [ ] **Incidencias operativas:** Add a clearer admin path for payment or booking incidents that cannot be verified normally.
- [ ] **Available-slot UX:** Later expose available slots before submit; current protection remains server-side at submit.

## Resource Rules In Scope

- Sala 1: `grabacion` and fallback for `sala-ensayo`.
- Sala 2: `podcast-locucion`.
- Sala 3: preferred room for `sala-ensayo`.
- Other services do not block physical resources until their rules are defined.

## Operational Statuses In Scope

- `submitted`
- `pending_payment`
- `payment_reported`
- `payment_verified`
- `confirmed`
- `cancelled`
- `expired`

`pending_payment` is the first visible operational state for public submissions. `submitted` can remain technical/transitory.

## Out Of Scope For This Approval Gate

- Marketplace and `Mp*` models; Manuel owns that scope.
- Production DB merge, `main` integration, and final UI/UX integration; Jean owns these.
- Mercantil live integration and automatic payment reconciliation.
- Personal calendar synchronization.

---

Reference updated for the Approval Gate on 2026-04-29.
