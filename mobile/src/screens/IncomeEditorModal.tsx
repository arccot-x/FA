import { useEffect, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { ModalSheet, Field, Button, Chip, FormMessage } from "../components/ui";
import { useTheme } from "../theme";
import { useI18n } from "../i18n";
import { useMoney } from "../utils/CurrencyProvider";
import { useFinanceStore } from "../store/useFinanceStore";
import { useToast } from "../utils/ToastProvider";

type IncomeEditorModalProps = {
  visible: boolean;
  userIncome: number;
  currentExpected: number;
  currentActual: number;
  currentHouseAllocation?: number;
  paydayDay: number;
  variableIncomeEnabled: boolean;
  onClose: () => void;
  onSaveSettings: (input: { defaultMonthlyIncome: number; paydayDay: number; variableIncomeEnabled: boolean }) => Promise<void>;
  onSaveExpected: (expected: number, actual?: number, houseAllocation?: number) => Promise<void>;
};

const PRESETS = [1500, 2500, 4000, 6000];

export function IncomeEditorModal({
  visible,
  userIncome,
  currentExpected,
  currentActual,
  currentHouseAllocation = 0,
  paydayDay,
  variableIncomeEnabled,
  onClose,
  onSaveSettings,
  onSaveExpected
}: IncomeEditorModalProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const { showToast } = useToast();
  const money = useMoney();
  const inFamily = useFinanceStore((state) => !!state.family?.subscription?.allowed);

  const [income, setIncome] = useState(String(userIncome || ""));
  const [expected, setExpected] = useState(String(currentExpected || userIncome || ""));
  const [payday, setPayday] = useState(String(paydayDay || 1));
  const [variable, setVariable] = useState(variableIncomeEnabled);
  const [received, setReceived] = useState(currentActual > 0);
  const [houseAllocation, setHouseAllocation] = useState(String(currentHouseAllocation || ""));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // Re-seed fields when the modal opens with fresh data.
  useEffect(() => {
    if (visible) {
      setIncome(String(userIncome || ""));
      setExpected(String(currentExpected || userIncome || ""));
      setPayday(String(paydayDay || 1));
      setVariable(variableIncomeEnabled);
      setReceived(currentActual > 0);
      setHouseAllocation(String(currentHouseAllocation || ""));
      setError(undefined);
    }
  }, [visible, userIncome, currentExpected, currentActual, currentHouseAllocation, paydayDay, variableIncomeEnabled]);

  const save = async () => {
    const parsedIncomeRaw = Number(income);
    const parsedExpectedRaw = Number(expected);
    const parsedPaydayRaw = Number(payday);
    if (!Number.isFinite(parsedIncomeRaw) || parsedIncomeRaw <= 0) {
      setError(t("common.positiveAmount"));
      return;
    }
    if (variable && (!Number.isFinite(parsedExpectedRaw) || parsedExpectedRaw <= 0)) {
      setError(t("common.validAmount"));
      return;
    }
    if (!Number.isFinite(parsedPaydayRaw) || parsedPaydayRaw < 1 || parsedPaydayRaw > 31) {
      setError(t("common.validDay"));
      return;
    }
    const parsedIncome = parsedIncomeRaw;
    const parsedExpected = variable ? parsedExpectedRaw : parsedIncome;
    const parsedPayday = Math.round(parsedPaydayRaw);
    const parsedHouse = inFamily ? Math.min(parsedExpected, Math.max(0, Number(houseAllocation) || 0)) : 0;
    setError(undefined);
    setSaving(true);
    try {
      await onSaveSettings({ defaultMonthlyIncome: parsedIncome, paydayDay: parsedPayday, variableIncomeEnabled: variable });
      // Mark the cycle as received (actual = expected) or clear it (0); set house split.
      await onSaveExpected(parsedExpected, received ? parsedExpected : 0, parsedHouse);
      onClose();
      showToast(t("common.saved"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalSheet visible={visible} title={t("income.title")} onClose={onClose}>
      <View pointerEvents={saving ? "none" : "auto"} style={[styles.form, saving && styles.formDisabled]}>
        <Field
          label={t("income.monthlyIncome")}
          keyboardType="decimal-pad"
          value={income}
          onChangeText={setIncome}
          onBlur={() => {
            const parsed = Number(income);
            if (income && (!Number.isFinite(parsed) || parsed <= 0)) setError(t("common.positiveAmount"));
          }}
          error={error === t("common.positiveAmount") ? error : undefined}
        />

        <View style={styles.presets}>
          {PRESETS.map((preset) => (
            <Chip key={preset} label={money(preset)} selected={Number(income) === preset} onPress={() => setIncome(String(preset))} basis="22%" />
          ))}
        </View>

        {/* This toggle has an outsized effect on "Safe to spend" (treats income as arrived
            vs. still pending), so it's placed right after income instead of buried at the
            bottom, and given an accent border to stand out from the other switches. */}
        <View style={[styles.switchRow, styles.switchRowEmphasized, { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primary, borderRadius: theme.radii.md }]}>
          <View style={styles.switchText}>
            <Text style={[styles.switchTitle, { color: theme.colors.text }]}>{t("income.received")}</Text>
            <Text style={[styles.switchMeta, { color: theme.colors.subtleText }]}>{t("income.receivedHint")}</Text>
          </View>
          <Switch value={received} onValueChange={setReceived} trackColor={{ true: theme.colors.primary, false: theme.colors.borderStrong }} thumbColor="#FFFFFF" />
        </View>

        <Field
          label={t("income.payday")}
          keyboardType="number-pad"
          value={payday}
          onChangeText={setPayday}
          onBlur={() => {
            const parsed = Number(payday);
            if (payday && (!Number.isFinite(parsed) || parsed < 1 || parsed > 31)) setError(t("common.validDay"));
          }}
          error={error === t("common.validDay") ? error : undefined}
        />

        <View style={[styles.switchRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radii.md }]}>
          <View style={styles.switchText}>
            <Text style={[styles.switchTitle, { color: theme.colors.text }]}>{t("income.variable")}</Text>
            <Text style={[styles.switchMeta, { color: theme.colors.subtleText }]}>{t("income.variableHint")}</Text>
          </View>
          <Switch value={variable} onValueChange={setVariable} trackColor={{ true: theme.colors.primary, false: theme.colors.borderStrong }} thumbColor="#FFFFFF" />
        </View>

        {variable ? (
          <Field
            label={t("income.expectedThisMonth")}
            keyboardType="decimal-pad"
            value={expected}
            onChangeText={setExpected}
            onBlur={() => {
              const parsed = Number(expected);
              if (expected && (!Number.isFinite(parsed) || parsed <= 0)) setError(t("common.validAmount"));
            }}
            error={error === t("common.validAmount") ? error : undefined}
          />
        ) : null}

        {inFamily ? (
          <View>
            <Field label={t("income.houseAllocation")} keyboardType="decimal-pad" value={houseAllocation} onChangeText={setHouseAllocation} />
            <Text style={[styles.houseHint, { color: theme.colors.subtleText }]}>{t("income.houseAllocationHint")}</Text>
          </View>
        ) : null}

        <FormMessage message={error && ![t("common.positiveAmount"), t("common.validAmount"), t("common.validDay")].includes(error) ? error : undefined} />
        <Button label={t("income.save")} icon="content-save" onPress={save} loading={saving} style={styles.saveButton} />
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 16
  },
  formDisabled: {
    opacity: 0.6
  },
  presets: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  switchRow: {
    alignItems: "center",
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16
  },
  switchRowEmphasized: {
    borderWidth: 2
  },
  switchText: {
    flex: 1,
    paddingRight: 12
  },
  switchTitle: {
    fontSize: 16,
    fontWeight: "800"
  },
  switchMeta: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2
  },
  saveButton: {
    marginTop: 8
  },
  houseHint: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6
  }
});
