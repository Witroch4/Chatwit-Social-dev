/*
  Warnings:

  - The primary key for the `Lead` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `automacaoId` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `Lead` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Lead_igSenderId_automacaoId_key";

-- AlterTable
ALTER TABLE "Lead" DROP CONSTRAINT "Lead_pkey",
DROP COLUMN "automacaoId",
DROP COLUMN "id",
ADD COLUMN     "waitingEmail" BOOLEAN NOT NULL DEFAULT false,
ADD CONSTRAINT "Lead_pkey" PRIMARY KEY ("igSenderId");
