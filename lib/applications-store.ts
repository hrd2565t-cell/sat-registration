"use client";

import { useSyncExternalStore } from "react";
import {
  adminCourseOptions,
  adminUser,
  type AiVerdict,
  type ApplicantStatus,
} from "@/lib/admin-data";
import {
  courses,
  isCourseDateOverlapping,
  type Course,
} from "@/lib/courses";
import { getCoursesSnapshot, syncCourseSeatsWithApprovedCounts } from "@/lib/courses-store";
import {
  isSupabaseConfigured,
  getSupabaseClient,
} from "@/lib/supabase/client";
import {
  fetchApplicationsFromSupabase,
  syncApplicationToSupabase,
  syncReviewToSupabase,
} from "@/lib/supabase/sync";

export type ApplicantDocumentKind =
  | "photo"
  | "cover"
  | "certificate"
  | "idcard"
  | "saka";

export interface ApplicantDocument {
  id: string;
  kind: ApplicantDocumentKind;
  name: string;
  size: string;
  dataUrl?: string;
  type?: string;
}

export interface ReviewNote {
  id: string;
  at: string;
  author: string;
  kind: "created" | "note" | "approved" | "rejected" | "reserve";
  text: string;
}

export interface ApplicantRecord {
  id: number;
  ref: string;
  receiptNo: string;
  name: string;
  idCard: string;
  email: string;
  phone: string;
  affiliation: string;
  position: string;
  courseId: number;
  course: string;
  courseTitle: string;
  submittedAt: string;
  updatedAt: string;
  fileSize: number | null;
  documents: ApplicantDocument[];
  ai: AiVerdict;
  status: ApplicantStatus;
  reserveOrder?: number;
  reviewReason?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  notes: ReviewNote[];
}

export interface NewApplicationInput {
  name: string;
  idCard: string;
  email: string;
  phone: string;
  affiliation: string;
  position: string;
  courseId: number;
  documents: ApplicantDocument[];
}

interface ApplicationsState {
  applications: ApplicantRecord[];
  revision: number;
}

const STORAGE_KEY = "sat-applications-v2";
const SEED_REVIEWER = adminUser.name;

function padRef(value: number) {
  return `SAT-${String(value).padStart(5, "0")}`;
}

function buildSeedApplications(): ApplicantRecord[] {
  return [];
}

const INITIAL_STATE: ApplicationsState = {
  applications: buildSeedApplications(),
  revision: 0,
};

let state: ApplicationsState = INITIAL_STATE;
let hydrateStarted = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    const safeState = {
      ...state,
      applications: state.applications.map((app) => ({
        ...app,
        documents: app.documents.map((doc) => ({
          id: doc.id,
          kind: doc.kind,
          name: doc.name,
          size: doc.size,
          type: doc.type,
        })),
      })),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(safeState));
  } catch (error) {
    console.warn("Storage quota exceeded or unavailable:", error);
  }
}

export function syncCourseSeats() {
  const counts: Record<number, number> = {};
  for (const app of state.applications) {
    if (app.status === "approved") {
      counts[app.courseId] = (counts[app.courseId] || 0) + 1;
    }
  }
  syncCourseSeatsWithApprovedCounts(counts);
}

function hydrate() {
  if (hydrateStarted || typeof window === "undefined") return;
  hydrateStarted = true;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      syncCourseSeats();
      return;
    }
    const parsed = JSON.parse(raw) as Partial<ApplicationsState>;
    if (
      Array.isArray(parsed.applications) &&
      parsed.applications.every(
        (item) =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as ApplicantRecord).ref === "string"
      )
    ) {
      state = {
        applications: parsed.applications as ApplicantRecord[],
        revision: state.revision + 1,
      };
    }
  } catch {
    state = { applications: buildSeedApplications(), revision: state.revision + 1 };
  }

  emit();
  syncCourseSeats();

  if (isSupabaseConfigured()) {
    fetchApplicationsFromSupabase().then((cloudApps) => {
      if (cloudApps && cloudApps.length > 0) {
        state = {
          applications: cloudApps,
          revision: state.revision + 1,
        };
        persist();
        emit();
        syncCourseSeats();
      }
    });
  }
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

export function useApplications() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useApplication(ref: string | null | undefined) {
  const { applications } = useApplications();
  if (!ref) return undefined;
  return applications.find((item) => item.ref === ref);
}

export function usePendingCount() {
  const { applications } = useApplications();
  return applications.filter((item) => item.status === "pending").length;
}

export function createApplication(input: NewApplicationInput): ApplicantRecord {
  const cleanIdCard = input.idCard.replace(/\D/g, "");
  // ป้องกันการบันทึกซ้ำในระดับ Store (Idempotency)
  const existing = state.applications.find(
    (item) => item.idCard === cleanIdCard && item.courseId === input.courseId
  );
  if (existing && existing.status !== "rejected") {
    return existing;
  }

  const courseOption =
    adminCourseOptions.find((item) => item.id === input.courseId) ??
    adminCourseOptions[0];
  const course = getCoursesSnapshot().find(
    (item) => item.id === input.courseId
  );
  const numericRefs = state.applications
    .map((item) => Number(item.ref.replace(/\D/g, "")))
    .filter((value) => Number.isFinite(value));
  const nextRef = Math.max(0, ...numericRefs) + 1;
  const ref = padRef(nextRef);
  const id = Math.max(0, ...state.applications.map((item) => item.id)) + 1;
  const now = new Date().toISOString();
  const fileSize = input.documents.reduce((total, document) => {
    const value = Number.parseFloat(document.size);
    return total + (Number.isFinite(value) ? value : 0);
  }, 0);

  const record: ApplicantRecord = {
    id,
    ref,
    receiptNo: `${ref}-70`,
    name: input.name.trim() || "ผู้สมัครไม่ระบุชื่อ",
    idCard: input.idCard.replace(/\D/g, ""),
    email: input.email.trim(),
    phone: input.phone.trim(),
    affiliation: input.affiliation,
    position: input.position.trim(),
    courseId: input.courseId,
    course: course?.shortTitle ?? courseOption?.label ?? "หลักสูตรอบรม",
    courseTitle: course?.title ?? courseOption?.title ?? "หลักสูตรอบรม กกท.",
    submittedAt: now,
    updatedAt: now,
    fileSize: fileSize > 0 ? Math.round(fileSize * 10) / 10 : null,
    documents: input.documents,
    ai: {
      tone: "review",
      line1: "รอการตรวจสอบ",
      line2: "อยู่ระหว่างตรวจเอกสารโดยเจ้าหน้าที่",
    },
    status: "pending",
    notes: [
      {
        id: `${ref}-created`,
        at: now,
        author: "ระบบรับสมัคร",
        kind: "created",
        text: "ได้รับข้อมูลการสมัครและเอกสารเรียบร้อยแล้ว",
      },
    ],
  };

  state = {
    applications: [record, ...state.applications],
    revision: state.revision + 1,
  };
  persist();
  emit();
  syncCourseSeats();

  if (isSupabaseConfigured()) {
    syncApplicationToSupabase(record);
  }

  return record;
}

export function reviewApplication(
  ref: string,
  status: Exclude<ApplicantStatus, "pending">,
  reason: string,
  reviewer: string = SEED_REVIEWER,
  customReserveOrder?: number
) {
  const now = new Date().toISOString();

  state = {
    applications: state.applications.map((item) => {
      if (item.ref !== ref) return item;

      let reserveOrder = item.reserveOrder;
      if (status === "reserve") {
        const courseReserves = state.applications.filter(
          (a) => a.courseId === item.courseId && a.status === "reserve" && a.ref !== ref
        );
        reserveOrder =
          customReserveOrder ??
          (Math.max(0, ...courseReserves.map((a) => a.reserveOrder ?? 0)) + 1);
      } else {
        reserveOrder = undefined;
      }

      const noteText =
        status === "approved"
          ? reason.trim() || "อนุมัติคุณสมบัติและเอกสารครบถ้วน (ตัวจริง)"
          : status === "reserve"
            ? reason.trim() || `ผ่านการตรวจสอบคุณสมบัติ จัดให้อยู่ในบัญชีรายชื่อสำรอง ลำดับที่ ${reserveOrder}`
            : reason.trim() || "ไม่ผ่านการตรวจสอบคุณสมบัติ";

      return {
        ...item,
        status,
        reserveOrder,
        reviewReason: status === "rejected" ? noteText : undefined,
        reviewedAt: now,
        reviewedBy: reviewer,
        updatedAt: now,
        notes: [
          ...item.notes,
          {
            id: `${ref}-${status}-${Date.now()}`,
            at: now,
            author: reviewer,
            kind: status,
            text: noteText,
          },
        ],
      };
    }),
    revision: state.revision + 1,
  };
  persist();
  emit();
  syncCourseSeats();

  if (isSupabaseConfigured()) {
    const noteText =
      status === "approved"
        ? reason.trim() || "อนุมัติคุณสมบัติและเอกสารครบถ้วน"
        : status === "reserve"
          ? reason.trim() || "ผ่านการตรวจสอบคุณสมบัติ (บัญชีสำรอง)"
          : reason.trim() || "ไม่ผ่านการตรวจสอบคุณสมบัติ";
    syncReviewToSupabase(ref, status, noteText, reviewer, now);
  }
}

export function promoteReserveToApproved(
  ref: string,
  reviewer: string = SEED_REVIEWER
) {
  const now = new Date().toISOString();
  const target = state.applications.find((item) => item.ref === ref);
  if (!target) return;

  const formerOrder = target.reserveOrder ?? 1;

  state = {
    applications: state.applications.map((item) => {
      if (item.ref === ref) {
        return {
          ...item,
          status: "approved" as const,
          reserveOrder: undefined,
          reviewedAt: now,
          reviewedBy: reviewer,
          updatedAt: now,
          notes: [
            ...item.notes,
            {
              id: `${ref}-promoted-${Date.now()}`,
              at: now,
              author: reviewer,
              kind: "approved" as const,
              text: `เลื่อนลำดับจากรายชื่อสำรอง (เดิมลำดับที่ ${formerOrder}) เป็นผู้มีสิทธิ์เข้ารับการอบรมตัวจริง`,
            },
          ],
        };
      }
      if (
        item.courseId === target.courseId &&
        item.status === "reserve" &&
        item.reserveOrder &&
        item.reserveOrder > formerOrder
      ) {
        return {
          ...item,
          reserveOrder: item.reserveOrder - 1,
          updatedAt: now,
        };
      }
      return item;
    }),
    revision: state.revision + 1,
  };
  persist();
  emit();
  syncCourseSeats();

  if (isSupabaseConfigured()) {
    syncReviewToSupabase(
      ref,
      "approved",
      `เลื่อนลำดับจากรายชื่อสำรอง (เดิมลำดับที่ ${formerOrder}) เป็นตัวจริง`,
      reviewer,
      now
    );
  }
}

export function addApplicationNote(
  ref: string,
  text: string,
  author: string = SEED_REVIEWER
) {
  const trimmed = text.trim();
  if (!trimmed) return;

  const now = new Date().toISOString();
  state = {
    applications: state.applications.map((item) =>
      item.ref === ref
        ? {
            ...item,
            updatedAt: now,
            notes: [
              ...item.notes,
              {
                id: `${ref}-note-${Date.now()}`,
                at: now,
                author,
                kind: "note" as const,
                text: trimmed,
              },
            ],
          }
        : item
    ),
    revision: state.revision + 1,
  };
  persist();
  emit();

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    supabase
      ?.from("review_notes")
      .insert({
        application_ref: ref,
        author,
        kind: "note",
        text: trimmed,
        created_at: now,
      })
      .then();
  }
}

export function resetDemoData() {
  state = {
    applications: buildSeedApplications(),
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
  syncCourseSeats();
}

export function getApplicationByIdCard(
  applications: ApplicantRecord[],
  idCard: string
) {
  const digits = idCard.replace(/\D/g, "");
  return [...applications]
    .filter((item) => item.idCard === digits)
    .sort(
      (left, right) =>
        Date.parse(right.submittedAt) - Date.parse(left.submittedAt)
    )[0];
}

/**
 * ดึงรายการใบสมัครทั้งหมดของเลขบัตรประชาชนนี้ (เรียงจากล่าสุดไปเก่าสุด)
 * รองรับกรณีผู้สมัครลงทะเบียนหลายหลักสูตร
 */
export function getApplicationsByIdCard(
  applications: ApplicantRecord[],
  idCard: string
): ApplicantRecord[] {
  const digits = idCard.replace(/\D/g, "");
  if (!digits) return [];
  return [...applications]
    .filter((item) => item.idCard === digits)
    .sort(
      (left, right) =>
        Date.parse(right.submittedAt) - Date.parse(left.submittedAt)
    );
}

export interface RegistrationEligibility {
  allowed: boolean;
  reason?: "duplicate_course" | "date_conflict";
  existingRecord?: ApplicantRecord;
  conflictingCourse?: Course;
}

/**
 * ตรวจสอบคุณสมบัติในการสมัครตามนโยบาย กกท.:
 * 1. ผู้สมัครสามารถสมัครได้มากกว่า 1 หลักสูตร
 * 2. ห้ามสมัครซ้ำในหลักสูตรเดิม (ยกเว้นเคยถูกปฏิเสธ)
 * 3. ช่วงเวลาการจัดอบรมของแต่ละหลักสูตรที่สมัครต้องไม่ซ้อนทับกัน
 */
export function checkRegistrationEligibility(
  idCard: string,
  targetCourseId: number,
  applications: ApplicantRecord[],
  courseList: Course[] = courses
): RegistrationEligibility {
  const digits = idCard.replace(/\D/g, "");
  if (!digits || digits.length !== 13) {
    return { allowed: true };
  }

  const userApplications = applications.filter(
    (app) => app.idCard === digits && app.status !== "rejected"
  );

  // 1. ตรวจสอบการสมัครซ้ำในหลักสูตรเดียวกัน
  const duplicate = userApplications.find(
    (app) => app.courseId === targetCourseId
  );
  if (duplicate) {
    return {
      allowed: false,
      reason: "duplicate_course",
      existingRecord: duplicate,
    };
  }

  // 2. ตรวจสอบการซ้อนทับของวันอบรมกับหลักสูตรอื่นที่เคยสมัคร
  const targetCourse = courseList.find((c) => c.id === targetCourseId);
  if (targetCourse) {
    for (const app of userApplications) {
      const existingCourse = courseList.find((c) => c.id === app.courseId);
      const existingDate = existingCourse?.date;
      if (
        existingDate &&
        isCourseDateOverlapping(targetCourse.date, existingDate)
      ) {
        return {
          allowed: false,
          reason: "date_conflict",
          existingRecord: app,
          conflictingCourse: existingCourse,
        };
      }
    }
  }

  return { allowed: true };
}

export function getLatestApplication(applications: ApplicantRecord[]) {
  return [...applications].sort(
    (left, right) =>
      Date.parse(right.submittedAt) - Date.parse(left.submittedAt)
  )[0];
}

export function formatThaiDate(value: string, withTime = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

export function formatThaiDateTime(value: string) {
  return formatThaiDate(value, true);
}

export function getDocumentLabel(kind: ApplicantDocumentKind) {
  if (kind === "photo") return "รูปถ่ายหน้าตรง";
  if (kind === "cover") return "หนังสือนำส่งจากต้นสังกัด/สมาคมกีฬา";
  if (kind === "certificate") return "หนังสือรับรองการปฏิบัติหน้าที่";
  if (kind === "idcard") return "สำเนาบัตรประจำตัวประชาชน";
  return "สำเนาใบ ส.ฬ. 8";
}
