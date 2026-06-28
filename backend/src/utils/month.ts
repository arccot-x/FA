export function monthStart(input = new Date()) {
  const date = new Date(input);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function parseMonth(value?: string) {
  if (!value) {
    return monthStart();
  }

  const [year, month] = value.split("-").map(Number);
  if (!year || !month || month < 1 || month > 12) {
    throw new Error("Month must be formatted as YYYY-MM");
  }

  return new Date(Date.UTC(year, month - 1, 1));
}

export function dueDateFor(cycleMonth: Date, dueDay: number) {
  const year = cycleMonth.getUTCFullYear();
  const month = cycleMonth.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(dueDay, lastDay), 12));
}

