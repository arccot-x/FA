import { useEffect, useState } from "react";
import { Alert, Image, StyleSheet, Text, View } from "react-native";
import { Button, Field, ModalSheet } from "../components/ui";
import { useI18n } from "../i18n";
import { useTheme } from "../theme";
import type { User } from "../types";

type ProfileEditorModalProps = {
  visible: boolean;
  user?: User;
  onClose: () => void;
  onSave: (input: { name: string; email: string; phoneNumber?: string | null; avatarUrl?: string | null; householdRole?: string | null }) => Promise<void>;
};

export function ProfileEditorModal({ visible, user, onClose, onSave }: ProfileEditorModalProps) {
  const { t } = useI18n();
  const theme = useTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [householdRole, setHouseholdRole] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(user?.name ?? "");
      setEmail(user?.email ?? "");
      setPhoneNumber(user?.phoneNumber ?? "");
      setAvatarUrl(user?.avatarUrl ?? "");
      setHouseholdRole(user?.householdRole ?? "");
    }
  }, [visible, user]);

  const save = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedName || !trimmedEmail.includes("@")) {
      Alert.alert(t("profile.title"), t("profile.invalid"));
      return;
    }
    const trimmedAvatar = avatarUrl.trim();
    if (trimmedAvatar && !/^https?:\/\//i.test(trimmedAvatar)) {
      Alert.alert(t("profile.title"), t("profile.avatarInvalid"));
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: trimmedName,
        email: trimmedEmail,
        phoneNumber: phoneNumber.trim() || null,
        avatarUrl: trimmedAvatar || null,
        householdRole: householdRole.trim() || null
      });
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
        <View style={styles.previewRow}>
          {avatarUrl.trim() ? (
            <Image source={{ uri: avatarUrl.trim() }} style={[styles.avatar, { backgroundColor: theme.colors.surfaceAlt }]} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.colors.primarySoft }]}>
              <Text style={[styles.avatarText, { color: theme.colors.primary }]}>{(name || email || "?").slice(0, 1).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.previewText}>
            <Text style={[styles.previewName, { color: theme.colors.text }]} numberOfLines={1}>{name || t("profile.title")}</Text>
            <Text style={[styles.previewMeta, { color: theme.colors.subtleText }]} numberOfLines={1}>{householdRole || t("profile.rolePlaceholder")}</Text>
          </View>
        </View>
        <Field label={t("auth.name")} value={name} onChangeText={setName} autoCapitalize="words" />
        <Field label={t("auth.email")} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Field label={t("profile.phone")} value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" />
        <Field label={t("profile.role")} value={householdRole} onChangeText={setHouseholdRole} placeholder={t("profile.rolePlaceholder")} />
        <Field label={t("profile.avatarUrl")} value={avatarUrl} onChangeText={setAvatarUrl} autoCapitalize="none" keyboardType="url" placeholder="https://..." />
        <Button label={t("profile.save")} icon="account-check" loading={saving} onPress={() => void save()} />
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 16
  },
  previewRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12
  },
  avatar: {
    borderRadius: 28,
    height: 56,
    width: 56
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: {
    fontSize: 22,
    fontWeight: "900"
  },
  previewText: {
    flex: 1,
    minWidth: 0
  },
  previewName: {
    fontSize: 17,
    fontWeight: "900"
  },
  previewMeta: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2
  }
});
