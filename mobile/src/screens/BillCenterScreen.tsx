import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { BillRow } from "../components/BillRow";
import { Screen } from "../components/Screen";
import { useFinanceStore } from "../store/useFinanceStore";
import { colors, spacing } from "../theme";
import type { BillOccurrence } from "../types";
import { formatMoney, toNumber } from "../utils/money";

export function BillCenterScreen() {
  const { bills, load, markBill, editBillAmount } = useFinanceStore();
  const [editing, setEditing] = useState<BillOccurrence | null>(null);
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
    <Screen title="Bill Center" subtitle="Unpaid bills stay first">
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
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  }
});

