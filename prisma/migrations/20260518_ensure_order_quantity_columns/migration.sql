-- Idempotent migration for mp_orders and transaction columns
DO $$
BEGIN
  -- Create mp_orders table if not exists
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'mp_orders') THEN
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
  END IF;

  -- Add orderId to mp_transactions if not exists
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'mp_transactions' AND column_name = 'orderId') THEN
    ALTER TABLE "mp_transactions" ADD COLUMN "orderId" TEXT;
  END IF;

  -- Add quantity to mp_transactions if not exists
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'mp_transactions' AND column_name = 'quantity') THEN
    ALTER TABLE "mp_transactions" ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1;
  END IF;

  -- Add unitPrice to mp_transactions if not exists
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'mp_transactions' AND column_name = 'unitPrice') THEN
    ALTER TABLE "mp_transactions" ADD COLUMN "unitPrice" DECIMAL(10,2);
  END IF;
END $$;
