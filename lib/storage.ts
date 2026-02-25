import AsyncStorage from "@react-native-async-storage/async-storage";
import type { BrainDrainNote, ComedySet, Performance } from "./types";

const SETS_KEY = "@setflow_sets";
const PERFORMANCES_KEY = "@setflow_performances";
const BRAINDRAIN_KEY = "@setflow_braindrain";

export async function getSets(): Promise<ComedySet[]> {
  const data = await AsyncStorage.getItem(SETS_KEY);
  return data ? JSON.parse(data) : [];
}

export async function saveSet(set: ComedySet): Promise<void> {
  const sets = await getSets();
  const idx = sets.findIndex((s) => s.id === set.id);
  if (idx >= 0) {
    sets[idx] = set;
  } else {
    sets.unshift(set);
  }
  await AsyncStorage.setItem(SETS_KEY, JSON.stringify(sets));
}

export async function deleteSet(id: string): Promise<void> {
  const sets = await getSets();
  await AsyncStorage.setItem(
    SETS_KEY,
    JSON.stringify(sets.filter((s) => s.id !== id))
  );
}

export async function getPerformances(): Promise<Performance[]> {
  const data = await AsyncStorage.getItem(PERFORMANCES_KEY);
  return data ? JSON.parse(data) : [];
}

export async function savePerformance(perf: Performance): Promise<void> {
  const perfs = await getPerformances();
  const idx = perfs.findIndex((p) => p.id === perf.id);
  if (idx >= 0) {
    perfs[idx] = perf;
  } else {
    perfs.unshift(perf);
  }
  await AsyncStorage.setItem(PERFORMANCES_KEY, JSON.stringify(perfs));
}

export async function deletePerformance(id: string): Promise<void> {
  const perfs = await getPerformances();
  await AsyncStorage.setItem(
    PERFORMANCES_KEY,
    JSON.stringify(perfs.filter((p) => p.id !== id))
  );
}

export async function getBrainDrainNotes(): Promise<BrainDrainNote[]> {
  const data = await AsyncStorage.getItem(BRAINDRAIN_KEY);
  return data ? JSON.parse(data) : [];
}

export async function saveBrainDrainNote(note: BrainDrainNote): Promise<void> {
  const notes = await getBrainDrainNotes();
  const idx = notes.findIndex((n) => n.id === note.id);
  if (idx >= 0) {
    notes[idx] = note;
  } else {
    notes.unshift(note);
  }
  await AsyncStorage.setItem(BRAINDRAIN_KEY, JSON.stringify(notes));
}

export async function deleteBrainDrainNote(id: string): Promise<void> {
  const notes = await getBrainDrainNotes();
  await AsyncStorage.setItem(
    BRAINDRAIN_KEY,
    JSON.stringify(notes.filter((n) => n.id !== id))
  );
}
