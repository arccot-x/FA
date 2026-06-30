import { SubscriptionPlan } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { publicSubscription } from "../services/subscriptions";
import { asyncHandler } from "../utils/asyncHandler";
import { getAuthUserId } from "../utils/requireUserAccess";

export const subscriptionsRouter = Router();

const checkoutSchema = z.object({
  plan: z.nativeEnum(SubscriptionPlan)
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

    const subscription = await prisma.subscription.upsert({
      where: { userId },
      update: {
        plan: input.plan,
        active: true,
        billingName: null,
        billingEmail: null,
        cardLast4: null
      },
      create: {
        userId,
        plan: input.plan,
        active: true,
        billingName: null,
        billingEmail: null,
        cardLast4: null
      }
    });

    res.json({ subscription: publicSubscription(subscription) });
  })
);
