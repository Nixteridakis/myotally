"use client";

import { useMemo, useState } from "react";
import type { Exercise } from "@/lib/types";

interface Props {
  exercises: Exercise[];
  onAdd: (exerciseId: string) => void;
  disabled: boolean;
  /** true: fill a fixed-height parent and scroll internally. false: size naturally (mobile page scroll). */
  fill?: boolean;
}

const ALL = "All";

export default function ExerciseLibrary({
  exercises,
  onAdd,
  disabled,
  fill = true,
}: Props) {
  const [query, setQuery] = useState("");
  const [movement, setMovement] = useState(ALL);
  const [mechanics, setMechanics] = useState(ALL);

  const movements = useMemo(
    () => [ALL, ...unique(exercises.map((e) => e.movement))],
    [exercises]
  );
  const mechanicsList = useMemo(
    () => [ALL, ...unique(exercises.map((e) => e.mechanics))],
    [exercises]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises.filter((e) => {
      if (movement !== ALL && e.movement !== movement) return false;
      if (mechanics !== ALL && e.mechanics !== mechanics) return false;
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        e.primary.some((m) => m.toLowerCase().includes(q)) ||
        e.secondary.some((m) => m.toLowerCase().includes(q))
      );
    });
  }, [exercises, query, movement, mechanics]);

  return (
    <div className={`flex flex-col ${fill ? "h-full" : ""}`}>
      <div className="mb-3 space-y-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search exercises or muscles…"
          className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-saiyan-orange/60"
        />
        <div className="flex gap-2">
          <Select value={movement} onChange={setMovement} options={movements} />
          <Select value={mechanics} onChange={setMechanics} options={mechanicsList} />
        </div>
      </div>

      <div className="mb-2 text-xs uppercase tracking-wide text-white/40">
        {filtered.length} exercise{filtered.length === 1 ? "" : "s"}
      </div>

      <div
        className={`space-y-1.5 overflow-y-auto pr-1 ${
          fill ? "min-h-0 flex-1" : "max-h-[60vh]"
        }`}
      >
        {filtered.map((ex) => (
          <button
            key={ex.id}
            onClick={() => onAdd(ex.id)}
            disabled={disabled}
            className="group flex w-full items-center gap-3 rounded-md border border-white/5 bg-white/[0.02] px-3 py-2 text-left transition hover:border-saiyan-orange/50 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40"
            title={disabled ? "Select a session first" : "Add to active session"}
          >
            <span className="flex-1">
              <span className="block text-sm">{ex.name}</span>
              <span className="mt-0.5 block truncate text-xs text-white/45">
                {ex.primary.join(", ") || "—"}
                {ex.secondary.length ? ` · ${ex.secondary.join(", ")}` : ""}
              </span>
            </span>
            <span className="text-lg leading-none text-white/30 transition group-hover:text-saiyan-orange">
              +
            </span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="px-1 py-6 text-center text-sm text-white/40">
            No exercises match.
          </p>
        )}
      </div>
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex-1 rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-sm outline-none focus:border-saiyan-orange/60"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function unique(values: (string | null)[]): string[] {
  return [...new Set(values.filter((v): v is string => Boolean(v)))].sort();
}
