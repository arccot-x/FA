import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import type { BillOccurrence } from "../types";
import { toNumber } from "./money";

// Show reminders as banners even when the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("bill-reminders", {
      name: "Bill reminders",
      importance: Notifications.AndroidImportance.DEFAULT
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

type ReminderStrings = {
  title: (billName: string) => string;
  body: (billName: string, amount: string) => string;
};

/**
 * Replaces all scheduled reminders with one per upcoming unpaid bill,
 * fired `daysBefore` days before the due date at 9am (skips past dates).
 */
export async function syncBillReminders(
  bills: BillOccurrence[],
  daysBefore: number,
  formatMoney: (value: number) => string,
  strings: ReminderStrings
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = new Date();
  const unpaid = bills.filter((bill) => bill.status === "UNPAID");

  for (const bill of unpaid) {
    const due = new Date(bill.dueDate);
    if (Number.isNaN(due.getTime())) continue;

    const trigger = new Date(due);
    trigger.setDate(due.getDate() - daysBefore);
    trigger.setHours(9, 0, 0, 0);
    if (trigger <= now) continue;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: strings.title(bill.billTemplate.name),
        body: strings.body(bill.billTemplate.name, formatMoney(toNumber(bill.amount)))
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: trigger,
        channelId: Platform.OS === "android" ? "bill-reminders" : undefined
      }
    });
  }
}

export async function cancelBillReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
