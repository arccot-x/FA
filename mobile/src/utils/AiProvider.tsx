import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getPref, PREF_KEYS, setPref } from "./prefs";

type AiContextValue = {
  enabled: boolean;
  ready: boolean;
  setEnabled: (enabled: boolean) => Promise<void>;
};

const AiContext = createContext<AiContextValue | undefined>(undefined);

export function AiProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const saved = await getPref(PREF_KEYS.aiEnabled);
      setEnabledState(saved !== "false");
      setReady(true);
    })();
  }, []);

  const value = useMemo<AiContextValue>(
    () => ({
      enabled,
      ready,
      setEnabled: async (next) => {
        setEnabledState(next);
        await setPref(PREF_KEYS.aiEnabled, next ? "true" : "false");
      }
    }),
    [enabled]
  );

  return <AiContext.Provider value={value}>{children}</AiContext.Provider>;
}

export function useAiSettings() {
  const value = useContext(AiContext);
  if (!value) {
    throw new Error("useAiSettings must be used inside AiProvider");
  }
  return value;
}
