import { API_URL } from "../config";
import type { BootstrapPayload, ExpenseCategory, Family, FamilyInvite, HouseData, SubscriptionInfo, SubscriptionPlanId, Transaction, TransactionScope, TransactionType, User, VaultCategory, VaultDocument } from "../types";
import { currentMonthKey } from "../utils/money";

let authToken: string | undefined;

export function setAuthToken(token?: string) {
  authToken = token;
}

type AuthPayload = {
  user: User;
  token: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const body = await response.text();
    try {
      const parsed = JSON.parse(body) as { error?: string };
      throw new Error(parsed.error || `Request failed: ${response.status}`);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(body || `Request failed: ${response.status}`);
      }
      throw error;
    }
  }

  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function registerAccount(input: { name: string; email: string; password: string }) {
  return request<AuthPayload>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function loginAccount(input: { email: string; password: string }) {
  return request<AuthPayload>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function loginDemoAccount() {
  return request<AuthPayload>("/auth/demo", { method: "POST" });
}

export async function requestPasswordReset(input: { email: string }) {
  return request<{ ok: boolean }>("/auth/request-password-reset", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function resetPassword(input: { email: string; code: string; newPassword: string }) {
  return request<AuthPayload>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function getCurrentAccount() {
  return request<{ user: User }>("/auth/me");
}

export async function bootstrap(userId: string, month = currentMonthKey()) {
  return request<BootstrapPayload>(`/bootstrap/${userId}?month=${month}`);
}

export async function addTransaction(input: {
  userId: string;
  amount: number;
  category?: ExpenseCategory;
  merchant?: string;
  notes?: string;
  type?: TransactionType;
  scope?: TransactionScope;
  familyId?: string | null;
}) {
  return request(`/transactions/${input.userId}`, {
    method: "POST",
    body: JSON.stringify({
      amount: input.amount,
      category: input.category,
      merchant: input.merchant,
      notes: input.notes,
      type: input.type,
      scope: input.scope,
      familyId: input.familyId
    })
  });
}

export async function updateTransaction(input: {
  userId: string;
  transactionId: string;
  amount?: number;
  category?: ExpenseCategory;
  merchant?: string;
  notes?: string;
  status?: "CLEARED" | "PENDING_DETAILS";
  aiScannedAt?: string | null;
  scope?: TransactionScope;
  familyId?: string | null;
}) {
  return request<Transaction>(`/transactions/${input.userId}/${input.transactionId}`, {
    method: "PATCH",
    body: JSON.stringify({
      amount: input.amount,
      category: input.category,
      merchant: input.merchant,
      notes: input.notes,
      status: input.status,
      aiScannedAt: input.aiScannedAt,
      scope: input.scope,
      familyId: input.familyId
    })
  });
}

export async function deleteTransaction(input: { userId: string; transactionId: string }) {
  await request<void>(`/transactions/${input.userId}/${input.transactionId}`, { method: "DELETE" });
}

export async function deleteBillTemplate(input: { userId: string; templateId: string }) {
  await request<void>(`/bills/${input.userId}/templates/${input.templateId}`, { method: "DELETE" });
}

export async function updateIncomeSettings(input: {
  userId: string;
  defaultMonthlyIncome: number;
  paydayDay: number;
  variableIncomeEnabled: boolean;
}) {
  return request<User>(`/income/${input.userId}/settings`, {
    method: "PUT",
    body: JSON.stringify({
      defaultMonthlyIncome: input.defaultMonthlyIncome,
      paydayDay: input.paydayDay,
      variableIncomeEnabled: input.variableIncomeEnabled
    })
  });
}

export async function saveIncomeCycle(input: { userId: string; month: string; expected: number; actual?: number; houseAllocation?: number }) {
  return request(`/income/${input.userId}/cycles`, {
    method: "POST",
    body: JSON.stringify({
      month: input.month,
      expected: input.expected,
      actual: input.actual,
      houseAllocation: input.houseAllocation,
      sourceType: "VARIABLE_EXPECTED"
    })
  });
}

// --- Family ---
export async function getMyFamily() {
  return request<{ family: Family | null; invites: FamilyInvite[] }>("/families/me");
}

export async function createFamily(name: string) {
  return request<{ family: Family }>("/families", { method: "POST", body: JSON.stringify({ name }) });
}

export async function inviteFamilyMember(familyId: string, userId: string) {
  return request(`/families/${familyId}/invite`, { method: "POST", body: JSON.stringify({ userId }) });
}

export async function getSubscription() {
  return request<{ subscription: SubscriptionInfo }>("/subscriptions/me");
}

export async function checkoutSubscription(input: { plan: SubscriptionPlanId }) {
  return request<{ subscription: SubscriptionInfo }>("/subscriptions/checkout", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function acceptFamilyInvite(memberId: string) {
  return request(`/families/invites/${memberId}/accept`, { method: "POST" });
}

export async function declineFamilyInvite(memberId: string) {
  await request<void>(`/families/invites/${memberId}/decline`, { method: "POST" });
}

export async function leaveFamily(familyId: string, memberUserId: string) {
  await request<void>(`/families/${familyId}/members/${memberUserId}`, { method: "DELETE" });
}

export async function deleteFamily(familyId: string) {
  await request<void>(`/families/${familyId}`, { method: "DELETE" });
}

export async function getHouse(month: string) {
  return request<HouseData>(`/families/house?month=${month}`);
}

export async function changePassword(input: { userId: string; currentPassword: string; newPassword: string }) {
  return request<{ ok: boolean }>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function deleteAccount(input: { userId: string }) {
  await request<void>(`/users/${input.userId}`, { method: "DELETE" });
}

export async function updateProfile(input: { userId: string; name: string; email: string; phoneNumber?: string | null; avatarUrl?: string | null; householdRole?: string | null }) {
  return request<User>(`/users/${input.userId}`, {
    method: "PATCH",
    body: JSON.stringify({ name: input.name, email: input.email, phoneNumber: input.phoneNumber, avatarUrl: input.avatarUrl, householdRole: input.householdRole })
  });
}

export async function scanReceiptRemote(userId: string, image: string) {
  return request<{ amount?: number; merchant?: string; category?: ExpenseCategory; items?: string }>(`/ai/scan/${userId}`, {
    method: "POST",
    body: JSON.stringify({ image })
  });
}

export async function addBillTemplate(input: {
  userId: string;
  name: string;
  defaultAmount: number;
  dueDay: number;
  category: ExpenseCategory;
  icon: string;
  autopay?: boolean;
  scope?: TransactionScope;
  familyId?: string | null;
}) {
  return request(`/bills/${input.userId}/templates`, {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      defaultAmount: input.defaultAmount,
      dueDay: input.dueDay,
      category: input.category,
      icon: input.icon,
      autopay: input.autopay ?? false,
      scope: input.scope,
      familyId: input.familyId
    })
  });
}

export async function updateBillTemplate(
  userId: string,
  templateId: string,
  input: {
    name?: string;
    defaultAmount?: number;
    dueDay?: number;
    category?: ExpenseCategory;
    icon?: string;
    autopay?: boolean;
    scope?: TransactionScope;
    familyId?: string | null;
    active?: boolean;
  }
) {
  return request(`/bills/${userId}/templates/${templateId}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export async function updateBill(userId: string, occurrenceId: string, input: { amount?: number; status?: "PAID" | "UNPAID" | "SKIPPED" }) {
  return request(`/bills/${userId}/occurrences/${occurrenceId}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

async function uploadForm<T>(path: string, form: FormData): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
    body: form
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Upload failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function uploadSnapExpense(params: { userId: string; uri: string; amount?: number; category?: ExpenseCategory; merchant?: string; notes?: string; aiScannedAt?: string }) {
  const form = new FormData();
  form.append("pending", "true");
  if (params.amount !== undefined) form.append("amount", String(params.amount));
  if (params.category) form.append("category", params.category);
  if (params.merchant) form.append("merchant", params.merchant);
  if (params.notes) form.append("notes", params.notes);
  if (params.aiScannedAt) form.append("aiScannedAt", params.aiScannedAt);
  form.append("file", {
    uri: params.uri,
    name: `receipt-${Date.now()}.jpg`,
    type: "image/jpeg"
  } as unknown as Blob);

  return uploadForm(`/uploads/transaction/${params.userId}`, form);
}

export async function uploadVaultDocument(params: {
  userId: string;
  uri: string;
  name: string;
  mimeType?: string;
  title: string;
  category: VaultCategory;
}) {
  const form = new FormData();
  form.append("title", params.title);
  form.append("category", params.category);
  form.append("file", {
    uri: params.uri,
    name: params.name,
    type: params.mimeType ?? "application/octet-stream"
  } as unknown as Blob);

  return uploadForm<{ document: VaultDocument }>(`/uploads/vault/${params.userId}`, form);
}

export async function deleteVaultDocument(input: { userId: string; documentId: string }) {
  await request<void>(`/vault/${input.userId}/${input.documentId}`, { method: "DELETE" });
}
