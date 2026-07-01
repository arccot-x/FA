import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  // No insecure fallback: a missing secret must fail startup, not silently sign
  // tokens with a value anyone can read in this repo's source history.
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters."),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default("finance-vault"),
  // Comma-separated list of allowed origins, or "*" to allow any (fine here since
  // this API is called by a native mobile client with Bearer-token auth, not
  // browser cookies — CORS mainly matters for cookie-based sessions).
  CORS_ORIGIN: z.string().default("*"),
  // Groq (groq.com) — single app-wide key for AI receipt scanning. Optional: if unset,
  // the /ai/scan endpoint returns 501 and the app falls back to manual entry.
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default("meta-llama/llama-4-scout-17b-16e-instruct"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("Frictionless Finance <onboarding@resend.dev>")
});

export const env = envSchema.parse(process.env);

if (env.NODE_ENV === "production" && env.CORS_ORIGIN === "*") {
  // eslint-disable-next-line no-console
  console.warn(
    "[env] CORS_ORIGIN is \"*\" in production. That's fine for a Bearer-token-only mobile client, " +
      "but if a browser-based client is ever added, set this to an explicit comma-separated origin list."
  );
}
