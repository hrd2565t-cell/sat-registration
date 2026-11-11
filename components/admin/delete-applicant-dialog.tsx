"use client";

import { useState } from "react";
import { deleteApplication } from "@/lib/applications-store";

interface DeleteApplicantDialogProps {
  open: boolean;
  applicantRef: string;
  applicantName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function DeleteApplicantDialog({
  open,
  applicantRef,
  applicantName,
  onClose,
  onSuccess,
}: DeleteApplicantDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const ok = await deleteApplication(applicantRef);
      if (ok) {
        setIsDeleting(false);
        onClose();
        if (onSuccess) onSuccess();
      } else {
        setError("ไม่สามารถลบข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
        setIsDeleting(false);
      }
    } catch (err) {
      console.error("Delete applicant error:", err);
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการลบข้อมูล");
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      <div className="w-full max-w-md rounded-xl border border-[#fecaca] bg-white p-5 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fee2e2] text-[#dc2626]">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </div>

          <div className="min-w-0 flex-1">
            <h3
              id="delete-dialog-title"
              className="text-[15px] font-bold text-[#111827]"
            >
              ยืนยันการลบใบสมัคร
            </h3>
            <p className="mt-1 text-[12px] text-[#4b5563]">
              คุณกำลังจะลบใบสมัครของ{" "}
              <strong className="text-[#111827]">{applicantName}</strong> (รหัส{" "}
              <span className="font-mono font-bold text-[#1e3a8a]">
                {applicantRef}
              </span>
              )
            </p>
          </div>
        </div>

        <div className="mt-3.5 rounded-lg border border-[#fca5a5]/70 bg-[#fff5f5] p-3 text-[11.5px] leading-relaxed text-[#991b1b]">
          <p className="font-semibold flex items-center gap-1 text-[#b91c1c]">
            <span>⚠️</span>
            <span>คำเตือนสำคัญ:</span>
          </p>
          <ul className="mt-1 list-disc pl-4 space-y-0.5 text-[11px] text-[#7f1d1d]">
            <li>ข้อมูลใบสมัครและประวัติการตรวจสอบจะถูกลบออกจากฐานข้อมูลถาวร</li>
            <li>ไฟล์เอกสารแนบทั้งหมด (PDF / รูปถ่าย) จะถูกลบออกจาก Cloud Storage เพื่อคืนพื้นที่</li>
            <li>โควตาที่นั่งของหลักสูตรจะถูกคืนกลับเข้าสู่ระบบทันที</li>
            <li>การดำเนินการนี้<strong>ไม่สามารถกู้คืนได้</strong></li>
          </ul>
        </div>

        {error && (
          <div className="mt-3 rounded-md bg-red-50 p-2.5 text-[11.5px] font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2 border-t border-[#f1f5f9] pt-3.5">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-[6px] border border-[#d1d5db] bg-white px-3.5 text-[12px] font-medium text-[#374151] transition-colors hover:bg-[#f9fafb] disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={handleDelete}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[6px] bg-[#dc2626] px-4 text-[12px] font-semibold text-white shadow-xs transition-colors hover:bg-[#b91c1c] disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <svg
                  className="h-3.5 w-3.5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                <span>กำลังลบข้อมูล...</span>
              </>
            ) : (
              <>
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                <span>ยืนยันการลบถาวร</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
