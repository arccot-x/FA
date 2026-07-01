import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { Chip, Field, ModalSheet, PressableScale } from "../components/ui";
import { categoryIcon, expenseCategoryOptions } from "../constants/options";
import { useI18n } from "../i18n";
import { useTheme } from "../theme";
import { useMoney } from "../utils/CurrencyProvider";
import { formatDate } from "../utils/money";
import type { ExpenseCategory, Transaction } from "../types";

type AllActivityModalProps = {
  visible: boolean;
  transactions: Transaction[];
  onClose: () => void;
  onSelect: (transaction: Transaction) => void;
};

export function AllActivityModal({ visible, transactions, onClose, onSelect }: AllActivityModalProps) {
  const theme = useTheme();
  const { t, locale } = useI18n();
  const money = useMoney();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ExpenseCategory | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((item) => {
      if (category && item.category !== category) return false;
      if (!q) return true;
      const haystack = `${item.merchant ?? ""} ${item.category ?? ""} ${item.notes ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [transactions, query, category]);

  const renderItem = ({ item }: { item: Transaction }) => {
    const isPending = item.status === "PENDING_DETAILS";
    const icon = isPending ? "camera" : item.category ? categoryIcon[item.category] : "cash";
    return (
      <PressableScale
        scaleTo={0.98}
        onPress={() => onSelect(item)}
        style={[styles.row, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderRadius: theme.radii.lg }]}
      >
        <View style={[styles.icon, { backgroundColor: isPending ? theme.colors.warningSoft : theme.colors.primarySoft, borderRadius: theme.radii.md }]}>
          <MaterialCommunityIcons color={isPending ? theme.colors.warning : theme.colors.primary} name={icon as never} size={20} />
        </View>
        <View style={styles.body}>
          <Text numberOfLines={1} style={[styles.name, { color: theme.colors.text }]}>
            {item.merchant ?? (isPending ? t("home.pendingReceipt") : t(`category.${item.category ?? "OTHER"}` as never))}
          </Text>
          <Text style={[styles.meta, { color: theme.colors.subtleText }]}>{formatDate(item.occurredAt, locale)}</Text>
        </View>
        <Text style={[styles.amount, { color: theme.colors.text }]}>{item.amount ? money(item.amount) : "—"}</Text>
      </PressableScale>
    );
  };

  return (
    <ModalSheet visible={visible} title={t("activity.title")} onClose={onClose} scroll={false}>
      <Field placeholder={t("activity.search")} value={query} onChangeText={setQuery} containerStyle={styles.search} />
      <View style={styles.filters}>
        <Chip label={t("activity.title")} selected={category === null} onPress={() => setCategory(null)} basis="auto" />
        {expenseCategoryOptions.map((item) => (
          <Chip key={item.value} icon={item.icon} selected={category === item.value} onPress={() => setCategory(category === item.value ? null : item.value)} basis="auto" />
        ))}
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.colors.subtleText }]}>
            {query.trim() && category
              ? t("activity.noneFilteredSearch", { query: query.trim(), category: t(`category.${category}` as never) })
              : query.trim()
                ? t("activity.noneSearch", { query: query.trim() })
                : category
                  ? t("activity.noneCategory", { category: t(`category.${category}` as never) })
                  : t("activity.none")}
          </Text>
        }
      />
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  search: { marginBottom: 12 },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12
  },
  list: { paddingBottom: 24 },
  sep: { height: 10 },
  row: {
    alignItems: "center",
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 64,
    padding: 12
  },
  icon: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40
  },
  body: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: "800" },
  meta: { fontSize: 13, fontWeight: "600", marginTop: 2 },
  amount: { fontSize: 16, fontWeight: "800" },
  empty: { fontSize: 15, fontWeight: "600", paddingVertical: 32, textAlign: "center" }
});
