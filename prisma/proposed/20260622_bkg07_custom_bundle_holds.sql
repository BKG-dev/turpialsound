ALTER TABLE "booking_requests"
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "requestFingerprint" TEXT,
  ADD COLUMN "holdAcquiredAt" TIMESTAMPTZ,
  ADD COLUMN "holdExpiresAt" TIMESTAMPTZ;

CREATE UNIQUE INDEX "booking_requests_idempotency_key_uniq"
  ON "booking_requests" ("idempotencyKey")
  WHERE "idempotencyKey" IS NOT NULL;

CREATE INDEX "booking_requests_hold_expires_at_idx"
  ON "booking_requests" ("holdExpiresAt")
  WHERE "holdExpiresAt" IS NOT NULL;

ALTER TABLE "booking_requests"
  ADD CONSTRAINT "booking_requests_idempotency_pair_chk"
    CHECK (
      ("idempotencyKey" IS NULL AND "requestFingerprint" IS NULL)
      OR
      ("idempotencyKey" IS NOT NULL AND "requestFingerprint" IS NOT NULL)
    ),
  ADD CONSTRAINT "booking_requests_idempotency_key_format_chk"
    CHECK (
      "idempotencyKey" IS NULL
      OR "idempotencyKey" ~ '^[A-Za-z0-9:_-]{16,128}$'
    ),
  ADD CONSTRAINT "booking_requests_request_fingerprint_format_chk"
    CHECK (
      "requestFingerprint" IS NULL
      OR "requestFingerprint" ~ '^[0-9a-f]{64}$'
    ),
  ADD CONSTRAINT "booking_requests_hold_window_pair_chk"
    CHECK (
      ("holdAcquiredAt" IS NULL AND "holdExpiresAt" IS NULL)
      OR
      ("holdAcquiredAt" IS NOT NULL AND "holdExpiresAt" IS NOT NULL)
    ),
  ADD CONSTRAINT "booking_requests_hold_window_order_chk"
    CHECK (
      "holdAcquiredAt" IS NULL
      OR "holdExpiresAt" > "holdAcquiredAt"
    );
