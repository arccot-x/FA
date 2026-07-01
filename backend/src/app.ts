import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { ZodError } from "zod";
import { env } from "./lib/env";
import { router } from "./routes";

export const app = express();

const corsOrigins = env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(",").map((origin) => origin.trim());

app.use(helmet());
app.use(cors({ origin: corsOrigins }));
app.use(express.json({ limit: "12mb" }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

// Broad guardrail against abuse/scraping across the whole API. Auth routes get a
// tighter, dedicated limit applied where they're mounted (see routes/index.ts) since
// they're the ones an attacker would use to brute-force logins or reset codes.
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false });

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "frictionless-finance-api" });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api", apiLimiter, router);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // Plain `Error`s and ZodErrors thrown across the route handlers are always
  // deliberately written as safe, user-facing messages. Anything else (Prisma
  // errors, unexpected TypeErrors, etc.) may contain internal details, so it's
  // logged server-side but never echoed back to the client, especially in prod.
  if (error instanceof ZodError) {
    const message = error.errors[0]?.message ?? "Invalid request.";
    res.status(400).json({ error: message });
    return;
  }

  const isPlainAppError = error instanceof Error && error.constructor === Error;
  if (!isPlainAppError) {
    // eslint-disable-next-line no-console
    console.error(error);
    res.status(500).json({ error: "Unexpected server error." });
    return;
  }

  const status = error.message.includes("not found") ? 404 : 400;
  res.status(status).json({ error: error.message });
});
