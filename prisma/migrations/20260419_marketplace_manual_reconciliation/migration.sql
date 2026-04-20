ALTER TABLE "mp_transactions"
ADD COLUMN IF NOT EXISTS "paymentSenderBank" TEXT,
ADD COLUMN IF NOT EXISTS "paymentPaidAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "mp_transactions_paymentReference_idx" ON "mp_transactions"("paymentReference");
CREATE INDEX IF NOT EXISTS "mp_transactions_paymentSenderBank_idx" ON "mp_transactions"("paymentSenderBank");
CREATE INDEX IF NOT EXISTS "mp_transactions_paymentPaidAt_idx" ON "mp_transactions"("paymentPaidAt");
