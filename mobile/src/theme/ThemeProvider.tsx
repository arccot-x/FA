import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Appearance, StyleSheet } from "react-native";
import { buildTheme } from "./tokens";
import type { ColorScheme, Theme } from "./tokens";
import { getPref, PREF_KEYS, setPref } from "../utils/prefs";

export type ThemeMode = "system" | "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  mode: ThemeMode;
  scheme: ColorScheme;
  setMode: (mode: ThemeMode) => void;
  ready: boolean;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function resolveScheme(mode: ThemeMode, system: ColorScheme): ColorScheme {
  return mode === "system" ? system : mode;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [systemScheme, setSystemScheme] = useState<ColorScheme>(Appearance.getColorScheme() === "dark" ? "dark" : "light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const stored = (await getPref(PREF_KEYS.themeMode)) as ThemeMode | null;
      if (stored === "light" || stored === "dark" || stored === "system") {
        setModeState(stored);
      }
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme === "dark" ? "dark" : "light");
    });
    return () => sub.remove();
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    void setPref(PREF_KEYS.themeMode, next);
  }, []);

  const scheme = resolveScheme(mode, systemScheme);
  const theme = useMemo(() => buildTheme(scheme), [scheme]);

  const value = useMemo<ThemeContextValue>(() => ({ theme, mode, scheme, setMode, ready }), [theme, mode, scheme, setMode, ready]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeContext must be used within a ThemeProvider");
  }
  return ctx;
}

export function useTheme(): Theme {
  return useThemeContext().theme;
}

/**
 * Build a StyleSheet from the active theme, memoised per theme object.
 * Usage: const styles = useThemedStyles(createStyles)
 */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => StyleSheet.create(factory(theme)), [theme, factory]);
}
