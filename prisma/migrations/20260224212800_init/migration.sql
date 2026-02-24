-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'reviewer',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chartId" TEXT,
    "providerName" TEXT,
    "grammarLevel" INTEGER NOT NULL DEFAULT 2,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "pdfFilename" TEXT NOT NULL,
    "pdfText" TEXT NOT NULL,
    "rawResponse" TEXT,
    "overallAssessment" TEXT,
    "criticalCount" INTEGER NOT NULL DEFAULT 0,
    "flagCount" INTEGER NOT NULL DEFAULT 0,
    "suggestionCount" INTEGER NOT NULL DEFAULT 0,
    "reviewerId" TEXT NOT NULL,
    "batchJobId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Review_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Finding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reviewId" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "flagType" TEXT NOT NULL,
    "reviewCategory" TEXT NOT NULL,
    "recommendedAction" TEXT NOT NULL,
    "assignTo" TEXT NOT NULL,
    "flagComment" TEXT NOT NULL,
    "ruleCitation" TEXT NOT NULL,
    "recommendedCorrection" TEXT NOT NULL,
    "providerQuestion" TEXT,
    "questionStatus" TEXT,
    "questionResponse" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Finding_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BatchJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "totalFiles" INTEGER NOT NULL,
    "completedFiles" INTEGER NOT NULL DEFAULT 0,
    "failedFiles" INTEGER NOT NULL DEFAULT 0,
    "grammarLevel" INTEGER NOT NULL DEFAULT 2,
    "reviewerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
