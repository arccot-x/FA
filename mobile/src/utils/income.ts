// Monthly income engine. Turns raw figures (expected income, spend, unpaid bills,
// payday) into the derived numbers the dashboard shows: what's left, what's safe to
// spend each day until payday, and how much of the income is already committed.

export type IncomeSummary = {
  expected: number;
  base: number; // actual received if marked received, else expected
  isReceived: boolean;
  spent: number;
  billsDue: number;
  committed: number; // spent + billsDue
  available: number; // base - committed (can be negative)
  usedRatio: number; // committed / base, clamped 0..1 for the ring
  overBudget: boolean;
  daysToPayday: number; // whole days until next payday (>= 0)
  isPaydayToday: boolean;
  dailyAllowance: number; // safe-to-spend per remaining day until payday
};

export function daysUntilPayday(paydayDay: number, now = new Date()): { days: number; isToday: boolean } {
  const day = Math.min(31, Math.max(1, Math.round(paydayDay || 1)));
  const today = now.getDate();

  if (today === day) {
    return { days: 0, isToday: true };
  }

  // Clamp the target day to a valid date in the relevant month (handles e.g. payday 31 in Feb).
  const buildPayday = (year: number, month: number) => {
    const lastDay = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(day, lastDay));
  };

  let target = buildPayday(now.getFullYear(), now.getMonth());
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), today);

  if (target <= startOfToday) {
    target = buildPayday(now.getFullYear(), now.getMonth() + 1);
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  const days = Math.max(0, Math.round((target.getTime() - startOfToday.getTime()) / msPerDay));
  return { days, isToday: false };
}

export function summariseIncome(input: {
  expected: number;
  received?: number | null;
  spent: number;
  billsDue: number;
  paydayDay: number;
  now?: Date;
}): IncomeSummary {
  const expected = Math.max(0, input.expected);
  const received = Math.max(0, input.received ?? 0);
  const isReceived = received > 0;
  const base = isReceived ? received : expected;
  const spent = Math.max(0, input.spent);
  const billsDue = Math.max(0, input.billsDue);
  const committed = spent + billsDue;
  const available = base - committed;

  const { days, isToday } = daysUntilPayday(input.paydayDay, input.now);
  // Spread the remaining money across the days left in the cycle (at least today).
  const remainingDays = Math.max(1, isToday ? 1 : days);
  const dailyAllowance = Math.max(0, available) / remainingDays;

  const usedRatio = base > 0 ? Math.min(1, committed / base) : committed > 0 ? 1 : 0;

  return {
    expected,
    base,
    isReceived,
    spent,
    billsDue,
    committed,
    available,
    usedRatio,
    overBudget: available < 0,
    daysToPayday: days,
    isPaydayToday: isToday,
    dailyAllowance
  };
}
