import { SubscriptionPlan } from "@prisma/client";
import { prisma } from "../lib/prisma";

export const planDetails = {
  [SubscriptionPlan.INDIVIDUAL]: { price: 5, memberLimit: 1, family: false },
  [SubscriptionPlan.FAMILY_3]: { price: 10, memberLimit: 4, family: true },
  [SubscriptionPlan.FAMILY_6]: { price: 15, memberLimit: 7, family: true }
} as const;

export function publicSubscription(subscription: {
  plan: SubscriptionPlan;
  active: boolean;
  billingName: string | null;
  billingEmail: string | null;
  cardLast4: string | null;
  updatedAt: Date;
}) {
  const details = planDetails[subscription.plan];
  return {
    plan: subscription.plan,
    active: subscription.active,
    billingName: subscription.billingName,
    billingEmail: subscription.billingEmail,
    cardLast4: subscription.cardLast4,
    price: details.price,
    memberLimit: details.memberLimit,
    family: details.family,
    updatedAt: subscription.updatedAt
  };
}

export async function getUserSubscription(userId: string) {
  const subscription = await prisma.subscription.findUnique({ where: { userId } });
  if (!subscription) {
    return {
      plan: SubscriptionPlan.INDIVIDUAL,
      active: false,
      billingName: null,
      billingEmail: null,
      cardLast4: null,
      price: planDetails.INDIVIDUAL.price,
      memberLimit: planDetails.INDIVIDUAL.memberLimit,
      family: false,
      updatedAt: null
    };
  }

  return publicSubscription(subscription);
}

export async function getFamilyAccess(ownerId: string) {
  const subscription = await prisma.subscription.findUnique({ where: { userId: ownerId } });
  if (!subscription?.active) {
    return { allowed: false, memberLimit: 1, reason: "Family features require an active family subscription." };
  }

  const details = planDetails[subscription.plan];
  if (!details.family) {
    return { allowed: false, memberLimit: details.memberLimit, reason: "Upgrade to a family subscription to use family features." };
  }

  return { allowed: true, memberLimit: details.memberLimit, reason: null };
}

export async function requireFamilyAccess(ownerId: string) {
  const access = await getFamilyAccess(ownerId);
  if (!access.allowed) {
    throw new Error(access.reason ?? "Family subscription required.");
  }
  return access;
}
