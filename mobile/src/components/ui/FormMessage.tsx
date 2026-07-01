import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../theme";

type FormMessageProps = {
  message?: string;
  tone?: "error" | "info";
};

export function FormMessage({ message, tone = "error" }: FormMessageProps) {
  const theme = useTheme();
  if (!message) return null;

  const color = tone === "error" ? theme.colors.danger : theme.colors.primary;
  const backgroundColor = tone === "error" ? theme.colors.dangerSoft : theme.colors.primarySoft;

  return (
    <View style={[styles.container, { backgroundColor, borderRadius: theme.radii.md }]}>
      <MaterialCommunityIcons color={color} name={tone === "error" ? "alert-circle-outline" : "information-outline"} size={18} />
      <Text style={[styles.text, { color }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18
  }
});
