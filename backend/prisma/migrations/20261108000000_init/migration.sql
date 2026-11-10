-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('LIGHT', 'DARK');

-- CreateEnum
CREATE TYPE "Color" AS ENUM ('BARRO', 'OCRE', 'MUSGO', 'EUCALIPTO', 'AZUL', 'VIOLETA', 'AMEIXA');

-- CreateEnum
CREATE TYPE "Frequency" AS ENUM ('DAILY', 'WEEKDAYS', 'SPECIFIC_DAYS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "IntervalUnit" AS ENUM ('DAY', 'WEEK');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('PENDING', 'DONE', 'PARTIAL', 'NOT_DONE', 'POSTPONED');

-- CreateEnum
CREATE TYPE "ExceptionKind" AS ENUM ('NONE', 'CHANGED', 'SKIPPED', 'DETACHED');

-- CreateEnum
CREATE TYPE "ChangeReason" AS ENUM ('REORGANIZE', 'MANUAL_EDIT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "planningStart" INTEGER NOT NULL DEFAULT 360,
    "planningEnd" INTEGER NOT NULL DEFAULT 1380,
    "theme" "Theme",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT clock_timestamp(),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" "Color" NOT NULL,
    "weeklyGoalMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT clock_timestamp(),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Routine" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT,
    "description" TEXT,
    "priority" "Priority",
    "isFixed" BOOLEAN NOT NULL DEFAULT false,
    "startMinutes" INTEGER NOT NULL,
    "endMinutes" INTEGER NOT NULL,
    "steps" TEXT[],
    "frequency" "Frequency" NOT NULL,
    "weekdays" INTEGER[],
    "intervalValue" INTEGER,
    "intervalUnit" "IntervalUnit",
    "startDate" VARCHAR(10) NOT NULL,
    "endDate" VARCHAR(10),
    "generatedUntil" VARCHAR(10),
    "cancelledFrom" VARCHAR(10),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT clock_timestamp(),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Routine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT,
    "description" TEXT,
    "priority" "Priority",
    "isFixed" BOOLEAN NOT NULL DEFAULT false,
    "date" VARCHAR(10),
    "startMinutes" INTEGER,
    "endMinutes" INTEGER,
    "estimatedMinutes" INTEGER,
    "status" "Status" NOT NULL DEFAULT 'PENDING',
    "actualStart" INTEGER,
    "actualEnd" INTEGER,
    "routineId" TEXT,
    "occurrenceDate" VARCHAR(10),
    "exceptionKind" "ExceptionKind" NOT NULL DEFAULT 'NONE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT clock_timestamp(),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityStep" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT clock_timestamp(),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ActivityStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "activityName" TEXT NOT NULL,
    "reason" "ChangeReason" NOT NULL,
    "fromDate" VARCHAR(10),
    "fromStart" INTEGER,
    "fromEnd" INTEGER,
    "toDate" VARCHAR(10),
    "toStart" INTEGER,
    "toEnd" INTEGER,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT clock_timestamp(),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ChangeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Category_userId_name_key" ON "Category"("userId", "name");

-- CreateIndex
CREATE INDEX "Routine_userId_idx" ON "Routine"("userId");

-- CreateIndex
CREATE INDEX "Activity_userId_date_idx" ON "Activity"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_routineId_occurrenceDate_key" ON "Activity"("routineId", "occurrenceDate");

-- CreateIndex
CREATE INDEX "ActivityStep_activityId_idx" ON "ActivityStep"("activityId");

-- CreateIndex
CREATE INDEX "ChangeRecord_userId_createdAt_idx" ON "ChangeRecord"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ChangeRecord_userId_requestId_idx" ON "ChangeRecord"("userId", "requestId");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Routine" ADD CONSTRAINT "Routine_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Routine" ADD CONSTRAINT "Routine_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "Routine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityStep" ADD CONSTRAINT "ActivityStep_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRecord" ADD CONSTRAINT "ChangeRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRecord" ADD CONSTRAINT "ChangeRecord_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

