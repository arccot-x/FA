import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useRef } from "react";
import type { ComponentProps } from "react";
import { Dimensions, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { LineChart, PieChart } from "react-native-chart-kit";
import Animated, { FadeInDown } from "react-native-reanimated";
import { MetricTile } from "../components/MetricTile";
import { Screen } from "../components/Screen";
import { EmptyState } from "../components/ui";
import { TutorialTarget } from "../utils/TutorialProvider";
import { BudgetsSection } from "./BudgetsSection";
import { GoalsSection } from "./GoalsSection";
import { useFinanceStore } from "../store/useFinanceStore";
import { useTheme } from "../theme";
import { useI18n } from "../i18n";
import { useMoney } from "../utils/CurrencyProvider";
import { toNumber } from "../utils/money";

const chartWidth = Math.min(Dimensions.get("window").width - 32 - 32, 420);

export function AnalyticsScreen() {
  const theme = useTheme();
  const { t, locale } = useI18n();
  const money = useMoney();
  const { load, loading, transactions, incomeCycle, bills } = useFinanceStore();
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const analytics = useMemo(() => {
    const now = new Date();
    const income = toNumber(incomeCycle?.expected) || 4200;
    const cleared = transactions.filter((item) => item.status === "CLEARED" && item.type !== "INCOME");
    const inMonth = (offset: number) => (date: Date) => {
      const ref = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      return date.getMonth() === ref.getMonth() && date.getFullYear() === ref.getFullYear();
    };
    const current = cleared.filter((item) => inMonth(0)(new Date(item.occurredAt)));
    const previous = cleared.filter((item) => inMonth(-1)(new Date(item.occurredAt)));
    const sumCat = (list: typeof cleared, cat: string) => list.filter((i) => i.category === cat).reduce((s, i) => s + toNumber(i.amount), 0);

    const expenses = current.reduce((sum, item) => sum + toNumber(item.amount), 0);
    const billsDue = bills.unpaid.reduce((sum, item) => sum + toNumber(item.amount), 0);
    const categories = current.reduce<Record<string, number>>((acc, item) => {
      const key = item.category ?? "OTHER";
      acc[key] = (acc[key] ?? 0) + toNumber(item.amount);
      return acc;
    }, {});

    // Last 6 months of total spend for the trend line.
    const trend = Array.from({ length: 6 }, (_, i) => {
      const ref = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const total = cleared
        .filter((item) => {
          const d = new Date(item.occurredAt);
          return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
        })
        .reduce((sum, item) => sum + toNumber(item.amount), 0);
      return { label: ref.toLocaleDateString(locale, { month: "short" }), total };
    });

    return { income, expenses, billsDue, groceries: sumCat(current, "GROCERIES"), lastMonthGroceries: sumCat(previous, "GROCERIES"), categories, trend };
  }, [incomeCycle, bills.unpaid, transactions, locale]);

  const piePalette = [theme.colors.primary, theme.colors.accent, theme.colors.info, theme.colors.warning, theme.colors.success, theme.colors.muted];
  const categoryEntries = Object.entries(analytics.categories);
  // Once there are more categories than fixed brand colors, generate evenly-spaced
  // hues instead of cycling the palette, so no two slices ever share a color.
  const pieColor = (index: number) =>
    categoryEntries.length <= piePalette.length
      ? piePalette[index % piePalette.length]
      : `hsl(${Math.round((index * 360) / categoryEntries.length)}, ${theme.isDark ? 62 : 55}%, ${theme.isDark ? 62 : 45}%)`;
  const pieData = categoryEntries.map(([name, amount], index) => ({
    name: t(`category.${name}` as never),
    amount,
    color: pieColor(index),
    legendFontColor: theme.colors.subtleText,
    legendFontSize: 12
  }));

  const spentPercent = analytics.income > 0 ? Math.round(((analytics.expenses + analytics.billsDue) / analytics.income) * 100) : 0;

  const delta = analytics.lastMonthGroceries - analytics.groceries;
  const comparison =
    analytics.lastMonthGroceries === 0
      ? t("analytics.cmpFirst", { current: money(analytics.groceries) })
      : delta >= 0
        ? t("analytics.cmpLess", { current: money(analytics.groceries), delta: money(delta) })
        : t("analytics.cmpMore", { current: money(analytics.groceries), delta: money(Math.abs(delta)) });

  const chartConfig = {
    backgroundGradientFrom: theme.colors.card,
    backgroundGradientTo: theme.colors.card,
    color: (opacity = 1) => hexToRgba(theme.colors.primary, opacity),
    decimalPlaces: 0,
    labelColor: () => theme.colors.subtleText,
    barPercentage: 0.6,
    propsForBackgroundLines: { stroke: theme.colors.border }
  };

  return (
    <Screen title={t("analytics.title")} subtitle={t("analytics.subtitle")}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />}
      >
        <Animated.View entering={FadeInDown.duration(380)} style={styles.metrics}>
          <MetricTile label={t("analytics.income")} value={money(analytics.income)} icon="cash-multiple" tone="primary" />
          <MetricTile label={t("analytics.expenses")} value={money(analytics.expenses)} icon="trending-down" tone="accent" />
        </Animated.View>

        <TutorialTarget
          id="analytics.flow"
          prepare={() => {
            scrollRef.current?.scrollTo({ y: 70, animated: true });
            return new Promise<void>((resolve) => setTimeout(resolve, 360));
          }}
        >
          <Animated.View
            entering={FadeInDown.delay(60).duration(380)}
            style={[styles.panel, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderRadius: theme.radii.lg, ...theme.shadow("sm") }]}
          >
            <View style={styles.panelHeaderRow}>
              <Text style={[styles.panelTitle, { color: theme.colors.text }]}>{t("analytics.incomeVsExpenses")}</Text>
              {analytics.income > 0 ? (
                <View style={[styles.spentBadge, { backgroundColor: spentPercent >= 100 ? theme.colors.dangerSoft : theme.colors.warningSoft, borderRadius: theme.radii.pill }]}>
                  <Text style={[styles.spentBadgeText, { color: spentPercent >= 100 ? theme.colors.danger : theme.colors.warning }]}>
                    {t("analytics.spentPercent", { percent: spentPercent })}
                  </Text>
                </View>
              ) : null}
            </View>
            <IncomeExpenseSummary
              income={analytics.income}
              expenses={analytics.expenses}
              bills={analytics.billsDue}
              money={money}
              labels={{ income: t("analytics.income"), expenses: t("analytics.expenses"), bills: t("analytics.bills"), remaining: t("home.available") }}
              theme={theme}
            />
            <IncomeBreakdownBar
              income={analytics.income}
              expenses={analytics.expenses}
              bills={analytics.billsDue}
              money={money}
              labels={{ expenses: t("analytics.expenses"), bills: t("analytics.bills"), remaining: t("home.available") }}
              theme={theme}
            />
          </Animated.View>
        </TutorialTarget>

        <Animated.View
          entering={FadeInDown.delay(120).duration(380)}
          style={[styles.panel, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderRadius: theme.radii.lg, ...theme.shadow("sm") }]}
        >
          <Text style={[styles.panelTitle, { color: theme.colors.text }]}>{t("analytics.categoryMix")}</Text>
          {pieData.length > 0 ? (
            <View style={styles.pieFrame}>
              <PieChart width={chartWidth} height={210} data={pieData} accessor="amount" backgroundColor="transparent" paddingLeft="12" chartConfig={chartConfig} />
            </View>
          ) : (
            <EmptyState icon="chart-donut" message={t("analytics.addExpenses")} />
          )}
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(150).duration(380)}
          style={[styles.panel, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderRadius: theme.radii.lg, ...theme.shadow("sm") }]}
        >
          <Text style={[styles.panelTitle, { color: theme.colors.text }]}>{t("trends.title")}</Text>
          {analytics.trend.some((point) => point.total > 0) ? (
            <LineChart
              width={chartWidth}
              height={200}
              fromZero
              bezier
              withInnerLines
              yAxisLabel=""
              yAxisSuffix=""
              data={{ labels: analytics.trend.map((point) => point.label), datasets: [{ data: analytics.trend.map((point) => point.total) }] }}
              chartConfig={chartConfig}
              style={styles.chart}
            />
          ) : (
            <EmptyState icon="chart-line" message={t("trends.empty")} />
          )}
        </Animated.View>

        <TutorialTarget
          id="analytics.budgets"
          prepare={() => {
            scrollRef.current?.scrollTo({ y: 620, animated: true });
            return new Promise<void>((resolve) => setTimeout(resolve, 360));
          }}
        >
          <Animated.View entering={FadeInDown.delay(170).duration(380)}>
            <BudgetsSection spentByCategory={analytics.categories} />
          </Animated.View>
        </TutorialTarget>

        <Animated.View entering={FadeInDown.delay(190).duration(380)}>
          <GoalsSection />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(220).duration(380)} style={[styles.insight, { backgroundColor: theme.colors.warningSoft, borderColor: theme.colors.warning, borderRadius: theme.radii.lg }]}>
          <Text style={[styles.insightLabel, { color: theme.colors.warning }]}>{t("analytics.comparisonLabel")}</Text>
          <Text style={[styles.insightText, { color: theme.colors.text }]}>{comparison}</Text>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

function hexToRgba(hex: string, opacity: number) {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function IncomeExpenseSummary({
  income,
  expenses,
  bills,
  money,
  labels,
  theme
}: {
  income: number;
  expenses: number;
  bills: number;
  money: (value: number) => string;
  labels: { income: string; expenses: string; bills: string; remaining: string };
  theme: ReturnType<typeof useTheme>;
}) {
  const remaining = Math.max(income - expenses - bills, 0);
  const cards: { label: string; value: number; color: string; soft: string; icon: ComponentProps<typeof MaterialCommunityIcons>["name"] }[] = [
    { label: labels.income, value: income, color: theme.colors.primary, soft: theme.colors.primarySoft, icon: "cash-multiple" },
    { label: labels.expenses, value: expenses, color: theme.colors.accent, soft: theme.colors.accentSoft, icon: "trending-down" },
    { label: labels.bills, value: bills, color: theme.colors.warning, soft: theme.colors.warningSoft, icon: "calendar-clock" },
    { label: labels.remaining, value: remaining, color: theme.colors.success, soft: theme.colors.successSoft, icon: "piggy-bank-outline" }
  ];

  return (
    <View style={styles.summaryGrid}>
      {cards.map((card) => (
        <View key={card.label} style={[styles.summaryCard, { backgroundColor: card.soft, borderColor: card.color, borderRadius: theme.radii.md }]}>
          <View style={styles.summaryHeaderRow}>
            <MaterialCommunityIcons color={card.color} name={card.icon} size={16} />
            <Text style={[styles.summaryLabel, { color: card.color }]} numberOfLines={1}>
              {card.label}
            </Text>
          </View>
          <Text style={[styles.summaryValue, { color: theme.colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
            {money(card.value)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function IncomeBreakdownBar({
  income,
  expenses,
  bills,
  money,
  labels,
  theme
}: {
  income: number;
  expenses: number;
  bills: number;
  money: (value: number) => string;
  labels: { expenses: string; bills: string; remaining: string };
  theme: ReturnType<typeof useTheme>;
}) {
  const remaining = Math.max(income - expenses - bills, 0);
  const total = Math.max(income, expenses + bills + remaining, 1);
  const segments = [
    { key: "expenses", label: labels.expenses, value: expenses, color: theme.colors.accent },
    { key: "bills", label: labels.bills, value: bills, color: theme.colors.warning },
    { key: "remaining", label: labels.remaining, value: remaining, color: theme.colors.success }
  ].filter((segment) => segment.value > 0);

  if (segments.length === 0) return null;

  return (
    <View style={styles.breakdown}>
      <View style={[styles.breakdownTrack, { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radii.pill }]}>
        {segments.map((segment) => (
          <View key={segment.key} style={{ flex: segment.value / total, backgroundColor: segment.color }} />
        ))}
      </View>
      <View style={styles.breakdownLegend}>
        {segments.map((segment) => (
          <View key={segment.key} style={styles.breakdownLegendItem}>
            <View style={[styles.breakdownDot, { backgroundColor: segment.color }]} />
            <Text style={[styles.breakdownLegendLabel, { color: theme.colors.subtleText }]} numberOfLines={1}>
              {segment.label}
            </Text>
            <Text style={[styles.breakdownLegendValue, { color: theme.colors.text }]} numberOfLines={1}>
              {money(segment.value)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 96
  },
  metrics: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14
  },
  panel: {
    borderWidth: 1,
    marginBottom: 14,
    padding: 16
  },
  panelHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8
  },
  panelTitle: {
    fontSize: 17,
    fontWeight: "800"
  },
  spentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  spentBadgeText: {
    fontSize: 12,
    fontWeight: "900"
  },
  breakdown: {
    marginTop: 6
  },
  breakdownTrack: {
    flexDirection: "row",
    height: 10,
    overflow: "hidden",
    width: "100%"
  },
  breakdownLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 12
  },
  breakdownLegendItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6
  },
  breakdownDot: {
    borderRadius: 999,
    height: 8,
    width: 8
  },
  breakdownLegendLabel: {
    fontSize: 12,
    fontWeight: "700"
  },
  breakdownLegendValue: {
    fontSize: 12,
    fontWeight: "900"
  },
  chart: {
    borderRadius: 12,
    marginLeft: -8
  },
  pieFrame: {
    marginLeft: -8,
    overflow: "visible"
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  summaryCard: {
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  summaryHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "900",
    marginTop: 6
  },
  insight: {
    borderWidth: 1,
    padding: 16
  },
  insightLabel: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase"
  },
  insightText: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 23,
    marginTop: 6
  }
});
