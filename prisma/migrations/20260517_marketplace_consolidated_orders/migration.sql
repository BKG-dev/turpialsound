-- S-MP-01: Consolidated marketplace orders and quantity-aware transactions.

CREATE TABLE "mp_orders" (
  "id" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "paymentMethod" "mp_payment_method_type" NOT NULL,
  "status" "mp_transaction_status" NOT NULL DEFAULT 'PENDING_PAYMENT',
  "amount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "paymentReference" TEXT,
  "paymentSenderBank" TEXT,
  "paymentPaidAt" TIMESTAMP(3),
  "paymentProofUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "mp_orders_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "mp_orders"
  ADD CONSTRAINT "mp_orders_buyerId_fkey"
  FOREIGN KEY ("buyerId") REFERENCES "mp_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "mp_transactions"
  ADD COLUMN "orderId" TEXT,
  ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "unitPrice" DECIMAL(10,2);

UPDATE "mp_transactions"
SET "unitPrice" = "amount"
WHERE "unitPrice" IS NULL;

ALTER TABLE "mp_transactions"
  ADD CONSTRAINT "mp_transactions_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "mp_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "mp_orders_buyerId_idx" ON "mp_orders"("buyerId");
CREATE INDEX "mp_orders_status_idx" ON "mp_orders"("status");
CREATE INDEX "mp_orders_paymentMethod_idx" ON "mp_orders"("paymentMethod");
CREATE INDEX "mp_orders_paymentReference_idx" ON "mp_orders"("paymentReference");
CREATE INDEX "mp_orders_paymentSenderBank_idx" ON "mp_orders"("paymentSenderBank");
CREATE INDEX "mp_orders_paymentPaidAt_idx" ON "mp_orders"("paymentPaidAt");
CREATE INDEX "mp_transactions_orderId_idx" ON "mp_transactions"("orderId");
