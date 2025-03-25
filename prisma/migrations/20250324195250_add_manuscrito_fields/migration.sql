/*
  Warnings:

  - Added the required column `accountId` to the `Lead` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "accountId" TEXT NOT NULL,
ADD COLUMN     "avatar" TEXT,
ADD COLUMN     "isOnline" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastMessage" TIMESTAMP(3),
ADD COLUMN     "name" TEXT;

-- CreateTable
CREATE TABLE "Chat" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isFromLead" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsuarioChatwit" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "availableName" TEXT,
    "accountId" INTEGER NOT NULL,
    "accountName" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "inboxId" INTEGER,
    "inboxName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsuarioChatwit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadChatwit" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "name" TEXT,
    "nomeReal" TEXT,
    "phoneNumber" TEXT,
    "email" TEXT,
    "thumbnail" TEXT,
    "concluido" BOOLEAN NOT NULL DEFAULT false,
    "anotacoes" TEXT,
    "pdfUnificado" TEXT,
    "imagensConvertidas" TEXT,
    "leadUrl" TEXT,
    "fezRecurso" BOOLEAN NOT NULL DEFAULT false,
    "datasRecurso" TEXT,
    "provaManuscrita" TEXT,
    "manuscritoProcessado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "usuarioId" TEXT NOT NULL,

    CONSTRAINT "LeadChatwit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArquivoLeadChatwit" (
    "id" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "dataUrl" TEXT NOT NULL,
    "pdfConvertido" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "leadId" TEXT NOT NULL,

    CONSTRAINT "ArquivoLeadChatwit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Chat_accountId_idx" ON "Chat"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "Chat_leadId_accountId_key" ON "Chat"("leadId", "accountId");

-- CreateIndex
CREATE INDEX "Message_chatId_idx" ON "Message"("chatId");

-- CreateIndex
CREATE INDEX "LeadChatwit_usuarioId_idx" ON "LeadChatwit"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadChatwit_usuarioId_sourceId_key" ON "LeadChatwit"("usuarioId", "sourceId");

-- CreateIndex
CREATE INDEX "ArquivoLeadChatwit_leadId_idx" ON "ArquivoLeadChatwit"("leadId");

-- CreateIndex
CREATE INDEX "Lead_accountId_idx" ON "Lead"("accountId");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("igSenderId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadChatwit" ADD CONSTRAINT "LeadChatwit_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "UsuarioChatwit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArquivoLeadChatwit" ADD CONSTRAINT "ArquivoLeadChatwit_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "LeadChatwit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
