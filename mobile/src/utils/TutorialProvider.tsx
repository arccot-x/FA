import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { InteractionManager, Modal, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import type { RefObject } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Button } from "../components/ui";
import { useI18n } from "../i18n";
import { useTheme } from "../theme";
import { navigationRef } from "./navigation";
import { getPref, PREF_KEYS, setPref } from "./prefs";

type TutorialContextValue = {
  start: () => void;
  registerTarget: (id: string, ref: RefObject<View>, options?: TutorialTargetOptions) => void;
  unregisterTarget: (id: string) => void;
};

type TutorialTargetOptions = {
  prepare?: () => void | Promise<void>;
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
  const size = useWindowDimensions();
  const [index, setIndex] = useState<number | null>(null);
  const [measuredRect, setMeasuredRect] = useState<TutorialRect | null>(null);
  const [tooltipHeight, setTooltipHeight] = useState(0);
  const [promptVisible, setPromptVisible] = useState(false);
  const activeIndexRef = useRef<number | null>(null);
  const rootRef = useRef<View>(null);
  const targets = useRef(new Map<string, { ref: RefObject<View>; options?: TutorialTargetOptions }>());
  const current = index === null ? null : steps[index];

  const measureStep = useCallback((stepIndex: number) => {
    if (activeIndexRef.current !== stepIndex) return;
    const step = steps[stepIndex];
    const registered = targets.current.get(step.target);
    const ref = registered?.ref;
    if (!ref?.current) {
      setMeasuredRect(step.fallback(size));
      return;
    }
    if (!rootRef.current) {
      setMeasuredRect(step.fallback(size));
      return;
    }
    rootRef.current.measureInWindow((rootX, rootY) => {
      ref.current?.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          const padding = 6;
          const nextX = Math.max(0, x - rootX - padding);
          const nextY = Math.max(0, y - rootY - padding);
          const next = {
            x: nextX,
            y: nextY,
            width: Math.max(0, Math.min(size.width - nextX, width + padding * 2)),
            height: Math.max(0, Math.min(size.height - nextY, height + padding * 2))
          };
          setMeasuredRect(next);
        } else {
          setMeasuredRect(step.fallback(size));
        }
      });
    });
  }, [size]);

  const queueMeasurements = useCallback((stepIndex: number) => {
    const delays = [0, 80, 220, 420, 700, 1000];
    const timers = delays.map((delay) => setTimeout(() => measureStep(stepIndex), delay));
    return () => timers.forEach(clearTimeout);
  }, [measureStep]);

  const goToStep = useCallback((stepIndex: number) => {
    activeIndexRef.current = stepIndex;
    setIndex(stepIndex);
    setMeasuredRect(null);
    setTooltipHeight(0);
    navigateToStep(stepIndex);
    InteractionManager.runAfterInteractions(() => {
      void Promise.resolve(targets.current.get(steps[stepIndex].target)?.options?.prepare?.()).finally(() => {
        queueMeasurements(stepIndex);
      });
    });
  }, [queueMeasurements]);

  const value = useMemo<TutorialContextValue>(
    () => ({
      start: () => {
        setPromptVisible(false);
        goToStep(0);
      },
      registerTarget: (id, ref, options) => {
        targets.current.set(id, { ref, options });
      },
      unregisterTarget: (id) => {
        targets.current.delete(id);
      }
    }),
    [goToStep]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      void (async () => {
        const completed = await getPref(PREF_KEYS.tutorialCompleted);
        const prompted = await getPref(PREF_KEYS.tutorialPrompted);
        if (completed !== "true" && prompted !== "true") {
          setPromptVisible(true);
        }
      })();
    }, 900);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (index === null) return;
    const stopInitialMeasurements = queueMeasurements(index);
    const interval = setInterval(() => measureStep(index), 250);
    return () => {
      stopInitialMeasurements();
      clearInterval(interval);
    };
  }, [index, measureStep, queueMeasurements]);

  const dismissPrompt = () => {
    void setPref(PREF_KEYS.tutorialPrompted, "true");
    setPromptVisible(false);
  };

  const startFromPrompt = () => {
    void setPref(PREF_KEYS.tutorialPrompted, "true");
    value.start();
  };

  const next = () => {
    if (index === null) return;
    const nextIndex = index + 1;
    if (nextIndex >= steps.length) {
      void setPref(PREF_KEYS.tutorialCompleted, "true");
      activeIndexRef.current = null;
      setIndex(null);
      setMeasuredRect(null);
      setTooltipHeight(0);
      return;
    }
    goToStep(nextIndex);
  };

  const back = () => {
    if (index === null || index <= 0) return;
    goToStep(index - 1);
  };

  const skip = () => {
    void setPref(PREF_KEYS.tutorialCompleted, "true");
    activeIndexRef.current = null;
    setIndex(null);
    setMeasuredRect(null);
    setTooltipHeight(0);
  };

  const rect = current ? measuredRect ?? current.fallback(size) : null;
  const tooltipTop = rect ? (rect.y + rect.height + 16 < size.height - 190 ? rect.y + rect.height + 16 : Math.max(64, rect.y - 152)) : 0;
  const tooltipBottom = tooltipTop + tooltipHeight;
  const connector =
    rect && tooltipHeight > 0
      ? tooltipTop > rect.y
        ? {
            top: rect.y + rect.height,
            height: Math.max(0, tooltipTop - (rect.y + rect.height)),
            dotTop: rect.y + rect.height - 5
          }
        : {
            top: tooltipBottom,
            height: Math.max(0, rect.y - tooltipBottom),
            dotTop: rect.y - 5
          }
      : null;
  const connectorLeft = rect ? Math.max(24, Math.min(size.width - 24, rect.x + rect.width / 2)) : 0;

  return (
    <TutorialContext.Provider value={value}>
      <View ref={rootRef} collapsable={false} style={styles.root}>
        {children}
      </View>
      <Modal transparent animationType="fade" visible={promptVisible} onRequestClose={dismissPrompt} statusBarTranslucent>
        <View style={styles.promptBackdrop}>
          <View style={[styles.promptCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderRadius: theme.radii.lg, ...theme.shadow("lg") }]}>
            <Text style={[styles.tooltipTitle, { color: theme.colors.text }]}>{t("tutorial.promptTitle")}</Text>
            <Text style={[styles.tooltipBody, { color: theme.colors.subtleText }]}>{t("tutorial.promptBody")}</Text>
            <View style={styles.tooltipActions}>
              <Button label={t("tutorial.skip")} variant="ghost" onPress={dismissPrompt} style={styles.tooltipButton} />
              <Button label={t("help.startTutorial")} icon="play-circle-outline" onPress={startFromPrompt} style={styles.tooltipButton} />
            </View>
          </View>
        </View>
      </Modal>
      {current && rect ? (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <View style={[styles.dim, { left: 0, top: 0, right: 0, height: rect.y }]} />
            <View style={[styles.dim, { left: 0, top: rect.y, width: rect.x, height: rect.height }]} />
            <View style={[styles.dim, { left: rect.x + rect.width, top: rect.y, right: 0, height: rect.height }]} />
            <View style={[styles.dim, { left: 0, top: rect.y + rect.height, right: 0, bottom: 0 }]} />
            <View style={[styles.spotlight, { left: rect.x, top: rect.y, width: rect.width, height: rect.height, borderColor: theme.colors.accent, borderRadius: theme.radii.lg }]} />
            {connector && connector.height > 8 ? (
              <>
                <View style={[styles.connectorLine, { left: connectorLeft - 1, top: connector.top + 4, height: connector.height - 8, backgroundColor: theme.colors.accent }]} />
                <View style={[styles.connectorDot, { left: connectorLeft - 5, top: connector.dotTop, backgroundColor: theme.colors.accent }]} />
              </>
            ) : null}
          </View>
          <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
            <View onLayout={(event) => setTooltipHeight(event.nativeEvent.layout.height)} style={[styles.tooltip, { top: tooltipTop, left: 16, right: 16, backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderRadius: theme.radii.lg, ...theme.shadow("lg") }]}>
              <Text style={[styles.stepCount, { color: theme.colors.muted }]}>{t("tutorial.stepCount" as never, { current: (index ?? 0) + 1, total: steps.length } as never)}</Text>
              <Text style={[styles.tooltipTitle, { color: theme.colors.text }]}>{t(current.titleKey as never)}</Text>
              <Text style={[styles.tooltipBody, { color: theme.colors.subtleText }]}>{t(current.bodyKey as never)}</Text>
              <View style={styles.tooltipActions}>
                <Button label={t("tutorial.back" as never)} icon="chevron-left" variant="secondary" onPress={back} disabled={index === 0} style={styles.tooltipButton} />
                <Button label={index === steps.length - 1 ? t("tutorial.finish") : t("tutorial.next")} icon="chevron-right" onPress={next} style={styles.tooltipButton} />
              </View>
              <Button label={t("tutorial.skip")} variant="ghost" onPress={skip} style={styles.skipButton} />
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

export function TutorialTarget({ id, children, style, prepare }: { id: string; children: ReactNode; style?: StyleProp<ViewStyle>; prepare?: () => void }) {
  const ref = useRef<View>(null);
  const tutorial = useTutorial();

  useEffect(() => {
    tutorial.registerTarget(id, ref, { prepare });
    return () => tutorial.unregisterTarget(id);
  }, [id, prepare, tutorial]);

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
  root: {
    flex: 1
  },
  dim: {
    backgroundColor: "rgba(0,0,0,0.68)",
    position: "absolute"
  },
  spotlight: {
    borderWidth: 3,
    position: "absolute"
  },
  connectorDot: {
    borderRadius: 999,
    height: 10,
    position: "absolute",
    width: 10
  },
  connectorLine: {
    opacity: 0.88,
    position: "absolute",
    width: 2
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
  stepCount: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.4,
    marginBottom: 8,
    textTransform: "uppercase"
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
  },
  skipButton: {
    marginTop: 10,
    minHeight: 42
  },
  promptBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.56)",
    flex: 1,
    justifyContent: "center",
    padding: 20
  },
  promptCard: {
    borderWidth: 1,
    padding: 18,
    width: "100%"
  }
});
