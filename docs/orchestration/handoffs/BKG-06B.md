# Handoff BKG-06B

- Sprint ID: `BKG-06B`
- Objective: `Aplicar politica de servicios sin recurso fisico`
- Branch: `codex/preview-arma-tu-paquete-2026-06-19`
- Base SHA: `ee15463c0737134add006b4f663ccccd7c7e6a2d`
- Final SHA: `SELF — el commit que contiene este handoff.`

## Files Modified

- `lib/bookings/custom-bundle-resource-policy.ts`
- `lib/bookings/custom-bundle-resource-availability.ts`
- `scripts/qa/bookings/custom-bundle-resource-policy.ts`
- `scripts/qa/bookings/isolated-custom-bundle-resource-conflicts.ts`
- `docs/orchestration/RESOURCE_CONFLICT_GATE.json`
- `docs/orchestration/ROADMAP.md`
- `docs/orchestration/CURRENT_SPRINT.md`
- `docs/orchestration/STATE.json`
- `docs/orchestration/handoffs/BKG-06.md`
- `docs/orchestration/decisions/BKG-06-owner-resource-policy.md`
- `docs/orchestration/decisions/BKG-06B-no-physical-resources.md`
- `docs/orchestration/handoffs/BKG-06B.md`

## Changes Made

- incorporated explicit `no_physical_resource` policies for `video-session` and `consultoria`;
- preserved the validated physical policies for `sala-ensayo`, `grabacion`, and `podcast-locucion`;
- prepared mixed physical and non-physical validation routes;
- recorded the policy gate reset for the next isolated validation pass;
- validated the policy gate in GitHub Actions and closed the local policy gap;
- kept the read-only adapter and rollback boundary intact.

## Out of Scope

- Prisma;
- database writes;
- wizard wiring;
- holds;
- production;
- manual QA.

## Decisions Applied

- owner resource policy applied for both no-physical services;
- BKG-06 remains not done until the workflow validates the updated policy model.

## Technical Validations

- `pnpm exec tsx scripts/qa/bookings/custom-bundle-resource-policy.ts`
- `pnpm exec tsc --noEmit`
- `pnpm lint`
- `pnpm build`
- `git diff --check`

## Automated Tests

- Booking Isolated Custom Bundle Resource Conflicts
  - Run ID: `27982875599`
  - Head SHA: `c3da4dfce1a5cdbf589a9830141aa3421876bc9c`
  - Workflow: `Booking Isolated Custom Bundle Resource Conflicts`
  - Job: `gate`
  - Conclusion: `success`
  - Messages:
    - `booking_custom_bundle_resource_policy OK`
    - `no physical resource policy: verified`
    - `mixed resource modes: verified`
    - `unknown policies blocked: verified`
    - `booking_isolated_custom_bundle_resource_conflicts OK`
    - `no physical allocations: verified`
    - `mixed resource allocation: verified`
    - `physical query isolation: verified`
    - `fallback assignment: verified`
    - `rollback: verified`
    - `cleanup: verified`

## Risks

- no physical services still must remain in the continuous schedule;
- future unknown services must continue to be blocked explicitly;
- only physical requirements may query resources and collisions.

## Blockers

- none

## Vercel Status

- not required for this documentation and implementation pass.

## Preview URL

- `null`

## Recommended State

- `TECHNICALLY_VALIDATED`

## Director Next Action

- ChatGPT reviews BKG-06B and defines isolated holds, expiration and idempotency.
