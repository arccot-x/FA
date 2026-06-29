import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Button, Field, ModalSheet, ProgressRing } from "../components/ui";
import { useGoals } from "../utils/GoalsProvider";
import type { SavingsGoal } from "../utils/GoalsProvider";
import { useMoney } from "../utils/CurrencyProvider";
import { useI18n } from "../i18n";
import { useTheme } from "../theme";

export function GoalsSection() {
  const theme = useTheme();
  const { t } = useI18n();
  const money = useMoney();
  const { goals, upsertGoal, removeGoal } = useGoals();
  const [editing, setEditing] = useState<SavingsGoal | null>(null);

  const newGoal = (): SavingsGoal => ({ id: `goal-${Date.now()}`, name: "", target: 0, saved: 0 });

  return (
    <View style={[styles.panel, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderRadius: theme.radii.lg, ...theme.shadow("sm") }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>{t("goals.title")}</Text>
        <Button label={t("goals.add")} icon="plus" variant="secondary" onPress={() => setEditing(newGoal())} style={styles.addButton} />
      </View>

      {goals.length === 0 ? (
        <Text style={[styles.empty, { color: theme.colors.subtleText }]}>{t("goals.empty")}</Text>
      ) : (
        <View style={styles.list}>
          {goals.map((goal) => {
            const ratio = goal.target > 0 ? Math.min(1, goal.saved / goal.target) : 0;
            const reached = goal.saved >= goal.target && goal.target > 0;
            const remaining = Math.max(0, goal.target - goal.saved);
            return (
              <View key={goal.id} style={styles.row}>
                <ProgressRing progress={ratio} size={64} strokeWidth={7} color={reached ? theme.colors.success : theme.colors.primary} trackColor={theme.colors.surfaceAlt}>
                  <Text style={[styles.ringPct, { color: theme.colors.text }]}>{Math.round(ratio * 100)}%</Text>
                </ProgressRing>
                <View style={styles.rowBody}>
                  <Text style={[styles.rowName, { color: theme.colors.text }]} numberOfLines={1}>
                    {goal.name || t("goals.title")}
                  </Text>
                  <Text style={[styles.rowMeta, { color: theme.colors.subtleText }]}>{money(goal.saved)} / {money(goal.target)}</Text>
                  <Text style={[styles.rowSub, { color: reached ? theme.colors.success : theme.colors.muted }]}>
                    {reached ? t("goals.reached") : t("goals.remaining", { amount: money(remaining) })}
                  </Text>
                </View>
                <Button label={t("common.edit")} variant="ghost" onPress={() => setEditing(goal)} style={styles.editButton} />
              </View>
            );
          })}
        </View>
      )}

      <GoalEditor
        goal={editing}
        onClose={() => setEditing(null)}
        onSave={(goal) => {
          upsertGoal(goal);
          setEditing(null);
        }}
        onDelete={(id) => {
          Alert.alert(t("goals.deleteTitle"), "", [
            { text: t("common.cancel"), style: "cancel" },
            {
              text: t("common.delete"),
              style: "destructive",
              onPress: () => {
                removeGoal(id);
                setEditing(null);
              }
            }
          ]);
        }}
      />
    </View>
  );
}

function GoalEditor({ goal, onClose, onSave, onDelete }: { goal: SavingsGoal | null; onClose: () => void; onSave: (goal: SavingsGoal) => void; onDelete: (id: string) => void }) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [saved, setSaved] = useState("");

  // Seed fields whenever a (different) goal opens.
  useEffect(() => {
    if (goal) {
      setName(goal.name);
      setTarget(goal.target ? String(goal.target) : "");
      setSaved(goal.saved ? String(goal.saved) : "");
    }
  }, [goal]);

  const save = () => {
    if (!goal) return;
    onSave({ id: goal.id, name: name.trim() || t("goals.title"), target: Math.max(0, Number(target) || 0), saved: Math.max(0, Number(saved) || 0) });
  };

  const exists = goal !== null && goal.name !== "";

  return (
    <ModalSheet visible={goal !== null} title={t("goals.editTitle")} onClose={onClose}>
      <View style={styles.form}>
        <Field label={t("goals.name")} placeholder={t("goals.namePlaceholder")} value={name} onChangeText={setName} />
        <Field label={t("goals.target")} keyboardType="decimal-pad" value={target} onChangeText={setTarget} />
        <Field label={t("goals.saved")} keyboardType="decimal-pad" value={saved} onChangeText={setSaved} />
        <Button label={t("common.save")} icon="content-save" onPress={save} style={styles.formSave} />
        {exists ? <Button label={t("goals.delete")} icon="trash-can-outline" variant="danger" onPress={() => goal && onDelete(goal.id)} /> : null}
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  panel: { borderWidth: 1, marginBottom: 14, padding: 16 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  title: { fontSize: 17, fontWeight: "800" },
  addButton: { minHeight: 40, paddingHorizontal: 14 },
  empty: { fontSize: 14, fontWeight: "600", paddingVertical: 8 },
  list: { gap: 16 },
  row: { alignItems: "center", flexDirection: "row", gap: 14 },
  ringPct: { fontSize: 13, fontWeight: "800" },
  rowBody: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 15, fontWeight: "800" },
  rowMeta: { fontSize: 13, fontWeight: "700", marginTop: 2 },
  rowSub: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  editButton: { minHeight: 40, paddingHorizontal: 12 },
  form: { gap: 16 },
  formSave: { marginTop: 4 }
});
