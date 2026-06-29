import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Alert, FlatList, Modal, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { BillRow } from "../components/BillRow";
import { Screen } from "../components/Screen";
import { Button, Chip, Field, IconButton, ModalSheet, PressableScale } from "../components/ui";
import { billIconOptions, expenseCategoryOptions } from "../constants/options";
import { useFinanceStore } from "../store/useFinanceStore";
import { useTheme } from "../theme";
import { useI18n } from "../i18n";
import { useMoney } from "../utils/CurrencyProvider";
import type { BillOccurrence, ExpenseCategory } from "../types";
import { toNumber } from "../utils/money";

export function BillCenterScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const money = useMoney();
  const { bills, load, markBill, editBillAmount, addBill, deleteBill } = useFinanceStore();
  const [editing, setEditing] = useState<BillOccurrence | null>(null);
  const [adding, setAdding] = useState(false);
  const [amount, setAmount] = useState("");
  const [applyForever, setApplyForever] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const openEditor = (bill: BillOccurrence) => {
    setEditing(bill);
    setAmount(String(toNumber(bill.amount)));
    setApplyForever(false);
  };

  const saveAmount = async () => {
    if (!editing) return;
    const nextAmount = Number(amount);
    if (!Number.isFinite(nextAmount) || nextAmount < 0) return;
    await editBillAmount(editing, nextAmount, applyForever);
    setEditing(null);
  };

  const confirmDelete = () => {
    if (!editing) return;
    const bill = editing;
    Alert.alert(t("bills.deleteTitle"), t("bills.deleteMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => {
          setEditing(null);
          void deleteBill(bill);
        }
      }
    ]);
  };

  const totalUnpaid = bills.unpaid.reduce((sum, bill) => sum + toNumber(bill.amount), 0);
  const data = [...bills.unpaid, ...bills.settled];

  return (
    <Screen
      title={t("bills.title")}
      subtitle={t("bills.subtitle")}
      action={<IconButton icon="plus" tone="primary" onPress={() => setAdding(true)} accessibilityLabel={t("bills.newBill")} />}
    >
      <FlatList
        contentContainerStyle={styles.content}
        data={data}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Animated.View entering={FadeInDown.duration(400)}>
            <View style={[styles.summary, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderRadius: theme.radii.xl, ...theme.shadow("sm") }]}>
              <View>
                <Text style={[styles.summaryLabel, { color: theme.colors.subtleText }]}>{t("bills.remaining")}</Text>
                <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{money(totalUnpaid)}</Text>
              </View>
              <View style={[styles.summaryIcon, { backgroundColor: theme.colors.primarySoft, borderRadius: theme.radii.lg }]}>
                <MaterialCommunityIcons color={theme.colors.primary} name="calendar-check" size={28} />
              </View>
            </View>
            {bills.unpaid.length > 0 ? <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t("bills.unpaid")}</Text> : null}
          </Animated.View>
        }
        renderItem={({ item, index }) => {
          const showSettledHeader = index === bills.unpaid.length && bills.settled.length > 0;
          return (
            <>
              {showSettledHeader ? <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t("bills.settled")}</Text> : null}
              <View style={styles.rowSpace}>
                <BillRow bill={item} onEdit={() => openEditor(item)} onToggle={() => markBill(item, item.status === "PAID" ? "UNPAID" : "PAID")} />
              </View>
            </>
          );
        }}
        ListEmptyComponent={<Text style={[styles.empty, { color: theme.colors.subtleText }]}>{t("bills.empty")}</Text>}
      />

      <Modal transparent animationType="fade" visible={editing !== null} onRequestClose={() => setEditing(null)} statusBarTranslucent>
        <View style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}>
          <Animated.View entering={FadeInDown.duration(220)} style={[styles.editor, { backgroundColor: theme.colors.surface, borderRadius: theme.radii.xl }]}>
            <Text style={[styles.editorTitle, { color: theme.colors.text }]}>{t("bills.editThisMonth")}</Text>
            <Text style={[styles.editorLabel, { color: theme.colors.subtleText }]}>{editing?.billTemplate.name}</Text>
            <Field keyboardType="decimal-pad" autoFocus value={amount} onChangeText={setAmount} containerStyle={styles.editorField} />
            <PressableScale
              onPress={() => setApplyForever((value) => !value)}
              style={[styles.foreverRow, { borderColor: theme.colors.border, borderRadius: theme.radii.md }]}
            >
              <MaterialCommunityIcons
                color={applyForever ? theme.colors.primary : theme.colors.muted}
                name={applyForever ? "checkbox-marked" : "checkbox-blank-outline"}
                size={24}
              />
              <View style={styles.foreverText}>
                <Text style={[styles.foreverTitle, { color: theme.colors.text }]}>{t("bills.applyForever")}</Text>
                <Text style={[styles.foreverHint, { color: theme.colors.subtleText }]}>
                  {applyForever ? t("bills.applyForeverHint") : t("bills.thisMonthHint")}
                </Text>
              </View>
            </PressableScale>
            <View style={styles.editorActions}>
              <Button label={t("common.cancel")} variant="secondary" onPress={() => setEditing(null)} style={styles.editorButton} />
              <Button label={t("common.save")} onPress={saveAmount} style={styles.editorButton} />
            </View>
            <Button label={t("bills.deleteBill")} icon="trash-can-outline" variant="danger" onPress={confirmDelete} style={styles.editorDelete} />
          </Animated.View>
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
  const theme = useTheme();
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("1");
  const [category, setCategory] = useState<ExpenseCategory>("UTILITIES");
  const [icon, setIcon] = useState("receipt");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const parsedAmount = Number(amount);
    const parsedDay = Math.min(31, Math.max(1, Math.round(Number(dueDay) || 1)));
    if (!name.trim() || !parsedAmount) return;
    setSaving(true);
    try {
      await onSubmit({ name: name.trim(), defaultAmount: parsedAmount, dueDay: parsedDay, category, icon });
      setName("");
      setAmount("");
      setDueDay("1");
      setCategory("UTILITIES");
      setIcon("receipt");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalSheet visible={visible} title={t("bills.newBill")} onClose={onClose}>
      <View style={styles.form}>
        <Field label={t("bills.billName")} placeholder={t("bills.billNamePlaceholder")} value={name} onChangeText={setName} />
        <Field label={t("common.amount")} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
        <Field label={t("bills.dueDay")} keyboardType="number-pad" value={dueDay} onChangeText={setDueDay} />
        <View>
          <Text style={[styles.formLabel, { color: theme.colors.subtleText }]}>{t("common.category")}</Text>
          <View style={styles.grid}>
            {expenseCategoryOptions.map((item) => (
              <Chip key={item.value} icon={item.icon} label={t(`category.${item.value}` as never)} selected={item.value === category} onPress={() => setCategory(item.value)} />
            ))}
          </View>
        </View>
        <View>
          <Text style={[styles.formLabel, { color: theme.colors.subtleText }]}>{t("bills.icon")}</Text>
          <View style={styles.grid}>
            {billIconOptions.map((item) => (
              <Chip key={item} icon={item} selected={item === icon} onPress={() => setIcon(item)} basis="13%" />
            ))}
          </View>
        </View>
        <Button label={t("bills.createBill")} icon="plus" onPress={save} loading={saving} style={styles.save} />
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 96
  },
  summary: {
    alignItems: "center",
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    minHeight: 108,
    padding: 22
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase"
  },
  summaryValue: {
    fontSize: 34,
    fontWeight: "900",
    marginTop: 6
  },
  summaryIcon: {
    alignItems: "center",
    height: 56,
    justifyContent: "center",
    width: 56
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 8,
    marginTop: 8
  },
  rowSpace: {
    marginBottom: 10
  },
  empty: {
    fontSize: 15,
    fontWeight: "600",
    padding: 24,
    textAlign: "center"
  },
  backdrop: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 24
  },
  editor: {
    padding: 24,
    width: "100%"
  },
  editorTitle: {
    fontSize: 20,
    fontWeight: "900"
  },
  editorLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4
  },
  editorField: {
    marginTop: 16
  },
  foreverRow: {
    alignItems: "center",
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
    padding: 14
  },
  foreverText: {
    flex: 1
  },
  foreverTitle: {
    fontSize: 15,
    fontWeight: "800"
  },
  foreverHint: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2
  },
  editorActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20
  },
  editorButton: {
    flex: 1
  },
  editorDelete: {
    marginTop: 10
  },
  form: {
    gap: 16
  },
  formLabel: {
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
  save: {
    marginTop: 4
  }
});
