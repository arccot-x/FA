import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import * as api from "../services/api";
import type { BillOccurrence, BootstrapPayload, ExpenseCategory, IncomeCycle, Transaction, User, VaultDocument } from "../types";
import { currentMonthKey } from "../utils/money";

type BillsState = BootstrapPayload["bills"];

type FinanceState = {
  user?: User;
  incomeCycle?: IncomeCycle | null;
  bills: BillsState;
  transactions: Transaction[];
  vaultDocuments: VaultDocument[];
  loading: boolean;
  authReady: boolean;
  offline: boolean;
  authError?: string;
  selectedMonth: string;
  setMonth: (month: string) => Promise<void>;
  restoreSession: () => Promise<void>;
  register: (input: { name: string; email: string; password: string }) => Promise<void>;
  login: (input: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  load: () => Promise<void>;
  addManualExpense: (amount: number, category: ExpenseCategory) => Promise<void>;
  saveIncomeSettings: (input: { defaultMonthlyIncome: number; paydayDay: number; variableIncomeEnabled: boolean }) => Promise<void>;
  saveExpectedIncome: (expected: number, actual?: number) => Promise<void>;
  changePassword: (input: { currentPassword: string; newPassword: string }) => Promise<void>;
  deleteAccount: () => Promise<void>;
  addBill: (input: { name: string; defaultAmount: number; dueDay: number; category: ExpenseCategory; icon: string; autopay?: boolean }) => Promise<void>;
  markBill: (bill: BillOccurrence, status: "PAID" | "UNPAID") => Promise<void>;
  editBillAmount: (bill: BillOccurrence, amount: number, forever?: boolean) => Promise<void>;
  completePendingExpense: (transaction: Transaction, input: { amount: number; category: ExpenseCategory; merchant?: string; notes?: string }) => Promise<void>;
  deleteTransaction: (transaction: Transaction) => Promise<void>;
  deleteBill: (bill: BillOccurrence) => Promise<void>;
  recordSnap: (uri: string) => Promise<void>;
  addVaultDocument: (input: { uri: string; name: string; mimeType?: string; title: string; category: import("../types").VaultCategory }) => Promise<void>;
  refreshVault: () => Promise<void>;
};

const tokenKey = "frictionless-finance-token";
const emptyBills: BillsState = { unpaid: [], settled: [] };

function requireUser(user?: User) {
  if (!user) {
    throw new Error("Please sign in first.");
  }

  return user;
}

async function storeSession(token: string) {
  api.setAuthToken(token);
  await SecureStore.setItemAsync(tokenKey, token);
}

async function clearSession() {
  api.setAuthToken(undefined);
  await SecureStore.deleteItemAsync(tokenKey);
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  bills: emptyBills,
  transactions: [],
  vaultDocuments: [],
  loading: false,
  authReady: false,
  offline: false,
  selectedMonth: currentMonthKey(),

  setMonth: async (month) => {
    set({ selectedMonth: month });
    await get().load();
  },

  restoreSession: async () => {
    set({ loading: true, authError: undefined });
    try {
      const token = await SecureStore.getItemAsync(tokenKey);
      if (!token) {
        set({ authReady: true, loading: false });
        return;
      }

      api.setAuthToken(token);
      const { user } = await api.getCurrentAccount();
      set({ user, authReady: true, offline: false });
      await get().load();
    } catch {
      await clearSession();
      set({
        user: undefined,
        incomeCycle: undefined,
        bills: emptyBills,
        transactions: [],
        vaultDocuments: [],
        authReady: true,
        loading: false,
        offline: false
      });
    }
  },

  register: async (input) => {
    set({ loading: true, authError: undefined });
    try {
      const { user, token } = await api.registerAccount(input);
      await storeSession(token);
      set({ user, offline: false });
      await get().load();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create account.";
      set({ authError: message, loading: false });
      throw error;
    }
  },

  login: async (input) => {
    set({ loading: true, authError: undefined });
    try {
      const { user, token } = await api.loginAccount(input);
      await storeSession(token);
      set({ user, offline: false });
      await get().load();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not sign in.";
      set({ authError: message, loading: false });
      throw error;
    }
  },

  logout: async () => {
    await clearSession();
    set({
      user: undefined,
      incomeCycle: undefined,
      bills: emptyBills,
      transactions: [],
      vaultDocuments: [],
      loading: false,
      offline: false,
      authError: undefined,
      selectedMonth: currentMonthKey()
    });
  },

  load: async () => {
    const user = get().user;
    if (!user) {
      set({ loading: false });
      return;
    }

    set({ loading: true });
    try {
      const data = await api.bootstrap(user.id, get().selectedMonth);
      set({
        user: data.user,
        incomeCycle: data.incomeCycle,
        bills: data.bills,
        transactions: data.transactions,
        vaultDocuments: data.vaultDocuments,
        loading: false,
        offline: false
      });
    } catch {
      set({ loading: false, offline: true });
    }
  },

  addManualExpense: async (amount, category) => {
    const user = requireUser(get().user);
    const optimistic: Transaction = {
      id: `local-${Date.now()}`,
      amount,
      category,
      status: "CLEARED",
      source: "MANUAL",
      occurredAt: new Date().toISOString(),
      attachments: []
    };

    set({ transactions: [optimistic, ...get().transactions] });
    await api.addTransaction({ userId: user.id, amount, category });
    await get().load();
  },

  saveIncomeSettings: async (input) => {
    const user = requireUser(get().user);
    const currentCycle = get().incomeCycle;
    set({
      user: {
        ...user,
        defaultMonthlyIncome: input.defaultMonthlyIncome,
        paydayDay: input.paydayDay,
        variableIncomeEnabled: input.variableIncomeEnabled
      },
      incomeCycle: currentCycle
        ? { ...currentCycle, expected: input.defaultMonthlyIncome }
        : { id: "local-income", expected: input.defaultMonthlyIncome, cycleMonth: new Date().toISOString() }
    });

    await api.updateIncomeSettings({ userId: user.id, ...input });
    await get().load();
  },

  saveExpectedIncome: async (expected, actual) => {
    const user = requireUser(get().user);
    const currentCycle = get().incomeCycle;
    set({
      incomeCycle: currentCycle
        ? { ...currentCycle, expected, actual: actual ?? currentCycle.actual }
        : { id: "local-income", expected, actual, cycleMonth: new Date().toISOString() }
    });

    await api.saveIncomeCycle({ userId: user.id, month: get().selectedMonth, expected, actual });
    await get().load();
  },

  changePassword: async (input) => {
    const user = requireUser(get().user);
    await api.changePassword({ userId: user.id, currentPassword: input.currentPassword, newPassword: input.newPassword });
  },

  deleteAccount: async () => {
    const user = requireUser(get().user);
    await api.deleteAccount({ userId: user.id });
    await clearSession();
    set({
      user: undefined,
      incomeCycle: undefined,
      bills: emptyBills,
      transactions: [],
      vaultDocuments: [],
      loading: false,
      offline: false,
      authError: undefined
    });
  },

  addBill: async (input) => {
    const user = requireUser(get().user);
    await api.addBillTemplate({ userId: user.id, ...input });
    await get().load();
  },

  markBill: async (bill, status) => {
    const user = requireUser(get().user);
    const withoutBill = {
      unpaid: get().bills.unpaid.filter((item) => item.id !== bill.id),
      settled: get().bills.settled.filter((item) => item.id !== bill.id)
    };
    const nextBill = { ...bill, status, paidAt: status === "PAID" ? new Date().toISOString() : null };
    const nextBills =
      status === "PAID"
        ? { unpaid: withoutBill.unpaid, settled: [nextBill, ...withoutBill.settled] }
        : { unpaid: [nextBill, ...withoutBill.unpaid], settled: withoutBill.settled };

    set({ bills: nextBills });
    await api.updateBill(user.id, bill.id, { status });
    await get().load();
  },

  editBillAmount: async (bill, amount, forever) => {
    const user = requireUser(get().user);
    const replace = (item: BillOccurrence) => (item.id === bill.id ? { ...item, amount } : item);
    set({ bills: { unpaid: get().bills.unpaid.map(replace), settled: get().bills.settled.map(replace) } });
    // Always update this month's occurrence; optionally update the template so future months inherit it.
    await api.updateBill(user.id, bill.id, { amount });
    if (forever) {
      await api.updateBillTemplate(user.id, bill.billTemplate.id, { defaultAmount: amount });
    }
    await get().load();
  },

  completePendingExpense: async (transaction, input) => {
    const user = requireUser(get().user);
    const replace = (item: Transaction) =>
      item.id === transaction.id
        ? {
            ...item,
            amount: input.amount,
            category: input.category,
            merchant: input.merchant,
            notes: input.notes,
            status: "CLEARED" as const
          }
        : item;

    set({ transactions: get().transactions.map(replace) });
    await api.updateTransaction({
      userId: user.id,
      transactionId: transaction.id,
      amount: input.amount,
      category: input.category,
      merchant: input.merchant,
      notes: input.notes,
      status: "CLEARED"
    });
    await get().load();
  },

  deleteTransaction: async (transaction) => {
    const user = requireUser(get().user);
    set({ transactions: get().transactions.filter((item) => item.id !== transaction.id) });
    // Optimistic-only for not-yet-synced local records (no server id).
    if (!transaction.id.startsWith("local-") && !transaction.id.startsWith("snap-")) {
      await api.deleteTransaction({ userId: user.id, transactionId: transaction.id });
    }
    await get().load();
  },

  deleteBill: async (bill) => {
    const user = requireUser(get().user);
    set({
      bills: {
        unpaid: get().bills.unpaid.filter((item) => item.id !== bill.id),
        settled: get().bills.settled.filter((item) => item.id !== bill.id)
      }
    });
    await api.deleteBillTemplate({ userId: user.id, templateId: bill.billTemplate.id });
    await get().load();
  },

  recordSnap: async (uri) => {
    const user = requireUser(get().user);
    const optimistic: Transaction = {
      id: `snap-${Date.now()}`,
      amount: null,
      category: null,
      merchant: "Pending receipt",
      status: "PENDING_DETAILS",
      source: "SNAP_SAVE",
      occurredAt: new Date().toISOString(),
      attachments: [{ id: `att-${Date.now()}`, url: uri, fileName: "receipt.jpg", mimeType: "image/jpeg" }]
    };

    set({ transactions: [optimistic, ...get().transactions] });
    await api.uploadSnapExpense({ userId: user.id, uri });
    await get().load();
  },

  addVaultDocument: async (input) => {
    const user = requireUser(get().user);
    const optimistic = {
      id: `local-vault-${Date.now()}`,
      title: input.title,
      category: input.category,
      fileName: input.name,
      mimeType: input.mimeType ?? "application/octet-stream",
      url: input.uri,
      createdAt: new Date().toISOString()
    };

    set({ vaultDocuments: [optimistic, ...get().vaultDocuments] });
    await api.uploadVaultDocument({ userId: user.id, ...input });
    await get().load();
  },

  refreshVault: async () => {
    await get().load();
  }
}));
