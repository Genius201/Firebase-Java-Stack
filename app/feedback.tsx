import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useAudioPlayer } from "expo-audio";
import Colors from "@/constants/colors";
import type { Performance } from "@/lib/types";
import { getPerformances, savePerformance } from "@/lib/storage";
import { apiRequest } from "@/lib/query-client";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function MarkdownText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <View style={mdStyles.container}>
      {lines.map((line, i) => {
        if (line.startsWith("**") && line.endsWith("**")) {
          return (
            <Text key={i} style={mdStyles.heading}>
              {line.replace(/\*\*/g, "")}
            </Text>
          );
        }
        if (line.startsWith("- ")) {
          return (
            <View key={i} style={mdStyles.bulletRow}>
              <View style={mdStyles.bullet} />
              <Text style={mdStyles.bodyText}>{line.slice(2)}</Text>
            </View>
          );
        }
        if (line.trim() === "") {
          return <View key={i} style={{ height: 8 }} />;
        }
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <Text key={i} style={mdStyles.bodyText}>
            {parts.map((part, j) =>
              part.startsWith("**") && part.endsWith("**") ? (
                <Text key={j} style={mdStyles.bold}>
                  {part.replace(/\*\*/g, "")}
                </Text>
              ) : (
                part
              )
            )}
          </Text>
        );
      })}
    </View>
  );
}

export default function FeedbackScreen() {
  const insets = useSafeAreaInsets();
  const { performanceId } = useLocalSearchParams<{ performanceId: string }>();
  const [performance, setPerformance] = useState<Performance | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [postNotes, setPostNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerSource, setPlayerSource] = useState<string | null>(null);
  const player = useAudioPlayer(playerSource);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  useEffect(() => {
    loadPerformance();
  }, [performanceId]);

  useEffect(() => {
    if (player) {
      player.addListener("playbackStatusUpdate", (status: any) => {
        if (status.playing !== undefined) {
          setIsPlaying(status.playing);
        }
      });
    }
  }, [player]);

  const loadPerformance = async () => {
    const perfs = await getPerformances();
    const found = perfs.find((p) => p.id === performanceId);
    if (found) {
      setPerformance(found);
      if (found.feedback) setFeedback(found.feedback);
      if (found.notes) setPostNotes(found.notes);
    }
  };

  const requestFeedback = async () => {
    if (!performance) return;
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const res = await apiRequest("POST", "/api/feedback", {
        setTitle: performance.setTitle,
        bits: performance.bits,
        totalDuration: performance.plannedDuration,
        actualDuration: performance.actualDuration,
        notes: postNotes || null,
      });

      const data = await res.json();
      setFeedback(data.feedback);

      const updated: Performance = {
        ...performance,
        feedback: data.feedback,
        notes: postNotes || null,
      };
      await savePerformance(updated);
      setPerformance(updated);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error("Feedback error:", err);
    } finally {
      setLoading(false);
    }
  };

  const playRecording = () => {
    if (!performance?.recordingUri) return;

    if (!playerSource) {
      setPlayerSource(performance.recordingUri);
      setTimeout(() => {
        player?.play();
        setIsPlaying(true);
      }, 100);
      return;
    }

    if (isPlaying) {
      player?.pause();
      setIsPlaying(false);
    } else {
      player?.play();
      setIsPlaying(true);
    }
  };

  const handleDone = () => {
    router.dismissAll();
    router.replace("/");
  };

  if (!performance) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
        <ActivityIndicator color={Colors.amber} size="large" />
      </View>
    );
  }

  const timeDiff = performance.actualDuration - performance.plannedDuration;

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
        <Pressable onPress={handleDone} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Post-Set Review</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{performance.setTitle}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {formatTime(performance.actualDuration)}
              </Text>
              <Text style={styles.statLabel}>Actual</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {formatTime(performance.plannedDuration)}
              </Text>
              <Text style={styles.statLabel}>Planned</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statValue,
                  {
                    color:
                      Math.abs(timeDiff) <= 30
                        ? Colors.success
                        : Colors.danger,
                  },
                ]}
              >
                {timeDiff > 0 ? "+" : ""}
                {formatTime(timeDiff)}
              </Text>
              <Text style={styles.statLabel}>Diff</Text>
            </View>
          </View>
        </View>

        {performance.recordingUri && (
          <Pressable
            onPress={playRecording}
            style={({ pressed }) => [
              styles.playbackCard,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={22}
              color={Colors.amber}
            />
            <Text style={styles.playbackText}>
              {isPlaying ? "Pause Recording" : "Play Recording"}
            </Text>
          </Pressable>
        )}

        <View style={styles.notesSection}>
          <Text style={styles.sectionTitle}>Post-Show Notes</Text>
          <TextInput
            style={styles.notesInput}
            value={postNotes}
            onChangeText={setPostNotes}
            placeholder="How did it go? Any crowd reactions, bits that killed or bombed..."
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={4}
          />
        </View>

        {!feedback && (
          <Pressable
            onPress={requestFeedback}
            disabled={loading}
            style={({ pressed }) => [
              styles.feedbackButton,
              pressed && { opacity: 0.85 },
              loading && { opacity: 0.6 },
            ]}
          >
            {loading ? (
              <ActivityIndicator color={Colors.navy} size="small" />
            ) : (
              <>
                <Ionicons name="sparkles" size={18} color={Colors.navy} />
                <Text style={styles.feedbackButtonText}>
                  Get AI Feedback
                </Text>
              </>
            )}
          </Pressable>
        )}

        {feedback && (
          <View style={styles.feedbackCard}>
            <View style={styles.feedbackHeader}>
              <Ionicons name="sparkles" size={18} color={Colors.accent} />
              <Text style={styles.feedbackTitle}>AI Coach Feedback</Text>
            </View>
            <MarkdownText text={feedback} />

            <Pressable
              onPress={requestFeedback}
              disabled={loading}
              style={({ pressed }) => [
                styles.regenerateButton,
                pressed && { opacity: 0.8 },
              ]}
            >
              {loading ? (
                <ActivityIndicator color={Colors.accent} size="small" />
              ) : (
                <>
                  <Feather name="refresh-cw" size={14} color={Colors.accent} />
                  <Text style={styles.regenerateText}>Regenerate</Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        <Pressable
          onPress={handleDone}
          style={({ pressed }) => [
            styles.doneButton,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.doneButtonText}>Back to Sets</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const mdStyles = StyleSheet.create({
  container: { gap: 2 },
  heading: {
    fontSize: 16,
    fontFamily: "SpaceGrotesk_700Bold",
    color: Colors.textPrimary,
    marginTop: 12,
    marginBottom: 4,
  },
  bodyText: {
    fontSize: 14,
    fontFamily: "SpaceGrotesk_400Regular",
    color: Colors.textSecondary,
    lineHeight: 21,
  },
  bold: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: Colors.textPrimary,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingLeft: 4,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.accent,
    marginTop: 8,
  },
});

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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  summaryCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(245, 166, 35, 0.12)",
  },
  summaryTitle: {
    fontSize: 20,
    fontFamily: "SpaceGrotesk_700Bold",
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontFamily: "JetBrainsMono_700Bold",
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "SpaceGrotesk_400Regular",
    color: Colors.textMuted,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  playbackCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.cardBg,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(245, 166, 35, 0.15)",
  },
  playbackText: {
    fontSize: 15,
    fontFamily: "SpaceGrotesk_500Medium",
    color: Colors.amber,
  },
  notesSection: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: Colors.textPrimary,
  },
  notesInput: {
    backgroundColor: Colors.cardBg,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    fontFamily: "SpaceGrotesk_400Regular",
    color: Colors.textPrimary,
    minHeight: 80,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  feedbackButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.amber,
    borderRadius: 12,
    paddingVertical: 16,
  },
  feedbackButtonText: {
    fontSize: 16,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: Colors.navy,
  },
  feedbackCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(124, 92, 252, 0.2)",
  },
  feedbackHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  feedbackTitle: {
    fontSize: 16,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: Colors.accent,
  },
  regenerateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(124, 92, 252, 0.3)",
  },
  regenerateText: {
    fontSize: 13,
    fontFamily: "SpaceGrotesk_500Medium",
    color: Colors.accent,
  },
  doneButton: {
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.darkSurface,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  doneButtonText: {
    fontSize: 15,
    fontFamily: "SpaceGrotesk_500Medium",
    color: Colors.textSecondary,
  },
});
