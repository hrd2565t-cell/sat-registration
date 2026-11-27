"use client";

import { useSyncExternalStore } from "react";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  createDefaultFiscalYearWorkflow,
  createDefaultWorkflowPayload,
  normalizeFiscalYearBE,
  normalizeStepsOrder,
  normalizeWorkflowPayload,
  type WorkflowStorePayload,
} from "@/lib/workflow";

const STORAGE_KEY = "sat_operational_workflow_cache_v1";

interface WorkflowStoreState {
  payload: WorkflowStorePayload;
  revision: number;
}

const DEFAULT_PAYLOAD = createDefaultWorkflowPayload();
const SERVER_SNAPSHOT: WorkflowStoreState = {
  payload: DEFAULT_PAYLOAD,
  revision: 0,
};

let storeState: WorkflowStoreState = {
  payload: DEFAULT_PAYLOAD,
  revision: 0,
};

// ติดตามสถานะการโหลดจาก Cloud แยกเป็น Primitive นอก Snapshot หลักตามมาตรฐาน Store
let hasLoadedFromCloud = false;
let isSyncing = false;
let syncError: string | null = null;
let hydrateStarted = false;
let focusListenersAttached = false;
let lastFetchAt = 0;
let lastLocalEditAt = 0;

const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function clearLocalWorkflowCache() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore storage access issues
  }
}

function saveToLocalStorage(payload: WorkflowStorePayload) {
  if (typeof window === "undefined" || !isAdminAuthenticated()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota issues
  }
}

function loadFromLocalStorage(): WorkflowStorePayload | null {
  if (typeof window === "undefined" || !isAdminAuthenticated()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return normalizeWorkflowPayload(parsed);
  } catch {
    return null;
  }
}

export async function refreshWorkflowFromCloud(): Promise<void> {
  if (typeof window === "undefined") return;

  if (!isAdminAuthenticated()) {
    clearLocalWorkflowCache();
    hasLoadedFromCloud = false;
    hydrateStarted = false;
    syncError = null;
    if (storeState.revision > 0) {
      storeState = { payload: createDefaultWorkflowPayload(), revision: 0 };
      emitChange();
    }
    return;
  }

  const startedAt = Date.now();
  try {
    const res = await fetch("/api/admin/workflow", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });

    if (!res.ok) {
      hasLoadedFromCloud = true;
      emitChange();
      return;
    }

    const body = (await res.json()) as {
      ok?: boolean;
      data?: unknown;
    };

    if (lastLocalEditAt > startedAt) {
      hasLoadedFromCloud = true;
      emitChange();
      return;
    }

    if (body.ok && body.data) {
      const normalized = normalizeWorkflowPayload(body.data);
      saveToLocalStorage(normalized);
      hasLoadedFromCloud = true;
      lastFetchAt = Date.now();
      syncError = null;
      storeState = {
        payload: normalized,
        revision: storeState.revision + 1,
      };
      emitChange();
    } else {
      hasLoadedFromCloud = true;
      emitChange();
    }
  } catch (err) {
    console.warn("Failed to refresh operational workflow from cloud:", err);
    hasLoadedFromCloud = true;
    emitChange();
  }
}

function attachFocusListeners() {
  if (typeof window === "undefined" || focusListenersAttached) return;
  focusListenersAttached = true;

  const handleRefresh = () => {
    if (!isAdminAuthenticated()) return;
    if (Date.now() - lastFetchAt < 4000) return;
    void refreshWorkflowFromCloud();
  };

  window.addEventListener("focus", handleRefresh);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      handleRefresh();
    }
  });
}

function hydrate() {
  if (typeof window === "undefined") return;
  attachFocusListeners();
  if (hydrateStarted) return;
  hydrateStarted = true;

  if (!isAdminAuthenticated()) {
    clearLocalWorkflowCache();
    return;
  }

  const cached = loadFromLocalStorage();
  if (cached) {
    storeState = {
      payload: cached,
      revision: storeState.revision + 1,
    };
  }
  void refreshWorkflowFromCloud();
}

function subscribe(listener: () => void) {
  hydrate();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): WorkflowStoreState {
  return storeState;
}

function getServerSnapshot(): WorkflowStoreState {
  return SERVER_SNAPSHOT;
}

function getCloudLoadedSnapshot(): boolean {
  return hasLoadedFromCloud;
}

function getServerCloudLoadedSnapshot(): boolean {
  return false;
}

function getIsSyncingSnapshot(): boolean {
  return isSyncing;
}

function getServerIsSyncingSnapshot(): boolean {
  return false;
}

function getSyncErrorSnapshot(): string | null {
  return syncError;
}

function getServerSyncErrorSnapshot(): string | null {
  return null;
}

export function useWorkflowStore(): WorkflowStorePayload {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot).payload;
}

export function useWorkflowCloudLoaded(): boolean {
  return useSyncExternalStore(
    subscribe,
    getCloudLoadedSnapshot,
    getServerCloudLoadedSnapshot
  );
}

export function useWorkflowSyncState(): {
  isSaving: boolean;
  error: string | null;
} {
  const isSaving = useSyncExternalStore(
    subscribe,
    getIsSyncingSnapshot,
    getServerIsSyncingSnapshot
  );
  const error = useSyncExternalStore(
    subscribe,
    getSyncErrorSnapshot,
    getServerSyncErrorSnapshot
  );
  return { isSaving, error };
}

/**
 * บันทึกข้อมูลผังขั้นตอนการดำเนินงานลง Cloud (Encrypted Private Storage)
 */
export async function saveWorkflowPayloadToCloud(
  nextRaw: WorkflowStorePayload
): Promise<{ ok: boolean; error?: string }> {
  if (!isAdminAuthenticated()) {
    return { ok: false, error: "ต้องเข้าสู่ระบบผู้ดูแลระบบก่อนบันทึกข้อมูล" };
  }

  const prevSnapshot = storeState;
  const nowIso = new Date().toISOString();
  const nextNormalized: WorkflowStorePayload = {
    ...normalizeWorkflowPayload(nextRaw),
    updatedAt: nowIso,
  };

  lastLocalEditAt = Date.now();
  isSyncing = true;
  syncError = null;
  saveToLocalStorage(nextNormalized);
  storeState = {
    payload: nextNormalized,
    revision: storeState.revision + 1,
  };
  emitChange();

  try {
    const res = await fetch("/api/admin/workflow", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ data: nextNormalized }),
    });

    const body = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      data?: unknown;
      error?: string;
    };

    if (!res.ok || !body.ok) {
      const errMsg = body.error || "บันทึกข้อมูลขึ้นคลาวด์ไม่สำเร็จ";
      isSyncing = false;
      syncError = errMsg;
      saveToLocalStorage(prevSnapshot.payload);
      storeState = {
        payload: prevSnapshot.payload,
        revision: storeState.revision + 1,
      };
      emitChange();
      return { ok: false, error: errMsg };
    }

    const serverData = body.data
      ? normalizeWorkflowPayload(body.data)
      : nextNormalized;

    isSyncing = false;
    syncError = null;
    hasLoadedFromCloud = true;
    lastFetchAt = Date.now();
    saveToLocalStorage(serverData);
    storeState = {
      payload: serverData,
      revision: storeState.revision + 1,
    };
    emitChange();
    return { ok: true };
  } catch (err) {
    const errMsg =
      err instanceof Error ? err.message : "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้";
    isSyncing = false;
    syncError = errMsg;
    saveToLocalStorage(prevSnapshot.payload);
    storeState = {
      payload: prevSnapshot.payload,
      revision: storeState.revision + 1,
    };
    emitChange();
    return { ok: false, error: errMsg };
  }
}

export async function updateWorkflowPayload(
  updater: (current: WorkflowStorePayload) => WorkflowStorePayload
): Promise<{ ok: boolean; error?: string }> {
  const next = updater(storeState.payload);
  return saveWorkflowPayloadToCloud(next);
}

export async function switchWorkflowFiscalYear(
  fiscalYearBE: string
): Promise<{ ok: boolean; error?: string }> {
  const safeYear = normalizeFiscalYearBE(fiscalYearBE);
  return updateWorkflowPayload((current) => {
    const existing = current.years[safeYear];
    return {
      ...current,
      activeFiscalYearBE: safeYear,
      years: existing
        ? current.years
        : {
            ...current.years,
            [safeYear]: createDefaultFiscalYearWorkflow(safeYear),
          },
    };
  });
}

export async function createWorkflowFiscalYear(
  fiscalYearBE: string,
  copyFromYearBE?: string
): Promise<{ ok: boolean; error?: string }> {
  const safeYear = normalizeFiscalYearBE(fiscalYearBE);
  return updateWorkflowPayload((current) => {
    const nowIso = new Date().toISOString();
    const sourceYear =
      copyFromYearBE && current.years[copyFromYearBE]
        ? current.years[copyFromYearBE]
        : null;

    const newYearWorkflow = sourceYear
      ? {
          fiscalYearBE: safeYear,
          title: `แผนผังการดำเนินงานพัฒนาบุคลากรกีฬา ประจำปีงบประมาณ พ.ศ. ${safeYear}`,
          steps: normalizeStepsOrder(
            sourceYear.steps.map((s) => ({
              ...s,
              status: "pending" as const,
              dueDate: "",
              completedAt: "",
              notes: "",
              checklist: s.checklist.map((c) => ({ ...c, done: false })),
              updatedAt: nowIso,
            }))
          ),
          updatedAt: nowIso,
        }
      : createDefaultFiscalYearWorkflow(safeYear);

    return {
      ...current,
      activeFiscalYearBE: safeYear,
      years: {
        ...current.years,
        [safeYear]: newYearWorkflow,
      },
    };
  });
}

export async function resetWorkflowFiscalYearToDefault(
  fiscalYearBE: string
): Promise<{ ok: boolean; error?: string }> {
  const safeYear = normalizeFiscalYearBE(fiscalYearBE);
  return updateWorkflowPayload((current) => ({
    ...current,
    activeFiscalYearBE: safeYear,
    years: {
      ...current.years,
      [safeYear]: createDefaultFiscalYearWorkflow(safeYear),
    },
  }));
}
