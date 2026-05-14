-- S15: Location Fields for Marketplace
-- Adds city, state, isLocationPublic to MpUser and MpListing

-- MpUser: add location fields
ALTER TABLE "MpUser" ADD COLUMN "city" TEXT;
ALTER TABLE "MpUser" ADD COLUMN "state" TEXT;

-- MpListing: add location fields
ALTER TABLE "mp_listings" ADD COLUMN "city" TEXT;
ALTER TABLE "mp_listings" ADD COLUMN "state" TEXT;
ALTER TABLE "mp_listings" ADD COLUMN "isLocationPublic" BOOLEAN NOT NULL DEFAULT true;

-- Index for location-based filtering
CREATE INDEX "mp_listings_state_city_idx" ON "mp_listings"("state", "city");
