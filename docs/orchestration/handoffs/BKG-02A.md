# Handoff BKG-02A

- Sprint ID: `BKG-02A`
- Objective: Harden the backend mult-item submission contract by isolating local errors, enforcing strict session durations, aligning Venezuelan WhatsApp normalization, and validating catalog exhaustiveness against the active catalog.
- Branch: `codex/preview-arma-tu-paquete-2026-06-19`
- Base SHA: `1105064abd0d2c87a8b3e40ad0bcbec54e263e65`
- Final SHA: `SELF — el commit que contiene este handoff.`

## Files Modified

- `lib/bookings/custom-bundle-submission.ts`
- `scripts/qa/bookings/custom-bundle-submission-contract.ts`
- `docs/orchestration/decisions/BKG-02-director-review.md`
- `docs/orchestration/CURRENT_SPRINT.md`
- `docs/orchestration/STATE.json`
- `docs/orchestration/handoffs/BKG-02A.md`

## Changes Made

- Isolated requester and item validation errors so earlier root issues do not suppress later checks.
- Made `sessionDurationMinutes` strict for all items.
- Added Venezuelan WhatsApp phone normalization and validation.
- Verified catalog exhaustiveness against the real active catalog.
- Extended the canonical contract script with the BKG-02A regression cases.
- Updated orchestration state for the BKG-02A fix pass.

## Out of Scope

- persistence;
- Prisma schema changes;
- migrations;
- seeds;
- payments;
- notifications;
- Calendar;
- production changes;
- connecting the wizard to the submission contract;
- authoritative repricing.

## Decisions Applied

- `BKG-02` was reviewed and marked `FIX_REQUIRED`.
- `BKG-02A` executes the focused contract hardening before `BKG-03`.

## Technical Validations

- `booking_custom_bundle_contract OK`.
- `booking_custom_bundle_submission_contract OK`.
- `pnpm lint`: passed with pre-existing warnings only.
- `pnpm exec tsc --noEmit`: passed.
- `pnpm build`: passed; the known BCV/Prisma external error was printed during static generation, but the build exited successfully.
- `git diff --check`: clean.

## Automated Tests

- Regression cases covered:
  - isolated root/requester/item errors;
  - strict `sessionDurationMinutes` handling;
  - Venezuelan phone normalization and rejection;
  - active catalog exhaustiveness against the submission contract;
  - service-variant and catalog-gap mapping consistency.

## Risks

- The parser remains intentionally detached from persistence, so downstream contract alignment still depends on future sprints.

## Blockers

- None at this stage.

## Vercel Status

- Pending verification.

## Preview URL

- `null`

## Recommended State

- `TECHNICALLY_VALIDATED`

## Director Next Action

- ChatGPT reviews BKG-02A and decides whether to start authoritative server repricing.
