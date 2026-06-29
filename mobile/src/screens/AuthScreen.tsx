import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Button, Field, SegmentedControl } from "../components/ui";
import { useFinanceStore } from "../store/useFinanceStore";
import { useTheme } from "../theme";
import { useI18n } from "../i18n";

export function AuthScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | undefined>();
  const { login, register, loading, authError } = useFinanceStore();

  const canSubmit = useMemo(() => {
    const hasCredentials = email.trim().length > 4 && password.length >= 8;
    return mode === "login" ? hasCredentials : hasCredentials && name.trim().length > 1;
  }, [email, mode, name, password]);

  const submit = async () => {
    if (!canSubmit) {
      setLocalError(mode === "login" ? t("auth.invalidLogin") : t("auth.invalidRegister"));
      return;
    }
    setLocalError(undefined);
    try {
      if (mode === "login") {
        await login({ email: email.trim(), password });
      } else {
        await register({ name: name.trim(), email: email.trim(), password });
      }
    } catch {
      // Store keeps the user-facing backend error.
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeInDown.duration(500)} style={styles.hero}>
            <View style={[styles.logo, { backgroundColor: theme.colors.primary, borderRadius: theme.radii.lg, ...theme.shadow("md") }]}>
              <MaterialCommunityIcons color={theme.colors.onPrimary} name="wallet" size={34} />
            </View>
            <Text style={[styles.title, { color: theme.colors.text }]}>{t("auth.appName")}</Text>
            <Text style={[styles.subtitle, { color: theme.colors.subtleText }]}>{t("auth.tagline")}</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(120).duration(500)} style={styles.form}>
            <SegmentedControl
              segments={[
                { value: "login", label: t("auth.login") },
                { value: "register", label: t("auth.create") }
              ]}
              value={mode}
              onChange={setMode}
            />

            {mode === "register" ? <Field label={t("auth.name")} autoCapitalize="words" autoComplete="name" value={name} onChangeText={setName} /> : null}

            <Field label={t("auth.email")} autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} />

            <View>
              <Field
                label={t("auth.password")}
                autoCapitalize="none"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                style={styles.passwordInput}
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword((current) => !current)}>
                <MaterialCommunityIcons color={theme.colors.muted} name={showPassword ? "eye-off" : "eye"} size={22} />
              </TouchableOpacity>
            </View>

            {localError || authError ? <Text style={[styles.error, { color: theme.colors.danger }]}>{localError ?? authError}</Text> : null}

            <Button label={mode === "login" ? t("auth.loginCta") : t("auth.createCta")} onPress={submit} loading={loading} style={styles.submit} />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24
  },
  hero: {
    alignItems: "center",
    marginBottom: 28
  },
  logo: {
    alignItems: "center",
    height: 68,
    justifyContent: "center",
    marginBottom: 16,
    width: 68
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center"
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 21,
    marginTop: 8,
    textAlign: "center"
  },
  form: {
    gap: 16
  },
  passwordInput: {
    paddingRight: 52
  },
  eyeButton: {
    alignItems: "center",
    bottom: 0,
    height: 54,
    justifyContent: "center",
    position: "absolute",
    right: 0,
    width: 52
  },
  error: {
    fontSize: 13,
    fontWeight: "700"
  },
  submit: {
    marginTop: 4
  }
});
