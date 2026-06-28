import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Screen } from "../components/Screen";
import { vaultCategoryOptions } from "../constants/options";
import { useFinanceStore } from "../store/useFinanceStore";
import { colors, spacing } from "../theme";
import type { VaultCategory, VaultDocument } from "../types";

const folderOrder: VaultCategory[] = ["LEASE", "TAX", "INSURANCE", "BANKING", "WARRANTY", "RECEIPT", "OTHER"];

function labelFor(category: VaultCategory) {
  return category
    .toLowerCase()
    .replace(/^\w/, (letter) => letter.toUpperCase())
    .replace("_", " ");
}

export function VaultScreen() {
  const { vaultDocuments, load, addVaultDocument } = useFinanceStore();
  const [uploading, setUploading] = useState(false);
  const [draft, setDraft] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<VaultCategory>("RECEIPT");

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const grouped = useMemo(
    () =>
      folderOrder.map((category) => ({
        category,
        documents: vaultDocuments.filter((document) => document.category === category)
      })),
    [vaultDocuments]
  );

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/*"],
      copyToCacheDirectory: true
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];
    setDraft(asset);
    setTitle(asset.name.replace(/\.[^.]+$/, ""));
    setCategory(asset.mimeType === "application/pdf" ? "TAX" : "RECEIPT");
  };

  const uploadDraft = async () => {
    if (!draft || !title.trim()) {
      return;
    }
    setUploading(true);
    try {
      await addVaultDocument({
        uri: draft.uri,
        name: draft.name,
        mimeType: draft.mimeType,
        title: title.trim(),
        category
      });
      setDraft(null);
      setTitle("");
      setCategory("RECEIPT");
    } finally {
      setUploading(false);
    }
  };

  const renderDocument = ({ item }: { item: VaultDocument }) => (
    <View style={styles.documentRow}>
      <View style={styles.docIcon}>
        <MaterialCommunityIcons color={colors.primary} name={item.mimeType === "application/pdf" ? "file-pdf-box" : "file-image"} size={26} />
      </View>
      <View style={styles.docBody}>
        <Text numberOfLines={1} style={styles.docTitle}>
          {item.title}
        </Text>
        <Text style={styles.docMeta}>{item.fileName}</Text>
      </View>
    </View>
  );

  return (
    <Screen
      title="Vault"
      subtitle="Financial documents and receipts"
      action={
        <TouchableOpacity style={styles.addButton} onPress={pickDocument}>
          {uploading ? <ActivityIndicator color="#FFFFFF" /> : <MaterialCommunityIcons color="#FFFFFF" name="upload" size={23} />}
        </TouchableOpacity>
      }
    >
      <FlatList
        contentContainerStyle={styles.content}
        data={grouped}
        keyExtractor={(item) => item.category}
        renderItem={({ item }) => (
          <View style={styles.folder}>
            <View style={styles.folderHeader}>
              <View style={styles.folderTitleRow}>
                <MaterialCommunityIcons color={colors.primary} name="folder-lock" size={23} />
                <Text style={styles.folderTitle}>{labelFor(item.category)}</Text>
              </View>
              <Text style={styles.count}>{item.documents.length}</Text>
            </View>
            {item.documents.length > 0 ? (
              <FlatList data={item.documents} keyExtractor={(doc) => doc.id} renderItem={renderDocument} scrollEnabled={false} />
            ) : (
              <Text style={styles.emptyFolder}>No documents</Text>
            )}
          </View>
        )}
      />
      <VaultUploadModal
        asset={draft}
        title={title}
        category={category}
        uploading={uploading}
        onTitleChange={setTitle}
        onCategoryChange={setCategory}
        onClose={() => setDraft(null)}
        onSubmit={uploadDraft}
      />
    </Screen>
  );
}

function VaultUploadModal({
  asset,
  title,
  category,
  uploading,
  onTitleChange,
  onCategoryChange,
  onClose,
  onSubmit
}: {
  asset: DocumentPicker.DocumentPickerAsset | null;
  title: string;
  category: VaultCategory;
  uploading: boolean;
  onTitleChange: (value: string) => void;
  onCategoryChange: (value: VaultCategory) => void;
  onClose: () => void;
  onSubmit: () => Promise<void>;
}) {
  return (
    <Modal animationType="slide" visible={asset !== null} onRequestClose={onClose}>
      <ScrollView contentContainerStyle={styles.uploadModal}>
        <View style={styles.uploadHeader}>
          <Text style={styles.uploadTitle}>Save Document</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <MaterialCommunityIcons color={colors.text} name="close" size={24} />
          </TouchableOpacity>
        </View>
        <View style={styles.selectedFile}>
          <MaterialCommunityIcons color={colors.primary} name={asset?.mimeType === "application/pdf" ? "file-pdf-box" : "file"} size={28} />
          <View style={styles.docBody}>
            <Text numberOfLines={1} style={styles.docTitle}>
              {asset?.name}
            </Text>
            <Text style={styles.docMeta}>{asset?.mimeType ?? "Document"}</Text>
          </View>
        </View>
        <Text style={styles.inputLabel}>Title</Text>
        <TextInput value={title} onChangeText={onTitleChange} style={styles.input} />
        <Text style={styles.inputLabel}>Folder</Text>
        <View style={styles.categoryGrid}>
          {vaultCategoryOptions.map((item) => {
            const selected = item.value === category;
            return (
              <TouchableOpacity key={item.value} style={[styles.categoryChoice, selected && styles.categorySelected]} onPress={() => onCategoryChange(item.value)}>
                <MaterialCommunityIcons color={selected ? "#FFFFFF" : colors.primary} name={item.icon} size={21} />
                <Text style={[styles.categoryText, selected && styles.categoryTextSelected]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={onSubmit} disabled={uploading}>
          {uploading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Upload To Vault</Text>}
        </TouchableOpacity>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  addButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 8,
    height: 46,
    justifyContent: "center",
    width: 46
  },
  content: {
    padding: spacing.md,
    paddingBottom: 96
  },
  folder: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.md
  },
  folderHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  folderTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  folderTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900"
  },
  count: {
    color: colors.subtleText,
    fontWeight: "800"
  },
  documentRow: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md
  },
  docIcon: {
    alignItems: "center",
    backgroundColor: "#E8F4F1",
    borderRadius: 8,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  docBody: {
    flex: 1,
    minWidth: 0
  },
  docTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800"
  },
  docMeta: {
    color: colors.subtleText,
    marginTop: 2
  },
  emptyFolder: {
    color: colors.subtleText,
    marginTop: spacing.md
  },
  uploadModal: {
    backgroundColor: colors.background,
    flexGrow: 1,
    padding: spacing.md,
    paddingTop: spacing.xl
  },
  uploadHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.lg
  },
  uploadTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900"
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  selectedFile: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md
  },
  inputLabel: {
    color: colors.subtleText,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: spacing.xs,
    marginTop: spacing.md,
    textTransform: "uppercase"
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    minHeight: 52,
    paddingHorizontal: spacing.md
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  categoryChoice: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: "31%",
    gap: spacing.xs,
    minHeight: 70,
    justifyContent: "center"
  },
  categorySelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  categoryText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "800"
  },
  categoryTextSelected: {
    color: "#FFFFFF"
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 8,
    justifyContent: "center",
    marginTop: spacing.lg,
    minHeight: 56
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900"
  }
});
