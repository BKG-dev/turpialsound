DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'mp_exchange_rate_kind'
  ) THEN
    CREATE TYPE "mp_exchange_rate_kind" AS ENUM ('BCV', 'BINANCE');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "mp_reference_rate_snapshots" (
  "id" TEXT NOT NULL,
  "rate" DECIMAL(12,4) NOT NULL,
  "fechaValor" TIMESTAMP(3) NOT NULL,
  "source" TEXT NOT NULL,
  "mode" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "mp_reference_rate_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "mp_reference_rate_snapshots_fechaValor_idx" ON "mp_reference_rate_snapshots"("fechaValor");
CREATE INDEX IF NOT EXISTS "mp_reference_rate_snapshots_createdAt_idx" ON "mp_reference_rate_snapshots"("createdAt");
CREATE INDEX IF NOT EXISTS "mp_reference_rate_snapshots_source_idx" ON "mp_reference_rate_snapshots"("source");

ALTER TABLE IF EXISTS "mp_transactions"
  ADD COLUMN IF NOT EXISTS "exchangeRateValue" DECIMAL(12,4),
  ADD COLUMN IF NOT EXISTS "exchangeRateSource" TEXT,
  ADD COLUMN IF NOT EXISTS "exchangeRateKind" "mp_exchange_rate_kind",
  ADD COLUMN IF NOT EXISTS "exchangeRateFechaValor" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "exchangeRateCapturedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "buyerAmountBs" DECIMAL(10,2);

DO $$
BEGIN
  IF to_regclass('public.mp_transactions') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "mp_transactions_exchangeRateKind_idx" ON "mp_transactions"("exchangeRateKind")';
    EXECUTE 'CREATE INDEX IF NOT EXISTS "mp_transactions_exchangeRateCapturedAt_idx" ON "mp_transactions"("exchangeRateCapturedAt")';
  END IF;
END
$$;
