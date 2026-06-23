# Handoff BKG-07C

- Sprint ID: `BKG-07C`
- Objective: `Aislamiento de expiracion y release de hold`
- Branch: `codex/preview-arma-tu-paquete-2026-06-19`
- Base SHA: `711b8eca90c8a2d018c26c1cc89ffacb72efaece`
- Final SHA: `SELF -- el commit que contiene este handoff`

## Files Modified

- `lib/bookings/custom-bundle-hold-operational-notes.ts`
- `lib/bookings/custom-bundle-hold-expiration.ts`
- `scripts/qa/bookings/custom-bundle-hold-contract.ts`
- `scripts/qa/bookings/custom-bundle-hold-acquisition-contract.ts`
- `scripts/qa/bookings/custom-bundle-hold-expiration-contract.ts`
- `scripts/qa/bookings/isolated-custom-bundle-hold-expiration.ts`
- `.github/workflows/booking-isolated-custom-bundle-hold-expiration.yml`
- `docs/07_handoffs/qa-dispatcher.json`
- `docs/07_handoffs/qa-canonical-runbook.md`
- `docs/orchestration/HOLD_GATE.json`
- `docs/orchestration/CURRENT_SPRINT.md`
- `docs/orchestration/STATE.json`
- `docs/orchestration/ROADMAP.md`
- `docs/orchestration/decisions/BKG-07C-director-review-entry.md`
- `docs/orchestration/decisions/BKG-07C-hold-expiration.md`
- `docs/orchestration/handoffs/BKG-07C.md`

## Changes Made

- added a shared operational-notes helper for strict hold replay tags;
- added an isolated expiration writer with batched, skip-locked processing;
- added pure contract and isolated gate coverage for expiration and release processing;
- updated the orchestration gate and documentation for BKG-07C.

## Out of Scope

- wizard wiring;
- production;
- manual QA;
- BKG-08A.

## Decisions Applied

- due holds expire in the isolated gate only;
- payment-reported and active payment-proof holds stay protected;
- acquisition regression stays part of the validation surface;
- production remains blocked.

## Technical Validations

- pending local validation and remote workflow verification.

## Automated Tests

- pending.

## Risks

- the new expiration writer and isolated gate may require adjustment if the remote workflow surfaces a SQL ordering or replay-edge issue.

## Blockers

- none.

## Vercel Status

- not required yet.

## Preview URL

- not available.

## Recommended State

- `DIRECTOR_REVIEW`

## Director Next Action

- ChatGPT verifies isolated expiration processing and acquisition regression before BKG-08A.
