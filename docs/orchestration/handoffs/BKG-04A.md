# Handoff BKG-04A

- Sprint ID: `BKG-04A`
- Objective: Propuesta aditiva de esquema snapshot-backed
- Branch: `codex/preview-arma-tu-paquete-2026-06-19`
- Base SHA: `2d64bbff87f4f844378bc93c3e0395fc6b73ba92`
- Final SHA: `SELF -- el commit que contiene este handoff.`

## Files Modified

- `prisma/proposed/20260622_bkg04_snapshot_booking_items.sql`
- `.github/workflows/booking-isolated-snapshot-schema.yml`
- `scripts/qa/bookings/isolated-snapshot-schema-gate.mjs`
- `docs/orchestration/BKG04_SCHEMA_PROPOSAL.md`
- `docs/orchestration/PERSISTENCE_GATE.json`
- `docs/orchestration/decisions/BKG-04EV-director-review.md`
- `docs/orchestration/decisions/BKG-04A-schema-proposal.md`
- `docs/orchestration/CURRENT_SPRINT.md`
- `docs/orchestration/ROADMAP.md`
- `docs/orchestration/STATE.json`

## Changes Made

- Added a non-deployable additive SQL proposal for snapshot-backed booking items.
- Added an isolated PostgreSQL schema gate workflow for GitHub Actions.
- Added a script that validates legacy compatibility, snapshot lines, unique slug rules, foreign keys, and cleanup.
- Added orchestration documentation for the schema proposal and the new sprint state.

## Out of Scope

- `schema.prisma` changes;
- generated Prisma client changes;
- booking wizard wiring;
- production changes;
- migrations;
- seeds;
- `prisma db push`;
- QA manual.

## Controls Against Production

- `schema.prisma` remains untouched.
- `generated/prisma` remains untouched.
- The workflow only targets the integration branch.
- The workflow uses an ephemeral PostgreSQL service container.
- The script rejects remote database hosts and nonlocal URLs.
- No production datasource is used.

## Technical Validations

- `pnpm exec prisma migrate diff --help`
- `node --check scripts/qa/bookings/isolated-snapshot-schema-gate.mjs`
- `git diff --check`

## Automated Tests

- `gh run view 27948828220 --json databaseId,headSha,status,conclusion,event,workflowName,url,jobs`
- `gh run view 27948828220 --log`
- `booking_isolated_snapshot_schema_gate OK`
- `legacy compatibility: verified`
- `snapshot items: verified`
- `unique slug: verified`
- `foreign key: verified`
- `cleanup: verified`

## Remote Validation

- Run ID: `27948828220`
- Workflow: `Booking Isolated Snapshot Schema`
- Head SHA: `c45ca6470ea2fd5092af1b5b739e3fa213c584d6`
- Job: `gate`
- Conclusion: `success`
- Repository clean: verified

## Risks

- The schema proposal passed the isolated GitHub Actions gate.
- The application persistence adapter is not implemented yet.
- `schema.prisma` and `generated/prisma` remain intentionally unchanged.
- The proposed SQL is not an authorized production migration.
- A future application migration still requires explicit Director review.

## Blockers

- none

## Vercel Status

- Not required for this sprint.

## Preview URL

- `null`

## Recommended State

- `TECHNICALLY_VALIDATED`

## Director Next Action

- ChatGPT reviews the corrected BKG-04A state and defines BKG-04B isolated mult-item persistence planning.
