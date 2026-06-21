# Director-Codex Orchestration Control

This protocol defines how ChatGPT, Codex, GitHub, Vercel Preview, and the user coordinate the booking evolution work.

## Roles

### ChatGPT - Director

- Keeps the final objective and roadmap in view.
- Reads the latest commit, diff, handoff, checks, and state before deciding.
- Chooses exactly one next-sprint decision:
  - `CONTINUE`
  - `FIX_REQUIRED`
  - `BLOCKED`
  - `RELEASE_CANDIDATE`
- Does not modify production code directly.
- Does not declare manual QA approved.
- Does not authorize production on its own.

### Codex - Executor

- Reads `AGENTS.md` and `docs/orchestration` before working.
- Executes only the sprint defined by the Director.
- Does not expand scope on its own initiative.
- Implements, validates, creates the commit, pushes it, and records the handoff.
- Does not decide the next sprint.
- Does not declare a Release Candidate on its own.
- Does not declare manual QA approved.
- Does not promote production.

### GitHub - Source of Truth

GitHub must preserve:

- code;
- commits;
- state;
- roadmap;
- decisions;
- handoffs;
- risks;
- Release Candidate records.

### User - Final Authority

The user:

- does not need to perform manual QA between sprints;
- performs one single integral manual QA when the system reaches Release Candidate;
- is the only person authorized to write `QA MANUAL APROBADA`;
- is the only person authorized to write `AUTORIZO PASO A PRODUCCION`.

## Operating Flow

1. ChatGPT reviews GitHub.
2. ChatGPT defines a closed sprint.
3. The user pastes the prompt into Codex.
4. Codex implements.
5. Codex runs technical validations.
6. Codex creates the commit and push.
7. Codex updates the handoff and state.
8. The user writes to ChatGPT: `Revisa el ultimo commit y continua con el siguiente sprint.`
9. ChatGPT inspects GitHub.
10. ChatGPT decides `CONTINUE`, `FIX_REQUIRED`, `BLOCKED`, or `RELEASE_CANDIDATE`.
11. The cycle repeats without intermediate manual QA.
12. When Release Candidate is reached, all development stops.
13. The user performs one integral manual QA.
14. Production remains blocked until explicit authorization.

## Allowed Technical Validations

These checks are allowed and do not count as manual QA:

- `pnpm lint`
- `pnpm exec tsc --noEmit`
- `pnpm build`
- `git diff --check`
- unit tests
- pure calculation tests
- isolated integration tests
- non-destructive automated Preview checks
- Vercel checks
- diff review by the Director

Do not call these validations `QA MANUAL APROBADA`.

## Allowed State Values

- `PLANNED`
- `IN_PROGRESS`
- `TECHNICALLY_VALIDATED`
- `DIRECTOR_REVIEW`
- `APPROVED_FOR_NEXT_SPRINT`
- `FIX_REQUIRED`
- `BLOCKED`
- `RELEASE_CANDIDATE`
- `READY_FOR_MANUAL_QA`
- `QA_FAILED`
- `QA_APPROVED`
- `READY_FOR_PRODUCTION`
- `DONE`

Only the user may authorize the transition `READY_FOR_MANUAL_QA -> QA_APPROVED` by writing `QA MANUAL APROBADA`.
Only the user may authorize production by writing `AUTORIZO PASO A PRODUCCION`.

## Safety Rules

Immutable references:

- Repository: `BKG-dev/turpialsound`
- Production SHA: `d123e730807cdacf5bf96089b915506aeef20932`
- Integration branch: `codex/preview-arma-tu-paquete-2026-06-19`
- Orchestration start SHA: `656ec6d7dd1c90babb42dfc7d6247b106b3ed8e0`

During supervised autonomous development it is forbidden to:

- merge to production;
- change the production branch;
- force push;
- rebase;
- promote a deployment;
- modify production variables;
- remove Preview guards;
- run production migrations;
- run production seeds;
- run `prisma db push`;
- send real payments;
- send real email;
- send real WhatsApp messages;
- create real Google Calendar events;
- create real bookings from Preview;
- use the production `DATABASE_URL` for mutative tests.

## Database Gate

Before any sprint that implements real backend writes, there must be an isolated data environment:

- local PostgreSQL;
- local Docker;
- database branch;
- independent Preview database;
- or another explicitly non-production environment.

If there is no isolated database:

- the contract may be designed;
- pure code may be written;
- adapters and mock-based tests may be created;
- mutative tests may not be executed;
- the sprint must stop before validating real persistence.
