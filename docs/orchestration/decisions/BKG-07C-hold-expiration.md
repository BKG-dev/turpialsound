# BKG-07C Hold Expiration

1. The expiration writer scans due holds in the isolated gate only.
2. A due hold transitions from `under_review` to `rejected` and is marked `expired` in operational notes.
3. Payment-reported and active payment-proof holds remain protected.
4. Expiration runs in deterministic batches with `FOR UPDATE SKIP LOCKED`.
5. Replay classification remains strict and deterministic.
6. The release path preserves resource history and does not invent new resource assignments.
7. The acquisition regression remains part of the validation surface.
8. No wizard wiring or production promotion is allowed in this sprint.
