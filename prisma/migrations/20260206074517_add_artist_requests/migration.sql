-- CreateEnum
CREATE TYPE "ArtistRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED');

-- CreateTable
CREATE TABLE "ArtistRequest" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "shortHelp" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "referenceLinks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ArtistRequestStatus" NOT NULL DEFAULT 'PENDING',
    "threadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArtistRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArtistRequest_artistId_idx" ON "ArtistRequest"("artistId");

-- CreateIndex
CREATE INDEX "ArtistRequest_requesterId_idx" ON "ArtistRequest"("requesterId");

-- AddForeignKey
ALTER TABLE "ArtistRequest" ADD CONSTRAINT "ArtistRequest_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "ArtistProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistRequest" ADD CONSTRAINT "ArtistRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistRequest" ADD CONSTRAINT "ArtistRequest_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "MessageThread"("id") ON DELETE SET NULL ON UPDATE CASCADE;
