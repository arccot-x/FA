import * as FileSystem from "expo-file-system";
import type { ExpenseCategory, TransactionScope, TransactionType, VaultCategory } from "../types";

export type OfflineQueueItem =
  | {
      id: string;
      kind: "addTransaction";
      payload: { amount: number; category?: ExpenseCategory; type?: TransactionType; scope?: TransactionScope; familyId?: string | null };
      createdAt: string;
    }
  | {
      id: string;
      kind: "updateTransaction";
      payload: { transactionId: string; amount: number; category: ExpenseCategory; merchant?: string; notes?: string; scope?: TransactionScope; familyId?: string | null };
      createdAt: string;
    }
  | { id: string; kind: "deleteTransaction"; payload: { transactionId: string }; createdAt: string }
  | { id: string; kind: "uploadSnap"; payload: { uri: string }; createdAt: string }
  | {
      id: string;
      kind: "addBill";
      payload: { name: string; defaultAmount: number; dueDay: number; category: ExpenseCategory; icon: string; autopay?: boolean; scope?: TransactionScope; familyId?: string | null };
      createdAt: string;
    }
  | { id: string; kind: "deleteBill"; payload: { templateId: string }; createdAt: string }
  | { id: string; kind: "saveIncomeSettings"; payload: { defaultMonthlyIncome: number; paydayDay: number; variableIncomeEnabled: boolean }; createdAt: string }
  | { id: string; kind: "saveIncomeCycle"; payload: { month: string; expected: number; actual?: number; houseAllocation?: number }; createdAt: string }
  | {
      id: string;
      kind: "addVaultDocument";
      payload: { uri: string; name: string; mimeType?: string; title: string; category: VaultCategory };
      createdAt: string;
    }
  | { id: string; kind: "deleteVaultDocument"; payload: { documentId: string }; createdAt: string };

const dir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? "";
const queueFile = `${dir}offline-queue.json`;

export function makeQueueItem<T extends OfflineQueueItem["kind"]>(
  kind: T,
  payload: Extract<OfflineQueueItem, { kind: T }>["payload"],
  id = `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
): Extract<OfflineQueueItem, { kind: T }> {
  return { id, kind, payload, createdAt: new Date().toISOString() } as Extract<OfflineQueueItem, { kind: T }>;
}

export function compactQueue(items: OfflineQueueItem[]) {
  const deletedTransactions = new Set(items.filter((item) => item.kind === "deleteTransaction").map((item) => item.payload.transactionId));
  const deletedVaultDocs = new Set(items.filter((item) => item.kind === "deleteVaultDocument").map((item) => item.payload.documentId));
  const deletedBills = new Set(items.filter((item) => item.kind === "deleteBill").map((item) => item.payload.templateId));

  return items.filter((item) => {
    if (item.kind === "updateTransaction" && deletedTransactions.has(item.payload.transactionId)) return false;
    if (item.kind === "addVaultDocument" && deletedVaultDocs.has(item.id)) return false;
    if (item.kind === "addBill" && deletedBills.has(item.id)) return false;
    return true;
  });
}

export async function loadOfflineQueue(): Promise<OfflineQueueItem[]> {
  try {
    const info = await FileSystem.getInfoAsync(queueFile);
    if (!info.exists) return [];
    const raw = await FileSystem.readAsStringAsync(queueFile);
    const parsed = JSON.parse(raw) as OfflineQueueItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveOfflineQueue(items: OfflineQueueItem[]): Promise<void> {
  if (!dir) return;
  try {
    await FileSystem.writeAsStringAsync(queueFile, JSON.stringify(compactQueue(items)));
  } catch {
    // Queue persistence is best-effort; optimistic UI still keeps the user moving.
  }
}

export async function enqueueOfflineItem(item: OfflineQueueItem): Promise<OfflineQueueItem[]> {
  const items = await loadOfflineQueue();
  const next = compactQueue([...items, item]);
  await saveOfflineQueue(next);
  return next;
}

export async function clearOfflineQueue(): Promise<void> {
  try {
    await FileSystem.deleteAsync(queueFile, { idempotent: true });
  } catch {
    // Nothing to clear.
  }
}
