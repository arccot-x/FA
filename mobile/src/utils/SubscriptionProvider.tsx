import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getPref, PREF_KEYS, setPref } from "./prefs";

export type SubscriptionPlanId = "individual" | "family3" | "family6";

export type SubscriptionPlan = {
  id: SubscriptionPlanId;
  name: string;
  price: number;
  memberLimit: number;
};

export type SubscriptionInfo = {
  planId: SubscriptionPlanId;
  name: string;
  email: string;
  cardLast4: string;
  active: boolean;
  updatedAt: string;
};

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  { id: "individual", name: "Individual", price: 5, memberLimit: 1 },
  { id: "family3", name: "Family 3", price: 10, memberLimit: 4 },
  { id: "family6", name: "Family 6", price: 15, memberLimit: 7 }
];

const defaultSubscription: SubscriptionInfo = {
  planId: "individual",
  name: "",
  email: "",
  cardLast4: "",
  active: false,
  updatedAt: ""
};

type SubscriptionContextValue = {
  subscription: SubscriptionInfo;
  plan: SubscriptionPlan;
  ready: boolean;
  saveSubscription: (input: { planId: SubscriptionPlanId; name: string; email: string; cardNumber: string }) => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

function planFor(id: SubscriptionPlanId) {
  return SUBSCRIPTION_PLANS.find((item) => item.id === id) ?? SUBSCRIPTION_PLANS[0];
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [subscription, setSubscription] = useState<SubscriptionInfo>(defaultSubscription);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const stored = await getPref(PREF_KEYS.subscription);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as SubscriptionInfo;
          if (SUBSCRIPTION_PLANS.some((item) => item.id === parsed.planId)) {
            setSubscription({ ...defaultSubscription, ...parsed });
          }
        } catch {
          // Ignore corrupt test subscription data.
        }
      }
      setReady(true);
    })();
  }, []);

  const saveSubscription = async (input: { planId: SubscriptionPlanId; name: string; email: string; cardNumber: string }) => {
    const digits = input.cardNumber.replace(/\D/g, "");
    const next: SubscriptionInfo = {
      planId: input.planId,
      name: input.name.trim(),
      email: input.email.trim(),
      cardLast4: digits.slice(-4) || "0000",
      active: true,
      updatedAt: new Date().toISOString()
    };
    setSubscription(next);
    await setPref(PREF_KEYS.subscription, JSON.stringify(next));
  };

  const value = useMemo<SubscriptionContextValue>(
    () => ({ subscription, plan: planFor(subscription.planId), ready, saveSubscription }),
    [subscription, ready]
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
