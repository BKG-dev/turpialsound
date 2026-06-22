# Handoff BKG-03

- Sprint ID: `BKG-03`
- Objective: Build an authoritative repricing layer for `Arma tu paquete` that reconstructs the estimate from the validated submission contract and the internal catalog only.
- Branch: `codex/preview-arma-tu-paquete-2026-06-19`
- Base SHA: `d8603af449d18074a52a6968fd612c5a611906a6`
- Final SHA: `SELF — el commit que contiene este handoff.`

## Files Modified

- `lib/bookings/custom-bundle-repricing.ts`
- `scripts/qa/bookings/custom-bundle-authoritative-repricing.ts`
- `docs/07_handoffs/qa-dispatcher.json`
- `docs/07_handoffs/qa-canonical-runbook.md`
- `docs/orchestration/decisions/BKG-02A-director-review.md`
- `docs/orchestration/decisions/BKG-03-authoritative-repricing.md`
- `docs/orchestration/CURRENT_SPRINT.md`
- `docs/orchestration/ROADMAP.md`
- `docs/orchestration/STATE.json`
- `docs/orchestration/handoffs/BKG-03.md`

## Changes Made

- Added a pure authoritative repricing module that validates the submission contract and rebuilds the estimate from the internal catalog.
- Added the canonical QA script for the authoritative repricing contract.
- Registered the repricing route in the QA dispatcher and runbook.
- Updated orchestration decisions, current sprint state, roadmap, and machine-readable state.

## Out of Scope

- persistence;
- Prisma schema changes;
- migrations;
- seeds;
- payments;
- notifications;
- Calendar;
- production changes;
- connecting the wizard to the repricer;
- QA manual.

## Decisions Applied

- `BKG-02A` was reviewed and approved technically.
- `BKG-03` advances the authoritative repricing layer without persistence.

## Technical Validations

- `booking_custom_bundle_authoritative_repricing OK`.
- `pnpm lint`: passed with existing warnings only.
- `pnpm exec tsc --noEmit`: passed.
- `pnpm build`: passed; printed the known BCV/Prisma external error during static generation, but exited successfully.
- `git diff --check`: clean.

## Automated Tests

- Covered cases:
  - authoritative quote with catalog gaps;
  - authoritative quote without catalog gaps;
  - weekend surcharge calculation;
  - forbidden client money fields;
  - exclusive sala incompatibility;
  - missing temporal component;
  - podcast quote;
  - server-derived included items;
  - parity with the canonical estimate engine;
  - payload immutability;
  - session duration normalization;
  - deterministic ordering of lines, gaps, and included slugs.

## Risks

- The repricer still depends on future persistence strategy decisions for the catalog gaps.
- The build may continue to log the known BCV/Prisma external error during static generation.

## Blockers

- None at this stage.

## Vercel Status

- Pending verification.

## Preview URL

- `null`

## Recommended State

- `TECHNICALLY_VALIDATED`

## Director Next Action

- ChatGPT reviews BKG-03 and evaluates the isolated database and persistent catalog gates before BKG-04.
