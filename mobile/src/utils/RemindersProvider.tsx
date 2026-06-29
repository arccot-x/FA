import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useFinanceStore } from "../store/useFinanceStore";
import { useI18n } from "../i18n";
import { useMoney } from "./CurrencyProvider";
import { cancelBillReminders, ensureNotificationPermission, syncBillReminders } from "./notifications";
import { getPref, PREF_KEYS, setPref } from "./prefs";

type RemindersContextValue = {
  enabled: boolean;
  daysBefore: number;
  ready: boolean;
  /** Returns false if the OS denied notification permission. */
  setEnabled: (enabled: boolean) => Promise<boolean>;
  setDaysBefore: (days: number) => void;
};

const RemindersContext = createContext<RemindersContextValue | undefined>(undefined);

export function RemindersProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(false);
  const [daysBefore, setDaysBeforeState] = useState(3);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const [storedEnabled, storedDays] = await Promise.all([getPref(PREF_KEYS.remindersEnabled), getPref(PREF_KEYS.remindersDays)]);
      if (storedEnabled === "true") setEnabledState(true);
      const days = Number(storedDays);
      if (Number.isFinite(days) && days > 0) setDaysBeforeState(Math.min(14, Math.round(days)));
      setReady(true);
    })();
  }, []);

  const setEnabled = useCallback(async (next: boolean) => {
    if (next) {
      const granted = await ensureNotificationPermission();
      if (!granted) {
        setEnabledState(false);
        void setPref(PREF_KEYS.remindersEnabled, "false");
        return false;
      }
    } else {
      await cancelBillReminders();
    }
    setEnabledState(next);
    void setPref(PREF_KEYS.remindersEnabled, next ? "true" : "false");
    return true;
  }, []);

  const setDaysBefore = useCallback((days: number) => {
    const clamped = Math.min(14, Math.max(1, Math.round(days)));
    setDaysBeforeState(clamped);
    void setPref(PREF_KEYS.remindersDays, String(clamped));
  }, []);

  const value = useMemo<RemindersContextValue>(() => ({ enabled, daysBefore, ready, setEnabled, setDaysBefore }), [enabled, daysBefore, ready, setEnabled, setDaysBefore]);

  return (
    <RemindersContext.Provider value={value}>
      {children}
      <ReminderSync enabled={enabled} daysBefore={daysBefore} ready={ready} />
    </RemindersContext.Provider>
  );
}

/** Reschedules local notifications whenever the unpaid bills or settings change. */
function ReminderSync({ enabled, daysBefore, ready }: { enabled: boolean; daysBefore: number; ready: boolean }) {
  const { t } = useI18n();
  const money = useMoney();
  const bills = useFinanceStore((state) => state.bills);
  const lastKey = useRef<string>("");

  useEffect(() => {
    if (!ready) return;
    if (!enabled) {
      lastKey.current = "";
      return;
    }
    // Only reschedule when the unpaid set, amounts, or settings actually change.
    const key = `${daysBefore}|${bills.unpaid.map((b) => `${b.id}:${b.amount}:${b.dueDate}`).join(",")}`;
    if (key === lastKey.current) return;
    lastKey.current = key;

    void syncBillReminders(bills.unpaid, daysBefore, (value) => money(value), {
      title: (billName) => t("reminders.notifTitle", { bill: billName }),
      body: (billName, amount) => t("reminders.notifBody", { bill: billName, amount })
    });
  }, [enabled, daysBefore, ready, bills.unpaid, money, t]);

  return null;
}

export function useReminders(): RemindersContextValue {
  const ctx = useContext(RemindersContext);
  if (!ctx) {
    throw new Error("useReminders must be used within a RemindersProvider");
  }
  return ctx;
}
