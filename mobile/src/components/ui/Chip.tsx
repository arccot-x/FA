import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { StyleSheet, Text } from "react-native";
import { PressableScale } from "./PressableScale";
import { useTheme } from "../../theme";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

type ChipProps = {
  label?: string;
  icon?: IconName;
  selected: boolean;
  onPress: () => void;
  basis?: string | number;
};

export function Chip({ label, icon, selected, onPress, basis = "31%" }: ChipProps) {
  const theme = useTheme();

  return (
    <PressableScale
      onPress={onPress}
      style={[
        styles.chip,
        {
          flexBasis: basis as number,
          backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          borderRadius: theme.radii.md,
          minHeight: label ? 68 : 48
        }
      ]}
    >
      {icon ? <MaterialCommunityIcons color={selected ? theme.colors.onPrimary : theme.colors.primary} name={icon} size={22} /> : null}
      {label ? (
        <Text style={[styles.label, { color: selected ? theme.colors.onPrimary : theme.colors.text }]} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: "center",
    borderWidth: 1,
    gap: 4,
    justifyContent: "center",
    paddingHorizontal: 4
  },
  label: {
    fontSize: 11.5,
    fontWeight: "800",
    textAlign: "center"
  }
});
