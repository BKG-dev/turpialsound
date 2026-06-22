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

- Added the isolated persistence adapter for custom bundle submissions.
- Added contract-level checks for the persistence adapter.
- Added the isolated PostgreSQL gate workflow.
- Seeded the snapshot-backed fixture catalog required by the gate.
- Registered the canonical QA route in the dispatcher and runbook.
- Normalized orchestration state for the BKG-04B sprint.

## Validation

- `pnpm exec tsx scripts/qa/bookings/custom-bundle-persistence-contract.ts`
- `pnpm lint`
- `pnpm exec tsc --noEmit`
- `pnpm build`
- `git diff --check`
- GitHub Actions workflow `Booking Isolated Custom Bundle Persistence`

## Remote Evidence

- Run ID: `27955681908`
- Workflow: `Booking Isolated Custom Bundle Persistence`
- Job: `gate`
- Head SHA: `dc9ab6f1f7070977d34553ed4e0e7253cc4ee708`
- Conclusion: `success`
- Repository state during run: clean
- Rollback: `verified`

## Verified Messages

- `booking_isolated_custom_bundle_persistence OK`
- `authoritative repricing: verified`
- `booking request: verified`
- `five snapshot items: verified`
- `catalog gaps: verified`
- `rollback: verified`
- `public code conflict: verified`
- `cleanup: verified`

## Risks

- The adapter is still not wired into Preview.
- Availability and resource work remain ahead.

## Blockers

- none

## Vercel Status

- Not required for this sprint.

## Preview URL

- `null`

## Recommended State

- `TECHNICALLY_VALIDATED`

## Director Next Action

- ChatGPT reviews BKG-04B and defines continuous availability block calculation.
