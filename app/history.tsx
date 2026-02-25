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
import type { Performance } from "@/lib/types";
import { getPerformances, deletePerformance } from "@/lib/storage";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function PerformanceCard({
  item,
  onDelete,
}: {
  item: Performance;
  onDelete: (id: string) => void;
}) {
  const timeDiff = item.actualDuration - item.plannedDuration;

  const handlePress = () => {
    router.push({
      pathname: "/feedback",
      params: { performanceId: item.id },
    });
  };

  const handleDelete = () => {
    if (Platform.OS === "web") {
      onDelete(item.id);
      return;
    }
    Alert.alert("Delete Performance", "Delete this performance record?", [
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
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
      onPress={handlePress}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="mic" size={16} color={Colors.amber} />
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.setTitle}
          </Text>
        </View>
        <Pressable onPress={handleDelete} hitSlop={12}>
          <Feather name="trash-2" size={15} color={Colors.textMuted} />
        </Pressable>
      </View>

      <Text style={styles.dateText}>{formatDate(item.performedAt)}</Text>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {formatTime(item.actualDuration)}
          </Text>
          <Text style={styles.statLabel}>Duration</Text>
        </View>
        <View style={styles.stat}>
          <Text
            style={[
              styles.statValue,
              {
                color:
                  Math.abs(timeDiff) <= 30 ? Colors.success : Colors.danger,
              },
            ]}
          >
            {timeDiff > 0 ? "+" : ""}
            {formatTime(timeDiff)}
          </Text>
          <Text style={styles.statLabel}>vs Plan</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{item.bits.length}</Text>
          <Text style={styles.statLabel}>Bits</Text>
        </View>
      </View>

      <View style={styles.badges}>
        {item.recordingUri && (
          <View style={styles.badge}>
            <Ionicons name="mic" size={11} color={Colors.amber} />
            <Text style={styles.badgeText}>Recorded</Text>
          </View>
        )}
        {item.feedback && (
          <View style={[styles.badge, { borderColor: "rgba(124,92,252,0.3)" }]}>
            <Ionicons name="sparkles" size={11} color={Colors.accent} />
            <Text style={[styles.badgeText, { color: Colors.accent }]}>
              AI Feedback
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const [performances, setPerformances] = useState<Performance[]>([]);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  useFocusEffect(
    useCallback(() => {
      loadPerformances();
    }, [])
  );

  const loadPerformances = async () => {
    const data = await getPerformances();
    setPerformances(data);
  };

  const handleDelete = async (id: string) => {
    await deletePerformance(id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    loadPerformances();
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
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Performance History</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={performances}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PerformanceCard item={item} onDelete={handleDelete} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!performances.length}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No performances yet</Text>
            <Text style={styles.emptyText}>
              Complete a set to see your history here
            </Text>
          </View>
        }
      />
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: Colors.textPrimary,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
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
    fontSize: 16,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: Colors.textPrimary,
    flex: 1,
  },
  dateText: {
    fontSize: 12,
    fontFamily: "SpaceGrotesk_400Regular",
    color: Colors.textMuted,
    marginTop: 6,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  stat: {
    alignItems: "center",
    gap: 3,
  },
  statValue: {
    fontSize: 16,
    fontFamily: "JetBrainsMono_700Bold",
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "SpaceGrotesk_400Regular",
    color: Colors.textMuted,
  },
  badges: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(245, 166, 35, 0.3)",
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "SpaceGrotesk_500Medium",
    color: Colors.amber,
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
});
