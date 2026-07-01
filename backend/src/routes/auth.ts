import { Router } from "express";
import crypto from "node:crypto";
import { Resend } from "resend";
import { z } from "zod";
import { env } from "../lib/env";
import { prisma } from "../lib/prisma";
import { hashPassword, publicUser, signUserToken, verifyPassword, verifyUserToken } from "../services/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { requireUserAccess } from "../utils/requireUserAccess";
import { dueDateFor, monthStart } from "../utils/month";

export const authRouter = Router();

// Applied to newly-set passwords (register, reset, change). Login keeps the looser
// `z.string().min(8)` check below so existing accounts with 8-char passwords can
// still sign in; this only raises the bar for passwords going forward.
const strongPassword = z
  .string()
  .min(10, "Password must be at least 10 characters.")
  .regex(/[A-Za-z]/, "Password must include at least one letter.")
  .regex(/[0-9]/, "Password must include at least one number.");

const changePasswordSchema = z.object({
  userId: z.string().min(1),
  currentPassword: z.string().min(1),
  newPassword: strongPassword
});

const credentialsSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase().trim()),
  password: z.string().min(8)
});

const registerSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase().trim()),
  password: strongPassword,
  name: z.string().min(1).max(80)
});

const requestResetSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase().trim())
});

const resetPasswordSchema = requestResetSchema.extend({
  code: z.string().min(6).max(12).transform((value) => value.trim()),
  newPassword: strongPassword
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
  "/demo",
  asyncHandler(async (_req, res) => {
    const cycleMonth = monthStart();
    const user = await prisma.user.upsert({
      where: { email: "demo@frictionless.finance" },
      update: {
        name: "Demo User",
        defaultMonthlyIncome: 4200,
        paydayDay: 1,
        variableIncomeEnabled: true
      },
      create: {
        email: "demo@frictionless.finance",
        name: "Demo User",
        defaultMonthlyIncome: 4200,
        paydayDay: 1,
        variableIncomeEnabled: true
      }
    });

    await prisma.subscription.upsert({
      where: { userId: user.id },
      update: { plan: "FAMILY_3", active: true },
      create: { userId: user.id, plan: "FAMILY_3", active: true, billingEmail: user.email, billingName: user.name }
    });

    await prisma.incomeCycle.upsert({
      where: { userId_cycleMonth: { userId: user.id, cycleMonth } },
      update: { expected: 4200, actual: 4200, sourceType: "VARIABLE_EXPECTED" },
      create: { userId: user.id, cycleMonth, expected: 4200, actual: 4200, sourceType: "VARIABLE_EXPECTED" }
    });

    const billSeeds = [
      { name: "Rent", defaultAmount: 1450, dueDay: 1, category: "HOME" as const, icon: "home-city" },
      { name: "Electric", defaultAmount: 118, dueDay: 12, category: "UTILITIES" as const, icon: "lightning-bolt" },
      { name: "Internet", defaultAmount: 64, dueDay: 18, category: "SUBSCRIPTION" as const, icon: "wifi" }
    ];

    for (const seed of billSeeds) {
      const template = await prisma.billTemplate.upsert({
        where: { id: `demo-${user.id}-${seed.name.toLowerCase()}` },
        update: {
          name: seed.name,
          defaultAmount: seed.defaultAmount,
          dueDay: seed.dueDay,
          category: seed.category,
          icon: seed.icon,
          active: true
        },
        create: {
          id: `demo-${user.id}-${seed.name.toLowerCase()}`,
          userId: user.id,
          name: seed.name,
          defaultAmount: seed.defaultAmount,
          dueDay: seed.dueDay,
          category: seed.category,
          icon: seed.icon
        }
      });

      await prisma.billOccurrence.upsert({
        where: { billTemplateId_cycleMonth: { billTemplateId: template.id, cycleMonth } },
        update: { amount: seed.defaultAmount, dueDate: dueDateFor(cycleMonth, seed.dueDay), status: seed.name === "Rent" ? "PAID" : "UNPAID" },
        create: {
          userId: user.id,
          billTemplateId: template.id,
          cycleMonth,
          dueDate: dueDateFor(cycleMonth, seed.dueDay),
          amount: seed.defaultAmount,
          status: seed.name === "Rent" ? "PAID" : "UNPAID",
          paidAt: seed.name === "Rent" ? new Date() : null
        }
      });
    }

    const existingTransactions = await prisma.transaction.count({ where: { userId: user.id } });
    if (existingTransactions === 0) {
      await prisma.transaction.createMany({
        data: [
          { userId: user.id, amount: 84.32, category: "GROCERIES", merchant: "Green Market", notes: "Weekly groceries", occurredAt: new Date(Date.now() - 2 * 86400000) },
          { userId: user.id, amount: 18.5, category: "DINING", merchant: "Coffee Bar", occurredAt: new Date(Date.now() - 4 * 86400000) },
          { userId: user.id, amount: 47.2, category: "GAS", merchant: "Fuel Stop", occurredAt: new Date(Date.now() - 6 * 86400000) },
          { userId: user.id, amount: 120, category: "OTHER", merchant: "Receipt pending", status: "PENDING_DETAILS", source: "SNAP_SAVE", occurredAt: new Date(Date.now() - 1 * 86400000) }
        ]
      });
    }

    const existingVault = await prisma.vaultDocument.count({ where: { userId: user.id } });
    if (existingVault === 0) {
      await prisma.vaultDocument.createMany({
        data: [
          {
            userId: user.id,
            title: "Lease agreement",
            category: "LEASE",
            mimeGroup: "PDF",
            fileName: "lease-agreement.pdf",
            mimeType: "application/pdf",
            fileSize: 124000,
            url: "https://example.com/lease-agreement.pdf",
            storagePath: `demo/${user.id}/lease-agreement.pdf`
          },
          {
            userId: user.id,
            title: "Warranty receipt",
            category: "RECEIPT",
            mimeGroup: "IMAGE",
            fileName: "warranty-receipt.jpg",
            mimeType: "image/jpeg",
            fileSize: 86000,
            url: "https://example.com/warranty-receipt.jpg",
            storagePath: `demo/${user.id}/warranty-receipt.jpg`
          }
        ]
      });
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
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) {
      // Same message as an invalid/expired code so this endpoint can't be used to
      // check which emails have an account.
      throw new Error("Reset code is invalid or expired.");
    }
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
