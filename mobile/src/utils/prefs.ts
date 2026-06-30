// Tiny persistence helper for user preferences (theme, language, currency).
// Backed by expo-secure-store so we avoid adding AsyncStorage as a native dependency.
// Values are small, non-sensitive strings — SecureStore is overkill but already linked.
import * as SecureStore from "expo-secure-store";

export async function getPref(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setPref(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    // Preferences are best-effort; ignore storage failures.
  }
}

export const PREF_KEYS = {
  themeMode: "pref-theme-mode",
  locale: "pref-locale",
  currency: "pref-currency",
  budgets: "pref-budgets",
  remindersEnabled: "pref-reminders-enabled",
  remindersDays: "pref-reminders-days",
  onboarded: "pref-onboarded",
  aiEnabled: "pref-ai-enabled",
  aiKey: "pref-ai-key",
  subscription: "pref-subscription"
} as const;
