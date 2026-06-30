import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import * as api from "../services/api";
import type { BillOccurrence, BootstrapPayload, ExpenseCategory, Family, FamilyInvite, HouseData, IncomeCycle, Transaction, TransactionScope, User, VaultDocument } from "../types";
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
  family?: Family | null;
  familyInvites: FamilyInvite[];
  house: HouseData;
  loadFamily: () => Promise<void>;
  createFamily: (name: string) => Promise<void>;
  inviteFamilyMember: (userId: string) => Promise<void>;
  acceptInvite: (memberId: string) => Promise<void>;
  declineInvite: (memberId: string) => Promise<void>;
  leaveFamily: () => Promise<void>;
  deleteFamily: () => Promise<void>;
  restoreSession: () => Promise<void>;
  register: (input: { name: string; email: string; password: string }) => Promise<void>;
  login: (input: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  load: () => Promise<void>;
  addManualExpense: (amount: number, category: ExpenseCategory, scope?: TransactionScope) => Promise<void>;
  saveIncomeSettings: (input: { defaultMonthlyIncome: number; paydayDay: number; variableIncomeEnabled: boolean }) => Promise<void>;
  saveExpectedIncome: (expected: number, actual?: number, houseAllocation?: number) => Promise<void>;
  changePassword: (input: { currentPassword: string; newPassword: string }) => Promise<void>;
  deleteAccount: () => Promise<void>;
  addBill: (input: { name: string; defaultAmount: number; dueDay: number; category: ExpenseCategory; icon: string; autopay?: boolean; scope?: TransactionScope }) => Promise<void>;
  markBill: (bill: BillOccurrence, status: "PAID" | "UNPAID") => Promise<void>;
  editBillAmount: (bill: BillOccurrence, amount: number, forever?: boolean) => Promise<void>;
  completePendingExpense: (transaction: Transaction, input: { amount: number; category: ExpenseCategory; merchant?: string; notes?: string; scope?: TransactionScope }) => Promise<void>;
  deleteTransaction: (transaction: Transaction) => Promise<void>;
  deleteBill: (bill: BillOccurrence) => Promise<void>;
  recordSnap: (uri: string) => Promise<void>;
  addVaultDocument: (input: { uri: string; name: string; mimeType?: string; title: string; category: import("../types").VaultCategory }) => Promise<void>;
  refreshVault: () => Promise<void>;
};

const tokenKey = "frictionless-finance-token";
const emptyBills: BillsState = { unpaid: [], settled: [] };
const emptyHouse: HouseData = { pool: 0, spent: 0, billsDue: 0, balance: 0, transactions: [] };

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
  family: undefined,
  familyInvites: [],
  house: emptyHouse,

  setMonth: async (month) => {
    set({ selectedMonth: month });
    await get().load();
  },

  loadFamily: async () => {
    const user = get().user;
    if (!user) {
      set({ family: null, familyInvites: [], house: emptyHouse });
      return;
    }
    try {
      const { family, invites } = await api.getMyFamily();
      set({ family, familyInvites: invites });
      // House money only exists when in a family.
      if (family) {
        const house = await api.getHouse(get().selectedMonth);
        set({ house });
      } else {
        set({ house: emptyHouse });
      }
    } catch {
      // Non-fatal: family features just stay hidden if this fails.
    }
  },

  createFamily: async (name) => {
    await api.createFamily(name);
    await get().loadFamily();
  },

  inviteFamilyMember: async (userId) => {
    const family = get().family;
    if (!family) throw new Error("Create a family first.");
    await api.inviteFamilyMember(family.id, userId);
    await get().loadFamily();
  },

  acceptInvite: async (memberId) => {
    await api.acceptFamilyInvite(memberId);
    await get().loadFamily();
  },

  declineInvite: async (memberId) => {
    await api.declineFamilyInvite(memberId);
    await get().loadFamily();
  },

  leaveFamily: async () => {
    const user = get().user;
    const family = get().family;
    if (!user || !family) return;
    await api.leaveFamily(family.id, user.id);
    set({ family: null, house: emptyHouse });
    await get().loadFamily();
  },

  deleteFamily: async () => {
    const family = get().family;
    if (!family) return;
    await api.deleteFamily(family.id);
    set({ family: null, house: emptyHouse });
    await get().loadFamily();
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
      selectedMonth: currentMonthKey(),
      family: null,
      familyInvites: [],
      house: emptyHouse
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
      void get().loadFamily();
    } catch {
      set({ loading: false, offline: true });
    }
  },

  addManualExpense: async (amount, category, scope = "PERSONAL") => {
    const user = requireUser(get().user);
    const familyId = scope === "HOUSE" ? get().family?.id ?? null : null;
    const optimistic: Transaction = {
      id: `local-${Date.now()}`,
      amount,
      category,
      status: "CLEARED",
      source: "MANUAL",
      scope,
      familyId,
      occurredAt: new Date().toISOString(),
      attachments: []
    };

    set({ transactions: [optimistic, ...get().transactions] });
    await api.addTransaction({ userId: user.id, amount, category, scope, familyId });
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

  saveExpectedIncome: async (expected, actual, houseAllocation) => {
    const user = requireUser(get().user);
    const currentCycle = get().incomeCycle;
    set({
      incomeCycle: currentCycle
        ? { ...currentCycle, expected, actual: actual ?? currentCycle.actual, houseAllocation: houseAllocation ?? currentCycle.houseAllocation }
        : { id: "local-income", expected, actual, houseAllocation, cycleMonth: new Date().toISOString() }
    });

    await api.saveIncomeCycle({ userId: user.id, month: get().selectedMonth, expected, actual, houseAllocation });
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
    const familyId = input.scope === "HOUSE" ? get().family?.id ?? null : null;
    await api.addBillTemplate({ userId: user.id, ...input, familyId });
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
    const scope = input.scope ?? transaction.scope ?? "PERSONAL";
    const familyId = scope === "HOUSE" ? get().family?.id ?? null : null;
    const replace = (item: Transaction) =>
      item.id === transaction.id
        ? {
            ...item,
            amount: input.amount,
            category: input.category,
            merchant: input.merchant,
            notes: input.notes,
            scope,
            familyId,
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
      status: "CLEARED",
      scope,
      familyId
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
