import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Button, Chip, Field } from "../components/ui";
import { useFinanceStore } from "../store/useFinanceStore";
import { useTheme } from "../theme";
import { LOCALES, useI18n } from "../i18n";
import type { Locale } from "../i18n";
import { useCurrency } from "../utils/CurrencyProvider";
import { CURRENCIES } from "../utils/money";
import type { CurrencyCode } from "../utils/money";

export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const { t, locale, setLocale } = useI18n();
  const { currency, setCurrency } = useCurrency();
  const { user, saveIncomeSettings, saveExpectedIncome } = useFinanceStore();

  const [income, setIncome] = useState("");
  const [payday, setPayday] = useState("1");
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    setSaving(true);
    try {
      const parsedIncome = Math.max(0, Number(income) || 0);
      const parsedPayday = Math.min(31, Math.max(1, Math.round(Number(payday) || 1)));
      if (user) {
        await saveIncomeSettings({ defaultMonthlyIncome: parsedIncome, paydayDay: parsedPayday, variableIncomeEnabled: false });
        await saveExpectedIncome(parsedIncome);
      }
      onDone();
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

          <Animated.View entering={FadeInDown.delay(100).duration(420)} style={styles.form}>
            <Field label={t("onboarding.incomeStep")} keyboardType="decimal-pad" value={income} onChangeText={setIncome} />
            <Field label={t("onboarding.paydayStep")} keyboardType="number-pad" value={payday} onChangeText={setPayday} />

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

            <Button label={t("onboarding.start")} icon="arrow-right" onPress={finish} loading={saving} style={styles.start} />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", padding: 24 },
  hero: { alignItems: "center", marginBottom: 28 },
  logo: { alignItems: "center", height: 64, justifyContent: "center", marginBottom: 16, width: 64 },
  title: { fontSize: 26, fontWeight: "900", textAlign: "center" },
  subtitle: { fontSize: 15, fontWeight: "600", lineHeight: 21, marginTop: 8, textAlign: "center" },
  form: { gap: 16 },
  label: { fontSize: 12, fontWeight: "800", letterSpacing: 0.4, textTransform: "uppercase" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  start: { marginTop: 8 }
});
