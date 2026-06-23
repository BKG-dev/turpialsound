-- BKG-08A: propuesta aditiva aislada para el reporte consolidado de pagos.
-- No mover este archivo a prisma/migrations/.

ALTER TABLE "booking_requests"
  ADD COLUMN "paymentMethod" TEXT,
  ADD COLUMN "paymentReference" TEXT,
  ADD COLUMN "paymentNormalizedReference" TEXT,
  ADD COLUMN "paymentReportedAt" TIMESTAMPTZ,
  ADD COLUMN "paymentExpectedTotalUsdSnapshot" NUMERIC(10,2),
  ADD COLUMN "paymentReportIdempotencyKey" TEXT,
  ADD COLUMN "paymentReportFingerprint" TEXT;

CREATE UNIQUE INDEX "booking_requests_payment_report_idempotency_key_uniq"
  ON "booking_requests" ("paymentReportIdempotencyKey")
  WHERE "paymentReportIdempotencyKey" IS NOT NULL;

CREATE INDEX "booking_requests_payment_reported_at_idx"
  ON "booking_requests" ("paymentReportedAt")
  WHERE "paymentReportedAt" IS NOT NULL;

CREATE INDEX "booking_requests_payment_normalized_reference_idx"
  ON "booking_requests" ("paymentNormalizedReference")
  WHERE "paymentNormalizedReference" IS NOT NULL;

ALTER TABLE "booking_requests"
  ADD CONSTRAINT "booking_requests_payment_report_all_or_none_chk"
  CHECK (
    (
      "paymentMethod" IS NULL
      AND "paymentReference" IS NULL
      AND "paymentNormalizedReference" IS NULL
      AND "paymentReportedAt" IS NULL
      AND "paymentExpectedTotalUsdSnapshot" IS NULL
      AND "paymentReportIdempotencyKey" IS NULL
      AND "paymentReportFingerprint" IS NULL
    )
    OR
    (
      "paymentMethod" IS NOT NULL
      AND "paymentReference" IS NOT NULL
      AND "paymentNormalizedReference" IS NOT NULL
      AND "paymentReportedAt" IS NOT NULL
      AND "paymentExpectedTotalUsdSnapshot" IS NOT NULL
      AND "paymentReportIdempotencyKey" IS NOT NULL
      AND "paymentReportFingerprint" IS NOT NULL
    )
  );

ALTER TABLE "booking_requests"
  ADD CONSTRAINT "booking_requests_payment_method_chk"
  CHECK (
    "paymentMethod" IS NULL
    OR "paymentMethod" IN ('pago_movil', 'transferencia', 'binance', 'efectivo')
  );

ALTER TABLE "booking_requests"
  ADD CONSTRAINT "booking_requests_payment_reference_format_chk"
  CHECK (
    "paymentReference" IS NULL
    OR (
      char_length(btrim("paymentReference")) BETWEEN 1 AND 120
      AND position(E'\n' in "paymentReference") = 0
      AND position(E'\r' in "paymentReference") = 0
      AND char_length(btrim("paymentReference")) = char_length("paymentReference")
      AND "paymentReference" ~ E'\\S'
    )
  );

ALTER TABLE "booking_requests"
  ADD CONSTRAINT "booking_requests_payment_normalized_reference_format_chk"
  CHECK (
    "paymentNormalizedReference" IS NULL
    OR "paymentNormalizedReference" ~ '^[A-Z0-9]{1,80}$'
  );

ALTER TABLE "booking_requests"
  ADD CONSTRAINT "booking_requests_payment_report_idempotency_key_format_chk"
  CHECK (
    "paymentReportIdempotencyKey" IS NULL
    OR "paymentReportIdempotencyKey" ~ '^[A-Za-z0-9:_-]{16,128}$'
  );

ALTER TABLE "booking_requests"
  ADD CONSTRAINT "booking_requests_payment_report_fingerprint_format_chk"
  CHECK (
    "paymentReportFingerprint" IS NULL
    OR "paymentReportFingerprint" ~ '^[a-f0-9]{64}$'
  );

ALTER TABLE "booking_requests"
  ADD CONSTRAINT "booking_requests_payment_expected_total_chk"
  CHECK (
    "paymentExpectedTotalUsdSnapshot" IS NULL
    OR (
      "paymentExpectedTotalUsdSnapshot" > 0
      AND "paymentExpectedTotalUsdSnapshot" <= 99999999.99
      AND "paymentExpectedTotalUsdSnapshot" = round("paymentExpectedTotalUsdSnapshot"::numeric, 2)
    )
  );

ALTER TABLE "booking_requests"
  ADD CONSTRAINT "booking_requests_payment_report_hold_window_chk"
  CHECK (
    "paymentReportedAt" IS NULL
    OR (
      "bookingMode" = 'custom_bundle'
      AND "pricingSource" = 'server_catalog_v1'
      AND "holdAcquiredAt" IS NOT NULL
      AND "holdExpiresAt" IS NOT NULL
      AND "paymentReportedAt" >= "holdAcquiredAt"
      AND "paymentReportedAt" < "holdExpiresAt"
    )
  );
