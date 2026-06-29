import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().default("development-only-change-me"),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default("finance-vault"),
  CORS_ORIGIN: z.string().default("*"),
  // Groq (groq.com) — single app-wide key for AI receipt scanning. Optional: if unset,
  // the /ai/scan endpoint returns 501 and the app falls back to manual entry.
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default("meta-llama/llama-4-scout-17b-16e-instruct")
});

export const env = envSchema.parse(process.env);
