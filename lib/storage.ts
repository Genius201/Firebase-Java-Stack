import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ComedySet, Performance } from "./types";

const SETS_KEY = "@setflow_sets";
const PERFORMANCES_KEY = "@setflow_performances";

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
