import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getPref, PREF_KEYS, setPref } from "./prefs";

type AiContextValue = {
  enabled: boolean;
  apiKey: string;
  /** True when AI scanning can actually run (enabled + a key present). */
  ready: boolean;
  setEnabled: (enabled: boolean) => void;
  setApiKey: (key: string) => void;
};

const AiContext = createContext<AiContextValue | undefined>(undefined);

export function AiProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(false);
  const [apiKey, setApiKeyState] = useState("");

  useEffect(() => {
    void (async () => {
      const [storedEnabled, storedKey] = await Promise.all([getPref(PREF_KEYS.aiEnabled), getPref(PREF_KEYS.aiKey)]);
      if (storedEnabled === "true") setEnabledState(true);
      if (storedKey) setApiKeyState(storedKey);
    })();
  }, []);

  const setEnabled = useCallback((next: boolean) => {
    setEnabledState(next);
    void setPref(PREF_KEYS.aiEnabled, next ? "true" : "false");
  }, []);

  const setApiKey = useCallback((key: string) => {
    setApiKeyState(key);
    void setPref(PREF_KEYS.aiKey, key);
  }, []);

  const value = useMemo<AiContextValue>(
    () => ({ enabled, apiKey, ready: enabled && apiKey.trim().length > 0, setEnabled, setApiKey }),
    [enabled, apiKey, setEnabled, setApiKey]
  );

  return <AiContext.Provider value={value}>{children}</AiContext.Provider>;
}

export function useAi(): AiContextValue {
  const ctx = useContext(AiContext);
  if (!ctx) {
    throw new Error("useAi must be used within an AiProvider");
  }
  return ctx;
}
