import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import type { Transaction } from "../types";
import { toNumber } from "./money";

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Writes transactions to a CSV file and opens the share sheet. Returns false if nothing to export. */
export async function exportTransactionsCsv(transactions: Transaction[]): Promise<boolean> {
  if (transactions.length === 0) return false;

  const header = ["Date", "Merchant", "Category", "Amount", "Status", "Notes"];
  const rows = transactions.map((tx) =>
    [
      new Date(tx.occurredAt).toISOString().slice(0, 10),
      tx.merchant ?? "",
      tx.category ?? "",
      String(toNumber(tx.amount)),
      tx.status,
      tx.notes ?? ""
    ]
      .map((cell) => escapeCsv(String(cell)))
      .join(",")
  );

  const csv = [header.join(","), ...rows].join("\n");
  const uri = `${FileSystem.cacheDirectory}transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "text/csv", dialogTitle: "Export CSV", UTI: "public.comma-separated-values-text" });
  }
  return true;
}
