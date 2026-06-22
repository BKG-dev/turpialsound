# Handoff BKG-04E

- Sprint ID: `BKG-04E`
- Objective: PostgreSQL efimero aislado en GitHub Actions
- Branch: `codex/preview-arma-tu-paquete-2026-06-19`
- Base SHA: `3cbaf93922221f3d0e33c74dd1b5504fc51cb176`
- Final SHA: `SELF -- el commit que contiene este handoff.`

## Files Modified

- `.github/workflows/booking-isolated-postgres-gate.yml`
- `scripts/qa/bookings/isolated-postgres-gate.mjs`
- `docs/orchestration/PERSISTENCE_GATE.json`
- `docs/orchestration/ISOLATED_DATABASE_RUNBOOK.md`
- `docs/orchestration/decisions/BKG-04G-director-review.md`
- `docs/orchestration/decisions/BKG-04E-ephemeral-postgres.md`
- `docs/orchestration/CURRENT_SPRINT.md`
- `docs/orchestration/ROADMAP.md`
- `docs/orchestration/STATE.json`

## Changes Made

- Added a GitHub Actions workflow that runs an ephemeral PostgreSQL service container.
- Added a Node script that validates the isolated database, performs a temporary write, and verifies rollback.
- Updated the persistence gate JSON to reflect the CI-based candidate strategy.
- Expanded the isolated database runbook with the GitHub Actions route.
- Updated orchestration decisions, current sprint, roadmap, and machine-readable state.

## Out of Scope

- functional code changes;
- Prisma schema changes;
- migrations;
- seeds;
- `prisma db push`;
- booking wizard wiring;
- production changes;
- QA manual.

## Controls Against Production

- The workflow uses `permissions: contents: read` only.
- The workflow does not target `pull_request` or production branches.
- The workflow does not use remote production databases.
- The script rejects non-local hosts and remote platforms.
- The script rejects missing opt-in flags before connecting.

## Local Validations

- `git diff --check` will be run before commit.
- `PERSISTENCE_GATE.json` will parse as JSON.
- `STATE.json` will parse as JSON.
- `node --check scripts/qa/bookings/isolated-postgres-gate.mjs` will be used to validate syntax.
- The gate script will not be executed locally because no local PostgreSQL is available.

## Remote Validation

- Remote workflow status: pending.

## Risks

- The ephemeral GitHub Actions route still needs remote validation.
- The workflow may be unavailable if GitHub Actions is disabled for the repository.

## Blockers

- `EPHEMERAL_POSTGRES_CI_NOT_VALIDATED`

## Vercel Status

- Not required for this gate.

## Preview URL

- `null`

## Recommended State

- `DIRECTOR_REVIEW`

## Director Next Action

- ChatGPT verifies the ephemeral PostgreSQL workflow and decides whether `BKG-04` can start.
