-- Phase 1: Marketplace Rate Schema
-- Adds frozen rate columns to mp_transactions (nullable - no impact on historical data)
-- Creates mp_reference_rate_snapshots table for BCV/reference rate audit trail
-- Migration: 20260505_marketplace_rate_schema_fase1

-- ============================================================================
-- 1. ADD FROZEN RATE COLUMNS TO mp_transactions
-- ============================================================================

ALTER TABLE "mp_transactions"
ADD COLUMN IF NOT EXISTS "frozenRate"            DECIMAL(12,4),
ADD COLUMN IF NOT EXISTS "frozenRateSource"      TEXT,
ADD COLUMN IF NOT EXISTS "frozenRateFechaValor"  TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "rateSnapshotId"        TEXT;

-- ============================================================================
-- 2. INDEXES FOR LOOKUP BY FROZEN RATE SOURCE AND SNAPSHOT
-- ============================================================================

CREATE INDEX IF NOT EXISTS "mp_transactions_frozenRateSource_idx" ON "mp_transactions"("frozenRateSource");
CREATE INDEX IF NOT EXISTS "mp_transactions_rateSnapshotId_idx"   ON "mp_transactions"("rateSnapshotId");

-- ============================================================================
-- 3. CREATE mp_reference_rate_snapshots (BCV / OFFICIAL RATE AUDIT TRAIL)
--    Analogous to mp_binance_rate_snapshots (20260429_marketplace_binance_rate_snapshots)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "mp_reference_rate_snapshots" (
  "id" TEXT NOT NULL,
  "rate"       DECIMAL(12,4) NOT NULL,
  "fechaValor" TIMESTAMP(3)  NOT NULL,
  "source"     TEXT          NOT NULL,
  "mode"       TEXT          NOT NULL,
  "metadata"   JSONB,
  "createdAt"  TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "mp_reference_rate_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "mp_reference_rate_snapshots_fechaValor_idx" ON "mp_reference_rate_snapshots"("fechaValor");
CREATE INDEX IF NOT EXISTS "mp_reference_rate_snapshots_createdAt_idx"  ON "mp_reference_rate_snapshots"("createdAt");
CREATE INDEX IF NOT EXISTS "mp_reference_rate_snapshots_source_idx"     ON "mp_reference_rate_snapshots"("source");
CREATE INDEX IF NOT EXISTS "mp_reference_rate_snapshots_mode_idx"        ON "mp_reference_rate_snapshots"("mode");
