# Handoff BKG-02

- Sprint ID: `BKG-02`
- Objective: Define the strict mult-item submission contract for the Preview `Arma tu paquete` payload.
- Branch: `codex/preview-arma-tu-paquete-2026-06-19`
- Base SHA: `da0d0d20329a723834f9b902752b248c59e8859c`
- Final SHA: `SELF — el commit que contiene este handoff.`

## Files Modified

- `lib/bookings/custom-bundle-submission.ts`
- `scripts/qa/bookings/custom-bundle-submission-contract.ts`
- `docs/07_handoffs/qa-dispatcher.json`
- `docs/07_handoffs/qa-canonical-runbook.md`
- `docs/orchestration/decisions/BKG-01A-director-review.md`
- `docs/orchestration/decisions/BKG-02-backend-multitem-contract.md`
- `docs/orchestration/CURRENT_SPRINT.md`
- `docs/orchestration/ROADMAP.md`
- `docs/orchestration/STATE.json`

## Changes Made

- Defined a pure, versioned `custom_bundle` submission contract.
- Added strict normalization and rejection rules for root, requester, and items.
- Registered persistence targets for the 12 service variants and catalog gaps for the 10 additional items.
- Exposed server-derived included slugs for `tecnico-sonido` and `backline-equipamiento`.
- Added a canonical QA script for deterministic contract validation.
- Registered the new canonical task in the dispatcher and runbook.
- Updated orchestration state for `BKG-02`.

## Out of Scope

- persistence;
- Prisma schema changes;
- migrations;
- seeds;
- payments;
- notifications;
- Calendar;
- production changes;
- connecting the wizard to the new backend contract;
- authoritative repricing.

## Decisions Applied

- `BKG-01A` was reviewed and approved technically.
- `BKG-02` advances the backend mult-item contract without persistence.

## Technical Validations

- Canonical contract script: `booking_custom_bundle_contract OK`.
- Submission contract script: `booking_custom_bundle_submission_contract OK`.
- `pnpm lint`: passed with pre-existing warnings only.
- `pnpm exec tsc --noEmit`: passed.
- `pnpm build`: passed; the known BCV/Prisma external error was printed during static generation, but the build exited successfully.
- `git diff --check`: clean.

## Automated Tests

- Strict parser cases, catalog gap mapping, server-derived slug checks, and forbidden money field scans all passed.

## Risks

- The contract stays intentionally detached from persistence, so downstream alignment with schema and catalog strategy remains a future step.

## Blockers

- None at this stage.

## Vercel Status

- Pending verification for this SHA.

## Preview URL

- `null`

## Recommended State

- `TECHNICALLY_VALIDATED`

## Director Next Action

- ChatGPT reviews BKG-02 and decides whether to start authoritative server repricing.
