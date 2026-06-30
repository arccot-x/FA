import type { ExpenseCategory, Transaction } from "../types";
import { toNumber } from "./money";

export type ReceiptScanFields = {
  amount?: number;
  category?: ExpenseCategory;
  merchant?: string;
  notes?: string;
};

export function shouldAutoScanReceipt(input: { aiEnabled: boolean; transaction: Transaction | null; receiptUri?: string; userId?: string }) {
  const { aiEnabled, transaction, receiptUri, userId } = input;
  if (!aiEnabled || !transaction || transaction.status !== "PENDING_DETAILS" || !receiptUri || !userId) return false;
  return !transaction.aiScannedAt;
}

export function mergeReceiptScan(
  current: { amount: string; merchant: string; category: ExpenseCategory; notes: string },
  result: { amount?: number; merchant?: string; category?: ExpenseCategory; items?: string }
): ReceiptScanFields {
  return {
    amount: result.amount && !Number(current.amount) ? result.amount : toNumber(current.amount) || undefined,
    merchant: result.merchant && !current.merchant.trim() ? result.merchant : current.merchant.trim() || undefined,
    category: result.category ?? current.category,
    notes: result.items && !current.notes.trim() ? result.items : current.notes.trim() || undefined
  };
}
