-- CreateEnum
CREATE TYPE "payment_proof_duplicate_status" AS ENUM ('none', 'same_booking', 'other_booking');

-- CreateTable
CREATE TABLE "payment_proofs" (
    "id" TEXT NOT NULL,
    "bookingRequestId" TEXT NOT NULL,
    "blobPathname" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "originalFilename" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reportedReference" TEXT,
    "normalizedReference" TEXT,
    "duplicateStatus" "payment_proof_duplicate_status" NOT NULL DEFAULT 'none',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "replacesProofId" TEXT,

    CONSTRAINT "payment_proofs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_proofs_blobPathname_key" ON "payment_proofs"("blobPathname");

-- CreateIndex
CREATE INDEX "payment_proofs_bookingRequestId_idx" ON "payment_proofs"("bookingRequestId");

-- CreateIndex
CREATE INDEX "payment_proofs_sha256_idx" ON "payment_proofs"("sha256");

-- CreateIndex
CREATE INDEX "payment_proofs_isActive_idx" ON "payment_proofs"("isActive");

-- CreateIndex
CREATE INDEX "payment_proofs_duplicateStatus_idx" ON "payment_proofs"("duplicateStatus");

-- CreateIndex
CREATE INDEX "payment_proofs_uploadedAt_idx" ON "payment_proofs"("uploadedAt");

-- CreateIndex
CREATE INDEX "payment_proofs_replacesProofId_idx" ON "payment_proofs"("replacesProofId");

-- AddForeignKey
ALTER TABLE "payment_proofs" ADD CONSTRAINT "payment_proofs_bookingRequestId_fkey" FOREIGN KEY ("bookingRequestId") REFERENCES "booking_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_proofs" ADD CONSTRAINT "payment_proofs_replacesProofId_fkey" FOREIGN KEY ("replacesProofId") REFERENCES "payment_proofs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
