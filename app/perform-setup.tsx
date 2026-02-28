import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Platform,
  ScrollView,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import type { ComedySet } from "@/lib/types";
import { getSets } from "@/lib/storage";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function PerformSetupScreen() {
  const insets = useSafeAreaInsets();
  const [sets, setSets] = useState<ComedySet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [startBitIndex, setStartBitIndex] = useState(0);
  const [recordingMode, setRecordingMode] = useState<"audio" | "video" | "none">("audio");

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  useFocusEffect(
    useCallback(() => {
      loadSets();
    }, [])
  );

  const loadSets = async () => {
    const data = await getSets();
    setSets(data);
    if (data.length > 0 && !selectedSetId) {
      setSelectedSetId(data[0].id);
    }
  };

  const selectedSet = sets.find((s) => s.id === selectedSetId) || null;

  const handleSelectSet = (id: string) => {
    Haptics.selectionAsync();
    setSelectedSetId(id);
    setStartBitIndex(0);
  };

  const handleStartPerformance = () => {
    if (!selectedSet) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push({
      pathname: "/perform",
      params: {
        setId: selectedSet.id,
        startBit: startBitIndex.toString(),
        recMode: recordingMode,
      },
    });
  };

  const handleCreateSet = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/create-set");
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
        <Text style={styles.headerTitle}>Perform Set</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionLabel}>Select a Set</Text>

        {sets.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="mic-outline" size={36} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No sets yet</Text>
            <Pressable
              onPress={handleCreateSet}
              style={({ pressed }) => [
                styles.createSetBtn,
                pressed && { opacity: 0.8 },
              ]}
            >
              <Ionicons name="add" size={18} color={Colors.navy} />
              <Text style={styles.createSetBtnText}>Create a Set</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {sets.map((set) => {
              const isSelected = set.id === selectedSetId;
              return (
                <Pressable
                  key={set.id}
                  onPress={() => handleSelectSet(set.id)}
                  style={[
                    styles.setOption,
                    isSelected && styles.setOptionSelected,
                  ]}
                >
                  <View style={styles.setOptionLeft}>
                    <View
                      style={[
                        styles.radioOuter,
                        isSelected && styles.radioOuterSelected,
                      ]}
                    >
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                    <View style={styles.setOptionInfo}>
                      <Text
                        style={[
                          styles.setOptionTitle,
                          isSelected && { color: Colors.amber },
                        ]}
                        numberOfLines={1}
                      >
                        {set.title}
                      </Text>
                      <Text style={styles.setOptionMeta}>
                        {formatDuration(set.totalDuration)} · {set.bits.length} bit
                        {set.bits.length !== 1 ? "s" : ""}
                      </Text>
                    </View>
                  </View>
                  <Feather
                    name="chevron-right"
                    size={16}
                    color={isSelected ? Colors.amber : Colors.textMuted}
                  />
                </Pressable>
              );
            })}

            <Pressable
              onPress={handleCreateSet}
              style={({ pressed }) => [
                styles.addSetRow,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons name="add-circle-outline" size={20} color={Colors.accent} />
              <Text style={styles.addSetText}>Create New Set</Text>
            </Pressable>
          </>
        )}

        {selectedSet && selectedSet.bits.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 28 }]}>
              Start From
            </Text>
            <View style={styles.bitsContainer}>
              {selectedSet.bits.map((bit, index) => {
                const isStart = index === startBitIndex;
                return (
                  <Pressable
                    key={bit.id}
                    onPress={() => {
                      setStartBitIndex(index);
                      Haptics.selectionAsync();
                    }}
                    style={[
                      styles.bitOption,
                      isStart && styles.bitOptionActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.bitNumber,
                        isStart && styles.bitNumberActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.bitNumberText,
                          isStart && { color: Colors.navy },
                        ]}
                      >
                        {index + 1}
                      </Text>
                    </View>
                    <View style={styles.bitOptionInfo}>
                      <Text
                        style={[
                          styles.bitOptionTitle,
                          isStart && { color: Colors.amber },
                        ]}
                        numberOfLines={1}
                      >
                        {bit.title || `Bit ${index + 1}`}
                      </Text>
                      <Text style={styles.bitOptionDuration}>
                        {formatDuration(bit.duration)}
                      </Text>
                    </View>
                    {isStart && (
                      <View style={styles.startBadge}>
                        <Text style={styles.startBadgeText}>START</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        <Text style={[styles.sectionLabel, { marginTop: 28 }]}>
          Recording
        </Text>
        <View style={styles.recordingOptions}>
          <Pressable
            onPress={() => {
              setRecordingMode("audio");
              Haptics.selectionAsync();
            }}
            style={[
              styles.recOption,
              recordingMode === "audio" && styles.recOptionActive,
            ]}
          >
            <View
              style={[
                styles.recIconWrap,
                recordingMode === "audio" && styles.recIconWrapActive,
              ]}
            >
              <Ionicons
                name="mic"
                size={22}
                color={recordingMode === "audio" ? Colors.navy : Colors.textSecondary}
              />
            </View>
            <Text
              style={[
                styles.recOptionLabel,
                recordingMode === "audio" && { color: Colors.amber },
              ]}
            >
              Audio
            </Text>
            <Text style={styles.recOptionDesc}>Record audio only</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setRecordingMode("video");
              Haptics.selectionAsync();
            }}
            style={[
              styles.recOption,
              recordingMode === "video" && styles.recOptionActive,
            ]}
          >
            <View
              style={[
                styles.recIconWrap,
                recordingMode === "video" && styles.recIconWrapActive,
              ]}
            >
              <Ionicons
                name="videocam"
                size={22}
                color={recordingMode === "video" ? Colors.navy : Colors.textSecondary}
              />
            </View>
            <Text
              style={[
                styles.recOptionLabel,
                recordingMode === "video" && { color: Colors.amber },
              ]}
            >
              Video
            </Text>
            <Text style={styles.recOptionDesc}>Record video & audio</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setRecordingMode("none");
              Haptics.selectionAsync();
            }}
            style={[
              styles.recOption,
              recordingMode === "none" && styles.recOptionActive,
            ]}
          >
            <View
              style={[
                styles.recIconWrap,
                recordingMode === "none" && styles.recIconWrapActive,
              ]}
            >
              <Feather
                name="mic-off"
                size={20}
                color={recordingMode === "none" ? Colors.navy : Colors.textSecondary}
              />
            </View>
            <Text
              style={[
                styles.recOptionLabel,
                recordingMode === "none" && { color: Colors.amber },
              ]}
            >
              None
            </Text>
            <Text style={styles.recOptionDesc}>Timer & notes only</Text>
          </Pressable>
        </View>

        {selectedSet && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Set</Text>
              <Text style={styles.summaryValue} numberOfLines={1}>
                {selectedSet.title}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Starting at</Text>
              <Text style={styles.summaryValue}>
                Bit {startBitIndex + 1}
                {selectedSet.bits[startBitIndex]?.title
                  ? ` — ${selectedSet.bits[startBitIndex].title}`
                  : ""}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Recording</Text>
              <Text style={styles.summaryValue}>
                {recordingMode === "audio"
                  ? "Audio"
                  : recordingMode === "video"
                    ? "Video"
                    : "Off"}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Duration</Text>
              <Text style={styles.summaryValue}>
                {formatDuration(
                  selectedSet.bits
                    .slice(startBitIndex)
                    .reduce((sum, b) => sum + b.duration, 0)
                )}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable
          onPress={handleStartPerformance}
          disabled={!selectedSet}
          style={({ pressed }) => [
            styles.goButton,
            pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
            !selectedSet && { opacity: 0.35 },
          ]}
        >
          <Ionicons name="play" size={22} color={Colors.navy} />
          <Text style={styles.goButtonText}>Start Performance</Text>
        </Pressable>
      </View>
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
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "SpaceGrotesk_400Regular",
    color: Colors.textMuted,
  },
  createSetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.amber,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  createSetBtnText: {
    fontSize: 14,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: Colors.navy,
  },
  setOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.cardBg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  setOptionSelected: {
    borderColor: "rgba(245, 166, 35, 0.35)",
    backgroundColor: "rgba(245, 166, 35, 0.06)",
  },
  setOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    borderColor: Colors.amber,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.amber,
  },
  setOptionInfo: {
    flex: 1,
  },
  setOptionTitle: {
    fontSize: 15,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: Colors.textPrimary,
  },
  setOptionMeta: {
    fontSize: 12,
    fontFamily: "SpaceGrotesk_400Regular",
    color: Colors.textMuted,
    marginTop: 2,
  },
  addSetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  addSetText: {
    fontSize: 14,
    fontFamily: "SpaceGrotesk_500Medium",
    color: Colors.accent,
  },
  bitsContainer: {
    gap: 6,
  },
  bitOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.cardBg,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  bitOptionActive: {
    borderColor: "rgba(245, 166, 35, 0.3)",
    backgroundColor: "rgba(245, 166, 35, 0.05)",
  },
  bitNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  bitNumberActive: {
    backgroundColor: Colors.amber,
  },
  bitNumberText: {
    fontSize: 12,
    fontFamily: "SpaceGrotesk_700Bold",
    color: Colors.textSecondary,
  },
  bitOptionInfo: {
    flex: 1,
  },
  bitOptionTitle: {
    fontSize: 14,
    fontFamily: "SpaceGrotesk_500Medium",
    color: Colors.textPrimary,
  },
  bitOptionDuration: {
    fontSize: 11,
    fontFamily: "JetBrainsMono_400Regular",
    color: Colors.textMuted,
    marginTop: 1,
  },
  startBadge: {
    backgroundColor: "rgba(245, 166, 35, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  startBadgeText: {
    fontSize: 10,
    fontFamily: "SpaceGrotesk_700Bold",
    color: Colors.amber,
    letterSpacing: 0.5,
  },
  recordingOptions: {
    flexDirection: "row",
    gap: 10,
  },
  recOption: {
    flex: 1,
    alignItems: "center",
    backgroundColor: Colors.cardBg,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    gap: 6,
  },
  recOptionActive: {
    borderColor: "rgba(245, 166, 35, 0.35)",
    backgroundColor: "rgba(245, 166, 35, 0.06)",
  },
  recIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  recIconWrapActive: {
    backgroundColor: Colors.amber,
  },
  recOptionLabel: {
    fontSize: 14,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: Colors.textPrimary,
  },
  recOptionDesc: {
    fontSize: 11,
    fontFamily: "SpaceGrotesk_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
  },
  summaryCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: 14,
    padding: 16,
    marginTop: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 13,
    fontFamily: "SpaceGrotesk_400Regular",
    color: Colors.textMuted,
  },
  summaryValue: {
    fontSize: 13,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: Colors.textPrimary,
    flex: 1,
    textAlign: "right",
    marginLeft: 16,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.04)",
    backgroundColor: Colors.darkSurface,
  },
  goButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.amber,
    borderRadius: 14,
    paddingVertical: 16,
  },
  goButtonText: {
    fontSize: 17,
    fontFamily: "SpaceGrotesk_700Bold",
    color: Colors.navy,
  },
});
