-- CreateTable
CREATE TABLE "pdf_conversions" (
    "id" TEXT NOT NULL,
    "shortId" VARCHAR(10) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "fileName" VARCHAR(255),
    "fileSize" INTEGER,
    "extractedText" TEXT,
    "textLength" INTEGER,
    "pageCount" INTEGER,
    "language" VARCHAR(10),
    "voice" VARCHAR(20),
    "audioFormat" VARCHAR(10),
    "audioSize" INTEGER,
    "audioDuration" DOUBLE PRECISION,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,

    CONSTRAINT "pdf_conversions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pdf_conversions_shortId_key" ON "pdf_conversions"("shortId");

-- CreateIndex
CREATE INDEX "pdf_conversions_shortId_idx" ON "pdf_conversions"("shortId");

-- CreateIndex
CREATE INDEX "pdf_conversions_status_idx" ON "pdf_conversions"("status");

-- CreateIndex
CREATE INDEX "pdf_conversions_expiresAt_idx" ON "pdf_conversions"("expiresAt");
