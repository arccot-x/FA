import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Screen } from "../components/Screen";
import { Button, Chip, Field, PressableScale, SegmentedControl } from "../components/ui";
import { IncomeEditorModal } from "./IncomeEditorModal";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { FamilySection } from "./FamilySection";
import { useFinanceStore } from "../store/useFinanceStore";
import { useTheme, useThemeContext } from "../theme";
import type { ThemeMode } from "../theme";
import { LOCALES, useI18n } from "../i18n";
import type { Locale } from "../i18n";
import { useCurrency } from "../utils/CurrencyProvider";
import { useReminders } from "../utils/RemindersProvider";
import { useAppLock } from "../utils/AppLockProvider";
import { exportTransactionsCsv } from "../utils/exportData";
import { CURRENCIES } from "../utils/money";
import type { CurrencyCode } from "../utils/money";
import { toNumber } from "../utils/money";
import { SUBSCRIPTION_PLANS, useSubscription } from "../utils/SubscriptionProvider";
import type { SubscriptionPlanId } from "../utils/SubscriptionProvider";

const APP_VERSION = "0.2.0";

export function SettingsScreen() {
  const theme = useTheme();
  const { mode, setMode } = useThemeContext();
  const { t, locale, setLocale } = useI18n();
  const { currency, setCurrency } = useCurrency();
  const { enabled: remindersEnabled, daysBefore, setEnabled: setRemindersEnabled, setDaysBefore } = useReminders();
  const { enabled: lockEnabled, setEnabled: setLockEnabled } = useAppLock();
  const { user, load, loading, logout, saveIncomeSettings, saveExpectedIncome, incomeCycle, transactions, deleteAccount } = useFinanceStore();
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [changePwOpen, setChangePwOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const toggleReminders = async (next: boolean) => {
    const ok = await setRemindersEnabled(next);
    if (next && !ok) {
      Alert.alert(t("settings.notifications"), t("reminders.denied"));
    }
  };

  const toggleLock = async (next: boolean) => {
    const ok = await setLockEnabled(next);
    if (next && !ok) {
      Alert.alert(t("security.title"), t("security.unavailable"));
    }
  };

  const runExport = async () => {
    setExporting(true);
    try {
      const ok = await exportTransactionsCsv(transactions);
      if (!ok) Alert.alert(t("dataExport.title"), t("dataExport.nothing"));
    } finally {
      setExporting(false);
    }
  };

  const confirmDeleteAccount = () => {
    Alert.alert(t("account.deleteTitle"), t("account.deleteMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("account.deleteConfirm"), style: "destructive", onPress: () => void deleteAccount() }
    ]);
  };

  const themeSegments: { value: ThemeMode; label: string }[] = [
    { value: "system", label: t("settings.themeSystem") },
    { value: "light", label: t("settings.themeLight") },
    { value: "dark", label: t("settings.themeDark") }
  ];

  return (
    <Screen title={t("settings.title")}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />}
      >
        {/* Appearance */}
        <Section delay={0} title={t("settings.appearance")} theme={theme}>
          <Text style={[styles.rowLabel, { color: theme.colors.subtleText }]}>{t("settings.theme")}</Text>
          <SegmentedControl segments={themeSegments} value={mode} onChange={setMode} />
        </Section>

        {/* Language */}
        <Section delay={60} title={t("settings.language")} theme={theme}>
          <View style={styles.optionList}>
            {LOCALES.map((item) => (
              <OptionRow
                key={item.value}
                label={item.label}
                active={locale === item.value}
                onPress={() => setLocale(item.value as Locale)}
                theme={theme}
              />
            ))}
          </View>
        </Section>

        {/* Currency */}
        <Section delay={120} title={t("settings.currency")} theme={theme}>
          <View style={styles.optionList}>
            {CURRENCIES.map((item) => (
              <OptionRow
                key={item.code}
                label={`${item.symbol}  ${item.label}`}
                active={currency === item.code}
                onPress={() => setCurrency(item.code as CurrencyCode)}
                theme={theme}
              />
            ))}
          </View>
        </Section>

        {/* Family */}
        <Animated.View entering={FadeInDown.delay(140).duration(360)} style={styles.section}>
          <FamilySection />
        </Animated.View>

        {/* Subscription */}
        <Section delay={145} title={t("subscription.title")} theme={theme}>
          <SubscriptionSection />
        </Section>

        {/* Notifications */}
        <Section delay={150} title={t("settings.notifications")} theme={theme}>
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text style={[styles.switchTitle, { color: theme.colors.text }]}>{t("reminders.title")}</Text>
              <Text style={[styles.switchMeta, { color: theme.colors.subtleText }]}>{t("reminders.hint")}</Text>
            </View>
            <Switch
              value={remindersEnabled}
              onValueChange={(next) => void toggleReminders(next)}
              trackColor={{ true: theme.colors.primary, false: theme.colors.borderStrong }}
              thumbColor="#FFFFFF"
            />
          </View>
          {remindersEnabled ? (
            <View>
              <Text style={[styles.rowLabel, { color: theme.colors.subtleText, marginTop: 4 }]}>{t("reminders.daysBefore")}</Text>
              <View style={styles.daysRow}>
                {[1, 2, 3, 5, 7].map((day) => (
                  <Chip key={day} label={String(day)} selected={daysBefore === day} onPress={() => setDaysBefore(day)} basis="17%" />
                ))}
              </View>
            </View>
          ) : null}
        </Section>

        {/* Security */}
        <Section delay={170} title={t("security.title")} theme={theme}>
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text style={[styles.switchTitle, { color: theme.colors.text }]}>{t("security.appLock")}</Text>
              <Text style={[styles.switchMeta, { color: theme.colors.subtleText }]}>{t("security.appLockHint")}</Text>
            </View>
            <Switch
              value={lockEnabled}
              onValueChange={(next) => void toggleLock(next)}
              trackColor={{ true: theme.colors.primary, false: theme.colors.borderStrong }}
              thumbColor="#FFFFFF"
            />
          </View>
        </Section>

        {/* Data */}
        <Section delay={195} title={t("dataExport.title")} theme={theme}>
          <Text style={[styles.switchMeta, { color: theme.colors.subtleText, marginBottom: 12 }]}>{t("dataExport.hint")}</Text>
          <Button label={t("dataExport.button")} icon="file-export" variant="secondary" loading={exporting} onPress={() => void runExport()} />
        </Section>

        {/* Account */}
        <Section delay={210} title={t("settings.account")} theme={theme}>
          {user ? (
            <View style={[styles.account, { borderColor: theme.colors.border, borderRadius: theme.radii.md }]}>
              <View style={[styles.avatar, { backgroundColor: theme.colors.primarySoft }]}>
                <Text style={[styles.avatarText, { color: theme.colors.primary }]}>{(user.name || user.email).slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={styles.accountText}>
                <Text style={[styles.accountName, { color: theme.colors.text }]} numberOfLines={1}>
                  {user.name}
                </Text>
                <Text style={[styles.accountEmail, { color: theme.colors.subtleText }]} numberOfLines={1}>
                  {user.email}
                </Text>
              </View>
            </View>
          ) : null}
          <Button label={t("settings.incomeSettings")} icon="cash-multiple" variant="secondary" onPress={() => setIncomeOpen(true)} style={styles.spaced} />
          <Button label={t("account.changePassword")} icon="lock-reset" variant="secondary" onPress={() => setChangePwOpen(true)} style={styles.spaced} />
          <Button label={t("settings.signOut")} icon="logout" variant="secondary" onPress={() => void logout()} style={styles.spaced} />
          <Button label={t("account.deleteAccount")} icon="account-remove" variant="danger" onPress={confirmDeleteAccount} style={styles.spaced} />
        </Section>

        <View style={styles.about}>
          <MaterialCommunityIcons color={theme.colors.muted} name="wallet" size={20} />
          <Text style={[styles.aboutText, { color: theme.colors.muted }]}>
            {t("settings.madeWith")} · {t("settings.version")} {APP_VERSION}
          </Text>
        </View>
      </ScrollView>

      <IncomeEditorModal
        visible={incomeOpen}
        userIncome={toNumber(user?.defaultMonthlyIncome)}
        currentExpected={toNumber(incomeCycle?.expected)}
        currentActual={toNumber(incomeCycle?.actual)}
        currentHouseAllocation={toNumber(incomeCycle?.houseAllocation)}
        paydayDay={user?.paydayDay ?? 1}
        variableIncomeEnabled={user?.variableIncomeEnabled ?? false}
        onClose={() => setIncomeOpen(false)}
        onSaveSettings={saveIncomeSettings}
        onSaveExpected={saveExpectedIncome}
      />

      <ChangePasswordModal visible={changePwOpen} onClose={() => setChangePwOpen(false)} />
    </Screen>
  );
}

function SubscriptionSection() {
  const theme = useTheme();
  const { t } = useI18n();
  const { subscription, plan, saveSubscription } = useSubscription();
  const [planId, setPlanId] = useState<SubscriptionPlanId>(subscription.planId);
  const [name, setName] = useState(subscription.name);
  const [email, setEmail] = useState(subscription.email);
  const [cardNumber, setCardNumber] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPlanId(subscription.planId);
    setName(subscription.name);
    setEmail(subscription.email);
  }, [subscription]);

  const save = async () => {
    setSaving(true);
    try {
      await saveSubscription({ planId, name, email, cardNumber });
      setCardNumber("");
      Alert.alert(t("subscription.title"), t("subscription.saved"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.subscription}>
      <View style={[styles.subscriptionStatus, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border, borderRadius: theme.radii.md }]}>
        <MaterialCommunityIcons color={subscription.active ? theme.colors.success : theme.colors.muted} name={subscription.active ? "check-decagram" : "credit-card-outline"} size={24} />
        <View style={styles.switchText}>
          <Text style={[styles.switchTitle, { color: theme.colors.text }]}>
            {subscription.active ? t("subscription.activePlan", { plan: plan.name }) : t("subscription.testMode")}
          </Text>
          <Text style={[styles.switchMeta, { color: theme.colors.subtleText }]}>
            {t("subscription.memberLimit", { count: plan.memberLimit })}
            {subscription.cardLast4 ? ` · ${t("subscription.cardEnding", { last4: subscription.cardLast4 })}` : ""}
          </Text>
        </View>
      </View>

      <View style={styles.planList}>
        {SUBSCRIPTION_PLANS.map((item) => {
          const selected = item.id === planId;
          return (
            <PressableScale
              key={item.id}
              onPress={() => setPlanId(item.id)}
              scaleTo={0.98}
              style={[
                styles.planRow,
                {
                  backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surface,
                  borderColor: selected ? theme.colors.primary : theme.colors.border,
                  borderRadius: theme.radii.md
                }
              ]}
            >
              <View style={styles.planBody}>
                <Text style={[styles.planName, { color: selected ? theme.colors.primary : theme.colors.text }]}>{item.name}</Text>
                <Text style={[styles.switchMeta, { color: theme.colors.subtleText }]}>{t("subscription.memberLimit", { count: item.memberLimit })}</Text>
              </View>
              <Text style={[styles.planPrice, { color: selected ? theme.colors.primary : theme.colors.text }]}>${item.price}</Text>
            </PressableScale>
          );
        })}
      </View>

      <Field label={t("subscription.name")} value={name} onChangeText={setName} placeholder="Test Customer" />
      <Field label={t("subscription.email")} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="test@example.com" />
      <Field label={t("subscription.cardNumber")} value={cardNumber} onChangeText={setCardNumber} keyboardType="number-pad" placeholder="4242 4242 4242 4242" />
      <Text style={[styles.switchMeta, { color: theme.colors.subtleText }]}>{t("subscription.hint")}</Text>
      <Button label={t("subscription.save")} icon="credit-card-check-outline" loading={saving} onPress={() => void save()} />
    </View>
  );
}

function Section({ title, children, theme, delay }: { title: string; children: React.ReactNode; theme: ReturnType<typeof useTheme>; delay: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(360)} style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.colors.subtleText }]}>{title}</Text>
      <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderRadius: theme.radii.lg, ...theme.shadow("sm") }]}>{children}</View>
    </Animated.View>
  );
}

function OptionRow({ label, active, onPress, theme }: { label: string; active: boolean; onPress: () => void; theme: ReturnType<typeof useTheme> }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.98} style={[styles.optionRow, { backgroundColor: active ? theme.colors.primarySoft : "transparent", borderRadius: theme.radii.md }]}>
      <Text style={[styles.optionLabel, { color: active ? theme.colors.primary : theme.colors.text }]}>{label}</Text>
      {active ? <MaterialCommunityIcons color={theme.colors.primary} name="check-circle" size={22} /> : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 96
  },
  section: {
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
    textTransform: "uppercase"
  },
  card: {
    borderWidth: 1,
    gap: 10,
    padding: 16
  },
  rowLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase"
  },
  optionList: {
    gap: 4
  },
  optionRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: 12
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: "700"
  },
  switchRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  switchText: {
    flex: 1,
    paddingRight: 12
  },
  switchTitle: {
    fontSize: 15,
    fontWeight: "800"
  },
  switchMeta: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2
  },
  daysRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10
  },
  aiKey: {
    marginTop: 12
  },
  subscription: {
    gap: 12
  },
  subscriptionStatus: {
    alignItems: "center",
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14
  },
  planList: {
    gap: 8
  },
  planRow: {
    alignItems: "center",
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 68,
    padding: 14
  },
  planBody: {
    flex: 1,
    minWidth: 0
  },
  planName: {
    fontSize: 16,
    fontWeight: "900"
  },
  planPrice: {
    fontSize: 22,
    fontWeight: "900"
  },
  account: {
    alignItems: "center",
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14
  },
  avatar: {
    alignItems: "center",
    borderRadius: 999,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "900"
  },
  accountText: {
    flex: 1,
    minWidth: 0
  },
  accountName: {
    fontSize: 16,
    fontWeight: "800"
  },
  accountEmail: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2
  },
  spaced: {
    marginTop: 12
  },
  about: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 8
  },
  aboutText: {
    fontSize: 13,
    fontWeight: "700"
  }
});
