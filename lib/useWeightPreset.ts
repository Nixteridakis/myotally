"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_WEIGHT_PRESET_ID, WEIGHT_PRESETS, getWeightPreset } from "./frequency";

const STORAGE_KEY = "myotally.weight-preset.v1";
const LEGACY_STORAGE_KEY = "goku-training.weight-preset.v1";

export function useWeightPreset() {
  const [presetId, setPresetIdState] = useState(DEFAULT_WEIGHT_PRESET_ID);

  useEffect(() => {
    try {
      const currentRaw = localStorage.getItem(STORAGE_KEY);
      if (currentRaw) {
        if (WEIGHT_PRESETS.some((p) => p.id === currentRaw)) {
          setPresetIdState(currentRaw);
        }
        return;
      }
      // Renamed from goku-training to myotally — fall back to the old key once.
      // Migrate immediately (write-then-delete) so a second invocation of this
      // effect (e.g. React Strict Mode's double-mount in dev) is a no-op instead
      // of finding both keys gone and silently keeping the default.
      const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyRaw && WEIGHT_PRESETS.some((p) => p.id === legacyRaw)) {
        setPresetIdState(legacyRaw);
        localStorage.setItem(STORAGE_KEY, legacyRaw);
      }
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      /* storage unavailable — keep default */
    }
  }, []);

  const setPresetId = useCallback((id: string) => {
    setPresetIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* storage unavailable — ignore */
    }
  }, []);

  return { presetId, preset: getWeightPreset(presetId), setPresetId };
}
