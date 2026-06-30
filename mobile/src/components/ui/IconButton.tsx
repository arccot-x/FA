import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { PressableScale } from "./PressableScale";
import { useTheme } from "../../theme";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];
type Tone = "surface" | "primary" | "accent" | "danger";

type IconButtonProps = {
  icon: IconName;
  onPress: () => void;
  tone?: Tone;
  size?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({ icon, onPress, tone = "surface", size = 46, accessibilityLabel, style }: IconButtonProps) {
  const theme = useTheme();

  const tones: Record<Tone, { bg: string; fg: string; border: string }> = {
    surface: { bg: theme.colors.surface, fg: theme.colors.text, border: theme.colors.border },
    primary: { bg: theme.colors.primary, fg: theme.colors.onPrimary, border: theme.colors.primary },
    accent: { bg: theme.colors.accent, fg: "#FFFFFF", border: theme.colors.accent },
    danger: { bg: theme.colors.dangerSoft, fg: theme.colors.danger, border: theme.colors.dangerSoft }
  };

  const palette = tones[tone];

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[
        {
          alignItems: "center",
          justifyContent: "center",
          height: size,
          width: size,
          borderRadius: theme.radii.md,
          backgroundColor: palette.bg,
          borderWidth: 1,
          borderColor: palette.border
        },
        style
      ]}
    >
      <MaterialCommunityIcons color={palette.fg} name={icon} size={size * 0.5} />
    </PressableScale>
  );
}
