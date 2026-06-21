# Handoff ORCH-00

- Sprint ID: `ORCH-00`
- Objective: Create the shared orchestration memory and operating rules without changing functional code.
- Branch: `codex/preview-arma-tu-paquete-2026-06-19`
- Base SHA: `656ec6d7dd1c90babb42dfc7d6247b106b3ed8e0`
- Final SHA: `SELF — el commit que contiene este handoff.`

## Files Modified

- `AGENTS.md`
- `docs/orchestration/CONTROL.md`
- `docs/orchestration/ROADMAP.md`
- `docs/orchestration/STATE.json`
- `docs/orchestration/CURRENT_SPRINT.md`
- `docs/orchestration/RELEASE_CRITERIA.md`
- `docs/orchestration/FINAL_MANUAL_QA.md`
- `docs/orchestration/HANDOFF_TEMPLATE.md`
- `docs/orchestration/decisions/.gitkeep`
- `docs/orchestration/handoffs/.gitkeep`
- `docs/orchestration/handoffs/ORCH-00.md`

## Changes Made

- Defined the Director-Codex orchestration protocol.
- Documented the role split between Director, Executor, GitHub, Preview, and the user.
- Added a staged roadmap for the booking evolution work.
- Added a machine-readable orchestration state file.
- Added the current sprint record and final manual QA template.
- Added a reusable handoff template and the first concrete sprint handoff.
- Appended the orchestration protocol section to `AGENTS.md` without removing existing rules.

## Out of Scope

- Functional code changes.
- Prisma changes.
- `schema.prisma` changes.
- `.env` changes.
- Vercel configuration changes.
- migrations.
- seeds.
- `db push`.
- database writes.
- the next functional sprint.

## Decisions Applied

- ChatGPT is documented as Director.
- Codex is documented as Executor.
- GitHub is documented as source of truth.
- The user is documented as final authority for manual QA approval and production authorization.
- Manual QA is documented as a single final gate, not an inter-sprint gate.

## Technical Validations

- `git diff --check`

## Automated Tests

- None. This delivery is documentation only.

## Risks

- The orchestration layer depends on consistent human use of the protocol.
- The docs must remain aligned with future technical sprints.

## Blockers

- None for this documentation-only delivery.

## Vercel Status

- Not checked. Not required for this delivery.

## Preview URL

- `null`

## Recommended State

- `TECHNICALLY_VALIDATED`

## Director Next Action

- Review the orchestration bootstrap commit and decide the next sprint.
