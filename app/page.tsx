"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Exercise, NotionData, Session } from "@/lib/types";
import {
  useSessions,
  serializeSessions,
  deserializeSessions,
} from "@/lib/useSessions";
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
    moveExercise,
    clearAll,
    replaceSessions,
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

  const isDesktop = useIsDesktop();
  const [pane, setPane] = useState<Pane>("sessions");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  }, []);

  const handleAdd = useCallback(
    (exerciseId: string) => {
      if (!activeId) return;
      addExercise(activeId, exerciseId);
      // On mobile the session isn't visible while adding, so confirm with a toast.
      if (!isDesktop) {
        const exName = exercisesById[exerciseId]?.name ?? "Exercise";
        const sName = sessions.find((s) => s.id === activeId)?.name ?? "session";
        showToast(`Added ${exName} → ${sName}`);
      }
    },
    [activeId, addExercise, isDesktop, exercisesById, sessions, showToast]
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = useCallback(() => {
    const text = serializeSessions(sessions);
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `myotally-sessions-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${sessions.length} session${sessions.length === 1 ? "" : "s"}`);
  }, [sessions, showToast]);

  const handleImportFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const next = deserializeSessions(String(reader.result));
          const hasData = sessions.some((s) => s.items.length > 0);
          if (
            hasData &&
            !window.confirm(
              `Replace your current sessions with ${next.length} imported session${
                next.length === 1 ? "" : "s"
              }?`
            )
          ) {
            return;
          }
          replaceSessions(next);
          showToast(`Imported ${next.length} session${next.length === 1 ? "" : "s"}`);
        } catch (err) {
          showToast(
            `Import failed: ${err instanceof Error ? err.message : "invalid file"}`
          );
        }
      };
      reader.onerror = () => showToast("Import failed: couldn't read file");
      reader.readAsText(file);
    },
    [sessions, replaceSessions, showToast]
  );

  const sectionCls = (fill: boolean) =>
    `rounded-lg border border-white/10 bg-white/[0.015] p-3 ${
      fill ? "h-full min-h-0" : ""
    }`;

  const librarySection = (fill: boolean) => (
    <section className={sectionCls(fill)}>
      {loading && !data ? (
        <Skeleton label="Loading exercises from Notion…" />
      ) : (
        <ExerciseLibrary
          exercises={data?.exercises ?? []}
          onAdd={handleAdd}
          disabled={!activeId}
          fill={fill}
        />
      )}
    </section>
  );

  const sessionsSection = (fill: boolean) => (
    <section className={`flex min-w-0 flex-col ${sectionCls(fill)}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Sessions</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExport}
            title="Download your sessions as a backup file"
            className="rounded-md border border-white/15 px-2.5 py-1 text-xs transition hover:border-saiyan-orange/60 hover:text-saiyan-orange"
          >
            Export
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Restore sessions from a backup file"
            className="rounded-md border border-white/15 px-2.5 py-1 text-xs transition hover:border-saiyan-orange/60 hover:text-saiyan-orange"
          >
            Import
          </button>
          <button
            onClick={addSession}
            className="rounded-md border border-white/15 px-2.5 py-1 text-xs transition hover:border-saiyan-orange/60 hover:text-saiyan-orange"
          >
            + Add session
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImportFile(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>
      <div
        className={`flex gap-3 overflow-x-auto pb-1 ${
          fill ? "min-h-0 flex-1" : "min-h-[16rem]"
        }`}
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
              dndEnabled={isDesktop}
              onMove={moveExercise}
            />
          ))}
      </div>
    </section>
  );

  const tallySection = (fill: boolean) => (
    <section className={sectionCls(fill)}>
      <MuscleTally
        sessions={sessions}
        exercisesById={exercisesById}
        allMuscles={data?.muscles ?? []}
        fill={fill}
      />
    </section>
  );

  if (error) {
    return (
      <main className="flex h-screen flex-col overflow-hidden">
        <Header data={data} loading={loading} onRefresh={() => load(true)} onClear={clearAll} />
        <ErrorPanel message={error} onRetry={() => load(true)} />
      </main>
    );
  }

  // Desktop: three-column grid (unchanged), locked to viewport height.
  if (isDesktop) {
    return (
      <main className="flex h-screen flex-col overflow-hidden">
        <Header data={data} loading={loading} onRefresh={() => load(true)} onClear={clearAll} />
        <div className="grid min-h-0 flex-1 grid-cols-[320px_1fr_320px] gap-4 p-4">
          {librarySection(true)}
          {sessionsSection(true)}
          {tallySection(true)}
        </div>
        <Toast message={toast} />
      </main>
    );
  }

  // Mobile: one full-height pane at a time, chosen via the tab bar.
  return (
    <main className="flex h-screen flex-col overflow-hidden">
      <Header data={data} loading={loading} onRefresh={() => load(true)} onClear={clearAll} />
      <MobileTabs pane={pane} onChange={setPane} />
      <div className="min-h-0 flex-1 p-3">
        {pane === "library" && (
          <div className="flex h-full flex-col gap-2">
            <SessionTargetBar
              sessions={sessions}
              activeId={activeId}
              onChange={setActiveId}
              onGoToSessions={() => setPane("sessions")}
            />
            <div className="min-h-0 flex-1">{librarySection(true)}</div>
          </div>
        )}
        {pane === "sessions" && sessionsSection(true)}
        {pane === "tally" && tallySection(true)}
      </div>
      <Toast message={toast} />
    </main>
  );
}

type Pane = "library" | "sessions" | "tally";

function MobileTabs({
  pane,
  onChange,
}: {
  pane: Pane;
  onChange: (p: Pane) => void;
}) {
  const tabs: { id: Pane; label: string }[] = [
    { id: "library", label: "Exercises" },
    { id: "sessions", label: "Sessions" },
    { id: "tally", label: "Tally" },
  ];
  return (
    <div className="flex gap-1 border-b border-white/10 px-3 py-2">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
            pane === t.id
              ? "bg-saiyan-orange/15 text-saiyan-orange"
              : "text-white/50 hover:text-white/80"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function SessionTargetBar({
  sessions,
  activeId,
  onChange,
  onGoToSessions,
}: {
  sessions: Session[];
  activeId: string | null;
  onChange: (id: string) => void;
  onGoToSessions: () => void;
}) {
  if (sessions.length === 0) {
    return (
      <button
        onClick={onGoToSessions}
        className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-left text-sm text-white/50"
      >
        No sessions yet — tap to add one on the Sessions tab.
      </button>
    );
  }
  const active = sessions.find((s) => s.id === activeId) ?? sessions[0];
  return (
    <div className="flex items-center gap-2 rounded-lg border border-saiyan-orange/30 bg-saiyan-orange/[0.06] px-3 py-2">
      <span className="shrink-0 text-xs uppercase tracking-wide text-white/50">
        Adding to
      </span>
      <select
        value={active.id}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 flex-1 rounded-md border border-white/15 bg-black/40 px-2 py-1.5 text-sm font-medium text-saiyan-orange outline-none"
      >
        {sessions.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ({s.items.length})
          </option>
        ))}
      </select>
    </div>
  );
}

function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div className="rounded-full bg-saiyan-orange px-4 py-2 text-sm font-medium text-black shadow-lg">
        {message}
      </div>
    </div>
  );
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isDesktop;
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
    <header className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5 sm:px-4 sm:py-3">
      <div className="flex min-w-0 items-baseline gap-2 sm:gap-3">
        <h1 className="shrink-0 text-base font-bold sm:text-lg">
          <span className="text-saiyan-orange">Myo</span>tally
        </h1>
        {data && (
          <span className="hidden truncate text-xs text-white/40 sm:inline">
            {data.exercises.length} exercises · {data.muscles.length} muscle
            groups · synced {timeAgo(data.fetchedAt)}
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={onClear}
          className="whitespace-nowrap rounded-md border border-white/15 px-2.5 py-1.5 text-xs transition hover:border-red-400/60 hover:text-red-400"
        >
          Reset<span className="hidden sm:inline"> sessions</span>
        </button>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="whitespace-nowrap rounded-md bg-saiyan-orange/90 px-2.5 py-1.5 text-xs font-medium text-black transition hover:bg-saiyan-orange disabled:opacity-50"
        >
          <span className="sm:hidden">{loading ? "…" : "Sync"}</span>
          <span className="hidden sm:inline">
            {loading ? "Syncing…" : "Refresh from Notion"}
          </span>
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
