import type {
  ApplicantDocument,
  ApplicantDocumentKind,
  ApplicantRecord,
} from "@/lib/applications-store";
import {
  getCourseDocumentConfig,
  isDocumentApplicableForAffiliation,
  type Course,
} from "@/lib/courses";

export const ALL_DOCUMENT_KINDS: readonly ApplicantDocumentKind[] = [
  "photo",
  "cover",
  "idcard",
  "certificate",
  "saka",
];

export interface DocumentCheckItem {
  key: "photo" | "cover" | "certificate" | "idcard" | "saka";
  label: string;
  required: boolean;
  enabled: boolean;
  isAttached: boolean;
  attachedDoc?: ApplicantDocument;
}

export interface DocumentAuditResult {
  items: DocumentCheckItem[];
  requiredCount: number;
  attachedRequiredCount: number;
  missingRequiredCount: number;
  missingRequiredLabels: string[];
  missingRequiredKinds: ApplicantDocumentKind[];
  totalAttachedCount: number;
  status: "complete" | "incomplete" | "none";
}

/**
 * เดาชนิดเอกสารที่เจ้าหน้าที่ขอเพิ่มเติมจากข้อความเหตุผล (รองรับใบสมัครเดิมที่ยังไม่เก็บ requestedDocKinds)
 */
export function inferRequestedDocumentKindsFromReason(
  reason: string | null | undefined,
  allowedKinds?: ApplicantDocumentKind[]
): ApplicantDocumentKind[] {
  if (!reason || !reason.trim()) return [];
  const text = reason.trim();
  const patterns: { kind: ApplicantDocumentKind; regex: RegExp }[] = [
    { kind: "photo", regex: /รูปถ่าย|ภาพถ่าย|หน้าตรง/i },
    { kind: "cover", regex: /หนังสือนำส่ง|หนังสือส่งตัว|ตราประทับ/i },
    { kind: "certificate", regex: /หนังสือรับรอง|ปฏิบัติหน้าที่/i },
    { kind: "idcard", regex: /บัตรประชาชน|บัตรประจำตัวประชาชน|บัตรข้าราชการ/i },
    { kind: "saka", regex: /ส\.?ฬ\.?\s*8/i },
  ];

  const found: ApplicantDocumentKind[] = [];
  for (const { kind, regex } of patterns) {
    if (regex.test(text)) {
      if (!allowedKinds || allowedKinds.includes(kind)) {
        if (!found.includes(kind)) found.push(kind);
      }
    }
  }
  return found;
}

/**
 * หาชนิดเอกสารที่ต้องแสดงให้ผู้สมัครแนบเพิ่มเติม (จากรายการที่แอดมินเลือกตรง หรือเดาจากเหตุผล หรือแสดงทั้งหมดเป็น Fallback)
 */
export function resolveRequestedDocumentKinds(params: {
  requestedDocKinds?: ApplicantDocumentKind[] | null;
  reviewReason?: string | null;
  allowedKinds: ApplicantDocumentKind[];
}): {
  kinds: ApplicantDocumentKind[];
  source: "explicit" | "inferred" | "fallback_all";
} {
  const { requestedDocKinds, reviewReason, allowedKinds } = params;
  if (Array.isArray(requestedDocKinds) && requestedDocKinds.length > 0) {
    const filtered = Array.from(
      new Set(requestedDocKinds.filter((k) => allowedKinds.includes(k)))
    );
    if (filtered.length > 0) {
      return { kinds: filtered, source: "explicit" };
    }
  }

  const inferred = inferRequestedDocumentKindsFromReason(
    reviewReason,
    allowedKinds
  );
  if (inferred.length > 0) {
    return { kinds: inferred, source: "inferred" };
  }

  return { kinds: [], source: "fallback_all" };
}

/**
 * ตรวจสอบความครบถ้วนของเอกสารที่ผู้สมัครแนบมา เทียบกับเกณฑ์บังคับของหลักสูตร
 */
export function auditApplicantDocuments(
  applicant: ApplicantRecord | null | undefined,
  course?: Course | null
): DocumentAuditResult {
  if (!applicant) {
    return {
      items: [],
      requiredCount: 0,
      attachedRequiredCount: 0,
      missingRequiredCount: 0,
      missingRequiredLabels: [],
      missingRequiredKinds: [],
      totalAttachedCount: 0,
      status: "none",
    };
  }

  const docConfig = getCourseDocumentConfig(course);
  const docs = applicant.documents || [];

  // ฟังก์ชันจับคู่เอกสารให้ตรงกับประเภท (kind)
  const findDoc = (
    kind: "photo" | "cover" | "certificate" | "idcard" | "saka"
  ): ApplicantDocument | undefined => {
    if (kind === "photo") {
      return docs.find((d) => d.kind === "photo");
    }
    if (kind === "cover") {
      return docs.find((d) => d.kind === "cover");
    }
    if (kind === "idcard") {
      return docs.find(
        (d) =>
          d.kind === "idcard" ||
          (d.type && d.type.startsWith("idcard:")) ||
          (d.name && d.name.includes("บัตร"))
      );
    }
    if (kind === "certificate") {
      return docs.find(
        (d) =>
          d.kind === "certificate" &&
          !(d.type && d.type.startsWith("idcard:")) &&
          !(d.name && d.name.includes("บัตร"))
      );
    }
    if (kind === "saka") {
      return docs.find((d) => d.kind === "saka");
    }
    return undefined;
  };

  const keys: Array<"photo" | "cover" | "certificate" | "idcard" | "saka"> = [
    "photo",
    "cover",
    "idcard",
    "certificate",
    "saka",
  ];

  const DEFAULT_DOC_LABELS: Record<string, string> = {
    photo: "รูปถ่ายหน้าตรง",
    cover: "หนังสือนำส่งจากต้นสังกัด",
    certificate: "หนังสือรับรองการปฏิบัติหน้าที่",
    idcard: "สำเนาบัตรประชาชน / บัตรข้าราชการ",
    saka: "สำเนาใบ ส.ฬ. 8",
  };

  const items: DocumentCheckItem[] = keys
    .filter((k) => isDocumentApplicableForAffiliation(docConfig[k], applicant.affiliation))
    .map((k) => {
      const cfg = docConfig[k];
      const attached = findDoc(k);
      return {
        key: k,
        label: cfg?.label || DEFAULT_DOC_LABELS[k] || k,
        required: Boolean(cfg?.required),
        enabled: Boolean(cfg?.enabled),
        isAttached: Boolean(attached),
        attachedDoc: attached,
      };
    });

  const requiredItems = items.filter((i) => i.required);
  const requiredCount = requiredItems.length;
  const attachedRequiredCount = requiredItems.filter((i) => i.isAttached).length;
  const missingRequired = requiredItems.filter((i) => !i.isAttached);
  const missingRequiredCount = missingRequired.length;
  const missingRequiredLabels = missingRequired.map((i) => i.label);
  const missingRequiredKinds = missingRequired.map((i) => i.key);
  const totalAttachedCount = items.filter((i) => i.isAttached).length;

  let status: "complete" | "incomplete" | "none" = "complete";
  if (totalAttachedCount === 0) {
    status = "none";
  } else if (missingRequiredCount > 0) {
    status = "incomplete";
  } else {
    status = "complete";
  }

  return {
    items,
    requiredCount,
    attachedRequiredCount,
    missingRequiredCount,
    missingRequiredLabels,
    missingRequiredKinds,
    totalAttachedCount,
    status,
  };
}
