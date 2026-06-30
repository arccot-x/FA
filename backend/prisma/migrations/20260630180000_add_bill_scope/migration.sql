-- AlterTable
ALTER TABLE "BillTemplate" ADD COLUMN "scope" "TransactionScope" NOT NULL DEFAULT 'PERSONAL',
ADD COLUMN "familyId" TEXT;

-- CreateIndex
CREATE INDEX "BillTemplate_familyId_scope_idx" ON "BillTemplate"("familyId", "scope");
