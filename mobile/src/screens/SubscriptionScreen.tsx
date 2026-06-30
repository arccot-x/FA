import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Screen } from "../components/Screen";
import { Button, Field, IconButton, PressableScale } from "../components/ui";
import { useI18n } from "../i18n";
import { useTheme } from "../theme";
import { SUBSCRIPTION_PLANS, useSubscription } from "../utils/SubscriptionProvider";
import type { SubscriptionPlan } from "../utils/SubscriptionProvider";
import type { SubscriptionPlanId } from "../types";

export function SubscriptionScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { t } = useI18n();
  const { subscription, loading, refreshSubscription, saveSubscription } = useSubscription();
  const [planId, setPlanId] = useState<SubscriptionPlanId>(subscription.plan);
  const [billingName, setBillingName] = useState(subscription.billingName ?? "");
  const [billingEmail, setBillingEmail] = useState(subscription.billingEmail ?? "");
  const [cardNumber, setCardNumber] = useState("");

  useFocusEffect(
    useCallback(() => {
      void refreshSubscription().catch(() => {});
    }, [refreshSubscription])
  );

  useEffect(() => {
    setPlanId(subscription.plan);
    setBillingName(subscription.billingName ?? "");
    setBillingEmail(subscription.billingEmail ?? "");
  }, [subscription]);

  const selectedPlan = SUBSCRIPTION_PLANS.find((item) => item.id === planId) ?? SUBSCRIPTION_PLANS[0];
  const activePlan = SUBSCRIPTION_PLANS.find((item) => item.id === subscription.plan) ?? SUBSCRIPTION_PLANS[0];
  const isCurrent = subscription.active && subscription.plan === planId;

  const save = async () => {
    if (!billingName.trim() || !billingEmail.trim()) {
      Alert.alert(t("subscription.title"), t("subscription.missingInfo"));
      return;
    }
    await saveSubscription({ plan: planId, billingName: billingName.trim(), billingEmail: billingEmail.trim(), cardNumber });
    setCardNumber("");
    Alert.alert(t("subscription.title"), t("subscription.saved"));
  };

  return (
    <Screen
      title={t("subscription.title")}
      subtitle={t("subscription.subtitle")}
      action={<IconButton icon="close" onPress={() => navigation.goBack()} accessibilityLabel={t("common.close")} />}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(320)} style={[styles.status, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderRadius: theme.radii.lg, ...theme.shadow("sm") }]}>
          <View style={[styles.statusIcon, { backgroundColor: subscription.active ? theme.colors.successSoft : theme.colors.warningSoft, borderRadius: theme.radii.md }]}>
            <MaterialCommunityIcons color={subscription.active ? theme.colors.success : theme.colors.warning} name={subscription.active ? "shield-check" : "lock-alert"} size={28} />
          </View>
          <View style={styles.statusText}>
            <Text style={[styles.statusTitle, { color: theme.colors.text }]}>
              {subscription.active ? t("subscription.activePlan", { plan: activePlan.name }) : t("subscription.notSubscribed")}
            </Text>
            <Text style={[styles.statusMeta, { color: theme.colors.subtleText }]}>
              {subscription.active ? t("subscription.cardEnding", { last4: subscription.cardLast4 ?? "0000" }) : t("subscription.lockedHint")}
            </Text>
          </View>
        </Animated.View>

        <View style={styles.plans}>
          {SUBSCRIPTION_PLANS.map((plan, index) => (
            <PlanCard key={plan.id} plan={plan} selected={plan.id === planId} delay={60 + index * 50} onPress={() => setPlanId(plan.id)} />
          ))}
        </View>

        <Animated.View entering={FadeInDown.delay(220).duration(320)} style={[styles.form, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderRadius: theme.radii.lg, ...theme.shadow("sm") }]}>
          <Text style={[styles.formTitle, { color: theme.colors.text }]}>{t("subscription.payment")}</Text>
          <Field label={t("subscription.name")} value={billingName} onChangeText={setBillingName} placeholder="Test Customer" />
          <Field label={t("subscription.email")} value={billingEmail} onChangeText={setBillingEmail} autoCapitalize="none" keyboardType="email-address" placeholder="test@example.com" />
          <Field label={t("subscription.cardNumber")} value={cardNumber} onChangeText={setCardNumber} keyboardType="number-pad" placeholder="4242 4242 4242 4242" />
          <Text style={[styles.statusMeta, { color: theme.colors.subtleText }]}>{t("subscription.hint")}</Text>
          <Button
            label={isCurrent ? t("subscription.update") : t("subscription.subscribe", { price: `$${selectedPlan.price}` })}
            icon="credit-card-check-outline"
            loading={loading}
            onPress={() => void save()}
          />
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

function PlanCard({ plan, selected, delay, onPress }: { plan: SubscriptionPlan; selected: boolean; delay: number; onPress: () => void }) {
  const theme = useTheme();
  const { t } = useI18n();

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(320)}>
      <PressableScale
        onPress={onPress}
        scaleTo={0.98}
        style={[
          styles.plan,
          {
            backgroundColor: selected ? theme.colors.primarySoft : theme.colors.card,
            borderColor: selected ? theme.colors.primary : theme.colors.border,
            borderRadius: theme.radii.lg,
            ...theme.shadow("sm")
          }
        ]}
      >
        <View style={styles.planTop}>
          <View style={styles.planText}>
            <Text style={[styles.planName, { color: selected ? theme.colors.primary : theme.colors.text }]}>{plan.name}</Text>
            <Text style={[styles.statusMeta, { color: theme.colors.subtleText }]}>{plan.description}</Text>
          </View>
          <Text style={[styles.price, { color: selected ? theme.colors.primary : theme.colors.text }]}>${plan.price}</Text>
        </View>
        <View style={styles.features}>
          <Feature text={t("subscription.memberLimit", { count: plan.memberLimit })} />
          <Feature text={plan.family ? t("subscription.familyIncluded") : t("subscription.personalOnly")} />
        </View>
      </PressableScale>
    </Animated.View>
  );
}

function Feature({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <View style={styles.feature}>
      <MaterialCommunityIcons color={theme.colors.success} name="check-circle" size={16} />
      <Text style={[styles.featureText, { color: theme.colors.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    padding: 16,
    paddingBottom: 96
  },
  status: {
    alignItems: "center",
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    padding: 16
  },
  statusIcon: {
    alignItems: "center",
    height: 52,
    justifyContent: "center",
    width: 52
  },
  statusText: {
    flex: 1,
    minWidth: 0
  },
  statusTitle: {
    fontSize: 17,
    fontWeight: "900"
  },
  statusMeta: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 3
  },
  plans: {
    gap: 10
  },
  plan: {
    borderWidth: 1,
    gap: 12,
    padding: 16
  },
  planTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12
  },
  planText: {
    flex: 1,
    minWidth: 0
  },
  planName: {
    fontSize: 18,
    fontWeight: "900"
  },
  price: {
    fontSize: 28,
    fontWeight: "900"
  },
  features: {
    gap: 8
  },
  feature: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700"
  },
  form: {
    borderWidth: 1,
    gap: 14,
    padding: 16
  },
  formTitle: {
    fontSize: 17,
    fontWeight: "900"
  }
});
