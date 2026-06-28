-- CreateEnum
CREATE TYPE "IncomeSourceType" AS ENUM ('DEFAULT', 'VARIABLE_EXPECTED', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('UNPAID', 'PAID', 'SKIPPED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('EXPENSE', 'INCOME', 'TRANSFER');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('CLEARED', 'PENDING_DETAILS');

-- CreateEnum
CREATE TYPE "TransactionSource" AS ENUM ('MANUAL', 'SNAP_SAVE', 'IMPORT');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('GROCERIES', 'DINING', 'GAS', 'TRANSPORT', 'SHOPPING', 'ENTERTAINMENT', 'HEALTH', 'HOME', 'UTILITIES', 'TRAVEL', 'SUBSCRIPTION', 'OTHER');

-- CreateEnum
CREATE TYPE "VaultCategory" AS ENUM ('LEASE', 'TAX', 'INSURANCE', 'RECEIPT', 'BANKING', 'MEDICAL', 'WARRANTY', 'OTHER');

-- CreateEnum
CREATE TYPE "AttachmentOwnerType" AS ENUM ('TRANSACTION', 'VAULT_DOCUMENT');

-- CreateEnum
CREATE TYPE "DocumentMimeGroup" AS ENUM ('IMAGE', 'PDF', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultMonthlyIncome" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paydayDay" INTEGER NOT NULL DEFAULT 1,
    "variableIncomeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomeCycle" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cycleMonth" TIMESTAMP(3) NOT NULL,
    "sourceType" "IncomeSourceType" NOT NULL DEFAULT 'DEFAULT',
    "expected" DECIMAL(12,2) NOT NULL,
    "actual" DECIMAL(12,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncomeCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL DEFAULT 'OTHER',
    "defaultAmount" DECIMAL(12,2) NOT NULL,
    "dueDay" INTEGER NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'receipt',
    "autopay" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillOccurrence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "billTemplateId" TEXT NOT NULL,
    "cycleMonth" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "BillStatus" NOT NULL DEFAULT 'UNPAID',
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL DEFAULT 'EXPENSE',
    "status" "TransactionStatus" NOT NULL DEFAULT 'CLEARED',
    "source" "TransactionSource" NOT NULL DEFAULT 'MANUAL',
    "amount" DECIMAL(12,2),
    "category" "ExpenseCategory",
    "merchant" TEXT,
    "notes" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ownerType" "AttachmentOwnerType" NOT NULL,
    "transactionId" TEXT,
    "vaultDocumentId" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "mimeGroup" "DocumentMimeGroup" NOT NULL DEFAULT 'OTHER',
    "fileSize" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaultDocument" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "VaultCategory" NOT NULL DEFAULT 'OTHER',
    "mimeGroup" "DocumentMimeGroup" NOT NULL DEFAULT 'OTHER',
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "notes" TEXT,
    "issuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VaultDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "IncomeCycle_userId_cycleMonth_idx" ON "IncomeCycle"("userId", "cycleMonth");

-- CreateIndex
CREATE UNIQUE INDEX "IncomeCycle_userId_cycleMonth_key" ON "IncomeCycle"("userId", "cycleMonth");

-- CreateIndex
CREATE INDEX "BillTemplate_userId_active_dueDay_idx" ON "BillTemplate"("userId", "active", "dueDay");

-- CreateIndex
CREATE INDEX "BillOccurrence_userId_cycleMonth_status_dueDate_idx" ON "BillOccurrence"("userId", "cycleMonth", "status", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "BillOccurrence_billTemplateId_cycleMonth_key" ON "BillOccurrence"("billTemplateId", "cycleMonth");

-- CreateIndex
CREATE INDEX "Transaction_userId_occurredAt_idx" ON "Transaction"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "Transaction_userId_status_idx" ON "Transaction"("userId", "status");

-- CreateIndex
CREATE INDEX "Attachment_userId_ownerType_idx" ON "Attachment"("userId", "ownerType");

-- CreateIndex
CREATE INDEX "VaultDocument_userId_category_createdAt_idx" ON "VaultDocument"("userId", "category", "createdAt");

-- AddForeignKey
ALTER TABLE "IncomeCycle" ADD CONSTRAINT "IncomeCycle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillTemplate" ADD CONSTRAINT "BillTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillOccurrence" ADD CONSTRAINT "BillOccurrence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillOccurrence" ADD CONSTRAINT "BillOccurrence_billTemplateId_fkey" FOREIGN KEY ("billTemplateId") REFERENCES "BillTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_vaultDocumentId_fkey" FOREIGN KEY ("vaultDocumentId") REFERENCES "VaultDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultDocument" ADD CONSTRAINT "VaultDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

