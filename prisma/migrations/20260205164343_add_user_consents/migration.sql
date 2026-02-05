-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('TERMS', 'PRIVACY', 'MARKETING');

-- CreateTable
CREATE TABLE "UserConsent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ConsentType" NOT NULL,
    "version" TEXT NOT NULL,
    "agreedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "UserConsent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserConsent_userId_type_idx" ON "UserConsent"("userId", "type");

-- AddForeignKey
ALTER TABLE "UserConsent" ADD CONSTRAINT "UserConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
