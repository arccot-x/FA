import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Button, Field } from "../components/ui";
import { useFinanceStore } from "../store/useFinanceStore";
import { useI18n } from "../i18n";
import { useTheme } from "../theme";
import { useSubscription } from "../utils/SubscriptionProvider";

export function FamilySection() {
  const theme = useTheme();
  const { t } = useI18n();
  const { user, family, familyInvites, createFamily, inviteFamilyMember, acceptInvite, declineInvite, leaveFamily, deleteFamily } = useFinanceStore();
  const { plan } = useSubscription();

  const [name, setName] = useState("");
  const [inviteId, setInviteId] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      Alert.alert(t("family.title"), e instanceof Error ? e.message : t("auth.genericError"));
    } finally {
      setBusy(false);
    }
  };

  const isOwner = family?.role === "OWNER";
  const memberCount = family?.members.length ?? 1;
  const canInvite = memberCount < plan.memberLimit;

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderRadius: theme.radii.lg, ...theme.shadow("sm") }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>{t("family.title")}</Text>

      {/* Your account ID (always shown so others can invite you) */}
      <Text style={[styles.label, { color: theme.colors.subtleText }]}>{t("family.yourId")}</Text>
      <View style={[styles.idBox, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border, borderRadius: theme.radii.md }]}>
        <Text selectable style={[styles.idText, { color: theme.colors.text }]}>
          {user?.id ?? ""}
        </Text>
      </View>
      <Text style={[styles.hint, { color: theme.colors.muted }]}>{t("family.yourIdHint")}</Text>

      {/* Pending invitations to me */}
      {familyInvites.length > 0 ? (
        <View style={styles.block}>
          <Text style={[styles.label, { color: theme.colors.subtleText }]}>{t("family.invitesTitle")}</Text>
          {familyInvites.map((invite) => (
            <View key={invite.memberId} style={[styles.inviteRow, { borderColor: theme.colors.border, borderRadius: theme.radii.md }]}>
              <Text style={[styles.inviteName, { color: theme.colors.text }]} numberOfLines={1}>
                {t("family.invitedToFamily", { name: invite.familyName })}
              </Text>
              <View style={styles.inviteActions}>
                <Button label={t("family.accept")} onPress={() => void run(() => acceptInvite(invite.memberId))} style={styles.inviteBtn} />
                <Button label={t("family.decline")} variant="secondary" onPress={() => void run(() => declineInvite(invite.memberId))} style={styles.inviteBtn} />
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {family ? (
        <View style={styles.block}>
          <View style={styles.familyHeader}>
            <MaterialCommunityIcons color={theme.colors.primary} name="home-group" size={22} />
            <Text style={[styles.familyName, { color: theme.colors.text }]}>{family.name}</Text>
          </View>

          <Text style={[styles.label, { color: theme.colors.subtleText, marginTop: 12 }]}>{t("family.members")}</Text>
          <Text style={[styles.hint, { color: theme.colors.muted }]}>
            {t("family.planLimit", { plan: plan.name, count: plan.memberLimit })}
          </Text>
          {family.members.map((m) => (
            <View key={m.userId} style={styles.memberRow}>
              <View style={[styles.avatar, { backgroundColor: theme.colors.primarySoft }]}>
                <Text style={[styles.avatarText, { color: theme.colors.primary }]}>{(m.name || m.email || "?").slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={styles.memberBody}>
                <Text style={[styles.memberName, { color: theme.colors.text }]} numberOfLines={1}>
                  {m.name}
                </Text>
                <Text style={[styles.memberMeta, { color: theme.colors.subtleText }]}>
                  {m.role === "OWNER" ? t("family.owner") : m.status === "PENDING" ? t("family.pending") : t("family.member")}
                </Text>
              </View>
            </View>
          ))}

          {isOwner ? (
            <View style={styles.block}>
              <Field label={t("family.inviteId")} placeholder={t("family.invitePlaceholder")} autoCapitalize="none" autoCorrect={false} value={inviteId} onChangeText={setInviteId} />
              {!canInvite ? <Text style={[styles.hint, { color: theme.colors.danger }]}>{t("family.limitReached")}</Text> : null}
              <Button
                label={t("family.invite")}
                icon="account-plus"
                onPress={() =>
                  void run(async () => {
                    if (!canInvite) {
                      throw new Error(t("family.limitReached"));
                    }
                    await inviteFamilyMember(inviteId.trim(), plan.memberLimit);
                    setInviteId("");
                    Alert.alert(t("family.title"), t("family.invited"));
                  })
                }
                disabled={!canInvite || !inviteId.trim()}
                loading={busy}
                style={styles.spaced}
              />
            </View>
          ) : null}

          <Button
            label={isOwner ? t("family.delete") : t("family.leave")}
            icon={isOwner ? "trash-can-outline" : "logout"}
            variant="danger"
            onPress={() =>
              Alert.alert(isOwner ? t("family.deleteTitle") : t("family.leaveTitle"), isOwner ? t("family.deleteMessage") : "", [
                { text: t("common.cancel"), style: "cancel" },
                { text: isOwner ? t("common.delete") : t("family.leave"), style: "destructive", onPress: () => void run(isOwner ? deleteFamily : leaveFamily) }
              ])
            }
            style={styles.spaced}
          />
        </View>
      ) : (
        <View style={styles.block}>
          <Field label={t("family.create")} placeholder={t("family.namePlaceholder")} value={name} onChangeText={setName} />
          <Button
            label={t("family.create")}
            icon="home-plus"
            disabled={name.trim().length < 1}
            loading={busy}
            onPress={() =>
              void run(async () => {
                await createFamily(name.trim());
                setName("");
              })
            }
            style={styles.spaced}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 16 },
  title: { fontSize: 17, fontWeight: "800", marginBottom: 12 },
  label: { fontSize: 12, fontWeight: "800", letterSpacing: 0.4, marginBottom: 8, textTransform: "uppercase" },
  idBox: { borderWidth: 1, padding: 12 },
  idText: { fontSize: 13, fontWeight: "700" },
  hint: { fontSize: 12, fontWeight: "600", marginTop: 6 },
  block: { marginTop: 16, gap: 4 },
  inviteRow: { borderWidth: 1, gap: 10, marginTop: 8, padding: 12 },
  inviteName: { fontSize: 14, fontWeight: "800" },
  inviteActions: { flexDirection: "row", gap: 8 },
  inviteBtn: { flex: 1, minHeight: 44 },
  familyHeader: { alignItems: "center", flexDirection: "row", gap: 10 },
  familyName: { fontSize: 18, fontWeight: "800" },
  memberRow: { alignItems: "center", flexDirection: "row", gap: 12, marginTop: 10 },
  avatar: { alignItems: "center", borderRadius: 999, height: 40, justifyContent: "center", width: 40 },
  avatarText: { fontSize: 17, fontWeight: "900" },
  memberBody: { flex: 1, minWidth: 0 },
  memberName: { fontSize: 15, fontWeight: "800" },
  memberMeta: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  spaced: { marginTop: 12 }
});
