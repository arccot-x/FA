import { IncomeSourceType } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { parseMonth } from "../utils/month";

export const incomeRouter = Router();

incomeRouter.get(
  "/:userId/current",
  asyncHandler(async (req, res) => {
    const cycleMonth = parseMonth(String(req.query.month ?? ""));
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.params.userId } });

    const cycle = await prisma.incomeCycle.upsert({
      where: {
        userId_cycleMonth: {
          userId: user.id,
          cycleMonth
        }
      },
      update: {},
      create: {
        userId: user.id,
        cycleMonth,
        expected: user.defaultMonthlyIncome,
        sourceType: user.variableIncomeEnabled ? IncomeSourceType.VARIABLE_EXPECTED : IncomeSourceType.DEFAULT
      }
    });

    res.json({ user, cycle });
  })
);

const settingsSchema = z.object({
  defaultMonthlyIncome: z.number().nonnegative(),
  paydayDay: z.number().int().min(1).max(31),
  variableIncomeEnabled: z.boolean()
});

incomeRouter.put(
  "/:userId/settings",
  asyncHandler(async (req, res) => {
    const input = settingsSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.params.userId },
      data: input
    });

    res.json(user);
  })
);

const cycleSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  expected: z.number().nonnegative(),
  actual: z.number().nonnegative().optional(),
  sourceType: z.nativeEnum(IncomeSourceType).default(IncomeSourceType.VARIABLE_EXPECTED),
  notes: z.string().optional()
});

incomeRouter.post(
  "/:userId/cycles",
  asyncHandler(async (req, res) => {
    const input = cycleSchema.parse(req.body);
    const cycleMonth = parseMonth(input.month);
    const cycle = await prisma.incomeCycle.upsert({
      where: {
        userId_cycleMonth: {
          userId: req.params.userId,
          cycleMonth
        }
      },
      update: {
        expected: input.expected,
        actual: input.actual,
        sourceType: input.sourceType,
        notes: input.notes
      },
      create: {
        userId: req.params.userId,
        cycleMonth,
        expected: input.expected,
        actual: input.actual,
        sourceType: input.sourceType,
        notes: input.notes
      }
    });

    res.status(201).json(cycle);
  })
);

