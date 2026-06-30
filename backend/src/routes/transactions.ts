import { ExpenseCategory, MemberStatus, TransactionScope, TransactionSource, TransactionStatus, TransactionType } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireFamilyAccess } from "../services/subscriptions";
import { asyncHandler } from "../utils/asyncHandler";
import { requireUserAccess } from "../utils/requireUserAccess";

export const transactionsRouter = Router();

// Resolves the familyId to store for a transaction, validating house access.
async function resolveScope(userId: string, scope: TransactionScope | undefined, familyId: string | null | undefined) {
  if (scope !== TransactionScope.HOUSE) {
    return { scope: TransactionScope.PERSONAL, familyId: null };
  }
  if (!familyId) {
    throw new Error("A family is required for house expenses.");
  }
  const member = await prisma.familyMember.findUnique({ where: { familyId_userId: { familyId, userId } } });
  if (!member || member.status !== MemberStatus.ACTIVE) {
    throw new Error("You are not a member of this family.");
  }
  const family = await prisma.family.findUniqueOrThrow({ where: { id: familyId } });
  await requireFamilyAccess(family.ownerId);
  return { scope: TransactionScope.HOUSE, familyId };
}

transactionsRouter.get(
  "/:userId",
  asyncHandler(async (req, res) => {
    requireUserAccess(req, req.params.userId);
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
  scope: z.nativeEnum(TransactionScope).optional(),
  familyId: z.string().nullable().optional(),
  occurredAt: z.coerce.date().optional()
});

transactionsRouter.post(
  "/:userId",
  asyncHandler(async (req, res) => {
    requireUserAccess(req, req.params.userId);
    const input = transactionSchema.parse(req.body);
    const resolved = await resolveScope(req.params.userId, input.scope, input.familyId);
    const transaction = await prisma.transaction.create({
      data: { ...input, ...resolved, userId: req.params.userId },
      include: { attachments: true }
    });

    res.status(201).json(transaction);
  })
);

transactionsRouter.patch(
  "/:userId/:transactionId",
  asyncHandler(async (req, res) => {
    requireUserAccess(req, req.params.userId);
    const input = transactionSchema.partial().parse(req.body);
    // Only re-resolve scope when the client sent one (so plain edits keep the existing scope).
    const data = input.scope === undefined ? input : { ...input, ...(await resolveScope(req.params.userId, input.scope, input.familyId)) };
    const transaction = await prisma.transaction.update({
      where: { id: req.params.transactionId, userId: req.params.userId },
      data,
      include: { attachments: true }
    });

    res.json(transaction);
  })
);

transactionsRouter.delete(
  "/:userId/:transactionId",
  asyncHandler(async (req, res) => {
    requireUserAccess(req, req.params.userId);
    // Attachments cascade-delete with the transaction (see schema onDelete: Cascade).
    await prisma.transaction.delete({
      where: { id: req.params.transactionId, userId: req.params.userId }
    });

    res.status(204).send();
  })
);
