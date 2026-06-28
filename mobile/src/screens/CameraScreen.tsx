import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFinanceStore } from "../store/useFinanceStore";
import { colors, spacing } from "../theme";

export function CameraScreen() {
  const navigation = useNavigation();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [saving, setSaving] = useState(false);
  const recordSnap = useFinanceStore((state) => state.recordSnap);

  const capture = async () => {
    if (!cameraRef.current || saving) {
      return;
    }

    setSaving(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.72 });
      if (photo?.uri) {
        await recordSnap(photo.uri);
        navigation.goBack();
      }
    } finally {
      setSaving(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permission}>
        <MaterialCommunityIcons color={colors.primary} name="camera-off" size={48} />
        <Text style={styles.permissionTitle}>Camera access is needed for receipts</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />
      <View style={styles.controls}>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons color="#FFFFFF" name="close" size={25} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.shutter} onPress={capture}>
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <MaterialCommunityIcons color="#FFFFFF" name="camera" size={34} />}
        </TouchableOpacity>
        <View style={styles.secondaryButtonPlaceholder} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000"
  },
  camera: {
    flex: 1
  },
  controls: {
    alignItems: "center",
    bottom: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    left: 0,
    paddingHorizontal: spacing.xl,
    position: "absolute",
    right: 0
  },
  shutter: {
    alignItems: "center",
    backgroundColor: colors.accent,
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
  secondaryButtonPlaceholder: {
    height: 48,
    width: 48
  },
  center: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center"
  },
  permission: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    gap: spacing.md,
    justifyContent: "center",
    padding: spacing.lg
  },
  permissionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center"
  },
  permissionButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  permissionButtonText: {
    color: "#FFFFFF",
    fontWeight: "800"
  }
});
