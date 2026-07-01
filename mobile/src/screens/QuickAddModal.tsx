import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import * as ImagePicker from "expo-image-picker";
import { Button, Chip, FormMessage, IconButton, PressableScale, SegmentedControl } from "../components/ui";
import { expenseCategoryOptions } from "../constants/options";
import { useTheme } from "../theme";
import { useI18n } from "../i18n";
import { useCurrency } from "../utils/CurrencyProvider";
import { useToast } from "../utils/ToastProvider";
import { useFinanceStore } from "../store/useFinanceStore";
import { CURRENCIES } from "../utils/money";
import type { ExpenseCategory, TransactionScope, TransactionType } from "../types";

type QuickAddModalProps = {
  visible: boolean;
  onClose: () => void;
  onCamera: () => void;
  onAttachImage: (uri: string) => void;
  onSubmit: (amount: number, category: ExpenseCategory, scope: TransactionScope, type: TransactionType) => Promise<void>;
};

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "backspace"];

// Curated quick-pick set that always includes "Other".
const QUICK_VALUES: ExpenseCategory[] = ["GROCERIES", "DINING", "GAS", "TRANSPORT", "SHOPPING", "OTHER"];
const quickCategories = QUICK_VALUES.map((value) => expenseCategoryOptions.find((option) => option.value === value)!);

export function QuickAddModal({ visible, onClose, onCamera, onAttachImage, onSubmit }: QuickAddModalProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const { showToast } = useToast();
  const { currency } = useCurrency();
  const symbol = CURRENCIES.find((item) => item.code === currency)?.symbol ?? "$";

  const inFamily = useFinanceStore((state) => !!state.family?.subscription?.allowed);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("GROCERIES");
  const [scope, setScope] = useState<TransactionScope>("PERSONAL");
  const [entryType, setEntryType] = useState<TransactionType>("EXPENSE");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const isIncome = entryType === "INCOME";

  const pickFromGallery = async () => {
    setError(undefined);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
      if (!result.canceled && result.assets[0]) {
        onAttachImage(result.assets[0].uri);
      }
    } catch {
      setError(t("common.uploadFailed"));
    }
  };

  const append = (value: string) => {
    setError(undefined);
    if (value === "." && amount.includes(".")) return;
    setAmount((current) => `${current}${value}`.replace(/^0+(?=\d)/, ""));
  };

  const submit = async () => {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError(t("common.positiveAmount"));
      return;
    }
    setError(undefined);
    setSaving(true);
    try {
      await onSubmit(parsed, category, !isIncome && inFamily ? scope : "PERSONAL", entryType);
      setAmount("");
      setCategory("GROCERIES");
      setScope("PERSONAL");
      setEntryType("EXPENSE");
      onClose();
      showToast(t("common.saved"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal animationType="slide" visible={visible} onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <IconButton icon="close" onPress={onClose} />
          <Text style={[styles.title, { color: theme.colors.text }]}>{t("quickAdd.title")}</Text>
          <View style={styles.headerActions}>
            <IconButton icon="image-multiple" onPress={() => void pickFromGallery()} accessibilityLabel={t("quickAdd.gallery")} />
            <IconButton icon="camera" tone="accent" onPress={onCamera} />
          </View>
        </View>

        <View style={styles.scopeRow}>
          <SegmentedControl
            segments={[
              { value: "EXPENSE", label: t("quickAdd.expense") },
              { value: "INCOME", label: t("quickAdd.income") }
            ]}
            value={entryType}
            onChange={(value) => setEntryType(value as TransactionType)}
          />
        </View>

        <Animated.Text
          key={amount}
          entering={FadeIn.duration(120)}
          adjustsFontSizeToFit
          numberOfLines={1}
          style={[styles.amount, { color: isIncome ? theme.colors.success : theme.colors.text }]}
        >
          {isIncome ? "+" : ""}
          {symbol}
          {amount || "0"}
        </Animated.Text>

        {!isIncome && inFamily ? (
          <View style={styles.scopeRow}>
            <SegmentedControl
              segments={[
                { value: "PERSONAL", label: t("scope.personal") },
                { value: "HOUSE", label: t("scope.house") }
              ]}
              value={scope}
              onChange={(value) => setScope(value as TransactionScope)}
            />
          </View>
        ) : null}

        {!isIncome ? (
          <View style={styles.categoryGrid}>
            {quickCategories.map((item) => (
              <Chip key={item.value} icon={item.icon} label={t(`category.${item.value}` as never)} selected={item.value === category} onPress={() => setCategory(item.value)} />
            ))}
          </View>
        ) : null}

        <View style={styles.keypad}>
          {KEYS.map((key) => (
            <PressableScale
              key={key}
              style={[styles.key, { backgroundColor: theme.colors.surface, borderRadius: theme.radii.md, borderColor: theme.colors.border }]}
              onPress={() => (key === "backspace" ? setAmount((current) => current.slice(0, -1)) : append(key))}
            >
              {key === "backspace" ? (
                <MaterialCommunityIcons color={theme.colors.text} name="backspace-outline" size={24} />
              ) : (
                <Text style={[styles.keyText, { color: theme.colors.text }]}>{key}</Text>
              )}
            </PressableScale>
          ))}
        </View>

        <FormMessage message={error} />
        <Button label={isIncome ? t("quickAdd.addIncome") : t("quickAdd.saveExpense")} icon="check" onPress={submit} loading={saving} style={styles.save} />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 8
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8
  },
  title: {
    fontSize: 21,
    fontWeight: "800"
  },
  headerActions: {
    flexDirection: "row",
    gap: 8
  },
  amount: {
    fontSize: 52,
    fontWeight: "900",
    letterSpacing: -1,
    marginVertical: 16,
    textAlign: "center"
  },
  scopeRow: {
    marginBottom: 12
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  keypad: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    marginTop: 16,
    minHeight: 220
  },
  key: {
    alignItems: "center",
    borderWidth: 1,
    height: 54,
    justifyContent: "center",
    width: "31.5%"
  },
  keyText: {
    fontSize: 28,
    fontWeight: "700"
  },
  save: {
    marginTop: 8
  }
});
