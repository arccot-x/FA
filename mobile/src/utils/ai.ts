import * as FileSystem from "expo-file-system";
import * as api from "../services/api";
import type { ExpenseCategory } from "../types";

export type ReceiptScan = {
  amount?: number;
  merchant?: string;
  category?: ExpenseCategory;
};

function guessMimeType(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".heic")) return "image/heic";
  return "image/jpeg";
}

/**
 * Encodes a receipt image and sends it to our backend, which calls Groq with the
 * app-wide key. The key never lives in the app. Throws on network/HTTP errors.
 */
export async function scanReceipt(uri: string, userId: string): Promise<ReceiptScan> {
  // Download remote (already-uploaded) receipts so we can base64-encode them.
  let localUri = uri;
  if (/^https?:\/\//i.test(uri)) {
    const target = `${FileSystem.cacheDirectory}scan-${Date.now()}.jpg`;
    localUri = (await FileSystem.downloadAsync(uri, target)).uri;
  }

  const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
  const dataUrl = `data:${guessMimeType(localUri)};base64,${base64}`;
  return api.scanReceiptRemote(userId, dataUrl);
}
