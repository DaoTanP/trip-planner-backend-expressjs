-- Collaboration-ready mutation identity.
CREATE TABLE "ClientMutation" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tripId" UUID NOT NULL,
  "actorId" UUID,
  "clientMutationId" VARCHAR(120) NOT NULL,
  "entityType" VARCHAR(80) NOT NULL,
  "entityId" UUID,
  "operation" VARCHAR(80) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientMutation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClientMutation_tripId_clientMutationId_key"
  ON "ClientMutation"("tripId", "clientMutationId");
CREATE INDEX "ClientMutation_tripId_createdAt_idx" ON "ClientMutation"("tripId", "createdAt");
CREATE INDEX "ClientMutation_entityType_entityId_idx" ON "ClientMutation"("entityType", "entityId");
CREATE INDEX "ClientMutation_actorId_idx" ON "ClientMutation"("actorId");

ALTER TABLE "ClientMutation" ADD CONSTRAINT "ClientMutation_tripId_fkey"
  FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientMutation" ADD CONSTRAINT "ClientMutation_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Itinerary items keep the last client mutation id for optimistic/realtime reconciliation.
ALTER TABLE "Activity"
  ADD COLUMN "lastClientMutationId" VARCHAR(120);

DROP INDEX IF EXISTS "Activity_tripId_deletedAt_sortOrder_idx";
CREATE INDEX "Activity_tripId_deletedAt_sortOrder_id_idx"
  ON "Activity"("tripId", "deletedAt", "sortOrder", "id");

-- Collaborators are collaborative records: keep versions and tombstones.
ALTER TABLE "TripCollaborator"
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "lastClientMutationId" VARCHAR(120);

DROP INDEX IF EXISTS "TripCollaborator_tripId_idx";
CREATE INDEX "TripCollaborator_tripId_deletedAt_idx" ON "TripCollaborator"("tripId", "deletedAt");

-- Route cache entries need lifecycle/version fields and a profile hash for future traffic/avoidance variants.
ALTER TABLE "RouteSegment"
  ADD COLUMN "routeProfileHash" VARCHAR(128) NOT NULL DEFAULT 'default',
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "lastClientMutationId" VARCHAR(120),
  ADD COLUMN "expiresAt" TIMESTAMP(3),
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "deletedAt" TIMESTAMP(3);

ALTER TABLE "RouteSegment" ALTER COLUMN "updatedAt" DROP DEFAULT;

DROP INDEX IF EXISTS "RouteSegment_provider_fromPlaceId_toPlaceId_travelMode_key";
DROP INDEX IF EXISTS "RouteSegment_tripId_idx";

CREATE UNIQUE INDEX "RouteSegment_provider_fromPlaceId_toPlaceId_travelMode_routeProfileHash_key"
  ON "RouteSegment"("provider", "fromPlaceId", "toPlaceId", "travelMode", "routeProfileHash");
CREATE INDEX "RouteSegment_tripId_deletedAt_createdAt_idx"
  ON "RouteSegment"("tripId", "deletedAt", "createdAt");
CREATE INDEX "RouteSegment_expiresAt_idx" ON "RouteSegment"("expiresAt");

-- Generic notes replace TripNote and ItineraryNote.
CREATE TABLE "Note" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tripId" UUID NOT NULL,
  "authorId" UUID,
  "targetEntityType" VARCHAR(80) NOT NULL,
  "targetEntityId" UUID NOT NULL,
  "body" TEXT NOT NULL,
  "metadata" JSONB,
  "version" INTEGER NOT NULL DEFAULT 1,
  "lastClientMutationId" VARCHAR(120),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Note" (
  "id",
  "tripId",
  "authorId",
  "targetEntityType",
  "targetEntityId",
  "body",
  "metadata",
  "version",
  "createdAt",
  "updatedAt"
)
SELECT
  "id",
  "tripId",
  "authorId",
  'TRIP',
  "tripId",
  "body",
  COALESCE("metadata", '{}'::jsonb)
    || jsonb_build_object('legacyTitle', "title", 'legacyOrder', "order", 'legacyPinned', "pinned"),
  "version",
  "createdAt",
  "updatedAt"
FROM "TripNote";

INSERT INTO "Note" (
  "id",
  "tripId",
  "authorId",
  "targetEntityType",
  "targetEntityId",
  "body",
  "metadata",
  "version",
  "createdAt",
  "updatedAt"
)
SELECT
  "id",
  "tripId",
  "authorId",
  'ITINERARY_ITEM',
  "itineraryItemId",
  "body",
  "metadata",
  "version",
  "createdAt",
  "updatedAt"
FROM "ItineraryNote";

CREATE INDEX "Note_tripId_deletedAt_createdAt_id_idx"
  ON "Note"("tripId", "deletedAt", "createdAt", "id");
CREATE INDEX "Note_tripId_targetEntityType_targetEntityId_deletedAt_createdAt_idx"
  ON "Note"("tripId", "targetEntityType", "targetEntityId", "deletedAt", "createdAt");
CREATE INDEX "Note_authorId_idx" ON "Note"("authorId");

ALTER TABLE "Note" ADD CONSTRAINT "Note_tripId_fkey"
  FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Note" ADD CONSTRAINT "Note_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DROP TABLE IF EXISTS "ItineraryNote";
DROP TABLE IF EXISTS "TripNote";

-- Expenses and categories participate in collaboration/sync.
ALTER TABLE "ExpenseCategory"
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "lastClientMutationId" VARCHAR(120);

DROP INDEX IF EXISTS "ExpenseCategory_tripId_sortOrder_idx";
CREATE INDEX "ExpenseCategory_tripId_deletedAt_sortOrder_idx"
  ON "ExpenseCategory"("tripId", "deletedAt", "sortOrder");

ALTER TABLE "Expense"
  ADD COLUMN "lastClientMutationId" VARCHAR(120);

-- Comments are collaborative records with versions and tombstones.
ALTER TABLE "Comment"
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "lastClientMutationId" VARCHAR(120),
  ADD COLUMN "deletedAt" TIMESTAMP(3);

DROP INDEX IF EXISTS "Comment_tripId_createdAt_idx";
DROP INDEX IF EXISTS "Comment_tripId_targetEntityType_targetEntityId_createdAt_idx";

CREATE INDEX "Comment_tripId_deletedAt_createdAt_idx"
  ON "Comment"("tripId", "deletedAt", "createdAt");
CREATE INDEX "Comment_tripId_targetEntityType_targetEntityId_deletedAt_createdAt_idx"
  ON "Comment"("tripId", "targetEntityType", "targetEntityId", "deletedAt", "createdAt");
