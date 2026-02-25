import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  Alert,
  Platform,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import type { ComedySet } from "@/lib/types";
import { getSets, deleteSet } from "@/lib/storage";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function SetCard({
  item,
  onDelete,
}: {
  item: ComedySet;
  onDelete: (id: string) => void;
}) {
  const handlePerform = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: "/perform", params: { setId: item.id } });
  };

  const handleEdit = () => {
    router.push({ pathname: "/create-set", params: { setId: item.id } });
  };

  const handleDelete = () => {
    if (Platform.OS === "web") {
      onDelete(item.id);
      return;
    }
    Alert.alert("Delete Set", `Delete "${item.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => onDelete(item.id),
      },
    ]);
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={handleEdit}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="mic" size={18} color={Colors.amber} />
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>
        </View>
        <Pressable
          onPress={handleDelete}
          hitSlop={12}
          style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}
        >
          <Feather name="trash-2" size={16} color={Colors.textMuted} />
        </Pressable>
      </View>

      <View style={styles.cardMeta}>
        <View style={styles.metaItem}>
          <Feather name="clock" size={13} color={Colors.textSecondary} />
          <Text style={styles.metaText}>
            {formatDuration(item.totalDuration)}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Feather name="list" size={13} color={Colors.textSecondary} />
          <Text style={styles.metaText}>
            {item.bits.length} bit{item.bits.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      <View style={styles.bitsPreview}>
        {item.bits.slice(0, 3).map((bit, i) => (
          <Text key={bit.id} style={styles.bitPreviewText} numberOfLines={1}>
            {i + 1}. {bit.title}
          </Text>
        ))}
        {item.bits.length > 3 && (
          <Text style={styles.bitPreviewMore}>
            +{item.bits.length - 3} more
          </Text>
        )}
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.performButton,
          pressed && styles.performButtonPressed,
        ]}
        onPress={handlePerform}
      >
        <Ionicons name="play" size={16} color={Colors.navy} />
        <Text style={styles.performButtonText}>Perform</Text>
      </Pressable>
    </Pressable>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [sets, setSets] = useState<ComedySet[]>([]);
  const [loading, setLoading] = useState(true);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  useFocusEffect(
    useCallback(() => {
      loadSets();
    }, [])
  );

  const loadSets = async () => {
    setLoading(true);
    const data = await getSets();
    setSets(data);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    await deleteSet(id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    loadSets();
  };

  const handleCreateNew = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/create-set");
  };

  const handleHistory = () => {
    router.push("/history");
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + webTopInset,
          paddingBottom: insets.bottom + webBottomInset,
        },
      ]}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.appTitle}>SetFlow</Text>
          <Text style={styles.subtitle}>Your comedy set assistant</Text>
        </View>
        <Pressable
          onPress={handleHistory}
          style={({ pressed }) => [
            styles.historyButton,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Ionicons name="time-outline" size={22} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <FlatList
        data={sets}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SetCard item={item} onDelete={handleDelete} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!sets.length}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Ionicons name="mic-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No sets yet</Text>
              <Text style={styles.emptyText}>
                Create your first comedy set to get started
              </Text>
            </View>
          ) : null
        }
      />

      <Pressable
        style={({ pressed }) => [
          styles.fab,
          pressed && styles.fabPressed,
          { marginBottom: 16 },
        ]}
        onPress={handleCreateNew}
      >
        <Ionicons name="add" size={28} color={Colors.navy} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.navy,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },
  appTitle: {
    fontSize: 28,
    fontFamily: "SpaceGrotesk_700Bold",
    color: Colors.amber,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "SpaceGrotesk_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  historyButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.cardBg,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 100,
    gap: 14,
  },
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(245, 166, 35, 0.08)",
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: Colors.textPrimary,
    flex: 1,
  },
  cardMeta: {
    flexDirection: "row",
    gap: 16,
    marginTop: 10,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    fontSize: 13,
    fontFamily: "SpaceGrotesk_400Regular",
    color: Colors.textSecondary,
  },
  bitsPreview: {
    marginTop: 12,
    gap: 4,
  },
  bitPreviewText: {
    fontSize: 13,
    fontFamily: "SpaceGrotesk_400Regular",
    color: Colors.textMuted,
  },
  bitPreviewMore: {
    fontSize: 12,
    fontFamily: "SpaceGrotesk_400Regular",
    color: Colors.accent,
    marginTop: 2,
  },
  performButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.amber,
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 14,
  },
  performButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  performButtonText: {
    fontSize: 15,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: Colors.navy,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 120,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: Colors.textPrimary,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "SpaceGrotesk_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.amber,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: Colors.amber,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabPressed: {
    transform: [{ scale: 0.92 }],
    opacity: 0.9,
  },
});
