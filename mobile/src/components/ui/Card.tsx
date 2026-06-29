import type { ReactNode } from "react";
import { View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { useTheme } from "../../theme";
import type { Elevation } from "../../theme";

type CardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  elevation?: Elevation;
};

export function Card({ children, style, padded = true, elevation = "sm" }: CardProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.card,
          borderRadius: theme.radii.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: padded ? theme.spacing.md : 0,
          ...theme.shadow(elevation)
        },
        style
      ]}
    >
      {children}
    </View>
  );
}
