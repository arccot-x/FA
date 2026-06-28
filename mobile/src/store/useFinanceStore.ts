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
  offline: boolean;
  load: () => Promise<void>;
  addManualExpense: (amount: number, category: ExpenseCategory) => Promise<void>;
  saveIncomeSettings: (input: { defaultMonthlyIncome: number; paydayDay: number; variableIncomeEnabled: boolean }) => Promise<void>;
  saveExpectedIncome: (expected: number) => Promise<void>;
  addBill: (input: { name: string; defaultAmount: number; dueDay: number; category: ExpenseCategory; icon: string; autopay?: boolean }) => Promise<void>;
  markBill: (bill: BillOccurrence, status: "PAID" | "UNPAID") => Promise<void>;
  editBillAmount: (bill: BillOccurrence, amount: number) => Promise<void>;
  completePendingExpense: (transaction: Transaction, input: { amount: number; category: ExpenseCategory; merchant?: string; notes?: string }) => Promise<void>;
  recordSnap: (uri: string) => Promise<void>;
  addVaultDocument: (input: { uri: string; name: string; mimeType?: string; title: string; category: import("../types").VaultCategory }) => Promise<void>;
  refreshVault: () => Promise<void>;
};

const fallbackUser: User = {
  id: "offline-demo",
  email: "demo@frictionless.finance",
  name: "Demo User",
  defaultMonthlyIncome: 4200,
  paydayDay: 1,
  variableIncomeEnabled: true
};

const fallbackBills: BillsState = {
  unpaid: [
    {
      id: "rent",
      amount: 1600,
      dueDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
      status: "UNPAID",
      billTemplate: { id: "rent-template", name: "Rent", category: "HOME", icon: "home-city", autopay: false }
    },
    {
      id: "insurance",
      amount: 148,
      dueDate: new Date(new Date().getFullYear(), new Date().getMonth(), 18).toISOString(),
      status: "UNPAID",
      billTemplate: { id: "insurance-template", name: "Car Insurance", category: "TRANSPORT", icon: "car", autopay: false }
    }
  ],
  settled: [
    {
      id: "netflix",
      amount: 15,
      dueDate: new Date(new Date().getFullYear(), new Date().getMonth(), 12).toISOString(),
      status: "PAID",
      paidAt: new Date().toISOString(),
      billTemplate: { id: "netflix-template", name: "Netflix", category: "SUBSCRIPTION", icon: "television-classic", autopay: true }
    }
  ]
};

const fallbackTransactions: Transaction[] = [
  {
    id: "groceries",
    amount: 86,
    category: "GROCERIES",
    merchant: "Market",
    status: "CLEARED",
    source: "MANUAL",
    occurredAt: new Date().toISOString(),
    attachments: []
  },
  {
    id: "pending",
    amount: null,
    category: null,
    merchant: "Pending receipt",
    status: "PENDING_DETAILS",
    source: "SNAP_SAVE",
    occurredAt: new Date().toISOString(),
    attachments: []
  }
];

export const useFinanceStore = create<FinanceState>((set, get) => ({
  bills: { unpaid: [], settled: [] },
  transactions: [],
  vaultDocuments: [],
  loading: false,
  offline: false,

  load: async () => {
    set({ loading: true });
    try {
      let user = await api.getDemoUser();
      if (!user?.id) {
        user = await api.createDemoUser();
      }

      const data = await api.bootstrap(user.id, currentMonthKey());
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
      set({
        user: fallbackUser,
        incomeCycle: { id: "offline-income", expected: 4200, cycleMonth: new Date().toISOString() },
        bills: fallbackBills,
        transactions: fallbackTransactions,
        vaultDocuments: [],
        loading: false,
        offline: true
      });
    }
  },

  addManualExpense: async (amount, category) => {
    const user = get().user ?? fallbackUser;
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
    if (!get().offline) {
      await api.addTransaction({ userId: user.id, amount, category });
      await get().load();
    }
  },

  saveIncomeSettings: async (input) => {
    const user = get().user ?? fallbackUser;
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

    if (!get().offline) {
      await api.updateIncomeSettings({ userId: user.id, ...input });
      await get().load();
    }
  },

  saveExpectedIncome: async (expected) => {
    const user = get().user ?? fallbackUser;
    const currentCycle = get().incomeCycle;
    set({
      incomeCycle: currentCycle
        ? { ...currentCycle, expected }
        : { id: "local-income", expected, cycleMonth: new Date().toISOString() }
    });

    if (!get().offline) {
      await api.saveIncomeCycle({ userId: user.id, month: currentMonthKey(), expected });
      await get().load();
    }
  },

  addBill: async (input) => {
    const user = get().user ?? fallbackUser;
    if (!get().offline) {
      await api.addBillTemplate({ userId: user.id, ...input });
      await get().load();
      return;
    }

    const dueDate = new Date(new Date().getFullYear(), new Date().getMonth(), input.dueDay).toISOString();
    const localBill: BillOccurrence = {
      id: `local-bill-${Date.now()}`,
      amount: input.defaultAmount,
      dueDate,
      status: "UNPAID",
      billTemplate: {
        id: `local-template-${Date.now()}`,
        name: input.name,
        category: input.category,
        icon: input.icon,
        autopay: input.autopay ?? false
      }
    };

    set({
      bills: {
        ...get().bills,
        unpaid: [
          ...get().bills.unpaid,
          localBill
        ].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      }
    });
  },

  markBill: async (bill, status) => {
    const user = get().user ?? fallbackUser;
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
    if (!get().offline) {
      await api.updateBill(user.id, bill.id, { status });
      await get().load();
    }
  },

  editBillAmount: async (bill, amount) => {
    const user = get().user ?? fallbackUser;
    const replace = (item: BillOccurrence) => (item.id === bill.id ? { ...item, amount } : item);
    set({ bills: { unpaid: get().bills.unpaid.map(replace), settled: get().bills.settled.map(replace) } });
    if (!get().offline) {
      await api.updateBill(user.id, bill.id, { amount });
      await get().load();
    }
  },

  completePendingExpense: async (transaction, input) => {
    const user = get().user ?? fallbackUser;
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
    if (!get().offline) {
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
    }
  },

  recordSnap: async (uri) => {
    const user = get().user ?? fallbackUser;
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
    if (!get().offline) {
      await api.uploadSnapExpense({ userId: user.id, uri });
      await get().load();
    }
  },

  addVaultDocument: async (input) => {
    const user = get().user ?? fallbackUser;
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
    if (!get().offline) {
      await api.uploadVaultDocument({ userId: user.id, ...input });
      await get().load();
    }
  },

  refreshVault: async () => {
    await get().load();
  }
}));
