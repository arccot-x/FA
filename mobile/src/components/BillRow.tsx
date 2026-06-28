import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import type { BillOccurrence } from "../types";
import { colors, spacing } from "../theme";
import { formatMoney } from "../utils/money";

type BillRowProps = {
  bill: BillOccurrence;
  onToggle: () => void;
  onEdit: () => void;
};

export function BillRow({ bill, onToggle, onEdit }: BillRowProps) {
  const paid = bill.status === "PAID";
  const dueLabel = new Date(bill.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const rightAction = () => (
    <TouchableOpacity style={styles.swipeAction} onPress={onToggle}>
      <MaterialCommunityIcons color="#FFFFFF" name={paid ? "undo" : "check"} size={24} />
      <Text style={styles.swipeText}>{paid ? "Unpay" : "Paid"}</Text>
    </TouchableOpacity>
  );

  return (
    <Swipeable renderRightActions={rightAction}>
      <View style={styles.row}>
        <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: paid }} style={styles.check} onPress={onToggle}>
          <MaterialCommunityIcons color={paid ? colors.success : colors.muted} name={paid ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"} size={28} />
        </TouchableOpacity>

        <View style={styles.iconWrap}>
          <MaterialCommunityIcons color={colors.primary} name={bill.billTemplate.icon as never} size={23} />
        </View>

        <View style={styles.body}>
          <Text numberOfLines={1} style={styles.name}>
            {bill.billTemplate.name}
          </Text>
          <Text style={styles.meta}>{paid ? "Settled" : `Due ${dueLabel}`}</Text>
        </View>

        <TouchableOpacity style={styles.amountButton} onPress={onEdit}>
          <Text style={styles.amount}>{formatMoney(bill.amount)}</Text>
          <MaterialCommunityIcons color={colors.muted} name="pencil" size={15} />
        </TouchableOpacity>
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 76,
    padding: spacing.md
  },
  check: {
    height: 36,
    justifyContent: "center",
    width: 36
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: "#E8F4F1",
    borderRadius: 8,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  body: {
    flex: 1,
    minWidth: 0
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800"
  },
  meta: {
    color: colors.subtleText,
    marginTop: 2
  },
  amountButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs
  },
  amount: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800"
  },
  swipeAction: {
    alignItems: "center",
    backgroundColor: colors.success,
    borderRadius: 8,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.lg,
    width: 104
  },
  swipeText: {
    color: "#FFFFFF",
    fontWeight: "800"
  }
});

