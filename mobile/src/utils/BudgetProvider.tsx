import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ExpenseCategory } from "../types";
import { getPref, PREF_KEYS, setPref } from "./prefs";

export type Budgets = Partial<Record<ExpenseCategory, number>>;

type BudgetContextValue = {
  budgets: Budgets;
  setBudget: (category: ExpenseCategory, cap: number) => void;
  ready: boolean;
};

const BudgetContext = createContext<BudgetContextValue | undefined>(undefined);

export function BudgetProvider({ children }: { children: ReactNode }) {
  const [budgets, setBudgets] = useState<Budgets>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const stored = await getPref(PREF_KEYS.budgets);
      if (stored) {
        try {
          setBudgets(JSON.parse(stored) as Budgets);
        } catch {
          // ignore malformed
        }
      }
      setReady(true);
    })();
  }, []);

  const setBudget = useCallback(
    (category: ExpenseCategory, cap: number) => {
      setBudgets((current) => {
        const next = { ...current };
        if (cap > 0) {
          next[category] = cap;
        } else {
          delete next[category];
        }
        void setPref(PREF_KEYS.budgets, JSON.stringify(next));
        return next;
      });
    },
    []
  );

  const value = useMemo<BudgetContextValue>(() => ({ budgets, setBudget, ready }), [budgets, setBudget, ready]);

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}

export function useBudgets(): BudgetContextValue {
  const ctx = useContext(BudgetContext);
  if (!ctx) {
    throw new Error("useBudgets must be used within a BudgetProvider");
  }
  return ctx;
}
