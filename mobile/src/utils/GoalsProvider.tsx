import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getPref, setPref } from "./prefs";

const GOALS_KEY = "pref-goals";

export type SavingsGoal = {
  id: string;
  name: string;
  target: number;
  saved: number;
};

type GoalsContextValue = {
  goals: SavingsGoal[];
  upsertGoal: (goal: SavingsGoal) => void;
  removeGoal: (id: string) => void;
};

const GoalsContext = createContext<GoalsContextValue | undefined>(undefined);

export function GoalsProvider({ children }: { children: ReactNode }) {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);

  useEffect(() => {
    void (async () => {
      const stored = await getPref(GOALS_KEY);
      if (stored) {
        try {
          setGoals(JSON.parse(stored) as SavingsGoal[]);
        } catch {
          // ignore malformed
        }
      }
    })();
  }, []);

  const upsertGoal = useCallback(
    (goal: SavingsGoal) => {
      setGoals((current) => {
        const exists = current.some((item) => item.id === goal.id);
        const next = exists ? current.map((item) => (item.id === goal.id ? goal : item)) : [...current, goal];
        void setPref(GOALS_KEY, JSON.stringify(next));
        return next;
      });
    },
    []
  );

  const removeGoal = useCallback((id: string) => {
    setGoals((current) => {
      const next = current.filter((item) => item.id !== id);
      void setPref(GOALS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo<GoalsContextValue>(() => ({ goals, upsertGoal, removeGoal }), [goals, upsertGoal, removeGoal]);

  return <GoalsContext.Provider value={value}>{children}</GoalsContext.Provider>;
}

export function useGoals(): GoalsContextValue {
  const ctx = useContext(GoalsContext);
  if (!ctx) {
    throw new Error("useGoals must be used within a GoalsProvider");
  }
  return ctx;
}
