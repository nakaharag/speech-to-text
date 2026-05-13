-- Sync schemas: Add NextAuth models and missing fields from frontend

-- ====================
-- USER TABLE UPDATES
-- ====================

-- Add subscription fields to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tier" TEXT NOT NULL DEFAULT 'free';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "subscriptionEndsAt" TIMESTAMP(3);

-- Add auth-related fields to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerified" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "image" TEXT;

-- Add social provider IDs
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "appleId" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "twitterId" TEXT;

-- Add Apple private relay flag
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isPrivateRelayEmail" BOOLEAN NOT NULL DEFAULT false;

-- Add unique constraints for new fields
CREATE UNIQUE INDEX IF NOT EXISTS "users_appleId_key" ON "users"("appleId");
CREATE UNIQUE INDEX IF NOT EXISTS "users_twitterId_key" ON "users"("twitterId");
CREATE UNIQUE INDEX IF NOT EXISTS "users_stripeCustomerId_key" ON "users"("stripeCustomerId");

-- ====================
-- NEXTAUTH TABLES
-- ====================

-- Create NextAuth Account table
CREATE TABLE IF NOT EXISTS "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on accounts (use IF NOT EXISTS pattern)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'accounts_provider_providerAccountId_key') THEN
    ALTER TABLE "accounts" ADD CONSTRAINT "accounts_provider_providerAccountId_key" UNIQUE ("provider", "providerAccountId");
  END IF;
END $$;

-- Add foreign key constraint to accounts
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'accounts_userId_fkey') THEN
    ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Create NextAuth Session table
CREATE TABLE IF NOT EXISTS "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on sessions
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- Add foreign key constraint to sessions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_userId_fkey') THEN
    ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Create NextAuth VerificationToken table
CREATE TABLE IF NOT EXISTS "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- Create unique constraints on verification_tokens
CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_token_key" ON "verification_tokens"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- ====================
-- USAGE COUNTER TABLE
-- ====================

-- Create UsageCounter table
CREATE TABLE IF NOT EXISTS "usage_counters" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "transcriptionsToday" INTEGER NOT NULL DEFAULT 0,
    "transcriptionsDate" VARCHAR(10) NOT NULL,
    "ocrThisMonth" INTEGER NOT NULL DEFAULT 0,
    "ocrMonth" VARCHAR(7) NOT NULL,

    CONSTRAINT "usage_counters_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on usage_counters
CREATE UNIQUE INDEX IF NOT EXISTS "usage_counters_userId_key" ON "usage_counters"("userId");

-- Add foreign key constraint to usage_counters
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usage_counters_userId_fkey') THEN
    ALTER TABLE "usage_counters" ADD CONSTRAINT "usage_counters_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ====================
-- SHARES TABLE UPDATES
-- ====================

-- Add missing fields to shares table
ALTER TABLE "shares" ADD COLUMN IF NOT EXISTS "transcriptionId" TEXT;
ALTER TABLE "shares" ADD COLUMN IF NOT EXISTS "pdfConversionId" TEXT;
ALTER TABLE "shares" ADD COLUMN IF NOT EXISTS "ownerTier" VARCHAR(20);
ALTER TABLE "shares" ADD COLUMN IF NOT EXISTS "audioKey" VARCHAR(512);
ALTER TABLE "shares" ADD COLUMN IF NOT EXISTS "passwordHash" VARCHAR(255);

-- Extend shortId column to 20 chars (if it was 10)
ALTER TABLE "shares" ALTER COLUMN "shortId" TYPE VARCHAR(20);

-- Add index on userId for shares (if not exists)
CREATE INDEX IF NOT EXISTS "shares_userId_idx" ON "shares"("userId");

-- ====================
-- TRANSCRIPTIONS TABLE UPDATES
-- ====================

-- Add missing fields to transcriptions table
ALTER TABLE "transcriptions" ADD COLUMN IF NOT EXISTS "audioKey" VARCHAR(512);
ALTER TABLE "transcriptions" ADD COLUMN IF NOT EXISTS "audioSize" INTEGER;

-- ====================
-- PDF_CONVERSIONS TABLE UPDATES
-- ====================

-- Add user relation fields to pdf_conversions
ALTER TABLE "pdf_conversions" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "pdf_conversions" ADD COLUMN IF NOT EXISTS "audioKey" VARCHAR(512);
ALTER TABLE "pdf_conversions" ADD COLUMN IF NOT EXISTS "mp3Key" TEXT;

-- Add index on userId for pdf_conversions
CREATE INDEX IF NOT EXISTS "pdf_conversions_userId_idx" ON "pdf_conversions"("userId");

-- Add foreign key constraint to pdf_conversions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pdf_conversions_userId_fkey') THEN
    ALTER TABLE "pdf_conversions" ADD CONSTRAINT "pdf_conversions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
