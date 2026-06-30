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
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  householdRole?: string | null;
  defaultMonthlyIncome: string | number;
  paydayDay: number;
  variableIncomeEnabled: boolean;
};

export type IncomeCycle = {
  id: string;
  expected: string | number;
  actual?: string | number | null;
  houseAllocation?: string | number | null;
  cycleMonth: string;
};

export type TransactionScope = "PERSONAL" | "HOUSE";

export type FamilyRole = "OWNER" | "MEMBER";

export type FamilyMemberInfo = {
  userId: string;
  role: FamilyRole;
  status: "PENDING" | "ACTIVE";
  name: string;
  email: string;
};

export type Family = {
  id: string;
  name: string;
  ownerId: string;
  role: FamilyRole;
  members: FamilyMemberInfo[];
  subscription?: {
    allowed: boolean;
    memberLimit: number;
    reason?: string | null;
  };
};

export type FamilyInvite = {
  memberId: string;
  familyId: string;
  familyName: string;
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
    defaultAmount?: string | number;
    dueDay: number;
    icon: string;
    autopay: boolean;
    scope?: TransactionScope;
    familyId?: string | null;
  };
};

export type Attachment = {
  id: string;
  url: string;
  fileName: string;
  mimeType: string;
};

export type TransactionType = "EXPENSE" | "INCOME" | "TRANSFER";

export type Transaction = {
  id: string;
  amount?: string | number | null;
  category?: ExpenseCategory | null;
  merchant?: string | null;
  notes?: string | null;
  aiScannedAt?: string | null;
  type?: TransactionType;
  status: "CLEARED" | "PENDING_DETAILS";
  source: "MANUAL" | "SNAP_SAVE" | "IMPORT";
  scope?: TransactionScope;
  familyId?: string | null;
  occurredAt: string;
  attachments: Attachment[];
  spenderName?: string;
};

export type HouseData = {
  pool: number;
  spent: number;
  billsDue: number;
  balance: number;
  transactions: Transaction[];
  locked?: boolean;
  lockedReason?: string | null;
};

export type SubscriptionPlanId = "INDIVIDUAL" | "FAMILY_3" | "FAMILY_6";

export type SubscriptionInfo = {
  plan: SubscriptionPlanId;
  active: boolean;
  billingName?: string | null;
  billingEmail?: string | null;
  cardLast4?: string | null;
  price: number;
  memberLimit: number;
  family: boolean;
  updatedAt?: string | null;
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

