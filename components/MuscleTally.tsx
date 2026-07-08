"use client";

import { useMemo } from "react";
import type { Exercise, MuscleGroup, Session } from "@/lib/types";
import { WEIGHT_PRESETS, computeFrequency } from "@/lib/frequency";
import { useWeightPreset } from "@/lib/useWeightPreset";

interface Props {
  sessions: Session[];
  exercisesById: Record<string, Exercise>;
  allMuscles: MuscleGroup[];
  /** true: fill a fixed-height parent and scroll internally. false: size naturally (mobile page scroll). */
  fill?: boolean;
}

const fmt = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(1));

export default function MuscleTally({
  sessions,
  exercisesById,
  allMuscles,
  fill = true,
}: Props) {
  const { presetId, preset, setPresetId } = useWeightPreset();

  const rows = useMemo(
    () => computeFrequency(sessions, exercisesById, preset.weights),
    [sessions, exercisesById, preset]
  );

  const trained = new Set(rows.map((r) => r.muscle));
  const untrained = allMuscles
    .map((m) => m.name)
    .filter((name) => !trained.has(name))
    .sort((a, b) => a.localeCompare(b));

  const max = Math.max(1, ...rows.map((r) => r.total));

  return (
    <div className={`flex flex-col ${fill ? "h-full" : ""}`}>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">Weekly muscle frequency</h2>
      </div>

      <div className="mb-1 flex flex-wrap gap-1">
        {WEIGHT_PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPresetId(p.id)}
            title={p.description}
            className={`rounded-md border px-2 py-1 text-[11px] transition ${
              presetId === p.id
                ? "border-saiyan-orange/70 bg-saiyan-orange/10 text-saiyan-orange"
                : "border-white/10 text-white/50 hover:border-white/25 hover:text-white/80"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <p className="mb-3 text-xs text-white/40">{preset.description}</p>

      <div
        className={`space-y-2 pr-1 ${
          fill ? "min-h-0 flex-1 overflow-y-auto" : ""
        }`}
      >
        {rows.map((r) => (
          <div key={r.muscle}>
            <div className="flex items-baseline justify-between text-sm">
              <span>{r.muscle}</span>
              <span className="tabular-nums font-semibold text-saiyan-orange">
                {fmt(r.total)}×
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-saiyan-blue to-saiyan-orange"
                style={{ width: `${(r.total / max) * 100}%` }}
              />
            </div>
            <div className="mt-0.5 text-[11px] text-white/35">
              {fmt(r.primary)} primary
              {r.secondary > 0 ? ` · ${fmt(r.secondary)} secondary` : ""}
            </div>
          </div>
        ))}

        {rows.length === 0 && (
          <p className="py-8 text-center text-sm text-white/40">
            Add exercises to your sessions to see the tally.
          </p>
        )}

        {untrained.length > 0 && (
          <div className="mt-4 border-t border-white/10 pt-3">
            <p className="mb-1 text-xs uppercase tracking-wide text-white/40">
              Not trained ({untrained.length})
            </p>
            <p className="text-xs leading-relaxed text-white/40">
              {untrained.join(", ")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
