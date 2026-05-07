# ACTIVE_COORDINATION

## Operational Snapshot (2026-05-07)

- Mother branch (official): `integration/today-reservas-marketplace-stable-2026-05-07`
- Mother HEAD (expected/current): `79cb265` (`merge(ola1): integrate docs runtime guard qa harness and gatekeeper`)
- Critical routes status:
  - `/reservas`: healthy and frozen (do not touch)
  - `/marketplace`: active
- Reconcile in progress:
  - Branch: `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07`
  - Commit: `74647c0` (`fix(marketplace): reconcile protected transaction safeguards`)
  - Status: ready for functional QA (buyer/seller/admin) pending execution
  - Preview: <https://turpialsound-p2xipk6k4-bkgs-projects-829c67c1.vercel.app>

## Operational Truth Rule

If it is not documented in **branch**, **commit**, **preview**, **QA report**, or **SYNC_PACKET**, it does not exist operationally.

## Owners

- Jean:
  - integration and mother branch governance
  - DB/env control and Vercel env decisions
  - reservas and frozen healthy zone
  - global docs / control tower
  - merges and final gate
- Manuel:
  - marketplace product behavior
  - operational QA execution
  - buyer/seller/admin flow validation
  - rates/payout operational layer

## Coordination Rules (Level 2)

- One sprint = one owner branch.
- One lock = one owner at a time.
- Nobody works directly on mother branch.
- Nobody force-pushes another owner's branch.
- Global docs stay under Jean / control tower lock.
- Implementation agents do not edit `session-summary-active.md`; they publish an agent report.
- QA E2E results must be reported as `SYNC_PACKET`.
- If marketplace appears empty: investigate logs/runtime/DB target before UI.
- `DATABASE_URL` must be pooled and `DIRECT_URL` direct, both to integrated DB.
- Reservas healthy zone remains frozen.