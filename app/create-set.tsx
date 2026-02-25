import React, { useState, useEffect, useRef } from "react";
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
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as Crypto from "expo-crypto";
import Colors from "@/constants/colors";
import type { Bit, ComedySet } from "@/lib/types";
import { getSets, saveSet } from "@/lib/storage";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function BitItem({
  bit,
  index,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  bit: Bit;
  index: number;
  onUpdate: (id: string, field: keyof Bit, value: string | number) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [durationText, setDurationText] = useState(
    Math.floor(bit.duration / 60).toString()
  );
  const [secondsText, setSecondsText] = useState(
    (bit.duration % 60).toString()
  );

  const updateDuration = (mins: string, secs: string) => {
    const m = parseInt(mins) || 0;
    const s = parseInt(secs) || 0;
    onUpdate(bit.id, "duration", m * 60 + s);
  };

  return (
    <View style={styles.bitCard}>
      <View style={styles.bitHeader}>
        <View style={styles.bitIndex}>
          <Text style={styles.bitIndexText}>{index + 1}</Text>
        </View>
        <TextInput
          style={styles.bitTitleInput}
          value={bit.title}
          onChangeText={(text) => onUpdate(bit.id, "title", text)}
          placeholder="Bit name"
          placeholderTextColor={Colors.textMuted}
        />
        <View style={styles.bitActions}>
          <Pressable
            onPress={() => onMoveUp(bit.id)}
            disabled={isFirst}
            style={{ opacity: isFirst ? 0.3 : 1 }}
            hitSlop={8}
          >
            <Feather name="chevron-up" size={18} color={Colors.textSecondary} />
          </Pressable>
          <Pressable
            onPress={() => onMoveDown(bit.id)}
            disabled={isLast}
            style={{ opacity: isLast ? 0.3 : 1 }}
            hitSlop={8}
          >
            <Feather
              name="chevron-down"
              size={18}
              color={Colors.textSecondary}
            />
          </Pressable>
          <Pressable onPress={() => onDelete(bit.id)} hitSlop={8}>
            <Feather name="x" size={18} color={Colors.danger} />
          </Pressable>
        </View>
      </View>

      <TextInput
        style={styles.bitNotesInput}
        value={bit.notes}
        onChangeText={(text) => onUpdate(bit.id, "notes", text)}
        placeholder="Notes, punchlines, tags..."
        placeholderTextColor={Colors.textMuted}
        multiline
        numberOfLines={2}
      />

      <View style={styles.durationRow}>
        <Feather name="clock" size={14} color={Colors.textSecondary} />
        <TextInput
          style={styles.durationInput}
          value={durationText}
          onChangeText={(text) => {
            setDurationText(text);
            updateDuration(text, secondsText);
          }}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={Colors.textMuted}
          maxLength={2}
        />
        <Text style={styles.durationLabel}>min</Text>
        <TextInput
          style={styles.durationInput}
          value={secondsText}
          onChangeText={(text) => {
            setSecondsText(text);
            updateDuration(durationText, text);
          }}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={Colors.textMuted}
          maxLength={2}
        />
        <Text style={styles.durationLabel}>sec</Text>
      </View>
    </View>
  );
}

export default function CreateSetScreen() {
  const insets = useSafeAreaInsets();
  const { setId } = useLocalSearchParams<{ setId?: string }>();
  const [title, setTitle] = useState("");
  const [bits, setBits] = useState<Bit[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  useEffect(() => {
    if (setId) {
      loadExistingSet();
    }
  }, [setId]);

  const loadExistingSet = async () => {
    const sets = await getSets();
    const existing = sets.find((s) => s.id === setId);
    if (existing) {
      setTitle(existing.title);
      setBits(existing.bits);
      setIsEditing(true);
    }
  };

  const addBit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBits((prev) => [
      ...prev,
      {
        id: Crypto.randomUUID(),
        title: "",
        notes: "",
        duration: 60,
      },
    ]);
  };

  const updateBit = (id: string, field: keyof Bit, value: string | number) => {
    setBits((prev) =>
      prev.map((b) => (b.id === id ? { ...b, [field]: value } : b))
    );
  };

  const deleteBit = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBits((prev) => prev.filter((b) => b.id !== id));
  };

  const moveBit = (id: string, direction: "up" | "down") => {
    setBits((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (
        (direction === "up" && idx === 0) ||
        (direction === "down" && idx === prev.length - 1)
      )
        return prev;
      const newBits = [...prev];
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      [newBits[idx], newBits[swapIdx]] = [newBits[swapIdx], newBits[idx]];
      return newBits;
    });
  };

  const totalDuration = bits.reduce((sum, b) => sum + b.duration, 0);

  const handleSave = async () => {
    if (!title.trim()) {
      if (Platform.OS === "web") {
        alert("Please enter a set title");
      } else {
        Alert.alert("Missing Title", "Please enter a set title");
      }
      return;
    }
    if (bits.length === 0) {
      if (Platform.OS === "web") {
        alert("Add at least one bit");
      } else {
        Alert.alert("No Bits", "Add at least one bit to your set");
      }
      return;
    }

    const set: ComedySet = {
      id: setId || Crypto.randomUUID(),
      title: title.trim(),
      bits,
      totalDuration,
      createdAt: isEditing ? Date.now() : Date.now(),
      updatedAt: Date.now(),
    };

    await saveSet(set);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

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
          <Text style={styles.headerTitle}>
            {isEditing ? "Edit Set" : "New Set"}
          </Text>
          <Pressable
            onPress={handleSave}
            style={({ pressed }) => [
              styles.saveButton,
              pressed && { opacity: 0.8 },
            ]}
          >
            <Feather name="check" size={20} color={Colors.navy} />
          </Pressable>
        </View>

        <View style={styles.titleSection}>
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Set title"
            placeholderTextColor={Colors.textMuted}
          />
          <View style={styles.totalDuration}>
            <Feather name="clock" size={14} color={Colors.amber} />
            <Text style={styles.totalDurationText}>
              Total: {formatDuration(totalDuration)}
            </Text>
          </View>
        </View>

        <FlatList
          data={bits}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <BitItem
              bit={item}
              index={index}
              onUpdate={updateBit}
              onDelete={deleteBit}
              onMoveUp={(id) => moveBit(id, "up")}
              onMoveDown={(id) => moveBit(id, "down")}
              isFirst={index === 0}
              isLast={index === bits.length - 1}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!bits.length}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          ListFooterComponent={
            <Pressable
              style={({ pressed }) => [
                styles.addBitButton,
                pressed && { opacity: 0.8 },
              ]}
              onPress={addBit}
            >
              <Ionicons name="add" size={20} color={Colors.amber} />
              <Text style={styles.addBitText}>Add Bit</Text>
            </Pressable>
          }
        />
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
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: Colors.textPrimary,
  },
  saveButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.amber,
    alignItems: "center",
    justifyContent: "center",
  },
  titleSection: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  titleInput: {
    fontSize: 24,
    fontFamily: "SpaceGrotesk_700Bold",
    color: Colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(245, 166, 35, 0.2)",
    paddingBottom: 8,
  },
  totalDuration: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  totalDurationText: {
    fontSize: 14,
    fontFamily: "SpaceGrotesk_500Medium",
    color: Colors.amber,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 10,
  },
  bitCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  bitHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bitIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.amber,
    alignItems: "center",
    justifyContent: "center",
  },
  bitIndexText: {
    fontSize: 12,
    fontFamily: "SpaceGrotesk_700Bold",
    color: Colors.navy,
  },
  bitTitleInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: "SpaceGrotesk_500Medium",
    color: Colors.textPrimary,
    paddingVertical: 4,
  },
  bitActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bitNotesInput: {
    fontSize: 13,
    fontFamily: "SpaceGrotesk_400Regular",
    color: Colors.textSecondary,
    marginTop: 8,
    paddingVertical: 4,
    minHeight: 36,
  },
  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  durationInput: {
    width: 36,
    textAlign: "center",
    fontSize: 14,
    fontFamily: "JetBrainsMono_400Regular",
    color: Colors.textPrimary,
    backgroundColor: Colors.inputBg,
    borderRadius: 6,
    paddingVertical: 4,
  },
  durationLabel: {
    fontSize: 12,
    fontFamily: "SpaceGrotesk_400Regular",
    color: Colors.textMuted,
  },
  addBitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(245, 166, 35, 0.3)",
    borderStyle: "dashed",
    marginTop: 4,
  },
  addBitText: {
    fontSize: 15,
    fontFamily: "SpaceGrotesk_500Medium",
    color: Colors.amber,
  },
});
