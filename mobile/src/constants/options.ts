import type { ComponentProps } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ExpenseCategory, VaultCategory } from "../types";

export type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

// Labels are resolved through i18n at render time via t(`category.${value}`).
export const expenseCategoryOptions: Array<{ value: ExpenseCategory; icon: IconName }> = [
  { value: "GROCERIES", icon: "cart" },
  { value: "DINING", icon: "silverware-fork-knife" },
  { value: "GAS", icon: "gas-station" },
  { value: "TRANSPORT", icon: "train-car" },
  { value: "SHOPPING", icon: "shopping" },
  { value: "ENTERTAINMENT", icon: "movie-open" },
  { value: "HEALTH", icon: "heart-pulse" },
  { value: "HOME", icon: "home-city" },
  { value: "UTILITIES", icon: "lightning-bolt" },
  { value: "TRAVEL", icon: "airplane" },
  { value: "SUBSCRIPTION", icon: "refresh-circle" },
  { value: "OTHER", icon: "dots-horizontal-circle" }
];

export const categoryIcon: Record<ExpenseCategory, IconName> = expenseCategoryOptions.reduce(
  (acc, item) => ({ ...acc, [item.value]: item.icon }),
  {} as Record<ExpenseCategory, IconName>
);

export const billIconOptions: IconName[] = [
  "home-city",
  "lightning-bolt",
  "water",
  "wifi",
  "cellphone",
  "car",
  "television-classic",
  "shield-check",
  "credit-card",
  "receipt"
];

export const vaultCategoryOptions: Array<{ value: VaultCategory; icon: IconName }> = [
  { value: "LEASE", icon: "home-lock" },
  { value: "TAX", icon: "file-document" },
  { value: "INSURANCE", icon: "shield-check" },
  { value: "RECEIPT", icon: "receipt" },
  { value: "BANKING", icon: "bank" },
  { value: "MEDICAL", icon: "medical-bag" },
  { value: "WARRANTY", icon: "certificate" },
  { value: "OTHER", icon: "folder" }
];

export function labelForCategory(value: string) {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}
