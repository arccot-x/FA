import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import type { ComponentProps } from "react";
import { PressableScale } from "./PressableScale";
import { useTheme } from "../../theme";
import { tapLight } from "../../utils/haptics";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];
type Variant = "primary" | "secondary" | "danger" | "ghost";

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, variant = "primary", icon, loading, disabled, style }: ButtonProps) {
  const theme = useTheme();

  const palette: Record<Variant, { bg: string; fg: string; border: string }> = {
    primary: { bg: theme.colors.primary, fg: theme.colors.onPrimary, border: theme.colors.primary },
    secondary: { bg: theme.colors.surfaceAlt, fg: theme.colors.text, border: theme.colors.border },
    danger: { bg: theme.colors.dangerSoft, fg: theme.colors.danger, border: theme.colors.dangerSoft },
    ghost: { bg: "transparent", fg: theme.colors.text, border: theme.colors.border }
  };

  const tones = palette[variant];
  const isDisabled = disabled || loading;

  return (
    <PressableScale
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={() => {
        tapLight();
        onPress();
      }}
      style={[
        styles.base,
        {
          backgroundColor: tones.bg,
          borderColor: tones.border,
          borderRadius: theme.radii.md,
          opacity: isDisabled ? 0.6 : 1,
          ...(variant === "primary" ? theme.shadow("sm") : {})
        },
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={tones.fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <MaterialCommunityIcons color={tones.fg} name={icon} size={20} /> : null}
          <Text style={[styles.label, { color: tones.fg }]}>{label}</Text>
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 54
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  label: {
    fontSize: 16,
    fontWeight: "800"
  }
});
