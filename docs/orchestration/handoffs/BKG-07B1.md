# Handoff BKG-07B1

- Sprint ID: `BKG-07B1`
- Objective: `Corregir semantica de allocations en replay idempotente`
- Branch: `codex/preview-arma-tu-paquete-2026-06-19`
- Base SHA: `b7fecf05592310556f70d153413dd09f3fab6afc`
- Functional SHA: `b7fecf05592310556f70d153413dd09f3fab6afc`
- Final SHA: `SELF -- el commit que contiene este handoff`

## Files Modified

- `scripts/qa/bookings/isolated-custom-bundle-hold-acquisition.ts`
- `docs/orchestration/HOLD_GATE.json`
- `docs/orchestration/ROADMAP.md`
- `docs/orchestration/CURRENT_SPRINT.md`
- `docs/orchestration/STATE.json`
- `docs/orchestration/handoffs/BKG-07B1.md`

## Changes Made

- replay allocation parity now uses an isolated fixture that does not collide with the canonical hold;
- the rollback partial fixture now uses a unique publicCode so the trigger-induced rollback path is exercised;
- acquisition replay semantics remained authoritative and idempotent;
- the orchestration state was normalized after the remote gates succeeded.

## Out of Scope

- expiration writer;
- wizard wiring;
- production;
- manual QA.

## Decisions Applied

- replayed holds must preserve the same allocation semantics as acquired holds;
- persisted replay rows must be complete and internally consistent;
- corrupt replay data must not be replayed.

## Technical Validations

- Acquisition run `28036759818` on `b7fecf05592310556f70d153413dd09f3fab6afc`: `success`
- Resource conflicts run `28034432484` on `bf69c575c39436ce5052dea4577bc7d8e53f4994`: `success`
- Persistence run `28034432497` on `bf69c575c39436ce5052dea4577bc7d8e53f4994`: `success`

## Automated Tests

- `booking_custom_bundle_hold_acquisition_contract OK`
- `replay allocation parity: verified`
- `corrupt replay rejected: verified`
- `booking_isolated_custom_bundle_hold_acquisition OK`
- `booking_isolated_custom_bundle_resource_conflicts OK`
- `booking_isolated_custom_bundle_persistence OK`

## Risks

- no additional functional risk remains in the replay allocation path;
- expiration writer is still not started;
- production remains blocked until explicit user authorization.

## Blockers

- none

## Vercel Status

- success

## Preview URL

- not available

## Recommended State

- `TECHNICALLY_VALIDATED`

## Director Next Action

- ChatGPT reviews BKG-07B1 and defines isolated expiration and release processing.
