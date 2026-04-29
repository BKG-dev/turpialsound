CREATE TABLE IF NOT EXISTS "mp_binance_rate_snapshots" (
  "id" TEXT NOT NULL,
  "rate" DECIMAL(12,4) NOT NULL,
  "fechaValor" TIMESTAMP(3) NOT NULL,
  "source" TEXT NOT NULL,
  "mode" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "mp_binance_rate_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "mp_binance_rate_snapshots_fechaValor_idx" ON "mp_binance_rate_snapshots"("fechaValor");
CREATE INDEX IF NOT EXISTS "mp_binance_rate_snapshots_createdAt_idx" ON "mp_binance_rate_snapshots"("createdAt");
CREATE INDEX IF NOT EXISTS "mp_binance_rate_snapshots_source_idx" ON "mp_binance_rate_snapshots"("source");
CREATE INDEX IF NOT EXISTS "mp_binance_rate_snapshots_mode_idx" ON "mp_binance_rate_snapshots"("mode");
