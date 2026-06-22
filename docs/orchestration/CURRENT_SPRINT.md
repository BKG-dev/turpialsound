# Current Sprint

- Sprint: `BKG-04G`
- Name: Gate de persistencia aislada y arquitectura de `BookingRequestItem`
- Objective: Audit the local environment for an isolated persistence path, freeze the future snapshot-backed item architecture, and produce a machine-readable readiness gate without touching the database.
- State: `BLOCKED`
- Base: `7f5167daa3e0d353e2a6d7385f41cbd103da6be3`

## Scope

- read-only environment audit for Docker and PostgreSQL tools;
- machine-readable persistence gate output;
- snapshot-backed `BookingRequestItem` architecture;
- safe runbook for the next persistence sprint;
- orchestration decision and handoff updates.

## Out of Scope

- functional code changes;
- database connections;
- database writes;
- Prisma schema changes;
- migrations;
- seeds;
- payments;
- notifications;
- Calendar;
- production changes;
- QA manual.

## Audit

- Docker CLI unavailable.
- Docker daemon unavailable.
- Docker Compose unavailable.
- `psql` unavailable.
- `pg_dump` unavailable.
- No versioned isolated database evidence found in the repository.

## Architecture

- Approved target: `snapshot_backed_booking_request_items`.
- Future migration direction: additive and compatible first, then backfill and harden.
- The current sprint does not implement persistence.

## Next Action

ChatGPT must review the persistence blocker and define the isolated database setup step before `BKG-04`.
