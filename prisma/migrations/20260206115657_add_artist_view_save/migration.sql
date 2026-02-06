-- CreateTable
CREATE TABLE "ArtistSave" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtistSave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtistView" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "viewerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtistView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArtistSave_artistId_idx" ON "ArtistSave"("artistId");

-- CreateIndex
CREATE INDEX "ArtistSave_userId_idx" ON "ArtistSave"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ArtistSave_artistId_userId_key" ON "ArtistSave"("artistId", "userId");

-- CreateIndex
CREATE INDEX "ArtistView_artistId_idx" ON "ArtistView"("artistId");

-- CreateIndex
CREATE INDEX "ArtistView_viewerId_idx" ON "ArtistView"("viewerId");

-- CreateIndex
CREATE INDEX "ArtistView_artistId_createdAt_idx" ON "ArtistView"("artistId", "createdAt");

-- AddForeignKey
ALTER TABLE "ArtistSave" ADD CONSTRAINT "ArtistSave_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "ArtistProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistSave" ADD CONSTRAINT "ArtistSave_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistView" ADD CONSTRAINT "ArtistView_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "ArtistProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistView" ADD CONSTRAINT "ArtistView_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
