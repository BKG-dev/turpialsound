# Handoff BKG-08A

- Sprint ID: `BKG-08A`
- Objective: `Contrato y esquema aislado de pago consolidado`
- Branch: `codex/preview-arma-tu-paquete-2026-06-19`
- Base SHA: `33bf4fb91f3a17cd26ebd1cf0952194aefae2f74`
- Final SHA: `SELF -- el commit que contiene este handoff`

## Files Modified

- `lib/bookings/custom-bundle-payment-contract.ts`
- `prisma/proposed/20260623_bkg08_custom_bundle_payment_reports.sql`
- `scripts/qa/bookings/custom-bundle-payment-contract.ts`
- `scripts/qa/bookings/isolated-custom-bundle-payment-schema.ts`
- `.github/workflows/booking-isolated-custom-bundle-payment-contract.yml`
- `docs/07_handoffs/qa-dispatcher.json`
- `docs/07_handoffs/qa-canonical-runbook.md`
- `docs/orchestration/BKG08_PAYMENT_SCHEMA_PROPOSAL.md`
- `docs/orchestration/PAYMENT_GATE.json`
- `docs/orchestration/CURRENT_SPRINT.md`
- `docs/orchestration/ROADMAP.md`
- `docs/orchestration/STATE.json`
- `docs/orchestration/decisions/BKG-07C1-director-review.md`
- `docs/orchestration/decisions/BKG-08A-consolidated-payment-contract.md`

## Changes Made

- introduced a pure consolidated payment contract for `Arma tu paquete`;
- proposed additive PostgreSQL fields for payment reporting on `booking_requests`;
- registered canonical QA routes for the contract script and isolated schema gate;
- normalized orchestration to point at BKG-08A pending CI validation.

## Out of Scope

- transactional payment reporting;
- blob boundary;
- notifications;
- wizard integration;
- production;
- manual QA.

## Decisions Applied

- the server remains the source of truth for payment eligibility and totals;
- the client cannot supply payment totals, fingerprints, idempotency keys, or reporting timestamps;
- the isolated PostgreSQL gate is the only place where the proposed SQL is exercised.

## Technical Validations

- pending isolated workflow validation

## Automated Tests

- pending

## Risks

- payment reporting must remain isolated from production deployment and from any direct client-controlled monetary input;
- schema and contract must remain aligned with the prior booking, hold, expiration, and persistence gates.

## Blockers

- none

## Vercel Status

- not required for this documentation-only state

## Preview URL

- not available

## Recommended State

- `DIRECTOR_REVIEW`

## Director Next Action

- ChatGPT verifies the consolidated payment contract and schema before BKG-08B.
