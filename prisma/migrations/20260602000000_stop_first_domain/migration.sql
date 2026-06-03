-- Stop-first domain migration.
--
-- This migration removes persisted route/comment/collaboration structures and converts
-- Activity-backed itinerary items into required-place stops. Review production data before
-- applying: rows with null placeId or route-target notes need explicit product decisions.

ALTER TYPE "AuthProvider" ADD VALUE IF NOT EXISTS 'FACEBOOK';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Activity" WHERE "placeId" IS NULL) THEN
    RAISE EXCEPTION 'Stop-first migration requires every Activity row, including deleted tombstones, to have placeId.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "Note"
    WHERE "targetEntityType"::text = 'ROUTE_SEGMENT'
  ) THEN
    RAISE EXCEPTION 'Stop-first migration cannot automatically migrate route-segment notes.';
  END IF;
END $$;

CREATE TYPE "ActivityType" AS ENUM (
  'ACTIVITY',
  'LODGING',
  'FOOD',
  'SHOPPING',
  'TRANSPORTATION',
  'OTHER'
);

ALTER TABLE "Activity"
  ADD COLUMN "types" "ActivityType"[] NOT NULL DEFAULT ARRAY['ACTIVITY'::"ActivityType"],
  ADD COLUMN "summary" VARCHAR(500),
  ADD COLUMN "startsAt" TIMESTAMP(3);

UPDATE "Activity"
SET
  "types" = ARRAY[
    CASE "type"::text
      WHEN 'ACTIVITY' THEN 'ACTIVITY'::"ActivityType"
      WHEN 'LODGING' THEN 'LODGING'::"ActivityType"
      WHEN 'FOOD' THEN 'FOOD'::"ActivityType"
      WHEN 'TRANSPORT' THEN 'TRANSPORTATION'::"ActivityType"
      ELSE 'OTHER'::"ActivityType"
    END
  ],
  "summary" = LEFT(COALESCE("description", "title"), 500),
  "startsAt" = "startTime";

ALTER TABLE "Activity" DROP CONSTRAINT IF EXISTS "Activity_routeSegmentId_fkey";
ALTER TABLE "Activity" DROP CONSTRAINT IF EXISTS "Activity_placeId_fkey";
DROP INDEX IF EXISTS "Activity_routeSegmentId_idx";

ALTER TABLE "Activity"
  ALTER COLUMN "placeId" SET NOT NULL,
  DROP COLUMN IF EXISTS "routeSegmentId",
  DROP COLUMN IF EXISTS "type",
  DROP COLUMN IF EXISTS "title",
  DROP COLUMN IF EXISTS "description",
  DROP COLUMN IF EXISTS "startTime",
  DROP COLUMN IF EXISTS "endTime",
  DROP COLUMN IF EXISTS "isFlexibleTime",
  DROP COLUMN IF EXISTS "isAllDay",
  DROP COLUMN IF EXISTS "cost",
  DROP COLUMN IF EXISTS "currency",
  DROP COLUMN IF EXISTS "bookingInfo";

ALTER TABLE "Activity" ADD CONSTRAINT "Activity_placeId_fkey"
  FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP TYPE IF EXISTS "ItineraryItemType";

ALTER TABLE "Trip"
  DROP COLUMN IF EXISTS "description",
  DROP COLUMN IF EXISTS "budget";

ALTER TABLE "Expense" DROP CONSTRAINT IF EXISTS "Expense_budgetId_fkey";
DROP INDEX IF EXISTS "Expense_budgetId_idx";
ALTER TABLE "Expense"
  ADD COLUMN "attachments" JSONB,
  DROP COLUMN IF EXISTS "budgetId";

CREATE TYPE "NoteTargetEntityType_new" AS ENUM (
  'TRIP',
  'ITINERARY_ITEM',
  'EXPENSE',
  'PLACE'
);

ALTER TABLE "Note"
  ALTER COLUMN "targetEntityType" TYPE "NoteTargetEntityType_new"
  USING "targetEntityType"::text::"NoteTargetEntityType_new";

ALTER TYPE "NoteTargetEntityType" RENAME TO "NoteTargetEntityType_old";
ALTER TYPE "NoteTargetEntityType_new" RENAME TO "NoteTargetEntityType";
DROP TYPE "NoteTargetEntityType_old";

DROP TABLE IF EXISTS "Comment";
DROP TABLE IF EXISTS "CollaborationEntity";
DROP TABLE IF EXISTS "RouteSegment";
DROP TYPE IF EXISTS "CollaborationEntityType";
DROP TYPE IF EXISTS "RouteProvider";
