import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { hashPassword, publicUser, signUserToken, verifyPassword, verifyUserToken } from "../services/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { requireUserAccess } from "../utils/requireUserAccess";

export const authRouter = Router();

const changePasswordSchema = z.object({
  userId: z.string().min(1),
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8)
});

const credentialsSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase().trim()),
  password: z.string().min(8)
});

const registerSchema = credentialsSchema.extend({
  name: z.string().min(1).max(80)
});

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new Error("An account with this email already exists.");
    }

    const user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash: await hashPassword(input.password),
        defaultMonthlyIncome: 0,
        paydayDay: 1,
        variableIncomeEnabled: false
      }
    });

    res.status(201).json({ user: publicUser(user), token: signUserToken(user) });
  })
);
authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const input = credentialsSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: input.email } });

    if (!user?.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new Error("Invalid email or password.");
    }

    res.json({ user: publicUser(user), token: signUserToken(user) });
  })
);

authRouter.post(
  "/change-password",
  asyncHandler(async (req, res) => {
    const input = changePasswordSchema.parse(req.body);
    requireUserAccess(req, input.userId);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: input.userId } });
    if (!user.passwordHash || !(await verifyPassword(input.currentPassword, user.passwordHash))) {
      throw new Error("Current password is incorrect.");
    }

    await prisma.user.update({
      where: { id: input.userId },
      data: { passwordHash: await hashPassword(input.newPassword) }
    });

    res.json({ ok: true });
  })
);

authRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const header = req.header("authorization");
    const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
    if (!token) {
      throw new Error("Missing session token.");
    }

    const { userId } = verifyUserToken(token);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    res.json({ user: publicUser(user) });
  })
);
