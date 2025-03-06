/*
  Warnings:

  - Made the column `accountId` on table `Automacao` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Automacao" DROP CONSTRAINT "Automacao_accountId_fkey";

-- AlterTable
ALTER TABLE "Automacao" ALTER COLUMN "accountId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Account_providerAccountId_idx" ON "Account"("providerAccountId");

-- CreateIndex
CREATE INDEX "Automacao_userId_idx" ON "Automacao"("userId");

-- CreateIndex
CREATE INDEX "Automacao_accountId_idx" ON "Automacao"("accountId");

-- AddForeignKey
ALTER TABLE "Automacao" ADD CONSTRAINT "Automacao_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
