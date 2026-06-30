import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useMemo, useRef, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { MetricTile } from "../components/MetricTile";
import { Screen } from "../components/Screen";
import { AnimatedNumber, Gradient, IconButton, ProgressRing, PressableScale, SegmentedControl } from "../components/ui";
import { QuickAddModal } from "./QuickAddModal";
import { IncomeEditorModal } from "./IncomeEditorModal";
import { PendingExpenseModal } from "./PendingExpenseModal";
import { AllActivityModal } from "./AllActivityModal";
import { useFinanceStore } from "../store/useFinanceStore";
import { useTheme } from "../theme";
import { useI18n } from "../i18n";
import { useMoney } from "../utils/CurrencyProvider";
import { useAiSettings } from "../utils/AiProvider";
import { scanReceipt } from "../utils/ai";
import { TutorialTarget } from "../utils/TutorialProvider";
import { summariseIncome } from "../utils/income";
import { categoryIcon } from "../constants/options";
import type { ExpenseCategory, Transaction } from "../types";
import { addMonths, currentMonthKey, formatMonthLabel, monthKeyOf, toNumber } from "../utils/money";

export function HomeScreen() {
  const navigation = useNavigation();
  const theme = useTheme();
  const { t, locale } = useI18n();
  const money = useMoney();
  const { enabled: aiEnabled } = useAiSettings();

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [pendingExpense, setPendingExpense] = useState<Transaction | null>(null);
  const [view, setView] = useState<"personal" | "house">("personal");
  const listRef = useRef<FlatList<Transaction>>(null);

  const { user, load, loading, offline, pendingSyncCount, syncing, incomeCycle, bills, transactions, selectedMonth, setMonth, family, house, addManualExpense, saveIncomeSettings, saveExpectedIncome, completePendingExpense, deleteTransaction, recordSnap } =
    useFinanceStore();

  const inFamily = !!family?.subscription?.allowed;
  const houseView = inFamily && view === "house";

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const thisMonth = currentMonthKey();
  const isCurrentMonth = selectedMonth === thisMonth;

  // Personal transactions for the month being viewed (exclude house ones).
  const monthTransactions = useMemo(
    () => transactions.filter((item) => monthKeyOf(item.occurredAt) === selectedMonth && item.scope !== "HOUSE"),
    [transactions, selectedMonth]
  );

  // Personal bills only (house bills count against house money, not personal).
  const personalUnpaid = useMemo(() => bills.unpaid.filter((b) => b.billTemplate.scope !== "HOUSE"), [bills.unpaid]);
  const personalSettled = useMemo(() => bills.settled.filter((b) => b.billTemplate.scope !== "HOUSE"), [bills.settled]);
  const billsUnpaid = useMemo(() => personalUnpaid.reduce((sum, item) => sum + toNumber(item.amount), 0), [personalUnpaid]);

  const houseAllocation = toNumber(incomeCycle?.houseAllocation);

  const summary = useMemo(() => {
    // Personal income = the part of income NOT allocated to the house pool.
    const expected = Math.max(0, (toNumber(incomeCycle?.expected) || toNumber(user?.defaultMonthlyIncome) || 4200) - houseAllocation);
    const actual = toNumber(incomeCycle?.actual);
    const cleared = monthTransactions.filter((item) => item.status === "CLEARED");
    // Logged income/deposits add to what's available; expenses are everything else.
    const extraIncome = cleared.filter((item) => item.type === "INCOME").reduce((sum, item) => sum + toNumber(item.amount), 0);
    const spent = cleared.filter((item) => item.type !== "INCOME").reduce((sum, item) => sum + toNumber(item.amount), 0);
    const received = actual > 0 ? Math.max(0, actual - houseAllocation) + extraIncome : 0;
    // Only bills you've actually PAID reduce what's still usable; unpaid bills are upcoming.
    const billsPaid = personalSettled.reduce((sum, item) => sum + toNumber(item.amount), 0);
    return summariseIncome({ expected: expected + extraIncome, received, spent, billsDue: billsPaid, paydayDay: user?.paydayDay ?? 1 });
  }, [incomeCycle, houseAllocation, personalSettled, monthTransactions, user?.defaultMonthlyIncome, user?.paydayDay]);

  // The data shown depends on the selected money view.
  const listData = houseView ? house.transactions : monthTransactions;
  const houseUsedRatio = house.pool > 0 ? Math.min(1, house.spent / house.pool) : 0;

  const renderTransaction = ({ item, index }: { item: Transaction; index: number }) => {
    const isPending = item.status === "PENDING_DETAILS";
    const isIncome = item.type === "INCOME";
    const icon = isPending ? "camera" : isIncome ? "cash-plus" : item.category ? categoryIcon[item.category] : "cash";
    return (
      <Animated.View entering={FadeInDown.delay(index * 45).duration(320)}>
        <PressableScale
          scaleTo={isIncome ? 1 : 0.97}
          onPress={() => {
            if (!isIncome) setPendingExpense(item);
          }}
          style={[styles.txRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderRadius: theme.radii.lg, ...theme.shadow("sm") }]}
        >
          <View
            style={[
              styles.txIcon,
              { backgroundColor: isIncome ? theme.colors.successSoft : isPending ? theme.colors.warningSoft : theme.colors.primarySoft, borderRadius: theme.radii.md }
            ]}
          >
            <MaterialCommunityIcons color={isIncome ? theme.colors.success : isPending ? theme.colors.warning : theme.colors.primary} name={icon as never} size={22} />
          </View>
          <View style={styles.txBody}>
            <Text numberOfLines={1} style={[styles.txTitle, { color: theme.colors.text }]}>
              {item.merchant ?? (isIncome ? t("quickAdd.income") : isPending ? t("home.pendingReceipt") : t(`category.${item.category ?? "OTHER"}` as never))}
            </Text>
            <Text style={[styles.txMeta, { color: theme.colors.subtleText }]}>
              {isIncome ? t("quickAdd.income") : isPending ? t("home.tapToAdd") : houseView && item.spenderName ? item.spenderName : t(`category.${item.category ?? "OTHER"}` as never)}
            </Text>
          </View>
          <Text style={[styles.txAmount, { color: isIncome ? theme.colors.success : isPending ? theme.colors.warning : theme.colors.text }]}>
            {item.amount ? `${isIncome ? "+" : ""}${money(item.amount)}` : "—"}
          </Text>
        </PressableScale>
      </Animated.View>
    );
  };

  const usedPercent = Math.round(summary.usedRatio * 100);

  return (
    <Screen
      title={t("home.title")}
      subtitle={offline ? t("home.offline") : t("home.subtitle")}
      action={<IconButton icon="tune-variant" onPress={() => setIncomeOpen(true)} accessibilityLabel={t("income.title")} />}
    >
      <FlatList
        ref={listRef}
        contentContainerStyle={styles.content}
        data={listData.slice(0, 8)}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />}
        renderItem={renderTransaction}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={[styles.empty, { color: theme.colors.subtleText }]}>{t("home.noActivity")}</Text>}
        ListHeaderComponent={
          <View style={styles.headerArea}>
            <View style={[styles.monthRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radii.pill }]}>
              <PressableScale onPress={() => void setMonth(addMonths(selectedMonth, -1))} style={styles.monthBtn} accessibilityLabel="Previous month">
                <MaterialCommunityIcons color={theme.colors.text} name="chevron-left" size={24} />
              </PressableScale>
              <PressableScale style={styles.monthLabelWrap} onPress={() => !isCurrentMonth && void setMonth(thisMonth)}>
                <Text style={[styles.monthLabel, { color: theme.colors.text }]}>{formatMonthLabel(selectedMonth, locale)}</Text>
                {!isCurrentMonth ? <MaterialCommunityIcons color={theme.colors.primary} name="restore" size={15} /> : null}
              </PressableScale>
              <PressableScale
                disabled={isCurrentMonth}
                onPress={() => void setMonth(addMonths(selectedMonth, 1))}
                style={[styles.monthBtn, isCurrentMonth && styles.monthBtnDisabled]}
                accessibilityLabel="Next month"
              >
                <MaterialCommunityIcons color={theme.colors.text} name="chevron-right" size={24} />
              </PressableScale>
            </View>

            {inFamily ? (
              <SegmentedControl
                segments={[
                  { value: "personal", label: t("scope.myMoney") },
                  { value: "house", label: t("scope.houseMoney") }
                ]}
                value={view}
                onChange={(value) => setView(value as "personal" | "house")}
              />
            ) : null}

            {pendingSyncCount > 0 || syncing ? (
              <View style={[styles.syncBanner, { backgroundColor: theme.colors.warningSoft, borderColor: theme.colors.warning, borderRadius: theme.radii.md }]}>
                <MaterialCommunityIcons color={theme.colors.warning} name={syncing ? "sync" : "cloud-upload"} size={20} />
                <Text style={[styles.syncText, { color: theme.colors.text }]}>
                  {syncing ? t("sync.syncing") : t("sync.pending", { count: pendingSyncCount })}
                </Text>
              </View>
            ) : null}

            <Animated.View entering={FadeInDown.duration(420)}>
              <Gradient colors={theme.colors.heroGradient} borderRadius={theme.radii.xl} style={[styles.hero, theme.shadow("md")]}>
                {houseView ? (
                  <>
                    <View style={styles.heroLeft}>
                      <View style={styles.heroLabelRow}>
                        <Text style={styles.heroLabel}>{t("scope.houseMoney")}</Text>
                      </View>
                      <AnimatedNumber value={house.balance} format={(v) => money(v)} style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit />
                      <Text style={styles.heroSub}>
                        {t("home.income")}: {money(house.pool)}
                        {"  ·  "}
                        {t("home.spent")}: {money(house.spent)}
                      </Text>
                    </View>
                    <ProgressRing progress={houseUsedRatio} size={104} strokeWidth={11} color="#FFFFFF" trackColor={theme.colors.trackBg}>
                      <View style={styles.ringCenter}>
                        <Text style={styles.ringPercent}>{Math.round(houseUsedRatio * 100)}%</Text>
                        <Text style={styles.ringHint}>{t("home.usedShort")}</Text>
                      </View>
                    </ProgressRing>
                  </>
                ) : (
                  <>
                    <View style={styles.heroLeft}>
                      <View style={styles.heroLabelRow}>
                        <Text style={styles.heroLabel}>{t("home.safeToSpend")}</Text>
                        <View style={styles.heroBadge}>
                          <Text style={styles.heroBadgeText}>{summary.isReceived ? t("income.receivedBadge") : t("income.expectedBadge")}</Text>
                        </View>
                      </View>
                      <AnimatedNumber value={summary.available} format={(v) => money(v)} style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit />
                      <Text style={styles.heroSub}>
                        {t("home.perDay", { amount: money(summary.dailyAllowance) })}
                        {"  ·  "}
                        {summary.isPaydayToday ? t("home.paydayToday") : t("home.daysToPayday", { days: summary.daysToPayday })}
                      </Text>
                    </View>
                    <ProgressRing progress={summary.usedRatio} size={104} strokeWidth={11} color="#FFFFFF" trackColor={theme.colors.trackBg}>
                      <View style={styles.ringCenter}>
                        <Text style={styles.ringPercent}>{usedPercent}%</Text>
                        <Text style={styles.ringHint}>{t("home.usedShort")}</Text>
                      </View>
                    </ProgressRing>
                  </>
                )}
              </Gradient>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(80).duration(420)} style={styles.metrics}>
              {houseView ? (
                <>
                  <MetricTile label={t("home.income")} value={money(house.pool)} icon="home-group" tone="primary" />
                  <MetricTile label={t("home.spent")} value={money(house.spent)} icon="trending-down" tone="accent" />
                  <MetricTile label={t("home.unpaidBills")} value={money(house.billsDue)} icon="calendar-clock" tone="danger" />
                </>
              ) : (
                <>
                  <MetricTile label={t("home.income")} value={money(summary.expected)} icon="cash-multiple" tone="primary" />
                  <MetricTile label={t("home.spent")} value={money(summary.spent)} icon="trending-down" tone="accent" />
                  <MetricTile label={t("home.unpaidBills")} value={money(billsUnpaid)} icon="calendar-clock" tone="danger" />
                </>
              )}
            </Animated.View>

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t("home.recentActivity")}</Text>
              {listData.length > 0 ? (
                <PressableScale onPress={() => setActivityOpen(true)} style={styles.seeAll}>
                  <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>{t("activity.seeAll")}</Text>
                  <MaterialCommunityIcons color={theme.colors.primary} name="chevron-right" size={18} />
                </PressableScale>
              ) : null}
            </View>
          </View>
        }
      />

      <TutorialTarget id="home.quickAdd" style={styles.fabTarget} prepare={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })}>
        <PressableScale
          accessibilityLabel={t("home.quickAdd")}
          style={[styles.fab, { backgroundColor: theme.colors.accent, borderRadius: theme.radii.pill, ...theme.shadow("lg") }]}
          onPress={() => setQuickAddOpen(true)}
        >
          <MaterialCommunityIcons color="#FFFFFF" name="plus" size={34} />
        </PressableScale>
      </TutorialTarget>

      <QuickAddModal
        visible={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onSubmit={addManualExpense}
        onCamera={() => {
          setQuickAddOpen(false);
          navigation.navigate("Camera" as never);
        }}
        onAttachImage={async (uri) => {
          setQuickAddOpen(false);
          if (aiEnabled && user?.id) {
            try {
              const scan = await scanReceipt(uri, user.id);
              await recordSnap(uri, { amount: scan.amount, category: scan.category, merchant: scan.merchant, notes: scan.items, aiScannedAt: new Date().toISOString() });
              return;
            } catch {
              // Save the photo anyway; the user can scan manually from the receipt.
            }
          }
          await recordSnap(uri);
        }}
      />

      <IncomeEditorModal
        visible={incomeOpen}
        userIncome={toNumber(user?.defaultMonthlyIncome)}
        currentExpected={toNumber(incomeCycle?.expected)}
        currentActual={toNumber(incomeCycle?.actual)}
        currentHouseAllocation={toNumber(incomeCycle?.houseAllocation)}
        paydayDay={user?.paydayDay ?? 1}
        variableIncomeEnabled={user?.variableIncomeEnabled ?? false}
        onClose={() => setIncomeOpen(false)}
        onSaveSettings={saveIncomeSettings}
        onSaveExpected={saveExpectedIncome}
      />

      <PendingExpenseModal
        transaction={pendingExpense}
        onClose={() => setPendingExpense(null)}
        onSubmit={async (input) => {
          if (!pendingExpense) return;
          await completePendingExpense(pendingExpense, input);
          setPendingExpense(null);
        }}
        onDelete={async (tx) => {
          await deleteTransaction(tx);
          setPendingExpense(null);
        }}
      />

      <AllActivityModal
        visible={activityOpen}
        transactions={houseView ? house.transactions : transactions.filter((item) => item.scope !== "HOUSE")}
        onClose={() => setActivityOpen(false)}
        onSelect={(tx) => setPendingExpense(tx)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 120
  },
  headerArea: {
    gap: 16,
    marginBottom: 4
  },
  monthRow: {
    alignItems: "center",
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    paddingVertical: 4
  },
  monthBtn: {
    alignItems: "center",
    height: 38,
    justifyContent: "center",
    width: 38
  },
  monthBtnDisabled: {
    opacity: 0.3
  },
  monthLabelWrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: "800"
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 150,
    padding: 20
  },
  heroLeft: {
    flex: 1,
    paddingRight: 12
  },
  heroLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  heroLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6
  },
  heroBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2
  },
  heroBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  heroValue: {
    color: "#FFFFFF",
    fontSize: 40,
    fontWeight: "900",
    letterSpacing: -1,
    marginTop: 4
  },
  heroSub: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 8
  },
  ringCenter: {
    alignItems: "center",
    justifyContent: "center"
  },
  ringPercent: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900"
  },
  ringHint: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  metrics: {
    flexDirection: "row",
    gap: 10
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8
  },
  syncBanner: {
    alignItems: "center",
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 12
  },
  syncText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800"
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "800"
  },
  seeAll: {
    alignItems: "center",
    flexDirection: "row"
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "800"
  },
  txRow: {
    alignItems: "center",
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
    minHeight: 70,
    padding: 14
  },
  txIcon: {
    alignItems: "center",
    height: 42,
    justifyContent: "center",
    width: 42
  },
  txBody: {
    flex: 1,
    minWidth: 0
  },
  txTitle: {
    fontSize: 15,
    fontWeight: "800"
  },
  txMeta: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2
  },
  txAmount: {
    fontSize: 16,
    fontWeight: "800"
  },
  empty: {
    fontSize: 15,
    fontWeight: "600",
    paddingVertical: 32,
    textAlign: "center"
  },
  fabTarget: {
    bottom: 24,
    height: 62,
    position: "absolute",
    right: 20,
    width: 62
  },
  fab: {
    alignItems: "center",
    height: 62,
    justifyContent: "center",
    width: 62
  }
});
