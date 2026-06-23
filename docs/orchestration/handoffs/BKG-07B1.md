# Handoff BKG-07B1

- Sprint ID: `BKG-07B1`
- Objective: `Corregir semántica de allocations en replay idempotente`
- Branch: `codex/preview-arma-tu-paquete-2026-06-19`
- Base SHA: `c37fb1cc3b33142c5e656217bb8b4d17499f8c22`
- Final SHA: `SELF -- el commit que contiene este handoff`

## Files Modified

- `lib/bookings/custom-bundle-hold-acquisition.ts`
- `lib/bookings/custom-bundle-persistence.ts`
- `scripts/qa/bookings/custom-bundle-hold-acquisition-contract.ts`
- `scripts/qa/bookings/isolated-custom-bundle-hold-acquisition.ts`
- `docs/orchestration/HOLD_GATE.json`
- `docs/orchestration/ROADMAP.md`
- `docs/orchestration/CURRENT_SPRINT.md`
- `docs/orchestration/STATE.json`
- `docs/orchestration/decisions/BKG-07B-director-review-correction.md`
- `docs/orchestration/handoffs/BKG-07B1.md`

## Changes Made

- replay allocation counts now derive from authoritative requirements;
- persisted replay items are validated explicitly before replay is returned;
- corrupt replay rows now fail with `IDEMPOTENCY_RECORD_INVALID`;
- QA coverage now includes replay allocation parity and corrupt replay rejection;
- the orchestration state was normalized for the correction sprint.

## Out of Scope

- expiration writer;
- production;
- manual QA;
- wizard wiring.

## Decisions Applied

- replayed holds must preserve the same allocation semantics as acquired holds;
- persisted replay rows must be complete and internally consistent;
- corrupt replay data must not be replayed.

## Technical Validations

- `pnpm exec tsx scripts/qa/bookings/custom-bundle-hold-acquisition-contract.ts` OK
- `pnpm exec tsc --noEmit` OK
- `pnpm build` OK
- `git diff --check` OK

## Automated Tests

- `booking_custom_bundle_hold_acquisition_contract OK`
- `replay allocation parity: verified`
- `corrupt replay rejected: verified`

## Risks

- the isolated replay gate could not be exercised locally because Docker is unavailable in this environment;
- local PostgreSQL authentication for the isolated gate did not match the expected isolated credentials;
- repo-wide lint still emits pre-existing warnings outside this fix.

## Blockers

- local isolated replay gate unavailable in this environment

## Vercel Status

- pending for the corrected SHA

## Preview URL

- not available yet

## Recommended State

- `DIRECTOR_REVIEW`

## Director Next Action

- ChatGPT verifies replay allocation parity before BKG-07C.
