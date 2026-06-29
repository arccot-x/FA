import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useTheme } from "../../theme";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

type EmptyStateProps = {
  icon: IconName;
  message: string;
};

export function EmptyState({ icon, message }: EmptyStateProps) {
  const theme = useTheme();
  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: theme.colors.primarySoft, borderRadius: theme.radii.lg }]}>
        <MaterialCommunityIcons color={theme.colors.primary} name={icon} size={30} />
      </View>
      <Text style={[styles.message, { color: theme.colors.subtleText }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 40
  },
  iconWrap: {
    alignItems: "center",
    height: 64,
    justifyContent: "center",
    width: 64
  },
  message: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center"
  }
});
