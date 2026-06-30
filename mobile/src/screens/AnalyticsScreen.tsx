import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import { BarChart, LineChart, PieChart } from "react-native-chart-kit";
import Animated, { FadeInDown } from "react-native-reanimated";
import { MetricTile } from "../components/MetricTile";
import { Screen } from "../components/Screen";
import { EmptyState } from "../components/ui";
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
  const { load, transactions, incomeCycle, bills } = useFinanceStore();

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
  const pieData = Object.entries(analytics.categories).map(([name, amount], index) => ({
    name: t(`category.${name}` as never),
    amount,
    color: piePalette[index % piePalette.length],
    legendFontColor: theme.colors.subtleText,
    legendFontSize: 12
  }));

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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(380)} style={styles.metrics}>
          <MetricTile label={t("analytics.income")} value={money(analytics.income)} icon="cash-multiple" tone="primary" />
          <MetricTile label={t("analytics.expenses")} value={money(analytics.expenses)} icon="trending-down" tone="accent" />
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(60).duration(380)}
          style={[styles.panel, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderRadius: theme.radii.lg, ...theme.shadow("sm") }]}
        >
          <Text style={[styles.panelTitle, { color: theme.colors.text }]}>{t("analytics.incomeVsExpenses")}</Text>
          <BarChart
            width={chartWidth}
            height={220}
            fromZero
            yAxisLabel=""
            yAxisSuffix=""
            withInnerLines
            data={{ labels: [t("analytics.income"), t("analytics.expenses"), t("analytics.bills")], datasets: [{ data: [analytics.income, analytics.expenses, analytics.billsDue] }] }}
            chartConfig={chartConfig}
            style={styles.chart}
          />
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(120).duration(380)}
          style={[styles.panel, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderRadius: theme.radii.lg, ...theme.shadow("sm") }]}
        >
          <Text style={[styles.panelTitle, { color: theme.colors.text }]}>{t("analytics.categoryMix")}</Text>
          {pieData.length > 0 ? (
            <PieChart width={chartWidth} height={210} data={pieData} accessor="amount" backgroundColor="transparent" paddingLeft="0" chartConfig={chartConfig} />
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

        <Animated.View entering={FadeInDown.delay(170).duration(380)}>
          <BudgetsSection spentByCategory={analytics.categories} />
        </Animated.View>

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
    overflow: "hidden",
    padding: 16
  },
  panelTitle: {
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 8
  },
  chart: {
    borderRadius: 12,
    marginLeft: -8
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
