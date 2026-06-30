import { SubscriptionPlan } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { publicSubscription } from "../services/subscriptions";
import { asyncHandler } from "../utils/asyncHandler";
import { getAuthUserId } from "../utils/requireUserAccess";

export const subscriptionsRouter = Router();

const checkoutSchema = z.object({
  plan: z.nativeEnum(SubscriptionPlan),
  billingName: z.string().min(1).max(120),
  billingEmail: z.string().email(),
  cardNumber: z.string().min(4).max(32)
});

subscriptionsRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const userId = getAuthUserId(req);
    const subscription = await prisma.subscription.findUnique({ where: { userId } });

    if (!subscription) {
      res.json({
        subscription: {
          plan: SubscriptionPlan.INDIVIDUAL,
          active: false,
          billingName: null,
          billingEmail: null,
          cardLast4: null,
          price: 5,
          memberLimit: 1,
          family: false,
          updatedAt: null
        }
      });
      return;
    }

    res.json({ subscription: publicSubscription(subscription) });
  })
);

subscriptionsRouter.post(
  "/checkout",
  asyncHandler(async (req, res) => {
    const userId = getAuthUserId(req);
    const input = checkoutSchema.parse(req.body);
    const digits = input.cardNumber.replace(/\D/g, "");

    const subscription = await prisma.subscription.upsert({
      where: { userId },
      update: {
        plan: input.plan,
        active: true,
        billingName: input.billingName.trim(),
        billingEmail: input.billingEmail.trim().toLowerCase(),
        cardLast4: digits.slice(-4) || "0000"
      },
      create: {
        userId,
        plan: input.plan,
        active: true,
        billingName: input.billingName.trim(),
        billingEmail: input.billingEmail.trim().toLowerCase(),
        cardLast4: digits.slice(-4) || "0000"
      }
    });

    res.json({ subscription: publicSubscription(subscription) });
  })
);
