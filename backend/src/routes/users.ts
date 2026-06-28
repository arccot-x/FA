import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";

export const usersRouter = Router();

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  defaultMonthlyIncome: z.number().nonnegative().default(0),
  paydayDay: z.number().int().min(1).max(31).default(1),
  variableIncomeEnabled: z.boolean().default(false)
});

usersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createUserSchema.parse(req.body);
    const user = await prisma.user.upsert({
      where: { email: input.email },
      update: {
        name: input.name,
        defaultMonthlyIncome: input.defaultMonthlyIncome,
        paydayDay: input.paydayDay,
        variableIncomeEnabled: input.variableIncomeEnabled
      },
      create: input
    });

    res.status(201).json(user);
  })
);

usersRouter.get(
  "/demo",
  asyncHandler(async (_req, res) => {
    const user = await prisma.user.upsert({
      where: { email: "demo@frictionless.finance" },
      update: {},
      create: {
        email: "demo@frictionless.finance",
        name: "Demo User",
        defaultMonthlyIncome: 4200,
        paydayDay: 1,
        variableIncomeEnabled: true
      }
    });

    res.json(user);
  })
);

