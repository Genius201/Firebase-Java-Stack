import React, { useState, useCallback, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  FlatList,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as Crypto from "expo-crypto";
import Colors from "@/constants/colors";
import type { BrainDrainNote } from "@/lib/types";
import {
  getBrainDrainNotes,
  saveBrainDrainNote,
  deleteBrainDrainNote,
} from "@/lib/storage";

const TAGS: { value: BrainDrainNote["tag"]; label: string; color: string }[] = [
  { value: "bit-idea", label: "Bit Idea", color: Colors.amber },
  { value: "punchline", label: "Punchline", color: "#FF6B6B" },
  { value: "premise", label: "Premise", color: Colors.accent },
  { value: "callback", label: "Callback", color: Colors.success },
  { value: "general", label: "General", color: Colors.textSecondary },
];

function getTagInfo(tag: BrainDrainNote["tag"]) {
  return TAGS.find((t) => t.value === tag) || TAGS[4];
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function NoteCard({
  item,
  onDelete,
  onEdit,
}: {
  item: BrainDrainNote;
  onDelete: (id: string) => void;
  onEdit: (note: BrainDrainNote) => void;
}) {
  const tagInfo = getTagInfo(item.tag);

  const handleDelete = () => {
    if (Platform.OS === "web") {
      onDelete(item.id);
      return;
    }
    Alert.alert("Delete Note", "Delete this idea?", [
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
      style={({ pressed }) => [styles.noteCard, pressed && { opacity: 0.85 }]}
      onPress={() => onEdit(item)}
    >
      <View style={styles.noteTopRow}>
        <View
          style={[styles.tagBadge, { borderColor: `${tagInfo.color}44` }]}
        >
          <View
            style={[styles.tagDot, { backgroundColor: tagInfo.color }]}
          />
          <Text style={[styles.tagLabel, { color: tagInfo.color }]}>
            {tagInfo.label}
          </Text>
        </View>
        <View style={styles.noteActions}>
          <Text style={styles.timeText}>{timeAgo(item.createdAt)}</Text>
          <Pressable onPress={handleDelete} hitSlop={12}>
            <Feather name="x" size={16} color={Colors.textMuted} />
          </Pressable>
        </View>
      </View>
      <Text style={styles.noteText}>{item.text}</Text>
    </Pressable>
  );
}

export default function BrainDrainScreen() {
  const insets = useSafeAreaInsets();
  const [notes, setNotes] = useState<BrainDrainNote[]>([]);
  const [inputText, setInputText] = useState("");
  const [selectedTag, setSelectedTag] =
    useState<BrainDrainNote["tag"]>("bit-idea");
  const [editingNote, setEditingNote] = useState<BrainDrainNote | null>(null);
  const [filterTag, setFilterTag] = useState<BrainDrainNote["tag"] | "all">(
    "all"
  );
  const inputRef = useRef<TextInput>(null);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  useFocusEffect(
    useCallback(() => {
      loadNotes();
    }, [])
  );

  const loadNotes = async () => {
    const data = await getBrainDrainNotes();
    setNotes(data);
  };

  const handleSave = async () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (editingNote) {
      const updated: BrainDrainNote = {
        ...editingNote,
        text: trimmed,
        tag: selectedTag,
      };
      await saveBrainDrainNote(updated);
      setEditingNote(null);
    } else {
      const newNote: BrainDrainNote = {
        id: Crypto.randomUUID(),
        text: trimmed,
        tag: selectedTag,
        createdAt: Date.now(),
        usedInSetId: null,
      };
      await saveBrainDrainNote(newNote);
    }

    setInputText("");
    setSelectedTag("bit-idea");
    loadNotes();
  };

  const handleEdit = (note: BrainDrainNote) => {
    setEditingNote(note);
    setInputText(note.text);
    setSelectedTag(note.tag);
    inputRef.current?.focus();
  };

  const handleCancelEdit = () => {
    setEditingNote(null);
    setInputText("");
    setSelectedTag("bit-idea");
  };

  const handleDelete = async (id: string) => {
    await deleteBrainDrainNote(id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (editingNote?.id === id) handleCancelEdit();
    loadNotes();
  };

  const filteredNotes =
    filterTag === "all" ? notes : notes.filter((n) => n.tag === filterTag);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
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
            <Ionicons
              name="chevron-back"
              size={24}
              color={Colors.textPrimary}
            />
          </Pressable>
          <View style={styles.headerCenter}>
            <MaterialCommunityIcons
              name="brain"
              size={22}
              color={Colors.accent}
            />
            <Text style={styles.headerTitle}>Brain Drain</Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        <Text style={styles.headerSubtitle}>
          Dump every idea. Sort later.
        </Text>

        <View style={styles.filterRow}>
          <Pressable
            onPress={() => setFilterTag("all")}
            style={[
              styles.filterChip,
              filterTag === "all" && styles.filterChipActive,
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                filterTag === "all" && styles.filterChipTextActive,
              ]}
            >
              All ({notes.length})
            </Text>
          </Pressable>
          {TAGS.map((tag) => {
            const count = notes.filter((n) => n.tag === tag.value).length;
            if (count === 0) return null;
            return (
              <Pressable
                key={tag.value}
                onPress={() => setFilterTag(tag.value)}
                style={[
                  styles.filterChip,
                  filterTag === tag.value && {
                    backgroundColor: `${tag.color}18`,
                    borderColor: `${tag.color}44`,
                  },
                ]}
              >
                <View
                  style={[
                    styles.filterDot,
                    { backgroundColor: tag.color },
                  ]}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    filterTag === tag.value && { color: tag.color },
                  ]}
                >
                  {count}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <FlatList
          data={filteredNotes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NoteCard
              item={item}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!filteredNotes.length}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="lightbulb-outline"
                size={48}
                color={Colors.textMuted}
              />
              <Text style={styles.emptyTitle}>
                {filterTag === "all"
                  ? "No ideas yet"
                  : "Nothing here"}
              </Text>
              <Text style={styles.emptyText}>
                {filterTag === "all"
                  ? "Type an idea below and hit save"
                  : "No notes with this tag"}
              </Text>
            </View>
          }
        />

        <View style={styles.inputSection}>
          {editingNote && (
            <Pressable onPress={handleCancelEdit} style={styles.editingBanner}>
              <Feather name="edit-2" size={13} color={Colors.accent} />
              <Text style={styles.editingText}>Editing note</Text>
              <Feather name="x" size={14} color={Colors.textMuted} />
            </Pressable>
          )}

          <View style={styles.tagSelector}>
            {TAGS.map((tag) => (
              <Pressable
                key={tag.value}
                onPress={() => {
                  setSelectedTag(tag.value);
                  Haptics.selectionAsync();
                }}
                style={[
                  styles.tagOption,
                  selectedTag === tag.value && {
                    backgroundColor: `${tag.color}18`,
                    borderColor: `${tag.color}55`,
                  },
                ]}
              >
                <View
                  style={[
                    styles.tagOptionDot,
                    { backgroundColor: tag.color },
                    selectedTag === tag.value && {
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.tagOptionLabel,
                    selectedTag === tag.value && { color: tag.color },
                  ]}
                >
                  {tag.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="What's the idea..."
              placeholderTextColor={Colors.textMuted}
              multiline
              maxLength={500}
              onSubmitEditing={handleSave}
              blurOnSubmit={false}
            />
            <Pressable
              onPress={handleSave}
              disabled={!inputText.trim()}
              style={({ pressed }) => [
                styles.saveBtn,
                !inputText.trim() && { opacity: 0.3 },
                pressed && { transform: [{ scale: 0.92 }] },
              ]}
            >
              <Ionicons
                name={editingNote ? "checkmark" : "arrow-up"}
                size={20}
                color={Colors.navy}
              />
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
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
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: "SpaceGrotesk_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
    marginBottom: 10,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 6,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  filterChipActive: {
    backgroundColor: "rgba(124, 92, 252, 0.12)",
    borderColor: "rgba(124, 92, 252, 0.35)",
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: "SpaceGrotesk_500Medium",
    color: Colors.textMuted,
  },
  filterChipTextActive: {
    color: Colors.accent,
  },
  filterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
  noteCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  noteTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  tagBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tagLabel: {
    fontSize: 11,
    fontFamily: "SpaceGrotesk_500Medium",
  },
  noteActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  timeText: {
    fontSize: 11,
    fontFamily: "SpaceGrotesk_400Regular",
    color: Colors.textMuted,
  },
  noteText: {
    fontSize: 15,
    fontFamily: "SpaceGrotesk_400Regular",
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: Colors.textPrimary,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "SpaceGrotesk_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  inputSection: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
    backgroundColor: Colors.darkSurface,
  },
  editingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  editingText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "SpaceGrotesk_500Medium",
    color: Colors.accent,
  },
  tagSelector: {
    flexDirection: "row",
    gap: 6,
    paddingVertical: 10,
    flexWrap: "wrap",
  },
  tagOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  tagOptionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tagOptionLabel: {
    fontSize: 12,
    fontFamily: "SpaceGrotesk_500Medium",
    color: Colors.textMuted,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "SpaceGrotesk_400Regular",
    color: Colors.textPrimary,
    backgroundColor: Colors.inputBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 100,
    minHeight: 42,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  saveBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.amber,
    alignItems: "center",
    justifyContent: "center",
  },
});
