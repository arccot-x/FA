import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Field, FormMessage, ModalSheet } from "../components/ui";
import { useFinanceStore } from "../store/useFinanceStore";
import { useI18n } from "../i18n";
import { useAsyncAction } from "../utils/useAsyncAction";
import { useToast } from "../utils/ToastProvider";

export function ChangePasswordModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const { showToast } = useToast();
  const changePassword = useFinanceStore((state) => state.changePassword);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const { loading: saving, error, setError, run } = useAsyncAction();

  const submit = async () => {
    if (current.length < 1 || next.length < 8) {
      setError(t("auth.invalidLogin"));
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
        <Field label={t("account.newPassword")} secureTextEntry autoCapitalize="none" value={next} onChangeText={setNext} error={next.length > 0 && next.length < 8 && error ? error : undefined} />
        <FormMessage message={error && !(current.length < 1 || (next.length > 0 && next.length < 8)) ? error : undefined} />
        <Button label={t("common.save")} icon="content-save" onPress={submit} loading={saving} style={styles.save} />
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  save: { marginTop: 4 }
});
