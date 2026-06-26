# BKG-08F1 Handoff

- Sprint: `BKG-08F1`
- Base SHA: `e86a4426b2cd715c7e95d1ea5020bc34460704bd`
- State: `DIRECTOR_REVIEW`
- Result: `PAYMENT_UPLOAD_TRANSPORT_CORRECTION_PENDING_CI`

## Initial Notes

- Bounded raw upload reading is being introduced to replace buffered transport reads.
- Runtime handling must stay strict for real routes.
- The upload response must stay minimal and must not expose ownership metadata.
- QA shims remain isolated under `scripts/qa/shims`.
- Preview, production, and the wizard remain disconnected from this correction gate.
- Production is not authorized.
