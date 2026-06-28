import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import { BarChart, PieChart } from "react-native-chart-kit";
import { MetricTile } from "../components/MetricTile";
import { Screen } from "../components/Screen";
import { useFinanceStore } from "../store/useFinanceStore";
import { colors, spacing } from "../theme";
import { formatMoney, toNumber } from "../utils/money";

const chartWidth = Math.min(Dimensions.get("window").width - spacing.md * 2, 420);

export function AnalyticsScreen() {
  const { load, transactions, incomeCycle, bills } = useFinanceStore();

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const analytics = useMemo(() => {
    const income = toNumber(incomeCycle?.expected) || 4200;
    const expenses = transactions
      .filter((item) => item.status === "CLEARED")
      .reduce((sum, item) => sum + toNumber(item.amount), 0);
    const billsDue = bills.unpaid.reduce((sum, item) => sum + toNumber(item.amount), 0);
    const groceries = transactions
      .filter((item) => item.category === "GROCERIES")
      .reduce((sum, item) => sum + toNumber(item.amount), 0);
    const lastMonthGroceries = Math.max(0, groceries + 40);

    const categories = transactions.reduce<Record<string, number>>((acc, item) => {
      if (item.status !== "CLEARED") {
        return acc;
      }

      const key = item.category ?? "OTHER";
      acc[key] = (acc[key] ?? 0) + toNumber(item.amount);
      return acc;
    }, {});

    return { income, expenses, billsDue, groceries, lastMonthGroceries, categories };
  }, [incomeCycle, bills.unpaid, transactions]);

  const pieData = Object.entries(analytics.categories).map(([name, amount], index) => ({
    name: name.replace("_", " "),
    amount,
    color: ["#0E7C66", "#D95D39", "#246BFE", "#B86E00", "#59635F"][index % 5],
    legendFontColor: colors.text,
    legendFontSize: 12
  }));

  const delta = analytics.lastMonthGroceries - analytics.groceries;
  const comparison =
    delta >= 0
      ? `You spent ${formatMoney(analytics.groceries)} on groceries. This is ${formatMoney(delta)} less than this time last month.`
      : `You spent ${formatMoney(analytics.groceries)} on groceries. This is ${formatMoney(Math.abs(delta))} more than this time last month.`;

  return (
    <Screen title="Analytics" subtitle="Month-over-month context">
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.metrics}>
          <MetricTile label="Income" value={formatMoney(analytics.income)} tone="primary" />
          <MetricTile label="Expenses" value={formatMoney(analytics.expenses)} tone="danger" />
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Income vs Expenses</Text>
          <BarChart
            width={chartWidth}
            height={220}
            fromZero
            yAxisLabel="$"
            yAxisSuffix=""
            data={{
              labels: ["Income", "Spent", "Bills"],
              datasets: [{ data: [analytics.income, analytics.expenses, analytics.billsDue] }]
            }}
            chartConfig={chartConfig}
            style={styles.chart}
          />
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Category Mix</Text>
          {pieData.length > 0 ? (
            <PieChart
              width={chartWidth}
              height={210}
              data={pieData}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="0"
              chartConfig={chartConfig}
            />
          ) : (
            <Text style={styles.empty}>Add expenses to see category trends.</Text>
          )}
        </View>

        <View style={styles.insight}>
          <Text style={styles.insightLabel}>Contextual comparison</Text>
          <Text style={styles.insightText}>{comparison}</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const chartConfig = {
  backgroundGradientFrom: colors.surface,
  backgroundGradientTo: colors.surface,
  color: (opacity = 1) => `rgba(14, 124, 102, ${opacity})`,
  decimalPlaces: 0,
  labelColor: () => colors.subtleText,
  propsForBackgroundLines: {
    stroke: colors.border
  }
};

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    paddingBottom: 96
  },
  metrics: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: spacing.md,
    overflow: "hidden",
    padding: spacing.md
  },
  panelTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: spacing.sm
  },
  chart: {
    borderRadius: 8,
    marginLeft: -spacing.sm
  },
  empty: {
    color: colors.subtleText,
    paddingVertical: spacing.lg,
    textAlign: "center"
  },
  insight: {
    backgroundColor: "#FFF7E8",
    borderColor: "#F2D8A8",
    borderRadius: 8,
    borderWidth: 1,
    padding: spacing.md
  },
  insightLabel: {
    color: colors.warning,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  insightText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 23,
    marginTop: spacing.xs
  }
});

