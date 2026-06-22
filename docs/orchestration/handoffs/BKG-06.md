# Handoff BKG-06

- Sprint ID: `BKG-06`
- Objective: `Asignacion de recursos y deteccion aislada de colisiones`
- Branch: `codex/preview-arma-tu-paquete-2026-06-19`
- Base SHA: `262e2adc77b7f25b66ca8cfa58b5a171da51720d`
- Final SHA: `SELF — el commit que contiene este handoff.`

## Files Modified

- `lib/bookings/custom-bundle-resource-policy.ts`
- `lib/bookings/custom-bundle-resource-availability.ts`
- `scripts/qa/bookings/custom-bundle-resource-policy.ts`
- `scripts/qa/bookings/isolated-custom-bundle-resource-conflicts.ts`
- `.github/workflows/booking-isolated-custom-bundle-resource-conflicts.yml`
- `docs/orchestration/RESOURCE_CONFLICT_GATE.json`
- `docs/orchestration/decisions/BKG-04B1-director-review.md`
- `docs/orchestration/decisions/BKG-05-director-review.md`
- `docs/orchestration/decisions/BKG-06-resource-conflicts.md`
- `docs/orchestration/ROADMAP.md`
- `docs/orchestration/CURRENT_SPRINT.md`
- `docs/orchestration/STATE.json`
- `docs/orchestration/handoffs/BKG-06.md`
- `docs/07_handoffs/qa-dispatcher.json`
- `docs/07_handoffs/qa-canonical-runbook.md`

## Changes Made

- Added the canonical resource policy helper for managed services.
- Added the read-only resource availability checker and isolated conflict gate.
- Added the canonical resource policy QA script and isolated SQL conflict gate.
- Registered the resource conflict gate in orchestration docs.
- Normalized the persistence milestone handoff text for the previous sprint.

## Out of Scope

- holds;
- persistence adapter changes;
- wizard wiring;
- production writes;
- manual QA;
- Vercel config changes.

## Decisions Applied

- BKG-05 remains technically validated.
- BKG-06 starts with resource policy gaps still open for `video-session` and `consultoria`.

## Technical Validations

- pending

## Automated Tests

- pending

## Risks

- policy coverage for Studio Session and Consultoria remains undefined.
- resource assignment must remain deterministic across future catalog updates.

## Blockers

- `VIDEO_SESSION_RESOURCE_POLICY_UNDEFINED`
- `CONSULTORIA_RESOURCE_POLICY_UNDEFINED`

## Vercel Status

- not required yet for this documentation and local validation pass.

## Preview URL

- `null`

## Recommended State

- `DIRECTOR_REVIEW`

## Director Next Action

- ChatGPT verifies the isolated resource conflict workflow and resolves the remaining resource policy gaps.
