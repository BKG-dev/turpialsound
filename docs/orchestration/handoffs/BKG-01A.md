# Handoff BKG-01A

- Sprint ID: `BKG-01A`
- Objective: Restore the aggregate-only commercial notice and remove the duplicated unit label from the Preview custom bundle card.
- Branch: `codex/preview-arma-tu-paquete-2026-06-19`
- Base SHA: `70e2e46644ea961bc78f1f90412147f825044714`
- Final SHA: `SELF — el commit que contiene este handoff.`

## Files Modified

- `components/bookings/steps/CustomBundleStep.tsx`
- `lib/bookings/custom-bundle.ts`
- `scripts/qa/bookings/custom-bundle-contract.ts`
- `docs/07_handoffs/qa-canonical-runbook.md`
- `docs/orchestration/decisions/BKG-01-director-review.md`
- `docs/orchestration/CURRENT_SPRINT.md`
- `docs/orchestration/STATE.json`

## Defect Corrected

- Restored the aggregate-only notice string in the card footer.
- Kept the unit presentation only in the price presentation line under the description.
- Avoided duplicating `Unidad:` for aggregate-only items.

## Validation Results

- Canonical script: `booking_custom_bundle_contract OK`.
- Lint: passed with pre-existing warnings only.
- TypeScript: passed.
- Build: passed; the known BCV/Prisma external error was printed during static generation, but the build exited successfully.
- `git diff --check`: clean.

## Risks

- The change is intentionally narrow and should not affect pricing math.
- The contract script now needs to enforce the restored notice so the regression does not return.

## Vercel Status

- Pending verification for the new SHA.

## Preview URL

- `null`

## Manual QA

- Not executed.

## Backend

- No backend mult-item changes were started.
- No persistence, payments, notifications, or Calendar changes were made.

## Recommended State

- `TECHNICALLY_VALIDATED`

## Director Next Action

- ChatGPT reviews BKG-01A and decides whether to start the backend mult-item contract sprint.
