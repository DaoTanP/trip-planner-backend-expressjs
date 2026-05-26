CREATE TYPE "ItineraryItemType" AS ENUM (
  'ACTIVITY',
  'PLACE',
  'LODGING',
  'TRANSPORT',
  'FOOD',
  'NOTE',
  'TASK',
  'CUSTOM'
);

CREATE TYPE "RouteProvider" AS ENUM (
  'GOOGLE',
  'MAPBOX',
  'OSM',
  'INTERNAL'
);

ALTER TABLE "Place" ADD COLUMN "address" TEXT;

CREATE INDEX "Place_latitude_longitude_idx" ON "Place"("latitude", "longitude");

CREATE TABLE "RouteSegment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tripId" UUID,
  "fromPlaceId" UUID NOT NULL,
  "toPlaceId" UUID NOT NULL,
  "provider" "RouteProvider" NOT NULL,
  "polyline" TEXT NOT NULL,
  "distanceMeters" INTEGER,
  "durationSeconds" INTEGER,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RouteSegment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RouteSegment_provider_fromPlaceId_toPlaceId_key" ON "RouteSegment"("provider", "fromPlaceId", "toPlaceId");
CREATE INDEX "RouteSegment_tripId_idx" ON "RouteSegment"("tripId");
CREATE INDEX "RouteSegment_fromPlaceId_toPlaceId_idx" ON "RouteSegment"("fromPlaceId", "toPlaceId");

ALTER TABLE "RouteSegment" ADD CONSTRAINT "RouteSegment_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RouteSegment" ADD CONSTRAINT "RouteSegment_fromPlaceId_fkey" FOREIGN KEY ("fromPlaceId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RouteSegment" ADD CONSTRAINT "RouteSegment_toPlaceId_fkey" FOREIGN KEY ("toPlaceId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Activity"
  ADD COLUMN "tripId" UUID,
  ADD COLUMN "routeSegmentId" UUID,
  ADD COLUMN "type" "ItineraryItemType" NOT NULL DEFAULT 'ACTIVITY',
  ADD COLUMN "isFlexibleTime" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "isAllDay" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "sortOrder" INTEGER,
  ADD COLUMN "deletedAt" TIMESTAMP(3);

ALTER TABLE "Activity" DROP CONSTRAINT IF EXISTS "Activity_dayId_fkey";

UPDATE "Activity" AS activity
SET
  "tripId" = day."tripId",
  "sortOrder" = COALESCE(activity."order", 0)
FROM "ItineraryDay" AS day
WHERE activity."dayId" = day."id";

UPDATE "Activity"
SET "sortOrder" = COALESCE("sortOrder", 1024)
WHERE "sortOrder" IS NULL;

ALTER TABLE "Activity"
  ALTER COLUMN "tripId" SET NOT NULL,
  ALTER COLUMN "sortOrder" SET NOT NULL,
  ALTER COLUMN "dayId" DROP NOT NULL;

CREATE INDEX "Activity_tripId_deletedAt_sortOrder_idx" ON "Activity"("tripId", "deletedAt", "sortOrder");
CREATE INDEX "Activity_tripId_status_idx" ON "Activity"("tripId", "status");
CREATE INDEX "Activity_legacyDayId_idx" ON "Activity"("dayId");
CREATE INDEX "Activity_routeSegmentId_idx" ON "Activity"("routeSegmentId");

ALTER TABLE "Activity" ADD CONSTRAINT "Activity_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_routeSegmentId_fkey" FOREIGN KEY ("routeSegmentId") REFERENCES "RouteSegment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "ItineraryDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ItineraryNote" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tripId" UUID NOT NULL,
  "itineraryItemId" UUID NOT NULL,
  "authorId" UUID,
  "body" TEXT NOT NULL,
  "metadata" JSONB,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ItineraryNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ItineraryNote_tripId_createdAt_idx" ON "ItineraryNote"("tripId", "createdAt");
CREATE INDEX "ItineraryNote_itineraryItemId_createdAt_idx" ON "ItineraryNote"("itineraryItemId", "createdAt");
CREATE INDEX "ItineraryNote_authorId_idx" ON "ItineraryNote"("authorId");

ALTER TABLE "ItineraryNote" ADD CONSTRAINT "ItineraryNote_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ItineraryNote" ADD CONSTRAINT "ItineraryNote_itineraryItemId_fkey" FOREIGN KEY ("itineraryItemId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ItineraryNote" ADD CONSTRAINT "ItineraryNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "Budget" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tripId" UUID NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
  "totalLimit" DECIMAL(12,2),
  "metadata" JSONB,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Budget_tripId_key" ON "Budget"("tripId");
CREATE INDEX "Budget_tripId_idx" ON "Budget"("tripId");

ALTER TABLE "Budget" ADD CONSTRAINT "Budget_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ExpenseCategory" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tripId" UUID NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "color" VARCHAR(32),
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExpenseCategory_tripId_name_key" ON "ExpenseCategory"("tripId", "name");
CREATE INDEX "ExpenseCategory_tripId_sortOrder_idx" ON "ExpenseCategory"("tripId", "sortOrder");

ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Expense" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tripId" UUID NOT NULL,
  "budgetId" UUID,
  "categoryId" UUID,
  "itineraryItemId" UUID,
  "title" VARCHAR(180) NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "paidByUserId" UUID,
  "spentAt" TIMESTAMP(3),
  "notes" TEXT,
  "metadata" JSONB,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Expense_tripId_deletedAt_spentAt_idx" ON "Expense"("tripId", "deletedAt", "spentAt");
CREATE INDEX "Expense_budgetId_idx" ON "Expense"("budgetId");
CREATE INDEX "Expense_categoryId_idx" ON "Expense"("categoryId");
CREATE INDEX "Expense_itineraryItemId_idx" ON "Expense"("itineraryItemId");
CREATE INDEX "Expense_paidByUserId_idx" ON "Expense"("paidByUserId");

ALTER TABLE "Expense" ADD CONSTRAINT "Expense_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_itineraryItemId_fkey" FOREIGN KEY ("itineraryItemId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_paidByUserId_fkey" FOREIGN KEY ("paidByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
