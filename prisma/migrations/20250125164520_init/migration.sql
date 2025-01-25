/*
  Warnings:

  - A unique constraint covering the columns `[buttonPayload]` on the table `Automacao` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `buttonPayload` to the `Automacao` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Automacao" ADD COLUMN     "buttonPayload" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Automacao_buttonPayload_key" ON "Automacao"("buttonPayload");
