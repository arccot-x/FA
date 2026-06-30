import type { SubscriptionPlanId } from "../types";

export type SubscriptionPlan = {
  id: SubscriptionPlanId;
  name: string;
  price: number;
  memberLimit: number;
  family: boolean;
  description: string;
};

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  { id: "INDIVIDUAL", name: "Individual", price: 5, memberLimit: 1, family: false, description: "Personal finance, receipts, bills and vault." },
  { id: "FAMILY_3", name: "Family 3", price: 10, memberLimit: 4, family: true, description: "Share house money with up to 3 people." },
  { id: "FAMILY_6", name: "Family 6", price: 15, memberLimit: 7, family: true, description: "Share house money with up to 6 people." }
];
