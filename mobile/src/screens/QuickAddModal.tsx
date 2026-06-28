import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { ExpenseCategory } from "../types";
import { colors, spacing } from "../theme";
import { expenseCategoryOptions } from "../constants/options";

type QuickAddModalProps = {
  visible: boolean;
  onClose: () => void;
  onCamera: () => void;
  onSubmit: (amount: number, category: ExpenseCategory) => Promise<void>;
};

export function QuickAddModal({ visible, onClose, onCamera, onSubmit }: QuickAddModalProps) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("GROCERIES");

  const append = (value: string) => {
    if (value === "." && amount.includes(".")) {
      return;
    }

    setAmount((current) => `${current}${value}`.replace(/^0+(?=\d)/, ""));
  };

  const submit = async () => {
    const parsed = Number(amount);
    if (!parsed) {
      return;
    }

    await onSubmit(parsed, category);
    setAmount("");
    setCategory("GROCERIES");
    onClose();
  };

  return (
    <Modal animationType="slide" visible={visible} onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton} onPress={onClose}>
            <MaterialCommunityIcons color={colors.text} name="close" size={26} />
          </TouchableOpacity>
          <Text style={styles.title}>Quick Add</Text>
          <TouchableOpacity style={[styles.iconButton, styles.cameraButton]} onPress={onCamera}>
            <MaterialCommunityIcons color="#FFFFFF" name="camera" size={25} />
          </TouchableOpacity>
        </View>

        <Text adjustsFontSizeToFit numberOfLines={1} style={styles.amount}>
          ${amount || "0"}
        </Text>

        <View style={styles.categoryGrid}>
          {expenseCategoryOptions.slice(0, 6).map((item) => {
            const selected = item.value === category;
            return (
              <Pressable key={item.value} style={[styles.category, selected && styles.categorySelected]} onPress={() => setCategory(item.value)}>
                <MaterialCommunityIcons color={selected ? "#FFFFFF" : colors.primary} name={item.icon} size={24} />
                <Text style={[styles.categoryText, selected && styles.categoryTextSelected]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.keypad}>
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "backspace"].map((key) => (
            <TouchableOpacity
              key={key}
              style={styles.key}
              onPress={() => (key === "backspace" ? setAmount((current) => current.slice(0, -1)) : append(key))}
            >
              {key === "backspace" ? (
                <MaterialCommunityIcons color={colors.text} name="backspace-outline" size={26} />
              ) : (
                <Text style={styles.keyText}>{key}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={submit}>
          <MaterialCommunityIcons color="#FFFFFF" name="check" size={22} />
          <Text style={styles.saveText}>Save Expense</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.lg
  },
  title: {
    color: colors.text,
    fontSize: 21,
    fontWeight: "800"
  },
  iconButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 46,
    justifyContent: "center",
    width: 46
  },
  cameraButton: {
    backgroundColor: colors.accent,
    borderColor: colors.accent
  },
  amount: {
    color: colors.text,
    fontSize: 58,
    fontWeight: "900",
    marginVertical: spacing.lg,
    textAlign: "center"
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  category: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: "31.8%",
    gap: spacing.xs,
    minHeight: 76,
    justifyContent: "center"
  },
  categorySelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  categoryText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800"
  },
  categoryTextSelected: {
    color: "#FFFFFF"
  },
  keypad: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "center",
    marginTop: spacing.lg
  },
  key: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 8,
    height: 66,
    justifyContent: "center",
    width: "30%"
  },
  keyText: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "700"
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 8,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 56
  },
  saveText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800"
  }
});
