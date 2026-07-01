import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button, Field, FormMessage, ModalSheet } from "../components/ui";
import { useFinanceStore } from "../store/useFinanceStore";
import { useTheme } from "../theme";
import { useI18n } from "../i18n";
import { useAsyncAction } from "../utils/useAsyncAction";
import { useToast } from "../utils/ToastProvider";

const isStrongPassword = (value: string) => value.length >= 10 && /[A-Za-z]/.test(value) && /[0-9]/.test(value);

export function ChangePasswordModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const theme = useTheme();
  const { showToast } = useToast();
  const changePassword = useFinanceStore((state) => state.changePassword);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const { loading: saving, error, setError, run } = useAsyncAction();

  const submit = async () => {
    if (current.length < 1 || !isStrongPassword(next)) {
      setError(t("auth.invalidReset"));
      return;
    }
    const changed = await run(
      async () => {
        await changePassword({ currentPassword: current, newPassword: next });
        return true;
      },
      t("auth.genericError")
    );
    if (changed !== undefined) {
      setCurrent("");
      setNext("");
      onClose();
      showToast(t("account.passwordChanged"));
    }
  };

  return (
    <ModalSheet visible={visible} title={t("account.changePassword")} onClose={onClose}>
      <View style={styles.form}>
        <Field label={t("account.currentPassword")} secureTextEntry autoCapitalize="none" value={current} onChangeText={setCurrent} error={current.length < 1 && error ? t("common.requiredField") : undefined} />
        <Field label={t("account.newPassword")} secureTextEntry autoCapitalize="none" value={next} onChangeText={setNext} error={next.length > 0 && !isStrongPassword(next) && error ? error : undefined} />
        <Text style={[styles.hint, { color: theme.colors.subtleText }]}>{t("auth.passwordHint")}</Text>
        <FormMessage message={error && !(current.length < 1 || (next.length > 0 && !isStrongPassword(next))) ? error : undefined} />
        <Button label={t("common.save")} icon="content-save" onPress={submit} loading={saving} style={styles.save} />
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  hint: { fontSize: 12, fontWeight: "600", marginTop: -10 },
  save: { marginTop: 4 }
});
