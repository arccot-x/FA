import { Router } from "express";
import { prisma } from "../lib/prisma";
import { getBillsForMonth } from "../services/bills";
import { asyncHandler } from "../utils/asyncHandler";
import { parseMonth } from "../utils/month";

export const bootstrapRouter = Router();

bootstrapRouter.get(
  "/:userId",
  asyncHandler(async (req, res) => {
    const cycleMonth = parseMonth(String(req.query.month ?? ""));
    const [user, incomeCycle, bills, transactions, vaultDocuments] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: req.params.userId } }),
      prisma.incomeCycle.findUnique({
        where: {
          userId_cycleMonth: {
            userId: req.params.userId,
            cycleMonth
          }
        }
      }),
      getBillsForMonth(req.params.userId, cycleMonth),
      prisma.transaction.findMany({
        where: { userId: req.params.userId },
        include: { attachments: true },
        orderBy: { occurredAt: "desc" },
        take: 25
      }),
      prisma.vaultDocument.findMany({
        where: { userId: req.params.userId },
        orderBy: { createdAt: "desc" },
        take: 25
      })
    ]);

    res.json({ user, incomeCycle, bills, transactions, vaultDocuments });
  })
);

