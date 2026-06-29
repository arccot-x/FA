import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Button, Field, ModalSheet } from "../components/ui";
import { useFinanceStore } from "../store/useFinanceStore";
import { useI18n } from "../i18n";
import { useTheme } from "../theme";

export function ChangePasswordModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const theme = useTheme();
  const changePassword = useFinanceStore((state) => state.changePassword);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const submit = async () => {
    if (current.length < 1 || next.length < 8) {
      setError(t("auth.invalidLogin"));
      return;
    }
    setError(undefined);
    setSaving(true);
    try {
      await changePassword({ currentPassword: current, newPassword: next });
      setCurrent("");
      setNext("");
      onClose();
      Alert.alert(t("account.passwordChanged"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("auth.genericError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalSheet visible={visible} title={t("account.changePassword")} onClose={onClose}>
      <View style={styles.form}>
        <Field label={t("account.currentPassword")} secureTextEntry autoCapitalize="none" value={current} onChangeText={setCurrent} />
        <Field label={t("account.newPassword")} secureTextEntry autoCapitalize="none" value={next} onChangeText={setNext} />
        {error ? <Text style={[styles.error, { color: theme.colors.danger }]}>{error}</Text> : null}
        <Button label={t("common.save")} icon="content-save" onPress={submit} loading={saving} style={styles.save} />
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  save: { marginTop: 4 },
  error: { fontSize: 13, fontWeight: "700" }
});
