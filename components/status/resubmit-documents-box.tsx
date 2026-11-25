"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FileUpload, type FileItem } from "@/components/ui/file-upload";
import {
  resubmitApplicantDocuments,
  type ApplicantDocument,
  type ApplicantDocumentKind,
  type ApplicantRecord,
} from "@/lib/applications-store";
import {
  getCourseDocumentConfig,
  isDocumentApplicableForAffiliation,
  SAKA_ASSOCIATION_HINT,
  type Course,
} from "@/lib/courses";
import { resolveRequestedDocumentKinds } from "@/lib/document-checklist";
import { saveDocumentToStorage } from "@/lib/document-storage";

interface ResubmitDocumentsBoxProps {
  application: ApplicantRecord;
  course?: Course | null;
  onSuccess?: () => void;
}

const DEFAULT_DOC_LABELS: Record<ApplicantDocumentKind, string> = {
  photo: "รูปถ่ายหน้าตรง ถ่ายไม่เกิน 6 เดือน (JPG/PNG)",
  cover: "หนังสือนำส่งจากต้นสังกัดหรือสมาคมกีฬา (PDF/รูปภาพ)",
  certificate: "หนังสือรับรองการปฏิบัติหน้าที่ (PDF/รูปภาพ)",
  idcard: "สำเนาบัตรประจำตัวประชาชน พร้อมลงนามรับรองสำเนาถูกต้อง (PDF/รูปภาพ)",
  saka: "สำเนาใบ ส.ฬ. 8 (PDF/รูปภาพ)",
};

const DOC_KIND_ORDER: ApplicantDocumentKind[] = [
  "photo",
  "cover",
  "certificate",
  "idcard",
  "saka",
];

export function ResubmitDocumentsBox({
  application,
  course,
  onSuccess,
}: ResubmitDocumentsBoxProps) {
  const availableDocOptions = useMemo(() => {
    const docConfig = course ? getCourseDocumentConfig(course) : null;
    return DOC_KIND_ORDER.filter((kind) =>
      docConfig
        ? isDocumentApplicableForAffiliation(docConfig[kind], application.affiliation)
        : true
    ).map((kind, idx) => ({
      kind,
      shortLabel: docConfig?.[kind]?.label || DEFAULT_DOC_LABELS[kind],
      numberedLabel: `${idx + 1}. ${docConfig?.[kind]?.label || DEFAULT_DOC_LABELS[kind]}`,
    }));
  }, [course, application.affiliation]);

  const resolvedRequest = useMemo(() => {
    return resolveRequestedDocumentKinds({
      requestedDocKinds: application.requestedDocKinds,
      reviewReason: application.reviewReason,
      allowedKinds: availableDocOptions.map((o) => o.kind),
    });
  }, [application.requestedDocKinds, application.reviewReason, availableDocOptions]);

  const targetedKinds = resolvedRequest.kinds;
  const isTargetedMode = targetedKinds.length > 0;

  const [selectedKind, setSelectedKind] =
    useState<ApplicantDocumentKind>("idcard");
  const [filesByKind, setFilesByKind] = useState<
    Partial<Record<ApplicantDocumentKind, FileItem[]>>
  >({});
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    if (
      !isTargetedMode &&
      availableDocOptions.length > 0 &&
      !availableDocOptions.some((opt) => opt.kind === selectedKind)
    ) {
      setSelectedKind(availableDocOptions[0].kind);
    }
  }, [isTargetedMode, availableDocOptions, selectedKind]);

  const kindsToSubmit: ApplicantDocumentKind[] = isTargetedMode
    ? targetedKinds
    : [selectedKind];

  const attachedSlotCount = kindsToSubmit.filter(
    (k) => (filesByKind[k]?.length ?? 0) > 0
  ).length;
  const isReadyToSubmit =
    kindsToSubmit.length > 0 && attachedSlotCount === kindsToSubmit.length;

  const setFilesForKind = (kind: ApplicantDocumentKind, items: FileItem[]) => {
    setFilesByKind((prev) => ({
      ...prev,
      [kind]: items,
    }));
    if (error) setError("");
  };

  const handleUpload = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    if (!isReadyToSubmit) {
      isSubmittingRef.current = false;
      setError(
        targetedKinds.length > 1
          ? "กรุณาแนบไฟล์เอกสารให้ครบทุกรายการที่เจ้าหน้าที่ร้องขอ"
          : "กรุณาเลือกไฟล์เอกสารที่ต้องการส่งเพิ่มเติม"
      );
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const submittedKindsSet = new Set<ApplicantDocumentKind>(kindsToSubmit);
      const newDocs: ApplicantDocument[] = [];
      const submittedLabels: string[] = [];

      for (const kind of kindsToSubmit) {
        const files = filesByKind[kind];
        const file = files?.[0];
        if (!file) continue;

        const opt = availableDocOptions.find((o) => o.kind === kind);
        submittedLabels.push(opt?.shortLabel || DEFAULT_DOC_LABELS[kind]);

        const newDoc: ApplicantDocument = {
          id: `doc-${Date.now()}-${kind}`,
          name: `${file.name} (แนบใหม่)`,
          size: file.size,
          dataUrl: file.dataUrl,
          type: file.type,
          kind,
        };

        if (file.dataUrl) {
          try {
            await saveDocumentToStorage({
              id: newDoc.id,
              name: newDoc.name,
              type: file.type || "application/octet-stream",
              size: newDoc.size,
              dataUrl: file.dataUrl,
              savedAt: new Date().toISOString(),
            });
            if (typeof window !== "undefined") {
              sessionStorage.setItem(`sat-doc-${newDoc.id}`, file.dataUrl);
              if (kind === "photo") {
                sessionStorage.setItem("sat-latest-photo", file.dataUrl);
                if (application.idCard) {
                  sessionStorage.setItem(
                    `sat-photo-idcard-${application.idCard.replace(/\D/g, "")}`,
                    file.dataUrl
                  );
                }
              }
            }
          } catch {
            // Ignore local storage errors
          }
        }

        newDocs.push(newDoc);
      }

      // เก็บเอกสารรายการอื่นของผู้สมัครที่ผ่านแล้วไว้ครบถ้วน แทนที่เฉพาะชนิดเอกสารที่ส่งเข้ามาใหม่
      const preservedDocs = application.documents.filter(
        (d: ApplicantDocument) => !submittedKindsSet.has(d.kind)
      );
      const updatedDocs = [...preservedDocs, ...newDocs];

      const joinedLabels = submittedLabels.join(", ");
      const noteText = message.trim()
        ? `ผู้สมัครส่งเอกสาร (${joinedLabels}) เพิ่มเติม: ${message.trim()}`
        : `ผู้สมัครแนบเอกสาร (${joinedLabels}) เพิ่มเติมเรียบร้อยแล้ว`;

      const res = await resubmitApplicantDocuments(
        application.ref,
        updatedDocs,
        noteText
      );

      if (res.failedDocs > 0) {
        setError(
          "อัปโหลดไฟล์ขึ้นระบบกลางไม่สมบูรณ์บางรายการ กรุณาลองกดส่งอีกครั้ง"
        );
        return;
      }

      setSubmitted(true);
      if (onSuccess) onSuccess();
    } catch {
      setError("เกิดข้อผิดพลาดในการส่งเอกสาร กรุณาลองใหม่อีกครั้ง");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="mt-3 rounded-lg border border-[#86efac] bg-[#f0fdf4] p-4 text-center">
        <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-[#22c55e] text-white">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h4 className="mt-2 text-[13px] font-bold text-[#14532d]">
          ส่งเอกสารเพิ่มเติมเรียบร้อยแล้ว!
        </h4>
        <p className="mt-1 text-[11px] text-[#166534]">
          ระบบได้อัปโหลดเอกสารและปรับสถานะใบสมัครของท่านกลับเป็น{" "}
          <strong>&ldquo;รอตรวจสอบ&rdquo;</strong> ให้เจ้าหน้าที่ตรวจรอบใหม่แล้ว
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-[#fde68a] bg-[#fffbeb] p-3.5 sm:p-4 text-left">
      <div className="flex items-start gap-2.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#d97706] text-white">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-[13px] font-bold text-[#92400e]">
            {isTargetedMode
              ? targetedKinds.length === 1
                ? "ส่งเอกสารเพิ่มเติมตามรายการที่เจ้าหน้าที่ร้องขอ"
                : `ส่งเอกสารเพิ่มเติม ${targetedKinds.length} รายการตามคำขอเจ้าหน้าที่`
              : "กล่องส่งเอกสารเพิ่มเติม / แก้ไขเอกสารตามคำขอ"}
          </h4>
          <p className="mt-0.5 text-[11px] text-[#78350f]">
            {isTargetedMode
              ? "ระบบแสดงเฉพาะช่องเอกสารที่เจ้าหน้าที่แจ้งขอเพิ่มเติม กรุณาแนบไฟล์แล้วกดยืนยันส่งข้อมูลกลับ"
              : "กรุณาเลือกประเภทเอกสารที่ต้องการส่งใหม่ แนบไฟล์ แล้วกดยืนยันส่งข้อมูลกลับให้เจ้าหน้าที่ตรวจสอบ"}
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {isTargetedMode ? (
          <div className="space-y-3">
            {targetedKinds.length > 1 && (
              <div className="flex items-center justify-between rounded-md border border-[#fcd34d] bg-[#fef3c7]/70 px-3 py-1.5 text-[11px] font-semibold text-[#92400e]">
                <span>แนบเอกสารให้ครบทุกรายการเพื่อส่งในครั้งเดียว</span>
                <span>
                  แนบแล้ว {attachedSlotCount}/{targetedKinds.length} รายการ
                </span>
              </div>
            )}

            {targetedKinds.map((kind, idx) => {
              const opt = availableDocOptions.find((o) => o.kind === kind);
              const title = opt?.shortLabel || DEFAULT_DOC_LABELS[kind];
              const currentFiles = filesByKind[kind] || [];
              const hasFile = currentFiles.length > 0;
              const isPhotoOnly = kind === "photo";

              return (
                <div
                  key={kind}
                  className="rounded-lg border border-[#fcd34d] bg-white p-3"
                >
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <label className="text-[11.5px] font-bold text-[#78350f]">
                      {targetedKinds.length > 1 ? `${idx + 1}. ` : ""}
                      {title}
                    </label>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        hasFile
                          ? "bg-[#dcfce7] text-[#166534] border border-[#86efac]"
                          : "bg-[#ffedd5] text-[#9a3412] border border-[#fed7aa]"
                      }`}
                    >
                      {hasFile ? "✓ แนบไฟล์แล้ว" : "ต้องแนบไฟล์"}
                    </span>
                  </div>
                  <FileUpload
                    files={currentFiles}
                    onAdd={(file) => setFilesForKind(kind, [file])}
                    onRemove={() => setFilesForKind(kind, [])}
                    emptyText={`คลิกหรือลากไฟล์ "${title}" มาที่นี่`}
                    accept={
                      isPhotoOnly
                        ? ".jpg,.jpeg,.png,.webp"
                        : ".pdf,.jpg,.jpeg,.png,.webp"
                    }
                  />
                  {kind === "saka" && (
                    <p className="mt-1.5 text-[10.5px] text-[#78350f]">
                      📌 {SAKA_ASSOCIATION_HINT}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <>
            <div>
              <label className="block text-[11px] font-semibold text-[#78350f]">
                1. เลือกเอกสารที่ต้องการส่งเพิ่มเติม / แก้ไข
              </label>
              <select
                value={selectedKind}
                onChange={(e) => {
                  const nextKind = e.target.value as ApplicantDocumentKind;
                  setSelectedKind(nextKind);
                  setFilesByKind({});
                }}
                className="mt-1 block w-full rounded-md border border-[#f59e0b] bg-white px-2.5 py-1.5 text-[12px] text-[#111827] focus:border-[#d97706] focus:outline-none focus:ring-1 focus:ring-[#d97706]"
              >
                {availableDocOptions.map((opt) => (
                  <option key={opt.kind} value={opt.kind}>
                    {opt.numberedLabel}
                  </option>
                ))}
              </select>
              {selectedKind === "saka" && (
                <p className="mt-1 text-[10.5px] text-[#78350f]">
                  📌 {SAKA_ASSOCIATION_HINT}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#78350f]">
                2. แนบไฟล์เอกสารใหม่ (ไฟล์รูป JPG/PNG หรือเอกสาร PDF)
              </label>
              <div className="mt-1">
                <FileUpload
                  files={filesByKind[selectedKind] || []}
                  onAdd={(file) => setFilesForKind(selectedKind, [file])}
                  onRemove={() => setFilesForKind(selectedKind, [])}
                  emptyText="คลิกหรือลากไฟล์มาที่นี่เพื่อแนบเอกสารฉบับแก้ไข"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                />
              </div>
            </div>
          </>
        )}

        <div>
          <label className="block text-[11px] font-semibold text-[#78350f]">
            {isTargetedMode ? "ข้อความชี้แจงเพิ่มเติมถึงเจ้าหน้าที่ (ถ้ามี)" : "3. ข้อความชี้แจงเพิ่มเติมถึงเจ้าหน้าที่ (ถ้ามี)"}
          </label>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="เช่น แนบสำเนาบัตรประชาชนใหม่ที่ลงลายมือชื่อรับรองสำเนาถูกต้องแล้วครับ"
            className="mt-1 block w-full rounded-md border border-[#f59e0b] bg-white px-2.5 py-1.5 text-[11.5px] text-[#111827] placeholder:text-[#9ca3af] focus:border-[#d97706] focus:outline-none focus:ring-1 focus:ring-[#d97706]"
          />
        </div>

        {error && (
          <p role="alert" className="text-[11px] font-medium text-[#b91c1c]">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleUpload}
          disabled={isSubmitting || !isReadyToSubmit}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-[5px] bg-[#d97706] px-4 py-2 text-[12px] font-bold text-white shadow-sm transition-colors hover:bg-[#b45309] disabled:opacity-50"
        >
          {isSubmitting ? (
            "กำลังอัปโหลดเอกสารขึ้นระบบ..."
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              ยืนยันส่งเอกสารเพิ่มเติม (ส่งให้เจ้าหน้าที่ตรวจสอบใหม่)
            </>
          )}
        </button>
      </div>
    </div>
  );
}
