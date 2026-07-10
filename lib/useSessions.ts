"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session } from "./types";

const STORAGE_KEY = "myotally.sessions.v1";
const LEGACY_STORAGE_KEY = "goku-training.sessions.v1";

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `s_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

function defaultSessions(): Session[] {
  return [1, 2, 3].map((n) => ({
    id: makeId(),
    name: `Session ${n}`,
    items: [],
  }));
}

const MAX_SETS = 50;

function clampSets(n: unknown): number {
  const num = Math.round(Number(n));
  if (!Number.isFinite(num) || num < 1) return 1;
  return Math.min(num, MAX_SETS);
}

/**
 * Normalizes a session loaded from localStorage, including the pre-sets format
 * where a duplicated exerciseId represented an extra set — those duplicates are
 * folded into a `sets` count so existing sessions survive the migration.
 */
function normalizeSession(raw: any): Session {
  const id = typeof raw?.id === "string" ? raw.id : makeId();
  const name = typeof raw?.name === "string" ? raw.name : "Session";

  if (Array.isArray(raw?.items)) {
    const items = raw.items
      .filter((it: any) => it && typeof it.exerciseId === "string")
      .map((it: any) => ({ exerciseId: it.exerciseId, sets: clampSets(it.sets) }));
    return { id, name, items };
  }

  if (Array.isArray(raw?.exerciseIds)) {
    const order: string[] = [];
    const counts = new Map<string, number>();
    for (const exId of raw.exerciseIds) {
      if (typeof exId !== "string") continue;
      if (!counts.has(exId)) {
        counts.set(exId, 0);
        order.push(exId);
      }
      counts.set(exId, counts.get(exId)! + 1);
    }
    const items = order.map((exerciseId) => ({
      exerciseId,
      sets: clampSets(counts.get(exerciseId)),
    }));
    return { id, name, items };
  }

  return { id, name, items: [] };
}

const EXPORT_VERSION = 1;

/** Serialize sessions to a versioned JSON string for download/backup. */
export function serializeSessions(sessions: Session[]): string {
  return JSON.stringify(
    {
      app: "myotally",
      type: "sessions",
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      sessions,
    },
    null,
    2
  );
}

/**
 * Parse a previously-exported file back into sessions. Accepts either the full
 * envelope produced by serializeSessions or a bare array of sessions, and
 * normalizes every entry so partial/older files still import cleanly.
 * Throws if the text isn't valid JSON or has no sessions array.
 */
export function deserializeSessions(text: string): Session[] {
  const data = JSON.parse(text);
  const raw = Array.isArray(data) ? data : data?.sessions;
  if (!Array.isArray(raw)) {
    throw new Error("no sessions found in file");
  }
  return raw.map(normalizeSession);
}

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage once on mount.
  useEffect(() => {
    let loaded: Session[] | null = null;
    try {
      const currentRaw = localStorage.getItem(STORAGE_KEY);
      if (currentRaw) {
        const parsed = JSON.parse(currentRaw);
        loaded = Array.isArray(parsed) ? parsed.map(normalizeSession) : null;
      } else {
        // Renamed from goku-training to myotally — fall back to the old key once.
        // Migrate immediately (write-then-delete) so a second invocation of this
        // effect (e.g. React Strict Mode's double-mount in dev) is a no-op instead
        // of finding both keys gone and resetting to defaults.
        const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacyRaw) {
          const parsed = JSON.parse(legacyRaw);
          loaded = Array.isArray(parsed) ? parsed.map(normalizeSession) : null;
          if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(loaded));
          localStorage.removeItem(LEGACY_STORAGE_KEY);
        }
      }
    } catch {
      loaded = null;
    }
    const initial = loaded && loaded.length ? loaded : defaultSessions();
    setSessions(initial);
    setActiveId(initial[0]?.id ?? null);
    setHydrated(true);
  }, []);

  // Persist on every change (after hydration).
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch {
      /* storage full / unavailable — ignore */
    }
  }, [sessions, hydrated]);

  const addSession = useCallback(() => {
    setSessions((prev) => {
      const next = [
        ...prev,
        { id: makeId(), name: `Session ${prev.length + 1}`, items: [] },
      ];
      setActiveId(next[next.length - 1].id);
      return next;
    });
  }, []);

  const removeSession = useCallback((id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      setActiveId((cur) => (cur === id ? next[0]?.id ?? null : cur));
      return next;
    });
  }, []);

  const renameSession = useCallback((id: string, name: string) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
  }, []);

  /** Adds an exercise to a session, or bumps its sets by one if already present. */
  const addExercise = useCallback((sessionId: string, exerciseId: string) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== sessionId) return s;
        const idx = s.items.findIndex((it) => it.exerciseId === exerciseId);
        if (idx === -1) {
          return { ...s, items: [...s.items, { exerciseId, sets: 1 }] };
        }
        const items = [...s.items];
        items[idx] = { ...items[idx], sets: clampSets(items[idx].sets + 1) };
        return { ...s, items };
      })
    );
  }, []);

  const removeExerciseAt = useCallback((sessionId: string, index: number) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? { ...s, items: s.items.filter((_, i) => i !== index) }
          : s
      )
    );
  }, []);

  const setExerciseSets = useCallback(
    (sessionId: string, index: number, sets: number) => {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionId || !s.items[index]) return s;
          const items = [...s.items];
          items[index] = { ...items[index], sets: clampSets(sets) };
          return { ...s, items };
        })
      );
    },
    []
  );

  /**
   * Move an exercise from one session to another (or reorder within one).
   * toIndex is the insertion index in the target; pass -1 to append.
   */
  const moveExercise = useCallback(
    (fromSessionId: string, fromIndex: number, toSessionId: string, toIndex: number) => {
      setSessions((prev) => {
        const fromSession = prev.find((s) => s.id === fromSessionId);
        const item = fromSession?.items[fromIndex];
        if (!item) return prev;

        if (fromSessionId === toSessionId) {
          return prev.map((s) => {
            if (s.id !== fromSessionId) return s;
            const items = [...s.items];
            items.splice(fromIndex, 1);
            let at = toIndex < 0 ? items.length : toIndex;
            if (toIndex > fromIndex) at = toIndex - 1; // account for removal shift
            at = Math.max(0, Math.min(at, items.length));
            items.splice(at, 0, item);
            return { ...s, items };
          });
        }

        return prev.map((s) => {
          if (s.id === fromSessionId) {
            return { ...s, items: s.items.filter((_, i) => i !== fromIndex) };
          }
          if (s.id === toSessionId) {
            const items = [...s.items];
            const at = toIndex < 0 ? items.length : Math.max(0, Math.min(toIndex, items.length));
            items.splice(at, 0, item);
            return { ...s, items };
          }
          return s;
        });
      });
    },
    []
  );

  const clearAll = useCallback(() => {
    const fresh = defaultSessions();
    setSessions(fresh);
    setActiveId(fresh[0]?.id ?? null);
  }, []);

  /** Replace all sessions (used by import). Falls back to defaults if empty. */
  const replaceSessions = useCallback((next: Session[]) => {
    const normalized = next.map(normalizeSession);
    const final = normalized.length ? normalized : defaultSessions();
    setSessions(final);
    setActiveId(final[0]?.id ?? null);
  }, []);

  return {
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
  };
}
