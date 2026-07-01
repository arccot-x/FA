import { StyleSheet, View } from "react-native";
import { useTheme } from "../../theme";

export function LoadingState({ rows = 3 }: { rows?: number }) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={[styles.row, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border, borderRadius: theme.radii.lg }]}>
          <View style={[styles.icon, { backgroundColor: theme.colors.border, borderRadius: theme.radii.md }]} />
          <View style={styles.body}>
            <View style={[styles.line, { width: "62%", backgroundColor: theme.colors.border, borderRadius: theme.radii.pill }]} />
            <View style={[styles.line, styles.shortLine, { width: "38%", backgroundColor: theme.colors.border, borderRadius: theme.radii.pill }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    paddingVertical: 8
  },
  row: {
    alignItems: "center",
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 72,
    padding: 14
  },
  icon: {
    height: 42,
    width: 42
  },
  body: {
    flex: 1,
    gap: 8
  },
  line: {
    height: 12
  },
  shortLine: {
    height: 10
  }
});
