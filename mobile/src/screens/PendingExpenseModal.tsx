import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ModalSheet, Field, Button, Chip, ImageViewerModal, PressableScale, SegmentedControl } from "../components/ui";
import { expenseCategoryOptions } from "../constants/options";
import { useI18n } from "../i18n";
import { useTheme } from "../theme";
import { useFinanceStore } from "../store/useFinanceStore";
import { scanReceipt } from "../utils/ai";
import { toNumber } from "../utils/money";
import type { ExpenseCategory, Transaction, TransactionScope } from "../types";

type PendingExpenseModalProps = {
  transaction: Transaction | null;
  onClose: () => void;
  onSubmit: (input: { amount: number; category: ExpenseCategory; merchant?: string; notes?: string; scope?: TransactionScope }) => Promise<void>;
  onDelete?: (transaction: Transaction) => Promise<void>;
};

export function PendingExpenseModal({ transaction, onClose, onSubmit, onDelete }: PendingExpenseModalProps) {
  const { t } = useI18n();
  const theme = useTheme();
  const userId = useFinanceStore((state) => state.user?.id);
  const inFamily = useFinanceStore((state) => !!state.family);
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("GROCERIES");
  const [scope, setScope] = useState<TransactionScope>("PERSONAL");
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const scannedFor = useRef<string | null>(null);

  const isPending = transaction?.status === "PENDING_DETAILS";
  const receiptUri = transaction?.attachments?.find((a) => a.mimeType?.startsWith("image"))?.url;

  // Prefill from the tapped transaction whenever it changes.
  useEffect(() => {
    if (transaction) {
      const amt = toNumber(transaction.amount);
      setAmount(amt ? String(amt) : "");
      setMerchant(transaction.merchant ?? "");
      setNotes(transaction.notes ?? "");
      setCategory(transaction.category ?? "GROCERIES");
      setScope(transaction.scope ?? "PERSONAL");
    }
  }, [transaction]);

  const runScan = async (auto: boolean) => {
    if (!receiptUri || !userId) return;
    setScanning(true);
    try {
      const result = await scanReceipt(receiptUri, userId);
      // Fill empty fields only, so we don't clobber anything the user typed.
      if (result.amount && !Number(amount)) setAmount(String(result.amount));
      if (result.merchant && !merchant.trim()) setMerchant(result.merchant);
      if (result.category) setCategory(result.category);
      if (result.items && !notes.trim()) setNotes(result.items);
    } catch {
      if (!auto) Alert.alert(t("ai.title"), t("ai.failed"));
    } finally {
      setScanning(false);
    }
  };

  // Auto-scan once when a pending receipt with an image opens.
  useEffect(() => {
    if (transaction && isPending && receiptUri && userId && scannedFor.current !== transaction.id) {
      scannedFor.current = transaction.id;
      void runScan(true);
    }
    if (!transaction) scannedFor.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transaction, receiptUri, userId]);

  const save = async () => {
    const parsedAmount = Number(amount);
    if (!parsedAmount) return;
    setSaving(true);
    try {
      await onSubmit({ amount: parsedAmount, category, merchant: merchant.trim() || undefined, notes: notes.trim() || undefined, scope: inFamily ? scope : "PERSONAL" });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!transaction || !onDelete) return;
    Alert.alert(t("transaction.deleteTitle"), t("transaction.deleteMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.delete"), style: "destructive", onPress: () => void onDelete(transaction) }
    ]);
  };

  return (
    <ModalSheet visible={transaction !== null} title={isPending ? t("pending.title") : t("transaction.editTitle")} onClose={onClose}>
      <View style={styles.form}>
        {receiptUri ? (
          <View>
            <PressableScale scaleTo={0.98} onPress={() => setPreviewOpen(true)} style={[styles.receipt, { borderColor: theme.colors.border, borderRadius: theme.radii.lg }]}>
              <Image source={{ uri: receiptUri }} style={styles.receiptImage} resizeMode="cover" />
              <View style={styles.receiptBadge}>
                <MaterialCommunityIcons color="#FFFFFF" name="magnify-plus" size={16} />
                <Text style={styles.receiptBadgeText}>{t("transaction.receipt")}</Text>
              </View>
            </PressableScale>
            <Button
              label={scanning ? t("ai.scanning") : t("ai.scan")}
              icon="robot-outline"
              variant="secondary"
              loading={scanning}
              onPress={() => void runScan(false)}
              style={styles.scanButton}
            />
          </View>
        ) : null}

        <Field label={t("common.amount")} autoFocus={isPending && !receiptUri} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
        {inFamily ? (
          <SegmentedControl
            segments={[
              { value: "PERSONAL", label: t("scope.personal") },
              { value: "HOUSE", label: t("scope.house") }
            ]}
            value={scope}
            onChange={(value) => setScope(value as TransactionScope)}
          />
        ) : null}
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
        {onDelete && transaction ? (
          <Button label={t("transaction.delete")} icon="trash-can-outline" variant="danger" onPress={confirmDelete} />
        ) : null}
      </View>

      <ImageViewerModal uri={previewOpen ? receiptUri ?? null : null} title={t("transaction.receipt")} onClose={() => setPreviewOpen(false)} />
      {scanning && receiptUri ? (
        <View style={[styles.scanOverlay, { backgroundColor: theme.colors.overlay }]} pointerEvents="none">
          <ActivityIndicator color="#FFFFFF" />
          <Text style={styles.scanText}>{t("ai.scanning")}</Text>
        </View>
      ) : null}
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
  save: { marginTop: 4 },
  receipt: {
    borderWidth: 1,
    height: 160,
    overflow: "hidden"
  },
  receiptImage: {
    height: "100%",
    width: "100%"
  },
  receiptBadge: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 999,
    bottom: 10,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    position: "absolute",
    right: 10
  },
  receiptBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800"
  },
  scanButton: {
    marginTop: 10
  },
  scanOverlay: {
    alignItems: "center",
    bottom: 0,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    left: 0,
    paddingVertical: 14,
    position: "absolute",
    right: 0
  },
  scanText: {
    color: "#FFFFFF",
    fontWeight: "800"
  }
});
