ALTER TYPE "AuthProvider" ADD VALUE IF NOT EXISTS 'APPLE';

ALTER TABLE "OAuthAccount"
  ADD COLUMN "providerEmail" CITEXT,
  ADD COLUMN "lastLoginAt" TIMESTAMP(3);

CREATE INDEX "OAuthAccount_providerEmail_idx" ON "OAuthAccount"("providerEmail");
