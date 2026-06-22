# Handoff BKG-06A

- Sprint ID: `BKG-06A`
- Objective: `Normalización de cobertura de políticas de recursos`
- Branch: `codex/preview-arma-tu-paquete-2026-06-19`
- Base SHA: `ee15463c0737134add006b4f663ccccd7c7e6a2d`
- Final SHA: `SELF — el commit que contiene este handoff.`

## Files Modified

- `docs/orchestration/ROADMAP.md`
- `docs/orchestration/CURRENT_SPRINT.md`
- `docs/orchestration/STATE.json`
- `docs/orchestration/handoffs/BKG-06.md`
- `docs/orchestration/decisions/BKG-06-director-review.md`
- `docs/orchestration/RESOURCE_POLICY_DECISION_REQUEST.md`
- `docs/orchestration/handoffs/BKG-06A.md`

## Changes Made

- Corrected the Hito 6 state to reflect managed-service validation only.
- Preserved the technical evidence from the resource conflict workflow.
- Added the owner decision request for `video-session` and `consultoria`.

## Out of Scope

- modifying the functional policy;
- choosing resources for Studio Session;
- choosing resources for Consultoria;
- holds;
- idempotency;
- resourceId persistence;
- Prisma;
- database;
- wizard;
- manual QA;
- production.

## Decisions Applied

- BKG-06 technical evidence remains valid for managed services.
- BKG-07 cannot start until the owner decisions are provided.

## Technical Validations

- `git diff --check`

## Automated Tests

- none

## Risks

- managed resource policies passed;
- resource catalog and collision detection passed;
- Studio Session policy remains undefined;
- Consultoria policy remains undefined;
- holds cannot begin until both decisions are explicit.

## Blockers

- `VIDEO_SESSION_RESOURCE_POLICY_UNDEFINED`
- `CONSULTORIA_RESOURCE_POLICY_UNDEFINED`

## Vercel Status

- not required for this documentation-only normalization.

## Preview URL

- `null`

## Recommended State

- `BLOCKED`

## Director Next Action

- Jean defines the physical resource policy for Studio Session and Consultoria before BKG-07.
