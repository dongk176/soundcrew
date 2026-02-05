/*
  Warnings:

  - You are about to drop the column `bio` on the `ArtistProfile` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `ArtistProfile` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `ArtistProfile` table. All the data in the column will be lost.
  - Made the column `stageName` on table `ArtistProfile` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ArtistProfile" DROP COLUMN "bio",
DROP COLUMN "location",
DROP COLUMN "name",
ALTER COLUMN "stageName" SET NOT NULL;
