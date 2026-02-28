import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Platform,
  FlatList,
  Dimensions,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as Crypto from "expo-crypto";
import { useAudioRecorder, AudioModule, RecordingPresets } from "expo-audio";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import Colors from "@/constants/colors";
import type { Bit, ComedySet, Performance } from "@/lib/types";
import { getSets, savePerformance } from "@/lib/storage";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function formatTime(seconds: number): string {
  const m = Math.floor(Math.abs(seconds) / 60);
  const s = Math.abs(seconds) % 60;
  const prefix = seconds < 0 ? "-" : "";
  return `${prefix}${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function BitNoteCard({
  bit,
  index,
  isActive,
  isPast,
  bitTimeRemaining,
}: {
  bit: Bit;
  index: number;
  isActive: boolean;
  isPast: boolean;
  bitTimeRemaining: number;
}) {
  const animatedBg = useAnimatedStyle(() => ({
    backgroundColor: isActive
      ? withTiming("rgba(245, 166, 35, 0.15)", { duration: 300 })
      : isPast
        ? withTiming("rgba(255,255,255,0.03)", { duration: 300 })
        : withTiming("rgba(255,255,255,0.06)", { duration: 300 }),
    borderColor: isActive
      ? withTiming("rgba(245, 166, 35, 0.5)", { duration: 300 })
      : withTiming("rgba(255,255,255,0.08)", { duration: 300 }),
    opacity: withTiming(isPast ? 0.5 : 1, { duration: 300 }),
  }));

  return (
    <Animated.View style={[styles.noteCard, animatedBg]}>
      <View style={styles.noteHeader}>
        <View
          style={[
            styles.noteIndex,
            isActive && { backgroundColor: Colors.amber },
          ]}
        >
          {isPast ? (
            <Ionicons name="checkmark" size={12} color={Colors.navy} />
          ) : (
            <Text
              style={[
                styles.noteIndexText,
                isActive && { color: Colors.navy },
              ]}
            >
              {index + 1}
            </Text>
          )}
        </View>
        <Text
          style={[
            styles.noteTitle,
            isActive && { color: Colors.amber },
          ]}
          numberOfLines={1}
        >
          {bit.title || `Bit ${index + 1}`}
        </Text>
        {isActive && (
          <View style={styles.activeTimeBadge}>
            <Text style={styles.activeTimeText}>
              {formatTime(bitTimeRemaining)}
            </Text>
          </View>
        )}
      </View>
      {!!bit.notes && (
        <Text
          style={[styles.noteText, isActive && { color: Colors.textPrimary }]}
          numberOfLines={isActive ? undefined : 2}
        >
          {bit.notes}
        </Text>
      )}
    </Animated.View>
  );
}

export default function PerformScreen() {
  const insets = useSafeAreaInsets();
  const { setId, startBit, recMode } = useLocalSearchParams<{
    setId: string;
    startBit?: string;
    recMode?: string;
  }>();
  const startBitIndex = parseInt(startBit || "0") || 0;
  const recordingMode = (recMode || "audio") as "audio" | "video" | "none";

  const [comedySet, setComedySet] = useState<ComedySet | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [currentBitIndex, setCurrentBitIndex] = useState(startBitIndex);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [hasFinished, setHasFinished] = useState(false);
  const [manualBitOverride, setManualBitOverride] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const flatListRef = useRef<FlatList>(null);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const pulseAnim = useSharedValue(1);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  useEffect(() => {
    loadSet();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [setId]);

  const loadSet = async () => {
    const sets = await getSets();
    const found = sets.find((s) => s.id === setId);
    if (found) {
      setComedySet(found);
      if (startBitIndex > 0) {
        const skipTime = found.bits
          .slice(0, startBitIndex)
          .reduce((sum, b) => sum + b.duration, 0);
        setElapsed(skipTime);
      }
    }
  };

  const getCumulativeTime = useCallback(
    (bitIndex: number): number => {
      if (!comedySet) return 0;
      return comedySet.bits
        .slice(0, bitIndex + 1)
        .reduce((sum, b) => sum + b.duration, 0);
    },
    [comedySet]
  );

  const getCurrentBitFromElapsed = useCallback(
    (elapsedSec: number): number => {
      if (!comedySet) return 0;
      let acc = 0;
      for (let i = 0; i < comedySet.bits.length; i++) {
        acc += comedySet.bits[i].duration;
        if (elapsedSec < acc) return i;
      }
      return comedySet.bits.length - 1;
    },
    [comedySet]
  );

  useEffect(() => {
    if (isRunning && comedySet && !manualBitOverride) {
      const autoBitIndex = getCurrentBitFromElapsed(elapsed);
      if (autoBitIndex !== currentBitIndex) {
        setCurrentBitIndex(autoBitIndex);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        flatListRef.current?.scrollToIndex({
          index: autoBitIndex,
          animated: true,
          viewPosition: 0.3,
        });
      }
    }
  }, [elapsed, isRunning, comedySet, getCurrentBitFromElapsed, currentBitIndex, manualBitOverride]);

  const startTimer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsRunning(true);
    startTimeRef.current = Date.now() - elapsed * 1000;

    pulseAnim.value = withRepeat(
      withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    intervalRef.current = setInterval(() => {
      const newElapsed = Math.floor(
        (Date.now() - startTimeRef.current) / 1000
      );
      setElapsed(newElapsed);
    }, 200);
  };

  const pauseTimer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRunning(false);
    cancelAnimation(pulseAnim);
    pulseAnim.value = withTiming(1, { duration: 200 });
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const finishSet = async () => {
    pauseTimer();
    setHasFinished(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    let finalRecordingUri = recordingUri;
    if (isRecording) {
      try {
        await audioRecorder.stop();
        finalRecordingUri = audioRecorder.uri || null;
        setRecordingUri(finalRecordingUri);
        setIsRecording(false);
      } catch (e) {
        console.error("Error stopping recording:", e);
      }
    }

    if (!comedySet) return;

    const perf: Performance = {
      id: Crypto.randomUUID(),
      setId: comedySet.id,
      setTitle: comedySet.title,
      bits: comedySet.bits,
      actualDuration: elapsed,
      plannedDuration: comedySet.totalDuration,
      recordingUri: finalRecordingUri || null,
      feedback: null,
      notes: null,
      performedAt: Date.now(),
    };

    await savePerformance(perf);

    router.push({
      pathname: "/feedback",
      params: { performanceId: perf.id },
    });
  };

  const toggleRecording = async () => {
    if (isRecording) {
      try {
        await audioRecorder.stop();
        setRecordingUri(audioRecorder.uri || null);
        setIsRecording(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {
        console.error("Error stopping recording:", e);
      }
      return;
    }

    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        return;
      }

      audioRecorder.record();
      setIsRecording(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (e) {
      console.error("Error starting recording:", e);
    }
  };

  const skipBit = (direction: "next" | "prev") => {
    if (!comedySet) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setManualBitOverride(true);
    const newIndex =
      direction === "next"
        ? Math.min(currentBitIndex + 1, comedySet.bits.length - 1)
        : Math.max(currentBitIndex - 1, 0);
    setCurrentBitIndex(newIndex);
    flatListRef.current?.scrollToIndex({
      index: newIndex,
      animated: true,
      viewPosition: 0.3,
    });
    setTimeout(() => setManualBitOverride(false), 5000);
  };

  const timerPulse = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  if (!comedySet) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
        <Text style={styles.loadingText}>Loading set...</Text>
      </View>
    );
  }

  const totalDuration = comedySet.totalDuration;
  const remaining = totalDuration - elapsed;
  const progress = Math.min(elapsed / totalDuration, 1);
  const isOvertime = remaining < 0;

  const currentBitEndTime = getCumulativeTime(currentBitIndex);
  const currentBitStartTime =
    currentBitIndex > 0 ? getCumulativeTime(currentBitIndex - 1) : 0;
  const bitTimeRemaining = currentBitEndTime - elapsed;
  const bitProgress = Math.min(
    (elapsed - currentBitStartTime) /
      (comedySet.bits[currentBitIndex]?.duration || 1),
    1
  );

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
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={Colors.textSecondary} />
        </Pressable>
        <Text style={styles.setTitleSmall} numberOfLines={1}>
          {comedySet.title}
        </Text>
        {recordingMode !== "none" ? (
          <Pressable
            onPress={toggleRecording}
            style={({ pressed }) => [
              styles.recButton,
              isRecording && styles.recButtonActive,
              pressed && { opacity: 0.8 },
            ]}
          >
            <MaterialCommunityIcons
              name={
                isRecording
                  ? "stop"
                  : recordingMode === "video"
                    ? "video"
                    : "microphone"
              }
              size={20}
              color={isRecording ? "#fff" : Colors.danger}
            />
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <View style={styles.timerSection}>
        <View style={styles.progressBarOuter}>
          <View
            style={[
              styles.progressBarInner,
              {
                width: `${progress * 100}%`,
                backgroundColor: isOvertime ? Colors.danger : Colors.amber,
              },
            ]}
          />
        </View>

        <Animated.View style={[styles.timerContainer, timerPulse]}>
          <Text
            style={[styles.timerText, isOvertime && { color: Colors.danger }]}
          >
            {formatTime(remaining)}
          </Text>
        </Animated.View>

        <Text style={styles.elapsedLabel}>
          {formatTime(elapsed)} elapsed of {formatTime(totalDuration)}
        </Text>

        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingLabel}>Recording</Text>
          </View>
        )}
      </View>

      <View style={styles.controlsRow}>
        <Pressable
          onPress={() => skipBit("prev")}
          disabled={currentBitIndex === 0}
          style={({ pressed }) => [
            styles.skipButton,
            pressed && { opacity: 0.7 },
            currentBitIndex === 0 && { opacity: 0.3 },
          ]}
        >
          <Ionicons
            name="play-skip-back"
            size={22}
            color={Colors.textSecondary}
          />
        </Pressable>

        {!isRunning && !hasFinished ? (
          <Pressable
            onPress={startTimer}
            style={({ pressed }) => [
              styles.playButton,
              pressed && { transform: [{ scale: 0.95 }] },
            ]}
          >
            <Ionicons name="play" size={32} color={Colors.navy} />
          </Pressable>
        ) : !hasFinished ? (
          <Pressable
            onPress={pauseTimer}
            style={({ pressed }) => [
              styles.pauseButton,
              pressed && { transform: [{ scale: 0.95 }] },
            ]}
          >
            <Ionicons name="pause" size={32} color={Colors.amber} />
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => skipBit("next")}
          disabled={currentBitIndex === comedySet.bits.length - 1}
          style={({ pressed }) => [
            styles.skipButton,
            pressed && { opacity: 0.7 },
            currentBitIndex === comedySet.bits.length - 1 && { opacity: 0.3 },
          ]}
        >
          <Ionicons
            name="play-skip-forward"
            size={22}
            color={Colors.textSecondary}
          />
        </Pressable>
      </View>

      {(isRunning || elapsed > 0) && !hasFinished && (
        <Pressable
          onPress={finishSet}
          style={({ pressed }) => [
            styles.finishButton,
            pressed && { opacity: 0.8 },
          ]}
        >
          <Ionicons name="flag" size={16} color={Colors.danger} />
          <Text style={styles.finishText}>End Set</Text>
        </Pressable>
      )}

      <View style={styles.currentBitBanner}>
        <View style={styles.bitProgressBarOuter}>
          <View
            style={[
              styles.bitProgressBarInner,
              { width: `${bitProgress * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.currentBitLabel}>
          Bit {currentBitIndex + 1}/{comedySet.bits.length}
        </Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={comedySet.bits}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <BitNoteCard
            bit={item}
            index={index}
            isActive={index === currentBitIndex}
            isPast={index < currentBitIndex}
            bitTimeRemaining={
              index === currentBitIndex ? bitTimeRemaining : item.duration
            }
          />
        )}
        contentContainerStyle={styles.notesList}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!comedySet.bits.length}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({
              index: info.index,
              animated: true,
              viewPosition: 0.3,
            });
          }, 100);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.navy,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: "SpaceGrotesk_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 100,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  setTitleSmall: {
    fontSize: 15,
    fontFamily: "SpaceGrotesk_500Medium",
    color: Colors.textSecondary,
    flex: 1,
    textAlign: "center",
    marginHorizontal: 12,
  },
  recButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 71, 87, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  recButtonActive: {
    backgroundColor: Colors.danger,
  },
  timerSection: {
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  progressBarOuter: {
    width: "100%",
    height: 4,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 2,
    marginBottom: 12,
    overflow: "hidden",
  },
  progressBarInner: {
    height: "100%",
    borderRadius: 2,
  },
  timerContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  timerText: {
    fontSize: 72,
    fontFamily: "JetBrainsMono_700Bold",
    color: Colors.textPrimary,
    letterSpacing: -2,
    lineHeight: 80,
  },
  elapsedLabel: {
    fontSize: 13,
    fontFamily: "SpaceGrotesk_400Regular",
    color: Colors.textMuted,
    marginTop: 4,
  },
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.danger,
  },
  recordingLabel: {
    fontSize: 12,
    fontFamily: "SpaceGrotesk_500Medium",
    color: Colors.danger,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
    paddingVertical: 12,
  },
  skipButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.cardBg,
    alignItems: "center",
    justifyContent: "center",
  },
  playButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.amber,
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 4,
  },
  pauseButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(245, 166, 35, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.amber,
  },
  finishButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 71, 87, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 71, 87, 0.3)",
  },
  finishText: {
    fontSize: 13,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: Colors.danger,
  },
  currentBitBanner: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 4,
  },
  bitProgressBarOuter: {
    width: "100%",
    height: 3,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 1.5,
    overflow: "hidden",
    marginBottom: 6,
  },
  bitProgressBarInner: {
    height: "100%",
    backgroundColor: Colors.accent,
    borderRadius: 1.5,
  },
  currentBitLabel: {
    fontSize: 12,
    fontFamily: "SpaceGrotesk_500Medium",
    color: Colors.textMuted,
  },
  notesList: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 8,
  },
  noteCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  noteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  noteIndex: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  noteIndexText: {
    fontSize: 11,
    fontFamily: "SpaceGrotesk_700Bold",
    color: Colors.textSecondary,
  },
  noteTitle: {
    fontSize: 15,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: Colors.textPrimary,
    flex: 1,
  },
  activeTimeBadge: {
    backgroundColor: "rgba(245, 166, 35, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  activeTimeText: {
    fontSize: 12,
    fontFamily: "JetBrainsMono_700Bold",
    color: Colors.amber,
  },
  noteText: {
    fontSize: 13,
    fontFamily: "SpaceGrotesk_400Regular",
    color: Colors.textSecondary,
    marginTop: 6,
    lineHeight: 19,
  },
});
