/*
  Warnings:

  - You are about to drop the column `selectedOptionPalavra` on the `Automacao` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Automacao" DROP COLUMN "selectedOptionPalavra",
ADD COLUMN     "anyword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "followPrompt" TEXT,
ADD COLUMN     "noClickPrompt" TEXT;
