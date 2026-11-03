"use client";

import { useSyncExternalStore } from "react";
import rawRealTrainees from "@/data/alumni.json";

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
  avatarUrl?: string;
  duties: DutyRecord[];
  createdAt: string;
  updatedAt: string;
}

export const AFFILIATION_GROUPS = [
  "สมาคมกีฬาแห่งประเทศไทย",
  "การกีฬาแห่งประเทศไทย",
  "สมาคมกีฬาแห่งจังหวัด",
  "หน่วยงานภายนอก",
] as const;

export const SPORTS_TYPES = [
  "สมาคมกีฬาแห่งประเทศไทย",
  "การกีฬาแห่งประเทศไทย",
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

// 2,732 authentic historical training records (1,891 unique personnel after deduplication) from official SAT Excel files
export const SEED_TRAINEES: HistoricalTrainee[] = rawRealTrainees as HistoricalTrainee[];

const STORAGE_KEY = "sat-alumni-real-v3";

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
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.trainees));
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

function hydrate() {
  if (hydrateStarted || typeof window === "undefined") return;
  hydrateStarted = true;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      state = {
        trainees: parsed,
        revision: state.revision + 1,
      };
      emit();
    }
  } catch {
    // fallback to seed
  }
}

function getSnapshot() {
  return state;
}

function getServerSnapshot() {
  return INITIAL_STATE;
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
    addTrainee,
    updateTrainee,
    deleteTrainee,
    importTrainees,
    addDutyRecord,
    verifyDutyRecord,
    deleteDutyRecord,
    resetAlumniData,
  };
}

export function addTrainee(input: Omit<HistoricalTrainee, "id" | "createdAt" | "updatedAt" | "duties">): HistoricalTrainee {
  const now = new Date().toISOString();
  const newTrainee: HistoricalTrainee = {
    ...input,
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
  emit();
  return newItems.length;
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
  emit();
  return true;
}

export function resetAlumniData() {
  state = {
    trainees: [...SEED_TRAINEES],
    revision: state.revision + 1,
  };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
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
      "สมาคมกีฬาแห่งประเทศไทย": 0,
      "การกีฬาแห่งประเทศไทย": 0,
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

export interface CourseMatrixRow {
  courseTitle: string;
  category: string;
  groups: Record<string, number>;
  total: number;
  percentByGroup: Record<string, number>;
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
          "สมาคมกีฬาแห่งประเทศไทย": 0,
          "การกีฬาแห่งประเทศไทย": 0,
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

    result.push({
      courseTitle: title,
      category: val.category,
      groups: val.groups,
      total: val.total,
      percentByGroup,
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
