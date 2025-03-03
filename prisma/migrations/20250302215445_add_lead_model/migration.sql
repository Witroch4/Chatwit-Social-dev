-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "igSenderId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_igSenderId_key" ON "Lead"("igSenderId");
