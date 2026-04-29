CREATE TABLE IF NOT EXISTS "mp_analytics_events" (
  "id" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "listingId" TEXT,
  "transactionId" TEXT,
  "userId" TEXT,
  "sessionId" TEXT,
  "path" TEXT NOT NULL,
  "referrer" TEXT,
  "device" TEXT,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "mp_analytics_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "mp_analytics_events_eventType_idx" ON "mp_analytics_events"("eventType");
CREATE INDEX IF NOT EXISTS "mp_analytics_events_listingId_idx" ON "mp_analytics_events"("listingId");
CREATE INDEX IF NOT EXISTS "mp_analytics_events_transactionId_idx" ON "mp_analytics_events"("transactionId");
CREATE INDEX IF NOT EXISTS "mp_analytics_events_userId_idx" ON "mp_analytics_events"("userId");
CREATE INDEX IF NOT EXISTS "mp_analytics_events_sessionId_idx" ON "mp_analytics_events"("sessionId");
CREATE INDEX IF NOT EXISTS "mp_analytics_events_createdAt_idx" ON "mp_analytics_events"("createdAt");

CREATE TABLE IF NOT EXISTS "mp_blob_object_metadata" (
  "id" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "pathname" TEXT,
  "sizeBytes" BIGINT,
  "contentType" TEXT,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "mp_blob_object_metadata_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "mp_blob_object_metadata_url_key" ON "mp_blob_object_metadata"("url");
CREATE INDEX IF NOT EXISTS "mp_blob_object_metadata_entityType_idx" ON "mp_blob_object_metadata"("entityType");
CREATE INDEX IF NOT EXISTS "mp_blob_object_metadata_entityId_idx" ON "mp_blob_object_metadata"("entityId");
CREATE INDEX IF NOT EXISTS "mp_blob_object_metadata_pathname_idx" ON "mp_blob_object_metadata"("pathname");
CREATE INDEX IF NOT EXISTS "mp_blob_object_metadata_uploadedAt_idx" ON "mp_blob_object_metadata"("uploadedAt");
