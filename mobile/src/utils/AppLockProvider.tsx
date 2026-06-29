import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { Button } from "../components/ui";
import { useFinanceStore } from "../store/useFinanceStore";
import { useTheme } from "../theme";
import { useI18n } from "../i18n";
import { getPref, setPref } from "./prefs";

const LOCK_KEY = "pref-app-lock";

type AppLockContextValue = {
  enabled: boolean;
  /** Returns false if biometrics are unavailable/not enrolled. */
  setEnabled: (enabled: boolean) => Promise<boolean>;
};

const AppLockContext = createContext<AppLockContextValue | undefined>(undefined);

export async function biometricsAvailable(): Promise<boolean> {
  const [hasHardware, enrolled] = await Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()]);
  return hasHardware && enrolled;
}

export function AppLockProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(false);
  const [locked, setLocked] = useState(false);
  const [ready, setReady] = useState(false);
  const authenticating = useRef(false);

  useEffect(() => {
    void (async () => {
      const stored = await getPref(LOCK_KEY);
      const on = stored === "true";
      setEnabledState(on);
      setLocked(on); // require unlock on cold start
      setReady(true);
    })();
  }, []);

  // Re-lock whenever the app returns from background.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") return;
      if (enabled) setLocked(true);
    });
    return () => sub.remove();
  }, [enabled]);

  const unlock = useCallback(async () => {
    if (authenticating.current) return;
    authenticating.current = true;
    try {
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: "Unlock", disableDeviceFallback: false });
      if (result.success) setLocked(false);
    } finally {
      authenticating.current = false;
    }
  }, []);

  const setEnabled = useCallback(async (next: boolean) => {
    if (next) {
      const available = await biometricsAvailable();
      if (!available) return false;
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: "Unlock" });
      if (!result.success) return false;
    }
    setEnabledState(next);
    setLocked(false);
    void setPref(LOCK_KEY, next ? "true" : "false");
    return true;
  }, []);

  const value = useMemo<AppLockContextValue>(() => ({ enabled, setEnabled }), [enabled, setEnabled]);

  return (
    <AppLockContext.Provider value={value}>
      {children}
      {ready && enabled && locked ? <LockOverlay onUnlock={unlock} /> : null}
    </AppLockContext.Provider>
  );
}

function LockOverlay({ onUnlock }: { onUnlock: () => void }) {
  const theme = useTheme();
  const { t } = useI18n();
  const user = useFinanceStore((state) => state.user);

  // Auto-prompt once when the lock appears for a signed-in user.
  useEffect(() => {
    if (user) void onUnlock();
  }, [user, onUnlock]);

  if (!user) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.icon, { backgroundColor: theme.colors.primary, borderRadius: theme.radii.lg }]}>
        <MaterialCommunityIcons color={theme.colors.onPrimary} name="lock" size={34} />
      </View>
      <Text style={[styles.title, { color: theme.colors.text }]}>{t("security.unlockTitle")}</Text>
      <Text style={[styles.subtitle, { color: theme.colors.subtleText }]}>{t("security.unlockSubtitle")}</Text>
      <Button label={t("security.unlockCta")} icon="fingerprint" onPress={onUnlock} style={styles.button} />
    </View>
  );
}

export function useAppLock(): AppLockContextValue {
  const ctx = useContext(AppLockContext);
  if (!ctx) {
    throw new Error("useAppLock must be used within an AppLockProvider");
  }
  return ctx;
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    zIndex: 100
  },
  icon: {
    alignItems: "center",
    height: 68,
    justifyContent: "center",
    marginBottom: 16,
    width: 68
  },
  title: { fontSize: 22, fontWeight: "900" },
  subtitle: { fontSize: 15, fontWeight: "600", marginTop: 6, textAlign: "center" },
  button: { alignSelf: "stretch", marginTop: 24 }
});
