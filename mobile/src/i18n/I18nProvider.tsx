import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { en } from "./translations/en";
import type { Translations } from "./translations/en";
import { tr } from "./translations/tr";
import { ar } from "./translations/ar";
import { getPref, PREF_KEYS, setPref } from "../utils/prefs";

export type Locale = "en" | "tr" | "ar";

export const LOCALES: { value: Locale; label: string; rtl: boolean }[] = [
  { value: "en", label: "English", rtl: false },
  { value: "tr", label: "Türkçe", rtl: false },
  { value: "ar", label: "العربية", rtl: true }
];

const dictionaries: Record<Locale, Translations> = { en, tr, ar };

// Dot-path keys into the translation tree, e.g. "home.safeToSpend".
type Primitive = string;
type PathInto<T> = {
  [K in keyof T & string]: T[K] extends Primitive ? K : `${K}.${PathInto<T[K]>}`;
}[keyof T & string];

export type TKey = PathInto<Translations>;

type TParams = Record<string, string | number>;

function resolve(dict: Translations, key: string): string | undefined {
  const value = key.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, dict);
  return typeof value === "string" ? value : undefined;
}

function interpolate(template: string, params?: TParams): string {
  if (!params) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const replacement = params[name];
    return replacement === undefined ? match : String(replacement);
  });
}

function detectLocale(): Locale {
  try {
    const tag = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase();
    if (tag.startsWith("tr")) return "tr";
    if (tag.startsWith("ar")) return "ar";
  } catch {
    // ignore
  }
  return "en";
}

type I18nContextValue = {
  locale: Locale;
  isRTL: boolean;
  setLocale: (locale: Locale) => void;
  t: (key: TKey, params?: TParams) => string;
  ready: boolean;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const stored = (await getPref(PREF_KEYS.locale)) as Locale | null;
      if (stored && (stored === "en" || stored === "tr" || stored === "ar")) {
        setLocaleState(stored);
      } else {
        setLocaleState(detectLocale());
      }
      setReady(true);
    })();
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    void setPref(PREF_KEYS.locale, next);
  }, []);

  const t = useCallback(
    (key: TKey, params?: TParams) => {
      const dict = dictionaries[locale];
      const value = resolve(dict, key) ?? resolve(en, key) ?? key;
      return interpolate(value, params);
    },
    [locale]
  );

  const isRTL = useMemo(() => LOCALES.find((item) => item.value === locale)?.rtl ?? false, [locale]);

  const value = useMemo<I18nContextValue>(() => ({ locale, isRTL, setLocale, t, ready }), [locale, isRTL, setLocale, t, ready]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}
