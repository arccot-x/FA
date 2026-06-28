import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import { FlatList, Modal, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { MetricTile } from "../components/MetricTile";
import { Screen } from "../components/Screen";
import { QuickAddModal } from "./QuickAddModal";
import { useFinanceStore } from "../store/useFinanceStore";
import { colors, spacing } from "../theme";
import type { ExpenseCategory, Transaction } from "../types";
import { formatMoney, toNumber } from "../utils/money";
import { expenseCategoryOptions, labelForCategory } from "../constants/options";

export function HomeScreen() {
  const navigation = useNavigation();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [pendingExpense, setPendingExpense] = useState<Transaction | null>(null);
  const {
    user,
    load,
    loading,
    offline,
    incomeCycle,
    bills,
    transactions,
    addManualExpense,
    saveIncomeSettings,
    saveExpectedIncome,
    completePendingExpense
  } = useFinanceStore();

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
    <TouchableOpacity
      activeOpacity={item.status === "PENDING_DETAILS" ? 0.75 : 1}
      style={styles.transactionRow}
      onPress={() => {
        if (item.status === "PENDING_DETAILS") {
          setPendingExpense(item);
        }
      }}
    >
      <View style={[styles.transactionIcon, item.status === "PENDING_DETAILS" && styles.pendingIcon]}>
        <MaterialCommunityIcons color={item.status === "PENDING_DETAILS" ? colors.warning : colors.primary} name={item.source === "SNAP_SAVE" ? "camera" : "cash"} size={22} />
      </View>
      <View style={styles.transactionBody}>
        <Text style={styles.transactionTitle}>{item.merchant ?? (item.status === "PENDING_DETAILS" ? "Pending receipt" : labelForCategory(item.category ?? "OTHER"))}</Text>
        <Text style={styles.transactionMeta}>{item.status === "PENDING_DETAILS" ? "Tap to add details" : labelForCategory(item.category ?? "OTHER")}</Text>
      </View>
      <Text style={styles.transactionAmount}>{item.amount ? formatMoney(item.amount) : "--"}</Text>
    </TouchableOpacity>
  );

  return (
    <Screen
      title="Dashboard"
      subtitle={offline ? "Offline demo mode" : "Your current month"}
      action={
        <TouchableOpacity style={styles.headerButton} onPress={() => setIncomeOpen(true)}>
          <MaterialCommunityIcons color={colors.text} name="tune-variant" size={24} />
        </TouchableOpacity>
      }
    >
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

      <IncomeModal
        visible={incomeOpen}
        userIncome={toNumber(user?.defaultMonthlyIncome)}
        currentExpected={toNumber(incomeCycle?.expected)}
        paydayDay={user?.paydayDay ?? 1}
        variableIncomeEnabled={user?.variableIncomeEnabled ?? false}
        onClose={() => setIncomeOpen(false)}
        onSaveSettings={saveIncomeSettings}
        onSaveExpected={saveExpectedIncome}
      />

      <PendingExpenseModal
        transaction={pendingExpense}
        onClose={() => setPendingExpense(null)}
        onSubmit={async (input) => {
          if (!pendingExpense) {
            return;
          }
          await completePendingExpense(pendingExpense, input);
          setPendingExpense(null);
        }}
      />
    </Screen>
  );
}

type IncomeModalProps = {
  visible: boolean;
  userIncome: number;
  currentExpected: number;
  paydayDay: number;
  variableIncomeEnabled: boolean;
  onClose: () => void;
  onSaveSettings: (input: { defaultMonthlyIncome: number; paydayDay: number; variableIncomeEnabled: boolean }) => Promise<void>;
  onSaveExpected: (expected: number) => Promise<void>;
};

function IncomeModal({ visible, userIncome, currentExpected, paydayDay, variableIncomeEnabled, onClose, onSaveSettings, onSaveExpected }: IncomeModalProps) {
  const [income, setIncome] = useState(String(userIncome || 4200));
  const [expected, setExpected] = useState(String(currentExpected || userIncome || 4200));
  const [payday, setPayday] = useState(String(paydayDay || 1));
  const [variable, setVariable] = useState(variableIncomeEnabled);

  const save = async () => {
    const parsedIncome = Math.max(0, Number(income) || 0);
    const parsedExpected = Math.max(0, Number(expected) || parsedIncome);
    const parsedPayday = Math.min(31, Math.max(1, Math.round(Number(payday) || 1)));
    await onSaveSettings({ defaultMonthlyIncome: parsedIncome, paydayDay: parsedPayday, variableIncomeEnabled: variable });
    await onSaveExpected(parsedExpected);
    onClose();
  };

  return (
    <Modal animationType="slide" visible={visible} onRequestClose={onClose}>
      <ScrollView contentContainerStyle={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Income Engine</Text>
          <TouchableOpacity style={styles.headerButton} onPress={onClose}>
            <MaterialCommunityIcons color={colors.text} name="close" size={24} />
          </TouchableOpacity>
        </View>
        <Text style={styles.inputLabel}>Default monthly income</Text>
        <TextInput keyboardType="decimal-pad" value={income} onChangeText={setIncome} style={styles.input} />
        <Text style={styles.inputLabel}>Payday day</Text>
        <TextInput keyboardType="number-pad" value={payday} onChangeText={setPayday} style={styles.input} />
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={styles.switchTitle}>Variable income</Text>
            <Text style={styles.switchMeta}>Use a specific expected income for this month.</Text>
          </View>
          <Switch value={variable} onValueChange={setVariable} trackColor={{ true: colors.primary, false: colors.border }} />
        </View>
        <Text style={styles.inputLabel}>This month's expected income</Text>
        <TextInput keyboardType="decimal-pad" value={expected} onChangeText={setExpected} style={styles.input} />
        <TouchableOpacity style={styles.primaryButton} onPress={save}>
          <Text style={styles.primaryButtonText}>Save Income</Text>
        </TouchableOpacity>
      </ScrollView>
    </Modal>
  );
}

type PendingExpenseModalProps = {
  transaction: Transaction | null;
  onClose: () => void;
  onSubmit: (input: { amount: number; category: ExpenseCategory; merchant?: string; notes?: string }) => Promise<void>;
};

function PendingExpenseModal({ transaction, onClose, onSubmit }: PendingExpenseModalProps) {
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("GROCERIES");

  const save = async () => {
    const parsedAmount = Number(amount);
    if (!parsedAmount) {
      return;
    }
    await onSubmit({ amount: parsedAmount, category, merchant: merchant.trim() || undefined, notes: notes.trim() || undefined });
    setAmount("");
    setMerchant("");
    setNotes("");
    setCategory("GROCERIES");
  };

  return (
    <Modal animationType="slide" visible={transaction !== null} onRequestClose={onClose}>
      <ScrollView contentContainerStyle={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Complete Receipt</Text>
          <TouchableOpacity style={styles.headerButton} onPress={onClose}>
            <MaterialCommunityIcons color={colors.text} name="close" size={24} />
          </TouchableOpacity>
        </View>
        <Text style={styles.inputLabel}>Amount</Text>
        <TextInput autoFocus keyboardType="decimal-pad" value={amount} onChangeText={setAmount} style={styles.input} />
        <Text style={styles.inputLabel}>Merchant</Text>
        <TextInput value={merchant} onChangeText={setMerchant} style={styles.input} />
        <Text style={styles.inputLabel}>Category</Text>
        <View style={styles.choiceGrid}>
          {expenseCategoryOptions.map((item) => {
            const selected = item.value === category;
            return (
              <TouchableOpacity key={item.value} style={[styles.choice, selected && styles.choiceSelected]} onPress={() => setCategory(item.value)}>
                <MaterialCommunityIcons color={selected ? "#FFFFFF" : colors.primary} name={item.icon} size={20} />
                <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.inputLabel}>Notes</Text>
        <TextInput multiline value={notes} onChangeText={setNotes} style={[styles.input, styles.notesInput]} />
        <TouchableOpacity style={styles.primaryButton} onPress={save}>
          <Text style={styles.primaryButtonText}>Save Expense</Text>
        </TouchableOpacity>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    paddingBottom: 120
  },
  headerButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44
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
  },
  modalContent: {
    backgroundColor: colors.background,
    flexGrow: 1,
    padding: spacing.md,
    paddingTop: spacing.xl
  },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.lg
  },
  modalTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900"
  },
  inputLabel: {
    color: colors.subtleText,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: spacing.xs,
    marginTop: spacing.md,
    textTransform: "uppercase"
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    minHeight: 52,
    paddingHorizontal: spacing.md
  },
  notesInput: {
    minHeight: 88,
    paddingTop: spacing.md,
    textAlignVertical: "top"
  },
  switchRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.md,
    padding: spacing.md
  },
  switchText: {
    flex: 1,
    paddingRight: spacing.md
  },
  switchTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900"
  },
  switchMeta: {
    color: colors.subtleText,
    marginTop: 2
  },
  choiceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  choice: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: "31%",
    gap: spacing.xs,
    minHeight: 70,
    justifyContent: "center"
  },
  choiceSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  choiceText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "800"
  },
  choiceTextSelected: {
    color: "#FFFFFF"
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 8,
    justifyContent: "center",
    marginTop: spacing.lg,
    minHeight: 56
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900"
  }
});
