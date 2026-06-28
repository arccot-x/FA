import { API_URL, DEMO_USER_EMAIL } from "../config";
import type { BootstrapPayload, ExpenseCategory, VaultCategory } from "../types";
import { currentMonthKey } from "../utils/money";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
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

export async function updateBill(userId: string, occurrenceId: string, input: { amount?: number; status?: "PAID" | "UNPAID" }) {
  return request(`/bills/${userId}/occurrences/${occurrenceId}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

async function uploadForm<T>(path: string, form: FormData): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
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

  return uploadForm(`/uploads/vault/${params.userId}`, form);
}

