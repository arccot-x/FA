import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MetricTile } from "../components/MetricTile";
import { Screen } from "../components/Screen";
import { QuickAddModal } from "./QuickAddModal";
import { useFinanceStore } from "../store/useFinanceStore";
import { colors, spacing } from "../theme";
import type { ExpenseCategory, Transaction } from "../types";
import { formatMoney, toNumber } from "../utils/money";

export function HomeScreen() {
  const navigation = useNavigation();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const { load, loading, offline, incomeCycle, bills, transactions, addManualExpense } = useFinanceStore();

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const totals = useMemo(() => {
    const expected = toNumber(incomeCycle?.expected) || 4200;
    const expenses = transactions
      .filter((item) => item.status === "CLEARED")
      .reduce((sum, item) => sum + toNumber(item.amount), 0);
    const billsDue = bills.unpaid.reduce((sum, item) => sum + toNumber(item.amount), 0);

    return { expected, expenses, billsDue, available: expected - expenses - billsDue };
  }, [incomeCycle, bills.unpaid, transactions]);

  const saveExpense = async (amount: number, category: ExpenseCategory) => {
    await addManualExpense(amount, category);
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionRow}>
      <View style={[styles.transactionIcon, item.status === "PENDING_DETAILS" && styles.pendingIcon]}>
        <MaterialCommunityIcons color={item.status === "PENDING_DETAILS" ? colors.warning : colors.primary} name={item.source === "SNAP_SAVE" ? "camera" : "cash"} size={22} />
      </View>
      <View style={styles.transactionBody}>
        <Text style={styles.transactionTitle}>{item.merchant ?? (item.status === "PENDING_DETAILS" ? "Pending receipt" : item.category)}</Text>
        <Text style={styles.transactionMeta}>{item.status === "PENDING_DETAILS" ? "Needs amount and category" : item.category}</Text>
      </View>
      <Text style={styles.transactionAmount}>{item.amount ? formatMoney(item.amount) : "--"}</Text>
    </View>
  );

  return (
    <Screen title="Dashboard" subtitle={offline ? "Offline demo mode" : "Your current month"}>
      <FlatList
        contentContainerStyle={styles.content}
        data={transactions.slice(0, 6)}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        renderItem={renderTransaction}
        ListHeaderComponent={
          <>
            <View style={styles.metrics}>
              <MetricTile label="Available" value={formatMoney(totals.available)} tone="primary" />
              <MetricTile label="Unpaid Bills" value={formatMoney(totals.billsDue)} tone="danger" />
            </View>
            <View style={styles.metrics}>
              <MetricTile label="Income" value={formatMoney(totals.expected)} />
              <MetricTile label="Spent" value={formatMoney(totals.expenses)} />
            </View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <Text style={styles.sectionHint}>{transactions.filter((item) => item.status === "PENDING_DETAILS").length} pending</Text>
            </View>
          </>
        }
      />

      <TouchableOpacity accessibilityLabel="Quick add expense" style={styles.fab} onPress={() => setQuickAddOpen(true)}>
        <MaterialCommunityIcons color="#FFFFFF" name="plus" size={36} />
      </TouchableOpacity>

      <QuickAddModal
        visible={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onSubmit={saveExpense}
        onCamera={() => {
          setQuickAddOpen(false);
          navigation.navigate("Camera" as never);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    paddingBottom: 120
  },
  metrics: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    marginTop: spacing.md
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800"
  },
  sectionHint: {
    color: colors.subtleText,
    fontWeight: "700"
  },
  transactionRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
    minHeight: 72,
    padding: spacing.md
  },
  transactionIcon: {
    alignItems: "center",
    backgroundColor: "#E8F4F1",
    borderRadius: 8,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  pendingIcon: {
    backgroundColor: "#FFF2D8"
  },
  transactionBody: {
    flex: 1,
    minWidth: 0
  },
  transactionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800"
  },
  transactionMeta: {
    color: colors.subtleText,
    marginTop: 2
  },
  transactionAmount: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800"
  },
  fab: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 32,
    bottom: 28,
    elevation: 7,
    height: 64,
    justifyContent: "center",
    position: "absolute",
    right: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    width: 64
  }
});

