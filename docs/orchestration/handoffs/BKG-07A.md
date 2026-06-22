# Handoff BKG-07A

- Sprint ID: `BKG-07A`
- Objective: `Contrato y esquema aislado de holds e idempotencia`
- Branch: `codex/preview-arma-tu-paquete-2026-06-19`
- Base SHA: `4e2b597471347e572121ce61b876f6fb68c7fcd6`
- Final SHA: `SELF — el commit que contiene este handoff.`

## Files Modified

- `prisma/proposed/20260622_bkg07_custom_bundle_holds.sql`
- `docs/orchestration/BKG07_HOLD_SCHEMA_PROPOSAL.md`
- `lib/bookings/custom-bundle-hold-contract.ts`
- `scripts/qa/bookings/custom-bundle-hold-contract.ts`
- `scripts/qa/bookings/isolated-custom-bundle-hold-schema.ts`
- `docs/orchestration/decisions/BKG-06B-director-review.md`
- `docs/orchestration/decisions/BKG-07A-hold-contract.md`
- `docs/orchestration/HOLD_GATE.json`
- `docs/orchestration/ROADMAP.md`
- `docs/orchestration/CURRENT_SPRINT.md`
- `docs/orchestration/STATE.json`
- `docs/orchestration/handoffs/BKG-07A.md`
- `.github/workflows/booking-isolated-custom-bundle-hold-schema.yml`
- `docs/07_handoffs/qa-dispatcher.json`
- `docs/07_handoffs/qa-canonical-runbook.md`

## Changes Made

- added the additive hold/idempotency SQL proposal for `booking_requests`;
- added the pure hold contract, fingerprint builder, replay classifier, and hold window helpers;
- added the pure hold contract QA script;
- added the isolated PostgreSQL schema gate script for the hold proposal;
- registered the canonical QA route in the dispatcher and runbook;
- recorded the new sprint state and hold gate machine-readable bootstrap;
- documented the Director decisions for BKG-06B and BKG-07A.

## Out of Scope

- hold acquisition;
- availability writes;
- resource assignment writes;
- `schema.prisma`;
- `generated/prisma`;
- migrations;
- seeds;
- production;
- manual QA;
- wizard wiring.

## Decisions Applied

- `BookingRequest` is the expiring hold entity in this phase;
- idempotency and fingerprinting are server-derived;
- hold acquisition is deferred to `BKG-07B`.

## Technical Validations

- pending

## Automated Tests

- pending GitHub Actions validation of `Booking Isolated Custom Bundle Hold Schema`

## Risks

- the SQL proposal still needs remote validation in GitHub Actions;
- the hold adapter is intentionally not implemented yet;
- production remains blocked until later Director approval.

## Blockers

- none at this documentation bootstrap stage

## Vercel Status

- not required for this documentation and isolated schema gate pass

## Preview URL

- `null`

## Recommended State

- `DIRECTOR_REVIEW`

## Director Next Action

- ChatGPT verifies the isolated hold schema and contract before `BKG-07B`.
