export type ExpenseCategory =
  | "GROCERIES"
  | "DINING"
  | "GAS"
  | "TRANSPORT"
  | "SHOPPING"
  | "ENTERTAINMENT"
  | "HEALTH"
  | "HOME"
  | "UTILITIES"
  | "TRAVEL"
  | "SUBSCRIPTION"
  | "OTHER";

export type VaultCategory =
  | "LEASE"
  | "TAX"
  | "INSURANCE"
  | "RECEIPT"
  | "BANKING"
  | "MEDICAL"
  | "WARRANTY"
  | "OTHER";

export type User = {
  id: string;
  email: string;
  name: string;
  defaultMonthlyIncome: string | number;
  paydayDay: number;
  variableIncomeEnabled: boolean;
};

export type IncomeCycle = {
  id: string;
  expected: string | number;
  actual?: string | number | null;
  cycleMonth: string;
};

export type BillOccurrence = {
  id: string;
  amount: string | number;
  dueDate: string;
  status: "UNPAID" | "PAID" | "SKIPPED";
  paidAt?: string | null;
  billTemplate: {
    id: string;
    name: string;
    category: ExpenseCategory;
    icon: string;
    autopay: boolean;
  };
};

export type Attachment = {
  id: string;
  url: string;
  fileName: string;
  mimeType: string;
};

export type Transaction = {
  id: string;
  amount?: string | number | null;
  category?: ExpenseCategory | null;
  merchant?: string | null;
  notes?: string | null;
  status: "CLEARED" | "PENDING_DETAILS";
  source: "MANUAL" | "SNAP_SAVE" | "IMPORT";
  occurredAt: string;
  attachments: Attachment[];
};

export type VaultDocument = {
  id: string;
  title: string;
  category: VaultCategory;
  fileName: string;
  mimeType: string;
  url: string;
  createdAt: string;
};

export type BootstrapPayload = {
  user: User;
  incomeCycle: IncomeCycle | null;
  bills: {
    unpaid: BillOccurrence[];
    settled: BillOccurrence[];
  };
  transactions: Transaction[];
  vaultDocuments: VaultDocument[];
};

