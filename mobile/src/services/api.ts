import { API_URL, DEMO_USER_EMAIL } from "../config";
import type { BootstrapPayload, ExpenseCategory, Transaction, User, VaultCategory, VaultDocument } from "../types";
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

export async function getCurrentAccount() {
  return request<{ user: User }>("/auth/me");
}

export async function getDemoUser() {
  return request<{ id: string }>(`/users/demo`);
}

export async function bootstrap(userId: string, month = currentMonthKey()) {
  return request<BootstrapPayload>(`/bootstrap/${userId}?month=${month}`);
}

export async function createDemoUser() {
  return request<{ id: string }>("/users", {
    method: "POST",
    body: JSON.stringify({
      email: DEMO_USER_EMAIL,
      name: "Demo User",
      defaultMonthlyIncome: 4200,
      paydayDay: 1,
      variableIncomeEnabled: true
    })
  });
}

export async function addTransaction(input: {
  userId: string;
  amount: number;
  category: ExpenseCategory;
  merchant?: string;
  notes?: string;
}) {
  return request(`/transactions/${input.userId}`, {
    method: "POST",
    body: JSON.stringify({
      amount: input.amount,
      category: input.category,
      merchant: input.merchant,
      notes: input.notes
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
}) {
  return request<Transaction>(`/transactions/${input.userId}/${input.transactionId}`, {
    method: "PATCH",
    body: JSON.stringify({
      amount: input.amount,
      category: input.category,
      merchant: input.merchant,
      notes: input.notes,
      status: input.status
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

export async function saveIncomeCycle(input: { userId: string; month: string; expected: number; actual?: number }) {
  return request(`/income/${input.userId}/cycles`, {
    method: "POST",
    body: JSON.stringify({
      month: input.month,
      expected: input.expected,
      actual: input.actual,
      sourceType: "VARIABLE_EXPECTED"
    })
  });
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

export async function scanReceiptRemote(userId: string, image: string) {
  return request<{ amount?: number; merchant?: string; category?: ExpenseCategory }>(`/ai/scan/${userId}`, {
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
}) {
  return request(`/bills/${input.userId}/templates`, {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      defaultAmount: input.defaultAmount,
      dueDay: input.dueDay,
      category: input.category,
      icon: input.icon,
      autopay: input.autopay ?? false
    })
  });
}

export async function updateBillTemplate(userId: string, templateId: string, input: { defaultAmount?: number }) {
  return request(`/bills/${userId}/templates/${templateId}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export async function updateBill(userId: string, occurrenceId: string, input: { amount?: number; status?: "PAID" | "UNPAID" }) {
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

export async function uploadSnapExpense(params: { userId: string; uri: string }) {
  const form = new FormData();
  form.append("pending", "true");
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
