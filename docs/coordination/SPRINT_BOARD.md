# SPRINT_BOARD

## Active Sprints

| Sprint | Owner | Branch | Status | Lock | Next Action |
|---|---|---|---|---|---|
| Coordination Bus Level 2 | Jean | `Jean/s00-coordination-bus-level-2-2026-05-07` | ACTIVE | `docs/coordination/**` | Publish coordination docs and keep shared state in sync |
| M1 Reconcile Protected Flow | Manuel | `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07` | QA_PENDING | marketplace transaction flow (`actions/marketplace/**`, `components/marketplace/**`) | Execute functional QA buyer/seller/admin and emit SYNC_PACKET |

## Current Integration State

- Mother `79cb265` is healthy post ola1 merge.
- Reconcile prep `74647c0` is ready for functional QA.
- Merge to mother is blocked until QA/gate final closes with no P0.

## Superseded / Do Not Use

| Branch | Status | Rule |
|---|---|---|
| `Manuel/s02-marketplace-protected-flow-e2e-2026-05-07` | SUPERSEDED | DO NOT USE for new integration work |

## Blocked Sprints

| Sprint | Blocker | Owner Needed |
|---|---|---|
| M1 Reconcile to mother | Missing functional QA packet (buyer/seller/admin) | Manuel + Jean gate |

## Prohibited In Parallel

- Any merge to mother while M1 reconcile QA is pending.
- Any sprint that reopens superseded M1 old branch.
- Any sprint that modifies global docs under active control tower lock without Jean.