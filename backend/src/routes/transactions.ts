import { ExpenseCategory, TransactionSource, TransactionStatus, TransactionType } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";

export const transactionsRouter = Router();

transactionsRouter.get(
  "/:userId",
  asyncHandler(async (req, res) => {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.params.userId },
      include: { attachments: true },
      orderBy: { occurredAt: "desc" },
      take: Number(req.query.limit ?? 50)
    });

    res.json(transactions);
  })
);

const transactionSchema = z.object({
  amount: z.number().nonnegative().optional(),
  type: z.nativeEnum(TransactionType).default(TransactionType.EXPENSE),
  status: z.nativeEnum(TransactionStatus).default(TransactionStatus.CLEARED),
  source: z.nativeEnum(TransactionSource).default(TransactionSource.MANUAL),
  category: z.nativeEnum(ExpenseCategory).optional(),
  merchant: z.string().optional(),
  notes: z.string().optional(),
  occurredAt: z.coerce.date().optional()
});

transactionsRouter.post(
  "/:userId",
  asyncHandler(async (req, res) => {
    const input = transactionSchema.parse(req.body);
    const transaction = await prisma.transaction.create({
      data: { ...input, userId: req.params.userId },
      include: { attachments: true }
    });

    res.status(201).json(transaction);
  })
);

transactionsRouter.patch(
  "/:userId/:transactionId",
  asyncHandler(async (req, res) => {
    const input = transactionSchema.partial().parse(req.body);
    const transaction = await prisma.transaction.update({
      where: { id: req.params.transactionId, userId: req.params.userId },
      data: input,
      include: { attachments: true }
    });

    res.json(transaction);
  })
);

