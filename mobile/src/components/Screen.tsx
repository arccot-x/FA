import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "../theme";
import { useI18n } from "../i18n";

type ScreenProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
};

export function Screen({ title, subtitle, children, action }: ScreenProps) {
  const theme = useTheme();
  const { isRTL } = useI18n();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={["top"]}>
      <Animated.View entering={FadeInDown.duration(360)} style={[styles.header, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: theme.colors.text, textAlign: isRTL ? "right" : "left" }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: theme.colors.subtleText, textAlign: isRTL ? "right" : "left" }]}>{subtitle}</Text>
          ) : null}
        </View>
        {action}
      </Animated.View>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1
  },
  header: {
    alignItems: "center",
    gap: 16,
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16
  },
  titleBlock: {
    flex: 1
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.4
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 3
  }
});
