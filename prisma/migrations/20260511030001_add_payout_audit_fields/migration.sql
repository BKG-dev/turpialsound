-- AlterTable: add audit trail fields to MpPayout
ALTER TABLE "mp_payouts" ADD COLUMN "reference" TEXT;
ALTER TABLE "mp_payouts" ADD COLUMN "auditHash" TEXT;
