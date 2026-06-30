import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Screen } from "../components/Screen";
import { Button, IconButton } from "../components/ui";
import { useI18n } from "../i18n";
import { useTheme } from "../theme";
import { useTutorial } from "../utils/TutorialProvider";

const qaKeys = ["snap", "pending", "bills", "vault", "family", "ai", "export"] as const;

export function HelpScreen() {
  const navigation = useNavigation();
  const theme = useTheme();
  const { t } = useI18n();
  const tutorial = useTutorial();

  return (
    <Screen title={t("help.title")} subtitle={t("help.subtitle")} action={<IconButton icon="close" onPress={() => navigation.goBack()} />}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(320)} style={[styles.hero, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderRadius: theme.radii.lg, ...theme.shadow("sm") }]}>
          <View style={[styles.heroIcon, { backgroundColor: theme.colors.primarySoft, borderRadius: theme.radii.md }]}>
            <MaterialCommunityIcons color={theme.colors.primary} name="map-marker-path" size={26} />
          </View>
          <View style={styles.heroText}>
            <Text style={[styles.heroTitle, { color: theme.colors.text }]}>{t("help.tutorialTitle")}</Text>
            <Text style={[styles.heroBody, { color: theme.colors.subtleText }]}>{t("help.tutorialBody")}</Text>
          </View>
          <Button
            label={t("help.startTutorial")}
            icon="play-circle-outline"
            onPress={() => {
              navigation.goBack();
              setTimeout(() => tutorial.start(), 250);
            }}
            style={styles.tutorialButton}
          />
        </Animated.View>

        <View style={styles.qaList}>
          {qaKeys.map((key, index) => (
            <Animated.View
              key={key}
              entering={FadeInDown.delay(60 + index * 35).duration(300)}
              style={[styles.qaCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderRadius: theme.radii.lg }]}
            >
              <Text style={[styles.question, { color: theme.colors.text }]}>{t(`help.${key}Q` as never)}</Text>
              <Text style={[styles.answer, { color: theme.colors.subtleText }]}>{t(`help.${key}A` as never)}</Text>
            </Animated.View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 96
  },
  hero: {
    borderWidth: 1,
    gap: 12,
    padding: 16
  },
  heroIcon: {
    alignItems: "center",
    height: 48,
    justifyContent: "center",
    width: 48
  },
  heroText: {
    gap: 4
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "900"
  },
  heroBody: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20
  },
  tutorialButton: {
    marginTop: 4
  },
  qaList: {
    gap: 12,
    marginTop: 16
  },
  qaCard: {
    borderWidth: 1,
    padding: 16
  },
  question: {
    fontSize: 16,
    fontWeight: "900"
  },
  answer: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 21,
    marginTop: 7
  }
});
