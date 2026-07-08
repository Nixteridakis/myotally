"use client";

import type { Exercise, Session } from "@/lib/types";

interface Props {
  session: Session;
  exercisesById: Record<string, Exercise>;
  active: boolean;
  onActivate: () => void;
  onRename: (name: string) => void;
  onRemove: () => void;
  onRemoveExerciseAt: (index: number) => void;
  onSetsChange: (index: number, sets: number) => void;
}

export default function SessionColumn({
  session,
  exercisesById,
  active,
  onActivate,
  onRename,
  onRemove,
  onRemoveExerciseAt,
  onSetsChange,
}: Props) {
  const totalSets = session.items.reduce((sum, it) => sum + it.sets, 0);

  return (
    <div
      onClick={onActivate}
      className={`flex w-72 shrink-0 cursor-pointer flex-col rounded-lg border transition ${
        active
          ? "border-saiyan-orange/70 bg-saiyan-orange/[0.06]"
          : "border-white/10 bg-white/[0.02] hover:border-white/20"
      }`}
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <input
          value={session.name}
          onChange={(e) => onRename(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
        />
        <span
          className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/60"
          title={`${session.items.length} exercise${session.items.length === 1 ? "" : "s"}`}
        >
          {session.items.length}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="text-white/30 transition hover:text-red-400"
          title="Delete session"
        >
          ✕
        </button>
      </div>

      {active && (
        <div className="border-b border-saiyan-orange/30 bg-saiyan-orange/10 px-3 py-1 text-[11px] uppercase tracking-wide text-saiyan-orange">
          Active — clicks add here
        </div>
      )}

      <div className="min-h-[3rem] flex-1 space-y-1 p-2">
        {session.items.map((item, index) => {
          const ex = exercisesById[item.exerciseId];
          return (
            <div
              key={`${item.exerciseId}-${index}`}
              className="group flex items-center gap-2 rounded bg-black/20 px-2 py-1.5"
            >
              <span className="flex-1 truncate text-sm">
                {ex?.name ?? "(unknown exercise)"}
              </span>
              <input
                type="number"
                min={1}
                max={50}
                value={item.sets}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onSetsChange(index, Number(e.target.value))}
                className="w-11 shrink-0 rounded border border-white/10 bg-black/30 px-1 py-0.5 text-center text-xs outline-none focus:border-saiyan-orange/60"
                title="Sets"
              />
              <span className="shrink-0 text-[10px] text-white/30">sets</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveExerciseAt(index);
                }}
                className="text-white/25 opacity-0 transition group-hover:opacity-100 hover:text-red-400"
                title="Remove"
              >
                ✕
              </button>
            </div>
          );
        })}
        {session.items.length === 0 && (
          <p className="py-4 text-center text-xs text-white/30">
            No exercises yet
          </p>
        )}
      </div>

      {session.items.length > 0 && (
        <div className="border-t border-white/10 px-3 py-1.5 text-[11px] text-white/40">
          {totalSets} total sets
        </div>
      )}
    </div>
  );
}
