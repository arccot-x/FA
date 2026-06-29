import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { ModalSheet, Field, Button, Chip } from "../components/ui";
import { expenseCategoryOptions } from "../constants/options";
import { useI18n } from "../i18n";
import { useTheme } from "../theme";
import { toNumber } from "../utils/money";
import type { ExpenseCategory, Transaction } from "../types";

type PendingExpenseModalProps = {
  transaction: Transaction | null;
  onClose: () => void;
  onSubmit: (input: { amount: number; category: ExpenseCategory; merchant?: string; notes?: string }) => Promise<void>;
  onDelete?: (transaction: Transaction) => Promise<void>;
};

export function PendingExpenseModal({ transaction, onClose, onSubmit, onDelete }: PendingExpenseModalProps) {
  const { t } = useI18n();
  const theme = useTheme();
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("GROCERIES");
  const [saving, setSaving] = useState(false);

  const isPending = transaction?.status === "PENDING_DETAILS";

  // Prefill from the tapped transaction whenever it changes.
  useEffect(() => {
    if (transaction) {
      const amt = toNumber(transaction.amount);
      setAmount(amt ? String(amt) : "");
      setMerchant(transaction.merchant ?? "");
      setNotes(transaction.notes ?? "");
      setCategory(transaction.category ?? "GROCERIES");
    }
  }, [transaction]);

  const save = async () => {
    const parsedAmount = Number(amount);
    if (!parsedAmount) return;
    setSaving(true);
    try {
      await onSubmit({ amount: parsedAmount, category, merchant: merchant.trim() || undefined, notes: notes.trim() || undefined });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!transaction || !onDelete) return;
    Alert.alert(t("transaction.deleteTitle"), t("transaction.deleteMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => {
          void onDelete(transaction);
        }
      }
    ]);
  };

  return (
    <ModalSheet visible={transaction !== null} title={isPending ? t("pending.title") : t("transaction.editTitle")} onClose={onClose}>
      <View style={styles.form}>
        <Field label={t("common.amount")} autoFocus={isPending} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
        <Field label={t("pending.merchant")} value={merchant} onChangeText={setMerchant} />
        <View>
          <Text style={[styles.label, { color: theme.colors.subtleText }]}>{t("common.category")}</Text>
          <View style={styles.grid}>
            {expenseCategoryOptions.map((item) => (
              <Chip key={item.value} icon={item.icon} label={t(`category.${item.value}` as never)} selected={item.value === category} onPress={() => setCategory(item.value)} />
            ))}
          </View>
        </View>
        <Field label={t("pending.notes")} multiline value={notes} onChangeText={setNotes} style={styles.notes} />
        <Button label={t("pending.saveExpense")} icon="check" onPress={save} loading={saving} style={styles.save} />
        {onDelete && transaction && !transaction.id.startsWith("snap-") ? (
          <Button label={t("transaction.delete")} icon="trash-can-outline" variant="danger" onPress={confirmDelete} />
        ) : null}
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  label: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    marginBottom: 8,
    textTransform: "uppercase"
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  notes: {
    minHeight: 88,
    paddingTop: 14,
    textAlignVertical: "top"
  },
  save: { marginTop: 4 }
});
