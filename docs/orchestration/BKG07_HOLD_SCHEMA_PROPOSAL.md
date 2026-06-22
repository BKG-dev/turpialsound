# BKG-07 Hold Schema Proposal

This document describes the isolated SQL proposal for holds and idempotency. It does not modify `schema.prisma`, `generated/prisma`, or the production schema.

## Core Idea

- `BookingRequest` remains the primary entity.
- During an active hold window, `BookingRequest` also represents the temporal reservation record.
- No separate `Hold` table is introduced in this phase.
- The migration is additive only.
- Historical rows keep `NULL` in the new fields.

## Proposed BookingRequest Fields

- `idempotencyKey` identifies one logical server attempt.
- `requestFingerprint` prevents reusing the same key for a different authoritative request.
- `holdAcquiredAt` stores when the hold started.
- `holdExpiresAt` stores when the hold expires.

## Future Prisma Fragment

```prisma
model BookingRequest {
  idempotencyKey    String?
  requestFingerprint String?
  holdAcquiredAt    DateTime?
  holdExpiresAt     DateTime?
}
```

## SQL Enforcement

- `booking_requests_idempotency_key_uniq` is a partial unique index over `idempotencyKey` when it is not `NULL`.
- `booking_requests_hold_expires_at_idx` is a partial index over `holdExpiresAt` when it is not `NULL`.
- `booking_requests_idempotency_pair_chk` ensures the idempotency key and fingerprint are both `NULL` or both `NOT NULL`.
- `booking_requests_idempotency_key_format_chk` keeps the key within the allowed ASCII format and length.
- `booking_requests_request_fingerprint_format_chk` keeps the fingerprint as a lowercase SHA-256 hex string.
- `booking_requests_hold_window_pair_chk` keeps the hold timestamps paired.
- `booking_requests_hold_window_order_chk` keeps `holdExpiresAt` strictly greater than `holdAcquiredAt`.

## Safety Notes

- `schema.prisma` remains intact.
- `generated/prisma` remains intact.
- No production migration is authorized by this proposal.
