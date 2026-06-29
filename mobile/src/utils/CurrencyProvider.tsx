import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useI18n } from "../i18n";
import { CurrencyCode, formatMoney } from "./money";
import { getPref, PREF_KEYS, setPref } from "./prefs";

type CurrencyContextValue = {
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
};

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

const VALID: CurrencyCode[] = ["USD", "EUR", "TRY", "GBP", "SAR", "AED"];

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>("USD");

  useEffect(() => {
    void (async () => {
      const stored = (await getPref(PREF_KEYS.currency)) as CurrencyCode | null;
      if (stored && VALID.includes(stored)) {
        setCurrencyState(stored);
      }
    })();
  }, []);

  const setCurrency = useCallback((code: CurrencyCode) => {
    setCurrencyState(code);
    void setPref(PREF_KEYS.currency, code);
  }, []);

  const value = useMemo<CurrencyContextValue>(() => ({ currency, setCurrency }), [currency, setCurrency]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return ctx;
}

/**
 * Returns a formatter bound to the active locale + currency.
 * Usage: const money = useMoney(); money(1234) -> "$1,234"
 */
export function useMoney() {
  const { currency } = useCurrency();
  const { locale } = useI18n();
  return useCallback((value: string | number | null | undefined, fractionDigits = 0) => formatMoney(value, currency, locale, fractionDigits), [currency, locale]);
}
