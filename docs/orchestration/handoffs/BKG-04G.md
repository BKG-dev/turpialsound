# Handoff BKG-04G

- Sprint ID: `BKG-04G`
- Objective: Gate de persistencia aislada y arquitectura de `BookingRequestItem`
- Branch: `codex/preview-arma-tu-paquete-2026-06-19`
- Base SHA: `7f5167daa3e0d353e2a6d7385f41cbd103da6be3`
- Final SHA: `SELF -- el commit que contiene este handoff.`

## Files Modified

- `docs/orchestration/PERSISTENCE_GATE.json`
- `docs/orchestration/PERSISTENCE_ARCHITECTURE.md`
- `docs/orchestration/ISOLATED_DATABASE_RUNBOOK.md`
- `docs/orchestration/decisions/BKG-03-director-review.md`
- `docs/orchestration/decisions/BKG-04-persistence-readiness.md`
- `docs/orchestration/CURRENT_SPRINT.md`
- `docs/orchestration/ROADMAP.md`
- `docs/orchestration/STATE.json`

## Changes Made

- Audited the local toolchain for Docker and PostgreSQL readiness using read-only commands.
- Captured the isolated database gate in machine-readable JSON.
- Frozen the persistence architecture for future `BookingRequestItem` snapshots.
- Added a safe runbook for the next sprint once an isolated database exists.
- Recorded versioned director review and readiness decisions.
- Updated orchestration state, roadmap, and current sprint.

## Out of Scope

- functional code changes;
- Prisma schema changes;
- migrations;
- seeds;
- database connections;
- database writes;
- QA manual;
- production changes.

## Decisions Applied

- `BKG-03` stays approved technically and advances to the persistence gate.
- The persistence gate is currently `BLOCKED`.
- The approved architecture is `snapshot_backed_booking_request_items`.

## Technical Validations

- `git status --short`: clean after removing the preflight run cache.
- `git branch --show-current`: `codex/preview-arma-tu-paquete-2026-06-19`.
- `git rev-parse --show-toplevel`: repository root confirmed.
- `git rev-parse HEAD`: `7f5167daa3e0d353e2a6d7385f41cbd103da6be3`.
- `node --version`: `v22.17.1`.
- `pnpm --version`: `10.18.1`.
- `docker --version`: unavailable.
- `docker compose version`: unavailable.
- `docker info`: unavailable.
- `pg_dump --version`: unavailable.
- `psql --version`: unavailable.
- `git diff --check`: clean after documentation edits are prepared.

## Automated Tests

- None. This is a document-only gate.

## Risks

- No Docker CLI or daemon is available on this machine.
- No PostgreSQL CLI tools are available on this machine.
- No versioned isolated database evidence is available in the repository.

## Blockers

- `ISOLATED_DATABASE_NOT_CREATED`

## Vercel Status

- Not required for this document-only gate.

## Preview URL

- `null`

## Recommended State

- `BLOCKED`

## Director Next Action

- ChatGPT reviews the persistence blocker and defines the isolated database setup step.
