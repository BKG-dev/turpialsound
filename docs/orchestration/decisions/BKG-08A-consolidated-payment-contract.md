# BKG-08A Consolidated Payment Contract

1. The consolidated payment report is represented as an additive extension on `booking_requests`.
2. The server remains the source of truth for payment eligibility and expected totals.
3. The client does not supply totals, fingerprints, or idempotency keys.
4. The payment report is only valid during the authoritative hold window.
5. The payment report must remain isolated from production data and production deployment.
6. The payment report contract is validated by a pure module and a deterministic QA script.
7. The SQL proposal remains additive only and does not modify `schema.prisma`.
8. The isolated PostgreSQL gate is the only place where the proposed SQL is exercised.
9. The payment workflow must remain aligned with the earlier booking contract, repricing, schedule, resource, persistence, hold, and expiration gates.
10. Production remains blocked until the Director explicitly authorizes it.
