-- CreateEnum
CREATE TYPE "EquipmentCategory" AS ENUM ('INSTRUMENT', 'GEAR');

-- CreateTable
CREATE TABLE "ArtistEquipment" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "category" "EquipmentCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtistEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArtistEquipment_artistId_idx" ON "ArtistEquipment"("artistId");

-- AddForeignKey
ALTER TABLE "ArtistEquipment" ADD CONSTRAINT "ArtistEquipment_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "ArtistProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
