-- CreateTable
CREATE TABLE "ArtistPhoto" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileKey" TEXT,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtistPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArtistPhoto_artistId_idx" ON "ArtistPhoto"("artistId");

-- AddForeignKey
ALTER TABLE "ArtistPhoto" ADD CONSTRAINT "ArtistPhoto_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "ArtistProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
