export interface BrainDrainNote {
  id: string;
  text: string;
  tag: "bit-idea" | "punchline" | "premise" | "callback" | "general";
  createdAt: number;
  usedInSetId: string | null;
}

export interface Bit {
  id: string;
  title: string;
  notes: string;
  duration: number;
}

export interface ComedySet {
  id: string;
  title: string;
  bits: Bit[];
  totalDuration: number;
  createdAt: number;
  updatedAt: number;
}

export interface Performance {
  id: string;
  setId: string;
  setTitle: string;
  bits: Bit[];
  actualDuration: number;
  plannedDuration: number;
  recordingUri: string | null;
  feedback: string | null;
  notes: string | null;
  performedAt: number;
}
