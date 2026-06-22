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

- `booking_custom_bundle_resource_policy OK`
- isolated resource conflict gate attempted locally, but the local PostgreSQL service rejected the `turpial_ci` credentials in this environment

## Risks

- no physical services still must remain in the continuous schedule;
- future unknown services must continue to be blocked explicitly;
- only physical requirements may query resources and collisions.

## Blockers

- `LOCAL_ISOLATED_DB_AUTH_MISMATCH`

## Vercel Status

- not required for this documentation and implementation pass.

## Preview URL

- `null`

## Recommended State

- `DIRECTOR_REVIEW`

## Director Next Action

- ChatGPT verifies the owner resource policy implementation before BKG-07.
