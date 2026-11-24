"use client";

import { useSyncExternalStore } from "react";
import defaultNationalAssociationsData from "@/data/national-associations.json";
import { isSupabaseConfigured, getSupabaseClient } from "@/lib/supabase/client";

export interface NationalAssociationMasterItem {
  id: string;
  orderNo: number;
  name: string;
  aliases?: string[];
}

export const DEFAULT_NATIONAL_ASSOCIATIONS: NationalAssociationMasterItem[] =
  defaultNationalAssociationsData as NationalAssociationMasterItem[];

const STORAGE_KEY = "sat-national-associations-master-v1";

interface AssociationsStoreState {
  associations: NationalAssociationMasterItem[];
  revision: number;
}

function normalizeMasterList(
  rawList: NationalAssociationMasterItem[]
): NationalAssociationMasterItem[] {
  return rawList
    .filter((item) => item && typeof item.name === "string" && item.name.trim().length > 0)
    .map((item, idx) => ({
      id: item.id || `nsa-custom-${idx + 1}`,
      orderNo: typeof item.orderNo === "number" && item.orderNo > 0 ? item.orderNo : idx + 1,
      name: item.name.replace(/\s+/g, " ").trim(),
      ...(Array.isArray(item.aliases) && item.aliases.length > 0
        ? {
            aliases: Array.from(
              new Set(
                item.aliases
                  .map((a) => String(a).replace(/\s+/g, " ").trim())
                  .filter(Boolean)
              )
            ),
          }
        : {}),
    }))
    .sort((a, b) => a.orderNo - b.orderNo);
}

const INITIAL_STATE: AssociationsStoreState = {
  associations: [...DEFAULT_NATIONAL_ASSOCIATIONS],
  revision: 0,
};

let state: AssociationsStoreState = INITIAL_STATE;
let hydrateStarted = false;
let hasLoadedFromCloud = false;
let realtimeSubscribed = false;
let lastFetchAt = 0;
let lastLocalEditAt = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function saveToLocalStorage(list: NationalAssociationMasterItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Ignore storage quota issues
  }
}

async function syncNationalAssociationsToSupabase(
  list: NationalAssociationMasterItem[]
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const { data: row } = await supabase
      .from("courses")
      .select("id, target_quotas")
      .order("id")
      .limit(1)
      .maybeSingle();
    if (!row) return false;

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
        nationalAssociationsMaster: list,
        updatedAt: new Date().toISOString(),
      },
    };

    const { error } = await supabase
      .from("courses")
      .update({
        target_quotas: nextQuotas as unknown as import("@/lib/supabase/types").Json,
      })
      .eq("id", row.id);

    return !error;
  } catch (err) {
    console.warn("Failed to sync national associations master to Supabase:", err);
    return false;
  }
}

export async function refreshNationalAssociationsFromCloud(force = false): Promise<void> {
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
      console.warn("Failed to fetch national associations master from cloud:", error.message);
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
    const cloudList = globalTimeline?.nationalAssociationsMaster;

    if (Array.isArray(cloudList) && cloudList.length > 0) {
      if (Date.now() - lastLocalEditAt < 4000 && !force) return;
      const normalized = normalizeMasterList(cloudList as NationalAssociationMasterItem[]);
      if (normalized.length > 0) {
        state = {
          associations: normalized,
          revision: state.revision + 1,
        };
        saveToLocalStorage(state.associations);
        emit();
      }
    }
  } catch (err) {
    console.warn("Failed to refresh national associations master from cloud:", err);
  }
}

function persistAndSync(nextList: NationalAssociationMasterItem[]) {
  const normalized = normalizeMasterList(nextList);
  lastLocalEditAt = Date.now();
  state = {
    associations: normalized,
    revision: state.revision + 1,
  };
  saveToLocalStorage(normalized);
  emit();

  if (typeof window !== "undefined") {
    void syncNationalAssociationsToSupabase(normalized);
  }
}

function hydrate() {
  if (hydrateStarted || typeof window === "undefined") return;
  hydrateStarted = true;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        state = {
          associations: normalizeMasterList(parsed),
          revision: state.revision + 1,
        };
        emit();
      }
    }
  } catch {
    // Fallback to seed defaults
  }

  void refreshNationalAssociationsFromCloud(true);

  if (!realtimeSubscribed && isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      realtimeSubscribed = true;
      supabase
        .channel("sat-national-associations-realtime-channel")
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "courses" },
          () => {
            void refreshNationalAssociationsFromCloud();
          }
        )
        .subscribe();
    }
  }

  window.addEventListener("focus", () => {
    void refreshNationalAssociationsFromCloud();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void refreshNationalAssociationsFromCloud();
    }
  });
}

function getServerSnapshot(): AssociationsStoreState {
  return INITIAL_STATE;
}

export function useNationalAssociationsStore() {
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
    associations: snapshot.associations,
    hasLoadedFromCloud,
    addNationalAssociation,
    updateNationalAssociation,
    deleteNationalAssociation,
    resetNationalAssociationsToDefault,
    refreshNationalAssociationsFromCloud,
  };
}

export function getNationalAssociationsSnapshot(): NationalAssociationMasterItem[] {
  return state.associations;
}

export function addNationalAssociation(
  name: string,
  aliases?: string[]
): NationalAssociationMasterItem {
  const cleanName = name.replace(/\s+/g, " ").trim();
  const maxOrder = state.associations.reduce((max, item) => Math.max(max, item.orderNo), 0);
  const nextOrder = maxOrder + 1;
  const newItem: NationalAssociationMasterItem = {
    id: `nsa-custom-${Date.now()}`,
    orderNo: nextOrder,
    name: cleanName,
    ...(aliases && aliases.length > 0
      ? { aliases: aliases.map((a) => a.replace(/\s+/g, " ").trim()).filter(Boolean) }
      : {}),
  };
  persistAndSync([...state.associations, newItem]);
  return newItem;
}

export function updateNationalAssociation(
  id: string,
  patch: { name?: string; aliases?: string[] }
): NationalAssociationMasterItem | undefined {
  let updatedItem: NationalAssociationMasterItem | undefined;
  const nextList = state.associations.map((item) => {
    if (item.id !== id) return item;
    const cleanAliases =
      patch.aliases !== undefined
        ? patch.aliases.map((a) => a.replace(/\s+/g, " ").trim()).filter(Boolean)
        : item.aliases;
    updatedItem = {
      ...item,
      name: patch.name !== undefined ? patch.name.replace(/\s+/g, " ").trim() : item.name,
      ...(cleanAliases && cleanAliases.length > 0 ? { aliases: cleanAliases } : { aliases: undefined }),
    };
    return updatedItem;
  });
  if (!updatedItem) return undefined;
  persistAndSync(nextList);
  return updatedItem;
}

export function deleteNationalAssociation(id: string): void {
  const remaining = state.associations
    .filter((item) => item.id !== id)
    .map((item, idx) => ({ ...item, orderNo: idx + 1 }));
  persistAndSync(remaining);
}

export function resetNationalAssociationsToDefault(): void {
  persistAndSync([...DEFAULT_NATIONAL_ASSOCIATIONS]);
}
