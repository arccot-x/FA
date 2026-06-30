import { Router } from "express";
import crypto from "node:crypto";
import { Resend } from "resend";
import { z } from "zod";
import { env } from "../lib/env";
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

const requestResetSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase().trim())
});

const resetPasswordSchema = requestResetSchema.extend({
  code: z.string().min(6).max(12).transform((value) => value.trim()),
  newPassword: z.string().min(8)
});

function hashResetCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function makeResetCode() {
  return String(crypto.randomInt(100000, 1000000));
}

async function sendResetCode(email: string, code: string) {
  if (!env.RESEND_API_KEY) {
    throw new Error("Password reset email is not configured.");
  }

  const resend = new Resend(env.RESEND_API_KEY);
  await resend.emails.send({
    from: env.EMAIL_FROM,
    to: email,
    subject: "Your Frictionless Finance reset code",
    html: `<p>Your password reset code is <strong>${code}</strong>.</p><p>It expires in 15 minutes.</p>`
  });
}

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
  "/request-password-reset",
  asyncHandler(async (req, res) => {
    const input = requestResetSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: input.email } });

    if (user?.passwordHash) {
      const code = makeResetCode();
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashResetCode(code),
          expiresAt: new Date(Date.now() + 15 * 60 * 1000)
        }
      });
      await sendResetCode(user.email, code);
    }

    res.json({ ok: true });
  })
);

authRouter.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const input = resetPasswordSchema.parse(req.body);
    const user = await prisma.user.findUniqueOrThrow({ where: { email: input.email } });
    const reset = await prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        tokenHash: hashResetCode(input.code),
        usedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: "desc" }
    });

    if (!reset) {
      throw new Error("Reset code is invalid or expired.");
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await hashPassword(input.newPassword) }
      }),
      prisma.passwordResetToken.update({
        where: { id: reset.id },
        data: { usedAt: new Date() }
      })
    ]);

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
