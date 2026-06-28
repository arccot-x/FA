import { StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../theme";

type MetricTileProps = {
  label: string;
  value: string;
  tone?: "primary" | "danger" | "neutral";
};

export function MetricTile({ label, value, tone = "neutral" }: MetricTileProps) {
  const color = tone === "primary" ? colors.primary : tone === "danger" ? colors.danger : colors.text;

  return (
    <View style={styles.tile}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 82,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    padding: spacing.md
  },
  label: {
    color: colors.subtleText,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  value: {
    fontSize: 21,
    fontWeight: "800",
    marginTop: spacing.xs
  }
});

