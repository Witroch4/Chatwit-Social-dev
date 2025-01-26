-- AlterTable
ALTER TABLE "Automacao" ADD COLUMN     "folderId" TEXT,
ADD COLUMN     "live" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Pasta" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pasta_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Automacao" ADD CONSTRAINT "Automacao_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Pasta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pasta" ADD CONSTRAINT "Pasta_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
