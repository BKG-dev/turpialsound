# Agent Reports

This folder stores per-agent reports used for coordination and gatekeeping.

## When to create a report

Create a report every time an agent:

- closes a sprint/task,
- gets blocked,
- or requests a cross-owner decision.

## Suggested file name

`YYYY-MM-DD-sprint-owner-short-title.md`

Example:

`2026-05-07-m1-manuel-reconcile-qa-pending.md`

## Required hygiene

- No secrets.
- No passwords.
- No raw `.env` values.
- No tokens/cookies.
- No sensitive private data.

## Required references

When applicable, include:

- branch,
- commit,
- preview link,
- validation outputs,
- explicit P0/P1/P2 status.

Use `docs/coordination/templates/SYNC_PACKET.md` for structured handoff fields.