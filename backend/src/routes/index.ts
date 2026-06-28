import { Router } from "express";
import { authRouter } from "./auth";
import { billsRouter } from "./bills";
import { bootstrapRouter } from "./bootstrap";
import { incomeRouter } from "./income";
import { transactionsRouter } from "./transactions";
import { uploadsRouter } from "./uploads";
import { usersRouter } from "./users";
import { vaultRouter } from "./vault";

export const router = Router();

router.use("/auth", authRouter);
router.use("/bootstrap", bootstrapRouter);
router.use("/users", usersRouter);
router.use("/income", incomeRouter);
router.use("/bills", billsRouter);
router.use("/transactions", transactionsRouter);
router.use("/uploads", uploadsRouter);
router.use("/vault", vaultRouter);
