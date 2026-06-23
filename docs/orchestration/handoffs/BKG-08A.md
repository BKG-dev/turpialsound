# Handoff BKG-08A

- Sprint ID: `BKG-08A`
- Objective: `Contrato y esquema aislado de pago consolidado`
- Branch: `codex/preview-arma-tu-paquete-2026-06-19`
- Base SHA: `33bf4fb91f3a17cd26ebd1cf0952194aefae2f74`
- Final SHA: `SELF -- el commit que contiene este handoff`

## Files Modified

- `lib/bookings/custom-bundle-payment-contract.ts`
- `prisma/proposed/20260623_bkg08_custom_bundle_payment_reports.sql`
- `scripts/qa/bookings/custom-bundle-payment-contract.ts`
- `scripts/qa/bookings/isolated-custom-bundle-payment-schema.ts`
- `.github/workflows/booking-isolated-custom-bundle-payment-contract.yml`
- `docs/07_handoffs/qa-dispatcher.json`
- `docs/07_handoffs/qa-canonical-runbook.md`
- `docs/orchestration/BKG08_PAYMENT_SCHEMA_PROPOSAL.md`
- `docs/orchestration/PAYMENT_GATE.json`
- `docs/orchestration/CURRENT_SPRINT.md`
- `docs/orchestration/ROADMAP.md`
- `docs/orchestration/STATE.json`
- `docs/orchestration/decisions/BKG-07C1-director-review.md`
- `docs/orchestration/decisions/BKG-08A-consolidated-payment-contract.md`

## Changes Made

- introduced a pure consolidated payment contract for `Arma tu paquete`;
- proposed additive PostgreSQL fields for payment reporting on `booking_requests`;
- registered canonical QA routes for the contract script and isolated schema gate;
- kept the legacy payment fixture compatible across the additive proposals by separating payment fixture idempotency keys;
- normalized orchestration to point at BKG-08A pending CI validation.

## Out of Scope

- transactional payment reporting;
- blob boundary;
- notifications;
- wizard integration;
- production;
- manual QA.

## Decisions Applied

- the server remains the source of truth for payment eligibility and totals;
- the client cannot supply payment totals, fingerprints, idempotency keys, or reporting timestamps;
- the isolated PostgreSQL gate is the only place where the proposed SQL is exercised.

## Technical Validations

- remote run `28056718242` / job `83060803906` succeeded;
- booking payment contract gate succeeded;
- isolated payment schema gate succeeded.

## Automated Tests

- `pnpm exec tsx scripts/qa/bookings/custom-bundle-payment-contract.ts` ✅
- `pnpm lint` ✅
- `pnpm exec tsc --noEmit` ✅
- `git diff --check` ✅

## Risks

- payment reporting must remain isolated from production deployment and from any direct client-controlled monetary input;
- transactional reporting, blob boundary, and production promotion remain out of scope for the next sprint.

## Blockers

- none

## Vercel Status

- success

## Preview URL

- `Vercel – turpialsound`: `https://vercel.com/bkgs-projects-829c67c1/turpialsound/BQdajWkAdqTvXTFX7vuC2LTyo2HV`
- `Vercel – turpialsong-merge-clean-20260516-220435`: `https://vercel.com/bkgs-projects-829c67c1/turpialsong-merge-clean-20260516-220435/6t4k4V6bavCebvxrJdGRAWM1vPyJ`

## Recommended State

- `TECHNICALLY_VALIDATED`

## Director Next Action

- ChatGPT reviews BKG-08A and defines transactional payment reporting.
