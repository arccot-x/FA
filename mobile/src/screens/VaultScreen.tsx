import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, Linking, RefreshControl, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Screen } from "../components/Screen";
import { Button, Chip, Field, IconButton, ImageViewerModal, ModalSheet, PressableScale } from "../components/ui";
import { vaultCategoryOptions } from "../constants/options";
import { useFinanceStore } from "../store/useFinanceStore";
import { useTheme } from "../theme";
import { useI18n } from "../i18n";
import type { VaultCategory, VaultDocument } from "../types";

const folderOrder: VaultCategory[] = ["LEASE", "TAX", "INSURANCE", "BANKING", "WARRANTY", "RECEIPT", "MEDICAL", "OTHER"];

export function VaultScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const { vaultDocuments, load, loading, addVaultDocument, deleteVaultDocument } = useFinanceStore();
  const [uploading, setUploading] = useState(false);
  const [draft, setDraft] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<VaultCategory>("RECEIPT");
  const [preview, setPreview] = useState<{ uri: string; title: string } | null>(null);

  const openDocument = (document: VaultDocument) => {
    if (document.mimeType.startsWith("image")) {
      setPreview({ uri: document.url, title: document.title });
    } else {
      void Linking.openURL(document.url).catch(() => {});
    }
  };

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const grouped = useMemo(
    () => folderOrder.map((cat) => ({ category: cat, documents: vaultDocuments.filter((document) => document.category === cat) })),
    [vaultDocuments]
  );

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/*"], copyToCacheDirectory: true });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setDraft(asset);
    setTitle(asset.name.replace(/\.[^.]+$/, ""));
    setCategory(asset.mimeType === "application/pdf" ? "TAX" : "RECEIPT");
  };

  const uploadDraft = async () => {
    if (!draft || !title.trim()) return;
    setUploading(true);
    try {
      await addVaultDocument({ uri: draft.uri, name: draft.name, mimeType: draft.mimeType, title: title.trim(), category });
      setDraft(null);
      setTitle("");
      setCategory("RECEIPT");
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = (document: VaultDocument) => {
    Alert.alert(t("vault.deleteTitle"), t("vault.deleteMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.delete"), style: "destructive", onPress: () => void deleteVaultDocument(document) }
    ]);
  };

  const renderDocument = (item: VaultDocument) => {
    const isImage = item.mimeType.startsWith("image");
    return (
      <View key={item.id} style={[styles.documentRow, { borderTopColor: theme.colors.border }]}>
        <PressableScale scaleTo={0.98} onPress={() => openDocument(item)} style={styles.documentOpenRow}>
          {isImage ? (
            <Image source={{ uri: item.url }} style={[styles.docThumb, { borderRadius: theme.radii.md, backgroundColor: theme.colors.surfaceAlt }]} resizeMode="cover" />
          ) : (
            <View style={[styles.docIcon, { backgroundColor: theme.colors.primarySoft, borderRadius: theme.radii.md }]}>
              <MaterialCommunityIcons color={theme.colors.primary} name="file-pdf-box" size={24} />
            </View>
          )}
          <View style={styles.docBody}>
            <Text numberOfLines={1} style={[styles.docTitle, { color: theme.colors.text }]}>
              {item.title}
            </Text>
            <Text numberOfLines={1} style={[styles.docMeta, { color: theme.colors.subtleText }]}>
              {item.fileName}
            </Text>
          </View>
          <MaterialCommunityIcons color={theme.colors.muted} name={isImage ? "eye" : "open-in-new"} size={18} />
        </PressableScale>
        <IconButton icon="trash-can-outline" tone="danger" onPress={() => confirmDelete(item)} accessibilityLabel={t("vault.delete")} />
      </View>
    );
  };

  return (
    <Screen
      title={t("vault.title")}
      subtitle={t("vault.subtitle")}
      action={
        <IconButton
          icon={uploading ? "loading" : "tray-arrow-up"}
          tone="primary"
          onPress={pickDocument}
          accessibilityLabel={t("vault.upload")}
        />
      }
    >
      <FlatList
        contentContainerStyle={styles.content}
        data={grouped}
        keyExtractor={(item) => item.category}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />}
        renderItem={({ item, index }) => (
          <Animated.View
            entering={FadeInDown.delay(index * 40).duration(320)}
            style={[styles.folder, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderRadius: theme.radii.lg, ...theme.shadow("sm") }]}
          >
            <View style={styles.folderHeader}>
              <View style={styles.folderTitleRow}>
                <MaterialCommunityIcons color={theme.colors.primary} name="folder" size={22} />
                <Text style={[styles.folderTitle, { color: theme.colors.text }]}>{t(`vaultCategory.${item.category}` as never)}</Text>
              </View>
              <View style={[styles.countPill, { backgroundColor: theme.colors.surfaceAlt }]}>
                <Text style={[styles.count, { color: theme.colors.subtleText }]}>{item.documents.length}</Text>
              </View>
            </View>
            {item.documents.length > 0 ? (
              item.documents.map(renderDocument)
            ) : (
              <Text style={[styles.emptyFolder, { color: theme.colors.muted }]}>{t("vault.noDocuments")}</Text>
            )}
          </Animated.View>
        )}
      />

      <ModalSheet visible={draft !== null} title={t("vault.saveDocument")} onClose={() => setDraft(null)}>
        <View style={styles.form}>
          <View style={[styles.selectedFile, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radii.md }]}>
            <MaterialCommunityIcons color={theme.colors.primary} name={draft?.mimeType === "application/pdf" ? "file-pdf-box" : "file-image"} size={28} />
            <View style={styles.docBody}>
              <Text numberOfLines={1} style={[styles.docTitle, { color: theme.colors.text }]}>
                {draft?.name}
              </Text>
              <Text style={[styles.docMeta, { color: theme.colors.subtleText }]}>{draft?.mimeType ?? "Document"}</Text>
            </View>
          </View>
          <Field label={t("vault.docTitle")} value={title} onChangeText={setTitle} />
          <View>
            <Text style={[styles.formLabel, { color: theme.colors.subtleText }]}>{t("vault.folder")}</Text>
            <View style={styles.grid}>
              {vaultCategoryOptions.map((item) => (
                <Chip key={item.value} icon={item.icon} label={t(`vaultCategory.${item.value}` as never)} selected={item.value === category} onPress={() => setCategory(item.value)} />
              ))}
            </View>
          </View>
          {uploading ? (
            <ActivityIndicator color={theme.colors.primary} style={styles.spinner} />
          ) : (
            <Button label={t("vault.upload")} icon="tray-arrow-up" onPress={uploadDraft} style={styles.save} />
          )}
        </View>
      </ModalSheet>

      <ImageViewerModal uri={preview?.uri ?? null} title={preview?.title} onClose={() => setPreview(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 96
  },
  folder: {
    borderWidth: 1,
    marginBottom: 14,
    padding: 16
  },
  folderHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  folderTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  folderTitle: {
    fontSize: 17,
    fontWeight: "800"
  },
  countPill: {
    alignItems: "center",
    borderRadius: 999,
    justifyContent: "center",
    minWidth: 28,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  count: {
    fontSize: 13,
    fontWeight: "800"
  },
  documentRow: {
    alignItems: "center",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
    paddingTop: 14
  },
  documentOpenRow: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 12,
    minWidth: 0
  },
  docIcon: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44
  },
  docThumb: {
    height: 44,
    width: 44
  },
  docBody: {
    flex: 1,
    minWidth: 0
  },
  docTitle: {
    fontSize: 15,
    fontWeight: "800"
  },
  docMeta: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2
  },
  emptyFolder: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12
  },
  form: {
    gap: 16
  },
  selectedFile: {
    alignItems: "center",
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 16
  },
  formLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    marginBottom: 8,
    textTransform: "uppercase"
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  spinner: {
    marginTop: 12
  },
  save: {
    marginTop: 4
  }
});
