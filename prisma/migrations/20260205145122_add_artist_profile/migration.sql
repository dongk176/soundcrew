-- CreateEnum
CREATE TYPE "ArtistGenre" AS ENUM ('POP', 'HIPHOP', 'RNB', 'ELECTRONIC', 'ROCK', 'ACOUSTIC', 'JAZZ', 'CINEMATIC', 'WORLD', 'GOSPEL', 'INDIE');

-- CreateEnum
CREATE TYPE "TrackSourceType" AS ENUM ('UPLOAD', 'LINK');

-- CreateTable
CREATE TABLE "ArtistProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "bio" TEXT,
    "genres" "ArtistGenre"[],
    "location" TEXT,
    "avatarUrl" TEXT,
    "avatarKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArtistProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtistTrack" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "title" TEXT,
    "sourceType" "TrackSourceType" NOT NULL,
    "url" TEXT NOT NULL,
    "fileKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtistTrack_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArtistProfile_userId_key" ON "ArtistProfile"("userId");

-- AddForeignKey
ALTER TABLE "ArtistProfile" ADD CONSTRAINT "ArtistProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistTrack" ADD CONSTRAINT "ArtistTrack_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "ArtistProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
