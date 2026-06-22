# Isolated Database Runbook

## Goal

Prepare a non-production database for `BKG-04` without touching production or the current Preview environment.

## Current Audit

- Docker CLI: unavailable
- Docker daemon: unavailable
- Docker Compose: unavailable
- `psql`: unavailable
- `pg_dump`: unavailable
- Versioned evidence of an isolated database in the repository: none found

## Route A - Docker Local

Eligible only if Docker CLI and the daemon are available.

Future plan:

- PostgreSQL in a dedicated container
- local volume only
- non-production local port
- generated development credentials
- `DATABASE_URL` isolated to the local session
- schema copy without sensitive data
- migrations applied only to the container
- safe teardown documented

Do not execute these steps now.

## Route B - Existing Isolated PostgreSQL

Eligible only if a non-production instance is already explicitly identified.

Future plan:

- verify ownership and isolation
- generate a backup first
- apply migrations only there
- never reuse the production connection
- document rollback

Do not invent an instance.
Do not reuse production Neon.
Do not assume Preview equals isolated database.

## Route C - GitHub Actions Ephemeral PostgreSQL

Eligible only if the GitHub Actions workflow is available and validates successfully.

Future plan:

- GitHub Actions runner on Ubuntu
- PostgreSQL service container
- the database is destroyed when the job ends
- no secrets required
- no production connection
- suitable for migration and persistence testing
- not a replacement for backup and rollback planning

## Selected Next Route

Selected next route: `GITHUB_ACTIONS_EPHEMERAL_POSTGRES_PENDING_VALIDATION`

Reason: local Docker and PostgreSQL CLI are unavailable, so the next proof point is the ephemeral CI gate.
