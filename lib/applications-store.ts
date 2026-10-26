"use client";

import { useSyncExternalStore } from "react";
import {
  adminApplicants,
  adminCourseOptions,
  adminUser,
  type AiVerdict,
  type ApplicantStatus,
} from "@/lib/admin-data";
import { courses } from "@/lib/courses";
import { getCoursesSnapshot } from "@/lib/courses-store";
import { MOCK_ID_CARD } from "@/lib/registration";
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
  kind: "created" | "note" | "approved" | "rejected";
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

const STORAGE_KEY = "sat-applications-v1";
const SEED_TARGET = 185;
const SEED_REVIEWER = adminUser.name;
const BASE_TIME = Date.UTC(2026, 9, 18, 8, 0, 0);
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const affiliations = [
  "สมาคมกีฬาแห่งประเทศไทย",
  "การกีฬาแห่งประเทศไทย",
  "สมาคมกีฬาจังหวัด",
  "สำนักงานพัฒนาการกีฬาและนันทนาการ",
];

const positions = [
  "ผู้ฝึกสอนชำนาญการ",
  "เจ้าหน้าที่พัฒนากีฬา",
  "ผู้ตัดสินระดับชาติ",
  "นักวิทยาศาสตร์การกีฬา",
  "ผู้จัดการทีมกีฬา",
];

const extraNames = [
  "นาย กิตติศักดิ์ พงษ์ไพร",
  "นางสาว ปวีณา ศรีสุข",
  "นาย อนุชา ทองดี",
  "นางสาว อารยา บุญมี",
  "นาย ธนวัฒน์ ใจกล้า",
  "นางสาว ชลิตา แก้วใส",
  "นาย ภูวดล วงศ์ไทย",
  "นางสาว มณีรัตน์ สุขใจ",
  "นาย ศุภชัย ดีงาม",
  "นางสาว สุนิสา พูลผล",
  "นาย วรากร เมืองทอง",
  "นางสาว นภาพร แสงทอง",
  "นาย ธีรภัทร แก้วมณี",
  "นางสาว รุ่งทิพย์ ทองคำ",
  "นาย พีระพงษ์ สายทอง",
  "นางสาว จิราพร สุขสันต์",
  "นาย ณัฐพล ใจมั่น",
  "นางสาว กนกวรรณ ศรีทอง",
  "นาย สุรชัย กล้าหาญ",
  "นางสาว ปิยะดา วงศ์งาม",
];

const AI_FAIL_REASONS = [
  "ขาดเอกสารสำคัญ",
  "เอกสารไม่ครบถ้วน",
  "ไม่ผ่านเกณฑ์คุณสมบัติ",
];

function padRef(value: number) {
  return `SAT-${String(value).padStart(5, "0")}`;
}

function buildRef(index: number) {
  return padRef(452 + index);
}

function buildIdCard(index: number) {
  if (index === 0) return MOCK_ID_CARD;
  return `1100091${String(index + 2).padStart(6, "0")}`;
}

function buildPhone(index: number) {
  const suffix = String(2675323 + index * 137).slice(-7);
  return `08${suffix.slice(0, 1)}-${suffix.slice(1, 4)}-${suffix.slice(4)}`;
}

function buildDocuments(
  index: number,
  courseId: number,
  hasFiles: boolean,
  rejected: boolean
): ApplicantDocument[] {
  const documents: ApplicantDocument[] = [
    {
      id: `${index}-photo`,
      kind: "photo",
      name: "รูปถ่ายหน้าตรง.jpg",
      size: "1.1 MB",
    },
  ];

  if (hasFiles || !rejected) {
    documents.push({
      id: `${index}-cover`,
      kind: "cover",
      name: "หนังสือนำส่งจากต้นสังกัด.pdf",
      size: `${(1.4 + (index % 5) * 0.3).toFixed(1)} MB`,
    });
  }

  if (hasFiles) {
    documents.push({
      id: `${index}-certificate`,
      kind: "certificate",
      name: "หนังสือรับรองคุณวุฒิ.pdf",
      size: `${(0.8 + (index % 4) * 0.2).toFixed(1)} MB`,
    });
  }

  if ((courseId === 1 || courseId === 4) && !rejected) {
    documents.push({
      id: `${index}-saka`,
      kind: "saka",
      name: "เอกสาร ส.ฬ.8.pdf",
      size: "0.9 MB",
    });
  }

  return documents;
}

function buildNotes(
  index: number,
  status: ApplicantStatus,
  submittedAt: string,
  ai: AiVerdict
): ReviewNote[] {
  const notes: ReviewNote[] = [
    {
      id: `${index}-created`,
      at: submittedAt,
      author: "ระบบรับสมัคร",
      kind: "created",
      text: "ได้รับข้อมูลการสมัครและเอกสารเรียบร้อยแล้ว",
    },
  ];

  if (status !== "pending") {
    notes.push({
      id: `${index}-review`,
      at: new Date(Date.parse(submittedAt) + DAY).toISOString(),
      author: SEED_REVIEWER,
      kind: status === "approved" ? "approved" : "rejected",
      text:
        status === "approved"
          ? "ตรวจสอบคุณสมบัติและเอกสารครบถ้วน อนุมัติเข้ารับการอบรม"
          : `ไม่ผ่านการตรวจสอบ: ${
              ai.line2 || AI_FAIL_REASONS[index % AI_FAIL_REASONS.length]
            }`,
    });
  }

  return notes;
}

function buildExtraAi(
  index: number,
  status: ApplicantStatus
): AiVerdict {
  if (status === "rejected") {
    return {
      tone: "fail",
      line1: `แนะนำไม่ให้ผ่าน (${8 + ((index * 7) % 23)}%)`,
      line2: AI_FAIL_REASONS[index % AI_FAIL_REASONS.length],
    };
  }
  if (status === "approved") {
    return {
      tone: "pass",
      line1: `แนะนำให้ผ่าน (${82 + ((index * 5) % 17)}%)`,
      line2: "เอกสารครบถ้วน",
    };
  }
  return index % 3 === 0
    ? {
        tone: "review",
        line1: "รอการตรวจสอบ",
        line2: "เอกสารยังไม่ครบถ้วน",
      }
    : {
        tone: "pass",
        line1: `แนะนำให้ผ่าน (${76 + ((index * 4) % 20)}%)`,
        line2: "รอเจ้าหน้าที่ตรวจสอบ",
      };
}

function buildSeedApplications(): ApplicantRecord[] {
  const records: ApplicantRecord[] = [];

  adminApplicants.forEach((applicant, index) => {
    const submittedAt = new Date(BASE_TIME - index * 6 * HOUR).toISOString();
    const course = courses.find((item) => item.id === applicant.courseId);
    const hasFiles = applicant.fileSize !== null;
    const name = index === 0 ? "นาย สมชาย สิงห์" : applicant.name;
    const ref = buildRef(index);
    const notes = buildNotes(index, applicant.status, submittedAt, applicant.ai);

    records.push({
      id: applicant.id,
      ref,
      receiptNo: `${ref}-69`,
      name,
      idCard: buildIdCard(index),
      email: `applicant${String(index + 1).padStart(3, "0")}@sat.or.th`,
      phone: buildPhone(index),
      affiliation:
        index === 0 ? affiliations[0] : affiliations[index % affiliations.length],
      position:
        index === 0 ? positions[0] : positions[index % positions.length],
      courseId: applicant.courseId,
      course: applicant.course,
      courseTitle: course?.title ?? applicant.course,
      submittedAt,
      updatedAt: notes.at(-1)?.at ?? submittedAt,
      fileSize: applicant.fileSize,
      documents: buildDocuments(
        index,
        applicant.courseId,
        hasFiles,
        applicant.status === "rejected"
      ),
      ai: applicant.ai,
      status: applicant.status,
      reviewReason:
        applicant.status === "rejected" ? applicant.ai.line2 : undefined,
      reviewedAt:
        applicant.status === "pending" ? undefined : notes.at(-1)?.at,
      reviewedBy:
        applicant.status === "pending" ? undefined : SEED_REVIEWER,
      notes,
    });
  });

  const extraStatuses: ApplicantStatus[] = [
    ...(Array(25).fill("pending") as ApplicantStatus[]),
    ...(Array(115).fill("approved") as ApplicantStatus[]),
    ...(Array(3).fill("rejected") as ApplicantStatus[]),
  ];

  for (let index = records.length; index < SEED_TARGET; index += 1) {
    const id = index + 1;
    const status = extraStatuses[index - adminApplicants.length];
    const courseId = (index % 5) + 1;
    const courseOption = adminCourseOptions[courseId - 1];
    const course = courses.find((item) => item.id === courseId);
    const submittedAt = new Date(BASE_TIME - index * 6 * HOUR).toISOString();
    const ai = buildExtraAi(index, status);
    const hasFiles = status !== "rejected" && index % 9 !== 4;
    const documents = buildDocuments(index, courseId, hasFiles, status === "rejected");
    const notes = buildNotes(index, status, submittedAt, ai);
    const ref = buildRef(index);

    records.push({
      id,
      ref,
      receiptNo: `${ref}-69`,
      name: extraNames[index % extraNames.length],
      idCard: buildIdCard(index),
      email: `applicant${String(index + 1).padStart(3, "0")}@sat.or.th`,
      phone: buildPhone(index),
      affiliation: affiliations[index % affiliations.length],
      position: positions[index % positions.length],
      courseId,
      course: courseOption.label,
      courseTitle: course?.title ?? courseOption.title,
      submittedAt,
      updatedAt: notes.at(-1)?.at ?? submittedAt,
      fileSize: hasFiles ? 0.8 + (index % 6) * 0.3 : null,
      documents,
      ai,
      status,
      reviewReason: status === "rejected" ? ai.line2 : undefined,
      reviewedAt: status === "pending" ? undefined : notes.at(-1)?.at,
      reviewedBy: status === "pending" ? undefined : SEED_REVIEWER,
      notes,
    });
  }

  return records;
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

function hydrate() {
  if (hydrateStarted || typeof window === "undefined") return;
  hydrateStarted = true;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
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

  if (isSupabaseConfigured()) {
    fetchApplicationsFromSupabase().then((cloudApps) => {
      if (cloudApps && cloudApps.length > 0) {
        state = {
          applications: cloudApps,
          revision: state.revision + 1,
        };
        persist();
        emit();
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
  const courseOption =
    adminCourseOptions.find((item) => item.id === input.courseId) ??
    adminCourseOptions[0];
  const course = getCoursesSnapshot().find(
    (item) => item.id === input.courseId
  );
  const numericRefs = state.applications
    .map((item) => Number(item.ref.replace(/\D/g, "")))
    .filter((value) => Number.isFinite(value));
  const nextRef = Math.max(452, ...numericRefs) + 1;
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
    receiptNo: `${ref}-69`,
    name: input.name.trim() || "ผู้สมัครไม่ระบุชื่อ",
    idCard: input.idCard.replace(/\D/g, ""),
    email: input.email.trim(),
    phone: input.phone.trim(),
    affiliation: input.affiliation,
    position: input.position.trim(),
    courseId: input.courseId,
    course: courseOption.label,
    courseTitle: course?.title ?? courseOption.title,
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

  if (isSupabaseConfigured()) {
    syncApplicationToSupabase(record);
  }

  return record;
}

export function reviewApplication(
  ref: string,
  status: Exclude<ApplicantStatus, "pending">,
  reason: string,
  reviewer: string = SEED_REVIEWER
) {
  const now = new Date().toISOString();

  state = {
    applications: state.applications.map((item) => {
      if (item.ref !== ref) return item;

      const noteText =
        status === "approved"
          ? reason.trim() || "อนุมัติคุณสมบัติและเอกสารครบถ้วน"
          : reason.trim() || "ไม่ผ่านการตรวจสอบคุณสมบัติ";

      return {
        ...item,
        status,
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

  if (isSupabaseConfigured()) {
    const noteText =
      status === "approved"
        ? reason.trim() || "อนุมัติคุณสมบัติและเอกสารครบถ้วน"
        : reason.trim() || "ไม่ผ่านการตรวจสอบคุณสมบัติ";
    syncReviewToSupabase(ref, status, noteText, reviewer, now);
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
  if (kind === "cover") return "หนังสือนำส่งจากต้นสังกัด";
  if (kind === "certificate") return "หนังสือรับรองคุณวุฒิ";
  return "เอกสาร ส.ฬ.8";
}
