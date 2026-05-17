CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "UserStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'DISABLED');
CREATE TYPE "AuthProvider" AS ENUM ('EMAIL', 'GOOGLE', 'GITHUB');
CREATE TYPE "TripVisibility" AS ENUM ('PRIVATE', 'SHARED', 'PUBLIC');
CREATE TYPE "TripRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');
CREATE TYPE "TripStatus" AS ENUM ('DRAFT', 'PLANNED', 'ACTIVE', 'COMPLETED', 'ARCHIVED');
CREATE TYPE "ActivityStatus" AS ENUM ('PLANNED', 'BOOKED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "CommentTargetType" AS ENUM ('TRIP', 'DAY', 'ACTIVITY');
CREATE TYPE "NotificationType" AS ENUM ('TRIP_INVITE', 'COMMENT_MENTION', 'ITINERARY_UPDATE', 'SYSTEM');
CREATE TYPE "NotificationStatus" AS ENUM ('UNREAD', 'READ', 'ARCHIVED');
CREATE TYPE "PlaceSource" AS ENUM ('MANUAL', 'GOOGLE', 'MAPBOX', 'OSM', 'INTERNAL');

CREATE TABLE "User" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" CITEXT NOT NULL,
  "passwordHash" TEXT,
  "name" VARCHAR(120) NOT NULL,
  "avatarUrl" TEXT,
  "role" "UserRole" NOT NULL DEFAULT 'USER',
  "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  "emailVerifiedAt" TIMESTAMP(3),
  "preferences" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OAuthAccount" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "provider" "AuthProvider" NOT NULL,
  "providerUserId" VARCHAR(255) NOT NULL,
  "profile" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OAuthAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RefreshToken" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "tokenHash" VARCHAR(128) NOT NULL,
  "familyId" UUID NOT NULL,
  "deviceId" VARCHAR(128),
  "userAgent" TEXT,
  "ipAddress" VARCHAR(64),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Trip" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ownerId" UUID NOT NULL,
  "title" VARCHAR(180) NOT NULL,
  "description" TEXT,
  "startDate" DATE,
  "endDate" DATE,
  "timezone" VARCHAR(80) NOT NULL DEFAULT 'UTC',
  "coverImageUrl" TEXT,
  "visibility" "TripVisibility" NOT NULL DEFAULT 'PRIVATE',
  "status" "TripStatus" NOT NULL DEFAULT 'DRAFT',
  "preferences" JSONB,
  "budget" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TripCollaborator" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tripId" UUID NOT NULL,
  "userId" UUID,
  "invitedEmail" CITEXT,
  "role" "TripRole" NOT NULL DEFAULT 'VIEWER',
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TripCollaborator_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Destination" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tripId" UUID NOT NULL,
  "placeId" UUID,
  "name" VARCHAR(180) NOT NULL,
  "countryCode" VARCHAR(2),
  "city" VARCHAR(120),
  "latitude" DECIMAL(9,6),
  "longitude" DECIMAL(9,6),
  "arrivalDate" DATE,
  "departureDate" DATE,
  "order" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Destination_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ItineraryDay" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tripId" UUID NOT NULL,
  "date" DATE NOT NULL,
  "title" VARCHAR(160),
  "notes" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  "weatherSnapshot" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ItineraryDay_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Activity" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "dayId" UUID NOT NULL,
  "placeId" UUID,
  "title" VARCHAR(180) NOT NULL,
  "description" TEXT,
  "startTime" TIMESTAMP(3),
  "endTime" TIMESTAMP(3),
  "timezone" VARCHAR(80) NOT NULL DEFAULT 'UTC',
  "status" "ActivityStatus" NOT NULL DEFAULT 'PLANNED',
  "cost" DECIMAL(12,2),
  "currency" VARCHAR(3),
  "bookingInfo" JSONB,
  "metadata" JSONB,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Place" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "source" "PlaceSource" NOT NULL DEFAULT 'MANUAL',
  "externalId" VARCHAR(255),
  "name" VARCHAR(180) NOT NULL,
  "formattedAddress" TEXT,
  "countryCode" VARCHAR(2),
  "latitude" DECIMAL(9,6),
  "longitude" DECIMAL(9,6),
  "categories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "sourcePayload" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Comment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "authorId" UUID NOT NULL,
  "tripId" UUID NOT NULL,
  "dayId" UUID,
  "activityId" UUID,
  "targetType" "CommentTargetType" NOT NULL,
  "body" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "tripId" UUID,
  "type" "NotificationType" NOT NULL,
  "status" "NotificationStatus" NOT NULL DEFAULT 'UNREAD',
  "title" VARCHAR(180) NOT NULL,
  "body" TEXT,
  "data" JSONB,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_status_idx" ON "User"("status");
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

CREATE UNIQUE INDEX "OAuthAccount_provider_providerUserId_key" ON "OAuthAccount"("provider", "providerUserId");
CREATE INDEX "OAuthAccount_userId_idx" ON "OAuthAccount"("userId");

CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");
CREATE INDEX "RefreshToken_familyId_idx" ON "RefreshToken"("familyId");
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

CREATE INDEX "Trip_ownerId_idx" ON "Trip"("ownerId");
CREATE INDEX "Trip_status_idx" ON "Trip"("status");
CREATE INDEX "Trip_startDate_idx" ON "Trip"("startDate");

CREATE UNIQUE INDEX "TripCollaborator_tripId_userId_key" ON "TripCollaborator"("tripId", "userId");
CREATE INDEX "TripCollaborator_tripId_idx" ON "TripCollaborator"("tripId");
CREATE INDEX "TripCollaborator_userId_idx" ON "TripCollaborator"("userId");
CREATE INDEX "TripCollaborator_invitedEmail_idx" ON "TripCollaborator"("invitedEmail");

CREATE INDEX "Destination_tripId_order_idx" ON "Destination"("tripId", "order");
CREATE INDEX "Destination_placeId_idx" ON "Destination"("placeId");

CREATE UNIQUE INDEX "ItineraryDay_tripId_date_key" ON "ItineraryDay"("tripId", "date");
CREATE INDEX "ItineraryDay_tripId_order_idx" ON "ItineraryDay"("tripId", "order");

CREATE INDEX "Activity_dayId_order_idx" ON "Activity"("dayId", "order");
CREATE INDEX "Activity_placeId_idx" ON "Activity"("placeId");
CREATE INDEX "Activity_status_idx" ON "Activity"("status");

CREATE UNIQUE INDEX "Place_source_externalId_key" ON "Place"("source", "externalId");
CREATE INDEX "Place_name_idx" ON "Place"("name");
CREATE INDEX "Place_countryCode_idx" ON "Place"("countryCode");

CREATE INDEX "Comment_tripId_createdAt_idx" ON "Comment"("tripId", "createdAt");
CREATE INDEX "Comment_dayId_idx" ON "Comment"("dayId");
CREATE INDEX "Comment_activityId_idx" ON "Comment"("activityId");
CREATE INDEX "Comment_authorId_idx" ON "Comment"("authorId");

CREATE INDEX "Notification_userId_status_createdAt_idx" ON "Notification"("userId", "status", "createdAt");
CREATE INDEX "Notification_tripId_idx" ON "Notification"("tripId");

ALTER TABLE "OAuthAccount" ADD CONSTRAINT "OAuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripCollaborator" ADD CONSTRAINT "TripCollaborator_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripCollaborator" ADD CONSTRAINT "TripCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Destination" ADD CONSTRAINT "Destination_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Destination" ADD CONSTRAINT "Destination_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ItineraryDay" ADD CONSTRAINT "ItineraryDay_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "ItineraryDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "ItineraryDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
