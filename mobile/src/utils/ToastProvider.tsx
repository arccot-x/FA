import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme";

type ToastTone = "success" | "error" | "info";
type Toast = { id: number; message: string; tone: ToastTone };
type ToastContextValue = {
  showToast: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<Toast | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, tone: ToastTone = "success") => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast({ id: Date.now(), message, tone });
    timeoutRef.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);
  const toneColor = toast?.tone === "error" ? theme.colors.danger : toast?.tone === "info" ? theme.colors.primary : theme.colors.success;
  const toneBg = toast?.tone === "error" ? theme.colors.dangerSoft : toast?.tone === "info" ? theme.colors.primarySoft : theme.colors.successSoft;
  const icon = toast?.tone === "error" ? "alert-circle-outline" : toast?.tone === "info" ? "information-outline" : "check-circle-outline";

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <View pointerEvents="box-none" style={[styles.host, { top: insets.top + 10 }]}>
          <Animated.View
            key={toast.id}
            entering={FadeInDown.duration(180)}
            exiting={FadeOutUp.duration(160)}
            style={[styles.toast, { backgroundColor: toneBg, borderColor: toneColor, borderRadius: theme.radii.lg, ...theme.shadow("lg") }]}
          >
            <MaterialCommunityIcons color={toneColor} name={icon} size={20} />
            <Text numberOfLines={2} style={[styles.message, { color: theme.colors.text }]}>
              {toast.message}
            </Text>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return value;
}

const styles = StyleSheet.create({
  host: {
    left: 16,
    position: "absolute",
    right: 16,
    zIndex: 50
  },
  toast: {
    alignItems: "center",
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  message: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18
  }
});
