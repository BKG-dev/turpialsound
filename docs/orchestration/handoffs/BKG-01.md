# Handoff BKG-01

- Sprint ID: `BKG-01`
- Objective: Close the Preview custom bundle contract with centralized price presentation, semantic additional counting, deterministic validation, QA dispatcher coverage, and orchestration tracking.
- Branch: `codex/preview-arma-tu-paquete-2026-06-19`
- Base SHA: `5f3757fff95109b245c338f84dfe27e75d530d03`
- Final SHA: `SELF — el commit que contiene este handoff.`

## Files Modified

- `components/bookings/BookingWizard.tsx`
- `components/bookings/steps/CustomBundleStep.tsx`
- `components/bookings/steps/SummaryStep.tsx`
- `docs/07_handoffs/qa-canonical-runbook.md`
- `docs/07_handoffs/qa-dispatcher.json`
- `docs/07_handoffs/zone-map.json`
- `docs/orchestration/CURRENT_SPRINT.md`
- `docs/orchestration/ROADMAP.md`
- `docs/orchestration/STATE.json`
- `lib/bookings/custom-bundle.ts`
- `scripts/qa/bookings/custom-bundle-contract.ts`

## Utilities Created

- `formatCustomBundlePriceDisplay(item)` centralizes the presentation for `aggregate_only`, `included`, and `itemized` pricing.
- `countCustomBundleAggregateOnlySelections(lines)` counts distinct aggregate-only selections instead of summing quantities.

## Canonical Script

- `pnpm exec tsx scripts/qa/bookings/custom-bundle-contract.ts`

## Validation Results

- Script: `booking_custom_bundle_contract OK`
- Lint: passed with pre-existing warnings only
- TypeScript: passed
- Build: passed, but printed the known BCV/Prisma external error during static generation:
  - `[BCV-RATE] Error: SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string`
- `git diff --check`: clean

## Risks

- The build still logs the known BCV/Prisma external error during generation, although the overall build exits successfully.
- The dispatcher and runbook now include a new booking QA route that must remain aligned with the script.
- `docs/07_handoffs/zone-map.json` was rewritten without BOM only to unblock mandatory preflight parsing.

## Blockers

- None for the sprint itself.

## Vercel Status

- Not checked yet for this commit.

## Preview URL

- `null`

## Recommended State

- `TECHNICALLY_VALIDATED`

## Director Next Action

- ChatGPT reviews BKG-01 and decides whether to start the backend mult-item contract sprint.
