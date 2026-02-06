-- CreateTable
CREATE TABLE "ArtistVideo" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "title" TEXT,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtistVideo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtistReview" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorRole" TEXT,
    "authorAvatarUrl" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtistReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArtistVideo_artistId_idx" ON "ArtistVideo"("artistId");

-- CreateIndex
CREATE INDEX "ArtistReview_artistId_idx" ON "ArtistReview"("artistId");

-- AddForeignKey
ALTER TABLE "ArtistVideo" ADD CONSTRAINT "ArtistVideo_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "ArtistProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistReview" ADD CONSTRAINT "ArtistReview_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "ArtistProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
