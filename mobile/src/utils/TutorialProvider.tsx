import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import type { RefObject } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Button } from "../components/ui";
import { useI18n } from "../i18n";
import { useTheme } from "../theme";
import { navigationRef } from "./navigation";
import { PREF_KEYS, setPref } from "./prefs";

type TutorialContextValue = {
  start: () => void;
  registerTarget: (id: string, ref: RefObject<View>) => void;
  unregisterTarget: (id: string) => void;
};

type TutorialStep = {
  tab: "Home" | "Bills" | "Vault" | "Analytics" | "Settings";
  target: string;
  titleKey: string;
  bodyKey: string;
  fallback: (size: { width: number; height: number }) => TutorialRect;
};

type TutorialRect = { x: number; y: number; width: number; height: number };

const TutorialContext = createContext<TutorialContextValue | undefined>(undefined);

const steps: TutorialStep[] = [
  {
    tab: "Home",
    target: "home.quickAdd",
    titleKey: "tutorial.homeTitle",
    bodyKey: "tutorial.homeBody",
    fallback: ({ width, height }) => ({ x: width - 96, y: height - 112, width: 78, height: 78 })
  },
  {
    tab: "Bills",
    target: "bills.primary",
    titleKey: "tutorial.billsTitle",
    bodyKey: "tutorial.billsBody",
    fallback: ({ width }) => ({ x: 16, y: 108, width: width - 32, height: 150 })
  },
  {
    tab: "Vault",
    target: "vault.filters",
    titleKey: "tutorial.vaultTitle",
    bodyKey: "tutorial.vaultBody",
    fallback: ({ width }) => ({ x: 16, y: 108, width: width - 32, height: 126 })
  },
  {
    tab: "Analytics",
    target: "analytics.flow",
    titleKey: "tutorial.insightsTitle",
    bodyKey: "tutorial.insightsBody",
    fallback: ({ width }) => ({ x: 16, y: 100, width: width - 32, height: 132 })
  },
  {
    tab: "Settings",
    target: "settings.tabs",
    titleKey: "tutorial.settingsTitle",
    bodyKey: "tutorial.settingsBody",
    fallback: ({ width }) => ({ x: 16, y: 86, width: width - 32, height: 64 })
  }
];

export function TutorialProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const { t } = useI18n();
  const [index, setIndex] = useState<number | null>(null);
  const [measuredRect, setMeasuredRect] = useState<TutorialRect | null>(null);
  const targets = useRef(new Map<string, RefObject<View>>());
  const size = Dimensions.get("window");
  const current = index === null ? null : steps[index];

  const measureStep = useCallback((stepIndex: number) => {
    const step = steps[stepIndex];
    const ref = targets.current.get(step.target);
    if (!ref?.current) {
      setMeasuredRect(step.fallback(size));
      return;
    }
    ref.current.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) {
        setMeasuredRect({ x: Math.max(0, x - 6), y: Math.max(0, y - 6), width: width + 12, height: height + 12 });
      } else {
        setMeasuredRect(step.fallback(size));
      }
    });
  }, [size]);

  const goToStep = useCallback((stepIndex: number) => {
    setIndex(stepIndex);
    setMeasuredRect(null);
    navigateToStep(stepIndex);
    setTimeout(() => measureStep(stepIndex), 380);
  }, [measureStep]);

  const value = useMemo<TutorialContextValue>(
    () => ({
      start: () => {
        goToStep(0);
      },
      registerTarget: (id, ref) => {
        targets.current.set(id, ref);
      },
      unregisterTarget: (id) => {
        targets.current.delete(id);
      }
    }),
    [goToStep]
  );

  const next = () => {
    if (index === null) return;
    const nextIndex = index + 1;
    if (nextIndex >= steps.length) {
      void setPref(PREF_KEYS.tutorialCompleted, "true");
      setIndex(null);
      setMeasuredRect(null);
      return;
    }
    goToStep(nextIndex);
  };

  const skip = () => {
    void setPref(PREF_KEYS.tutorialCompleted, "true");
    setIndex(null);
    setMeasuredRect(null);
  };

  const rect = current ? measuredRect ?? current.fallback(size) : null;
  const tooltipTop = rect ? (rect.y + rect.height + 16 < size.height - 190 ? rect.y + rect.height + 16 : Math.max(64, rect.y - 152)) : 0;

  return (
    <TutorialContext.Provider value={value}>
      {children}
      {current && rect ? (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <View pointerEvents="none" style={[styles.dim, { left: 0, top: 0, right: 0, height: rect.y }]} />
          <View pointerEvents="none" style={[styles.dim, { left: 0, top: rect.y, width: rect.x, height: rect.height }]} />
          <View pointerEvents="none" style={[styles.dim, { left: rect.x + rect.width, top: rect.y, right: 0, height: rect.height }]} />
          <View pointerEvents="none" style={[styles.dim, { left: 0, top: rect.y + rect.height, right: 0, bottom: 0 }]} />
          <View pointerEvents="none" style={[styles.spotlight, { left: rect.x, top: rect.y, width: rect.width, height: rect.height, borderColor: theme.colors.accent, borderRadius: theme.radii.lg }]} />
          <View style={[styles.tooltip, { top: tooltipTop, left: 16, right: 16, backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderRadius: theme.radii.lg, ...theme.shadow("lg") }]}>
            <Text style={[styles.tooltipTitle, { color: theme.colors.text }]}>{t(current.titleKey as never)}</Text>
            <Text style={[styles.tooltipBody, { color: theme.colors.subtleText }]}>{t(current.bodyKey as never)}</Text>
            <View style={styles.tooltipActions}>
              <Button label={t("tutorial.skip")} variant="ghost" onPress={skip} style={styles.tooltipButton} />
              <Button label={index === steps.length - 1 ? t("tutorial.finish") : t("tutorial.next")} icon="chevron-right" onPress={next} style={styles.tooltipButton} />
            </View>
          </View>
        </View>
      ) : null}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const value = useContext(TutorialContext);
  if (!value) {
    throw new Error("useTutorial must be used inside TutorialProvider");
  }
  return value;
}

export function TutorialTarget({ id, children, style }: { id: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const ref = useRef<View>(null);
  const tutorial = useTutorial();

  useEffect(() => {
    tutorial.registerTarget(id, ref);
    return () => tutorial.unregisterTarget(id);
  }, [id, tutorial]);

  return (
    <View ref={ref} collapsable={false} style={style}>
      {children}
    </View>
  );
}

function navigateToStep(index: number) {
  const step = steps[index];
  if (!navigationRef.isReady()) return;
  navigationRef.navigate("MainTabs", { screen: step.tab } as never);
}

const styles = StyleSheet.create({
  dim: {
    backgroundColor: "rgba(0,0,0,0.68)",
    position: "absolute"
  },
  spotlight: {
    borderWidth: 3,
    position: "absolute"
  },
  tooltip: {
    borderWidth: 1,
    padding: 16,
    position: "absolute"
  },
  tooltipTitle: {
    fontSize: 18,
    fontWeight: "900"
  },
  tooltipBody: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    marginTop: 6
  },
  tooltipActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14
  },
  tooltipButton: {
    flex: 1,
    minHeight: 46
  }
});
