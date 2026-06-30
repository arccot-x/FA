import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo } from "react";
import { Dimensions, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { LineChart, PieChart } from "react-native-chart-kit";
import Animated, { FadeInDown } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
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
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />}
      >
        <Animated.View entering={FadeInDown.duration(380)} style={styles.metrics}>
          <MetricTile label={t("analytics.income")} value={money(analytics.income)} icon="cash-multiple" tone="primary" />
          <MetricTile label={t("analytics.expenses")} value={money(analytics.expenses)} icon="trending-down" tone="accent" />
        </Animated.View>

        <TutorialTarget id="analytics.flow">
          <Animated.View
            entering={FadeInDown.delay(60).duration(380)}
            style={[styles.panel, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderRadius: theme.radii.lg, ...theme.shadow("sm") }]}
          >
            <Text style={[styles.panelTitle, { color: theme.colors.text }]}>{t("analytics.incomeVsExpenses")}</Text>
            <IncomeExpenseFlowChart
              width={chartWidth}
              income={analytics.income}
              expenses={analytics.expenses}
              bills={analytics.billsDue}
              money={money}
              labels={{ income: t("analytics.income"), expenses: t("analytics.expenses"), bills: t("analytics.bills"), remaining: t("home.available"), net: t("analytics.netFlow") }}
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

function IncomeExpenseFlowChart({
  width,
  income,
  expenses,
  bills,
  money,
  labels,
  theme
}: {
  width: number;
  income: number;
  expenses: number;
  bills: number;
  money: (value: number) => string;
  labels: { income: string; expenses: string; bills: string; remaining: string; net: string };
  theme: ReturnType<typeof useTheme>;
}) {
  const totalOut = expenses + bills;
  const remaining = Math.max(income - totalOut, 0);
  const maxAmount = Math.max(income, expenses, bills, remaining, 1);
  const flowWidth = (amount: number) => Math.max(4, Math.min(18, 4 + (amount / maxAmount) * 14));
  const sideNodeWidth = 96;
  const centerNodeWidth = 102;
  const rightLeft = width - sideNodeWidth;
  const centerLeft = (width - centerNodeWidth) / 2;

  return (
    <View style={[styles.flowChart, { width }]}>
      <Svg width={width} height={218} style={StyleSheet.absoluteFill} viewBox={`0 0 ${width} 218`}>
        <Path d={`M 88 62 C ${width * 0.32} 62 ${width * 0.38} 104 ${centerLeft} 109`} stroke={theme.colors.primary} strokeWidth={flowWidth(income)} strokeLinecap="round" fill="none" opacity={0.92} />
        <Path d={`M ${centerLeft + centerNodeWidth} 108 C ${width * 0.68} 108 ${width * 0.72} 64 ${rightLeft} 62`} stroke={theme.colors.accent} strokeWidth={flowWidth(expenses)} strokeLinecap="round" fill="none" opacity={0.9} />
        <Path d={`M ${centerLeft + centerNodeWidth} 116 C ${width * 0.68} 116 ${width * 0.72} 156 ${rightLeft} 156`} stroke={theme.colors.warning} strokeWidth={flowWidth(bills)} strokeLinecap="round" fill="none" opacity={0.88} />
        <Path d={`M ${centerLeft + 56} 142 C ${width * 0.48} 176 ${width * 0.25} 178 92 172`} stroke={theme.colors.success} strokeWidth={flowWidth(remaining)} strokeLinecap="round" fill="none" opacity={remaining > 0 ? 0.82 : 0.24} />
      </Svg>

      <FlowNode label={labels.income} value={money(income)} top={28} left={0} color={theme.colors.primary} softColor={theme.colors.primarySoft} theme={theme} />
      <FlowNode label={labels.remaining} value={money(remaining)} top={138} left={0} color={theme.colors.success} softColor={theme.colors.successSoft} theme={theme} />
      <FlowNode label={labels.net} value={money(Math.max(income - totalOut, 0))} top={82} left={centerLeft} color={theme.colors.info} softColor={theme.colors.surfaceAlt} theme={theme} compact />
      <FlowNode label={labels.expenses} value={money(expenses)} top={28} left={rightLeft} color={theme.colors.accent} softColor={theme.colors.accentSoft} theme={theme} />
      <FlowNode label={labels.bills} value={money(bills)} top={138} left={rightLeft} color={theme.colors.warning} softColor={theme.colors.warningSoft} theme={theme} />
    </View>
  );
}

function FlowNode({
  label,
  value,
  top,
  left,
  color,
  softColor,
  theme,
  compact = false
}: {
  label: string;
  value: string;
  top: number;
  left: number;
  color: string;
  softColor: string;
  theme: ReturnType<typeof useTheme>;
  compact?: boolean;
}) {
  return (
    <View style={[styles.flowNode, compact ? styles.flowNodeCenter : null, { top, left, backgroundColor: softColor, borderColor: color, borderRadius: theme.radii.md }]}>
      <Text style={[styles.flowLabel, { color }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.flowValue, { color: theme.colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
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
  panelTitle: {
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 8
  },
  chart: {
    borderRadius: 12,
    marginLeft: -8
  },
  pieFrame: {
    marginLeft: -8,
    overflow: "visible"
  },
  flowChart: {
    height: 218,
    marginTop: 2,
    overflow: "visible"
  },
  flowNode: {
    borderWidth: 1,
    minHeight: 62,
    paddingHorizontal: 10,
    paddingVertical: 9,
    position: "absolute",
    width: 96
  },
  flowNodeCenter: {
    alignItems: "center",
    minHeight: 70,
    justifyContent: "center",
    width: 102
  },
  flowLabel: {
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  flowValue: {
    fontSize: 14,
    fontWeight: "900",
    marginTop: 5
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
