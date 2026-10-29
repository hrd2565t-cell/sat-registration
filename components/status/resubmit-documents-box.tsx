"use client";

import { useState } from "react";
import { FileUpload, type FileItem } from "@/components/ui/file-upload";
import {
  resubmitApplicantDocuments,
  type ApplicantDocument,
  type ApplicantRecord,
} from "@/lib/applications-store";

interface ResubmitDocumentsBoxProps {
  application: ApplicantRecord;
  onSuccess?: () => void;
}

const DOC_KIND_OPTIONS: {
  kind: "photo" | "cover" | "certificate" | "idcard" | "saka";
  label: string;
}[] = [
  { kind: "photo", label: "1. รูปถ่ายหน้าตรง (JPG/PNG)" },
  { kind: "cover", label: "2. หนังสือนำส่งจากต้นสังกัดหรือสมาคมกีฬา (PDF/รูปภาพ)" },
  { kind: "certificate", label: "3. หนังสือรับรองการปฏิบัติหน้าที่ (PDF/รูปภาพ)" },
  { kind: "idcard", label: "4. สำเนาบัตรประจำตัวประชาชน พร้อมลงนามรับรอง (PDF/รูปภาพ)" },
  { kind: "saka", label: "5. สำเนาใบ ส.ฬ. 8 (PDF/รูปภาพ)" },
];

export function ResubmitDocumentsBox({ application, onSuccess }: ResubmitDocumentsBoxProps) {
  const [selectedKind, setSelectedKind] = useState<
    "photo" | "cover" | "certificate" | "idcard" | "saka"
  >("idcard");
  const [newFiles, setNewFiles] = useState<FileItem[]>([]);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleUpload = async () => {
    if (newFiles.length === 0) {
      setError("กรุณาเลือกไฟล์เอกสารที่ต้องการส่งเพิ่มเติม");
      return;
    }
    setError("");
    setIsSubmitting(true);

    try {
      const file = newFiles[0];
      const kindLabel = DOC_KIND_OPTIONS.find((k) => k.kind === selectedKind)?.label || selectedKind;

      const newDoc: ApplicantDocument = {
        id: `doc-${Date.now()}-${selectedKind}`,
        name: `${file.name} (แนบใหม่)`,
        size: file.size,
        dataUrl: file.dataUrl,
        kind: selectedKind,
      };

      // Replace or append doc in existing documents
      const existingDocs = application.documents.filter(
        (d: ApplicantDocument) => d.kind !== selectedKind
      );
      const updatedDocs = [...existingDocs, newDoc];

      const noteText = message.trim()
        ? `ผู้สมัครส่งเอกสาร ${kindLabel} เพิ่มเติม: ${message.trim()}`
        : `ผู้สมัครแนบเอกสาร ${kindLabel} เพิ่มเติมเรียบร้อยแล้ว`;

      resubmitApplicantDocuments(application.ref, updatedDocs, noteText);
      setSubmitted(true);
      if (onSuccess) onSuccess();
    } catch {
      setError("เกิดข้อผิดพลาดในการส่งเอกสาร กรุณาลองใหม่อีกครั้ง");
    } finally {
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
          ระบบได้ปรับสถานะใบสมัครของท่านกลับเป็น <strong>&ldquo;รอตรวจสอบ&rdquo;</strong> และส่งแจ้งเตือนให้เจ้าหน้าที่ดำเนินการตรวจรอบใหม่แล้ว
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
            กล่องส่งเอกสารเพิ่มเติม / แก้ไขเอกสารตามคำขอ
          </h4>
          <p className="mt-0.5 text-[11px] text-[#78350f]">
            กรุณาเลือกประเภทเอกสารที่ต้องการส่งใหม่ แนบไฟล์ แล้วกดยืนยันส่งข้อมูลกลับให้เจ้าหน้าที่ตรวจสอบ
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-3">
        <div>
          <label className="block text-[11px] font-semibold text-[#78350f]">
            1. เลือกเอกสารที่ต้องการส่งเพิ่มเติม / แก้ไข
          </label>
          <select
            value={selectedKind}
            onChange={(e) => {
              setSelectedKind(
                e.target.value as "photo" | "cover" | "certificate" | "idcard" | "saka"
              );
              setNewFiles([]);
            }}
            className="mt-1 block w-full rounded-md border border-[#f59e0b] bg-white px-2.5 py-1.5 text-[12px] text-[#111827] focus:border-[#d97706] focus:outline-none focus:ring-1 focus:ring-[#d97706]"
          >
            {DOC_KIND_OPTIONS.map((opt) => (
              <option key={opt.kind} value={opt.kind}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-[#78350f]">
            2. แนบไฟล์เอกสารใหม่ (ไฟล์รูป JPG/PNG หรือเอกสาร PDF)
          </label>
          <div className="mt-1">
            <FileUpload
              files={newFiles}
              onAdd={(file) => setNewFiles([file])}
              onRemove={() => setNewFiles([])}
              emptyText="คลิกหรือลากไฟล์มาที่นี่เพื่อแนบเอกสารฉบับแก้ไข"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-[#78350f]">
            3. ข้อความชี้แจงเพิ่มเติมถึงเจ้าหน้าที่ (ถ้ามี)
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
          <p className="text-[11px] font-medium text-[#b91c1c]">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleUpload}
          disabled={isSubmitting || newFiles.length === 0}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-[5px] bg-[#d97706] px-4 py-2 text-[12px] font-bold text-white shadow-sm transition-colors hover:bg-[#b45309] disabled:opacity-50"
        >
          {isSubmitting ? (
            "กำลังส่งเอกสาร..."
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
