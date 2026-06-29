import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";
import type { BillOccurrence } from "../types";
import { useTheme } from "../theme";
import { useI18n } from "../i18n";
import { useMoney } from "../utils/CurrencyProvider";
import { formatDate } from "../utils/money";

type BillRowProps = {
  bill: BillOccurrence;
  onToggle: () => void;
  onEdit: () => void;
};

export function BillRow({ bill, onToggle, onEdit }: BillRowProps) {
  const theme = useTheme();
  const { t, locale, isRTL } = useI18n();
  const money = useMoney();
  const paid = bill.status === "PAID";
  const dueLabel = formatDate(bill.dueDate, locale);

  const rightAction = () => (
    <TouchableOpacity
      style={[styles.swipeAction, { backgroundColor: paid ? theme.colors.muted : theme.colors.success, borderRadius: theme.radii.lg }]}
      onPress={onToggle}
    >
      <MaterialCommunityIcons color="#FFFFFF" name={paid ? "undo-variant" : "check"} size={22} />
      <Text style={styles.swipeText}>{paid ? t("bills.unpay") : t("bills.paid")}</Text>
    </TouchableOpacity>
  );

  return (
    <Animated.View entering={FadeIn.duration(220)} layout={LinearTransition.springify().damping(18)}>
      <Swipeable renderRightActions={rightAction} overshootRight={false}>
        <View
          style={[
            styles.row,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.lg,
              flexDirection: isRTL ? "row-reverse" : "row",
              opacity: paid ? 0.7 : 1,
              ...theme.shadow("sm")
            }
          ]}
        >
          <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: paid }} style={styles.check} onPress={onToggle}>
            <MaterialCommunityIcons
              color={paid ? theme.colors.success : theme.colors.muted}
              name={paid ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
              size={28}
            />
          </TouchableOpacity>

          <View style={[styles.iconWrap, { backgroundColor: theme.colors.primarySoft, borderRadius: theme.radii.md }]}>
            <MaterialCommunityIcons color={theme.colors.primary} name={bill.billTemplate.icon as never} size={22} />
          </View>

          <View style={styles.body}>
            <Text numberOfLines={1} style={[styles.name, { color: theme.colors.text, textAlign: isRTL ? "right" : "left" }]}>
              {bill.billTemplate.name}
            </Text>
            <Text style={[styles.meta, { color: theme.colors.subtleText, textAlign: isRTL ? "right" : "left" }]}>
              {paid ? t("bills.settledLabel") : t("bills.due", { date: dueLabel })}
            </Text>
          </View>

          <TouchableOpacity style={[styles.amountButton, { flexDirection: isRTL ? "row-reverse" : "row" }]} onPress={onEdit}>
            <Text style={[styles.amount, { color: theme.colors.text }]}>{money(bill.amount)}</Text>
            <MaterialCommunityIcons color={theme.colors.muted} name="pencil" size={15} />
          </TouchableOpacity>
        </View>
      </Swipeable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    borderWidth: 1,
    gap: 10,
    minHeight: 78,
    padding: 14
  },
  check: {
    height: 36,
    justifyContent: "center",
    width: 36
  },
  iconWrap: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44
  },
  body: {
    flex: 1,
    minWidth: 0
  },
  name: {
    fontSize: 16,
    fontWeight: "800"
  },
  meta: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2
  },
  amountButton: {
    alignItems: "center",
    gap: 6
  },
  amount: {
    fontSize: 16,
    fontWeight: "800"
  },
  swipeAction: {
    alignItems: "center",
    gap: 4,
    justifyContent: "center",
    marginLeft: 8,
    width: 96
  },
  swipeText: {
    color: "#FFFFFF",
    fontWeight: "800"
  }
});
