import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { MaterialTopTabBarProps } from "@react-navigation/material-top-tabs";
import { useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import { PressableScale } from "./ui/PressableScale";
import { useTheme } from "../theme";
import { useI18n } from "../i18n";

const icons: Record<string, string> = {
  Home: "view-dashboard",
  Bills: "calendar-check",
  Vault: "folder-lock",
  Analytics: "chart-arc",
  Settings: "cog"
};

const labelKeys: Record<string, string> = {
  Home: "tabs.home",
  Bills: "tabs.bills",
  Vault: "tabs.vault",
  Analytics: "tabs.analytics",
  Settings: "tabs.settings"
};

export function AppTabBar({ state, navigation }: MaterialTopTabBarProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);

  const tabCount = state.routes.length;
  const tabWidth = width > 0 ? width / tabCount : 0;

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withTiming(state.index * tabWidth, { duration: 220 }) }]
  }));

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.bar,
        {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          paddingBottom: Math.max(insets.bottom, 8)
        }
      ]}
    >
      {tabWidth > 0 ? (
        <Animated.View style={[styles.indicatorWrap, indicatorStyle, { width: tabWidth }]} pointerEvents="none">
          <View style={[styles.indicator, { backgroundColor: theme.colors.primarySoft, borderRadius: theme.radii.pill }]} />
        </Animated.View>
      ) : null}

      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const color = focused ? theme.colors.primary : theme.colors.muted;

        const onPress = () => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <PressableScale key={route.key} accessibilityRole="button" accessibilityState={{ selected: focused }} onPress={onPress} scaleTo={0.9} style={styles.tab}>
            <MaterialCommunityIcons color={color} name={(icons[route.name] ?? "circle") as never} size={24} />
            <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.label, { color }]}>
              {t(labelKeys[route.name] as never)}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingTop: 8
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    minWidth: 0,
    paddingVertical: 2
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    maxWidth: "100%"
  },
  indicatorWrap: {
    position: "absolute",
    top: 6,
    bottom: 0,
    left: 0,
    alignItems: "center"
  },
  indicator: {
    height: 34,
    width: 56
  }
});
