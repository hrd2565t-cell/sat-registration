import type { Course } from "@/lib/courses";
import {
  isArchivedDocument,
  isDemoApplication,
  type ApplicantRecord,
} from "@/lib/applications-store";
import type { HistoricalTrainee } from "@/lib/alumni-store";

export type WorkflowPhaseId = "prepare" | "recruit" | "execute" | "closeout";

export type WorkflowStepStatus =
  | "pending"
  | "in_progress"
  | "blocked"
  | "completed";

export type WorkflowLiveMetricKey =
  | "courses_setup"
  | "registration_open"
  | "review_queue"
  | "announcement_status"
  | "training_schedule"
  | "alumni_transfer"
  | "budget_summary"
  | "archive_status";

export type WorkflowAttachmentKind = "link" | "file";

export interface WorkflowAttachment {
  id: string;
  kind: WorkflowAttachmentKind;
  name: string;
  url?: string;
  storagePath?: string;
  mimeType?: string;
  size?: string;
  uploadedAt: string;
}

export interface WorkflowChecklistItem {
  id: string;
  text: string;
  done: boolean;
  attachments?: WorkflowAttachment[];
}

export interface WorkflowStep {
  id: string;
  phase: WorkflowPhaseId;
  order: number;
  title: string;
  description: string;
  status: WorkflowStepStatus;
  assignee: string;
  dueDate: string; // YYYY-MM-DD or ""
  completedAt: string; // ISO string or ""
  notes: string;
  checklist: WorkflowChecklistItem[];
  liveMetricKey?: WorkflowLiveMetricKey;
  actionHref?: string;
  actionLabel?: string;
  updatedAt: string;
}

export interface FiscalYearWorkflow {
  fiscalYearBE: string;
  title: string;
  steps: WorkflowStep[];
  updatedAt: string;
}

export interface WorkflowStorePayload {
  version: 1;
  activeFiscalYearBE: string;
  years: Record<string, FiscalYearWorkflow>;
  updatedAt: string;
}

export interface WorkflowPhaseMeta {
  id: WorkflowPhaseId;
  phaseNumber: number;
  shortTitle: string;
  title: string;
  subtitle: string;
  headerBg: string;
  headerBorder: string;
  badgeBg: string;
  badgeText: string;
  connectorColor: string;
}

export const WORKFLOW_PHASES: WorkflowPhaseMeta[] = [
  {
    id: "prepare",
    phaseNumber: 1,
    shortTitle: "ระยะที่ 1",
    title: "เตรียมการและขออนุมัติโครงการ",
    subtitle: "วางแผนงบประมาณ ตั้งค่าหลักสูตรในระบบ และประชาสัมพันธ์",
    headerBg: "bg-slate-50",
    headerBorder: "border-slate-200",
    badgeBg: "bg-[#16265E]",
    badgeText: "text-white",
    connectorColor: "text-slate-400",
  },
  {
    id: "recruit",
    phaseNumber: 2,
    shortTitle: "ระยะที่ 2",
    title: "รับสมัคร ตรวจคุณสมบัติ และประกาศผล",
    subtitle: "ติดตามยอดสมัคร ตรวจสอบเอกสาร คัดเลือก และประกาศรายชื่อ",
    headerBg: "bg-blue-50/70",
    headerBorder: "border-blue-200",
    badgeBg: "bg-[#2386D3]",
    badgeText: "text-white",
    connectorColor: "text-blue-400",
  },
  {
    id: "execute",
    phaseNumber: 3,
    shortTitle: "ระยะที่ 3",
    title: "ดำเนินการจัดอบรม",
    subtitle: "ประสานวิทยากร สถานที่ เอกสารประกอบ และดำเนินการอบรม",
    headerBg: "bg-indigo-50/70",
    headerBorder: "border-indigo-200",
    badgeBg: "bg-indigo-600",
    badgeText: "text-white",
    connectorColor: "text-indigo-400",
  },
  {
    id: "closeout",
    phaseNumber: 4,
    shortTitle: "ระยะที่ 4",
    title: "ประเมินผล เบิกจ่าย และปิดโครงการ",
    subtitle: "ออกวุฒิบัตร โอนทำเนียบ เบิกจ่ายงบ และสำรองไฟล์ลง Google Drive",
    headerBg: "bg-emerald-50/70",
    headerBorder: "border-emerald-200",
    badgeBg: "bg-emerald-600",
    badgeText: "text-white",
    connectorColor: "text-emerald-500",
  },
];

export const WORKFLOW_STATUS_META: Record<
  WorkflowStepStatus,
  {
    label: string;
    shortLabel: string;
    badgeClass: string;
    nodeClass: string;
    accentBarClass: string;
    dotClass: string;
  }
> = {
  pending: {
    label: "รอดำเนินการ",
    shortLabel: "รอดำเนินการ",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    nodeClass: "border-slate-200 bg-white hover:border-slate-300",
    accentBarClass: "bg-slate-300",
    dotClass: "bg-slate-400",
  },
  in_progress: {
    label: "กำลังดำเนินการ",
    shortLabel: "กำลังทำ",
    badgeClass: "bg-blue-50 text-[#16265E] border-blue-300",
    nodeClass:
      "border-[#2386D3] bg-blue-50/25 ring-2 ring-[#2386D3]/20 shadow-sm",
    accentBarClass: "bg-[#2386D3]",
    dotClass: "bg-[#2386D3]",
  },
  blocked: {
    label: "ติดปัญหา/ล่าช้า",
    shortLabel: "ติดปัญหา",
    badgeClass: "bg-red-50 text-red-700 border-red-300",
    nodeClass: "border-red-400 bg-red-50/30 ring-2 ring-red-200 shadow-sm",
    accentBarClass: "bg-red-500",
    dotClass: "bg-red-500",
  },
  completed: {
    label: "เสร็จสิ้น",
    shortLabel: "เสร็จสิ้น",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-300",
    nodeClass: "border-emerald-300 bg-emerald-50/20 hover:border-emerald-400",
    accentBarClass: "bg-emerald-500",
    dotClass: "bg-emerald-500",
  },
};

export const WORKFLOW_LIVE_METRIC_OPTIONS: {
  value: WorkflowLiveMetricKey | "";
  label: string;
}[] = [
  { value: "", label: "ไม่เชื่อมตัวเลขอัตโนมัติ (ติดตามด้วยมือ)" },
  { value: "courses_setup", label: "จำนวนหลักสูตร & ที่นั่งที่ตั้งค่า" },
  { value: "registration_open", label: "สถานะเปิดรับสมัคร & ยอดผู้สมัคร" },
  { value: "review_queue", label: "คิวตรวจคุณสมบัติ & ขอเอกสารเพิ่ม" },
  { value: "announcement_status", label: "อัปโหลดไฟล์ประกาศผล & ผู้ผ่านคัดเลือก" },
  { value: "training_schedule", label: "กำหนดการวันจัดอบรมหลักสูตร" },
  { value: "alumni_transfer", label: "ข้อมูลบุคลากรในทำเนียบ & ประเมินผล" },
  { value: "budget_summary", label: "สรุปงบประมาณจัดสรรโครงการ" },
  { value: "archive_status", label: "สถานะไฟล์แนบ & สำรอง Google Drive" },
];

const VALID_PHASES = new Set<WorkflowPhaseId>([
  "prepare",
  "recruit",
  "execute",
  "closeout",
]);

const VALID_STATUSES = new Set<WorkflowStepStatus>([
  "pending",
  "in_progress",
  "blocked",
  "completed",
]);

const VALID_METRIC_KEYS = new Set<WorkflowLiveMetricKey>([
  "courses_setup",
  "registration_open",
  "review_queue",
  "announcement_status",
  "training_schedule",
  "alumni_transfer",
  "budget_summary",
  "archive_status",
]);

const MAX_STEPS_PER_YEAR = 40;
const MAX_CHECKLIST_ITEMS = 25;
const MAX_ATTACHMENTS_PER_ITEM = 10;

export function isSafeWorkflowAttachmentUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 1000) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function isSafeWorkflowStoragePath(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 240) return false;
  if (trimmed.includes("..") || trimmed.includes("//")) return false;
  return /^_private\/workflow-files\/[a-zA-Z0-9._/-]+$/.test(trimmed);
}

function normalizeAttachments(raw: unknown): WorkflowAttachment[] {
  if (!Array.isArray(raw)) return [];
  const result: WorkflowAttachment[] = [];
  for (let i = 0; i < Math.min(raw.length, MAX_ATTACHMENTS_PER_ITEM); i++) {
    const item = raw[i];
    if (!item || typeof item !== "object") continue;
    const a = item as Partial<WorkflowAttachment>;
    const name = String(a.name ?? "").trim().slice(0, 140);
    if (!name) continue;

    if (a.kind === "link") {
      if (!isSafeWorkflowAttachmentUrl(a.url)) continue;
      result.push({
        id: String(a.id || `att-${i + 1}`).slice(0, 64),
        kind: "link",
        name,
        url: String(a.url).trim(),
        uploadedAt:
          typeof a.uploadedAt === "string" && a.uploadedAt
            ? a.uploadedAt
            : new Date().toISOString(),
      });
    } else if (a.kind === "file") {
      if (!isSafeWorkflowStoragePath(a.storagePath)) continue;
      result.push({
        id: String(a.id || `att-${i + 1}`).slice(0, 64),
        kind: "file",
        name,
        storagePath: String(a.storagePath).trim(),
        ...(typeof a.mimeType === "string" && a.mimeType
          ? { mimeType: a.mimeType.trim().slice(0, 80) }
          : {}),
        ...(typeof a.size === "string" && a.size
          ? { size: a.size.trim().slice(0, 32) }
          : {}),
        uploadedAt:
          typeof a.uploadedAt === "string" && a.uploadedAt
            ? a.uploadedAt
            : new Date().toISOString(),
      });
    }
  }
  return result;
}

export function countStepAttachments(
  step: Pick<WorkflowStep, "checklist"> | null | undefined
): number {
  if (!step?.checklist) return 0;
  let total = 0;
  for (const item of step.checklist) {
    if (Array.isArray(item.attachments)) {
      total += item.attachments.length;
    }
  }
  return total;
}

export function collectWorkflowFilePaths(
  steps: WorkflowStep[] | null | undefined
): string[] {
  if (!steps) return [];
  const paths = new Set<string>();
  for (const step of steps) {
    for (const item of step.checklist || []) {
      for (const att of item.attachments || []) {
        if (att.kind === "file" && isSafeWorkflowStoragePath(att.storagePath)) {
          paths.add(att.storagePath!);
        }
      }
    }
  }
  return Array.from(paths);
}

/**
 * คำนวณปีงบประมาณ พ.ศ. ไทย (1 ต.ค. – 30 ก.ย.) จากวันที่ปัจจุบัน
 */
export function getDefaultFiscalYearBE(now: Date = new Date()): string {
  const gregorianYear = now.getFullYear();
  const monthZeroBased = now.getMonth(); // 0=Jan .. 9=Oct
  const fyGregorian = monthZeroBased >= 9 ? gregorianYear + 1 : gregorianYear;
  return String(fyGregorian + 543);
}

/**
 * เรียงลำดับขั้นตอนใหม่อัตโนมัติตาม 4 ระยะ (Phase Order) และลำดับย่อยภายในระยะ
 */
export function normalizeStepsOrder(steps: WorkflowStep[]): WorkflowStep[] {
  const phaseOrderMap = new Map<WorkflowPhaseId, number>(
    WORKFLOW_PHASES.map((p, idx) => [p.id, idx])
  );
  const grouped: Record<WorkflowPhaseId, WorkflowStep[]> = {
    prepare: [],
    recruit: [],
    execute: [],
    closeout: [],
  };

  for (const step of steps) {
    const phase = VALID_PHASES.has(step.phase) ? step.phase : "prepare";
    grouped[phase].push(step);
  }

  const result: WorkflowStep[] = [];
  let runningOrder = 1;

  for (const phaseMeta of WORKFLOW_PHASES) {
    const list = grouped[phaseMeta.id].sort((a, b) => a.order - b.order);
    for (const item of list) {
      result.push({
        ...item,
        phase: phaseMeta.id,
        order: runningOrder++,
      });
    }
  }

  return result.sort((a, b) => {
    const pa = phaseOrderMap.get(a.phase) ?? 0;
    const pb = phaseOrderMap.get(b.phase) ?? 0;
    if (pa !== pb) return pa - pb;
    return a.order - b.order;
  });
}

/**
 * สร้างชุดผังขั้นตอนการดำเนินงานมาตรฐานครบวงจร 4 ระยะ (12 ขั้นตอน)
 */
export function createDefaultFiscalYearWorkflow(
  fiscalYearBE: string = getDefaultFiscalYearBE()
): FiscalYearWorkflow {
  const nowIso = new Date().toISOString();
  const safeYear = normalizeFiscalYearBE(fiscalYearBE);

  const steps: WorkflowStep[] = [
    {
      id: "step-1-approve-project",
      phase: "prepare",
      order: 1,
      title: "จัดทำและเสนอขออนุมัติโครงการและงบประมาณ",
      description:
        "จัดทำรายละเอียดโครงการพัฒนาบุคลากรกีฬา คำของบประมาณ และเสนอผู้มีอำนาจพิจารณาอนุมัติ",
      status: "completed",
      assignee: "ฝ่ายแผนและโครงการ",
      dueDate: "",
      completedAt: "",
      notes: "",
      checklist: [
        { id: "chk-1-1", text: "ร่างโครงการและกำหนดตัวชี้วัด", done: true },
        { id: "chk-1-2", text: "จัดทำรายละเอียดงบประมาณรายหลักสูตร", done: true },
        { id: "chk-1-3", text: "เสนอขออนุมัติโครงการและแต่งตั้งคณะทำงาน", done: true },
      ],
      updatedAt: nowIso,
    },
    {
      id: "step-2-setup-courses",
      phase: "prepare",
      order: 2,
      title: "ตั้งค่าหลักสูตร กำหนดการ โควตา และเอกสารแนบในระบบ",
      description:
        "กำหนดวันรับสมัคร วันประกาศผล โควตา 5 กลุ่มเป้าหมาย เอกสารบังคับ (เช่น ส.ฬ. 8) และสถานที่จัดอบรม",
      status: "in_progress",
      assignee: "ผู้ดูแลระบบรับสมัคร",
      dueDate: "",
      completedAt: "",
      notes: "",
      checklist: [
        { id: "chk-2-1", text: "ตรวจรายละเอียดหลักสูตรครบ 8 ส่วน", done: true },
        { id: "chk-2-2", text: "ตั้งค่าโควตา 5 กลุ่มเป้าหมายและเงื่อนไขเอกสาร", done: false },
        { id: "chk-2-3", text: "ทดสอบฟอร์มลงทะเบียนและการส่งอีเมลแจ้งเตือน", done: false },
      ],
      liveMetricKey: "courses_setup",
      actionHref: "/admin/courses",
      actionLabel: "ไปหน้าจัดการหลักสูตร",
      updatedAt: nowIso,
    },
    {
      id: "step-3-pr-invitation",
      phase: "prepare",
      order: 3,
      title: "ประชาสัมพันธ์และจัดส่งหนังสือเชิญหน่วยงานเป้าหมาย",
      description:
        "จัดทำหนังสือเชิญถึงสมาคมกีฬาแห่งประเทศไทย สมาคมกีฬาแห่งจังหวัด กกท. กองทุนฯ และหน่วยงานที่เกี่ยวข้อง",
      status: "pending",
      assignee: "ฝ่ายประสานงานเครือข่าย",
      dueDate: "",
      completedAt: "",
      notes: "",
      checklist: [
        { id: "chk-3-1", text: "ออกหนังสือเชิญและแนบลิงก์/QR รับสมัคร", done: false },
        { id: "chk-3-2", text: "ประชาสัมพันธ์ผ่านช่องทางข่าวสารของ กกท.", done: false },
      ],
      updatedAt: nowIso,
    },
    {
      id: "step-4-open-registration",
      phase: "recruit",
      order: 4,
      title: "เปิดรับสมัครผู้เข้าอบรมออนไลน์",
      description:
        "ติดตามจำนวนผู้สมัครเข้าสู่ระบบแต่ละหลักสูตรและสัดส่วนความสมดุลของ 5 กลุ่มเป้าหมาย",
      status: "pending",
      assignee: "เจ้าหน้าที่รับสมัคร",
      dueDate: "",
      completedAt: "",
      notes: "",
      checklist: [
        { id: "chk-4-1", text: "ติดตามยอดผู้สมัครเทียบโควตารายกลุ่ม", done: false },
        { id: "chk-4-2", text: "ประสานกลุ่มเป้าหมายที่ผู้สมัครยังไม่เต็มจำนวน", done: false },
      ],
      liveMetricKey: "registration_open",
      actionHref: "/admin",
      actionLabel: "ดูภาพรวมผู้สมัคร",
      updatedAt: nowIso,
    },
    {
      id: "step-5-review-documents",
      phase: "recruit",
      order: 5,
      title: "ตรวจสอบคุณสมบัติและติดตามเอกสารแก้ไข",
      description:
        "ตรวจความถูกต้องของเอกสารแนบ (รูปถ่าย หนังสือนำส่ง บัตรประชาชน ส.ฬ. 8) และแจ้งส่งเอกสารเพิ่มเฉพาะรายการ",
      status: "pending",
      assignee: "คณะทำงานตรวจคุณสมบัติ",
      dueDate: "",
      completedAt: "",
      notes: "",
      checklist: [
        { id: "chk-5-1", text: "ตรวจเอกสารผู้สมัครรอพิจารณาทั้งหมด", done: false },
        { id: "chk-5-2", text: "ติดตามผู้สมัครสถานะรอส่งเอกสารเพิ่มเติม", done: false },
      ],
      liveMetricKey: "review_queue",
      actionHref: "/admin/review",
      actionLabel: "ไปหน้าตรวจสอบคุณสมบัติ",
      updatedAt: nowIso,
    },
    {
      id: "step-6-selection-meeting",
      phase: "recruit",
      order: 6,
      title: "ประชุมพิจารณาคัดเลือกและอนุมัติรายชื่อผู้เข้าอบรม",
      description:
        "จัดทำบัญชีรายชื่อผู้ผ่านเกณฑ์และผู้สำรองเสนอคณะกรรมการคัดเลือกและผู้บริหารลงนามอนุมัติ",
      status: "pending",
      assignee: "เลขานุการคณะกรรมการคัดเลือก",
      dueDate: "",
      completedAt: "",
      notes: "",
      checklist: [
        { id: "chk-6-1", text: "จัดทำสรุปรายชื่อตามโควตากลุ่มเป้าหมาย", done: false },
        { id: "chk-6-2", text: "จัดลำดับบัญชีสำรองและบันทึกการประชุม", done: false },
        { id: "chk-6-3", text: "เสนอผู้บริหารลงนามเห็นชอบรายชื่อ", done: false },
      ],
      updatedAt: nowIso,
    },
    {
      id: "step-7-publish-results",
      phase: "recruit",
      order: 7,
      title: "ประกาศรายชื่อผู้ผ่านการคัดเลือกอย่างเป็นทางการ",
      description:
        "อัปโหลดไฟล์ PDF ประกาศรายชื่อในระบบรับสมัคร และตรวจสอบการส่งอีเมลแจ้งผลให้ผู้สมัคร",
      status: "pending",
      assignee: "ผู้ดูแลระบบรับสมัคร",
      dueDate: "",
      completedAt: "",
      notes: "",
      checklist: [
        { id: "chk-7-1", text: "อัปโหลดประกาศรายชื่อ (PDF) ครบทุกหลักสูตร", done: false },
        { id: "chk-7-2", text: "ส่งอีเมลแจ้งผลการคัดเลือกและยืนยันสิทธิ์", done: false },
      ],
      liveMetricKey: "announcement_status",
      actionHref: "/admin/courses",
      actionLabel: "จัดการไฟล์ประกาศผล",
      updatedAt: nowIso,
    },
    {
      id: "step-8-training-logistics",
      phase: "execute",
      order: 8,
      title: "ประสานงานวิทยากร สถานที่ เอกสารประกอบ และลงทะเบียน",
      description:
        "เตรียมความพร้อมห้องประชุม ที่พัก อาหาร เอกสารประกอบการอบรม และชุดป้ายชื่อ/ใบลงทะเบียนหน้างาน",
      status: "pending",
      assignee: "ฝ่ายอำนวยการและจัดอบรม",
      dueDate: "",
      completedAt: "",
      notes: "",
      checklist: [
        { id: "chk-8-1", text: "ยืนยันตารางสอนและหนังสือเชิญวิทยากร", done: false },
        { id: "chk-8-2", text: "ยืนยันสถานที่ ห้องประชุม ที่พัก และอาหาร", done: false },
        { id: "chk-8-3", text: "เตรียมแบบลงทะเบียนและเอกสารประกอบการอบรม", done: false },
      ],
      updatedAt: nowIso,
    },
    {
      id: "step-9-conduct-training",
      phase: "execute",
      order: 9,
      title: "ดำเนินการจัดการอบรมตามกำหนดการ",
      description:
        "บันทึกเวลาเข้าอบรม ดูแลความเรียบร้อยระหว่างหลักสูตร และเก็บแบบประเมินความพึงพอใจ/แบบทดสอบ",
      status: "pending",
      assignee: "ผู้รับผิดชอบประจำหลักสูตร",
      dueDate: "",
      completedAt: "",
      notes: "",
      checklist: [
        { id: "chk-9-1", text: "เปิดโครงการและเช็กชื่อผู้เข้าอบรม", done: false },
        { id: "chk-9-2", text: "ประเมินผลผู้เข้าอบรมตามเกณฑ์สำเร็จหลักสูตร", done: false },
        { id: "chk-9-3", text: "รวบรวมแบบประเมินความพึงพอใจ", done: false },
      ],
      liveMetricKey: "training_schedule",
      actionHref: "/admin/courses",
      actionLabel: "ดูกำหนดการหลักสูตร",
      updatedAt: nowIso,
    },
    {
      id: "step-10-certificates-alumni",
      phase: "closeout",
      order: 10,
      title: "ออกวุฒิบัตรและบันทึกประวัติเข้าทำเนียบบุคลากร",
      description:
        "ออกเลขที่วุฒิบัตรให้ผู้สำเร็จการอบรม และโอนรายชื่อเข้าสู่ทำเนียบบุคลากรกีฬาในระบบ",
      status: "pending",
      assignee: "ฝ่ายทะเบียนและทำเนียบบุคลากร",
      dueDate: "",
      completedAt: "",
      notes: "",
      checklist: [
        { id: "chk-10-1", text: "ตรวจสอบรายชื่อผู้ผ่านเกณฑ์ 100%", done: false },
        { id: "chk-10-2", text: "บันทึกข้อมูลเข้าทำเนียบบุคลากร (/alumni)", done: false },
      ],
      liveMetricKey: "alumni_transfer",
      actionHref: "/alumni",
      actionLabel: "ไปหน้าทำเนียบ & ประเมิน",
      updatedAt: nowIso,
    },
    {
      id: "step-11-report-budget",
      phase: "closeout",
      order: 11,
      title: "สรุปผลการดำเนินงาน ประเมินผล และเบิกจ่ายงบประมาณ",
      description:
        "รวบรวมหลักฐานการใช้จ่าย ส่งเบิกงบประมาณ และบันทึกรายงานผลสัมฤทธิ์ประจำปีให้ผู้บริหาร",
      status: "pending",
      assignee: "ฝ่ายการเงินและประเมินผล",
      dueDate: "",
      completedAt: "",
      notes: "",
      checklist: [
        { id: "chk-11-1", text: "รวบรวมใบสำคัญรับเงิน/หลักฐานเบิกจ่ายครบถ้วน", done: false },
        { id: "chk-11-2", text: "จัดทำรายงานสรุปผลโครงการเสนอผู้บริหาร", done: false },
      ],
      liveMetricKey: "budget_summary",
      actionHref: "/admin",
      actionLabel: "ดูวิเคราะห์งบประมาณ",
      updatedAt: nowIso,
    },
    {
      id: "step-12-archive-close",
      phase: "closeout",
      order: 12,
      title: "สำรองเอกสารแนบลง Google Drive และปิดโครงการ",
      description:
        "ดาวน์โหลดไฟล์ ZIP เอกสารผู้สมัครเก็บถาวรใน Google Drive และล้างพื้นที่ Supabase Storage หลังตรวจสอบครบ",
      status: "pending",
      assignee: "ผู้ดูแลระบบรับสมัคร",
      dueDate: "",
      completedAt: "",
      notes: "",
      checklist: [
        { id: "chk-12-1", text: "ดาวน์โหลด ZIP เอกสารและอัปโหลดขึ้น Google Drive", done: false },
        { id: "chk-12-2", text: "ล้างไฟล์ Storage รายหลักสูตรที่สำรองเรียบร้อยแล้ว", done: false },
        { id: "chk-12-3", text: "ปิดโครงการประจำปีงบประมาณเรียบร้อย", done: false },
      ],
      liveMetricKey: "archive_status",
      actionHref: "/admin/settings",
      actionLabel: "ไปหน้าสำรองเอกสาร Drive",
      updatedAt: nowIso,
    },
  ];

  return {
    fiscalYearBE: safeYear,
    title: `แผนผังการดำเนินงานพัฒนาบุคลากรกีฬา ประจำปีงบประมาณ พ.ศ. ${safeYear}`,
    steps: normalizeStepsOrder(steps),
    updatedAt: nowIso,
  };
}

export function createDefaultWorkflowPayload(
  defaultYearBE: string = getDefaultFiscalYearBE()
): WorkflowStorePayload {
  const safeYear = normalizeFiscalYearBE(defaultYearBE);
  const nowIso = new Date().toISOString();
  return {
    version: 1,
    activeFiscalYearBE: safeYear,
    years: {
      [safeYear]: createDefaultFiscalYearWorkflow(safeYear),
    },
    updatedAt: nowIso,
  };
}

export function normalizeFiscalYearBE(value: unknown): string {
  const digits = String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, 4);
  const num = Number(digits);
  if (Number.isFinite(num) && num >= 2560 && num <= 2620) {
    return String(num);
  }
  return getDefaultFiscalYearBE();
}

function sanitizeSafeHref(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return undefined;
  if (trimmed.startsWith("//")) return undefined;
  return trimmed.slice(0, 120);
}

function normalizeStep(raw: unknown, fallbackIndex: number): WorkflowStep | null {
  if (!raw || typeof raw !== "object") return null;
  const src = raw as Partial<WorkflowStep>;
  const title = String(src.title ?? "").trim().slice(0, 160);
  if (!title) return null;

  const phase: WorkflowPhaseId = VALID_PHASES.has(src.phase as WorkflowPhaseId)
    ? (src.phase as WorkflowPhaseId)
    : "prepare";

  const status: WorkflowStepStatus = VALID_STATUSES.has(
    src.status as WorkflowStepStatus
  )
    ? (src.status as WorkflowStepStatus)
    : "pending";

  const checklistRaw = Array.isArray(src.checklist) ? src.checklist : [];
  const checklist: WorkflowChecklistItem[] = [];
  for (let i = 0; i < Math.min(checklistRaw.length, MAX_CHECKLIST_ITEMS); i++) {
    const item = checklistRaw[i];
    if (!item || typeof item !== "object") continue;
    const c = item as Partial<WorkflowChecklistItem>;
    const text = String(c.text ?? "").trim().slice(0, 200);
    if (!text) continue;
    const attachments = normalizeAttachments(c.attachments);
    checklist.push({
      id: String(c.id || `chk-${fallbackIndex}-${i + 1}`).slice(0, 64),
      text,
      done: Boolean(c.done),
      ...(attachments.length > 0 ? { attachments } : {}),
    });
  }

  const rawDueDate = typeof src.dueDate === "string" ? src.dueDate.trim() : "";
  const dueDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDueDate) ? rawDueDate : "";

  const liveMetricKey = VALID_METRIC_KEYS.has(
    src.liveMetricKey as WorkflowLiveMetricKey
  )
    ? (src.liveMetricKey as WorkflowLiveMetricKey)
    : undefined;

  const actionHref = sanitizeSafeHref(src.actionHref);
  const actionLabel =
    actionHref && typeof src.actionLabel === "string"
      ? src.actionLabel.trim().slice(0, 60)
      : undefined;

  return {
    id:
      String(src.id || `step-${fallbackIndex + 1}`)
        .trim()
        .slice(0, 80) || `step-${fallbackIndex + 1}`,
    phase,
    order:
      typeof src.order === "number" && Number.isFinite(src.order)
        ? src.order
        : fallbackIndex + 1,
    title,
    description: String(src.description ?? "").trim().slice(0, 400),
    status,
    assignee: String(src.assignee ?? "").trim().slice(0, 100),
    dueDate,
    completedAt:
      status === "completed" && typeof src.completedAt === "string"
        ? src.completedAt.trim().slice(0, 40)
        : "",
    notes: String(src.notes ?? "").trim().slice(0, 1200),
    checklist,
    ...(liveMetricKey ? { liveMetricKey } : {}),
    ...(actionHref ? { actionHref, actionLabel: actionLabel || "เปิดหน้าจัดการ" } : {}),
    updatedAt:
      typeof src.updatedAt === "string" && src.updatedAt
        ? src.updatedAt
        : new Date().toISOString(),
  };
}

/**
 * ตรวจสอบและทำความสะอาดโครงสร้างข้อมูลผังขั้นตอนการดำเนินงานทั้งหมด
 */
export function normalizeWorkflowPayload(raw: unknown): WorkflowStorePayload {
  const defaultYear = getDefaultFiscalYearBE();
  if (!raw || typeof raw !== "object") {
    return createDefaultWorkflowPayload(defaultYear);
  }

  const src = raw as Partial<WorkflowStorePayload>;
  const rawYears =
    src.years && typeof src.years === "object" ? src.years : {};
  const years: Record<string, FiscalYearWorkflow> = {};

  for (const [key, val] of Object.entries(rawYears)) {
    if (!val || typeof val !== "object") continue;
    const yearKey = normalizeFiscalYearBE(
      (val as Partial<FiscalYearWorkflow>).fiscalYearBE || key
    );
    const fySrc = val as Partial<FiscalYearWorkflow>;
    const rawSteps = Array.isArray(fySrc.steps) ? fySrc.steps : [];
    const normalizedSteps: WorkflowStep[] = [];
    for (let i = 0; i < Math.min(rawSteps.length, MAX_STEPS_PER_YEAR); i++) {
      const normalized = normalizeStep(rawSteps[i], i);
      if (normalized) normalizedSteps.push(normalized);
    }

    years[yearKey] = {
      fiscalYearBE: yearKey,
      title:
        String(fySrc.title ?? "").trim().slice(0, 200) ||
        `แผนผังการดำเนินงานพัฒนาบุคลากรกีฬา ประจำปีงบประมาณ พ.ศ. ${yearKey}`,
      steps:
        normalizedSteps.length > 0
          ? normalizeStepsOrder(normalizedSteps)
          : createDefaultFiscalYearWorkflow(yearKey).steps,
      updatedAt:
        typeof fySrc.updatedAt === "string" && fySrc.updatedAt
          ? fySrc.updatedAt
          : new Date().toISOString(),
    };
  }

  const yearKeys = Object.keys(years).sort((a, b) => Number(b) - Number(a));
  if (yearKeys.length === 0) {
    return createDefaultWorkflowPayload(defaultYear);
  }

  const requestedActive = normalizeFiscalYearBE(src.activeFiscalYearBE);
  const activeFiscalYearBE = years[requestedActive]
    ? requestedActive
    : yearKeys[0];

  return {
    version: 1,
    activeFiscalYearBE,
    years,
    updatedAt:
      typeof src.updatedAt === "string" && src.updatedAt
        ? src.updatedAt
        : new Date().toISOString(),
  };
}

export interface WorkflowSummary {
  total: number;
  completed: number;
  inProgress: number;
  blocked: number;
  pending: number;
  overdueCount: number;
  percent: number;
  currentStep: WorkflowStep | null;
  phaseStats: Record<
    WorkflowPhaseId,
    { total: number; completed: number; inProgress: number; blocked: number }
  >;
}

/**
 * ตรวจสอบว่าขั้นตอนนี้เลยกำหนดวันแล้วเสร็จหรือยัง (เฉพาะขั้นที่ยังไม่เสร็จสิ้น)
 */
export function isStepOverdue(
  step: Pick<WorkflowStep, "dueDate" | "status">,
  todayIso?: string
): boolean {
  if (step.status === "completed") return false;
  if (!step.dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(step.dueDate)) return false;
  const reference = todayIso || getTodayLocalDateIso();
  return step.dueDate < reference;
}

export function getTodayLocalDateIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * สรุปภาพรวมความคืบหน้าของขั้นตอนทั้งหมดและแยกตาม 4 ระยะ
 */
export function computeWorkflowSummary(
  steps: WorkflowStep[],
  todayIso?: string
): WorkflowSummary {
  const phaseStats: WorkflowSummary["phaseStats"] = {
    prepare: { total: 0, completed: 0, inProgress: 0, blocked: 0 },
    recruit: { total: 0, completed: 0, inProgress: 0, blocked: 0 },
    execute: { total: 0, completed: 0, inProgress: 0, blocked: 0 },
    closeout: { total: 0, completed: 0, inProgress: 0, blocked: 0 },
  };

  let completed = 0;
  let inProgress = 0;
  let blocked = 0;
  let pending = 0;
  let overdueCount = 0;

  const sorted = normalizeStepsOrder(steps);
  for (const step of sorted) {
    const p = phaseStats[step.phase];
    p.total += 1;
    if (step.status === "completed") {
      completed += 1;
      p.completed += 1;
    } else if (step.status === "in_progress") {
      inProgress += 1;
      p.inProgress += 1;
    } else if (step.status === "blocked") {
      blocked += 1;
      p.blocked += 1;
    } else {
      pending += 1;
    }

    if (isStepOverdue(step, todayIso)) {
      overdueCount += 1;
    }
  }

  const total = sorted.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const currentStep =
    sorted.find((s) => s.status === "blocked") ||
    sorted.find((s) => s.status === "in_progress") ||
    sorted.find((s) => s.status === "pending") ||
    sorted[sorted.length - 1] ||
    null;

  return {
    total,
    completed,
    inProgress,
    blocked,
    pending,
    overdueCount,
    percent,
    currentStep,
    phaseStats,
  };
}

/**
 * สลับตำแหน่งขั้นตอนขึ้นหรือลงภายในระยะเดียวกัน
 */
export function moveWorkflowStep(
  steps: WorkflowStep[],
  stepId: string,
  direction: "up" | "down"
): WorkflowStep[] {
  const ordered = normalizeStepsOrder(steps);
  const target = ordered.find((s) => s.id === stepId);
  if (!target) return ordered;

  const samePhase = ordered.filter((s) => s.phase === target.phase);
  const idx = samePhase.findIndex((s) => s.id === stepId);
  if (idx < 0) return ordered;

  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= samePhase.length) return ordered;

  const swapped = [...samePhase];
  const temp = swapped[idx];
  swapped[idx] = swapped[swapIdx];
  swapped[swapIdx] = temp;

  const reorderedPhase = swapped.map((item, i) => ({
    ...item,
    order: i + 1,
    updatedAt: new Date().toISOString(),
  }));

  const others = ordered.filter((s) => s.phase !== target.phase);
  return normalizeStepsOrder([...others, ...reorderedPhase]);
}

export interface WorkflowLiveMetricDisplay {
  badge: string;
  headline: string;
  detail: string;
  tone: "neutral" | "info" | "success" | "warning";
}

/**
 * ดึงตัวเลขจริงแบบ Read-only จากระบบ (กรองหลักสูตรประวัติ !isHistorical ตามกฎระบบ)
 */
export function computeLiveMetricForStep(
  key: WorkflowLiveMetricKey,
  input: {
    courses: Course[];
    applications: ApplicantRecord[];
    trainees: HistoricalTrainee[];
    fiscalYearBE: string;
  }
): WorkflowLiveMetricDisplay {
  // ป้องกันการปนหลักสูตรประวัติย้อนหลังเข้าสู่ตัวเลขดำเนินงานปัจจุบัน
  const activeCourses = input.courses.filter((c) => !c.isHistorical);
  const activeCourseIds = new Set(activeCourses.map((c) => c.id));
  const currentApps = input.applications.filter(
    (app) => !isDemoApplication(app) && activeCourseIds.has(app.courseId)
  );

  switch (key) {
    case "courses_setup": {
      const totalCapacity = activeCourses.reduce(
        (sum, c) => sum + (c.capacity || 0),
        0
      );
      const withSchedule = activeCourses.filter(
        (c) => Boolean(c.date?.trim()) && Boolean(c.location?.trim())
      ).length;
      return {
        badge: `${activeCourses.length} หลักสูตร · ${totalCapacity} ที่นั่ง`,
        headline: `ตั้งค่าหลักสูตรปัจจุบัน ${activeCourses.length} หลักสูตร`,
        detail: `กำหนดวันและสถานที่ครบแล้ว ${withSchedule}/${activeCourses.length} หลักสูตร (โควตารวม ${totalCapacity} คน)`,
        tone: activeCourses.length > 0 ? "info" : "neutral",
      };
    }

    case "registration_open": {
      const openCount = activeCourses.filter((c) => c.status === "open").length;
      const totalCapacity = activeCourses.reduce(
        (sum, c) => sum + (c.capacity || 0),
        0
      );
      return {
        badge: `เปิดรับ ${openCount} · สมัคร ${currentApps.length} คน`,
        headline: `ผู้สมัครรวม ${currentApps.length} / ${totalCapacity} ที่นั่ง`,
        detail: `เปิดรับสมัครอยู่ ${openCount} จาก ${activeCourses.length} หลักสูตรปัจจุบัน`,
        tone:
          currentApps.length > 0
            ? "info"
            : openCount > 0
              ? "info"
              : "neutral",
      };
    }

    case "review_queue": {
      const pending = currentApps.filter((a) => a.status === "pending").length;
      const actionReq = currentApps.filter(
        (a) => a.status === "action_required"
      ).length;
      const approved = currentApps.filter((a) => a.status === "approved").length;
      const remaining = pending + actionReq;
      return {
        badge:
          remaining > 0
            ? `ค้างตรวจ ${remaining} คน`
            : currentApps.length > 0
              ? "ตรวจครบแล้ว"
              : "ยังไม่มีใบสมัคร",
        headline: `รอตรวจ ${pending} · ขอเอกสารเพิ่ม ${actionReq} · ผ่าน ${approved} คน`,
        detail:
          remaining > 0
            ? `ยังมีผู้สมัครรอพิจารณา/แก้ไขเอกสารรวม ${remaining} รายการ`
            : `ตรวจคุณสมบัติผู้สมัครครบทุกรายแล้ว (${currentApps.length} รายการ)`,
        tone:
          remaining > 0
            ? "warning"
            : currentApps.length > 0
              ? "success"
              : "neutral",
      };
    }

    case "announcement_status": {
      const announcedCount = activeCourses.filter((c) =>
        Boolean(c.announcementFile?.dataUrl || c.announcementFile?.name)
      ).length;
      const approvedCount = currentApps.filter(
        (a) => a.status === "approved"
      ).length;
      const reserveCount = currentApps.filter(
        (a) => a.status === "reserve"
      ).length;
      return {
        badge: `ประกาศแล้ว ${announcedCount}/${activeCourses.length} หลักสูตร`,
        headline: `ผ่านคัดเลือก ${approvedCount} คน · สำรอง ${reserveCount} คน`,
        detail: `อัปโหลดไฟล์ PDF ประกาศรายชื่อแล้ว ${announcedCount} จาก ${activeCourses.length} หลักสูตร`,
        tone:
          announcedCount === activeCourses.length && activeCourses.length > 0
            ? "success"
            : announcedCount > 0
              ? "info"
              : "neutral",
      };
    }

    case "training_schedule": {
      const completedCourses = activeCourses.filter(
        (c) => c.status === "completed"
      ).length;
      const firstDate = activeCourses[0]?.date?.trim() || "ยังไม่ระบุกำหนดการ";
      return {
        badge: `เสร็จสิ้น ${completedCourses}/${activeCourses.length} หลักสูตร`,
        headline: `จัดอบรมครบ ${completedCourses}/${activeCourses.length} หลักสูตร`,
        detail:
          activeCourses.length > 0
            ? `หลักสูตรล่าสุด: ${firstDate}`
            : "ยังไม่มีข้อมูลกำหนดการหลักสูตรปัจจุบัน",
        tone:
          completedCourses === activeCourses.length && activeCourses.length > 0
            ? "success"
            : "info",
      };
    }

    case "alumni_transfer": {
      const targetYearNum = Number(input.fiscalYearBE);
      const yearTrainees = Number.isFinite(targetYearNum)
        ? input.trainees.filter((t) => t.yearBE === targetYearNum)
        : [];
      return {
        badge: `ปี ${input.fiscalYearBE}: ${yearTrainees.length} คน`,
        headline: `ทำเนียบปี พ.ศ. ${input.fiscalYearBE} จำนวน ${yearTrainees.length} รายการ`,
        detail: `ฐานข้อมูลทำเนียบบุคลากรทั้งหมดในระบบ ${input.trainees.length} รายการ`,
        tone: yearTrainees.length > 0 ? "success" : "neutral",
      };
    }

    case "budget_summary": {
      const totalBudget = activeCourses.reduce(
        (sum, c) => sum + (typeof c.budget === "number" ? c.budget : 0),
        0
      );
      const approvedCount = currentApps.filter(
        (a) => a.status === "approved"
      ).length;
      return {
        badge:
          totalBudget > 0
            ? `${totalBudget.toLocaleString("th-TH")} บาท`
            : "ยังไม่ระบุงบ",
        headline: `งบประมาณรวม ${activeCourses.length} หลักสูตร: ${totalBudget.toLocaleString("th-TH")} บาท`,
        detail:
          approvedCount > 0 && totalBudget > 0
            ? `เฉลี่ยประมาณ ${Math.round(totalBudget / approvedCount).toLocaleString("th-TH")} บาท/ผู้ผ่านคัดเลือก (${approvedCount} คน)`
            : `พร้อมสรุปข้อมูลความคุ้มค่างบประมาณในหน้า Dashboard`,
        tone: totalBudget > 0 ? "info" : "neutral",
      };
    }

    case "archive_status": {
      let totalDocs = 0;
      let archivedDocs = 0;
      for (const app of currentApps) {
        for (const doc of app.documents || []) {
          totalDocs += 1;
          if (isArchivedDocument(doc)) {
            archivedDocs += 1;
          }
        }
      }
      const remainingDocs = Math.max(0, totalDocs - archivedDocs);
      return {
        badge:
          totalDocs === 0
            ? "ยังไม่มีไฟล์แนบ"
            : remainingDocs === 0
              ? `สำรองครบ ${archivedDocs} ไฟล์`
              : `รอสำรอง ${remainingDocs} ไฟล์`,
        headline: `สำรองลง Google Drive แล้ว ${archivedDocs}/${totalDocs} ไฟล์`,
        detail:
          totalDocs === 0
            ? "ยังไม่มีไฟล์เอกสารผู้สมัครในหลักสูตรปัจจุบัน"
            : remainingDocs === 0
              ? "ไฟล์เอกสารแนบทั้งหมดถูกสำรองถาวรเรียบร้อยแล้ว"
              : `ยังมีไฟล์บน Cloud Storage รอสำรอง ${remainingDocs} ไฟล์`,
        tone:
          totalDocs > 0 && remainingDocs === 0
            ? "success"
            : remainingDocs > 0
              ? "warning"
              : "neutral",
      };
    }
  }
}

export function formatThaiShortDate(isoOrDate: string): string {
  if (!isoOrDate) return "-";
  const parsed = new Date(isoOrDate);
  if (Number.isNaN(parsed.getTime())) return isoOrDate;
  return parsed.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
}
