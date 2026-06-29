-- Persist lightweight route intent between adjacent stops.
-- Route geometry, duration, distance, polylines, and provider output remain derived data.
CREATE TABLE "TripRoutePreference" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tripId" UUID NOT NULL,
  "fromItemId" UUID NOT NULL,
  "toItemId" UUID NOT NULL,
  "travelMode" VARCHAR(40) NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "lastClientMutationId" VARCHAR(120),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TripRoutePreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TripRoutePreference_tripId_fromItemId_toItemId_key"
  ON "TripRoutePreference"("tripId", "fromItemId", "toItemId");
CREATE INDEX "TripRoutePreference_tripId_idx"
  ON "TripRoutePreference"("tripId");
CREATE INDEX "TripRoutePreference_fromItemId_idx"
  ON "TripRoutePreference"("fromItemId");
CREATE INDEX "TripRoutePreference_toItemId_idx"
  ON "TripRoutePreference"("toItemId");

ALTER TABLE "TripRoutePreference" ADD CONSTRAINT "TripRoutePreference_tripId_fkey"
  FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripRoutePreference" ADD CONSTRAINT "TripRoutePreference_fromItemId_fkey"
  FOREIGN KEY ("fromItemId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripRoutePreference" ADD CONSTRAINT "TripRoutePreference_toItemId_fkey"
  FOREIGN KEY ("toItemId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
