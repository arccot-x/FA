import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Button, Field, FormMessage } from "../components/ui";
import { useFinanceStore } from "../store/useFinanceStore";
import { useI18n } from "../i18n";
import { useTheme } from "../theme";
import { SUBSCRIPTION_PLANS, useSubscription } from "../utils/SubscriptionProvider";
import { useToast } from "../utils/ToastProvider";

export function FamilySection() {
  const navigation = useNavigation();
  const theme = useTheme();
  const { t } = useI18n();
  const { showToast } = useToast();
  const { user, family, familyInvites, createFamily, inviteFamilyMember, acceptInvite, declineInvite, leaveFamily, deleteFamily } = useFinanceStore();
  const { subscription } = useSubscription();

  const [name, setName] = useState("");
  const [inviteId, setInviteId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const run = async (fn: () => Promise<void>) => {
    setError(undefined);
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("auth.genericError"));
    } finally {
      setBusy(false);
    }
  };

  const isOwner = family?.role === "OWNER";
  const memberCount = family?.members.length ?? 1;
  const familyAccess = family?.subscription;
  const memberLimit = familyAccess?.memberLimit ?? 1;
  const familyLocked = family ? !familyAccess?.allowed : false;
  const canInvite = !familyLocked && memberCount < memberLimit;
  const canCreateFamily = subscription.active && subscription.family;
  const currentPlan = SUBSCRIPTION_PLANS.find((plan) => plan.id === subscription.plan);
  const limitText = family
    ? t("family.planLimit", { plan: currentPlan?.name ?? t("subscription.title"), count: memberLimit })
    : t("family.familyPlanOptions");

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
            {limitText}
          </Text>
          <View style={[styles.memberMeter, { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radii.pill }]}>
            <View style={[styles.memberMeterFill, { width: `${Math.min(100, (memberCount / Math.max(1, memberLimit)) * 100)}%`, backgroundColor: theme.colors.primary, borderRadius: theme.radii.pill }]} />
          </View>
          <Text style={[styles.hint, { color: theme.colors.subtleText }]}>{t("family.memberUsage", { used: memberCount, count: memberLimit })}</Text>
          {familyLocked ? (
            <View style={[styles.lockBox, { backgroundColor: theme.colors.warningSoft, borderColor: theme.colors.warning, borderRadius: theme.radii.md }]}>
              <MaterialCommunityIcons color={theme.colors.warning} name="lock-alert" size={20} />
              <View style={styles.lockText}>
                <Text style={[styles.lockTitle, { color: theme.colors.text }]}>{t("family.lockedTitle")}</Text>
                <Text style={[styles.hint, { color: theme.colors.subtleText }]}>{familyAccess?.reason ?? t("family.lockedMessage")}</Text>
                {!isOwner ? <Text style={[styles.hint, { color: theme.colors.subtleText }]}>{t("family.ownerMustSubscribe")}</Text> : null}
              </View>
            </View>
          ) : null}
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
              <FormMessage message={error} />
              <Button
                label={t("family.invite")}
                icon="account-plus"
                onPress={() =>
                  void run(async () => {
                    if (!canInvite) {
                      throw new Error(t("family.limitReached"));
                    }
                    await inviteFamilyMember(inviteId.trim());
                    setInviteId("");
                    showToast(t("family.invited"));
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
                { text: isOwner ? t("common.delete") : t("family.leave"), style: "destructive", onPress: () => void run(isOwner ? deleteFamily : leaveFamily).then(() => showToast(isOwner ? t("common.deleted") : t("common.updated"))) }
              ])
            }
            style={styles.spaced}
          />
        </View>
      ) : (
        <View style={styles.block}>
          {!canCreateFamily ? (
            <View style={[styles.lockBox, { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primary, borderRadius: theme.radii.md }]}>
              <MaterialCommunityIcons color={theme.colors.primary} name="account-multiple-plus" size={20} />
              <View style={styles.lockText}>
                <Text style={[styles.lockTitle, { color: theme.colors.text }]}>{t("family.subscribeFirst")}</Text>
                <Text style={[styles.hint, { color: theme.colors.subtleText }]}>{t("family.subscribeFirstHint")}</Text>
                <Text style={[styles.hint, { color: theme.colors.subtleText }]}>{t("family.familyPlanOptions")}</Text>
              </View>
            </View>
          ) : null}
          {!canCreateFamily ? <Button label={t("subscription.title")} icon="credit-card-outline" variant="secondary" onPress={() => navigation.navigate("Subscription" as never)} style={styles.spaced} /> : null}
          <Field label={t("family.create")} placeholder={t("family.namePlaceholder")} value={name} onChangeText={setName} error={error === t("common.requiredField") ? error : undefined} />
          <FormMessage message={error && error !== t("common.requiredField") ? error : undefined} />
          <Button
            label={t("family.create")}
            icon="home-plus"
            disabled={name.trim().length < 1 || !canCreateFamily}
            loading={busy}
            onPress={() =>
              void run(async () => {
                if (!name.trim()) {
                  throw new Error(t("common.requiredField"));
                }
                await createFamily(name.trim());
                setName("");
                showToast(t("common.saved"));
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
  lockBox: { alignItems: "flex-start", borderWidth: 1, flexDirection: "row", gap: 10, marginTop: 10, padding: 12 },
  lockText: { flex: 1, minWidth: 0 },
  lockTitle: { fontSize: 14, fontWeight: "900" },
  memberMeter: { height: 8, marginTop: 10, overflow: "hidden" },
  memberMeterFill: { height: 8 },
  spaced: { marginTop: 12 }
});
