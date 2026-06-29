import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];
type Tone = "primary" | "danger" | "neutral" | "accent";

type MetricTileProps = {
  label: string;
  value: string;
  icon?: IconName;
  tone?: Tone;
};

export function MetricTile({ label, value, icon, tone = "neutral" }: MetricTileProps) {
  const theme = useTheme();

  const toneColor: Record<Tone, string> = {
    primary: theme.colors.primary,
    danger: theme.colors.danger,
    accent: theme.colors.accent,
    neutral: theme.colors.text
  };
  const toneSoft: Record<Tone, string> = {
    primary: theme.colors.primarySoft,
    danger: theme.colors.dangerSoft,
    accent: theme.colors.accentSoft,
    neutral: theme.colors.surfaceAlt
  };

  return (
    <View
      style={[
        styles.tile,
        { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderRadius: theme.radii.lg, ...theme.shadow("sm") }
      ]}
    >
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: toneSoft[tone], borderRadius: theme.radii.sm }]}>
          <MaterialCommunityIcons color={toneColor[tone]} name={icon} size={18} />
        </View>
      ) : null}
      <Text style={[styles.label, { color: theme.colors.subtleText }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.value, { color: toneColor[tone] }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 96,
    borderWidth: 1,
    justifyContent: "center",
    gap: 6,
    padding: 16
  },
  iconWrap: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    width: 32
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3
  },
  value: {
    fontSize: 22,
    fontWeight: "800"
  }
});
