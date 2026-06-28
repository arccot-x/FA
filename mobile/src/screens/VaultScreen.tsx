import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Screen } from "../components/Screen";
import * as api from "../services/api";
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
  const { user, vaultDocuments, load, offline } = useFinanceStore();
  const [uploading, setUploading] = useState(false);

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
    const category: VaultCategory = asset.mimeType === "application/pdf" ? "TAX" : "RECEIPT";
    const title = asset.name.replace(/\.[^.]+$/, "");

    const optimistic: VaultDocument = {
      id: `local-vault-${Date.now()}`,
      title,
      category,
      fileName: asset.name,
      mimeType: asset.mimeType ?? "application/octet-stream",
      url: asset.uri,
      createdAt: new Date().toISOString()
    };

    setUploading(true);
    useFinanceStore.setState({ vaultDocuments: [optimistic, ...vaultDocuments] });

    try {
      if (!offline && user?.id) {
        await api.uploadVaultDocument({
          userId: user.id,
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType,
          title,
          category
        });
        await load();
      }
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
    </Screen>
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
  }
});

