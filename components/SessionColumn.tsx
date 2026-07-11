"use client";

import { useState } from "react";
import type { Exercise, Session } from "@/lib/types";

interface DragPayload {
  fromSessionId: string;
  fromIndex: number;
}

interface Props {
  session: Session;
  exercisesById: Record<string, Exercise>;
  active: boolean;
  onActivate: () => void;
  onRename: (name: string) => void;
  onRemove: () => void;
  onRemoveExerciseAt: (index: number) => void;
  onSetsChange: (index: number, sets: number) => void;
  /** Enable drag-and-drop of exercises between columns (desktop only). */
  dndEnabled?: boolean;
  onMove?: (
    fromSessionId: string,
    fromIndex: number,
    toSessionId: string,
    toIndex: number
  ) => void;
  /** Split available row width equally instead of a fixed width (desktop only). */
  equalWidth?: boolean;
}

const MIME = "application/x-myotally-exercise";

export default function SessionColumn({
  session,
  exercisesById,
  active,
  onActivate,
  onRename,
  onRemove,
  onRemoveExerciseAt,
  onSetsChange,
  dndEnabled = false,
  onMove,
  equalWidth = false,
}: Props) {
  const totalSets = session.items.reduce((sum, it) => sum + it.sets, 0);
  const [dragOver, setDragOver] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const readPayload = (e: React.DragEvent): DragPayload | null => {
    try {
      return JSON.parse(e.dataTransfer.getData(MIME)) as DragPayload;
    } catch {
      return null;
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    const payload: DragPayload = { fromSessionId: session.id, fromIndex: index };
    e.dataTransfer.setData(MIME, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "move";
    // Use the whole exercise row (the handle's parent) as the drag ghost, so the
    // item visibly follows the cursor instead of just the tiny handle glyph.
    const row = (e.currentTarget as HTMLElement).parentElement;
    if (row) e.dataTransfer.setDragImage(row, 12, 12);
    setDraggingIndex(index);
  };

  const handleDragEnd = () => setDraggingIndex(null);

  const dropTo = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const payload = readPayload(e);
    if (payload && onMove) {
      onMove(payload.fromSessionId, payload.fromIndex, session.id, toIndex);
    }
  };

  const allowDrop = (e: React.DragEvent) => {
    if (!dndEnabled) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  return (
    <div
      onClick={onActivate}
      className={`flex ${
        equalWidth ? "min-w-0 flex-1" : "w-72 shrink-0"
      } cursor-pointer flex-col rounded-lg border transition ${
        dragOver
          ? "border-saiyan-orange bg-saiyan-orange/10"
          : active
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

      {/* Dropping anywhere in this area appends to the end of the session. */}
      <div
        className="min-h-[3rem] flex-1 space-y-1 overflow-y-auto p-2"
        onDragOver={allowDrop}
        onDragEnter={dndEnabled ? () => setDragOver(true) : undefined}
        onDragLeave={
          dndEnabled
            ? (e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
              }
            : undefined
        }
        onDrop={dndEnabled ? (e) => dropTo(e, -1) : undefined}
      >
        {session.items.map((item, index) => {
          const ex = exercisesById[item.exerciseId];
          return (
            <div
              key={`${item.exerciseId}-${index}`}
              className={`group flex items-center gap-2 rounded bg-black/20 px-2 py-1.5 transition-opacity ${
                draggingIndex === index ? "opacity-40" : ""
              }`}
              onDragOver={dndEnabled ? allowDrop : undefined}
              onDrop={dndEnabled ? (e) => dropTo(e, index) : undefined}
            >
              {dndEnabled && (
                <span
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnd={handleDragEnd}
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 cursor-grab select-none text-white/25 transition hover:text-white/60 active:cursor-grabbing"
                  title="Drag to another session"
                >
                  ⠿
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-sm">
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
            {dragOver ? "Drop to add here" : "No exercises yet"}
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
