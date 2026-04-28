-- CreateEnum
CREATE TYPE "mp_payment_method_type" AS ENUM ('MERCANTIL_C2P', 'MERCANTIL_PAGO_MOVIL', 'MERCANTIL_BOTON_PAGO', 'BINANCE_PAY', 'ZELLE', 'CRYPTO_WALLET_MANUAL');

-- CreateEnum
CREATE TYPE "mp_transaction_status" AS ENUM ('INITIATED', 'PENDING_PAYMENT', 'PAYMENT_RECEIVED', 'VALIDATING', 'PAYMENT_FAILED', 'IN_ESCROW', 'DELIVERY_CONFIRMED', 'RELEASED', 'REFUNDED', 'DISPUTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "mp_payout_method_type" AS ENUM ('ZELLE', 'PAGO_MOVIL', 'CRYPTO_WALLET', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "mp_payout_status" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "mp_dispute_status" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED_BUYER', 'RESOLVED_SELLER', 'CLOSED');

-- CreateEnum
CREATE TYPE "mp_listing_status" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'SOLD_OUT', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "mp_user_role" AS ENUM ('USER', 'SOCIO', 'SUPER');

-- CreateTable
CREATE TABLE "site_counter" (
    "id" INTEGER NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 81000,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_counter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mp_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" TIMESTAMP(3),
    "displayName" TEXT NOT NULL,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verificationLevel" TEXT NOT NULL DEFAULT 'none',
    "isSeller" BOOLEAN NOT NULL DEFAULT true,
    "sellerRating" DECIMAL(3,2),
    "totalSales" INTEGER NOT NULL DEFAULT 0,
    "totalPurchases" INTEGER NOT NULL DEFAULT 0,
    "passwordHash" TEXT,
    "role" "mp_user_role" NOT NULL DEFAULT 'USER',
    "phone" TEXT,
    "whatsappConsent" BOOLEAN NOT NULL DEFAULT false,
    "whatsappConsentAt" TIMESTAMP(3),
    "passwordResetToken" TEXT,
    "passwordResetTokenExpiresAt" TIMESTAMP(3),
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "bannedAt" TIMESTAMP(3),
    "bannedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mp_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mp_payout_methods" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "methodType" "mp_payout_method_type" NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "encryptedData" TEXT NOT NULL,
    "displayLabel" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mp_payout_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mp_listings" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[],
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "coverImageUrl" TEXT,
    "mediaUrls" TEXT[],
    "hasInventory" BOOLEAN NOT NULL DEFAULT false,
    "inventory" INTEGER,
    "status" "mp_listing_status" NOT NULL DEFAULT 'DRAFT',
    "slug" TEXT NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "favoriteCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "mp_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mp_listing_questions" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "askerId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "answeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mp_listing_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mp_chat_threads" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "listingId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mp_chat_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mp_messages" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mp_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mp_transactions" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "paymentMethod" "mp_payment_method_type" NOT NULL,
    "status" "mp_transaction_status" NOT NULL DEFAULT 'INITIATED',
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "platformFeePercent" DECIMAL(5,2) NOT NULL,
    "platformFeeAmount" DECIMAL(10,2) NOT NULL,
    "sellerNetAmount" DECIMAL(10,2) NOT NULL,
    "externalTxId" TEXT,
    "paymentReference" TEXT,
    "paymentSenderBank" TEXT,
    "paymentPaidAt" TIMESTAMP(3),
    "paymentProofUrl" TEXT,
    "escrowHeldAt" TIMESTAMP(3),
    "escrowReleaseAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "buyerConfirmedAt" TIMESTAMP(3),
    "disputeReason" TEXT,
    "disputeOpenedAt" TIMESTAMP(3),
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mp_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mp_transaction_status_history" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "fromStatus" "mp_transaction_status",
    "toStatus" "mp_transaction_status" NOT NULL,
    "changedBy" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mp_transaction_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mp_disputes" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "openedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidenceUrls" TEXT[],
    "status" "mp_dispute_status" NOT NULL DEFAULT 'OPEN',
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "refundAmount" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mp_disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mp_payouts" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "method" "mp_payout_method_type" NOT NULL,
    "status" "mp_payout_status" NOT NULL DEFAULT 'PENDING',
    "transactionIds" TEXT[],
    "externalPayoutId" TEXT,
    "completedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mp_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mp_webhook_logs" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "signature" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "transactionId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mp_webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_UserFavorites" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserFavorites_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "mp_users_email_key" ON "mp_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "mp_users_passwordResetToken_key" ON "mp_users"("passwordResetToken");

-- CreateIndex
CREATE INDEX "mp_users_email_idx" ON "mp_users"("email");

-- CreateIndex
CREATE INDEX "mp_users_isSeller_idx" ON "mp_users"("isSeller");

-- CreateIndex
CREATE INDEX "mp_users_isVerified_idx" ON "mp_users"("isVerified");

-- CreateIndex
CREATE INDEX "mp_users_role_idx" ON "mp_users"("role");

-- CreateIndex
CREATE INDEX "mp_payout_methods_userId_idx" ON "mp_payout_methods"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "mp_listings_slug_key" ON "mp_listings"("slug");

-- CreateIndex
CREATE INDEX "mp_listings_sellerId_idx" ON "mp_listings"("sellerId");

-- CreateIndex
CREATE INDEX "mp_listings_status_idx" ON "mp_listings"("status");

-- CreateIndex
CREATE INDEX "mp_listings_category_idx" ON "mp_listings"("category");

-- CreateIndex
CREATE INDEX "mp_listings_slug_idx" ON "mp_listings"("slug");

-- CreateIndex
CREATE INDEX "mp_listing_questions_listingId_idx" ON "mp_listing_questions"("listingId");

-- CreateIndex
CREATE INDEX "mp_listing_questions_askerId_idx" ON "mp_listing_questions"("askerId");

-- CreateIndex
CREATE INDEX "mp_chat_threads_buyerId_idx" ON "mp_chat_threads"("buyerId");

-- CreateIndex
CREATE INDEX "mp_chat_threads_sellerId_idx" ON "mp_chat_threads"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "mp_chat_threads_buyerId_sellerId_listingId_key" ON "mp_chat_threads"("buyerId", "sellerId", "listingId");

-- CreateIndex
CREATE INDEX "mp_messages_threadId_idx" ON "mp_messages"("threadId");

-- CreateIndex
CREATE INDEX "mp_messages_senderId_idx" ON "mp_messages"("senderId");

-- CreateIndex
CREATE INDEX "mp_messages_receiverId_idx" ON "mp_messages"("receiverId");

-- CreateIndex
CREATE INDEX "mp_messages_createdAt_idx" ON "mp_messages"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "mp_transactions_idempotencyKey_key" ON "mp_transactions"("idempotencyKey");

-- CreateIndex
CREATE INDEX "mp_transactions_buyerId_idx" ON "mp_transactions"("buyerId");

-- CreateIndex
CREATE INDEX "mp_transactions_sellerId_idx" ON "mp_transactions"("sellerId");

-- CreateIndex
CREATE INDEX "mp_transactions_listingId_idx" ON "mp_transactions"("listingId");

-- CreateIndex
CREATE INDEX "mp_transactions_status_idx" ON "mp_transactions"("status");

-- CreateIndex
CREATE INDEX "mp_transactions_paymentMethod_idx" ON "mp_transactions"("paymentMethod");

-- CreateIndex
CREATE INDEX "mp_transactions_externalTxId_idx" ON "mp_transactions"("externalTxId");

-- CreateIndex
CREATE INDEX "mp_transactions_paymentReference_idx" ON "mp_transactions"("paymentReference");

-- CreateIndex
CREATE INDEX "mp_transactions_paymentSenderBank_idx" ON "mp_transactions"("paymentSenderBank");

-- CreateIndex
CREATE INDEX "mp_transactions_paymentPaidAt_idx" ON "mp_transactions"("paymentPaidAt");

-- CreateIndex
CREATE INDEX "mp_transactions_idempotencyKey_idx" ON "mp_transactions"("idempotencyKey");

-- CreateIndex
CREATE INDEX "mp_transaction_status_history_transactionId_idx" ON "mp_transaction_status_history"("transactionId");

-- CreateIndex
CREATE INDEX "mp_transaction_status_history_createdAt_idx" ON "mp_transaction_status_history"("createdAt");

-- CreateIndex
CREATE INDEX "mp_disputes_transactionId_idx" ON "mp_disputes"("transactionId");

-- CreateIndex
CREATE INDEX "mp_disputes_openedById_idx" ON "mp_disputes"("openedById");

-- CreateIndex
CREATE INDEX "mp_disputes_status_idx" ON "mp_disputes"("status");

-- CreateIndex
CREATE INDEX "mp_payouts_sellerId_idx" ON "mp_payouts"("sellerId");

-- CreateIndex
CREATE INDEX "mp_payouts_status_idx" ON "mp_payouts"("status");

-- CreateIndex
CREATE INDEX "mp_webhook_logs_provider_idx" ON "mp_webhook_logs"("provider");

-- CreateIndex
CREATE INDEX "mp_webhook_logs_transactionId_idx" ON "mp_webhook_logs"("transactionId");

-- CreateIndex
CREATE INDEX "mp_webhook_logs_processed_idx" ON "mp_webhook_logs"("processed");

-- CreateIndex
CREATE INDEX "mp_webhook_logs_createdAt_idx" ON "mp_webhook_logs"("createdAt");

-- CreateIndex
CREATE INDEX "_UserFavorites_B_index" ON "_UserFavorites"("B");

-- AddForeignKey
ALTER TABLE "mp_payout_methods" ADD CONSTRAINT "mp_payout_methods_userId_fkey" FOREIGN KEY ("userId") REFERENCES "mp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mp_listings" ADD CONSTRAINT "mp_listings_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "mp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mp_listing_questions" ADD CONSTRAINT "mp_listing_questions_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "mp_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mp_listing_questions" ADD CONSTRAINT "mp_listing_questions_askerId_fkey" FOREIGN KEY ("askerId") REFERENCES "mp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mp_chat_threads" ADD CONSTRAINT "mp_chat_threads_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "mp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mp_chat_threads" ADD CONSTRAINT "mp_chat_threads_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "mp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mp_messages" ADD CONSTRAINT "mp_messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "mp_chat_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mp_messages" ADD CONSTRAINT "mp_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "mp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mp_messages" ADD CONSTRAINT "mp_messages_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "mp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mp_transactions" ADD CONSTRAINT "mp_transactions_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "mp_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mp_transactions" ADD CONSTRAINT "mp_transactions_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "mp_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mp_transactions" ADD CONSTRAINT "mp_transactions_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "mp_listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mp_transaction_status_history" ADD CONSTRAINT "mp_transaction_status_history_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "mp_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mp_disputes" ADD CONSTRAINT "mp_disputes_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "mp_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mp_disputes" ADD CONSTRAINT "mp_disputes_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "mp_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mp_payouts" ADD CONSTRAINT "mp_payouts_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "mp_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserFavorites" ADD CONSTRAINT "_UserFavorites_A_fkey" FOREIGN KEY ("A") REFERENCES "mp_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserFavorites" ADD CONSTRAINT "_UserFavorites_B_fkey" FOREIGN KEY ("B") REFERENCES "mp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
