-- Move existing item order values onto the spaced timeline scale before removing legacy ordering.
WITH ranked_items AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "tripId"
      ORDER BY "sortOrder" ASC, "createdAt" ASC, "id" ASC
    ) AS "position"
  FROM "Activity"
)
UPDATE "Activity"
SET "sortOrder" = ranked_items."position" * 1024
FROM ranked_items
WHERE "Activity"."id" = ranked_items."id";

-- Itinerary items are trip-scoped timeline records. Remove legacy day ownership and duplicated route cache fields.
ALTER TABLE "Activity" DROP CONSTRAINT IF EXISTS "Activity_dayId_fkey";
DROP INDEX IF EXISTS "Activity_dayId_order_idx";
DROP INDEX IF EXISTS "Activity_legacyDayId_idx";

ALTER TABLE "Activity"
  DROP COLUMN IF EXISTS "dayId",
  DROP COLUMN IF EXISTS "order",
  DROP COLUMN IF EXISTS "travelMode",
  DROP COLUMN IF EXISTS "travelTimeMinutes",
  DROP COLUMN IF EXISTS "routePolyline";

-- Route cache rows are reusable per provider, place pair, and travel mode.
ALTER TABLE "RouteSegment"
  ADD COLUMN "travelMode" VARCHAR(40) NOT NULL DEFAULT 'driving';

DROP INDEX IF EXISTS "RouteSegment_provider_fromPlaceId_toPlaceId_key";
CREATE UNIQUE INDEX "RouteSegment_provider_fromPlaceId_toPlaceId_travelMode_key"
  ON "RouteSegment"("provider", "fromPlaceId", "toPlaceId", "travelMode");
CREATE INDEX "RouteSegment_tripId_provider_travelMode_idx"
  ON "RouteSegment"("tripId", "provider", "travelMode");

-- Comments target any trip-scoped entity through a generic entity reference.
ALTER TABLE "Comment"
  ADD COLUMN "targetEntityType" VARCHAR(80),
  ADD COLUMN "targetEntityId" UUID;

UPDATE "Comment"
SET
  "metadata" = COALESCE("metadata", '{}'::jsonb) || jsonb_build_object('legacyDayId', "dayId")
WHERE "targetType"::text = 'DAY' AND "dayId" IS NOT NULL;

UPDATE "Comment"
SET
  "targetEntityType" = CASE
    WHEN "targetType"::text = 'ACTIVITY' THEN 'ITINERARY_ITEM'
    ELSE 'TRIP'
  END,
  "targetEntityId" = CASE
    WHEN "targetType"::text = 'ACTIVITY' AND "activityId" IS NOT NULL THEN "activityId"
    ELSE "tripId"
  END;

ALTER TABLE "Comment"
  ALTER COLUMN "targetEntityType" SET NOT NULL,
  ALTER COLUMN "targetEntityId" SET NOT NULL;

ALTER TABLE "Comment" DROP CONSTRAINT IF EXISTS "Comment_dayId_fkey";
ALTER TABLE "Comment" DROP CONSTRAINT IF EXISTS "Comment_activityId_fkey";
DROP INDEX IF EXISTS "Comment_dayId_idx";
DROP INDEX IF EXISTS "Comment_activityId_idx";

ALTER TABLE "Comment"
  DROP COLUMN IF EXISTS "dayId",
  DROP COLUMN IF EXISTS "activityId",
  DROP COLUMN IF EXISTS "targetType";

CREATE INDEX "Comment_tripId_targetEntityType_targetEntityId_createdAt_idx"
  ON "Comment"("tripId", "targetEntityType", "targetEntityId", "createdAt");

DROP TYPE IF EXISTS "CommentTargetType";

-- Notifications store localization codes and params, not rendered copy.
ALTER TABLE "Notification"
  ADD COLUMN "notificationCode" VARCHAR(120),
  ADD COLUMN "params" JSONB;

UPDATE "Notification"
SET
  "notificationCode" = "type"::text,
  "params" = CASE
    WHEN jsonb_typeof("data" -> 'params') = 'object' THEN "data" -> 'params'
    ELSE COALESCE("data", '{}'::jsonb)
  END;

ALTER TABLE "Notification"
  ALTER COLUMN "notificationCode" SET NOT NULL;

ALTER TABLE "Notification"
  DROP COLUMN IF EXISTS "type",
  DROP COLUMN IF EXISTS "title",
  DROP COLUMN IF EXISTS "body",
  DROP COLUMN IF EXISTS "data";

DROP TYPE IF EXISTS "NotificationType";

-- Destination duplicated normalized places and itinerary locations. Remove it from the active model.
DROP TABLE IF EXISTS "Destination";
DROP TABLE IF EXISTS "ItineraryDay";
