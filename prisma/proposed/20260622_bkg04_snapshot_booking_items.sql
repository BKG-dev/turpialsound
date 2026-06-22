-- BKG-04A proposed additive migration.
-- This file is a proposal only and must not be placed under prisma/migrations.

CREATE TYPE "booking_mode" AS ENUM ('single', 'custom_bundle');
CREATE TYPE "booking_item_kind" AS ENUM ('service', 'addon', 'included');

ALTER TABLE "booking_requests"
  ADD COLUMN "bookingMode" "booking_mode" NOT NULL DEFAULT 'single',
  ADD COLUMN "pricingSource" TEXT;

ALTER TABLE "booking_request_items"
  ALTER COLUMN "serviceVariantId" DROP NOT NULL,
  ADD COLUMN "itemSlug" TEXT,
  ADD COLUMN "itemName" TEXT,
  ADD COLUMN "itemKind" "booking_item_kind",
  ADD COLUMN "sessionDurationMinutes" INTEGER,
  ADD COLUMN "durationMinutes" INTEGER,
  ADD COLUMN "unitPriceUsdSnapshot" DECIMAL(10,2),
  ADD COLUMN "lineTotalUsdSnapshot" DECIMAL(10,2),
  ADD COLUMN "clientPriceDisplay" TEXT;

CREATE INDEX "booking_request_items_item_slug_idx"
  ON "booking_request_items" ("itemSlug");

CREATE UNIQUE INDEX "booking_request_items_booking_request_id_item_slug_key"
  ON "booking_request_items" ("bookingRequestId", "itemSlug");
