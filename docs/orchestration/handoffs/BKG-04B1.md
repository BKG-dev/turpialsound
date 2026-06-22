# Handoff BKG-04B1

- Sprint ID: `BKG-04B1`
- Objective: `Correct temporal snapshots and transactional contract`
- Branch: `codex/preview-arma-tu-paquete-2026-06-19`
- Base SHA: `18d0b609c5c02256d66cfcfc690ff813d1ed5ea2`
- Final SHA: `SELF -- el commit que contiene este handoff.`

## Files Modified

- `lib/bookings/custom-bundle-persistence.ts`
- `scripts/qa/bookings/custom-bundle-persistence-contract.ts`
- `scripts/qa/bookings/isolated-custom-bundle-persistence-gate.ts`
- `docs/orchestration/ROADMAP.md`
- `docs/orchestration/CURRENT_SPRINT.md`
- `docs/orchestration/STATE.json`
- `docs/orchestration/PERSISTENCE_GATE.json`
- `docs/orchestration/decisions/BKG-04B1-director-review.md`

## Changes Made

- Separated `sessionDurationMinutes` from `durationMinutes` in the persistence adapter.
- Added a pure persistence quote validator that returns controlled issues instead of throwing.
- Required a fixed single SQL connection session for the transactional adapter.
- Updated the pure contract script and isolated gate expectations for temporal snapshots.
- Registered the correction-only orchestration state for `BKG-04B1`.

## Validation

- `pnpm exec tsx scripts/qa/bookings/custom-bundle-contract.ts`
- `pnpm exec tsx scripts/qa/bookings/custom-bundle-submission-contract.ts`
- `pnpm exec tsx scripts/qa/bookings/custom-bundle-authoritative-repricing.ts`
- `pnpm exec tsx scripts/qa/bookings/custom-bundle-persistence-contract.ts`
- `pnpm lint`
- `pnpm exec tsc --noEmit`
- `pnpm build`
- `git diff --check`

## Remote Evidence

- Booking Isolated Custom Bundle Persistence
  - Run ID: `27969872300`
  - Head SHA: `8359feac81a20b3e8cee2d7899632389a61028a0`
  - Workflow: `Booking Isolated Custom Bundle Persistence`
  - Job: `gate`
  - Conclusion: `success`
  - Messages:
    - `booking_isolated_custom_bundle_persistence OK`
    - `authoritative repricing: verified`
    - `booking request: verified`
    - `five snapshot items: verified`
    - `catalog gaps: verified`
    - `rollback: verified`
    - `public code conflict: verified`
    - `cleanup: verified`
- Booking Isolated Snapshot Schema
  - Run ID: `27969872288`
  - Head SHA: `8359feac81a20b3e8cee2d7899632389a61028a0`
  - Workflow: `Booking Isolated Snapshot Schema`
  - Job: `gate`
  - Conclusion: `success`
  - Messages:
    - `legacy compatibility: verified`
    - `snapshot items: verified`
    - `unique slug: verified`
    - `foreign key: verified`
    - `cleanup: verified`
- Repository state during this handoff: clean after validation and push.
- Rollback: verified on the corrected SHA.

## Verified Messages

- `booking_custom_bundle_contract OK`
- `booking_custom_bundle_submission_contract OK`
- `booking_custom_bundle_authoritative_repricing OK`
- `booking_custom_bundle_persistence_contract OK`
- `booking_isolated_custom_bundle_persistence OK`

## Risks

- Temporal snapshot semantics and the single-connection contract are now verified.
- Availability work can begin in the next sprint after Director review.

## Blockers

- none

## Vercel Status

- not required for this documentation closure; the functional gate already succeeded on the corrected SHA.

## Preview URL

- `null`

## Recommended State

- `TECHNICALLY_VALIDATED`

## Director Next Action

- ChatGPT reviews `BKG-04B1` and defines continuous availability block calculation.
