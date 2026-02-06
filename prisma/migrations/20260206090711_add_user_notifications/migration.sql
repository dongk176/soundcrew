-- AlterTable
ALTER TABLE "User" ADD COLUMN     "notifyMarketing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notifyMessage" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyRequest" BOOLEAN NOT NULL DEFAULT true;
