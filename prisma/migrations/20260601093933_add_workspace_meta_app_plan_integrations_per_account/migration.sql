-- AlterTable
ALTER TABLE "integrations" ADD COLUMN     "adAccountId" TEXT;

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "adAccountId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "passwordHash" DROP NOT NULL;

-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "maxAdAccounts" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "metaAppId" TEXT,
ADD COLUMN     "metaAppSecret" TEXT,
ADD COLUMN     "planName" TEXT NOT NULL DEFAULT 'free';

-- CreateIndex
CREATE UNIQUE INDEX "integrations_adAccountId_platform_key" ON "integrations"("adAccountId", "platform");

-- AddForeignKey
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_adAccountId_fkey" FOREIGN KEY ("adAccountId") REFERENCES "ad_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_adAccountId_fkey" FOREIGN KEY ("adAccountId") REFERENCES "ad_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
