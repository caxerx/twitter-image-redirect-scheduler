-- CreateEnum
CREATE TYPE "RecordType" AS ENUM ('TWITTER');

-- CreateTable
CREATE TABLE "Record" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "RecordType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Record_pkey" PRIMARY KEY ("id")
);
