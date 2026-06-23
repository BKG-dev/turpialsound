# Handoff BKG-08A1

- Sprint ID: `BKG-08A1`
- Objective: `Corregir semántica operacional del replay de pago consolidado`
- Branch: `codex/preview-arma-tu-paquete-2026-06-19`
- Base SHA: `7c9c1ce82b7bc3f5e829acd531db347d179e8c15`
- Final SHA: `SELF -- el commit que contiene este handoff`

## State

- payment replay semantics are under correction;
- the replay path must classify persisted `payment_reported` snapshots directly;
- the payment gate is temporarily set to pending correction;
- production is not authorized.

## Evidence

- workflow `BKG-08A` completed successfully at `28056718242`;
- the technical issue is the replay contract semantics, not the additive schema evidence;
- the booking payment contract script now exercises realistic replay snapshots.

## Out of Scope

- BKG-08B;
- blob boundary;
- notifications;
- wizard integration;
- manual QA;
- production.

## Director Next Action

- ChatGPT verifies realistic payment replay semantics before BKG-08B.
