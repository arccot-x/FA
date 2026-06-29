import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { PressableScale } from "./PressableScale";
import { useTheme } from "../../theme";

type ModalSheetProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  scroll?: boolean;
};

export function ModalSheet({ visible, title, onClose, children, scroll = true }: ModalSheetProps) {
  const theme = useTheme();

  const body = (
    <View style={styles.body}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
        <PressableScale
          accessibilityRole="button"
          onPress={onClose}
          style={[styles.closeButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radii.md }]}
        >
          <MaterialCommunityIcons color={theme.colors.text} name="close" size={22} />
        </PressableScale>
      </View>
      {children}
    </View>
  );

  return (
    <Modal animationType="slide" visible={visible} onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={["top", "bottom"]}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
          {scroll ? <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">{body}</ScrollView> : body}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20
  },
  title: {
    fontSize: 24,
    fontWeight: "900"
  },
  closeButton: {
    alignItems: "center",
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44
  }
});
