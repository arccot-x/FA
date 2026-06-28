import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFinanceStore } from "../store/useFinanceStore";
import { colors, spacing } from "../theme";

export function AuthScreen() {
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
      setLocalError(mode === "login" ? "Enter your email and at least 8 password characters." : "Enter your name, email, and at least 8 password characters.");
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
      // The store keeps the user-facing backend error.
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboard}>
        <View style={styles.logo}>
          <MaterialCommunityIcons color="#FFFFFF" name="wallet" size={34} />
        </View>
        <Text style={styles.title}>Frictionless Finance</Text>
        <Text style={styles.subtitle}>Sign in to keep your bills, receipts, vault files, and income saved to your account.</Text>

        <View style={styles.segmented}>
          <Pressable style={[styles.segment, mode === "login" && styles.segmentActive]} onPress={() => setMode("login")}>
            <Text style={[styles.segmentText, mode === "login" && styles.segmentTextActive]}>Login</Text>
          </Pressable>
          <Pressable style={[styles.segment, mode === "register" && styles.segmentActive]} onPress={() => setMode("register")}>
            <Text style={[styles.segmentText, mode === "register" && styles.segmentTextActive]}>Create</Text>
          </Pressable>
        </View>

        {mode === "register" ? (
          <>
            <Text style={styles.label}>Name</Text>
            <TextInput autoCapitalize="words" autoComplete="name" onChangeText={setName} style={styles.input} value={name} />
          </>
        ) : null}

        <Text style={styles.label}>Email</Text>
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          onChangeText={setEmail}
          style={styles.input}
          value={email}
        />

        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordRow}>
          <TextInput
            autoCapitalize="none"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            style={styles.passwordInput}
            value={password}
          />
          <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword((current) => !current)}>
            <MaterialCommunityIcons color={colors.muted} name={showPassword ? "eye-off" : "eye"} size={22} />
          </TouchableOpacity>
        </View>

        {localError || authError ? <Text style={styles.error}>{localError ?? authError}</Text> : null}

        <TouchableOpacity disabled={loading} style={[styles.primaryButton, loading && styles.primaryButtonDisabled]} onPress={submit}>
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>{mode === "login" ? "Login" : "Create Account"}</Text>}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  keyboard: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg
  },
  logo: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.primary,
    borderRadius: 8,
    height: 64,
    justifyContent: "center",
    marginBottom: spacing.md,
    width: 64
  },
  title: {
    color: colors.text,
    fontSize: 29,
    fontWeight: "900",
    textAlign: "center"
  },
  subtitle: {
    color: colors.subtleText,
    fontSize: 15,
    lineHeight: 21,
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
    textAlign: "center"
  },
  segmented: {
    backgroundColor: "#E9EEEC",
    borderRadius: 8,
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.md,
    padding: spacing.xs
  },
  segment: {
    alignItems: "center",
    borderRadius: 7,
    flex: 1,
    minHeight: 42,
    justifyContent: "center"
  },
  segmentActive: {
    backgroundColor: colors.surface
  },
  segmentText: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "900"
  },
  segmentTextActive: {
    color: colors.text
  },
  label: {
    color: colors.subtleText,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: spacing.xs,
    marginTop: spacing.md,
    textTransform: "uppercase"
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 17,
    minHeight: 54,
    paddingHorizontal: spacing.md
  },
  passwordRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 54
  },
  passwordInput: {
    color: colors.text,
    flex: 1,
    fontSize: 17,
    minHeight: 54,
    paddingHorizontal: spacing.md
  },
  eyeButton: {
    alignItems: "center",
    height: 54,
    justifyContent: "center",
    width: 54
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "700",
    marginTop: spacing.md
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 8,
    justifyContent: "center",
    marginTop: spacing.lg,
    minHeight: 56
  },
  primaryButtonDisabled: {
    opacity: 0.7
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900"
  }
});
