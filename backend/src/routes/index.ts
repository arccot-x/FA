import { Router } from "express";
import rateLimit from "express-rate-limit";
import { aiRouter } from "./ai";
import { authRouter } from "./auth";
import { billsRouter } from "./bills";
import { familiesRouter } from "./families";
import { bootstrapRouter } from "./bootstrap";
import { incomeRouter } from "./income";
import { transactionsRouter } from "./transactions";
import { subscriptionsRouter } from "./subscriptions";
import { uploadsRouter } from "./uploads";
import { usersRouter } from "./users";
import { vaultRouter } from "./vault";

export const router = Router();

// Auth routes (login, register, password reset) are the ones an attacker would use
// to brute-force credentials or the 6-digit reset code, so they get a much tighter
// per-IP limit than the general API limiter applied in app.ts.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

router.use("/auth", authLimiter, authRouter);
router.use("/ai", aiRouter);
router.use("/families", familiesRouter);
router.use("/bootstrap", bootstrapRouter);
router.use("/users", usersRouter);
router.use("/income", incomeRouter);
router.use("/bills", billsRouter);
router.use("/transactions", transactionsRouter);
router.use("/subscriptions", subscriptionsRouter);
router.use("/uploads", uploadsRouter);
router.use("/vault", vaultRouter);
