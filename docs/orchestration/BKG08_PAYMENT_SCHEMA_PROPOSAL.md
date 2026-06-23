# BKG-08 Payment Schema Proposal

## Goal

This proposal adds consolidated payment reporting fields to `booking_requests` in an additive, isolated way.

## Summary

- `BookingRequest` remains the primary record for the booking lifecycle.
- The payment report is stored on the booking request itself in this phase.
- Existing rows keep `NULL` in the new columns until a payment report exists.
- The proposal is additive only and is not authorized for production deployment.
- `schema.prisma` remains unchanged in this sprint.
- `generated/prisma` remains unchanged in this sprint.

## Proposed Future Prisma Fragment

```prisma
model BookingRequest {
  paymentMethod                String?
  paymentReference             String?
  paymentNormalizedReference   String?
  paymentReportedAt            DateTime?
  paymentExpectedTotalUsdSnapshot Decimal? @db.Decimal(10, 2)
  paymentReportIdempotencyKey  String?
  paymentReportFingerprint     String?
}
```

## Operational Meaning

- `paymentMethod` identifies the payment channel selected by the customer.
- `paymentReference` stores the customer-visible payment reference.
- `paymentNormalizedReference` stores the canonical server-normalized reference.
- `paymentReportedAt` stores when the payment was reported.
- `paymentExpectedTotalUsdSnapshot` stores the authoritative expected amount at report time.
- `paymentReportIdempotencyKey` prevents duplicate report processing.
- `paymentReportFingerprint` ties the report to the authoritative booking state.

## Constraints and Indexes

The proposal expects these SQL-level guarantees:

- a unique partial index on `paymentReportIdempotencyKey`
- a partial index on `paymentReportedAt`
- a partial index on `paymentNormalizedReference`
- an all-or-none check across the payment report columns
- a payment method whitelist
- reference and normalized reference format checks
- a payment report fingerprint format check
- a positive expected total check
- a hold-window check that only allows reports inside an active hold

## Notes

- The payment report is intentionally coupled to the authoritative booking and hold state.
- The client does not provide totals, fingerprints, or idempotency keys.
- The proposal is only meant to be validated in the isolated PostgreSQL gate.
