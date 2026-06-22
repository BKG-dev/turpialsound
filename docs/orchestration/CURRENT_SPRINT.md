# Current Sprint

- Sprint: `BKG-04E`
- Name: PostgreSQL efimero aislado en GitHub Actions
- Objective: Prove that an ephemeral PostgreSQL service container in GitHub Actions can execute a reversible mutative probe without touching production or requiring local Docker.
- State: `DIRECTOR_REVIEW`
- Base: `3cbaf93922221f3d0e33c74dd1b5504fc51cb176`

## Scope

- create the GitHub Actions gate workflow;
- create the isolated PostgreSQL probe script;
- keep anti-production controls explicit;
- update persistence gate state and orchestration docs;
- wait for remote workflow validation.

## Out of Scope

- functional code changes;
- Prisma schema changes;
- migrations;
- seeds;
- `prisma db push`;
- booking wizard wiring;
- production changes;
- QA manual.

## Expected Result

The remote workflow is pending and must be verified by the Director before `BKG-04` can start.

## Next Action

ChatGPT verifies the ephemeral PostgreSQL workflow and decides whether `BKG-04` can start.
