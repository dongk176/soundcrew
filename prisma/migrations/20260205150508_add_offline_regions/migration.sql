-- CreateEnum
CREATE TYPE "ArtistRole" AS ENUM ('PRODUCER', 'SINGER', 'MIXING_ENGINEER', 'SONGWRITER', 'MASTERING_ENGINEER', 'SESSION_MUSICIAN');

-- AlterTable
ALTER TABLE "ArtistProfile" ADD COLUMN     "averageWorkDuration" TEXT,
ADD COLUMN     "offlineAvailable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "offlineRegions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "onlineAvailable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "portfolioLinks" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "roles" "ArtistRole"[],
ADD COLUMN     "shortIntro" TEXT,
ADD COLUMN     "stageName" TEXT;
