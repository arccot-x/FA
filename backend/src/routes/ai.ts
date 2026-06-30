import { Router } from "express";
import { z } from "zod";
import { env } from "../lib/env";
import { asyncHandler } from "../utils/asyncHandler";
import { requireUserAccess } from "../utils/requireUserAccess";

export const aiRouter = Router();

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

const CATEGORIES = [
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
] as const;

const scanSchema = z.object({
  // A data URL (data:image/jpeg;base64,...) or a public image URL.
  image: z.string().min(1)
});

function extractJson(content: string): Record<string, unknown> | null {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : content;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

aiRouter.post(
  "/scan/:userId",
  asyncHandler(async (req, res) => {
    requireUserAccess(req, req.params.userId);

    if (!env.GROQ_API_KEY) {
      res.status(501).json({ error: "AI scanning is not configured." });
      return;
    }

    const { image } = scanSchema.parse(req.body);

    const groqResponse = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: env.GROQ_MODEL,
        temperature: 0,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  "Read this receipt and reply with ONLY a JSON object: " +
                  '{"amount": number (grand total paid), "merchant": string (store/business name), ' +
                  '"category": one of ' +
                  `${CATEGORIES.join(", ")} (pick the best fit for what was bought; use OTHER only if truly unclear), ` +
                  '"items": string (a short comma-separated list of the main items/products visible on the receipt)}. ' +
                  "No prose, no code fences."
              },
              { type: "image_url", image_url: { url: image } }
            ]
          }
        ]
      })
    });

    if (!groqResponse.ok) {
      const body = await groqResponse.text();
      throw new Error(`Groq request failed (${groqResponse.status}): ${body.slice(0, 300)}`);
    }

    const data = (await groqResponse.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content ?? "";
    const parsed = extractJson(content);

    if (!parsed) {
      res.json({});
      return;
    }

    const amountValue = typeof parsed.amount === "number" ? parsed.amount : Number(parsed.amount);
    const category = typeof parsed.category === "string" && (CATEGORIES as readonly string[]).includes(parsed.category) ? parsed.category : undefined;

    res.json({
      amount: Number.isFinite(amountValue) && amountValue > 0 ? amountValue : undefined,
      merchant: typeof parsed.merchant === "string" && parsed.merchant.trim() ? parsed.merchant.trim() : undefined,
      category,
      items: typeof parsed.items === "string" && parsed.items.trim() ? parsed.items.trim() : undefined
    });
  })
);
