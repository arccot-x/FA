import * as FileSystem from "expo-file-system";
import type { ExpenseCategory } from "../types";

const XAI_ENDPOINT = "https://api.x.ai/v1/chat/completions";
const DEFAULT_MODEL = "grok-2-vision-1212";

const CATEGORIES: ExpenseCategory[] = [
  "GROCERIES",
  "DINING",
  "GAS",
  "TRANSPORT",
  "SHOPPING",
  "ENTERTAINMENT",
  "HEALTH",
  "HOME",
  "UTILITIES",
  "TRAVEL",
  "SUBSCRIPTION",
  "OTHER"
];

export type ReceiptScan = {
  amount?: number;
  merchant?: string;
  category?: ExpenseCategory;
};

function guessMimeType(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".heic")) return "image/heic";
  return "image/jpeg";
}

function extractJson(content: string): unknown {
  // Grok may wrap JSON in prose or a ```json fence — pull out the first object.
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : content;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * Sends a receipt photo to xAI Grok (vision) and extracts amount / merchant / category.
 * Throws on network or auth errors so the caller can surface a message.
 */
export async function scanReceipt(uri: string, apiKey: string, model = DEFAULT_MODEL): Promise<ReceiptScan> {
  // Remote (already-uploaded) receipts must be downloaded before we can base64-encode them.
  let localUri = uri;
  if (/^https?:\/\//i.test(uri)) {
    const target = `${FileSystem.cacheDirectory}scan-${Date.now()}.jpg`;
    const downloaded = await FileSystem.downloadAsync(uri, target);
    localUri = downloaded.uri;
  }

  const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
  const dataUrl = `data:${guessMimeType(localUri)};base64,${base64}`;

  const response = await fetch(XAI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "You read receipts. Reply with ONLY a JSON object: " +
            '{"amount": number (total paid), "merchant": string, "category": one of ' +
            `${CATEGORIES.join(", ")}}. Use OTHER if unsure. No prose.`
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract the total amount, merchant name, and category from this receipt." },
            { type: "image_url", image_url: { url: dataUrl } }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Scan failed: ${response.status}`);
  }

  const json = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content ?? "";
  const parsed = extractJson(content) as { amount?: unknown; merchant?: unknown; category?: unknown } | null;
  if (!parsed) return {};

  const amount = typeof parsed.amount === "number" ? parsed.amount : Number(parsed.amount);
  const category = typeof parsed.category === "string" && CATEGORIES.includes(parsed.category as ExpenseCategory) ? (parsed.category as ExpenseCategory) : undefined;

  return {
    amount: Number.isFinite(amount) && amount > 0 ? amount : undefined,
    merchant: typeof parsed.merchant === "string" && parsed.merchant.trim() ? parsed.merchant.trim() : undefined,
    category
  };
}
