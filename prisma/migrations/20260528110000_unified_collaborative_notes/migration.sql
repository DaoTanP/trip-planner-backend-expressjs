CREATE TYPE "NoteTargetEntityType" AS ENUM ('TRIP', 'ITINERARY_ITEM', 'EXPENSE', 'PLACE', 'ROUTE_SEGMENT');
CREATE TYPE "CollaborationEntityType" AS ENUM ('TRIP', 'ITINERARY_ITEM', 'EXPENSE', 'PLACE', 'ROUTE_SEGMENT', 'NOTE');

ALTER TABLE "Note"
  ADD COLUMN "parentNoteId" UUID,
  ADD COLUMN "mentions" JSONB,
  ADD COLUMN "attachments" JSONB;

ALTER TABLE "Note" ALTER COLUMN "tripId" DROP NOT NULL;
ALTER TABLE "Note"
  ALTER COLUMN "targetEntityType" TYPE "NoteTargetEntityType"
  USING "targetEntityType"::"NoteTargetEntityType";

CREATE TABLE "CollaborationEntity" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "entityType" "CollaborationEntityType" NOT NULL,
  "entityId" UUID NOT NULL,
  "tripId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CollaborationEntity_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Note"
  ADD CONSTRAINT "Note_parentNoteId_fkey"
  FOREIGN KEY ("parentNoteId") REFERENCES "Note"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CollaborationEntity"
  ADD CONSTRAINT "CollaborationEntity_tripId_fkey"
  FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "CollaborationEntity_entityType_entityId_key"
  ON "CollaborationEntity"("entityType", "entityId");
CREATE INDEX "CollaborationEntity_tripId_entityType_idx"
  ON "CollaborationEntity"("tripId", "entityType");
CREATE INDEX "CollaborationEntity_entityType_entityId_idx"
  ON "CollaborationEntity"("entityType", "entityId");

CREATE INDEX "Note_targetEntityType_targetEntityId_deletedAt_createdAt_id_idx"
  ON "Note"("targetEntityType", "targetEntityId", "deletedAt", "createdAt", "id");
CREATE INDEX "Note_tripId_parentNoteId_createdAt_id_idx"
  ON "Note"("tripId", "parentNoteId", "createdAt", "id");
CREATE INDEX "Note_targetEntityType_targetEntityId_parentNoteId_createdAt_id_idx"
  ON "Note"("targetEntityType", "targetEntityId", "parentNoteId", "createdAt", "id");
CREATE INDEX "Note_parentNoteId_deletedAt_createdAt_id_idx"
  ON "Note"("parentNoteId", "deletedAt", "createdAt", "id");

INSERT INTO "CollaborationEntity" ("entityType", "entityId", "tripId")
SELECT 'TRIP'::"CollaborationEntityType", "id", "id"
FROM "Trip"
ON CONFLICT ("entityType", "entityId") DO NOTHING;

INSERT INTO "CollaborationEntity" ("entityType", "entityId", "tripId")
SELECT 'ITINERARY_ITEM'::"CollaborationEntityType", "id", "tripId"
FROM "Activity"
ON CONFLICT ("entityType", "entityId") DO NOTHING;

INSERT INTO "CollaborationEntity" ("entityType", "entityId", "tripId")
SELECT 'EXPENSE'::"CollaborationEntityType", "id", "tripId"
FROM "Expense"
ON CONFLICT ("entityType", "entityId") DO NOTHING;

INSERT INTO "CollaborationEntity" ("entityType", "entityId", "tripId")
SELECT 'PLACE'::"CollaborationEntityType", "id", NULL
FROM "Place"
ON CONFLICT ("entityType", "entityId") DO NOTHING;

INSERT INTO "CollaborationEntity" ("entityType", "entityId", "tripId")
SELECT 'ROUTE_SEGMENT'::"CollaborationEntityType", "id", "tripId"
FROM "RouteSegment"
ON CONFLICT ("entityType", "entityId") DO NOTHING;

INSERT INTO "CollaborationEntity" ("entityType", "entityId", "tripId")
SELECT 'NOTE'::"CollaborationEntityType", "id", "tripId"
FROM "Note"
ON CONFLICT ("entityType", "entityId") DO NOTHING;
