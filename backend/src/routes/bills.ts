import { BillStatus, ExpenseCategory } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { getBillsForMonth } from "../services/bills";
import { asyncHandler } from "../utils/asyncHandler";
import { dueDateFor, parseMonth } from "../utils/month";

export const billsRouter = Router();

billsRouter.get(
  "/:userId",
  asyncHandler(async (req, res) => {
    const cycleMonth = parseMonth(String(req.query.month ?? ""));
    res.json(await getBillsForMonth(req.params.userId, cycleMonth));
  })
);

const templateSchema = z.object({
  name: z.string().min(1),
  category: z.nativeEnum(ExpenseCategory).default(ExpenseCategory.OTHER),
  defaultAmount: z.number().nonnegative(),
  dueDay: z.number().int().min(1).max(31),
  icon: z.string().default("receipt"),
  autopay: z.boolean().default(false),
  notes: z.string().optional()
});

billsRouter.post(
  "/:userId/templates",
  asyncHandler(async (req, res) => {
    const input = templateSchema.parse(req.body);
    const template = await prisma.billTemplate.create({
      data: { ...input, userId: req.params.userId }
    });

    res.status(201).json(template);
  })
);

billsRouter.patch(
  "/:userId/templates/:templateId",
  asyncHandler(async (req, res) => {
    const input = templateSchema.partial().extend({ active: z.boolean().optional() }).parse(req.body);
    const template = await prisma.billTemplate.update({
      where: { id: req.params.templateId, userId: req.params.userId },
      data: input
    });

    res.json(template);
  })
);

const occurrenceSchema = z.object({
  amount: z.number().nonnegative().optional(),
  status: z.nativeEnum(BillStatus).optional(),
  notes: z.string().nullable().optional()
});

billsRouter.patch(
  "/:userId/occurrences/:occurrenceId",
  asyncHandler(async (req, res) => {
    const input = occurrenceSchema.parse(req.body);
    const occurrence = await prisma.billOccurrence.update({
      where: { id: req.params.occurrenceId, userId: req.params.userId },
      data: {
        ...input,
        paidAt: input.status === BillStatus.PAID ? new Date() : input.status === BillStatus.UNPAID ? null : undefined
      },
      include: { billTemplate: true }
    });

    res.json(occurrence);
  })
);

const ensureOccurrenceSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  amount: z.number().nonnegative().optional()
});

billsRouter.post(
  "/:userId/templates/:templateId/occurrences",
  asyncHandler(async (req, res) => {
    const input = ensureOccurrenceSchema.parse(req.body);
    const template = await prisma.billTemplate.findUniqueOrThrow({
      where: { id: req.params.templateId, userId: req.params.userId }
    });
    const cycleMonth = parseMonth(input.month);

    const occurrence = await prisma.billOccurrence.upsert({
      where: {
        billTemplateId_cycleMonth: {
          billTemplateId: template.id,
          cycleMonth
        }
      },
      update: {
        amount: input.amount
      },
      create: {
        userId: req.params.userId,
        billTemplateId: template.id,
        cycleMonth,
        dueDate: dueDateFor(cycleMonth, template.dueDay),
        amount: input.amount ?? template.defaultAmount
      },
      include: { billTemplate: true }
    });

    res.status(201).json(occurrence);
  })
);

