/*
  Warnings:

  - A unique constraint covering the columns `[igSenderId,automacaoId]` on the table `Lead` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Lead_igSenderId_key";

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "automacaoId" TEXT NOT NULL DEFAULT 'default-value',
ADD COLUMN     "linkSent" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Lead_igSenderId_automacaoId_key" ON "Lead"("igSenderId", "automacaoId");
