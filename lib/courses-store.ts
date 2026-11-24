"use client";

import { useSyncExternalStore } from "react";
import {
  courses as seedCourses,
  DEFAULT_TARGET_QUOTAS,
  DEFAULT_DOCUMENT_CONFIG,
  DEFAULT_SAT_SUPPORT,
  DEFAULT_EXPENSES_POLICY,
  DEFAULT_GLOBAL_REGISTRATION_DATE,
  DEFAULT_GLOBAL_RESULT_DATE,
  getGlobalCourseSchedule,
  balanceQuotasToCapacity,
  deriveFiscalYearFromDate,
  isLegacy50Quota,
  getCourseFiscalYear,
  mergeCourseSakaConfig,
  type Course,
  type TargetGroupQuotas,
} from "@/lib/courses";
import { isSupabaseConfigured, getSupabaseClient } from "@/lib/supabase/client";
import { uploadDocumentToSupabaseStorage } from "@/lib/supabase/sync";
import { detectProvinceFromLocation } from "@/lib/provinces";

interface EmbeddedSchedule {
  registrationDate?: string;
  resultDate?: string;
  useCustomSchedule?: boolean;
  updatedAt?: string;
}

export function sanitizeQuotas(raw?: unknown, fallbackCap = 40): TargetGroupQuotas {
  if (!raw || typeof raw !== "object") return balanceQuotasToCapacity(fallbackCap);
  const q = raw as Record<string, unknown>;
  const sat = typeof q.sat === "number" ? q.sat : 5;
  const nationalAssoc = typeof q.nationalAssoc === "number" ? q.nationalAssoc : 15;
  const provincialAssoc = typeof q.provincialAssoc === "number" ? q.provincialAssoc : 15;
  const nsdf = typeof q.nsdf === "number" ? q.nsdf : 0;
  const external = typeof q.external === "number" ? q.external : 5;
  return { sat, nationalAssoc, provincialAssoc, nsdf, external };
}

const cachedGlobalTimelineByCourseId = new Map<number, Record<string, unknown>>();
export const cachedReviewsByCourseId = new Map<number, Record<string, unknown>>();

export function setCachedCourseReviews(courseId: number, reviews: Record<string, unknown>) {
  cachedReviewsByCourseId.set(courseId, reviews);
}

export function buildQuotasPayload(
  quotas: TargetGroupQuotas | undefined,
  schedule: {
    registrationDate?: string;
    resultDate?: string;
    useCustomSchedule?: boolean;
    updatedAt?: string;
  },
  capacity = 40,
  metadata?: {
    courseObjective?: string;
    qualifications?: string[];
    requiredDocuments?: string[];
    evaluationCriteria?: string[];
    satSupport?: string[];
    expensesPolicy?: string;
    documentConfig?: import("@/lib/courses").CourseDocumentConfig;
    seatsLeft?: number;
    announcementFile?: import("@/lib/courses").CourseAnnouncementFile | null;
    budget?: number;
    province?: string;
    fiscalYear?: string;
    isHistorical?: boolean;
    historicalCompleted?: number;
    historicalApplicants?: number;
    status?: Course["status"];
  },
  courseId?: number
): Record<string, unknown> {
  const cleanQ = sanitizeQuotas(quotas, capacity);
  const existingGlobalTimeline =
    typeof courseId === "number"
      ? cachedGlobalTimelineByCourseId.get(courseId)
      : undefined;
  const existingReviews =
    typeof courseId === "number"
      ? cachedReviewsByCourseId.get(courseId)
      : undefined;
  const payload: Record<string, unknown> = {
    ...cleanQ,
    ...(existingGlobalTimeline ? { _globalTimeline: existingGlobalTimeline } : {}),
    ...(existingReviews && Object.keys(existingReviews).length > 0
      ? { _reviews: existingReviews }
      : {}),
    _schedule: {
      registrationDate: schedule.registrationDate?.trim() || DEFAULT_GLOBAL_REGISTRATION_DATE,
      resultDate: schedule.resultDate?.trim() || DEFAULT_GLOBAL_RESULT_DATE,
      useCustomSchedule: Boolean(schedule.useCustomSchedule),
      updatedAt: schedule.updatedAt || new Date().toISOString(),
    },
  };
  if (metadata) {
    payload._metadata = {
      ...(metadata.courseObjective !== undefined ? { courseObjective: metadata.courseObjective } : {}),
      ...(metadata.qualifications !== undefined ? { qualifications: metadata.qualifications } : {}),
      ...(metadata.requiredDocuments !== undefined ? { requiredDocuments: metadata.requiredDocuments } : {}),
      ...(metadata.evaluationCriteria !== undefined ? { evaluationCriteria: metadata.evaluationCriteria } : {}),
      ...(metadata.satSupport !== undefined ? { satSupport: metadata.satSupport } : {}),
      ...(metadata.expensesPolicy !== undefined ? { expensesPolicy: metadata.expensesPolicy } : {}),
      ...(metadata.documentConfig !== undefined ? { documentConfig: metadata.documentConfig } : {}),
      ...(metadata.seatsLeft !== undefined ? { seatsLeft: metadata.seatsLeft } : {}),
      ...(metadata.announcementFile !== undefined ? { announcementFile: metadata.announcementFile } : {}),
      ...(metadata.budget !== undefined ? { budget: metadata.budget } : {}),
      ...(metadata.province !== undefined ? { province: metadata.province } : {}),
      ...(metadata.fiscalYear !== undefined ? { fiscalYear: metadata.fiscalYear } : {}),
      ...(metadata.isHistorical !== undefined ? { isHistorical: metadata.isHistorical } : {}),
      ...(metadata.historicalCompleted !== undefined ? { historicalCompleted: metadata.historicalCompleted } : {}),
      ...(metadata.historicalApplicants !== undefined ? { historicalApplicants: metadata.historicalApplicants } : {}),
      ...(metadata.status !== undefined ? { status: metadata.status } : {}),
    };
  }
  return payload;
}

interface CoursesState {
  courses: Course[];
  revision: number;
}

const STORAGE_KEY = "sat-courses-v10";
const LEGACY_COURSE_KEYS = ["sat-courses-v9", "sat-courses-v8", "sat-courses-v7", "sat-courses-v6", "sat-courses-v5", "sat-courses-v4"];
const lastLocalEditByCourseId = new Map<number, number>();

function markCourseEditedLocally(courseId: number) {
  lastLocalEditByCourseId.set(courseId, Date.now());
}

function isCourseRecentlyEditedLocally(courseId: number, windowMs = 8000): boolean {
  const ts = lastLocalEditByCourseId.get(courseId);
  return typeof ts === "number" && Date.now() - ts < windowMs;
}

function cloneSeedCourses() {
  return seedCourses.map((course) => ({ ...course }));
}

const INITIAL_STATE: CoursesState = {
  courses: cloneSeedCourses(),
  revision: 0,
};

let state: CoursesState = INITIAL_STATE;
let hydrateStarted = false;
let hasLoadedFromCloud = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function saveToLocalStorage(): boolean {
  if (typeof window === "undefined") return true;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.courses));
    return true;
  } catch {
    return false;
  }
}

function syncCoursesSubsetToServer(subset: Course[], deleteIds?: number[]) {
  if (typeof window === "undefined") return;
  if (
    (hasLoadedFromCloud || !isSupabaseConfigured()) &&
    window.sessionStorage.getItem("sat-admin-authenticated") === "true"
  ) {
    fetch("/api/admin/save-defaults", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-authorized": "true",
      },
      body: JSON.stringify({
        courses: subset,
        partialUpdate: true,
        ...(deleteIds && deleteIds.length > 0 ? { deleteCourseIds: deleteIds } : {}),
      }),
    }).catch(() => {
      // Ignore background sync errors in static/read-only environments
    });
  }
}

function persist(syncToServer = false): boolean {
  if (typeof window === "undefined") return true;
  const savedLocal = saveToLocalStorage();
  if (!savedLocal) {
    // Storage may be unavailable in private mode or full; the in-memory store still works.
    return false;
  }
  if (
    syncToServer &&
    (hasLoadedFromCloud || !isSupabaseConfigured()) &&
    window.sessionStorage.getItem("sat-admin-authenticated") === "true"
  ) {
    fetch("/api/admin/save-defaults", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-authorized": "true",
      },
      body: JSON.stringify({ courses: state.courses }),
    }).catch(() => {
      // Ignore background sync errors in static/read-only environments
    });
  }
  return true;
}

/**
 * Accept only images uploaded by an admin (data URLs) or files bundled in
 * `public/assets`. Anything else falls back to the seed image.
 */
export function isAllowedCourseImage(value: unknown): value is string {
  return (
    typeof value === "string" &&
    (value.startsWith("data:image/") ||
      value.startsWith("/assets/") ||
      value.startsWith("https://") ||
      value.startsWith("http://"))
  );
}

export function getSeedCourse(id: number) {
  return seedCourses.find((course) => course.id === id);
}

function mergeStoredCourses(stored: Course[]): Course[] {
  const globalSched = getGlobalCourseSchedule(stored);
  const mergedIds = new Set<number>();

  const list = stored.map((saved): Course => {
    mergedIds.add(saved.id);
    const seed = getSeedCourse(saved.id);
    const isLegacySeedPath =
      saved.image === "/assets/course-national-coach.png" ||
      saved.image === "/assets/course-professional-referee.png" ||
      saved.image === "/assets/course-basic-sports-science.png" ||
      saved.image === "/assets/course-sports-management.png" ||
      saved.image === "/assets/course-sports-psychology.png";

    const customImage =
      isAllowedCourseImage(saved.image) && !isLegacySeedPath
        ? saved.image
        : undefined;
    const isCustom = Boolean(saved.useCustomSchedule ?? seed?.useCustomSchedule);
    const seedDate = seed?.date;
    const finalDate =
      saved.id === 3 && saved.date === "1-3 ธ.ค. 2569"
        ? (seedDate || "20-22 ม.ค. 2570")
        : (saved.date || seedDate || "");

    const cap = Number(saved.seats?.match(/\d+/)?.[0]) || saved.capacity || seed?.capacity || 40;
    const seedQuotas = seed?.targetQuotas ?? balanceQuotasToCapacity(cap);
    const finalStoredQuotas = saved.targetQuotas ?? seedQuotas;
    const finalLoc = saved.location || seed?.location || "";

    return {
      ...(seed ?? {}),
      ...saved,
      id: saved.id,
      title: saved.title || seed?.title || "",
      shortTitle:
        saved.shortTitle === "วิทยาศาสตร์การกีฬา" && saved.title?.includes("งบประมาณ")
          ? "งบประมาณและพัสดุ"
          : saved.shortTitle !== undefined
          ? saved.shortTitle
          : seed?.shortTitle,
      location: finalLoc,
      province: (() => {
        const detectedProv = detectProvinceFromLocation(finalLoc);
        if (detectedProv && finalLoc.includes("จ.") && saved.province && !saved.province.includes(detectedProv)) {
          return detectedProv;
        }
        return saved.province || seed?.province || detectedProv || "กรุงเทพมหานคร";
      })(),
      budget: saved.budget !== undefined ? saved.budget : seed?.budget,
      historicalCompleted: saved.historicalCompleted !== undefined ? saved.historicalCompleted : seed?.historicalCompleted,
      historicalApplicants: saved.historicalApplicants !== undefined ? saved.historicalApplicants : seed?.historicalApplicants,
      date: saved.date || finalDate,
      seats: saved.seats || seed?.seats || `จำนวนที่นั่ง ${cap} คน`,
      targetQuotas: finalStoredQuotas,
      isHistorical: saved.isHistorical !== undefined ? saved.isHistorical : (saved.id >= 100 ? true : (seed?.isHistorical ?? false)),
      fiscalYear: saved.fiscalYear || seed?.fiscalYear || getCourseFiscalYear(saved),
      image: customImage ?? seed?.image ?? "/assets/course-executive-management.jpg",
      imageAlt: saved.imageAlt || seed?.imageAlt || `${saved.title || seed?.title} - รูปประกอบ`,
      useCustomSchedule: isCustom,
      registrationDate: isCustom
        ? saved.registrationDate || seed?.registrationDate || globalSched.registrationDate
        : globalSched.registrationDate,
      resultDate: isCustom
        ? saved.resultDate || seed?.resultDate || globalSched.resultDate
        : globalSched.resultDate,
      courseObjective:
        saved.courseObjective !== undefined
          ? saved.courseObjective
          : seed?.courseObjective,
      qualifications:
        saved.qualifications !== undefined
          ? saved.qualifications
          : (seed?.qualifications ?? []),
      requiredDocuments:
        saved.requiredDocuments !== undefined
          ? saved.requiredDocuments
          : (seed?.requiredDocuments ?? []),
      evaluationCriteria:
        saved.evaluationCriteria !== undefined
          ? saved.evaluationCriteria
          : (seed?.evaluationCriteria ?? []),
      satSupport:
        saved.satSupport !== undefined
          ? saved.satSupport
          : (seed?.satSupport ?? [...DEFAULT_SAT_SUPPORT]),
      expensesPolicy:
        saved.expensesPolicy !== undefined
          ? saved.expensesPolicy
          : (seed?.expensesPolicy ?? DEFAULT_EXPENSES_POLICY),
      documentConfig: saved.documentConfig
        ? {
            photo: {
              ...DEFAULT_DOCUMENT_CONFIG.photo,
              ...(seed?.documentConfig?.photo || {}),
              ...saved.documentConfig.photo,
            },
            cover: {
              ...DEFAULT_DOCUMENT_CONFIG.cover,
              ...(seed?.documentConfig?.cover || {}),
              ...saved.documentConfig.cover,
            },
            certificate: {
              ...DEFAULT_DOCUMENT_CONFIG.certificate,
              ...(seed?.documentConfig?.certificate || {}),
              ...saved.documentConfig.certificate,
            },
            idcard: {
              ...DEFAULT_DOCUMENT_CONFIG.idcard,
              ...(seed?.documentConfig?.idcard || {}),
              ...(saved.documentConfig.idcard || {}),
            },
            saka: mergeCourseSakaConfig(
              { id: saved.id, title: saved.title || seed?.title || "" },
              seed?.documentConfig?.saka,
              saved.documentConfig.saka
            ),
          }
        : seed?.documentConfig,
      warningMessage:
        saved.warningMessage !== undefined
          ? (saved.warningMessage.trim() || undefined)
          : undefined,
      status:
        saved.status === "full"
          ? "full"
          : saved.status === "completed"
          ? "completed"
          : saved.status === "closed"
          ? "closed"
          : "open",
      capacity: cap,
      seatsLeft:
        saved.status === "full"
          ? undefined
          : typeof saved.seatsLeft === "number"
          ? Math.min(cap, saved.seatsLeft)
          : seed?.seatsLeft !== undefined
          ? Math.min(cap, seed.seatsLeft)
          : cap,
    };
  });

  // แนบ seedCourses ที่ยังไม่มีใน stored ให้ครบถ้วน
  seedCourses.forEach((sc) => {
    if (!mergedIds.has(sc.id)) {
      list.push({ ...sc });
    }
  });

  return list;
}

function mapCloudCourse(
  c: import("@/lib/supabase/types").Database["public"]["Tables"]["courses"]["Row"],
  existingCourses: Course[]
): Course {
  const parsedCap = Number(c.seats?.match(/\d+/)?.[0]);
  const cap = Number.isFinite(parsedCap) && parsedCap > 0 ? parsedCap : 40;
  const seed = getSeedCourse(c.id);
  const existing = existingCourses.find((item) => item.id === c.id);

  // ป้องกันการเขียนทับเฉพาะกรณีที่แอดมินเพิ่งกดบันทึกหลักสูตรนี้ในแท็บนี้ไม่เกิน 8 วินาที (ระหว่างรอคำสั่งอัปเดต Cloud เสร็จสิ้น)
  const cloudUpdatedAt = (c as { updated_at?: string }).updated_at;
  if (existing && isCourseRecentlyEditedLocally(c.id, 8000)) {
    return existing;
  }

  const isOldCloudMock = c.id === 3 && c.date === "1-3 ธ.ค. 2569";
  const finalDate = isOldCloudMock ? (seed?.date || "20-22 ม.ค. 2570") : (c.date || seed?.date || "");
  const finalTitle = c.title || seed?.title || "";
  const finalLocation = c.location || seed?.location || "";
  const finalSeats = c.seats || seed?.seats || `จำนวนที่นั่ง ${cap} คน`;

  const rawCloudQuotas = (c as { target_quotas?: any }).target_quotas;
  if (rawCloudQuotas?._globalTimeline && typeof rawCloudQuotas._globalTimeline === "object") {
    cachedGlobalTimelineByCourseId.set(c.id, rawCloudQuotas._globalTimeline);
  }
  if (rawCloudQuotas?._reviews && typeof rawCloudQuotas._reviews === "object") {
    const existing = cachedReviewsByCourseId.get(c.id) || {};
    cachedReviewsByCourseId.set(c.id, {
      ...existing,
      ...rawCloudQuotas._reviews,
    });
  }
  const cloudSchedule = rawCloudQuotas?._schedule as EmbeddedSchedule | undefined;
  const cloudMeta = rawCloudQuotas?._metadata as Record<string, any> | undefined;

  const colRegDate = (c as { registration_date?: string }).registration_date;
  const colResDate = (c as { result_date?: string }).result_date;
  const colUseCustom = (c as { use_custom_schedule?: boolean }).use_custom_schedule;

  const cloudSchedReg = colRegDate || cloudSchedule?.registrationDate;
  const cloudSchedRes = colResDate || cloudSchedule?.resultDate;
  const cloudSchedCustom =
    colUseCustom !== undefined ? colUseCustom : cloudSchedule?.useCustomSchedule;

  const finalRegDate =
    cloudSchedReg || existing?.registrationDate || seed?.registrationDate || DEFAULT_GLOBAL_REGISTRATION_DATE;

  const finalResDate =
    cloudSchedRes || existing?.resultDate || seed?.resultDate || DEFAULT_GLOBAL_RESULT_DATE;

  const finalUseCustom =
    cloudSchedCustom !== undefined
      ? cloudSchedCustom
      : Boolean(existing?.useCustomSchedule ?? seed?.useCustomSchedule);

  const cleanCloudQ = sanitizeQuotas(rawCloudQuotas, cap);
  const finalQuotas =
    cleanCloudQ || existing?.targetQuotas || seed?.targetQuotas || balanceQuotasToCapacity(cap);

  const finalCourseObjective =
    cloudMeta?.courseObjective !== undefined
      ? cloudMeta.courseObjective
      : (c as { course_objective?: string }).course_objective !== undefined
      ? (c as { course_objective?: string }).course_objective
      : (existing?.courseObjective ?? seed?.courseObjective);

  const finalQualifications =
    cloudMeta?.qualifications !== undefined
      ? cloudMeta.qualifications
      : (existing?.qualifications ?? seed?.qualifications ?? []);

  const finalRequiredDocuments =
    cloudMeta?.requiredDocuments !== undefined
      ? cloudMeta.requiredDocuments
      : (existing?.requiredDocuments ?? seed?.requiredDocuments ?? []);

  const finalEvaluationCriteria =
    cloudMeta?.evaluationCriteria !== undefined
      ? cloudMeta.evaluationCriteria
      : (existing?.evaluationCriteria ?? seed?.evaluationCriteria ?? []);

  const finalSatSupport =
    cloudMeta?.satSupport !== undefined
      ? cloudMeta.satSupport
      : (existing?.satSupport ?? seed?.satSupport ?? [...DEFAULT_SAT_SUPPORT]);

  const finalExpensesPolicy =
    cloudMeta?.expensesPolicy !== undefined
      ? cloudMeta.expensesPolicy
      : (existing?.expensesPolicy ?? seed?.expensesPolicy ?? DEFAULT_EXPENSES_POLICY);

  const rawSeatsLeft =
    typeof c.seats_left === "number"
      ? c.seats_left
      : typeof cloudMeta?.seatsLeft === "number"
      ? cloudMeta.seatsLeft
      : (existing?.seatsLeft ?? seed?.seatsLeft ?? cap);
  const finalSeatsLeft = c.status === "full" ? undefined : Math.min(cap, rawSeatsLeft);

  const cloudDocConfig =
    (c as { document_config?: import("@/lib/courses").CourseDocumentConfig }).document_config ||
    cloudMeta?.documentConfig ||
    existing?.documentConfig;

  return {
    ...(seed ?? {}),
    id: c.id,
    title: finalTitle,
    shortTitle:
      (c as { short_title?: string }).short_title || seed?.shortTitle || existing?.shortTitle,
    date: finalDate,
    location: finalLocation,
    seats: finalSeats,
    capacity: cap,
    seatsLeft: finalSeatsLeft,
    status:
      cloudMeta?.status === "completed" ||
      Boolean(cloudMeta?.isHistorical ?? (c.id >= 100))
        ? "completed"
        : c.status === "full"
        ? "full"
        : c.status === "closed"
        ? "closed"
        : "open",
    updatedAt: cloudUpdatedAt || existing?.updatedAt,
    image: (c.image && !c.image.includes("course-executive-management.jpg") ? c.image : (seed?.image || c.image)) || "/assets/course-executive-management.jpg",
    imageAlt: c.image_alt || seed?.imageAlt || `${finalTitle} - รูปประกอบ`,
    warningMessage:
      c.id === 1 && c.warning_message?.includes("ต้องมีใบประกอบวิชาชีพ")
        ? undefined
        : c.warning_message !== undefined
        ? (c.warning_message?.trim() || undefined)
        : undefined,
    targetQuotas: sanitizeQuotas(finalQuotas, cap),
    registrationDate: finalRegDate,
    resultDate: finalResDate,
    useCustomSchedule: finalUseCustom,
    courseObjective: finalCourseObjective,
    qualifications: finalQualifications,
    requiredDocuments: finalRequiredDocuments,
    evaluationCriteria: finalEvaluationCriteria,
    satSupport: finalSatSupport,
    expensesPolicy: finalExpensesPolicy,
    documentConfig: cloudDocConfig
      ? {
          photo: {
            ...DEFAULT_DOCUMENT_CONFIG.photo,
            ...(seed?.documentConfig?.photo || {}),
            ...(cloudDocConfig.photo || {}),
          },
          cover: {
            ...DEFAULT_DOCUMENT_CONFIG.cover,
            ...(seed?.documentConfig?.cover || {}),
            ...(cloudDocConfig.cover || {}),
          },
          certificate: {
            ...DEFAULT_DOCUMENT_CONFIG.certificate,
            ...(seed?.documentConfig?.certificate || {}),
            ...(cloudDocConfig.certificate || {}),
          },
          idcard: {
            ...DEFAULT_DOCUMENT_CONFIG.idcard,
            ...(seed?.documentConfig?.idcard || {}),
            ...(cloudDocConfig.idcard || {}),
          },
          saka: mergeCourseSakaConfig(
            { id: c.id, title: finalTitle },
            seed?.documentConfig?.saka,
            cloudDocConfig.saka
          ),
        }
      : seed?.documentConfig,
    announcementFile: (() => {
      const rawAnn =
        cloudMeta && cloudMeta.announcementFile !== undefined
          ? (cloudMeta.announcementFile as import("@/lib/courses").CourseAnnouncementFile)
          : existing?.announcementFile ?? seed?.announcementFile ?? null;
      if (!rawAnn) return null;
      if (rawAnn.dataUrl?.includes("/sat-documents/")) {
        return {
          ...rawAnn,
          dataUrl: `/api/announcements/${c.id}`,
        };
      }
      return rawAnn;
    })(),
    budget:
      cloudMeta?.budget !== undefined
        ? Number(cloudMeta.budget)
        : existing?.budget ?? seed?.budget ?? undefined,
    province: (() => {
      const detected = detectProvinceFromLocation(finalLocation);
      if (detected && finalLocation.includes("จ.") && cloudMeta?.province && !String(cloudMeta.province).includes(detected)) {
        return detected;
      }
      return cloudMeta?.province !== undefined
        ? String(cloudMeta.province)
        : existing?.province ?? seed?.province ?? detected ?? "กรุงเทพมหานคร";
    })(),
    fiscalYear:
      cloudMeta?.fiscalYear !== undefined
        ? String(cloudMeta.fiscalYear)
        : existing?.fiscalYear ?? seed?.fiscalYear ?? getCourseFiscalYear(existing ?? seed ?? ({ date: finalDate } as Course)),
    isHistorical:
      cloudMeta?.isHistorical !== undefined
        ? Boolean(cloudMeta.isHistorical)
        : (c.id >= 100 ? true : (existing?.isHistorical ?? seed?.isHistorical ?? false)),
    historicalCompleted:
      cloudMeta?.historicalCompleted !== undefined
        ? Number(cloudMeta.historicalCompleted)
        : existing?.historicalCompleted ?? seed?.historicalCompleted ?? undefined,
    historicalApplicants:
      cloudMeta?.historicalApplicants !== undefined
        ? Number(cloudMeta.historicalApplicants)
        : existing?.historicalApplicants ?? seed?.historicalApplicants ?? undefined,
  };
}

let realtimeSubscribed = false;
let lastCoursesFetchAt = 0;

async function pushCourseToSupabase(course: Course): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  const nowIso = new Date().toISOString();

  // อ่าน target_quotas ล่าสุดจาก Cloud ก่อนอัปเดต เพื่อป้องกันการเขียนทับ _globalTimeline / _reviews ที่เครื่องอื่นเพิ่งบันทึก
  try {
    const { data: latestRow } = await supabase
      .from("courses")
      .select("target_quotas")
      .eq("id", course.id)
      .maybeSingle();
    const latestQuotas =
      latestRow?.target_quotas && typeof latestRow.target_quotas === "object"
        ? (latestRow.target_quotas as Record<string, unknown>)
        : null;
    if (latestQuotas?._globalTimeline && typeof latestQuotas._globalTimeline === "object") {
      cachedGlobalTimelineByCourseId.set(
        course.id,
        latestQuotas._globalTimeline as Record<string, unknown>
      );
    }
    if (latestQuotas?._reviews && typeof latestQuotas._reviews === "object") {
      const existingCachedReviews = cachedReviewsByCourseId.get(course.id) || {};
      cachedReviewsByCourseId.set(course.id, {
        ...existingCachedReviews,
        ...(latestQuotas._reviews as Record<string, unknown>),
      });
    }
  } catch {
    // ใช้ cache เดิมในหน่วยความจำหากอ่านไม่สำเร็จ
  }

  const quotasPayload = buildQuotasPayload(
    course.targetQuotas,
    {
      registrationDate: course.registrationDate,
      resultDate: course.resultDate,
      useCustomSchedule: course.useCustomSchedule,
      updatedAt: nowIso,
    },
    course.capacity || 40,
    {
      courseObjective: course.courseObjective,
      qualifications: course.qualifications,
      requiredDocuments: course.requiredDocuments,
      evaluationCriteria: course.evaluationCriteria,
      satSupport: course.satSupport,
      expensesPolicy: course.expensesPolicy,
      documentConfig: course.documentConfig,
      seatsLeft: course.seatsLeft,
      announcementFile: course.announcementFile,
      budget: course.budget,
      province: course.province,
      fiscalYear: course.fiscalYear,
      isHistorical: course.isHistorical,
      historicalCompleted: course.historicalCompleted,
      historicalApplicants: course.historicalApplicants,
      status: course.status,
    },
    course.id
  );
  const { error } = await supabase
    .from("courses")
    .upsert(
      {
        id: course.id,
        title: course.title,
        short_title: course.shortTitle ?? null,
        date: course.date,
        location: course.location,
        seats: course.seats,
        seats_left: course.seatsLeft ?? 0,
        status: course.status === "completed" ? "closed" : course.status,
        image: course.image,
        warning_message:
          course.warningMessage && course.warningMessage.trim()
            ? course.warningMessage.trim()
            : null,
        target_quotas: quotasPayload as unknown as import("@/lib/supabase/types").Json,
        updated_at: nowIso,
      },
      { onConflict: "id" }
    );
  return !error;
}

export async function syncAllCoursesToCloud(): Promise<boolean> {
  let allOk = true;
  for (const course of state.courses) {
    markCourseEditedLocally(course.id);
    const ok = await pushCourseToSupabase(course);
    if (!ok) allOk = false;
  }
  if (typeof window !== "undefined") {
    fetch("/api/admin/save-defaults", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-authorized": "true",
      },
      body: JSON.stringify({ courses: state.courses }),
    }).catch(() => {});
  }
  return allOk;
}

export async function refreshCoursesFromCloud(force = false): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const now = Date.now();
  if (!force && now - lastCoursesFetchAt < 1500) return;
  lastCoursesFetchAt = now;

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      ?.from("courses")
      .select("*")
      .order("id") ?? Promise.resolve({ data: null, error: null }));
    if (error) {
      console.warn("Failed to fetch courses from Supabase:", error.message);
      return;
    }
    if (data && data.length > 0) {
      hasLoadedFromCloud = true;
      const cloudCourseMap = new Map<number, Course>();
      data.forEach((c) => {
        const mapped = mapCloudCourse(c, state.courses);
        cloudCourseMap.set(mapped.id, mapped);
      });

      const cloudCourses = Array.from(cloudCourseMap.values()).sort((a, b) => {
        if (a.id < 100 && b.id >= 100) return -1;
        if (a.id >= 100 && b.id < 100) return 1;
        return a.id - b.id;
      });
      state = {
        courses: cloudCourses,
        revision: state.revision + 1,
      };
      saveToLocalStorage();
      emit();
    } else if (data && data.length === 0) {
      hasLoadedFromCloud = true;
      const isAdminSession =
        typeof window !== "undefined" &&
        window.sessionStorage.getItem("sat-admin-authenticated") === "true";
      if (isAdminSession) {
        for (const sc of seedCourses) {
          void pushCourseToSupabase(sc);
        }
      }
    }
  } catch (err) {
    console.warn("Failed to refresh courses from cloud:", err);
  }
}

function subscribeToCoursesRealtime() {
  if (realtimeSubscribed || typeof window === "undefined" || !isSupabaseConfigured()) return;
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    realtimeSubscribed = true;
    supabase
      .channel("sat-courses-realtime-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "courses" },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            const row = payload.new as import("./supabase/types").Database["public"]["Tables"]["courses"]["Row"];
            if (!row || typeof row.id !== "number") return;
            const updated = mapCloudCourse(row, state.courses);
            state = {
              courses: state.courses.map((c) => (c.id === updated.id ? updated : c)),
              revision: state.revision + 1,
            };
            saveToLocalStorage();
            emit();
          } else if (payload.eventType === "INSERT") {
            const row = payload.new as import("./supabase/types").Database["public"]["Tables"]["courses"]["Row"];
            if (!row || typeof row.id !== "number") return;
            if (!state.courses.some((c) => c.id === row.id)) {
              const inserted = mapCloudCourse(row, state.courses);
              state = {
                courses: [...state.courses, inserted],
                revision: state.revision + 1,
              };
              saveToLocalStorage();
              emit();
            }
          } else if (payload.eventType === "DELETE") {
            const oldId = (payload.old as { id?: number })?.id;
            if (typeof oldId === "number") {
              state = {
                courses: state.courses.filter((c) => c.id !== oldId),
                revision: state.revision + 1,
              };
              saveToLocalStorage();
              emit();
            }
          }
        }
      )
      .subscribe();

    // ซิงก์ข้อมูลล่าสุดจาก Cloud อัตโนมัติทุกครั้งที่ผู้ใช้สลับกลับมาที่หน้าต่างหรือแท็บเบราว์เซอร์
    const handleFocusOrVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshCoursesFromCloud();
      }
    };
    window.addEventListener("focus", handleFocusOrVisible);
    document.addEventListener("visibilitychange", handleFocusOrVisible);
  } catch (err) {
    console.warn("Failed to subscribe to courses realtime:", err);
  }
}

function hydrate() {
  if (hydrateStarted || typeof window === "undefined") return;
  hydrateStarted = true;

  try {
    const isAdminSession =
      window.sessionStorage.getItem("sat-admin-authenticated") === "true";
    let raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw && isAdminSession) {
      // สำหรับเครื่องแอดมิน: ตรวจสอบคีย์รุ่นเก่าทั้งหมดและกู้คืนข้อมูลรายละเอียดหลักสูตรที่เคยแก้ไขไว้
      const rescuedByCourseId = new Map<number, Course>();
      for (const legacyKey of LEGACY_COURSE_KEYS) {
        try {
          const legacyRaw = window.localStorage.getItem(legacyKey);
          if (!legacyRaw) continue;
          const legacyParsed = JSON.parse(legacyRaw) as unknown;
          if (!Array.isArray(legacyParsed)) continue;
          for (const item of legacyParsed as Course[]) {
            if (!item || typeof item.id !== "number") continue;
            const seed = getSeedCourse(item.id);
            const hasCustomMeta =
              item.courseObjective &&
              item.courseObjective.trim() !== (seed?.courseObjective ?? "").trim();
            if (!rescuedByCourseId.has(item.id) || hasCustomMeta) {
              rescuedByCourseId.set(item.id, item);
            }
          }
        } catch {}
      }
      if (rescuedByCourseId.size > 0) {
        raw = JSON.stringify(Array.from(rescuedByCourseId.values()));
        window.localStorage.setItem(STORAGE_KEY, raw);
      }
    }

    for (const legacyKey of LEGACY_COURSE_KEYS) {
      try {
        window.localStorage.removeItem(legacyKey);
      } catch {}
    }

    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (
        Array.isArray(parsed) &&
        parsed.every(
          (item) =>
            typeof item === "object" &&
            item !== null &&
            typeof (item as Course).id === "number" &&
            typeof (item as Course).title === "string"
        )
      ) {
        state = {
          courses: mergeStoredCourses(parsed as Course[]),
          revision: state.revision + 1,
        };
        emit();
      }
    }
  } catch {
    state = {
      courses: cloneSeedCourses(),
      revision: state.revision + 1,
    };
    emit();
  }

  // ดึงข้อมูลล่าสุดจาก Supabase Cloud เสมอเพื่อให้ทุกเครื่องแสดงผลตรงกัน 100%
  void refreshCoursesFromCloud();
  subscribeToCoursesRealtime();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  hydrate();

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    hydrateStarted = false;
    hydrate();
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function getSnapshot() {
  return state;
}

function getServerSnapshot() {
  return INITIAL_STATE;
}

export function useCourses() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export type CourseUpdate = Partial<
  Pick<
    Course,
    | "status"
    | "capacity"
    | "seatsLeft"
    | "title"
    | "shortTitle"
    | "useCustomSchedule"
    | "registrationDate"
    | "resultDate"
    | "date"
    | "location"
    | "seats"
    | "warningMessage"
    | "image"
    | "targetQuotas"
    | "courseObjective"
    | "qualifications"
    | "requiredDocuments"
    | "evaluationCriteria"
    | "satSupport"
    | "expensesPolicy"
    | "documentConfig"
    | "announcementFile"
    | "budget"
    | "province"
    | "fiscalYear"
    | "isHistorical"
    | "historicalCompleted"
    | "historicalApplicants"
  >
>;

export interface UpdateCourseResult {
  course: Course;
  /** `false` when the browser refused to save (e.g. storage quota exceeded). */
  persisted: boolean;
}

export function updateCourse(
  id: number,
  patch: CourseUpdate
): UpdateCourseResult | undefined {
  let updated: Course | undefined;

  // หากบันทึกในโหมด "ใช้กำหนดการกลาง" (useCustomSchedule === false)
  // ให้ซิงก์วันเปิดรับสมัครและวันประกาศผลไปยังทุกหลักสูตรที่ใช้กำหนดการกลางด้วยทันที
  const syncGlobalSchedule =
    patch.useCustomSchedule === false &&
    (patch.registrationDate !== undefined || patch.resultDate !== undefined);
  const nextGlobalReg = patch.registrationDate?.trim();
  const nextGlobalRes = patch.resultDate?.trim();

  const nextCourses = state.courses.map((course) => {
    if (course.id !== id) {
      if (syncGlobalSchedule && !course.useCustomSchedule) {
        return {
          ...course,
          ...(nextGlobalReg ? { registrationDate: nextGlobalReg } : {}),
          ...(nextGlobalRes ? { resultDate: nextGlobalRes } : {}),
        };
      }
      return course;
    }

    const nextImage =
      patch.image === undefined
        ? course.image
        : isAllowedCourseImage(patch.image)
          ? patch.image
          : (getSeedCourse(course.id)?.image ?? course.image);

    const parsedCap = Number((patch.seats ?? course.seats)?.match(/\d+/)?.[0]);
    const updatedCapacity = Number.isFinite(parsedCap) && parsedCap > 0
      ? parsedCap
      : patch.capacity !== undefined
        ? patch.capacity
        : course.capacity;

    const remaining =
      patch.status === "full"
        ? undefined
        : patch.seatsLeft !== undefined
          ? Math.min(updatedCapacity, patch.seatsLeft)
          : Math.min(updatedCapacity, course.seatsLeft ?? updatedCapacity);

    const nextDate = patch.date !== undefined ? patch.date : course.date;
    const nextIsHistorical =
      patch.isHistorical !== undefined ? patch.isHistorical : course.isHistorical;
    const nextFiscalYear =
      patch.fiscalYear !== undefined
        ? patch.fiscalYear.trim() || undefined
        : patch.date !== undefined
          ? deriveFiscalYearFromDate(nextDate, nextIsHistorical)
          : course.fiscalYear;

    updated = {
      ...course,
      ...patch,
      id: course.id,
      capacity: updatedCapacity,
      seatsLeft: remaining,
      fiscalYear: nextFiscalYear,
      updatedAt: new Date().toISOString(),
      image: nextImage,
      imageAlt: course.imageAlt,
      shortTitle:
        patch.shortTitle !== undefined
          ? patch.shortTitle.trim() || undefined
          : course.shortTitle,
      warningMessage:
        patch.warningMessage !== undefined
          ? patch.warningMessage.trim() || undefined
          : course.warningMessage,
      useCustomSchedule:
        patch.useCustomSchedule !== undefined
          ? patch.useCustomSchedule
          : course.useCustomSchedule,
      registrationDate:
        patch.registrationDate !== undefined
          ? patch.registrationDate.trim() || undefined
          : course.registrationDate,
      resultDate:
        patch.resultDate !== undefined
          ? patch.resultDate.trim() || undefined
          : course.resultDate,
      targetQuotas:
        patch.targetQuotas !== undefined
          ? patch.targetQuotas
          : course.targetQuotas,
      courseObjective:
        patch.courseObjective !== undefined
          ? patch.courseObjective
          : course.courseObjective,
      qualifications:
        patch.qualifications !== undefined
          ? patch.qualifications
          : course.qualifications,
      requiredDocuments:
        patch.requiredDocuments !== undefined
          ? patch.requiredDocuments
          : course.requiredDocuments,
      evaluationCriteria:
        patch.evaluationCriteria !== undefined
          ? patch.evaluationCriteria
          : course.evaluationCriteria,
      satSupport:
        patch.satSupport !== undefined
          ? patch.satSupport
          : course.satSupport,
      expensesPolicy:
        patch.expensesPolicy !== undefined
          ? patch.expensesPolicy
          : course.expensesPolicy,
      documentConfig:
        patch.documentConfig !== undefined
          ? patch.documentConfig
          : course.documentConfig,
      announcementFile:
        patch.announcementFile !== undefined
          ? patch.announcementFile
          : course.announcementFile,
    };

    return updated;
  });

  if (!updated) return undefined;

  markCourseEditedLocally(id);
  if (syncGlobalSchedule) {
    nextCourses.forEach((c) => {
      if (c.id !== id && !c.isHistorical && !c.useCustomSchedule) {
        markCourseEditedLocally(c.id);
      }
    });
  }
  const previousState = state;
  state = {
    courses: nextCourses,
    revision: state.revision + 1,
  };
  const persisted = saveToLocalStorage();

  if (!persisted && patch.image?.startsWith("data:image/")) {
    // Roll back so the UI never shows an image that will disappear on reload.
    state = previousState;
    return { course: updated, persisted: false };
  }

  syncCoursesSubsetToServer(
    syncGlobalSchedule
      ? nextCourses.filter((c) => c.id === id || (!c.isHistorical && !c.useCustomSchedule))
      : [updated]
  );

  emit();

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    const quotasPayload = buildQuotasPayload(
      updated.targetQuotas,
      {
        registrationDate: updated.registrationDate,
        resultDate: updated.resultDate,
        useCustomSchedule: updated.useCustomSchedule,
        updatedAt: updated.updatedAt,
      },
      updated.capacity || 40,
      {
        courseObjective: updated.courseObjective,
        qualifications: updated.qualifications,
        requiredDocuments: updated.requiredDocuments,
        evaluationCriteria: updated.evaluationCriteria,
        satSupport: updated.satSupport,
        expensesPolicy: updated.expensesPolicy,
        documentConfig: updated.documentConfig,
        seatsLeft: updated.seatsLeft,
        announcementFile: updated.announcementFile,
        budget: updated.budget,
        province: updated.province,
        fiscalYear: updated.fiscalYear,
        isHistorical: updated.isHistorical,
        historicalCompleted: updated.historicalCompleted,
        historicalApplicants: updated.historicalApplicants,
        status: updated.status,
      },
      id
    );

    supabase
      ?.from("courses")
      .upsert(
        {
          id: updated.id,
          title: updated.title,
          short_title: updated.shortTitle ?? null,
          date: updated.date,
          location: updated.location,
          seats: updated.seats,
          seats_left: updated.seatsLeft ?? 0,
          status: updated.status === "completed" ? "closed" : updated.status,
          image: updated.image,
          warning_message: updated.warningMessage && updated.warningMessage.trim() ? updated.warningMessage.trim() : null,
          target_quotas: quotasPayload as unknown as import("@/lib/supabase/types").Json,
          updated_at: updated.updatedAt,
        },
        { onConflict: "id" }
      )
      .select()
      .then(
        (res) => {
          if (res.error) {
            console.warn("Supabase course update error:", res.error.message);
          } else if (!res.data || res.data.length === 0) {
            console.warn("Supabase course update warning: 0 rows modified (check RLS policy on courses table).");
          }
        },
        (err: unknown) => {
          console.warn("Supabase course update failed:", err);
        }
      );

    if (syncGlobalSchedule) {
      nextCourses.forEach((other) => {
        if (other.id !== id && !other.isHistorical && !other.useCustomSchedule) {
          const otherPayload = buildQuotasPayload(
            other.targetQuotas,
            {
              registrationDate: other.registrationDate,
              resultDate: other.resultDate,
              useCustomSchedule: false,
              updatedAt: updated!.updatedAt,
            },
            other.capacity || 40,
            {
              courseObjective: other.courseObjective,
              qualifications: other.qualifications,
              requiredDocuments: other.requiredDocuments,
              evaluationCriteria: other.evaluationCriteria,
              satSupport: other.satSupport,
              expensesPolicy: other.expensesPolicy,
              documentConfig: other.documentConfig,
              seatsLeft: other.seatsLeft,
              announcementFile: other.announcementFile,
              budget: other.budget,
              province: other.province,
              fiscalYear: other.fiscalYear,
              isHistorical: other.isHistorical,
              historicalCompleted: other.historicalCompleted,
              historicalApplicants: other.historicalApplicants,
              status: other.status,
            },
            other.id
          );
          supabase
            ?.from("courses")
            .update({
              target_quotas: otherPayload as unknown as import("@/lib/supabase/types").Json,
              updated_at: updated!.updatedAt,
            })
            .eq("id", other.id)
            .then();
        }
      });
    }
  }

  return { course: updated, persisted };
}

export function addCourse(
  data: CourseUpdate & { title: string }
): UpdateCourseResult {
  const maxId = state.courses.reduce(
    (max, course) => Math.max(max, course.id),
    0
  );
  const newId = maxId + 1;
  const parsedCap = Number(data.seats?.match(/\d+/)?.[0]);
  const capacity = Number.isFinite(parsedCap) && parsedCap > 0 ? parsedCap : (data.capacity ?? 40);
  const seatsLeft = data.status === "full" ? undefined : Math.min(capacity, data.seatsLeft ?? capacity);

  const globalSched = getGlobalCourseSchedule(state.courses);
  const useCustom = Boolean(data.useCustomSchedule);

  const newCourse: Course = {
    id: newId,
    title: data.title.trim(),
    shortTitle: data.shortTitle?.trim() || data.title.trim().slice(0, 20),
    useCustomSchedule: useCustom,
    registrationDate: useCustom
      ? data.registrationDate?.trim() || globalSched.registrationDate
      : globalSched.registrationDate,
    resultDate: useCustom
      ? data.resultDate?.trim() || globalSched.resultDate
      : globalSched.resultDate,
    date: data.date?.trim() || "1 - 5 พ.ย. 2570",
    location: data.location?.trim() || "สนามกีฬาสถาบันการกีฬาแห่งชาติ กทม.",
    seats: data.seats?.trim() || "จำนวนที่นั่ง 50 คน",
    capacity,
    seatsLeft,
    status:
      data.status === "full"
        ? "full"
        : data.status === "completed"
        ? "completed"
        : data.status === "closed"
        ? "closed"
        : "open",
    image:
      data.image && isAllowedCourseImage(data.image)
        ? data.image
        : "/assets/course-executive-management.jpg",
    imageAlt: `${data.title.trim()} - รูปประกอบหลักสูตร`,
    warningMessage: data.warningMessage?.trim() || undefined,
    budget: data.budget,
    province: data.province || detectProvinceFromLocation(data.location || ""),
    fiscalYear:
      data.fiscalYear ||
      getCourseFiscalYear({
        date: data.date,
        registrationDate: data.registrationDate,
        isHistorical: Boolean(data.isHistorical),
      }),
    isHistorical: Boolean(data.isHistorical),
    historicalCompleted: data.historicalCompleted,
    historicalApplicants: data.historicalApplicants,
    targetQuotas: data.targetQuotas ?? { ...DEFAULT_TARGET_QUOTAS },
    courseObjective:
      data.courseObjective !== undefined
        ? data.courseObjective
        : "เพื่อพัฒนาความรู้และทักษะวิชาชีพบุคลากรทางการกีฬาตามมาตรฐานการกีฬาแห่งประเทศไทย",
    qualifications:
      data.qualifications !== undefined
        ? data.qualifications
        : [
            "มีสัญชาติไทย อายุ 20 ปีบริบูรณ์ขึ้นไป",
            "สังกัดหน่วยงานใน 5 กลุ่มเป้าหมาย กกท. (มีหนังสือนำส่งรับรองจากต้นสังกัด)",
          ],
    requiredDocuments:
      data.requiredDocuments !== undefined
        ? data.requiredDocuments
        : [
            "รูปถ่ายหน้าตรงขนาด 1.5 - 2 นิ้ว ถ่ายไม่เกิน 6 เดือน (ไฟล์ JPG/PNG)",
            "หนังสือนำส่งรับรองจากต้นสังกัดหรือสมาคมกีฬา (ไฟล์ PDF)",
            "สำเนาบัตรประจำตัวประชาชน พร้อมลงนามรับรองสำเนาถูกต้อง",
          ],
    evaluationCriteria:
      data.evaluationCriteria !== undefined
        ? data.evaluationCriteria
        : [
            "มีเวลาเข้าร่วมการอบรมไม่น้อยกว่าร้อยละ 80 ของเวลาทั้งหมด",
            "ผ่านการประเมินผลภาคทฤษฎีและภาคปฏิบัติตามเกณฑ์ที่กำหนด",
            "ได้รับวุฒิบัตรรับรองจากการกีฬาแห่งประเทศไทย (กกท.)",
          ],
    satSupport:
      data.satSupport !== undefined
        ? data.satSupport
        : [...DEFAULT_SAT_SUPPORT],
    expensesPolicy:
      data.expensesPolicy !== undefined
        ? data.expensesPolicy
        : DEFAULT_EXPENSES_POLICY,
    documentConfig: data.documentConfig,
  };

  markCourseEditedLocally(newCourse.id);
  state = {
    courses: [...state.courses, newCourse],
    revision: state.revision + 1,
  };
  const persisted = saveToLocalStorage();
  syncCoursesSubsetToServer([newCourse]);
  emit();

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    const quotasPayload = buildQuotasPayload(
      newCourse.targetQuotas,
      {
        registrationDate: newCourse.registrationDate,
        resultDate: newCourse.resultDate,
        useCustomSchedule: newCourse.useCustomSchedule,
        updatedAt: newCourse.updatedAt,
      },
      newCourse.capacity || 40,
      {
        courseObjective: newCourse.courseObjective,
        qualifications: newCourse.qualifications,
        requiredDocuments: newCourse.requiredDocuments,
        evaluationCriteria: newCourse.evaluationCriteria,
        satSupport: newCourse.satSupport,
        expensesPolicy: newCourse.expensesPolicy,
        documentConfig: newCourse.documentConfig,
        seatsLeft: newCourse.seatsLeft,
        budget: newCourse.budget,
        province: newCourse.province,
        fiscalYear: newCourse.fiscalYear,
        isHistorical: newCourse.isHistorical,
        historicalCompleted: newCourse.historicalCompleted,
        historicalApplicants: newCourse.historicalApplicants,
        status: newCourse.status,
      },
      newCourse.id
    );

    supabase
      ?.from("courses")
      .upsert(
        {
          id: newCourse.id,
          title: newCourse.title,
          short_title: newCourse.shortTitle ?? null,
          date: newCourse.date,
          location: newCourse.location,
          seats: newCourse.seats,
          seats_left: newCourse.seatsLeft ?? newCourse.capacity,
          status: newCourse.status === "completed" ? "closed" : newCourse.status,
          image: newCourse.image,
          warning_message: newCourse.warningMessage ?? null,
          target_quotas: quotasPayload as unknown as import("@/lib/supabase/types").Json,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
      .then();
  }

  return { course: newCourse, persisted };
}

export function updateGlobalCourseSchedule(
  registrationDate: string,
  resultDate: string,
  resetCustomOverrides = false
): { updatedCount: number; persisted: boolean } {
  const reg = registrationDate.trim();
  const res = resultDate.trim();
  const now = new Date().toISOString();
  let updatedCount = 0;

  const nextCourses = state.courses.map((course) => {
    // ห้ามอัปเดตวันรับสมัครกลางทับประวัติหลักสูตรย้อนหลัง
    if (course.isHistorical) {
      return course;
    }
    if (course.useCustomSchedule && !resetCustomOverrides) {
      return course;
    }
    updatedCount += 1;
    return {
      ...course,
      useCustomSchedule: false,
      registrationDate: reg,
      resultDate: res,
      updatedAt: now,
    };
  });

  nextCourses.forEach((c) => {
    if (!c.isHistorical && (!c.useCustomSchedule || resetCustomOverrides)) {
      markCourseEditedLocally(c.id);
    }
  });
  state = {
    courses: nextCourses,
    revision: state.revision + 1,
  };
  const persisted = saveToLocalStorage();
  syncCoursesSubsetToServer(
    nextCourses.filter((c) => !c.isHistorical && (!c.useCustomSchedule || resetCustomOverrides))
  );
  emit();

  // Sync each affected course immediately to Supabase (พร้อมรักษาข้อมูล _metadata ทั้งหมดไว้ครบถ้วน)
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    nextCourses.forEach((c) => {
      if (c.isHistorical || (c.useCustomSchedule && !resetCustomOverrides)) return;
      const payload = buildQuotasPayload(
        c.targetQuotas,
        {
          registrationDate: c.registrationDate,
          resultDate: c.resultDate,
          useCustomSchedule: false,
          updatedAt: now,
        },
        c.capacity || 40,
        {
          courseObjective: c.courseObjective,
          qualifications: c.qualifications,
          requiredDocuments: c.requiredDocuments,
          evaluationCriteria: c.evaluationCriteria,
          satSupport: c.satSupport,
          expensesPolicy: c.expensesPolicy,
          documentConfig: c.documentConfig,
          seatsLeft: c.seatsLeft,
          announcementFile: c.announcementFile,
          budget: c.budget,
          province: c.province,
          fiscalYear: c.fiscalYear,
          isHistorical: c.isHistorical,
          historicalCompleted: c.historicalCompleted,
          historicalApplicants: c.historicalApplicants,
          status: c.status,
        },
        c.id
      );

      supabase
        ?.from("courses")
        .update({
          target_quotas: payload as unknown as import("@/lib/supabase/types").Json,
          updated_at: now,
        })
        .eq("id", c.id)
        .then();
    });
  }

  return { updatedCount, persisted };
}

export function deleteCourse(id: number): boolean {
  const exists = state.courses.some((course) => course.id === id);
  if (!exists) return false;

  state = {
    courses: state.courses.filter((course) => course.id !== id),
    revision: state.revision + 1,
  };
  saveToLocalStorage();
  syncCoursesSubsetToServer([], [id]);
  emit();

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    supabase?.from("courses").delete().eq("id", id).then();
  }
  return true;
}

export function resetCourses() {
  state = {
    courses: cloneSeedCourses(),
    revision: state.revision + 1,
  };

  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore unavailable storage.
    }
  }

  emit();
}

export function getCoursesSnapshot() {
  return state.courses;
}

export function syncCourseSeatsWithApprovedCounts(
  countsByCourseId: Record<number, number>
) {
  let changed = false;
  const nextCourses = state.courses.map((course) => {
    // ข้ามหลักสูตรประวัติศาสตร์ย้อนหลัง และหลักสูตรที่ปิดรับสมัคร/เสร็จสิ้นแล้ว เพื่อไม่ให้รีเซ็ตสถานะกลับเป็น open
    if (
      course.isHistorical ||
      course.id >= 100 ||
      course.status === "completed" ||
      course.status === "closed"
    ) {
      return course;
    }

    const approvedCount = countsByCourseId[course.id] ?? 0;
    const parsedCap = Number(course.seats?.match(/\d+/)?.[0]);
    const capacity =
      Number.isFinite(parsedCap) && parsedCap > 0
        ? parsedCap
        : (course.capacity || 40);

    // หากผู้ดูแลระบบตั้งสถานะหลักสูตรเป็น "full" (ปิดรับสมัครชั่วคราว) ด้วยตนเอง
    // ห้ามเปลี่ยนกลับเป็น "open" โดยอัตโนมัติ
    if (course.status === "full" && approvedCount < capacity) {
      if (course.capacity !== capacity) {
        changed = true;
        return { ...course, capacity };
      }
      return course;
    }

    const computedSeatsLeft = Math.max(0, capacity - approvedCount);
    const computedStatus: "open" | "full" =
      computedSeatsLeft === 0 ? "full" : "open";

    if (
      course.capacity !== capacity ||
      course.seatsLeft !== computedSeatsLeft ||
      course.status !== computedStatus
    ) {
      changed = true;
      return {
        ...course,
        capacity,
        seatsLeft: computedSeatsLeft,
        status: computedStatus,
      };
    }
    return course;
  });

  if (changed) {
    state = {
      courses: nextCourses,
      revision: state.revision + 1,
    };
    saveToLocalStorage();
    emit();
  }
}

/**
 * อัปโหลดไฟล์สแกน PDF ประกาศรายชื่อทางการที่ผู้ว่าการ กกท. ลงนามแล้ว
 * บันทึกลง Supabase Storage และซิงก์ข้อมูลหลักสูตรข้ามทุกเครื่อง
 */
export async function uploadCourseAnnouncementPdf(
  courseId: number,
  file: File
): Promise<import("@/lib/courses").CourseAnnouncementFile | null> {
  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `announcements/course-${courseId}-${timestamp}-${sanitizedFileName}`;

    let publicUrl = dataUrl;
    if (isSupabaseConfigured()) {
      const uploadedPath = await uploadDocumentToSupabaseStorage(
        "sat-documents",
        storagePath,
        dataUrl
      );
      if (uploadedPath) {
        // ใช้ Local Stream API Route เสมอ เนื่องจากถัง sat-documents เป็น Private Bucket
        publicUrl = `/api/announcements/${courseId}`;
      }
    }

    const sizeBytes = file.size;
    const formattedSize =
      sizeBytes < 1024 * 1024
        ? `${Math.max(1, Math.round(sizeBytes / 1024))} KB`
        : `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;

    const announcement: import("@/lib/courses").CourseAnnouncementFile = {
      name: file.name,
      storagePath,
      dataUrl: publicUrl,
      uploadedAt: new Date().toISOString(),
      fileSize: formattedSize,
    };

    updateCourse(courseId, { announcementFile: announcement });
    return announcement;
  } catch (err) {
    console.warn("Failed to upload course announcement PDF:", err);
    return null;
  }
}

/**
 * ลบไฟล์สแกน PDF ประกาศรายชื่อทางการของหลักสูตร
 */
export function removeCourseAnnouncementPdf(courseId: number): boolean {
  try {
    updateCourse(courseId, { announcementFile: null });
    return true;
  } catch {
    return false;
  }
}
