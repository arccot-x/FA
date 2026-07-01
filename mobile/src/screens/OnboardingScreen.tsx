import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Button, Chip, Field, FormMessage } from "../components/ui";
import { useFinanceStore } from "../store/useFinanceStore";
import { useTheme } from "../theme";
import { LOCALES, useI18n } from "../i18n";
import type { Locale } from "../i18n";
import { useCurrency } from "../utils/CurrencyProvider";
import { CURRENCIES } from "../utils/money";
import type { CurrencyCode } from "../utils/money";
import { useToast } from "../utils/ToastProvider";

export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const { t, locale, setLocale } = useI18n();
  const { showToast } = useToast();
  const { currency, setCurrency } = useCurrency();
  const { user, saveIncomeSettings, saveExpectedIncome } = useFinanceStore();

  const [income, setIncome] = useState("");
  const [payday, setPayday] = useState("1");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const finish = async () => {
    const parsedIncome = Number(income);
    const parsedPayday = Number(payday);
    if (!Number.isFinite(parsedIncome) || parsedIncome <= 0) {
      setError(t("common.positiveAmount"));
      return;
    }
    if (!Number.isFinite(parsedPayday) || parsedPayday < 1 || parsedPayday > 31) {
      setError(t("common.validDay"));
      return;
    }
    setError(undefined);
    setSaving(true);
    try {
      if (user) {
        await saveIncomeSettings({ defaultMonthlyIncome: parsedIncome, paydayDay: Math.round(parsedPayday), variableIncomeEnabled: false });
        await saveExpectedIncome(parsedIncome);
      }
      onDone();
      showToast(t("common.saved"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeInDown.duration(420)} style={styles.hero}>
            <View style={[styles.logo, { backgroundColor: theme.colors.primary, borderRadius: theme.radii.lg, ...theme.shadow("md") }]}>
              <MaterialCommunityIcons color={theme.colors.onPrimary} name="hand-wave" size={32} />
            </View>
            <Text style={[styles.title, { color: theme.colors.text }]}>{t("onboarding.welcome")}</Text>
            <Text style={[styles.subtitle, { color: theme.colors.subtleText }]}>{t("onboarding.subtitle")}</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100).duration(420)} pointerEvents={saving ? "none" : "auto"} style={[styles.form, saving && styles.formDisabled]}>
            <Field
              label={t("onboarding.incomeStep")}
              keyboardType="decimal-pad"
              value={income}
              onChangeText={setIncome}
              onBlur={() => {
                const parsed = Number(income);
                if (income && (!Number.isFinite(parsed) || parsed <= 0)) setError(t("common.positiveAmount"));
              }}
              error={error === t("common.positiveAmount") ? error : undefined}
            />
            <Field
              label={t("onboarding.paydayStep")}
              keyboardType="number-pad"
              value={payday}
              onChangeText={setPayday}
              onBlur={() => {
                const parsed = Number(payday);
                if (payday && (!Number.isFinite(parsed) || parsed < 1 || parsed > 31)) setError(t("common.validDay"));
              }}
              error={error === t("common.validDay") ? error : undefined}
            />
            <Text style={[styles.paydayHint, { color: theme.colors.subtleText }]}>{t("onboarding.paydayHint")}</Text>

            <Text style={[styles.label, { color: theme.colors.subtleText }]}>{t("settings.currency")}</Text>
            <View style={styles.row}>
              {CURRENCIES.map((item) => (
                <Chip key={item.code} label={item.symbol} selected={currency === item.code} onPress={() => setCurrency(item.code as CurrencyCode)} basis="14%" />
              ))}
            </View>

            <Text style={[styles.label, { color: theme.colors.subtleText }]}>{t("settings.language")}</Text>
            <View style={styles.row}>
              {LOCALES.map((item) => (
                <Chip key={item.value} label={item.label} selected={locale === item.value} onPress={() => setLocale(item.value as Locale)} basis="auto" />
              ))}
            </View>

            <FormMessage message={error && ![t("common.positiveAmount"), t("common.validDay")].includes(error) ? error : undefined} />
            <Button label={t("onboarding.start")} icon="arrow-right" onPress={finish} loading={saving} style={styles.start} />
            <Button
              label={t("onboarding.useSample")}
              icon="creation"
              variant="secondary"
              onPress={() => {
                setIncome("4200");
                setPayday("1");
                setError(undefined);
              }}
            />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: { alignItems: "center", flexGrow: 1, justifyContent: "center", padding: 24 },
  hero: { alignItems: "center", marginBottom: 28 },
  logo: { alignItems: "center", height: 64, justifyContent: "center", marginBottom: 16, width: 64 },
  title: { fontSize: 26, fontWeight: "900", textAlign: "center" },
  subtitle: { fontSize: 15, fontWeight: "600", lineHeight: 21, marginTop: 8, maxWidth: 420, textAlign: "center" },
  form: { gap: 16, maxWidth: 430, width: "100%" },
  formDisabled: { opacity: 0.6 },
  paydayHint: { fontSize: 12, fontWeight: "600", marginTop: -8 },
  label: { fontSize: 12, fontWeight: "800", letterSpacing: 0.4, textTransform: "uppercase" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  start: { marginTop: 8 }
});
