-- Trip revisions provide a monotonic clock for future delta sync, websocket patches,
-- offline replay, and conflict detection.
ALTER TABLE "Trip"
  ADD COLUMN "revision" BIGINT NOT NULL DEFAULT 0;

-- Existing mutation ids become revision-aware and device-ready without changing
-- the lightweight idempotency boundary from Phase 1.
ALTER TABLE "ClientMutation"
  ADD COLUMN "deviceId" VARCHAR(128),
  ADD COLUMN "revision" BIGINT;

CREATE INDEX "ClientMutation_tripId_revision_idx"
  ON "ClientMutation"("tripId", "revision");

-- Durable append-only mutation history. This is not event sourcing; it is a
-- compact replay/debug/fanout log scoped by trip revision.
CREATE TABLE "MutationEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tripId" UUID NOT NULL,
  "actorId" UUID,
  "deviceId" VARCHAR(128),
  "clientMutationId" VARCHAR(120),
  "entityType" VARCHAR(80) NOT NULL,
  "entityId" UUID,
  "operation" VARCHAR(80) NOT NULL,
  "payload" JSONB,
  "revision" BIGINT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MutationEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MutationEvent_tripId_revision_key"
  ON "MutationEvent"("tripId", "revision");
CREATE INDEX "MutationEvent_tripId_createdAt_idx"
  ON "MutationEvent"("tripId", "createdAt");
CREATE INDEX "MutationEvent_tripId_clientMutationId_idx"
  ON "MutationEvent"("tripId", "clientMutationId");
CREATE INDEX "MutationEvent_entityType_entityId_idx"
  ON "MutationEvent"("entityType", "entityId");
CREATE INDEX "MutationEvent_actorId_idx"
  ON "MutationEvent"("actorId");

ALTER TABLE "MutationEvent" ADD CONSTRAINT "MutationEvent_tripId_fkey"
  FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MutationEvent" ADD CONSTRAINT "MutationEvent_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Route cache identity now has typed profile dimensions for departure/traffic
-- variants and alternate routes while staying provider-agnostic.
ALTER TABLE "RouteSegment"
  ADD COLUMN "departureTime" TIMESTAMP(3),
  ADD COLUMN "trafficModel" VARCHAR(80),
  ADD COLUMN "alternativeIndex" INTEGER NOT NULL DEFAULT 0;

DROP INDEX IF EXISTS "RouteSegment_provider_fromPlaceId_toPlaceId_travelMode_routeProfileHash_key";

CREATE UNIQUE INDEX "RouteSegment_route_identity_key"
  ON "RouteSegment"("provider", "fromPlaceId", "toPlaceId", "travelMode", "routeProfileHash", "alternativeIndex");
CREATE INDEX "RouteSegment_tripId_deletedAt_expiresAt_idx"
  ON "RouteSegment"("tripId", "deletedAt", "expiresAt");
CREATE INDEX "RouteSegment_provider_travelMode_routeProfileHash_idx"
  ON "RouteSegment"("provider", "travelMode", "routeProfileHash");
