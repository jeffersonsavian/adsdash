-- CreateTable
CREATE TABLE "integrations" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "name" TEXT,
    "webhookToken" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "grossAmount" INTEGER NOT NULL,
    "netAmount" INTEGER NOT NULL,
    "platformFee" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "paymentMethod" TEXT,
    "installments" INTEGER NOT NULL DEFAULT 1,
    "productId" TEXT,
    "productName" TEXT,
    "offerName" TEXT,
    "customerEmail" TEXT,
    "customerName" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "utmTerm" TEXT,
    "metaCampaignId" TEXT,
    "metaCampaignName" TEXT,
    "metaAdsetId" TEXT,
    "metaAdsetName" TEXT,
    "metaAdId" TEXT,
    "metaAdName" TEXT,
    "fundsStatus" TEXT,
    "approvedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sales_workspaceId_createdAt_idx" ON "sales"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "sales_workspaceId_status_idx" ON "sales"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "sales_metaCampaignId_idx" ON "sales"("metaCampaignId");

-- CreateIndex
CREATE INDEX "sales_metaAdsetId_idx" ON "sales"("metaAdsetId");

-- CreateIndex
CREATE UNIQUE INDEX "sales_platform_externalId_key" ON "sales"("platform", "externalId");

-- AddForeignKey
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "integrations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
