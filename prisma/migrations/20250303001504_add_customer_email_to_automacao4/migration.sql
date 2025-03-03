/*
  Warnings:

  - You are about to drop the column `waitingEmail` on the `Lead` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Lead" DROP COLUMN "waitingEmail",
ADD COLUMN     "automacaoId" TEXT,
ADD COLUMN     "waitingForEmail" BOOLEAN NOT NULL DEFAULT false;
