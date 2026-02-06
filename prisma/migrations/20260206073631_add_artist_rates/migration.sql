-- CreateTable
CREATE TABLE "ArtistRate" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtistRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArtistRate_artistId_idx" ON "ArtistRate"("artistId");

-- AddForeignKey
ALTER TABLE "ArtistRate" ADD CONSTRAINT "ArtistRate_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "ArtistProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
