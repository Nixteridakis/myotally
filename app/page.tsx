"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Exercise, NotionData } from "@/lib/types";
import { useSessions } from "@/lib/useSessions";
import ExerciseLibrary from "@/components/ExerciseLibrary";
import SessionColumn from "@/components/SessionColumn";
import MuscleTally from "@/components/MuscleTally";

export default function Home() {
  const [data, setData] = useState<NotionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    sessions,
    activeId,
    hydrated,
    setActiveId,
    addSession,
    removeSession,
    renameSession,
    addExercise,
    removeExerciseAt,
    setExerciseSets,
    clearAll,
  } = useSessions();

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/notion${refresh ? "?refresh=1" : ""}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
      setData(json as NotionData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const exercisesById = useMemo(() => {
    const map: Record<string, Exercise> = {};
    for (const ex of data?.exercises ?? []) map[ex.id] = ex;
    return map;
  }, [data]);

  const handleAdd = useCallback(
    (exerciseId: string) => {
      if (!activeId) return;
      addExercise(activeId, exerciseId);
    },
    [activeId, addExercise]
  );

  return (
    <main className="flex h-screen flex-col overflow-hidden">
      <Header
        data={data}
        loading={loading}
        onRefresh={() => load(true)}
        onClear={clearAll}
      />

      {error ? (
        <ErrorPanel message={error} onRetry={() => load(true)} />
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-[320px_1fr_320px]">
          {/* Exercise library */}
          <section className="min-h-0 rounded-lg border border-white/10 bg-white/[0.015] p-3">
            {loading && !data ? (
              <Skeleton label="Loading exercises from Notion…" />
            ) : (
              <ExerciseLibrary
                exercises={data?.exercises ?? []}
                onAdd={handleAdd}
                disabled={!activeId}
              />
            )}
          </section>

          {/* Sessions */}
          <section className="flex min-h-0 min-w-0 flex-col rounded-lg border border-white/10 bg-white/[0.015] p-3">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Sessions</h2>
              <button
                onClick={addSession}
                className="rounded-md border border-white/15 px-2.5 py-1 text-xs transition hover:border-saiyan-orange/60 hover:text-saiyan-orange"
              >
                + Add session
              </button>
            </div>
            <div
              className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-1"
              onWheel={(e) => {
                if (e.deltaY === 0) return;
                e.currentTarget.scrollLeft += e.deltaY;
              }}
            >
              {hydrated &&
                sessions.map((s) => (
                  <SessionColumn
                    key={s.id}
                    session={s}
                    exercisesById={exercisesById}
                    active={s.id === activeId}
                    onActivate={() => setActiveId(s.id)}
                    onRename={(name) => renameSession(s.id, name)}
                    onRemove={() => removeSession(s.id)}
                    onRemoveExerciseAt={(i) => removeExerciseAt(s.id, i)}
                    onSetsChange={(i, sets) => setExerciseSets(s.id, i, sets)}
                  />
                ))}
            </div>
          </section>

          {/* Tally */}
          <section className="min-h-0 rounded-lg border border-white/10 bg-white/[0.015] p-3">
            <MuscleTally
              sessions={sessions}
              exercisesById={exercisesById}
              allMuscles={data?.muscles ?? []}
            />
          </section>
        </div>
      )}
    </main>
  );
}

function Header({
  data,
  loading,
  onRefresh,
  onClear,
}: {
  data: NotionData | null;
  loading: boolean;
  onRefresh: () => void;
  onClear: () => void;
}) {
  return (
    <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
      <div className="flex items-baseline gap-3">
        <h1 className="text-lg font-bold">
          <span className="text-saiyan-orange">Myo</span>tally
        </h1>
        {data && (
          <span className="text-xs text-white/40">
            {data.exercises.length} exercises · {data.muscles.length} muscle
            groups · synced {timeAgo(data.fetchedAt)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onClear}
          className="rounded-md border border-white/15 px-3 py-1.5 text-xs transition hover:border-red-400/60 hover:text-red-400"
        >
          Reset sessions
        </button>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="rounded-md bg-saiyan-orange/90 px-3 py-1.5 text-xs font-medium text-black transition hover:bg-saiyan-orange disabled:opacity-50"
        >
          {loading ? "Syncing…" : "Refresh from Notion"}
        </button>
      </div>
    </header>
  );
}

function ErrorPanel({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-lg rounded-lg border border-red-400/30 bg-red-400/5 p-6 text-center">
        <p className="mb-2 font-semibold text-red-300">Couldn’t load Notion data</p>
        <p className="mb-4 text-sm text-white/60">{message}</p>
        <p className="mb-4 text-xs text-white/40">
          Check that <code className="text-white/70">.env.local</code> has your
          token and database IDs, and that both databases are shared with your
          integration.
        </p>
        <button
          onClick={onRetry}
          className="rounded-md bg-saiyan-orange/90 px-4 py-2 text-sm font-medium text-black hover:bg-saiyan-orange"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

function Skeleton({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-white/40">
      {label}
    </div>
  );
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
