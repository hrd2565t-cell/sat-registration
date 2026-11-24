"use client";

import { useSyncExternalStore } from "react";
import type { AnnualOutcomeRecord } from "./annual-outcomes";
import { isSupabaseConfigured, getSupabaseClient } from "./supabase/client";

const STORAGE_KEY = "sat-annual-outcomes-v1";

interface AnnualOutcomesState {
  records: Record<number, AnnualOutcomeRecord>;
  revision: number;
}

function normalizeRecords(
  raw: unknown
): Record<number, AnnualOutcomeRecord> {
  if (!raw || typeof raw !== "object") return {};
  const result: Record<number, AnnualOutcomeRecord> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const yearBE = Number(k);
    if (!Number.isFinite(yearBE) || yearBE < 2540 || yearBE > 2600) continue;
    if (!v || typeof v !== "object") continue;
    const rec = v as Partial<AnnualOutcomeRecord>;
    const reaction =
      typeof rec.reactionSatisfactionPct === "number" &&
      Number.isFinite(rec.reactionSatisfactionPct)
        ? Math.min(100, Math.max(0, Math.round(rec.reactionSatisfactionPct * 10) / 10))
        : null;
    const learning =
      typeof rec.learningPassPct === "number" && Number.isFinite(rec.learningPassPct)
        ? Math.min(100, Math.max(0, Math.round(rec.learningPassPct * 10) / 10))
        : null;
    const achievements = Array.isArray(rec.keyAchievements)
      ? rec.keyAchievements
          .map((item) => String(item).trim())
          .filter(Boolean)
      : [];
    const executiveNote =
      typeof rec.executiveNote === "string" ? rec.executiveNote.trim() : undefined;

    if (
      reaction === null &&
      learning === null &&
      achievements.length === 0 &&
      !executiveNote
    ) {
      continue;
    }

    result[yearBE] = {
      yearBE,
      reactionSatisfactionPct: reaction,
      learningPassPct: learning,
      keyAchievements: achievements,
      ...(executiveNote ? { executiveNote } : {}),
      updatedAt:
        typeof rec.updatedAt === "string" && rec.updatedAt
          ? rec.updatedAt
          : new Date().toISOString(),
    };
  }
  return result;
}

const INITIAL_STATE: AnnualOutcomesState = {
  records: {},
  revision: 0,
};

let state: AnnualOutcomesState = INITIAL_STATE;
let hydrateStarted = false;
let hasLoadedFromCloud = false;
let realtimeSubscribed = false;
let lastFetchAt = 0;
let lastLocalEditAt = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function saveToLocalStorage(records: Record<number, AnnualOutcomeRecord>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Ignore storage quota issues
  }
}

async function syncAnnualOutcomesToSupabase(
  records: Record<number, AnnualOutcomeRecord>
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const { data: row, error: fetchError } = await supabase
      .from("courses")
      .select("id, target_quotas")
      .order("id")
      .limit(1)
      .maybeSingle();
    if (fetchError || !row) return false;

    const prevQuotas =
      row.target_quotas && typeof row.target_quotas === "object"
        ? (row.target_quotas as Record<string, unknown>)
        : {};
    const prevGlobal =
      prevQuotas._globalTimeline && typeof prevQuotas._globalTimeline === "object"
        ? (prevQuotas._globalTimeline as Record<string, unknown>)
        : {};

    const nextQuotas = {
      ...prevQuotas,
      _globalTimeline: {
        ...prevGlobal,
        annualOutcomes: records,
        updatedAt: new Date().toISOString(),
      },
    };

    const { error } = await supabase
      .from("courses")
      .update({
        target_quotas: nextQuotas as unknown as import("./supabase/types").Json,
      })
      .eq("id", row.id);

    return !error;
  } catch (err) {
    console.warn("Failed to sync annual outcomes to Supabase:", err);
    return false;
  }
}

export async function refreshAnnualOutcomesFromCloud(force = false): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const now = Date.now();
  if (!force && now - lastFetchAt < 1500) return;
  if (!force && now - lastLocalEditAt < 4000) return;
  lastFetchAt = now;

  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    const { data: row, error } = await supabase
      .from("courses")
      .select("id, target_quotas")
      .order("id")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("Failed to fetch annual outcomes from cloud:", error.message);
      return;
    }

    hasLoadedFromCloud = true;

    const rawQuotas =
      row?.target_quotas && typeof row.target_quotas === "object"
        ? (row.target_quotas as Record<string, unknown>)
        : null;
    const globalTimeline =
      rawQuotas?._globalTimeline && typeof rawQuotas._globalTimeline === "object"
        ? (rawQuotas._globalTimeline as Record<string, unknown>)
        : null;

    if (globalTimeline && "annualOutcomes" in globalTimeline) {
      if (Date.now() - lastLocalEditAt < 4000 && !force) return;
      const normalized = normalizeRecords(globalTimeline.annualOutcomes);
      state = {
        records: normalized,
        revision: state.revision + 1,
      };
      saveToLocalStorage(normalized);
      emit();
    }
  } catch (err) {
    console.warn("Failed to refresh annual outcomes from cloud:", err);
  }
}

function persistAndSync(nextRecords: Record<number, AnnualOutcomeRecord>) {
  lastLocalEditAt = Date.now();
  state = {
    records: nextRecords,
    revision: state.revision + 1,
  };
  saveToLocalStorage(nextRecords);
  emit();

  if (typeof window !== "undefined") {
    void syncAnnualOutcomesToSupabase(nextRecords);
  }
}

function hydrate() {
  if (hydrateStarted || typeof window === "undefined") return;
  hydrateStarted = true;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const normalized = normalizeRecords(parsed);
      state = {
        records: normalized,
        revision: state.revision + 1,
      };
      emit();
    }
  } catch {
    // Fallback to empty records
  }

  void refreshAnnualOutcomesFromCloud(true);

  if (!realtimeSubscribed && isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      realtimeSubscribed = true;
      supabase
        .channel("sat-annual-outcomes-realtime-channel")
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "courses" },
          () => {
            void refreshAnnualOutcomesFromCloud();
          }
        )
        .subscribe();
    }
  }

  window.addEventListener("focus", () => {
    void refreshAnnualOutcomesFromCloud();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void refreshAnnualOutcomesFromCloud();
    }
  });
}

function getServerSnapshot(): AnnualOutcomesState {
  return INITIAL_STATE;
}

export function useAnnualOutcomesStore() {
  hydrate();
  const snapshot = useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    () => state,
    getServerSnapshot
  );

  return {
    records: snapshot.records,
    hasLoadedFromCloud,
    saveAnnualOutcome,
    deleteAnnualOutcome,
    refreshAnnualOutcomesFromCloud,
  };
}

export function saveAnnualOutcome(
  input: Omit<AnnualOutcomeRecord, "updatedAt">
): AnnualOutcomeRecord | null {
  const yearBE = Number(input.yearBE);
  if (!Number.isFinite(yearBE) || yearBE < 2540 || yearBE > 2600) return null;

  const reaction =
    typeof input.reactionSatisfactionPct === "number" &&
    Number.isFinite(input.reactionSatisfactionPct)
      ? Math.min(100, Math.max(0, Math.round(input.reactionSatisfactionPct * 10) / 10))
      : null;
  const learning =
    typeof input.learningPassPct === "number" && Number.isFinite(input.learningPassPct)
      ? Math.min(100, Math.max(0, Math.round(input.learningPassPct * 10) / 10))
      : null;
  const achievements = Array.isArray(input.keyAchievements)
    ? input.keyAchievements.map((s) => s.trim()).filter(Boolean)
    : [];
  const executiveNote = input.executiveNote?.trim() || undefined;

  if (
    reaction === null &&
    learning === null &&
    achievements.length === 0 &&
    !executiveNote
  ) {
    deleteAnnualOutcome(yearBE);
    return null;
  }

  const record: AnnualOutcomeRecord = {
    yearBE,
    reactionSatisfactionPct: reaction,
    learningPassPct: learning,
    keyAchievements: achievements,
    ...(executiveNote ? { executiveNote } : {}),
    updatedAt: new Date().toISOString(),
  };

  persistAndSync({
    ...state.records,
    [yearBE]: record,
  });
  return record;
}

export function deleteAnnualOutcome(yearBE: number): void {
  const next = { ...state.records };
  delete next[yearBE];
  persistAndSync(next);
}
