import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import * as api from "../services/api";
import type { BillOccurrence, BootstrapPayload, ExpenseCategory, Family, FamilyInvite, HouseData, IncomeCycle, Transaction, TransactionScope, User, VaultDocument } from "../types";
import { currentMonthKey } from "../utils/money";
import { clearCache, loadCache, saveCache } from "../utils/cache";
import { clearOfflineQueue, enqueueOfflineItem, loadOfflineQueue, makeQueueItem, saveOfflineQueue, type OfflineQueueItem } from "../utils/offlineQueue";

type CachedBootstrap = Pick<BootstrapPayload, "incomeCycle" | "bills" | "transactions" | "vaultDocuments">;

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
  pendingSyncCount: number;
  syncing: boolean;
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
  requestPasswordReset: (input: { email: string }) => Promise<void>;
  resetPassword: (input: { email: string; code: string; newPassword: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (input: { name: string; email: string; phoneNumber?: string | null; avatarUrl?: string | null; householdRole?: string | null }) => Promise<void>;
  load: () => Promise<void>;
  processPendingSync: () => Promise<void>;
  addManualExpense: (amount: number, category: ExpenseCategory, scope?: TransactionScope, type?: import("../types").TransactionType) => Promise<void>;
  saveIncomeSettings: (input: { defaultMonthlyIncome: number; paydayDay: number; variableIncomeEnabled: boolean }) => Promise<void>;
  saveExpectedIncome: (expected: number, actual?: number, houseAllocation?: number) => Promise<void>;
  changePassword: (input: { currentPassword: string; newPassword: string }) => Promise<void>;
  deleteAccount: () => Promise<void>;
  addBill: (input: { name: string; defaultAmount: number; dueDay: number; category: ExpenseCategory; icon: string; autopay?: boolean; scope?: TransactionScope }) => Promise<void>;
  markBill: (bill: BillOccurrence, status: "PAID" | "UNPAID" | "SKIPPED") => Promise<void>;
  editBillAmount: (bill: BillOccurrence, amount: number, forever?: boolean) => Promise<void>;
  editBill: (
    bill: BillOccurrence,
    input: { name: string; amount: number; dueDay: number; category: ExpenseCategory; icon: string; forever?: boolean }
  ) => Promise<void>;
  completePendingExpense: (transaction: Transaction, input: { amount: number; category: ExpenseCategory; merchant?: string; notes?: string; scope?: TransactionScope }) => Promise<void>;
  deleteTransaction: (transaction: Transaction) => Promise<void>;
  deleteBill: (bill: BillOccurrence) => Promise<void>;
  recordSnap: (uri: string, scan?: { amount?: number; category?: ExpenseCategory; merchant?: string; notes?: string; aiScannedAt?: string }) => Promise<void>;
  saveReceiptScan: (transaction: Transaction, scan: { amount?: number; category?: ExpenseCategory; merchant?: string; notes?: string }) => Promise<void>;
  addVaultDocument: (input: { uri: string; name: string; mimeType?: string; title: string; category: import("../types").VaultCategory }) => Promise<void>;
  deleteVaultDocument: (document: VaultDocument) => Promise<void>;
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

function isLocalId(id: string) {
  return id.startsWith("local-") || id.startsWith("snap-");
}

function toOptionalNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function markOfflineMutation(set: (state: Partial<FinanceState>) => void) {
  set({ offline: true, loading: false });
}

function canUseHouse(family?: Family | null) {
  return Boolean(family?.subscription?.allowed);
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  bills: emptyBills,
  transactions: [],
  vaultDocuments: [],
  loading: false,
  authReady: false,
  offline: false,
  pendingSyncCount: 0,
  syncing: false,
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
      try {
        const { user } = await api.getCurrentAccount();
        set({ user, authReady: true, offline: false });
        await get().load();
      } catch {
        // Likely offline / cold backend: stay signed in using cached data instead of logging out.
        const cachedUser = await loadCache<User>("user");
        if (cachedUser) {
          set({ user: cachedUser, authReady: true, loading: false, offline: true });
          await get().load();
          return;
        }
        throw new Error("no-cache");
      }
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
    void clearCache("user");
    void clearCache(`bootstrap-${get().selectedMonth}`);
    void clearOfflineQueue();
    set({
      user: undefined,
      incomeCycle: undefined,
      bills: emptyBills,
      transactions: [],
      vaultDocuments: [],
      loading: false,
      offline: false,
      pendingSyncCount: 0,
      syncing: false,
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

    const month = get().selectedMonth;
    set({ loading: true });
    try {
      await get().processPendingSync();
      const data = await api.bootstrap(user.id, month);
      set({
        user: data.user,
        incomeCycle: data.incomeCycle,
        bills: data.bills,
        transactions: data.transactions,
        vaultDocuments: data.vaultDocuments,
        loading: false,
        offline: false,
        pendingSyncCount: (await loadOfflineQueue()).length
      });
      void saveCache("user", data.user);
      void saveCache(`bootstrap-${month}`, { incomeCycle: data.incomeCycle, bills: data.bills, transactions: data.transactions, vaultDocuments: data.vaultDocuments });
      void get().loadFamily();
    } catch {
      // Offline: fall back to the last cached data for this month if we have it.
      const cached = await loadCache<CachedBootstrap>(`bootstrap-${month}`);
      if (cached) {
        const pending = await loadOfflineQueue();
        set({
          incomeCycle: cached.incomeCycle,
          bills: cached.bills,
          transactions: cached.transactions,
          vaultDocuments: cached.vaultDocuments,
          loading: false,
          offline: true,
          pendingSyncCount: pending.length
        });
      } else {
        const pending = await loadOfflineQueue();
        set({ loading: false, offline: true, pendingSyncCount: pending.length });
      }
    }
  },

  processPendingSync: async () => {
    const user = get().user;
    if (!user || get().syncing) return;

    const queue = await loadOfflineQueue();
    if (queue.length === 0) {
      set({ pendingSyncCount: 0 });
      return;
    }

    set({ syncing: true, pendingSyncCount: queue.length });
    const remaining: OfflineQueueItem[] = [];

    for (const item of queue) {
      try {
        if (item.kind === "addTransaction") {
          await api.addTransaction({ userId: user.id, ...item.payload });
        } else if (item.kind === "updateTransaction") {
          await api.updateTransaction({ userId: user.id, ...item.payload });
        } else if (item.kind === "deleteTransaction") {
          await api.deleteTransaction({ userId: user.id, transactionId: item.payload.transactionId });
        } else if (item.kind === "uploadSnap") {
          await api.uploadSnapExpense({ userId: user.id, ...item.payload });
        } else if (item.kind === "addBill") {
          await api.addBillTemplate({ userId: user.id, ...item.payload });
        } else if (item.kind === "deleteBill") {
          await api.deleteBillTemplate({ userId: user.id, templateId: item.payload.templateId });
        } else if (item.kind === "saveIncomeSettings") {
          await api.updateIncomeSettings({ userId: user.id, ...item.payload });
        } else if (item.kind === "saveIncomeCycle") {
          await api.saveIncomeCycle({ userId: user.id, ...item.payload });
        } else if (item.kind === "addVaultDocument") {
          await api.uploadVaultDocument({ userId: user.id, ...item.payload });
        } else if (item.kind === "deleteVaultDocument") {
          await api.deleteVaultDocument({ userId: user.id, documentId: item.payload.documentId });
        }
      } catch {
        remaining.push(item);
      }
    }

    await saveOfflineQueue(remaining);
    set({ syncing: false, pendingSyncCount: remaining.length, offline: remaining.length > 0 });
  },

  addManualExpense: async (amount, category, scope = "PERSONAL", type = "EXPENSE") => {
    const user = requireUser(get().user);
    const isIncome = type === "INCOME";
    const resolvedScope: TransactionScope = !isIncome && scope === "HOUSE" && canUseHouse(get().family) ? "HOUSE" : "PERSONAL";
    const familyId = resolvedScope === "HOUSE" ? get().family?.id ?? null : null;
    const optimistic: Transaction = {
      id: `local-${Date.now()}`,
      amount,
      category: isIncome ? null : category,
      type,
      status: "CLEARED",
      source: "MANUAL",
      scope: isIncome ? "PERSONAL" : resolvedScope,
      familyId,
      occurredAt: new Date().toISOString(),
      attachments: []
    };

    set({ transactions: [optimistic, ...get().transactions] });
    try {
      await api.addTransaction({ userId: user.id, amount, category: isIncome ? undefined : category, type, scope: isIncome ? "PERSONAL" : resolvedScope, familyId });
      await get().load();
    } catch {
      const queue = await enqueueOfflineItem(makeQueueItem("addTransaction", { amount, category: isIncome ? undefined : category, type, scope: isIncome ? "PERSONAL" : resolvedScope, familyId }));
      set({ pendingSyncCount: queue.length });
      markOfflineMutation(set);
    }
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

    try {
      await api.updateIncomeSettings({ userId: user.id, ...input });
      await get().load();
    } catch {
      const queue = await enqueueOfflineItem(makeQueueItem("saveIncomeSettings", input));
      set({ pendingSyncCount: queue.length });
      markOfflineMutation(set);
    }
  },

  saveExpectedIncome: async (expected, actual, houseAllocation) => {
    const user = requireUser(get().user);
    const currentCycle = get().incomeCycle;
    set({
      incomeCycle: currentCycle
        ? { ...currentCycle, expected, actual: actual ?? currentCycle.actual, houseAllocation: houseAllocation ?? currentCycle.houseAllocation }
        : { id: "local-income", expected, actual, houseAllocation, cycleMonth: new Date().toISOString() }
    });

    try {
      await api.saveIncomeCycle({ userId: user.id, month: get().selectedMonth, expected, actual, houseAllocation });
      await get().load();
    } catch {
      const queue = await enqueueOfflineItem(makeQueueItem("saveIncomeCycle", { month: get().selectedMonth, expected, actual, houseAllocation }));
      set({ pendingSyncCount: queue.length });
      markOfflineMutation(set);
    }
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

  updateProfile: async (input) => {
    const user = requireUser(get().user);
    const nextUser = {
      ...user,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      phoneNumber: input.phoneNumber?.trim() || null,
      avatarUrl: input.avatarUrl?.trim() || null,
      householdRole: input.householdRole?.trim() || null
    };
    set({ user: nextUser });
    try {
      const saved = await api.updateProfile({
        userId: user.id,
        name: nextUser.name,
        email: nextUser.email,
        phoneNumber: nextUser.phoneNumber,
        avatarUrl: nextUser.avatarUrl,
        householdRole: nextUser.householdRole
      });
      set({ user: saved });
      void saveCache("user", saved);
    } catch (error) {
      set({ user });
      throw error;
    }
  },

  addBill: async (input) => {
    const user = requireUser(get().user);
    const resolvedScope: TransactionScope = input.scope === "HOUSE" && canUseHouse(get().family) ? "HOUSE" : "PERSONAL";
    const familyId = resolvedScope === "HOUSE" ? get().family?.id ?? null : null;
    const optimistic: BillOccurrence = {
      id: `local-bill-${Date.now()}`,
      amount: input.defaultAmount,
      dueDate: `${get().selectedMonth}-${String(input.dueDay).padStart(2, "0")}T00:00:00.000Z`,
      status: "UNPAID",
      paidAt: null,
      billTemplate: {
        id: `local-template-${Date.now()}`,
        name: input.name,
        category: input.category,
        defaultAmount: input.defaultAmount,
        dueDay: input.dueDay,
        icon: input.icon,
        autopay: input.autopay ?? false,
        scope: resolvedScope,
        familyId
      }
    };
    set({ bills: { ...get().bills, unpaid: [optimistic, ...get().bills.unpaid] } });
    try {
      await api.addBillTemplate({ userId: user.id, ...input, scope: resolvedScope, familyId });
      await get().load();
    } catch {
      const queue = await enqueueOfflineItem(makeQueueItem("addBill", { ...input, scope: resolvedScope, familyId }));
      set({ pendingSyncCount: queue.length });
      markOfflineMutation(set);
    }
  },

  markBill: async (bill, status) => {
    const user = requireUser(get().user);
    const withoutBill = {
      unpaid: get().bills.unpaid.filter((item) => item.id !== bill.id),
      settled: get().bills.settled.filter((item) => item.id !== bill.id)
    };
    const nextBill = { ...bill, status, paidAt: status === "PAID" ? new Date().toISOString() : null };
    const nextBills =
      status === "UNPAID"
        ? { unpaid: [nextBill, ...withoutBill.unpaid], settled: withoutBill.settled }
        : { unpaid: withoutBill.unpaid, settled: [nextBill, ...withoutBill.settled] };

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

  requestPasswordReset: async (input) => {
    set({ loading: true, authError: undefined });
    try {
      await api.requestPasswordReset({ email: input.email.trim() });
      set({ loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not send reset code.";
      set({ authError: message, loading: false });
      throw error;
    }
  },

  resetPassword: async (input) => {
    set({ loading: true, authError: undefined });
    try {
      const { user, token } = await api.resetPassword(input);
      await storeSession(token);
      set({ user, offline: false });
      await get().load();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not reset password.";
      set({ authError: message, loading: false });
      throw error;
    }
  },

  editBill: async (bill, input) => {
    const user = requireUser(get().user);
    const replace = (item: BillOccurrence) =>
      item.id === bill.id
        ? {
            ...item,
            amount: input.amount,
            billTemplate: {
              ...item.billTemplate,
              name: input.name,
              category: input.category,
              dueDay: input.dueDay,
              icon: input.icon,
              defaultAmount: input.forever ? input.amount : item.billTemplate.defaultAmount
            }
          }
        : item;
    set({ bills: { unpaid: get().bills.unpaid.map(replace), settled: get().bills.settled.map(replace) } });

    await api.updateBill(user.id, bill.id, { amount: input.amount });
    await api.updateBillTemplate(user.id, bill.billTemplate.id, {
      name: input.name,
      category: input.category,
      dueDay: input.dueDay,
      icon: input.icon,
      ...(input.forever ? { defaultAmount: input.amount } : {})
    });
    await get().load();
  },

  completePendingExpense: async (transaction, input) => {
    const user = requireUser(get().user);
    const scope: TransactionScope = input.scope === "HOUSE" && canUseHouse(get().family) ? "HOUSE" : "PERSONAL";
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
    if (isLocalId(transaction.id)) {
      const receiptUri = transaction.attachments.find((attachment) => attachment.mimeType?.startsWith("image"))?.url;
      if (receiptUri) {
        const existingQueue = await loadOfflineQueue();
        await saveOfflineQueue(existingQueue.filter((item) => item.kind !== "uploadSnap" || item.payload.uri !== receiptUri));
      }
      const queue = await enqueueOfflineItem(makeQueueItem("addTransaction", { amount: input.amount, category: input.category, type: "EXPENSE", scope, familyId }));
      set({ pendingSyncCount: queue.length });
      markOfflineMutation(set);
      return;
    }
    try {
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
    } catch {
      const queue = await enqueueOfflineItem(makeQueueItem("updateTransaction", { transactionId: transaction.id, amount: input.amount, category: input.category, merchant: input.merchant, notes: input.notes, scope, familyId }));
      set({ pendingSyncCount: queue.length });
      markOfflineMutation(set);
    }
  },

  deleteTransaction: async (transaction) => {
    const user = requireUser(get().user);
    set({ transactions: get().transactions.filter((item) => item.id !== transaction.id) });
    // Optimistic-only for not-yet-synced local records (no server id).
    if (!isLocalId(transaction.id)) {
      try {
        await api.deleteTransaction({ userId: user.id, transactionId: transaction.id });
        await get().load();
      } catch {
        const queue = await enqueueOfflineItem(makeQueueItem("deleteTransaction", { transactionId: transaction.id }));
        set({ pendingSyncCount: queue.length });
        markOfflineMutation(set);
      }
      return;
    }
    const receiptUri = transaction.attachments.find((attachment) => attachment.mimeType?.startsWith("image"))?.url;
    if (receiptUri) {
      const queue = await loadOfflineQueue();
      const next = queue.filter((item) => item.kind !== "uploadSnap" || item.payload.uri !== receiptUri);
      await saveOfflineQueue(next);
      set({ pendingSyncCount: next.length });
    }
    markOfflineMutation(set);
  },

  deleteBill: async (bill) => {
    const user = requireUser(get().user);
    set({
      bills: {
        unpaid: get().bills.unpaid.filter((item) => item.id !== bill.id),
        settled: get().bills.settled.filter((item) => item.id !== bill.id)
      }
    });
    if (isLocalId(bill.id) || isLocalId(bill.billTemplate.id)) {
      markOfflineMutation(set);
      return;
    }
    try {
      await api.deleteBillTemplate({ userId: user.id, templateId: bill.billTemplate.id });
      await get().load();
    } catch {
      const queue = await enqueueOfflineItem(makeQueueItem("deleteBill", { templateId: bill.billTemplate.id }));
      set({ pendingSyncCount: queue.length });
      markOfflineMutation(set);
    }
  },

  recordSnap: async (uri, scan) => {
    const user = requireUser(get().user);
    const optimistic: Transaction = {
      id: `snap-${Date.now()}`,
      amount: scan?.amount ?? null,
      category: scan?.category ?? null,
      merchant: scan?.merchant || "Pending receipt",
      notes: scan?.notes,
      aiScannedAt: scan?.aiScannedAt,
      status: "PENDING_DETAILS",
      source: "SNAP_SAVE",
      occurredAt: new Date().toISOString(),
      attachments: [{ id: `att-${Date.now()}`, url: uri, fileName: "receipt.jpg", mimeType: "image/jpeg" }]
    };

    set({ transactions: [optimistic, ...get().transactions] });
    try {
      await api.uploadSnapExpense({ userId: user.id, uri, ...scan });
      await get().load();
    } catch {
      const queue = await enqueueOfflineItem(makeQueueItem("uploadSnap", { uri, ...scan }));
      set({ pendingSyncCount: queue.length });
      markOfflineMutation(set);
    }
  },

  saveReceiptScan: async (transaction, scan) => {
    const user = requireUser(get().user);
    const nextScan = {
      amount: scan.amount ?? toOptionalNumber(transaction.amount),
      category: scan.category ?? transaction.category ?? undefined,
      merchant: scan.merchant ?? transaction.merchant ?? undefined,
      notes: scan.notes ?? transaction.notes ?? undefined
    };
    const aiScannedAt = new Date().toISOString();
    const replace = (item: Transaction) =>
      item.id === transaction.id
        ? {
            ...item,
            amount: nextScan.amount ?? item.amount,
            category: nextScan.category ?? item.category,
            merchant: nextScan.merchant ?? item.merchant,
            notes: nextScan.notes ?? item.notes,
            aiScannedAt
          }
        : item;

    set({ transactions: get().transactions.map(replace) });

    if (isLocalId(transaction.id)) return;

    try {
      await api.updateTransaction({ userId: user.id, transactionId: transaction.id, ...nextScan, status: "PENDING_DETAILS", aiScannedAt });
    } catch {
      const queue = await enqueueOfflineItem(makeQueueItem("updateTransaction", { transactionId: transaction.id, ...nextScan, status: "PENDING_DETAILS", aiScannedAt }));
      set({ pendingSyncCount: queue.length });
      markOfflineMutation(set);
    }
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
    try {
      await api.uploadVaultDocument({ userId: user.id, ...input });
      await get().load();
    } catch {
      const queue = await enqueueOfflineItem(makeQueueItem("addVaultDocument", input));
      set({ pendingSyncCount: queue.length });
      markOfflineMutation(set);
    }
  },

  deleteVaultDocument: async (document) => {
    const user = requireUser(get().user);
    set({ vaultDocuments: get().vaultDocuments.filter((item) => item.id !== document.id) });
    if (isLocalId(document.id)) {
      markOfflineMutation(set);
      return;
    }
    try {
      await api.deleteVaultDocument({ userId: user.id, documentId: document.id });
      await get().load();
    } catch {
      const queue = await enqueueOfflineItem(makeQueueItem("deleteVaultDocument", { documentId: document.id }));
      set({ pendingSyncCount: queue.length });
      markOfflineMutation(set);
    }
  },

  refreshVault: async () => {
    await get().load();
  }
}));
