import type { ApplicantDocument, ApplicantRecord } from "@/lib/applications-store";
import { getCourseDocumentConfig, type Course } from "@/lib/courses";

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
  totalAttachedCount: number;
  status: "complete" | "incomplete" | "none";
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
    .filter((k) => docConfig[k]?.enabled)
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
    totalAttachedCount,
    status,
  };
}
