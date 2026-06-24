# BKG-08B Transactional Payment Reporting

- The payment reporting adapter runs inside an isolated SQL transaction and never accepts booking state from the client.
- The adapter locks the `BookingRequest` row, reads the real persisted state, and only then applies the pure BKG-08A1 contract.
- Exact replay is allowed for an already persisted report and must not perform new writes.
- New reports require an active hold, `pending_payment`, and the authoritative total already stored on the booking.
- Payment proofs are created only from trusted server-side metadata and their `duplicateStatus` is calculated inside the transaction.
- The adapter writes the seven payment fields atomically, transitions the operational tag to `payment_reported`, and creates one `AuditLog`.
- Any failure in proof insert, booking update, or audit insert must rollback the whole transaction.
- Blob upload, server actions, wizard wiring, notifications, and production remain out of scope for this sprint.
