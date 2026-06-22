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

- Workflow revalidation: pending for the new SHA.
- Run ID: `null`
- Conclusion: `null`
- Repository state during this handoff: local changes in progress.
- Rollback: not revalidated yet on the corrected SHA.

## Verified Messages

- `booking_custom_bundle_contract OK`
- `booking_custom_bundle_submission_contract OK`
- `booking_custom_bundle_authoritative_repricing OK`
- `booking_custom_bundle_persistence_contract OK`

## Risks

- The isolated persistence workflow still needs to be rerun on the corrected SHA.
- Availability work remains blocked until the new gate succeeds.

## Blockers

- none

## Vercel Status

- pending revalidation for the corrected SHA.

## Preview URL

- `null`

## Recommended State

- `DIRECTOR_REVIEW`

## Director Next Action

- ChatGPT verifies `BKG-04B1` before authorizing availability work.
