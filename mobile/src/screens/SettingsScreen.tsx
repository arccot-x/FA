import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Screen } from "../components/Screen";
import { Button, Chip, Field, PressableScale, SegmentedControl } from "../components/ui";
import { IncomeEditorModal } from "./IncomeEditorModal";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { useFinanceStore } from "../store/useFinanceStore";
import { useTheme, useThemeContext } from "../theme";
import type { ThemeMode } from "../theme";
import { LOCALES, useI18n } from "../i18n";
import type { Locale } from "../i18n";
import { useCurrency } from "../utils/CurrencyProvider";
import { useReminders } from "../utils/RemindersProvider";
import { useAppLock } from "../utils/AppLockProvider";
import { useAi } from "../utils/AiProvider";
import { exportTransactionsCsv } from "../utils/exportData";
import { CURRENCIES } from "../utils/money";
import type { CurrencyCode } from "../utils/money";
import { toNumber } from "../utils/money";

const APP_VERSION = "0.2.0";

export function SettingsScreen() {
  const theme = useTheme();
  const { mode, setMode } = useThemeContext();
  const { t, locale, setLocale } = useI18n();
  const { currency, setCurrency } = useCurrency();
  const { enabled: remindersEnabled, daysBefore, setEnabled: setRemindersEnabled, setDaysBefore } = useReminders();
  const { enabled: lockEnabled, setEnabled: setLockEnabled } = useAppLock();
  const { enabled: aiEnabled, apiKey, setEnabled: setAiEnabled, setApiKey } = useAi();
  const { user, logout, saveIncomeSettings, saveExpectedIncome, incomeCycle, transactions, deleteAccount } = useFinanceStore();
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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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

        {/* AI receipt scan */}
        <Section delay={185} title={t("ai.title")} theme={theme}>
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text style={[styles.switchTitle, { color: theme.colors.text }]}>{t("ai.enable")}</Text>
              <Text style={[styles.switchMeta, { color: theme.colors.subtleText }]}>{t("ai.hint")}</Text>
            </View>
            <Switch value={aiEnabled} onValueChange={setAiEnabled} trackColor={{ true: theme.colors.primary, false: theme.colors.borderStrong }} thumbColor="#FFFFFF" />
          </View>
          {aiEnabled ? (
            <Field
              label={t("ai.apiKey")}
              placeholder={t("ai.apiKeyPlaceholder")}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              value={apiKey}
              onChangeText={setApiKey}
              containerStyle={styles.aiKey}
            />
          ) : null}
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
