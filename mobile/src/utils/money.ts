export function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export type CurrencyCode = "USD" | "EUR" | "TRY" | "GBP" | "SAR" | "AED";

export const CURRENCIES: { code: CurrencyCode; label: string; symbol: string }[] = [
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "TRY", label: "Turkish Lira", symbol: "₺" },
  { code: "GBP", label: "British Pound", symbol: "£" },
  { code: "SAR", label: "Saudi Riyal", symbol: "﷼" },
  { code: "AED", label: "UAE Dirham", symbol: "د.إ" }
];

export function formatMoney(
  value: string | number | null | undefined,
  currency: CurrencyCode = "USD",
  locale = "en",
  maximumFractionDigits = 0
) {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits
    }).format(toNumber(value));
  } catch {
    const symbol = CURRENCIES.find((item) => item.code === currency)?.symbol ?? "$";
    return `${symbol}${Math.round(toNumber(value))}`;
  }
}

export function currentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function formatDate(value: string | number | Date, locale = "en") {
  try {
    return new Date(value).toLocaleDateString(locale, { month: "short", day: "numeric" });
  } catch {
    return new Date(value).toDateString();
  }
}
