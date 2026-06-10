-- AlterTable
ALTER TABLE "sales" ADD COLUMN "saleDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "sales_workspaceId_saleDate_idx" ON "sales"("workspaceId", "saleDate");
