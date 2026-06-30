import { useEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Button, Field, ModalSheet } from "../components/ui";
import { useI18n } from "../i18n";
import type { User } from "../types";

type ProfileEditorModalProps = {
  visible: boolean;
  user?: User;
  onClose: () => void;
  onSave: (input: { name: string; email: string }) => Promise<void>;
};

export function ProfileEditorModal({ visible, user, onClose, onSave }: ProfileEditorModalProps) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(user?.name ?? "");
      setEmail(user?.email ?? "");
    }
  }, [visible, user]);

  const save = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedName || !trimmedEmail.includes("@")) {
      Alert.alert(t("profile.title"), t("profile.invalid"));
      return;
    }

    setSaving(true);
    try {
      await onSave({ name: trimmedName, email: trimmedEmail });
      onClose();
    } catch (error) {
      Alert.alert(t("profile.title"), error instanceof Error ? error.message : t("profile.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalSheet visible={visible} title={t("profile.title")} onClose={onClose}>
      <View style={styles.form}>
        <Field label={t("auth.name")} value={name} onChangeText={setName} autoCapitalize="words" />
        <Field label={t("auth.email")} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Button label={t("profile.save")} icon="account-check" loading={saving} onPress={() => void save()} />
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 16
  }
});
