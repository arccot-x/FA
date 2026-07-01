import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Button } from "../components/ui";
import { useFinanceStore } from "../store/useFinanceStore";
import { useTheme } from "../theme";
import { useI18n } from "../i18n";
import { useAiSettings } from "../utils/AiProvider";
import { scanReceipt } from "../utils/ai";

export function CameraScreen() {
  const navigation = useNavigation();
  const theme = useTheme();
  const { t } = useI18n();
  const { enabled: aiEnabled } = useAiSettings();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [saving, setSaving] = useState(false);
  const [savingLabel, setSavingLabel] = useState("");
  const [error, setError] = useState("");
  const recordSnap = useFinanceStore((state) => state.recordSnap);
  const userId = useFinanceStore((state) => state.user?.id);

  const capture = async () => {
    if (!cameraRef.current || saving) return;
    setSaving(true);
    setError("");
    setSavingLabel(t("camera.saving"));
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.72 });
      if (!photo?.uri) {
        setError(t("camera.captureFailed"));
        return;
      }
      if (aiEnabled && userId) {
        try {
          setSavingLabel(t("ai.scanning"));
          const scan = await scanReceipt(photo.uri, userId);
          await recordSnap(photo.uri, { amount: scan.amount, category: scan.category, merchant: scan.merchant, notes: scan.items, aiScannedAt: new Date().toISOString() });
          navigation.goBack();
          return;
        } catch {
          // Keep the capture even when AI is unavailable.
        }
      }
      await recordSnap(photo.uri);
      navigation.goBack();
    } catch {
      setError(t("camera.captureFailed"));
    } finally {
      setSavingLabel("");
      setSaving(false);
    }
  };

  if (!permission) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.permission, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.permissionIcon, { backgroundColor: theme.colors.primarySoft, borderRadius: theme.radii.lg }]}>
          <MaterialCommunityIcons color={theme.colors.primary} name="camera-off" size={40} />
        </View>
        <Text style={[styles.permissionTitle, { color: theme.colors.text }]}>{t("camera.needAccess")}</Text>
        <Button label={t("camera.allow")} icon="camera" onPress={requestPermission} style={styles.permissionButton} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />
      <View style={styles.controls}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t("camera.close")} style={styles.secondaryButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons color="#FFFFFF" name="close" size={25} />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t("camera.shutter")}
          accessibilityState={{ disabled: saving }}
          disabled={saving}
          style={[styles.shutter, { backgroundColor: theme.colors.accent }]}
          onPress={capture}
        >
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <MaterialCommunityIcons color="#FFFFFF" name="camera" size={34} />}
        </TouchableOpacity>
        <View style={styles.placeholder} />
      </View>
      {saving && savingLabel ? <Text style={styles.savingText}>{savingLabel}</Text> : null}
      {!saving && error ? <Text style={[styles.savingText, styles.errorText]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  camera: { flex: 1 },
  controls: {
    alignItems: "center",
    bottom: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    left: 0,
    paddingHorizontal: 32,
    position: "absolute",
    right: 0
  },
  shutter: {
    alignItems: "center",
    borderColor: "#FFFFFF",
    borderRadius: 38,
    borderWidth: 4,
    height: 76,
    justifyContent: "center",
    width: 76
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.52)",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  placeholder: { height: 48, width: 48 },
  savingText: {
    bottom: 118,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    left: 24,
    position: "absolute",
    right: 24,
    textAlign: "center"
  },
  errorText: {
    color: "#FF8A80"
  },
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  permission: {
    alignItems: "center",
    flex: 1,
    gap: 16,
    justifyContent: "center",
    padding: 24
  },
  permissionIcon: {
    alignItems: "center",
    height: 72,
    justifyContent: "center",
    width: 72
  },
  permissionTitle: {
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center"
  },
  permissionButton: {
    alignSelf: "stretch",
    marginTop: 8
  }
});
