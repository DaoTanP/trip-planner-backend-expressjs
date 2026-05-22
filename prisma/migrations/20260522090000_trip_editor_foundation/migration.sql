ALTER TABLE "Trip" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "ItineraryDay" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Activity"
  ADD COLUMN "durationMinutes" INTEGER,
  ADD COLUMN "travelMode" VARCHAR(40),
  ADD COLUMN "travelTimeMinutes" INTEGER,
  ADD COLUMN "routePolyline" TEXT,
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Place"
  ADD COLUMN "websiteUrl" TEXT,
  ADD COLUMN "phoneNumber" VARCHAR(40),
  ADD COLUMN "timezone" VARCHAR(80);

CREATE TABLE "TripNote" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tripId" UUID NOT NULL,
  "authorId" UUID,
  "title" VARCHAR(160),
  "body" TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  "pinned" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TripNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TripNote_tripId_order_idx" ON "TripNote"("tripId", "order");
CREATE INDEX "TripNote_authorId_idx" ON "TripNote"("authorId");

ALTER TABLE "TripNote" ADD CONSTRAINT "TripNote_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripNote" ADD CONSTRAINT "TripNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
