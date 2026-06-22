# Handoff BKG-04B

- Sprint ID: `BKG-04B`
- Objective: `Persistence adapter mult-item isolated`
- Branch: `codex/preview-arma-tu-paquete-2026-06-19`
- Base SHA: `145d2307e91ba93e6681a7a587c3c50a3f5c3373`
- Final SHA: `SELF -- el commit que contiene este handoff.`

## Files Modified

- `lib/bookings/custom-bundle-persistence.ts`
- `scripts/qa/bookings/custom-bundle-persistence-contract.ts`
- `scripts/qa/bookings/isolated-custom-bundle-persistence-gate.ts`
- `.github/workflows/booking-isolated-custom-bundle-persistence.yml`
- `docs/07_handoffs/qa-dispatcher.json`
- `docs/07_handoffs/qa-canonical-runbook.md`
- `docs/orchestration/decisions/BKG-04A1-director-review.md`
- `docs/orchestration/decisions/BKG-04B-persistence-adapter.md`
- `docs/orchestration/CURRENT_SPRINT.md`
- `docs/orchestration/ROADMAP.md`
- `docs/orchestration/STATE.json`
- `docs/orchestration/PERSISTENCE_GATE.json`

## Changes Made

- Added the isolated persistence adapter and its contract checks.
- Added the isolated PostgreSQL gate script and workflow.
- Registered canonical QA routes in the dispatcher and runbook.
- Updated orchestration state for the BKG-04B sprint.

## Out of Scope

- `schema.prisma`;
- generated Prisma;
- Preview wiring;
- application integration;
- production;
- QA manual.

## Validation

- `pnpm exec tsx scripts/qa/bookings/custom-bundle-persistence-contract.ts`
- `pnpm lint`
- `pnpm exec tsc --noEmit`
- `pnpm build`
- `git diff --check`

## Risks

- The adapter is isolated and reversible, but it is still not wired into Preview.
- The workflow must validate successfully before any availability work starts.

## Blockers

- none

## Vercel Status

- Not required for this sprint.

## Preview URL

- `null`

## Recommended State

- `DIRECTOR_REVIEW`

## Director Next Action

- ChatGPT verifies the isolated mult-item persistence workflow before starting availability work.
