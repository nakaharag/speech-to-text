-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "googleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shares" (
    "id" TEXT NOT NULL,
    "shortId" VARCHAR(10) NOT NULL,
    "transcript" TEXT NOT NULL,
    "corrected" TEXT,
    "summary" TEXT,
    "language" VARCHAR(10),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limits" (
    "id" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "date" VARCHAR(10) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_analytics" (
    "id" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,
    "eventType" VARCHAR(50) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "referer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transcriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "transcript" TEXT NOT NULL,
    "corrected" TEXT,
    "summary" TEXT,
    "language" VARCHAR(10),
    "audioDuration" DOUBLE PRECISION,
    "fileName" VARCHAR(255),
    "fileSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transcriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "languages" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "nativeName" VARCHAR(100) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "languages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "shares_shortId_key" ON "shares"("shortId");

-- CreateIndex
CREATE INDEX "shares_shortId_idx" ON "shares"("shortId");

-- CreateIndex
CREATE INDEX "shares_expiresAt_idx" ON "shares"("expiresAt");

-- CreateIndex
CREATE INDEX "rate_limits_ipAddress_idx" ON "rate_limits"("ipAddress");

-- CreateIndex
CREATE INDEX "rate_limits_date_idx" ON "rate_limits"("date");

-- CreateIndex
CREATE UNIQUE INDEX "rate_limits_ipAddress_date_key" ON "rate_limits"("ipAddress", "date");

-- CreateIndex
CREATE INDEX "share_analytics_shareId_idx" ON "share_analytics"("shareId");

-- CreateIndex
CREATE INDEX "share_analytics_eventType_idx" ON "share_analytics"("eventType");

-- CreateIndex
CREATE INDEX "share_analytics_createdAt_idx" ON "share_analytics"("createdAt");

-- CreateIndex
CREATE INDEX "transcriptions_userId_idx" ON "transcriptions"("userId");

-- CreateIndex
CREATE INDEX "transcriptions_createdAt_idx" ON "transcriptions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "languages_code_key" ON "languages"("code");

-- AddForeignKey
ALTER TABLE "shares" ADD CONSTRAINT "shares_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_analytics" ADD CONSTRAINT "share_analytics_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "shares"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcriptions" ADD CONSTRAINT "transcriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
