import { IncomeSourceType } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../lib/prisma";
import { getBillsForMonth } from "../services/bills";
import { asyncHandler } from "../utils/asyncHandler";
import { parseMonth } from "../utils/month";
import { requireUserAccess } from "../utils/requireUserAccess";

export const bootstrapRouter = Router();

bootstrapRouter.get(
  "/:userId",
  asyncHandler(async (req, res) => {
    requireUserAccess(req, req.params.userId);
    const cycleMonth = parseMonth(String(req.query.month ?? ""));
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.params.userId } });
    const [incomeCycle, bills, transactions, vaultDocuments] = await Promise.all([
      prisma.incomeCycle.upsert({
        where: {
          userId_cycleMonth: {
            userId: req.params.userId,
            cycleMonth
          }
        },
        update: {},
        create: {
          userId: req.params.userId,
          cycleMonth,
          expected: user.defaultMonthlyIncome,
          sourceType: user.variableIncomeEnabled ? IncomeSourceType.VARIABLE_EXPECTED : IncomeSourceType.DEFAULT
        }
      }),
      getBillsForMonth(req.params.userId, cycleMonth),
      prisma.transaction.findMany({
        where: { userId: req.params.userId },
        include: { attachments: true },
        orderBy: { occurredAt: "desc" },
        // Load several months of history so the dashboard month switcher and the
        // Insights trend chart have data; the client filters by the selected month.
        take: 300
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
