-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "igUsername" TEXT,
ADD COLUMN     "isMain" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Automacao" ADD COLUMN     "accountId" TEXT;

-- AddForeignKey
ALTER TABLE "Automacao" ADD CONSTRAINT "Automacao_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
