import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useRef, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { BillRow } from "../components/BillRow";
import { Screen } from "../components/Screen";
import { Button, Chip, Field, FormMessage, IconButton, LoadingState, ModalSheet, PressableScale, SegmentedControl } from "../components/ui";
import { billIconOptions, expenseCategoryOptions } from "../constants/options";
import { useFinanceStore } from "../store/useFinanceStore";
import { useTheme } from "../theme";
import { useI18n } from "../i18n";
import { useMoney } from "../utils/CurrencyProvider";
import { TutorialTarget } from "../utils/TutorialProvider";
import { useToast } from "../utils/ToastProvider";
import type { BillOccurrence, ExpenseCategory, TransactionScope } from "../types";
import { toNumber } from "../utils/money";

export function BillCenterScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const { showToast } = useToast();
  const money = useMoney();
  const { bills, load, loading, markBill, editBill, addBill, deleteBill } = useFinanceStore();
  const listRef = useRef<FlatList<BillOccurrence>>(null);
  const [editing, setEditing] = useState<BillOccurrence | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("1");
  const [category, setCategory] = useState<ExpenseCategory>("UTILITIES");
  const [icon, setIcon] = useState("receipt");
  const [applyForever, setApplyForever] = useState(false);
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorError, setEditorError] = useState<string | undefined>();

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const openEditor = (bill: BillOccurrence) => {
    setEditing(bill);
    setName(bill.billTemplate.name);
    setAmount(String(toNumber(bill.amount)));
    setDueDay(String(bill.billTemplate.dueDay ?? new Date(bill.dueDate).getUTCDate()));
    setCategory(bill.billTemplate.category);
    setIcon(bill.billTemplate.icon);
    setApplyForever(false);
    setEditorError(undefined);
  };

  const saveBill = async () => {
    if (!editing) return;
    const nextAmount = Number(amount);
    const rawDueDay = Number(dueDay);
    if (!name.trim()) {
      setEditorError(t("common.requiredField"));
      return;
    }
    if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
      setEditorError(t("common.positiveAmount"));
      return;
    }
    if (!Number.isFinite(rawDueDay) || rawDueDay < 1 || rawDueDay > 31) {
      setEditorError(t("common.validDay"));
      return;
    }
    setEditorError(undefined);
    setEditorSaving(true);
    try {
      await editBill(editing, { name: name.trim(), amount: nextAmount, dueDay: Math.round(rawDueDay), category, icon, forever: applyForever });
      setEditing(null);
      showToast(t("common.saved"));
    } catch (e) {
      setEditorError(e instanceof Error ? e.message : t("common.saveFailed"));
    } finally {
      setEditorSaving(false);
    }
  };

  const setBillStatus = async (status: "UNPAID" | "PAID" | "SKIPPED") => {
    if (!editing) return;
    const bill = editing;
    setEditing(null);
    await markBill(bill, status);
    showToast(t("common.updated"));
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
          void deleteBill(bill).then(() => showToast(t("common.deleted")));
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
        ref={listRef}
        contentContainerStyle={styles.content}
        data={data}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />}
        ListHeaderComponent={
          <Animated.View entering={FadeInDown.duration(400)}>
            <TutorialTarget
              id="bills.primary"
              prepare={() => {
                listRef.current?.scrollToOffset({ offset: 0, animated: true });
                return new Promise<void>((resolve) => setTimeout(resolve, 360));
              }}
            >
              <View style={[styles.summary, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderRadius: theme.radii.xl, ...theme.shadow("sm") }]}>
                <View>
                  <Text style={[styles.summaryLabel, { color: theme.colors.subtleText }]}>{t("bills.remaining")}</Text>
                  <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{money(totalUnpaid)}</Text>
                </View>
                <View style={[styles.summaryIcon, { backgroundColor: theme.colors.primarySoft, borderRadius: theme.radii.lg }]}>
                  <MaterialCommunityIcons color={theme.colors.primary} name="calendar-check" size={28} />
                </View>
              </View>
            </TutorialTarget>
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
        ListEmptyComponent={loading ? <LoadingState rows={3} /> : <Text style={[styles.empty, { color: theme.colors.subtleText }]}>{t("bills.empty")}</Text>}
      />

      <Modal transparent animationType="fade" visible={editing !== null} onRequestClose={() => setEditing(null)} statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
          <Pressable style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]} onPress={() => setEditing(null)}>
            <Pressable style={styles.editorPressable} onPress={() => {}}>
              <Animated.View
                entering={FadeInDown.duration(220)}
                pointerEvents={editorSaving ? "none" : "auto"}
                style={[styles.editor, { backgroundColor: theme.colors.surface, borderRadius: theme.radii.xl, opacity: editorSaving ? 0.6 : 1 }]}
              >
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <Text style={[styles.editorTitle, { color: theme.colors.text }]}>{t("bills.editThisMonth")}</Text>
                  <Text style={[styles.editorLabel, { color: theme.colors.subtleText }]}>{editing?.billTemplate.name}</Text>
                  <View style={styles.editorForm}>
                    <Field
                      label={t("bills.billName")}
                      autoFocus
                      value={name}
                      onChangeText={setName}
                      onBlur={() => {
                        if (!name.trim()) setEditorError(t("common.requiredField"));
                      }}
                      error={editorError === t("common.requiredField") ? editorError : undefined}
                    />
                    <Field
                      label={t("common.amount")}
                      keyboardType="decimal-pad"
                      value={amount}
                      onChangeText={setAmount}
                      onBlur={() => {
                        const parsed = Number(amount);
                        if (amount && (!Number.isFinite(parsed) || parsed <= 0)) setEditorError(t("common.positiveAmount"));
                      }}
                      error={editorError === t("common.positiveAmount") ? editorError : undefined}
                    />
                    <Field
                      label={t("bills.dueDay")}
                      keyboardType="number-pad"
                      value={dueDay}
                      onChangeText={setDueDay}
                      onBlur={() => {
                        const parsed = Number(dueDay);
                        if (dueDay && (!Number.isFinite(parsed) || parsed < 1 || parsed > 31)) setEditorError(t("common.validDay"));
                      }}
                      error={editorError === t("common.validDay") ? editorError : undefined}
                    />
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
                  </View>
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
                    <Button label={t("common.save")} onPress={saveBill} loading={editorSaving} style={styles.editorButton} />
                  </View>
                  <FormMessage message={editorError && ![t("common.requiredField"), t("common.positiveAmount"), t("common.validDay")].includes(editorError) ? editorError : undefined} />
                  <View style={styles.editorStatusActions}>
                    <Button label={t("bills.skip")} icon="pause-circle-outline" variant="secondary" onPress={() => void setBillStatus("SKIPPED")} />
                    <Button label={t("bills.reset")} icon="restore" variant="secondary" onPress={() => void setBillStatus("UNPAID")} />
                  </View>
                  <Button label={t("bills.deleteBill")} icon="trash-can-outline" variant="danger" onPress={confirmDelete} style={styles.editorDelete} />
                </ScrollView>
              </Animated.View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
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
  scope?: TransactionScope;
};

function AddBillModal({ visible, onClose, onSubmit }: { visible: boolean; onClose: () => void; onSubmit: (input: AddBillInput) => Promise<void> }) {
  const theme = useTheme();
  const { t } = useI18n();
  const { showToast } = useToast();
  const inFamily = useFinanceStore((state) => !!state.family?.subscription?.allowed);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("1");
  const [category, setCategory] = useState<ExpenseCategory>("UTILITIES");
  const [icon, setIcon] = useState("receipt");
  const [scope, setScope] = useState<TransactionScope>("PERSONAL");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const save = async () => {
    const parsedAmount = Number(amount);
    const parsedDay = Number(dueDay);
    if (!name.trim()) {
      setError(t("common.requiredField"));
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError(t("common.positiveAmount"));
      return;
    }
    if (!Number.isFinite(parsedDay) || parsedDay < 1 || parsedDay > 31) {
      setError(t("common.validDay"));
      return;
    }
    setError(undefined);
    setSaving(true);
    try {
      await onSubmit({ name: name.trim(), defaultAmount: parsedAmount, dueDay: Math.round(parsedDay), category, icon, scope: inFamily ? scope : "PERSONAL" });
      setName("");
      setAmount("");
      setDueDay("1");
      setCategory("UTILITIES");
      setIcon("receipt");
      setScope("PERSONAL");
      showToast(t("common.saved"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalSheet visible={visible} title={t("bills.newBill")} onClose={onClose}>
      <View pointerEvents={saving ? "none" : "auto"} style={[styles.form, saving && styles.formDisabled]}>
        <Field
          label={t("bills.billName")}
          placeholder={t("bills.billNamePlaceholder")}
          value={name}
          onChangeText={setName}
          onBlur={() => {
            if (!name.trim()) setError(t("common.requiredField"));
          }}
          error={error === t("common.requiredField") ? error : undefined}
        />
        <Field
          label={t("common.amount")}
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
          onBlur={() => {
            const parsed = Number(amount);
            if (amount && (!Number.isFinite(parsed) || parsed <= 0)) setError(t("common.positiveAmount"));
          }}
          error={error === t("common.positiveAmount") ? error : undefined}
        />
        <Field
          label={t("bills.dueDay")}
          keyboardType="number-pad"
          value={dueDay}
          onChangeText={setDueDay}
          onBlur={() => {
            const parsed = Number(dueDay);
            if (dueDay && (!Number.isFinite(parsed) || parsed < 1 || parsed > 31)) setError(t("common.validDay"));
          }}
          error={error === t("common.validDay") ? error : undefined}
        />
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
        <FormMessage message={error && ![t("common.requiredField"), t("common.positiveAmount"), t("common.validDay")].includes(error) ? error : undefined} />
        <Button label={t("bills.createBill")} icon="plus" onPress={save} loading={saving} style={styles.save} />
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
  editorPressable: {
    width: "100%"
  },
  editor: {
    maxHeight: "90%",
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
  editorForm: {
    gap: 14,
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
  editorStatusActions: {
    gap: 10,
    marginTop: 10
  },
  editorDelete: {
    marginTop: 10
  },
  form: {
    gap: 16
  },
  formDisabled: {
    opacity: 0.6
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
