-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "igUserId" TEXT;

-- CreateTable
CREATE TABLE "Automacao" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "selectedMediaId" TEXT,
    "anyMediaSelected" BOOLEAN NOT NULL DEFAULT false,
    "selectedOptionPalavra" TEXT NOT NULL,
    "palavrasChave" TEXT,
    "fraseBoasVindas" TEXT,
    "quickReplyTexto" TEXT,
    "mensagemEtapa3" TEXT,
    "linkEtapa3" TEXT,
    "legendaBotaoEtapa3" TEXT,
    "responderPublico" BOOLEAN NOT NULL DEFAULT false,
    "pedirEmailPro" BOOLEAN NOT NULL DEFAULT false,
    "pedirParaSeguirPro" BOOLEAN NOT NULL DEFAULT false,
    "contatoSemClique" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Automacao_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Automacao" ADD CONSTRAINT "Automacao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
