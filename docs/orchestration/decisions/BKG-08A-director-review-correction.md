# BKG-08A Director Review Correction

- SHA reviewed: `7c9c1ce82b7bc3f5e829acd531db347d179e8c15`
- Decision: `FIX_REQUIRED`
- Workflow `BKG-08A`: `28056718242` success

## Finding

- Exact replay was exercised against a snapshot that still looked like `pending_payment`.
- The operational replay path must instead accept an already persisted `payment_reported` snapshot.
- A real replay could be rejected before replay classification if the contract keeps treating the persisted report as a new-report eligibility case.

## Risk

- The current semantics can reject a legitimate retry before replay classification runs.

## Action

- Execute `BKG-08A1`.

## Production

- Not authorized.
