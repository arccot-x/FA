import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Button, Field, FormMessage, SegmentedControl } from "../components/ui";
import { useFinanceStore } from "../store/useFinanceStore";
import { useTheme } from "../theme";
import { useI18n } from "../i18n";
import { useToast } from "../utils/ToastProvider";

export function AuthScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const { showToast } = useToast();
  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [resetStep, setResetStep] = useState<"email" | "code">("email");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | undefined>();
  const { login, loginDemo, register, requestPasswordReset, resetPassword, loading, authError } = useFinanceStore();

  // Matches the backend's stronger rule for newly-set passwords (register/reset);
  // login keeps the looser 8-char check so existing accounts can still sign in.
  const isStrongPassword = (value: string) => value.length >= 10 && /[A-Za-z]/.test(value) && /[0-9]/.test(value);

  const canSubmit = useMemo(() => {
    const hasCredentials = email.trim().length > 4 && (mode === "login" ? password.length >= 8 : isStrongPassword(password));
    if (mode === "reset") {
      return resetStep === "email" ? email.trim().length > 4 : email.trim().length > 4 && code.trim().length >= 6 && isStrongPassword(password);
    }
    return mode === "login" ? hasCredentials : hasCredentials && name.trim().length > 1;
  }, [code, email, mode, name, password, resetStep]);

  const submit = async () => {
    if (!canSubmit) {
      setLocalError(mode === "register" ? t("auth.invalidRegister") : mode === "reset" ? t("auth.invalidReset") : t("auth.invalidLogin"));
      return;
    }
    setLocalError(undefined);
    try {
      if (mode === "login") {
        await login({ email: email.trim(), password });
      } else if (mode === "reset") {
        if (resetStep === "email") {
          await requestPasswordReset({ email: email.trim() });
          setResetStep("code");
          setPassword("");
        } else {
          await resetPassword({ email: email.trim(), code: code.trim(), newPassword: password });
        }
      } else {
        await register({ name: name.trim(), email: email.trim(), password });
      }
    } catch {
      // Store keeps the user-facing backend error.
    }
  };

  const tryDemo = async () => {
    setLocalError(undefined);
    try {
      await loginDemo();
      showToast(t("common.saved"), "success");
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
              onChange={(value) => {
                setMode(value as "login" | "register");
                setResetStep("email");
                setLocalError(undefined);
              }}
            />

            {mode === "register" ? <Field label={t("auth.name")} autoCapitalize="words" autoComplete="name" value={name} onChangeText={setName} error={localError && name.trim().length < 2 ? t("common.requiredField") : undefined} /> : null}

            <Field label={t("auth.email")} autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} error={localError && email.trim().length <= 4 ? t("common.validEmail") : undefined} />

            {mode === "reset" && resetStep === "code" ? (
              <Field label={t("auth.resetCode")} autoCapitalize="none" keyboardType="number-pad" value={code} onChangeText={setCode} error={localError && code.trim().length < 6 ? t("common.requiredField") : undefined} />
            ) : null}

            {mode === "reset" && resetStep === "email" ? null : (
            <View>
              <Field
                label={mode === "reset" ? t("auth.newPassword") : t("auth.password")}
                autoCapitalize="none"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                error={localError && (mode === "login" ? password.length < 8 : !isStrongPassword(password)) ? t("auth.invalidLogin") : undefined}
                style={styles.passwordInput}
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword((current) => !current)}>
                <MaterialCommunityIcons color={theme.colors.muted} name={showPassword ? "eye-off" : "eye"} size={22} />
              </TouchableOpacity>
              {mode !== "login" ? <Text style={[styles.passwordHint, { color: theme.colors.subtleText }]}>{t("auth.passwordHint")}</Text> : null}
            </View>
            )}

            <FormMessage message={localError || authError ? localError ?? authError : undefined} />

            {mode === "login" ? (
              <TouchableOpacity onPress={() => setMode("reset")} style={styles.linkButton}>
                <Text style={[styles.linkText, { color: theme.colors.primary }]}>{t("auth.forgotPassword")}</Text>
              </TouchableOpacity>
            ) : null}

            {mode === "reset" ? (
              <TouchableOpacity
                onPress={() => {
                  setMode("login");
                  setResetStep("email");
                }}
                style={styles.linkButton}
              >
                <Text style={[styles.linkText, { color: theme.colors.primary }]}>{t("auth.backToLogin")}</Text>
              </TouchableOpacity>
            ) : null}

            <Button
              label={mode === "login" ? t("auth.loginCta") : mode === "reset" ? (resetStep === "email" ? t("auth.sendResetCode") : t("auth.resetPassword")) : t("auth.createCta")}
              onPress={submit}
              loading={loading}
              style={styles.submit}
            />
            {mode === "login" ? <Button label={t("auth.demo")} icon="play-circle-outline" variant="secondary" onPress={() => void tryDemo()} disabled={loading} /> : null}
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
    alignItems: "center",
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
    maxWidth: 420,
    marginTop: 8,
    textAlign: "center"
  },
  form: {
    gap: 16,
    maxWidth: 430,
    width: "100%"
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
  passwordHint: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6
  },
  linkButton: {
    alignSelf: "flex-start"
  },
  linkText: {
    fontSize: 14,
    fontWeight: "800"
  },
  submit: {
    marginTop: 4
  }
});
