import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import * as api from "../services/api";
import type { SubscriptionInfo, SubscriptionPlanId } from "../types";

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

const defaultSubscription: SubscriptionInfo = {
  plan: "INDIVIDUAL",
  active: false,
  billingName: null,
  billingEmail: null,
  cardLast4: null,
  price: 5,
  memberLimit: 1,
  family: false,
  updatedAt: null
};

type SubscriptionContextValue = {
  subscription: SubscriptionInfo;
  plan: SubscriptionPlan;
  loading: boolean;
  refreshSubscription: () => Promise<void>;
  saveSubscription: (input: { plan: SubscriptionPlanId }) => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

function planFor(id: SubscriptionPlanId) {
  return SUBSCRIPTION_PLANS.find((item) => item.id === id) ?? SUBSCRIPTION_PLANS[0];
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [subscription, setSubscription] = useState<SubscriptionInfo>(defaultSubscription);
  const [loading, setLoading] = useState(false);

  const refreshSubscription = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.getSubscription();
      setSubscription(result.subscription);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveSubscription = useCallback(async (input: { plan: SubscriptionPlanId }) => {
    setLoading(true);
    try {
      const result = await api.checkoutSubscription(input);
      setSubscription(result.subscription);
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo<SubscriptionContextValue>(
    () => ({ subscription, plan: planFor(subscription.plan), loading, refreshSubscription, saveSubscription }),
    [subscription, loading, refreshSubscription, saveSubscription]
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error("useSubscription must be used within SubscriptionProvider");
  }
  return ctx;
}
