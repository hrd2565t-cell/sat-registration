"use client";

import { useSyncExternalStore } from "react";
import rawRealTrainees from "@/data/alumni.json";
import {
  parseThaiFullName,
  getCoreNameKey,
  evaluateNameMatch,
  standardizeAllTrainees,
  smartInferAffiliationGroup,
  type AffiliationMatchResult,
} from "./smart-name-engine";
import { isSupabaseConfigured, getSupabaseClient } from "./supabase/client";
import {
  fetchAlumniFromSupabase,
  syncTraineeToSupabase,
  syncTraineesBatchToSupabase,
  deleteTraineeFromSupabase,
  mapAlumniRowToTrainee,
} from "./supabase/sync";

export interface DutyRecord {
  id: string;
  traineeId: string;
  idCard: string;
  eventName: string;
  role: string;
  startDate: string;
  endDate: string;
  organization: string;
  location?: string;
  achievement?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  knowledgeApplied?: string; // ข้อคำถาม: ท่านได้นำเอาความรู้ที่ได้จากการอบรม ไปใช้ในการปฏิบัติหน้าที่อย่างไร
  knowledgeDimensions?: string[]; // มิติความรู้: planning, rules, science, psychology, management
  impactRating?: number; // ระดับประสิทธิผล (1..5 ดาว)
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
}

export interface KnowledgeDimension {
  key: string;
  label: string;
  icon: string;
}

export const KNOWLEDGE_DIMENSIONS: KnowledgeDimension[] = [
  { key: "planning", label: "การวางแผนและโปรแกรมการฝึกซ้อม (Periodization & Planning)", icon: "⚙️" },
  { key: "rules", label: "กฎ กติกามาตรฐานสากลและความยุติธรรม (Rules & Fair Play)", icon: "⚖️" },
  { key: "science", label: "วิทยาศาสตร์การกีฬา โภชนาการ และการป้องกันบาดเจ็บ (Sports Science)", icon: "🔬" },
  { key: "psychology", label: "จิตวิทยาการกีฬาและการสร้างแรงจูงใจ (Sport Psychology)", icon: "🧠" },
  { key: "management", label: "การบริหารจัดการองค์กรกีฬาและงบประมาณ (Sports Management)", icon: "📊" },
];

export interface HistoricalTrainee {
  id: string;
  personnelId?: string; // e.g. "USR-2026-0001"
  idCard: string; // 13 digits unique citizen id or personnelId fallback
  name: string;
  prefix?: string;
  firstName?: string;
  lastName?: string;
  gender?: "male" | "female";
  phone?: string;
  email?: string;
  affiliation: string; // Specific organization or association name
  affiliationGroup?: string; // 4 main groups: สมาคมกีฬาแห่งประเทศไทย, การกีฬาแห่งประเทศไทย, สมาคมกีฬาแห่งจังหวัด, หน่วยงานภายนอก
  sportsType: string; // Sports type or specific association
  yearBE: number; // 2547..2569
  courseId?: number;
  courseTitle: string; // Course abbreviation e.g. "ICSC", "ICSM", "TSLP", "Bnc", etc.
  courseCategory?: string; // "ผู้บริหารกีฬา" | "ผู้ฝึกสอนกีฬา" | "อื่นๆ"
  batch: string; // e.g. "รุ่นปี พ.ศ. 2566"
  certNo?: string; // Optional
  passedDate: string; // e.g. "2023-09-30"
  status: "active" | "inactive" | "pending_verification";
  isVerified?: boolean;
  verifiedAt?: string;
  avatarUrl?: string;
  duties: DutyRecord[];
  createdAt: string;
  updatedAt: string;
}

export const AFFILIATION_GROUPS = [
  "การกีฬาแห่งประเทศไทย",
  "กองทุนพัฒนาการกีฬาแห่งชาติ",
  "สมาคมกีฬาแห่งประเทศไทย",
  "สมาคมกีฬาแห่งจังหวัด",
  "หน่วยงานภายนอก",
] as const;

export function inferAffiliationGroup(orgName: string): (typeof AFFILIATION_GROUPS)[number] {
  return smartInferAffiliationGroup(orgName).group;
}

export interface AffiliationDiscrepancy {
  traineeId: string;
  personnelId?: string;
  name: string;
  affiliation: string;
  currentGroup: string;
  suggestedGroup: string;
  reason: string;
}

/**
 * Scan trainees and detect any mismatches between organization name and affiliation group
 */
export function detectAffiliationDiscrepancies(trainees: HistoricalTrainee[]): AffiliationDiscrepancy[] {
  const discrepancies: AffiliationDiscrepancy[] = [];
  for (const t of trainees) {
    const res = smartInferAffiliationGroup(t.affiliation);
    if (res.group !== t.affiliationGroup) {
      discrepancies.push({
        traineeId: t.id,
        personnelId: t.personnelId,
        name: t.name,
        affiliation: t.affiliation,
        currentGroup: t.affiliationGroup || "หน่วยงานภายนอก",
        suggestedGroup: res.group,
        reason: res.reason,
      });
    }
  }
  return discrepancies;
}

export const SPORTS_TYPES = [
  "การกีฬาแห่งประเทศไทย",
  "กองทุนพัฒนาการกีฬาแห่งชาติ",
  "สมาคมกีฬาแห่งประเทศไทย",
  "สมาคมกีฬาแห่งจังหวัด",
  "หน่วยงานภายนอก",
  "ฟุตบอล",
  "รักบี้ฟุตบอล",
  "วอลเลย์บอล",
  "กรีฑา",
  "ว่ายน้ำ",
  "เซปักตะกร้อ",
  "ยิงปืน",
  "มวยสากล",
  "เทควันโด",
  "แบดมินตัน",
  "บาสเกตบอล",
  "กีฬาอื่นๆ",
] as const;

export const PAST_YEARS_BE = [
  2569, 2568, 2567, 2566, 2565, 2564, 2563, 2562, 2561, 2560,
  2559, 2558, 2557, 2556, 2555, 2554, 2553, 2552, 2551, 2550,
  2549, 2548, 2547,
] as const;

export const STANDARD_COURSES = [
  "Bnc",
  "ICSC",
  "ICSM",
  "HCDP-ICSM",
  "TSLP",
  "GGE",
  "SSCC",
  "HCDP-ICSC",
  "PSCE",
  "Olympic",
  "PSAAD-ISPEP",
  "PSAAD",
  "Lv.1",
  "TSL-ISPEP",
  "Switzerland",
  "National classifier",
  "การพัฒนาบุคลากรกีฬาสู่นักบริหารจัดการองค์กรกีฬาเพื่อความยั่งยืน",
] as const;

// 2,811 authentic historical training records (1,943 unique personnel) from official SAT Excel files
export const SEED_TRAINEES: HistoricalTrainee[] = rawRealTrainees as HistoricalTrainee[];

const STORAGE_KEY = "sat-alumni-real-v6";
const LEGACY_STORAGE_KEYS = ["sat-alumni-real-v5", "sat-alumni-real-v4", "sat-alumni-real-v3"];

export type CloudSyncStatus = "idle" | "connected" | "disconnected" | "syncing" | "error";

interface AlumniState {
  trainees: HistoricalTrainee[];
  revision: number;
}

const INITIAL_STATE: AlumniState = {
  trainees: [...SEED_TRAINEES],
  revision: 0,
};

let state: AlumniState = INITIAL_STATE;
let hydrateStarted = false;
let realtimeSubscribed = false;
let cloudSyncStatus: CloudSyncStatus = "idle";
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function onStoreChange(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function getCloudSyncStatus(): CloudSyncStatus {
  if (!isSupabaseConfigured()) return "disconnected";
  return cloudSyncStatus;
}

export function isCloudConfigured(): boolean {
  return isSupabaseConfigured();
}

function saveToLocalStorage(trainees: HistoricalTrainee[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trainees));
  } catch {
    // Local storage full or unavailable
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    saveToLocalStorage(state.trainees);
    fetch("/api/admin/save-defaults", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alumni: state.trainees }),
    }).catch(() => {
      // background sync
    });
  } catch {
    // Local storage full or unavailable
  }
}

function initRealtimeSubscription() {
  if (realtimeSubscribed || typeof window === "undefined" || !isSupabaseConfigured()) return;
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    realtimeSubscribed = true;
    supabase
      .channel("sat-alumni-realtime-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alumni" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as import("./supabase/types").Database["public"]["Tables"]["alumni"]["Row"];
            if (!row || !row.id) return;
            const newTrainee = mapAlumniRowToTrainee(row);
            const exists = state.trainees.some((t) => t.id === newTrainee.id);
            if (!exists) {
              state = {
                trainees: [newTrainee, ...state.trainees],
                revision: state.revision + 1,
              };
              saveToLocalStorage(state.trainees);
              emit();
            }
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as import("./supabase/types").Database["public"]["Tables"]["alumni"]["Row"];
            if (!row || !row.id) return;
            const updated = mapAlumniRowToTrainee(row);
            state = {
              trainees: state.trainees.map((t) => (t.id === updated.id ? updated : t)),
              revision: state.revision + 1,
            };
            saveToLocalStorage(state.trainees);
            emit();
          } else if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as { id?: string })?.id;
            if (deletedId) {
              state = {
                trainees: state.trainees.filter((t) => t.id !== deletedId),
                revision: state.revision + 1,
              };
              saveToLocalStorage(state.trainees);
              emit();
            }
          }
        }
      )
      .subscribe();
  } catch (err) {
    console.warn("Failed to subscribe to alumni realtime changes:", err);
  }
}

function hydrate() {
  if (hydrateStarted || typeof window === "undefined") return;
  hydrateStarted = true;

  try {
    // 1. Check local storage first for instant 0ms rendering
    let raw = window.localStorage.getItem(STORAGE_KEY);
    let fromLegacy = false;

    if (!raw) {
      for (const legacyKey of LEGACY_STORAGE_KEYS) {
        const val = window.localStorage.getItem(legacyKey);
        if (val) {
          raw = val;
          fromLegacy = true;
          try {
            window.localStorage.removeItem(legacyKey);
          } catch {
            // ignore
          }
          break;
        }
      }
    }

    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length >= SEED_TRAINEES.length) {
        // Strip any residual sample demo duties from previous prototype testing
        const sanitizedList = parsed.map((t) => ({
          ...t,
          duties: (t.duties || []).filter((d: { id?: string }) => !d.id?.startsWith("duty-real-")),
        }));
        const result = standardizeAllTrainees(sanitizedList, { reclassifyGroups: true });
        state = {
          trainees: result.cleaned,
          revision: state.revision + 1,
        };

        if (fromLegacy || result.changedCount > 0) {
          persist();
        }
        emit();
      } else if (Array.isArray(parsed) && parsed.length < SEED_TRAINEES.length) {
        // Auto-upgrade stale cache with fewer records to full 2,811 official dataset
        state = {
          trainees: SEED_TRAINEES,
          revision: state.revision + 1,
        };
        persist();
        emit();
      }
    }
  } catch {
    // fallback to seed
  }

  // 2. Real-time Cloud Synchronization with Supabase
  if (isSupabaseConfigured()) {
    cloudSyncStatus = "syncing";
    initRealtimeSubscription();

    fetchAlumniFromSupabase()
      .then((cloudTrainees) => {
        if (cloudTrainees && cloudTrainees.length > 0) {
          // Cloud database is the single source of truth across all devices!
          state = {
            trainees: cloudTrainees,
            revision: state.revision + 1,
          };
          cloudSyncStatus = "connected";
          saveToLocalStorage(state.trainees);
          emit();
        } else if (cloudTrainees && cloudTrainees.length === 0 && state.trainees.length > 0) {
          // Table exists on Supabase but empty - bootstrap initial records to cloud
          cloudSyncStatus = "connected";
          syncTraineesBatchToSupabase(state.trainees).catch(() => {});
        } else {
          cloudSyncStatus = "connected";
        }
      })
      .catch((err) => {
        console.warn("Supabase alumni initial sync error:", err);
        cloudSyncStatus = "error";
      });
  } else {
    cloudSyncStatus = "disconnected";
  }
}

function getSnapshot() {
  return state;
}

function getServerSnapshot() {
  return INITIAL_STATE;
}

/**
 * Triggers a manual full sync of all alumni records to Supabase Cloud
 */
export async function syncAllAlumniToCloud(
  onProgress?: (synced: number, total: number) => void
): Promise<{ success: boolean; count: number; error?: string }> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      count: 0,
      error: "ยังไม่ได้ตั้งค่าการเชื่อมต่อ Supabase ใน .env หรือเซิร์ฟเวอร์",
    };
  }

  cloudSyncStatus = "syncing";
  emit();

  try {
    const res = await syncTraineesBatchToSupabase(state.trainees, onProgress);
    if (res.success) {
      cloudSyncStatus = "connected";
    } else {
      cloudSyncStatus = "error";
    }
    emit();
    return res;
  } catch (err) {
    cloudSyncStatus = "error";
    emit();
    return {
      success: false,
      count: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Manually forces a refresh from Supabase Cloud
 */
export async function refreshAlumniFromCloud(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  cloudSyncStatus = "syncing";
  emit();

  try {
    const cloudTrainees = await fetchAlumniFromSupabase();
    if (cloudTrainees && cloudTrainees.length > 0) {
      state = {
        trainees: cloudTrainees,
        revision: state.revision + 1,
      };
      cloudSyncStatus = "connected";
      saveToLocalStorage(cloudTrainees);
      emit();
      return cloudTrainees.length;
    }
    cloudSyncStatus = "connected";
    emit();
    return 0;
  } catch {
    cloudSyncStatus = "error";
    emit();
    return 0;
  }
}

export function useAlumniStore() {
  hydrate();
  const snapshot = useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    getSnapshot,
    getServerSnapshot
  );

  return {
    trainees: snapshot.trainees,
    cloudStatus: getCloudSyncStatus(),
    isCloudConfigured: isSupabaseConfigured(),
    syncAllAlumniToCloud,
    refreshAlumniFromCloud,
    addTrainee,
    updateTrainee,
    deleteTrainee,
    importTrainees,
    updateCourseCategory,
    updatePersonAffiliation,
    updatePersonProfile,
    addDutyRecord,
    verifyDutyRecord,
    deleteDutyRecord,
    runDataCleansing,
    resetAlumniData,
  };
}

export function addTrainee(input: Omit<HistoricalTrainee, "id" | "createdAt" | "updatedAt" | "duties">): HistoricalTrainee {
  const now = new Date().toISOString();
  const finalPersonnelId = input.personnelId || getNextPersonnelId(state.trainees);
  const newTrainee: HistoricalTrainee = {
    ...input,
    personnelId: finalPersonnelId,
    idCard: input.idCard || finalPersonnelId,
    id: `trn-custom-${Date.now()}`,
    duties: [],
    createdAt: now,
    updatedAt: now,
  };

  state = {
    trainees: [newTrainee, ...state.trainees],
    revision: state.revision + 1,
  };
  persist();
  if (isSupabaseConfigured()) {
    syncTraineeToSupabase(newTrainee).catch(() => {});
  }
  emit();
  return newTrainee;
}

export function updateTrainee(id: string, patch: Partial<HistoricalTrainee>): HistoricalTrainee | undefined {
  const now = new Date().toISOString();
  let updated: HistoricalTrainee | undefined;

  const nextList = state.trainees.map((t) => {
    if (t.id !== id) return t;
    updated = {
      ...t,
      ...patch,
      updatedAt: now,
    };
    return updated;
  });

  if (!updated) return undefined;

  state = {
    trainees: nextList,
    revision: state.revision + 1,
  };
  persist();
  if (isSupabaseConfigured() && updated) {
    syncTraineeToSupabase(updated).catch(() => {});
  }
  emit();
  return updated;
}

export function deleteTrainee(id: string): boolean {
  const exists = state.trainees.some((t) => t.id === id);
  if (!exists) return false;

  state = {
    trainees: state.trainees.filter((t) => t.id !== id),
    revision: state.revision + 1,
  };
  persist();
  if (isSupabaseConfigured()) {
    deleteTraineeFromSupabase(id).catch(() => {});
  }
  emit();
  return true;
}

export function importTrainees(incoming: Omit<HistoricalTrainee, "id" | "createdAt" | "updatedAt" | "duties">[]): number {
  const now = new Date().toISOString();
  const newItems: HistoricalTrainee[] = incoming.map((item, idx) => ({
    ...item,
    id: `trn-imp-${Date.now()}-${idx}`,
    duties: [],
    createdAt: now,
    updatedAt: now,
  }));

  state = {
    trainees: [...newItems, ...state.trainees],
    revision: state.revision + 1,
  };
  persist();
  if (isSupabaseConfigured() && newItems.length > 0) {
    syncTraineesBatchToSupabase(newItems).catch(() => {});
  }
  emit();
  return newItems.length;
}

export function updateCourseCategory(courseTitle: string, newCategory: string): number {
  const cleanCat = newCategory.trim();
  if (!cleanCat) return 0;
  const now = new Date().toISOString();
  let updatedCount = 0;

  const nextList = state.trainees.map((t) => {
    if (t.courseTitle === courseTitle) {
      updatedCount++;
      return {
        ...t,
        courseCategory: cleanCat,
        updatedAt: now,
      };
    }
    return t;
  });

  if (updatedCount > 0) {
    state = {
      trainees: nextList,
      revision: state.revision + 1,
    };
    persist();
    if (isSupabaseConfigured()) {
      const affected = nextList.filter((t) => t.courseTitle === courseTitle);
      syncTraineesBatchToSupabase(affected).catch(() => {});
    }
    emit();
  }

  return updatedCount;
}

export interface UpdatePersonProfileInput {
  prefix?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  affiliationGroup?: string;
  affiliation?: string;
  personnelId?: string;
  idCard?: string;
  phone?: string;
  email?: string;
  isVerified?: boolean;
  status?: "active" | "inactive" | "pending_verification";
}

/**
 * Updates full person profile (prefix, name, affiliation, group, ID, status)
 * across all their historical courses matching by personnelId, idCard, direct ID, or normalized name.
 */
export function updatePersonProfile(
  identifier: string,
  updates: UpdatePersonProfileInput
): number {
  const cleanId = (identifier || "").trim();
  if (!cleanId) return 0;

  const now = new Date().toISOString();
  let updatedCount = 0;

  // Find target trainee first to know all their matching identifiers
  const target = state.trainees.find(
    (t) =>
      (t.personnelId && t.personnelId.toLowerCase() === cleanId.toLowerCase()) ||
      t.id === cleanId ||
      t.idCard === cleanId ||
      normalizeNameForMatching(t.name) === normalizeNameForMatching(cleanId)
  );

  const targetPId = target?.personnelId?.toLowerCase();
  const targetIdCard = target?.idCard?.replace(/\D/g, "");
  const targetNormName = target ? normalizeNameForMatching(target.name) : normalizeNameForMatching(cleanId);

  // Compute final name if prefix or name updated
  let finalName = updates.name !== undefined ? updates.name.trim() : undefined;
  if (!finalName && (updates.firstName || updates.lastName)) {
    const fn = (updates.firstName || "").trim();
    const ln = (updates.lastName || "").trim();
    const pref = (updates.prefix !== undefined ? updates.prefix : target?.prefix || "").trim();
    finalName = `${pref ? pref + " " : ""}${fn} ${ln}`.trim();
  } else if (finalName && updates.prefix) {
    const pref = updates.prefix.trim();
    if (!finalName.startsWith(pref)) {
      finalName = `${pref} ${finalName}`.trim();
    }
  }

  const nextList = state.trainees.map((t) => {
    const isPIdMatch = targetPId && t.personnelId && t.personnelId.toLowerCase() === targetPId;
    const isIdCardMatch = targetIdCard && targetIdCard.length === 13 && t.idCard && t.idCard.replace(/\D/g, "") === targetIdCard;
    const isDirectMatch = t.id === cleanId || t.idCard === cleanId;
    const isNameMatch = targetNormName && normalizeNameForMatching(t.name) === targetNormName;

    if (isPIdMatch || isIdCardMatch || isDirectMatch || isNameMatch) {
      updatedCount++;
      return {
        ...t,
        name: finalName || t.name,
        prefix: updates.prefix !== undefined ? updates.prefix.trim() : t.prefix,
        firstName: updates.firstName !== undefined ? updates.firstName.trim() : t.firstName,
        lastName: updates.lastName !== undefined ? updates.lastName.trim() : t.lastName,
        affiliationGroup: updates.affiliationGroup !== undefined && updates.affiliationGroup.trim() ? updates.affiliationGroup.trim() : t.affiliationGroup,
        affiliation: updates.affiliation !== undefined && updates.affiliation.trim() ? updates.affiliation.trim() : t.affiliation,
        sportsType: updates.affiliation !== undefined && updates.affiliation.trim() ? updates.affiliation.trim() : t.sportsType,
        personnelId: updates.personnelId !== undefined && updates.personnelId.trim() ? updates.personnelId.trim() : t.personnelId,
        idCard: updates.idCard !== undefined && updates.idCard.trim() ? updates.idCard.trim() : t.idCard,
        phone: updates.phone !== undefined ? updates.phone.trim() : t.phone,
        email: updates.email !== undefined ? updates.email.trim() : t.email,
        isVerified:
          updates.isVerified !== undefined
            ? updates.isVerified
            : updates.idCard && updates.idCard.replace(/\D/g, "").length === 13
            ? true
            : t.isVerified,
        status: updates.status || t.status,
        updatedAt: now,
      };
    }
    return t;
  });

  if (updatedCount > 0) {
    state = {
      trainees: nextList,
      revision: state.revision + 1,
    };
    persist();
    if (isSupabaseConfigured()) {
      const affected = nextList.filter((t) => {
        const isPIdMatch = targetPId && t.personnelId && t.personnelId.toLowerCase() === targetPId;
        const isIdCardMatch = targetIdCard && targetIdCard.length === 13 && t.idCard && t.idCard.replace(/\D/g, "") === targetIdCard;
        const isDirectMatch = t.id === cleanId || t.idCard === cleanId;
        const isNameMatch = targetNormName && normalizeNameForMatching(t.name) === targetNormName;
        return isPIdMatch || isIdCardMatch || isDirectMatch || isNameMatch;
      });
      syncTraineesBatchToSupabase(affected).catch(() => {});
    }
    emit();
  }

  return updatedCount;
}

export interface BatchIdCardMatch {
  name: string;
  idCard: string;
  phone?: string;
  email?: string;
}

/**
 * Batch update citizen IDs (from Excel Smart Matcher)
 * Matches each person by name or personnelId and updates their 13-digit ID across all records.
 */
export function batchUpdateTraineeIdCards(matches: BatchIdCardMatch[]): {
  matchedCount: number;
  updatedRecordsCount: number;
} {
  let matchedCount = 0;
  let totalRecordsUpdated = 0;

  for (const m of matches) {
    const cleanId = (m.idCard || "").replace(/\D/g, "");
    if (!cleanId || cleanId.length !== 13) continue;

    const count = updatePersonProfile(m.name, {
      idCard: cleanId,
      phone: m.phone,
      email: m.email,
      isVerified: true,
      status: "active",
    });

    if (count > 0) {
      matchedCount++;
      totalRecordsUpdated += count;
    }
  }

  return { matchedCount, updatedRecordsCount: totalRecordsUpdated };
}

/**
 * Updates affiliationGroup (and optionally affiliation name) for a person across all their historical courses.
 * Matches by personnelId, idCard, direct ID, or normalized name.
 */
export function updatePersonAffiliation(
  identifier: string,
  newGroup: string,
  newAffiliationName?: string
): number {
  return updatePersonProfile(identifier, {
    affiliationGroup: newGroup,
    affiliation: newAffiliationName,
  });
}

export function addDutyRecord(
  traineeId: string,
  input: Omit<DutyRecord, "id" | "traineeId" | "createdAt" | "verified"> & { verified?: boolean }
): DutyRecord | undefined {
  const now = new Date().toISOString();
  const target = state.trainees.find((t) => t.id === traineeId || t.idCard === input.idCard);
  if (!target) return undefined;

  const newDuty: DutyRecord = {
    ...input,
    id: `duty-${Date.now()}`,
    traineeId: target.id,
    verified: input.verified ?? false,
    createdAt: now,
  };

  const nextList = state.trainees.map((t) => {
    // Update all entries matching this person so cross-course history syncs
    const isSamePerson =
      (target.personnelId && t.personnelId === target.personnelId) ||
      (t.idCard && t.idCard === target.idCard) ||
      t.id === target.id;

    if (isSamePerson) {
      const nextDuties = [newDuty, ...t.duties];
      return {
        ...t,
        status: "active" as const,
        duties: nextDuties,
        updatedAt: now,
      };
    }
    return t;
  });

  state = {
    trainees: nextList,
    revision: state.revision + 1,
  };
  persist();
  if (isSupabaseConfigured()) {
    const affected = nextList.filter((t) =>
      (target.personnelId && t.personnelId === target.personnelId) ||
      (t.idCard && t.idCard === target.idCard) ||
      t.id === target.id
    );
    syncTraineesBatchToSupabase(affected).catch(() => {});
  }
  emit();
  return newDuty;
}

export function verifyDutyRecord(
  dutyId: string,
  verifierName = "กองพัฒนาบุคลากรกีฬา"
): boolean {
  const now = new Date().toISOString();
  let found = false;

  const nextList = state.trainees.map((t) => {
    const hasDuty = t.duties.some((d) => d.id === dutyId);
    if (!hasDuty) return t;
    found = true;
    return {
      ...t,
      status: "active" as const,
      duties: t.duties.map((d) =>
        d.id === dutyId
          ? {
              ...d,
              verified: true,
              verifiedBy: verifierName,
              verifiedAt: now,
            }
          : d
      ),
      updatedAt: now,
    };
  });

  if (!found) return false;

  state = {
    trainees: nextList,
    revision: state.revision + 1,
  };
  persist();
  if (isSupabaseConfigured()) {
    const affected = nextList.filter((t) => t.duties.some((d) => d.id === dutyId));
    syncTraineesBatchToSupabase(affected).catch(() => {});
  }
  emit();
  return true;
}

export function deleteDutyRecord(dutyId: string): boolean {
  let found = false;
  const now = new Date().toISOString();

  const nextList = state.trainees.map((t) => {
    const hasDuty = t.duties.some((d) => d.id === dutyId);
    if (!hasDuty) return t;
    found = true;
    const remainingDuties = t.duties.filter((d) => d.id !== dutyId);
    return {
      ...t,
      status: remainingDuties.length > 0 ? ("active" as const) : ("inactive" as const),
      duties: remainingDuties,
      updatedAt: now,
    };
  });

  if (!found) return false;

  state = {
    trainees: nextList,
    revision: state.revision + 1,
  };
  persist();
  if (isSupabaseConfigured()) {
    const affected = nextList.filter((t) =>
      state.trainees.some((oldT) => oldT.id === t.id && oldT.duties.some((d) => d.id === dutyId))
    );
    if (affected.length > 0) {
      syncTraineesBatchToSupabase(affected).catch(() => {});
    }
  }
  emit();
  return true;
}

export function runDataCleansing(options?: { reclassifyGroups?: boolean }): {
  total: number;
  changedCount: number;
  fixedNameCount: number;
  fixedGroupCount: number;
} {
  const result = standardizeAllTrainees(state.trainees, options);
  if (result.changedCount > 0) {
    state = {
      trainees: result.cleaned,
      revision: state.revision + 1,
    };
    persist();
    if (isSupabaseConfigured()) {
      syncTraineesBatchToSupabase(result.cleaned).catch(() => {});
    }
    emit();
  }
  return {
    total: state.trainees.length,
    changedCount: result.changedCount,
    fixedNameCount: result.fixedNameCount,
    fixedGroupCount: result.fixedGroupCount,
  };
}

export function resetAlumniData() {
  state = {
    trainees: [...SEED_TRAINEES],
    revision: state.revision + 1,
  };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      for (const legacyKey of LEGACY_STORAGE_KEYS) {
        window.localStorage.removeItem(legacyKey);
      }
    } catch {
      // ignore
    }
  }
  persist();
  if (isSupabaseConfigured()) {
    syncTraineesBatchToSupabase(state.trainees).catch(() => {});
  }
  emit();
}

export function normalizeThaiName(name: string): string {
  if (!name) return "";
  return name
    .replace(/^(นาย|นางสาว|นาง|ดร\.|อาจารย์|โค้ช|ว่าที่\s*ร\.ต\.|ร\.ต\.อ\.|พ\.จ\.ต\.|ส\.อ\.|พ\.ต\.ท\.|พ\.ต\.อ\.|นาวาเอก|นาวาโท|นาวาตรี|เรือเอก|พันเอก|ร้อยเอก)\s*/i, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

export interface TraineeSearchResult {
  uniqueKey: string;
  name: string;
  personnelId?: string;
  sportsType: string;
  affiliation: string;
  affiliationGroup?: string;
  records: HistoricalTrainee[];
  latestYearBE: number;
  idCard: string;
  activeDutyCount: number;
}

/**
 * Flexible search by Name, Citizen ID, or Personnel ID.
 * Groups multiple courses by person and handles legacy records.
 */
export function searchTrainees(query: string, trainees: HistoricalTrainee[]): TraineeSearchResult[] {
  const q = query.trim();
  if (!q) return [];

  const digits = q.replace(/\D/g, "");
  const normQuery = normalizeThaiName(q);

  // Group trainees by unique person (personnelId > idCard if 13 digits > normalized name)
  const personMap = new Map<string, HistoricalTrainee[]>();

  for (const t of trainees) {
    const cleanId = t.idCard ? t.idCard.replace(/\D/g, "") : "";
    const personKey = t.personnelId
      ? t.personnelId
      : cleanId.length === 13
      ? cleanId
      : `name_${normalizeThaiName(t.name)}_${t.affiliation}`;

    if (!personMap.has(personKey)) {
      personMap.set(personKey, []);
    }
    personMap.get(personKey)!.push(t);
  }

  const results: TraineeSearchResult[] = [];

  for (const [, records] of personMap.entries()) {
    const sorted = [...records].sort((a, b) => b.yearBE - a.yearBE);
    const primary = sorted[0];

    let matches = false;

    // Match 1: 13-digit ID or partial numeric digits (min 4 digits)
    const cleanId = primary.idCard ? primary.idCard.replace(/\D/g, "") : "";
    if (digits && digits.length >= 4 && cleanId.includes(digits)) {
      matches = true;
    }

    // Match 2: Personnel ID (e.g. USR-2026-0001, 0001, USR)
    if (primary.personnelId && primary.personnelId.toLowerCase().includes(q.toLowerCase())) {
      matches = true;
    }

    // Match 3: Name match (supports partial name or normalized without prefix)
    const normName = normalizeThaiName(primary.name);
    if (normQuery.length >= 2 && (normName.includes(normQuery) || normQuery.includes(normName) || primary.name.includes(q))) {
      matches = true;
    }

    // Match 4: Specific affiliation or association match
    if (q.length >= 3 && primary.affiliation && primary.affiliation.toLowerCase().includes(q.toLowerCase())) {
      matches = true;
    }

    if (matches) {
      const dutyCount = records.reduce((acc, r) => acc + (r.duties?.length || 0), 0);
      results.push({
        uniqueKey: primary.personnelId || cleanId || primary.id,
        name: primary.name,
        personnelId: primary.personnelId,
        sportsType: primary.sportsType,
        affiliation: primary.affiliation,
        affiliationGroup: primary.affiliationGroup,
        records: sorted,
        latestYearBE: primary.yearBE,
        idCard: primary.idCard,
        activeDutyCount: dutyCount,
      });
    }
  }

  return results;
}

/**
 * Returns all historical records & courses matching an identifier (Personnel ID, Citizen ID, ID, or Name).
 * Supports legacy archives without citizen ID.
 */
export function getTraineePassport(identifier: string, trainees: HistoricalTrainee[]) {
  if (!identifier) return undefined;
  const raw = identifier.trim();
  const digits = raw.replace(/\D/g, "");

  // 1. If 13 digits, match by ID card
  let records = digits.length === 13
    ? trainees.filter((t) => t.idCard && t.idCard.replace(/\D/g, "") === digits)
    : [];

  // 2. If not found, match by personnelId, primary ID, or exact idCard string
  if (records.length === 0) {
    records = trainees.filter(
      (t) =>
        (t.personnelId && t.personnelId.toLowerCase() === raw.toLowerCase()) ||
        t.id === raw ||
        t.idCard === raw
    );
  }

  // 3. Match by normalized name
  if (records.length === 0) {
    const normSearch = normalizeThaiName(raw);
    if (normSearch.length >= 2) {
      records = trainees.filter((t) => {
        const normTrainee = normalizeThaiName(t.name);
        return normTrainee === normSearch || normTrainee.includes(normSearch) || t.name.includes(raw);
      });
    }
  }

  if (records.length === 0) return undefined;

  // Primary profile is the most recent record
  const sorted = [...records].sort((a, b) => b.yearBE - a.yearBE);
  const primary = sorted[0];

  // Consolidate unique duties across all course certifications
  const allDutiesMap = new Map<string, DutyRecord>();
  for (const r of records) {
    for (const d of r.duties) {
      allDutiesMap.set(d.id, d);
    }
  }
  const allDuties = Array.from(allDutiesMap.values()).sort(
    (a, b) => Date.parse(b.startDate || b.createdAt) - Date.parse(a.startDate || a.createdAt)
  );

  return {
    primary,
    records: sorted,
    allDuties,
    totalCourses: sorted.length,
    activeDutyCount: allDuties.length,
    isActive: allDuties.length > 0,
  };
}

export interface QualitativeHighlight {
  id: string;
  traineeName: string;
  sportsType: string;
  courseTitle: string;
  role: string;
  eventName: string;
  text: string;
  dimensions: string[];
  rating: number;
}

export interface EvaluationStats {
  totalTrainees: number;
  uniquePersonnelCount: number;
  activeCount: number;
  inactiveCount: number;
  pendingCount: number;
  activeRatePercent: number;
  totalDutiesReported: number;
  dutiesByYear: Record<number, number>;
  traineesByYear: Record<number, number>;
  bySportsType: { name: string; count: number; activeCount: number }[];
  byAffiliation: { name: string; count: number; activeCount: number }[];
  byAffiliationGroup: { name: string; count: number; activeCount: number; percent: number }[];
  byCourseCategory: { name: string; count: number; activeCount: number; percent: number }[];
  byCourse: { name: string; count: number; activeRate: number; category?: string }[];
  dimensionBreakdown: { key: string; label: string; icon: string; count: number; percent: number }[];
  averageImpactRating: number;
  totalRatingsCount: number;
  qualitativeHighlights: QualitativeHighlight[];
}

export function computeEvaluationStats(trainees: HistoricalTrainee[]): EvaluationStats {
  const uniquePersonnelSet = new Set(
    trainees.map((t) => t.personnelId || (t.idCard && t.idCard.replace(/\D/g, "").length === 13 ? t.idCard : normalizeThaiName(t.name)))
  );
  const uniquePersonnelCount = uniquePersonnelSet.size;
  const totalTrainees = trainees.length;

  let activeCount = 0;
  let inactiveCount = 0;
  let pendingCount = 0;
  let totalDutiesReported = 0;

  const traineesByYear: Record<number, number> = {};
  const dutiesByYear: Record<number, number> = {};
  const sportsMap: Record<string, { count: number; activeCount: number }> = {};
  const affilMap: Record<string, { count: number; activeCount: number }> = {};
  const affilGroupMap: Record<string, { count: number; activeCount: number }> = {};
  const courseCatMap: Record<string, { count: number; activeCount: number }> = {};
  const courseMap: Record<string, { count: number; activeCount: number; category?: string }> = {};

  const dimensionCounts: Record<string, number> = {
    planning: 0,
    rules: 0,
    science: 0,
    psychology: 0,
    management: 0,
  };
  let totalRatingSum = 0;
  let totalRatingsCount = 0;
  const qualitativeHighlights: QualitativeHighlight[] = [];

  for (const t of trainees) {
    // Status counts
    if (t.status === "active") activeCount += 1;
    else if (t.status === "pending_verification") pendingCount += 1;
    else inactiveCount += 1;

    totalDutiesReported += t.duties.length;

    // By Year
    traineesByYear[t.yearBE] = (traineesByYear[t.yearBE] || 0) + 1;
    dutiesByYear[t.yearBE] = (dutiesByYear[t.yearBE] || 0) + t.duties.length;

    // By Affiliation Group
    const groupName = t.affiliationGroup || "หน่วยงานภายนอก";
    if (!affilGroupMap[groupName]) {
      affilGroupMap[groupName] = { count: 0, activeCount: 0 };
    }
    affilGroupMap[groupName].count += 1;
    if (t.status === "active") affilGroupMap[groupName].activeCount += 1;

    // By Specific Affiliation
    if (t.affiliation) {
      if (!affilMap[t.affiliation]) {
        affilMap[t.affiliation] = { count: 0, activeCount: 0 };
      }
      affilMap[t.affiliation].count += 1;
      if (t.status === "active") affilMap[t.affiliation].activeCount += 1;
    }

    // By Sports / Association
    const sType = t.sportsType || t.affiliation;
    if (!sportsMap[sType]) {
      sportsMap[sType] = { count: 0, activeCount: 0 };
    }
    sportsMap[sType].count += 1;
    if (t.status === "active") sportsMap[sType].activeCount += 1;

    // By Course Category
    const catName = t.courseCategory || "อื่นๆ";
    if (!courseCatMap[catName]) {
      courseCatMap[catName] = { count: 0, activeCount: 0 };
    }
    courseCatMap[catName].count += 1;
    if (t.status === "active") courseCatMap[catName].activeCount += 1;

    // By Course
    if (!courseMap[t.courseTitle]) {
      courseMap[t.courseTitle] = { count: 0, activeCount: 0, category: t.courseCategory };
    }
    courseMap[t.courseTitle].count += 1;
    if (t.status === "active") courseMap[t.courseTitle].activeCount += 1;

    // Aggregate Kirkpatrick Knowledge Transfer Metrics from duties
    for (const d of t.duties) {
      if (Array.isArray(d.knowledgeDimensions)) {
        for (const dimKey of d.knowledgeDimensions) {
          if (dimKey in dimensionCounts) {
            dimensionCounts[dimKey] += 1;
          }
        }
      }

      if (typeof d.impactRating === "number" && d.impactRating >= 1 && d.impactRating <= 5) {
        totalRatingSum += d.impactRating;
        totalRatingsCount += 1;
      }

      if (d.knowledgeApplied && d.knowledgeApplied.trim().length > 10) {
        qualitativeHighlights.push({
          id: d.id,
          traineeName: t.name,
          sportsType: t.sportsType,
          courseTitle: t.courseTitle,
          role: d.role,
          eventName: d.eventName,
          text: d.knowledgeApplied.trim(),
          dimensions: d.knowledgeDimensions ?? [],
          rating: d.impactRating ?? 5,
        });
      }
    }
  }

  const activeRatePercent =
    totalTrainees > 0 ? Math.round((activeCount / totalTrainees) * 100) : 0;

  const byAffiliationGroup = Object.entries(affilGroupMap)
    .map(([name, val]) => ({
      name,
      count: val.count,
      activeCount: val.activeCount,
      percent: totalTrainees > 0 ? Math.round((val.count / totalTrainees) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const byCourseCategory = Object.entries(courseCatMap)
    .map(([name, val]) => ({
      name,
      count: val.count,
      activeCount: val.activeCount,
      percent: totalTrainees > 0 ? Math.round((val.count / totalTrainees) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const byAffiliation = Object.entries(affilMap)
    .map(([name, val]) => ({ name, count: val.count, activeCount: val.activeCount }))
    .sort((a, b) => b.count - a.count);

  const bySportsType = Object.entries(sportsMap)
    .map(([name, val]) => ({ name, count: val.count, activeCount: val.activeCount }))
    .sort((a, b) => b.count - a.count);

  const byCourse = Object.entries(courseMap)
    .map(([name, val]) => ({
      name,
      count: val.count,
      category: val.category,
      activeRate: val.count > 0 ? Math.round((val.activeCount / val.count) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const totalDimensionHits = Math.max(1, Object.values(dimensionCounts).reduce((a, b) => a + b, 0));
  const dimensionBreakdown = KNOWLEDGE_DIMENSIONS.map((dim) => {
    const count = dimensionCounts[dim.key] || 0;
    const percent = Math.round((count / totalDimensionHits) * 100);
    return {
      key: dim.key,
      label: dim.label,
      icon: dim.icon,
      count,
      percent,
    };
  }).sort((a, b) => b.count - a.count);

  const averageImpactRating =
    totalRatingsCount > 0 ? Math.round((totalRatingSum / totalRatingsCount) * 10) / 10 : 4.8;

  return {
    totalTrainees,
    uniquePersonnelCount,
    activeCount,
    inactiveCount,
    pendingCount,
    activeRatePercent,
    totalDutiesReported,
    dutiesByYear,
    traineesByYear,
    bySportsType,
    byAffiliation,
    byAffiliationGroup,
    byCourseCategory,
    byCourse,
    dimensionBreakdown,
    averageImpactRating,
    totalRatingsCount,
    qualitativeHighlights,
  };
}

export interface UniquePersonTrainee {
  personnelId: string;
  name: string;
  prefix?: string;
  affiliation: string;
  affiliationGroup?: string;
  sportsType: string;
  latestYearBE: number;
  firstYearBE: number;
  courses: {
    courseTitle: string;
    courseCategory?: string;
    yearBE: number;
    batch: string;
    passedDate: string;
    recordId: string;
  }[];
  totalCourses: number;
  totalDuties: number;
  status: "active" | "inactive" | "pending_verification";
  duties: DutyRecord[];
  records: HistoricalTrainee[];
}

export function groupTraineesByPerson(trainees: HistoricalTrainee[]): UniquePersonTrainee[] {
  const map = new Map<string, HistoricalTrainee[]>();

  for (const t of trainees) {
    const key = t.personnelId || (t.idCard && t.idCard.length === 13 ? t.idCard : normalizeThaiName(t.name));
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)!.push(t);
  }

  const result: UniquePersonTrainee[] = [];

  for (const [, records] of map.entries()) {
    const sorted = [...records].sort((a, b) => b.yearBE - a.yearBE);
    const primary = sorted[0];

    const courses = sorted.map((r) => ({
      courseTitle: r.courseTitle,
      courseCategory: r.courseCategory,
      yearBE: r.yearBE,
      batch: r.batch,
      passedDate: r.passedDate,
      recordId: r.id,
    }));

    const dutiesMap = new Map<string, DutyRecord>();
    for (const r of sorted) {
      for (const d of r.duties) {
        dutiesMap.set(d.id, d);
      }
    }
    const allDuties = Array.from(dutiesMap.values()).sort(
      (a, b) => Date.parse(b.startDate || b.createdAt) - Date.parse(a.startDate || a.createdAt)
    );

    const hasActive = sorted.some((r) => r.status === "active") || allDuties.length > 0;
    const hasPending = sorted.some((r) => r.status === "pending_verification");

    const status: "active" | "inactive" | "pending_verification" = hasActive
      ? "active"
      : hasPending
      ? "pending_verification"
      : "inactive";

    const years = sorted.map((r) => r.yearBE);
    const latestYearBE = Math.max(...years);
    const firstYearBE = Math.min(...years);

    result.push({
      personnelId: primary.personnelId || primary.idCard,
      name: primary.name,
      prefix: primary.prefix,
      affiliation: primary.affiliation,
      affiliationGroup: primary.affiliationGroup,
      sportsType: primary.sportsType,
      latestYearBE,
      firstYearBE,
      courses,
      totalCourses: sorted.length,
      totalDuties: allDuties.length,
      status,
      duties: allDuties,
      records: sorted,
    });
  }

  return result.sort((a, b) => b.latestYearBE - a.latestYearBE || a.name.localeCompare(b.name, "th"));
}

export interface CourseTimelineItem {
  courseTitle: string;
  category: string;
  years: number[];
  firstYear: number;
  lastYear: number;
  totalYearsCount: number;
  totalTrainees: number;
  traineesByYear: Record<number, number>;
  byGroup: Record<string, number>;
  isActiveRecent: boolean;
  trainees: HistoricalTrainee[];
}

export function computeCourseTimelineData(trainees: HistoricalTrainee[]): CourseTimelineItem[] {
  const map = new Map<string, HistoricalTrainee[]>();

  for (const t of trainees) {
    if (!map.has(t.courseTitle)) {
      map.set(t.courseTitle, []);
    }
    map.get(t.courseTitle)!.push(t);
  }

  const result: CourseTimelineItem[] = [];

  for (const [title, list] of map.entries()) {
    const yearsSet = new Set(list.map((item) => item.yearBE));
    const sortedYears = Array.from(yearsSet).sort((a, b) => a - b);
    const category = list[0]?.courseCategory || "อื่นๆ";

    const traineesByYear: Record<number, number> = {};
    const byGroup: Record<string, number> = {
      "การกีฬาแห่งประเทศไทย": 0,
      "กองทุนพัฒนาการกีฬาแห่งชาติ": 0,
      "สมาคมกีฬาแห่งประเทศไทย": 0,
      "สมาคมกีฬาแห่งจังหวัด": 0,
      "หน่วยงานภายนอก": 0,
    };

    for (const item of list) {
      traineesByYear[item.yearBE] = (traineesByYear[item.yearBE] || 0) + 1;
      const g = item.affiliationGroup || "หน่วยงานภายนอก";
      byGroup[g] = (byGroup[g] || 0) + 1;
    }

    const firstYear = sortedYears[0] || 2547;
    const lastYear = sortedYears[sortedYears.length - 1] || 2569;
    const isActiveRecent = lastYear >= 2566;

    result.push({
      courseTitle: title,
      category,
      years: sortedYears,
      firstYear,
      lastYear,
      totalYearsCount: sortedYears.length,
      totalTrainees: list.length,
      traineesByYear,
      byGroup,
      isActiveRecent,
      trainees: list,
    });
  }

  const catPriority: Record<string, number> = {
    "ผู้บริหารกีฬา": 1,
    "ผู้ฝึกสอนกีฬา": 2,
    "อื่นๆ": 3,
  };

  return result.sort((a, b) => {
    const pA = catPriority[a.category] || 99;
    const pB = catPriority[b.category] || 99;
    if (pA !== pB) return pA - pB;
    return b.totalTrainees - a.totalTrainees;
  });
}

const TARGETS_STORAGE_KEY = "sat-course-targets-v1";

// Default targets per standard course
const DEFAULT_TARGETS_MAP: Record<string, number> = {
  TSLP: 40,
  Olympic: 50,
  ICSM: 40,
  ICSC: 40,
  GGE: 40,
  SSCC: 35,
  "National classifier": 25,
  "HCDP-ICSM": 35,
  "HCDP-ICSC": 35,
  PSAAD: 35,
  "TSL-ISPEP": 30,
  "PSAAD-ISPEP": 30,
  PSCE: 30,
  "Lv.1": 30,
  Bnc: 30,
  Switzerland: 30,
  "การพัฒนาบุคลากรกีฬาสู่นักบริหารจัดการองค์กรกีฬาเพื่อความยั่งยืน": 30,
};

let targetsCache: Record<string, number> | null = null;

export function getCustomCourseTargets(): Record<string, number> {
  if (targetsCache !== null) return targetsCache;
  if (typeof window === "undefined") return DEFAULT_TARGETS_MAP;
  try {
    const raw = window.localStorage.getItem(TARGETS_STORAGE_KEY);
    if (!raw) {
      const initial = { ...DEFAULT_TARGETS_MAP };
      targetsCache = initial;
      return initial;
    }
    const parsed = JSON.parse(raw);
    const merged: Record<string, number> = { ...DEFAULT_TARGETS_MAP, ...parsed };
    targetsCache = merged;
    return merged;
  } catch {
    const fallback = { ...DEFAULT_TARGETS_MAP };
    targetsCache = fallback;
    return fallback;
  }
}

export function saveCourseTarget(courseTitle: string, target: number, yearBE?: number | "all"): void {
  if (typeof window === "undefined") return;
  try {
    const current = { ...getCustomCourseTargets() };
    const key = yearBE && yearBE !== "all" ? `${courseTitle}_${yearBE}` : courseTitle;
    current[key] = target;
    if (yearBE === "all" || !yearBE) {
      current[courseTitle] = target;
    }
    targetsCache = current;
    window.localStorage.setItem(TARGETS_STORAGE_KEY, JSON.stringify(current));

    state = {
      ...state,
      revision: state.revision + 1,
    };
    emit(); // Notify UI to recompute matrix
  } catch {
    // Ignore
  }
}

export function getTargetForCourse(courseTitle: string, yearBE?: number | "all"): number {
  const map = getCustomCourseTargets();
  if (yearBE && yearBE !== "all") {
    const specificKey = `${courseTitle}_${yearBE}`;
    if (map[specificKey] !== undefined) return map[specificKey];
  }
  if (map[courseTitle] !== undefined) return map[courseTitle];
  return 40; // Default if not found
}

/**
 * Calculate the highest existing USR-2026-XXXX sequence number and return the next available ID
 */
export function getNextPersonnelId(trainees: HistoricalTrainee[]): string {
  let maxNum = 1965; // Base from dataset (updated to latest 1,943 personnel dataset)
  for (const t of trainees) {
    const pId = t.personnelId || t.idCard || "";
    if (pId.startsWith("USR-2026-")) {
      const numPart = parseInt(pId.replace("USR-2026-", ""), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  }
  return `USR-2026-${String(maxNum + 1).padStart(4, "0")}`;
}

/**
 * Generate a sequence of N new unique USR-2026-XXXX IDs
 */
export function generateNextPersonnelIds(trainees: HistoricalTrainee[], count: number): string[] {
  let maxNum = 1965;
  for (const t of trainees) {
    const pId = t.personnelId || t.idCard || "";
    if (pId.startsWith("USR-2026-")) {
      const numPart = parseInt(pId.replace("USR-2026-", ""), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  }

  const ids: string[] = [];
  for (let i = 1; i <= count; i++) {
    ids.push(`USR-2026-${String(maxNum + i).padStart(4, "0")}`);
  }
  return ids;
}

/**
 * Clean Thai name for matching using Smart Name Engine (extracts coreNameKey)
 */
export function normalizeNameForMatching(name: string): string {
  if (!name) return "";
  return getCoreNameKey(name);
}

/**
 * Check if a person already exists in the system by name, prefix, or ID
 */
export function findExistingTrainee(
  trainees: HistoricalTrainee[],
  name: string,
  idCardOrPersonnelId?: string,
  prefix?: string
): HistoricalTrainee | undefined {
  const cleanId = (idCardOrPersonnelId || "").trim();
  if (cleanId && cleanId.startsWith("USR-2026-")) {
    const foundById = trainees.find((t) => t.personnelId === cleanId);
    if (foundById) return foundById;
  }

  const match = evaluateNameMatch(name, prefix, trainees);
  if (match.confidence === "EXACT_MATCH" || match.confidence === "SAME_PERSON_DIFF_PREFIX") {
    return match.matchedTrainee;
  }

  return undefined;
}

export interface CourseMatrixRow {
  courseTitle: string;
  category: string;
  groups: Record<string, number>;
  total: number;
  percentByGroup: Record<string, number>;
  target: number;
  achievementRate: number;
  targetStatus: "achieved" | "near" | "under";
}

export function computeCourseAffiliationMatrix(
  trainees: HistoricalTrainee[],
  yearFilter?: number | "all"
): CourseMatrixRow[] {
  const filtered = yearFilter && yearFilter !== "all"
    ? trainees.filter((t) => t.yearBE === Number(yearFilter))
    : trainees;

  const map = new Map<string, { category: string; groups: Record<string, number>; total: number }>();

  for (const t of filtered) {
    if (!map.has(t.courseTitle)) {
      map.set(t.courseTitle, {
        category: t.courseCategory || "อื่นๆ",
        groups: {
          "การกีฬาแห่งประเทศไทย": 0,
          "กองทุนพัฒนาการกีฬาแห่งชาติ": 0,
          "สมาคมกีฬาแห่งประเทศไทย": 0,
          "สมาคมกีฬาแห่งจังหวัด": 0,
          "หน่วยงานภายนอก": 0,
        },
        total: 0,
      });
    }

    const row = map.get(t.courseTitle)!;
    const g = t.affiliationGroup || "หน่วยงานภายนอก";
    row.groups[g] = (row.groups[g] || 0) + 1;
    row.total += 1;
  }

  const result: CourseMatrixRow[] = [];

  for (const [title, val] of map.entries()) {
    const percentByGroup: Record<string, number> = {};
    for (const [g, count] of Object.entries(val.groups)) {
      percentByGroup[g] = val.total > 0 ? Math.round((count / val.total) * 100) : 0;
    }

    const target = getTargetForCourse(title, yearFilter);
    const achievementRate = target > 0 ? Math.round((val.total / target) * 1000) / 10 : 0;
    const targetStatus = achievementRate >= 100 ? "achieved" : achievementRate >= 80 ? "near" : "under";

    result.push({
      courseTitle: title,
      category: val.category,
      groups: val.groups,
      total: val.total,
      percentByGroup,
      target,
      achievementRate,
      targetStatus,
    });
  }

  const catPriority: Record<string, number> = {
    "ผู้บริหารกีฬา": 1,
    "ผู้ฝึกสอนกีฬา": 2,
    "อื่นๆ": 3,
  };

  return result.sort((a, b) => {
    const pA = catPriority[a.category] || 99;
    const pB = catPriority[b.category] || 99;
    if (pA !== pB) return pA - pB;
    return b.total - a.total;
  });
}

/**
 * Helper to get a stable unique key for an individual trainee across records
 */
export function getPersonUniqueKey(t: HistoricalTrainee): string {
  if (t.personnelId && t.personnelId.trim()) {
    return t.personnelId.trim();
  }
  const cleanId = t.idCard ? t.idCard.replace(/\D/g, "") : "";
  if (cleanId.length === 13) {
    return cleanId;
  }
  return `name_${normalizeNameForMatching(t.name)}`;
}

export interface AnnualCohortStats {
  yearBE: number;
  totalRecords: number;
  uniquePersons: number;
  duplicateEnrollments: number;
  newTrainees: number;
  returningTrainees: number;
  newPercentage: number;
  returningPercentage: number;
  newByGroup: Record<string, number>;
  returningByGroup: Record<string, number>;
}

export interface TraineeCohortPerson {
  personKey: string;
  personnelId?: string;
  idCard: string;
  name: string;
  prefix?: string;
  affiliation: string;
  affiliationGroup: string;
  firstYearBE: number;
  isNewInYear: boolean;
  coursesInYear: string[];
  totalCoursesAllTime: number;
}

export interface YearCohortSummary {
  yearBE: number | "all";
  totalRecords: number;
  uniquePersons: number;
  duplicateEnrollments: number;
  newCount: number;
  returningCount: number;
  newPercentage: number;
  returningPercentage: number;
  newByGroup: Record<string, number>;
  returningByGroup: Record<string, number>;
  newPersonsList: TraineeCohortPerson[];
  returningPersonsList: TraineeCohortPerson[];
}

/**
 * Computes Annual Cohort Stats for all years in descending order
 */
export function computeAnnualCohortStats(trainees: HistoricalTrainee[]): AnnualCohortStats[] {
  const personFirstYear = new Map<string, number>();
  const sortedByYearAsc = [...trainees].sort((a, b) => a.yearBE - b.yearBE);
  for (const r of sortedByYearAsc) {
    const key = getPersonUniqueKey(r);
    if (!personFirstYear.has(key)) {
      personFirstYear.set(key, r.yearBE);
    }
  }

  const allYears = Array.from(new Set(trainees.map((t) => t.yearBE))).sort((a, b) => b - a);

  return allYears.map((year) => {
    const yearRecords = trainees.filter((t) => t.yearBE === year);
    const uniqueMap = new Map<string, HistoricalTrainee>();
    for (const r of yearRecords) {
      const key = getPersonUniqueKey(r);
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, r);
      }
    }

    let newCount = 0;
    let returningCount = 0;
    const newByGroup: Record<string, number> = {
      "การกีฬาแห่งประเทศไทย": 0,
      "กองทุนพัฒนาการกีฬาแห่งชาติ": 0,
      "สมาคมกีฬาแห่งประเทศไทย": 0,
      "สมาคมกีฬาแห่งจังหวัด": 0,
      "หน่วยงานภายนอก": 0,
    };
    const returningByGroup: Record<string, number> = {
      "การกีฬาแห่งประเทศไทย": 0,
      "กองทุนพัฒนาการกีฬาแห่งชาติ": 0,
      "สมาคมกีฬาแห่งประเทศไทย": 0,
      "สมาคมกีฬาแห่งจังหวัด": 0,
      "หน่วยงานภายนอก": 0,
    };

    for (const [key, r] of uniqueMap.entries()) {
      const grp = r.affiliationGroup || "หน่วยงานภายนอก";
      const isNew = personFirstYear.get(key) === year;
      if (isNew) {
        newCount++;
        newByGroup[grp] = (newByGroup[grp] || 0) + 1;
      } else {
        returningCount++;
        returningByGroup[grp] = (returningByGroup[grp] || 0) + 1;
      }
    }

    const uniquePersons = uniqueMap.size;
    const newPercentage = uniquePersons > 0 ? Math.round((newCount / uniquePersons) * 1000) / 10 : 0;
    const returningPercentage = uniquePersons > 0 ? Math.round((returningCount / uniquePersons) * 1000) / 10 : 0;

    return {
      yearBE: year,
      totalRecords: yearRecords.length,
      uniquePersons,
      duplicateEnrollments: yearRecords.length - uniquePersons,
      newTrainees: newCount,
      returningTrainees: returningCount,
      newPercentage,
      returningPercentage,
      newByGroup,
      returningByGroup,
    };
  });
}

/**
 * Computes deep cohort summary for a specific year (or all years) with list of individual people
 */
export function computeYearCohortSummary(
  trainees: HistoricalTrainee[],
  yearFilter: number | "all"
): YearCohortSummary {
  const personFirstYear = new Map<string, number>();
  const personAllRecords = new Map<string, HistoricalTrainee[]>();

  const sortedByYearAsc = [...trainees].sort((a, b) => a.yearBE - b.yearBE);
  for (const r of sortedByYearAsc) {
    const key = getPersonUniqueKey(r);
    if (!personFirstYear.has(key)) {
      personFirstYear.set(key, r.yearBE);
    }
    if (!personAllRecords.has(key)) {
      personAllRecords.set(key, []);
    }
    personAllRecords.get(key)!.push(r);
  }

  const isSpecificYear = yearFilter !== "all" && typeof yearFilter === "number";
  const targetYear = isSpecificYear ? yearFilter : 2569;

  const relevantRecords = isSpecificYear
    ? trainees.filter((t) => t.yearBE === targetYear)
    : trainees;

  const uniqueInYearMap = new Map<string, HistoricalTrainee[]>();
  for (const r of relevantRecords) {
    const key = getPersonUniqueKey(r);
    if (!uniqueInYearMap.has(key)) {
      uniqueInYearMap.set(key, []);
    }
    uniqueInYearMap.get(key)!.push(r);
  }

  const newPersonsList: TraineeCohortPerson[] = [];
  const returningPersonsList: TraineeCohortPerson[] = [];

  const newByGroup: Record<string, number> = {
    "การกีฬาแห่งประเทศไทย": 0,
    "กองทุนพัฒนาการกีฬาแห่งชาติ": 0,
    "สมาคมกีฬาแห่งประเทศไทย": 0,
    "สมาคมกีฬาแห่งจังหวัด": 0,
    "หน่วยงานภายนอก": 0,
  };
  const returningByGroup: Record<string, number> = {
    "การกีฬาแห่งประเทศไทย": 0,
    "กองทุนพัฒนาการกีฬาแห่งชาติ": 0,
    "สมาคมกีฬาแห่งประเทศไทย": 0,
    "สมาคมกีฬาแห่งจังหวัด": 0,
    "หน่วยงานภายนอก": 0,
  };

  for (const [key, yearRecs] of uniqueInYearMap.entries()) {
    const primary = [...yearRecs].sort((a, b) => b.yearBE - a.yearBE)[0];
    const grp = primary.affiliationGroup || "หน่วยงานภายนอก";
    const firstYear = personFirstYear.get(key) ?? primary.yearBE;
    const isNew = isSpecificYear ? firstYear === targetYear : true;

    const personInfo: TraineeCohortPerson = {
      personKey: key,
      personnelId: primary.personnelId,
      idCard: primary.idCard,
      name: primary.name,
      prefix: primary.prefix,
      affiliation: primary.affiliation,
      affiliationGroup: grp,
      firstYearBE: firstYear,
      isNewInYear: isNew,
      coursesInYear: Array.from(new Set(yearRecs.map((r) => r.courseTitle))),
      totalCoursesAllTime: personAllRecords.get(key)?.length || yearRecs.length,
    };

    if (isNew) {
      newPersonsList.push(personInfo);
      newByGroup[grp] = (newByGroup[grp] || 0) + 1;
    } else {
      returningPersonsList.push(personInfo);
      returningByGroup[grp] = (returningByGroup[grp] || 0) + 1;
    }
  }

  const totalUnique = uniqueInYearMap.size;
  const newCount = newPersonsList.length;
  const returningCount = returningPersonsList.length;
  const newPercentage = totalUnique > 0 ? Math.round((newCount / totalUnique) * 1000) / 10 : 0;
  const returningPercentage = totalUnique > 0 ? Math.round((returningCount / totalUnique) * 1000) / 10 : 0;

  return {
    yearBE: yearFilter,
    totalRecords: relevantRecords.length,
    uniquePersons: totalUnique,
    duplicateEnrollments: relevantRecords.length - totalUnique,
    newCount,
    returningCount,
    newPercentage,
    returningPercentage,
    newByGroup,
    returningByGroup,
    newPersonsList: newPersonsList.sort((a, b) => a.name.localeCompare(b.name, "th")),
    returningPersonsList: returningPersonsList.sort((a, b) => a.name.localeCompare(b.name, "th")),
  };
}
