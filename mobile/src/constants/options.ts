import type { ComponentProps } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ExpenseCategory, VaultCategory } from "../types";

export type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

export const expenseCategoryOptions: Array<{ label: string; value: ExpenseCategory; icon: IconName }> = [
  { label: "Groceries", value: "GROCERIES", icon: "cart" },
  { label: "Dining", value: "DINING", icon: "silverware-fork-knife" },
  { label: "Gas", value: "GAS", icon: "gas-station" },
  { label: "Transport", value: "TRANSPORT", icon: "train-car" },
  { label: "Shopping", value: "SHOPPING", icon: "shopping" },
  { label: "Fun", value: "ENTERTAINMENT", icon: "movie-open" },
  { label: "Health", value: "HEALTH", icon: "heart-pulse" },
  { label: "Home", value: "HOME", icon: "home-city" },
  { label: "Utilities", value: "UTILITIES", icon: "lightning-bolt" },
  { label: "Travel", value: "TRAVEL", icon: "airplane" },
  { label: "Subscription", value: "SUBSCRIPTION", icon: "refresh-circle" },
  { label: "Other", value: "OTHER", icon: "dots-horizontal-circle" }
];

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

export const vaultCategoryOptions: Array<{ label: string; value: VaultCategory; icon: IconName }> = [
  { label: "Lease", value: "LEASE", icon: "home-lock" },
  { label: "Tax", value: "TAX", icon: "file-document" },
  { label: "Insurance", value: "INSURANCE", icon: "shield-check" },
  { label: "Receipt", value: "RECEIPT", icon: "receipt" },
  { label: "Banking", value: "BANKING", icon: "bank" },
  { label: "Medical", value: "MEDICAL", icon: "medical-bag" },
  { label: "Warranty", value: "WARRANTY", icon: "certificate" },
  { label: "Other", value: "OTHER", icon: "folder" }
];

export function labelForCategory(value: string) {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

