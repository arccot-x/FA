// Tiny persistence helper for user preferences (theme, language, currency).
// Backed by expo-secure-store so we avoid adding AsyncStorage as a native dependency.
// Values are small, non-sensitive strings — SecureStore is overkill but already linked.
import * as SecureStore from "expo-secure-store";

const prefTimeoutMs = 2500;

export async function getPref(key: string): Promise<string | null> {
  try {
    return await withTimeout(SecureStore.getItemAsync(key), prefTimeoutMs);
  } catch {
    return null;
  }
}

export async function setPref(key: string, value: string): Promise<void> {
  try {
    await withTimeout(SecureStore.setItemAsync(key, value), prefTimeoutMs);
  } catch {
    // Preferences are best-effort; ignore storage failures.
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out")), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

export const PREF_KEYS = {
  themeMode: "pref-theme-mode",
  locale: "pref-locale",
  currency: "pref-currency",
  budgets: "pref-budgets",
  remindersEnabled: "pref-reminders-enabled",
  remindersDays: "pref-reminders-days",
  onboarded: "pref-onboarded",
  tutorialCompleted: "pref-tutorial-completed",
  tutorialPrompted: "pref-tutorial-prompted",
  aiEnabled: "pref-ai-enabled",
  aiKey: "pref-ai-key",
  subscription: "pref-subscription"
} as const;
