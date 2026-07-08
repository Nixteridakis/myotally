import type { Exercise, Session } from "./types";

export interface Weights {
  primary: number;
  secondary: number;
  tertiary: number;
}

export interface WeightPreset {
  id: string;
  label: string;
  /** Shown under the preset picker so the philosophy behind the numbers is visible. */
  description: string;
  weights: Weights;
}

/**
 * Different training-volume philosophies disagree on how much secondary/tertiary
 * involvement should count toward a muscle's weekly frequency. None of these is
 * "correct" — they're conventions used by different coaches/tools. Pick whichever
 * matches how you think about indirect volume.
 */
export const WEIGHT_PRESETS: WeightPreset[] = [
  {
    id: "balanced",
    label: "Balanced",
    description: "Primary ×1 · Secondary ×0.5 · Tertiary ×0 — the common half-credit convention.",
    weights: { primary: 1, secondary: 0.5, tertiary: 0 },
  },
  {
    id: "direct-only",
    label: "Direct only",
    description:
      "Primary ×1 · Secondary ×0 · Tertiary ×0 — RP-style: only direct sets count toward a muscle.",
    weights: { primary: 1, secondary: 0, tertiary: 0 },
  },
  {
    id: "conservative",
    label: "Conservative",
    description:
      "Primary ×1 · Secondary ×0.33 · Tertiary ×0.1 — finer tiers for indirect involvement.",
    weights: { primary: 1, secondary: 0.33, tertiary: 0.1 },
  },
];

export const DEFAULT_WEIGHT_PRESET_ID = WEIGHT_PRESETS[0].id;

export function getWeightPreset(id: string): WeightPreset {
  return WEIGHT_PRESETS.find((p) => p.id === id) ?? WEIGHT_PRESETS[0];
}

export interface MuscleFrequency {
  muscle: string;
  total: number;
  /** How that total breaks down by involvement level. */
  primary: number;
  secondary: number;
  tertiary: number;
}

/**
 * Tally how many times each muscle group is trained across the given sessions.
 * Each set of an exercise contributes weights.primary / .secondary / .tertiary
 * to its muscle groups — e.g. 3 sets of a primary chest exercise counts as
 * hitting chest 3x that week (under weights where primary = 1).
 */
export function computeFrequency(
  sessions: Session[],
  exercisesById: Record<string, Exercise>,
  weights: Weights
): MuscleFrequency[] {
  const map = new Map<string, MuscleFrequency>();

  const bump = (muscle: string, level: keyof Weights, sets: number) => {
    const amount = weights[level] * sets;
    if (!map.has(muscle)) {
      map.set(muscle, { muscle, total: 0, primary: 0, secondary: 0, tertiary: 0 });
    }
    const entry = map.get(muscle)!;
    entry[level] += amount;
    entry.total += amount;
  };

  for (const session of sessions) {
    for (const item of session.items) {
      const ex = exercisesById[item.exerciseId];
      if (!ex) continue;
      ex.primary.forEach((m) => bump(m, "primary", item.sets));
      ex.secondary.forEach((m) => bump(m, "secondary", item.sets));
      ex.tertiary.forEach((m) => bump(m, "tertiary", item.sets));
    }
  }

  return [...map.values()].sort(
    (a, b) => b.total - a.total || a.muscle.localeCompare(b.muscle)
  );
}
