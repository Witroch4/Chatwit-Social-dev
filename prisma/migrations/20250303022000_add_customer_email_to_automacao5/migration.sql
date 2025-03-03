/*
  Warnings:

  - You are about to drop the column `customerEmail` on the `Automacao` table. All the data in the column will be lost.
  - You are about to drop the column `automacaoId` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `linkSent` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `waitingForEmail` on the `Lead` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Automacao" DROP COLUMN "customerEmail";

-- AlterTable
ALTER TABLE "Lead" DROP COLUMN "automacaoId",
DROP COLUMN "linkSent",
DROP COLUMN "waitingForEmail";

-- CreateTable
CREATE TABLE "LeadAutomacao" (
    "id" TEXT NOT NULL,
    "leadIgSenderId" TEXT NOT NULL,
    "automacaoId" TEXT NOT NULL,
    "linkSent" BOOLEAN NOT NULL DEFAULT false,
    "waitingForEmail" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadAutomacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeadAutomacao_leadIgSenderId_automacaoId_key" ON "LeadAutomacao"("leadIgSenderId", "automacaoId");

-- AddForeignKey
ALTER TABLE "LeadAutomacao" ADD CONSTRAINT "LeadAutomacao_leadIgSenderId_fkey" FOREIGN KEY ("leadIgSenderId") REFERENCES "Lead"("igSenderId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAutomacao" ADD CONSTRAINT "LeadAutomacao_automacaoId_fkey" FOREIGN KEY ("automacaoId") REFERENCES "Automacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
