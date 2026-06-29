import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

type ImageViewerModalProps = {
  uri: string | null;
  title?: string;
  onClose: () => void;
};

/** Full-screen image preview. Tap the backdrop or the X to dismiss. */
export function ImageViewerModal({ uri, title, onClose }: ImageViewerModalProps) {
  return (
    <Modal visible={uri !== null} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.safe} edges={["top"]}>
          <View style={styles.header}>
            <Text numberOfLines={1} style={styles.title}>
              {title ?? ""}
            </Text>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.close}>
              <MaterialCommunityIcons color="#FFFFFF" name="close" size={26} />
            </Pressable>
          </View>
        </SafeAreaView>
        <Pressable style={styles.imageWrap} onPress={onClose}>
          {uri ? <Image source={{ uri }} style={styles.image} resizeMode="contain" /> : null}
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.94)"
  },
  safe: {
    zIndex: 2
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  title: {
    color: "#FFFFFF",
    flex: 1,
    fontSize: 16,
    fontWeight: "800"
  },
  close: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40
  },
  imageWrap: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    marginTop: -48
  },
  image: {
    height: "100%",
    width: "100%"
  }
});
