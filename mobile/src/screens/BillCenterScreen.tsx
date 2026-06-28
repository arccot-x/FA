import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { BillRow } from "../components/BillRow";
import { Screen } from "../components/Screen";
import { billIconOptions, expenseCategoryOptions } from "../constants/options";
import { useFinanceStore } from "../store/useFinanceStore";
import { colors, spacing } from "../theme";
import type { BillOccurrence, ExpenseCategory } from "../types";
import { formatMoney, toNumber } from "../utils/money";

export function BillCenterScreen() {
  const { bills, load, markBill, editBillAmount, addBill } = useFinanceStore();
  const [editing, setEditing] = useState<BillOccurrence | null>(null);
  const [adding, setAdding] = useState(false);
  const [amount, setAmount] = useState("");

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const openEditor = (bill: BillOccurrence) => {
    setEditing(bill);
    setAmount(String(toNumber(bill.amount)));
  };

  const saveAmount = async () => {
    if (!editing) {
      return;
    }

    const nextAmount = Number(amount);
    if (!Number.isFinite(nextAmount) || nextAmount < 0) {
      return;
    }

    await editBillAmount(editing, nextAmount);
    setEditing(null);
  };

  const totalUnpaid = bills.unpaid.reduce((sum, bill) => sum + toNumber(bill.amount), 0);

  return (
    <Screen
      title="Bill Center"
      subtitle="Unpaid bills stay first"
      action={
        <TouchableOpacity style={styles.addButton} onPress={() => setAdding(true)}>
          <MaterialCommunityIcons color="#FFFFFF" name="plus" size={24} />
        </TouchableOpacity>
      }
    >
      <FlatList
        contentContainerStyle={styles.content}
        data={[...bills.unpaid, ...bills.settled]}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            <View style={styles.summary}>
              <View>
                <Text style={styles.summaryLabel}>Remaining this month</Text>
                <Text style={styles.summaryValue}>{formatMoney(totalUnpaid)}</Text>
              </View>
              <View style={styles.summaryIcon}>
                <MaterialCommunityIcons color={colors.primary} name="calendar-check" size={30} />
              </View>
            </View>
            <Text style={styles.sectionTitle}>Unpaid</Text>
          </>
        }
        renderItem={({ item, index }) => {
          const firstSettledIndex = bills.unpaid.length;
          const showSettledHeader = index === firstSettledIndex && bills.settled.length > 0;
          return (
            <>
              {showSettledHeader ? <Text style={styles.sectionTitle}>Settled</Text> : null}
              <View style={styles.rowSpace}>
                <BillRow
                  bill={item}
                  onEdit={() => openEditor(item)}
                  onToggle={() => markBill(item, item.status === "PAID" ? "UNPAID" : "PAID")}
                />
              </View>
            </>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No bills yet.</Text>}
      />

      <Modal transparent animationType="fade" visible={editing !== null} onRequestClose={() => setEditing(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.editor}>
            <Text style={styles.editorTitle}>Edit This Month</Text>
            <Text style={styles.editorLabel}>{editing?.billTemplate.name}</Text>
            <TextInput
              autoFocus
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              placeholder="Amount"
              style={styles.input}
            />
            <View style={styles.editorActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setEditing(null)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={saveAmount}>
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <AddBillModal
        visible={adding}
        onClose={() => setAdding(false)}
        onSubmit={async (input) => {
          await addBill(input);
          setAdding(false);
        }}
      />
    </Screen>
  );
}

type AddBillInput = {
  name: string;
  defaultAmount: number;
  dueDay: number;
  category: ExpenseCategory;
  icon: string;
  autopay?: boolean;
};

function AddBillModal({ visible, onClose, onSubmit }: { visible: boolean; onClose: () => void; onSubmit: (input: AddBillInput) => Promise<void> }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("1");
  const [category, setCategory] = useState<ExpenseCategory>("UTILITIES");
  const [icon, setIcon] = useState("receipt");

  const save = async () => {
    const parsedAmount = Number(amount);
    const parsedDay = Math.min(31, Math.max(1, Math.round(Number(dueDay) || 1)));
    if (!name.trim() || !parsedAmount) {
      return;
    }

    await onSubmit({
      name: name.trim(),
      defaultAmount: parsedAmount,
      dueDay: parsedDay,
      category,
      icon
    });
    setName("");
    setAmount("");
    setDueDay("1");
    setCategory("UTILITIES");
    setIcon("receipt");
  };

  return (
    <Modal animationType="slide" visible={visible} onRequestClose={onClose}>
      <ScrollView contentContainerStyle={styles.addModal}>
        <View style={styles.addHeader}>
          <Text style={styles.addTitle}>New Bill</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <MaterialCommunityIcons color={colors.text} name="close" size={24} />
          </TouchableOpacity>
        </View>
        <Text style={styles.inputLabel}>Bill name</Text>
        <TextInput value={name} onChangeText={setName} placeholder="Electric, Rent, Netflix" style={styles.formInput} />
        <Text style={styles.inputLabel}>Amount</Text>
        <TextInput keyboardType="decimal-pad" value={amount} onChangeText={setAmount} style={styles.formInput} />
        <Text style={styles.inputLabel}>Due day</Text>
        <TextInput keyboardType="number-pad" value={dueDay} onChangeText={setDueDay} style={styles.formInput} />
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
        <Text style={styles.inputLabel}>Icon</Text>
        <View style={styles.iconGrid}>
          {billIconOptions.map((item) => {
            const selected = item === icon;
            return (
              <TouchableOpacity key={item} style={[styles.iconChoice, selected && styles.choiceSelected]} onPress={() => setIcon(item)}>
                <MaterialCommunityIcons color={selected ? "#FFFFFF" : colors.primary} name={item} size={23} />
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={save}>
          <Text style={styles.primaryButtonText}>Create Bill</Text>
        </TouchableOpacity>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  addButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 8,
    height: 46,
    justifyContent: "center",
    width: 46
  },
  content: {
    padding: spacing.md,
    paddingBottom: 96
  },
  summary: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
    minHeight: 108,
    padding: spacing.lg
  },
  summaryLabel: {
    color: colors.subtleText,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  summaryValue: {
    color: colors.text,
    fontSize: 34,
    fontWeight: "900",
    marginTop: spacing.xs
  },
  summaryIcon: {
    alignItems: "center",
    backgroundColor: "#E8F4F1",
    borderRadius: 8,
    height: 54,
    justifyContent: "center",
    width: 54
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: spacing.sm,
    marginTop: spacing.sm
  },
  rowSpace: {
    marginBottom: spacing.sm
  },
  empty: {
    color: colors.subtleText,
    padding: spacing.lg,
    textAlign: "center"
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.36)",
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg
  },
  editor: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.lg,
    width: "100%"
  },
  editorTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900"
  },
  editorLabel: {
    color: colors.subtleText,
    marginTop: spacing.xs
  },
  input: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 26,
    fontWeight: "800",
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  editorActions: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "flex-end",
    marginTop: spacing.lg
  },
  cancelButton: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  cancelText: {
    color: colors.text,
    fontWeight: "800"
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  saveText: {
    color: "#FFFFFF",
    fontWeight: "800"
  },
  addModal: {
    backgroundColor: colors.background,
    flexGrow: 1,
    padding: spacing.md,
    paddingTop: spacing.xl
  },
  addHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.lg
  },
  addTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900"
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  inputLabel: {
    color: colors.subtleText,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: spacing.xs,
    marginTop: spacing.md,
    textTransform: "uppercase"
  },
  formInput: {
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
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  iconChoice: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48
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
