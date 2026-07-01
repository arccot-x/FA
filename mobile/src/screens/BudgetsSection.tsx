import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Button, Chip, Field, FormMessage, ModalSheet } from "../components/ui";
import { categoryIcon, expenseCategoryOptions } from "../constants/options";
import { useBudgets } from "../utils/BudgetProvider";
import { useMoney } from "../utils/CurrencyProvider";
import { useI18n } from "../i18n";
import { useTheme } from "../theme";
import { useToast } from "../utils/ToastProvider";
import type { ExpenseCategory } from "../types";

type BudgetsSectionProps = {
  spentByCategory: Record<string, number>;
};

export function BudgetsSection({ spentByCategory }: BudgetsSectionProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const money = useMoney();
  const { budgets } = useBudgets();
  const [editing, setEditing] = useState(false);

  const entries = (Object.keys(budgets) as ExpenseCategory[]).filter((c) => (budgets[c] ?? 0) > 0);

  return (
    <View style={[styles.panel, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderRadius: theme.radii.lg, ...theme.shadow("sm") }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>{t("budgets.title")}</Text>
        <Button label={t("budgets.manage")} icon="tune-variant" variant="secondary" onPress={() => setEditing(true)} style={styles.manageButton} />
      </View>

      {entries.length === 0 ? (
        <Text style={[styles.empty, { color: theme.colors.subtleText }]}>{t("budgets.empty")}</Text>
      ) : (
        <View style={styles.list}>
          {entries.map((category) => {
            const cap = budgets[category] ?? 0;
            const spent = spentByCategory[category] ?? 0;
            const ratio = cap > 0 ? Math.min(1, spent / cap) : 0;
            const over = spent > cap;
            const remaining = cap - spent;
            const barColor = over ? theme.colors.danger : ratio > 0.85 ? theme.colors.warning : theme.colors.primary;
            return (
              <View key={category} style={styles.row}>
                <View style={[styles.icon, { backgroundColor: theme.colors.primarySoft, borderRadius: theme.radii.sm }]}>
                  <MaterialCommunityIcons color={theme.colors.primary} name={categoryIcon[category]} size={18} />
                </View>
                <View style={styles.rowBody}>
                  <View style={styles.rowTop}>
                    <Text style={[styles.rowLabel, { color: theme.colors.text }]}>{t(`category.${category}` as never)}</Text>
                    <Text style={[styles.rowMeta, { color: over ? theme.colors.danger : theme.colors.subtleText }]}>
                      {over ? t("budgets.over", { amount: money(Math.abs(remaining)) }) : t("budgets.left", { amount: money(remaining) })}
                    </Text>
                  </View>
                  <View style={[styles.track, { backgroundColor: theme.colors.surfaceAlt }]}>
                    <Animated.View entering={FadeIn} style={[styles.fill, { backgroundColor: barColor, width: `${ratio * 100}%` }]} />
                  </View>
                  <Text style={[styles.rowOf, { color: theme.colors.muted }]}>{t("budgets.of", { spent: money(spent), cap: money(cap) })}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <BudgetsEditor visible={editing} onClose={() => setEditing(false)} />
    </View>
  );
}

function BudgetsEditor({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const theme = useTheme();
  const { showToast } = useToast();
  const { budgets, setBudget } = useBudgets();
  const [selected, setSelected] = useState<ExpenseCategory>("GROCERIES");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | undefined>();

  const open = (category: ExpenseCategory) => {
    setSelected(category);
    setValue(budgets[category] ? String(budgets[category]) : "");
    setError(undefined);
  };

  const apply = () => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError(t("common.validAmount"));
      return;
    }
    setError(undefined);
    setBudget(selected, parsed);
    onClose();
    showToast(t("common.saved"));
  };

  return (
    <ModalSheet visible={visible} title={t("budgets.editTitle")} onClose={onClose}>
      <View style={styles.editForm}>
        <Text style={[styles.editLabel, { color: theme.colors.subtleText }]}>{t("common.category")}</Text>
        <View style={styles.grid}>
          {expenseCategoryOptions.map((item) => (
            <Chip
              key={item.value}
              icon={item.icon}
              label={t(`category.${item.value}` as never)}
              selected={item.value === selected}
              onPress={() => open(item.value)}
            />
          ))}
        </View>
        <Field label={t("budgets.cap")} keyboardType="decimal-pad" value={value} onChangeText={setValue} error={error} />
        <FormMessage message={error ? t("common.fixFields") : undefined} />
        <Button label={t("common.save")} icon="content-save" onPress={apply} style={styles.saveButton} />
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    marginBottom: 14,
    padding: 16
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12
  },
  title: {
    fontSize: 17,
    fontWeight: "800"
  },
  manageButton: {
    minHeight: 40,
    paddingHorizontal: 14
  },
  empty: {
    fontSize: 14,
    fontWeight: "600",
    paddingVertical: 8
  },
  list: {
    gap: 16
  },
  row: {
    flexDirection: "row",
    gap: 12
  },
  icon: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    width: 32
  },
  rowBody: {
    flex: 1,
    gap: 6
  },
  rowTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: "800"
  },
  rowMeta: {
    fontSize: 13,
    fontWeight: "700"
  },
  track: {
    borderRadius: 999,
    height: 8,
    overflow: "hidden",
    width: "100%"
  },
  fill: {
    borderRadius: 999,
    height: 8
  },
  rowOf: {
    fontSize: 12,
    fontWeight: "600"
  },
  editForm: {
    gap: 16
  },
  editLabel: {
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
  saveButton: {
    marginTop: 4
  }
});
