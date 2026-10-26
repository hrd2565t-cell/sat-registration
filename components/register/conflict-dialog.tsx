"use client";

import Link from "next/link";
import type { ApplicantRecord } from "@/lib/applications-store";
import type { Course } from "@/lib/courses";
import { formatThaiDateTime } from "@/lib/applications-store";
import { StatusBadge } from "@/components/admin/status-badge";

interface ConflictDialogProps {
  isOpen: boolean;
  reason: "duplicate_course" | "date_conflict";
  existingRecord: ApplicantRecord;
  targetCourse: Course;
  conflictingCourse?: Course;
  onClose: () => void;
}

export function ConflictDialog({
  isOpen,
  reason,
  existingRecord,
  targetCourse,
  conflictingCourse,
  onClose,
}: ConflictDialogProps) {
  if (!isOpen) return null;

  const isDuplicate = reason === "duplicate_course";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="ปิดหน้าต่าง"
        onClick={onClose}
        className="fixed inset-0 bg-[#0f172a]/60 backdrop-blur-[2px] transition-opacity"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-[520px] overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header Ribbon */}
        <div
          className={`px-5 py-4 ${
            isDuplicate
              ? "bg-gradient-to-r from-[#eff6ff] to-[#f8fbff] border-b border-[#bfdbfe]"
              : "bg-gradient-to-r from-[#fffbeb] to-[#fffdf5] border-b border-[#fde68a]"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                isDuplicate
                  ? "bg-[#dbeafe] text-[#1e40af]"
                  : "bg-[#fef3c7] text-[#b45309]"
              }`}
            >
              {isDuplicate ? (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-[16px] font-bold text-[#111827]">
                {isDuplicate
                  ? "ท่านได้ยื่นสมัครในหลักสูตรนี้แล้ว"
                  : "ช่วงเวลาการอบรมซ้อนทับกับหลักสูตรที่เคยสมัคร"}
              </h3>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#4b5563]">
                {isDuplicate
                  ? "ระบบตรวจพบว่าเลขบัตรประจำตัวประชาชนนี้ มีข้อมูลการสมัครในหลักสูตรนี้อยู่แล้ว"
                  : "ไม่สามารถสมัครหลักสูตรนี้ได้ เนื่องจากมีช่วงเวลาจัดอบรมตรงกับหลักสูตรที่ท่านได้ยื่นสมัครไว้"}
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="space-y-3.5 p-5">
          {isDuplicate ? (
            <div className="rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-3.5 text-[12px] space-y-2">
              <div className="flex items-center justify-between gap-2 border-b border-[#e5e7eb] pb-2">
                <span className="font-medium text-[#6b7280]">รหัสอ้างอิง:</span>
                <span className="font-bold text-[#1e3a8a] text-[13px]">
                  {existingRecord.ref}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-[#6b7280] shrink-0">หลักสูตร:</span>
                <span className="font-semibold text-right text-[#111827]">
                  {targetCourse.title}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-[#6b7280]">สถานะปัจจุบัน:</span>
                <StatusBadge
                  status={existingRecord.status}
                  reserveOrder={existingRecord.reserveOrder}
                />
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px] text-[#6b7280]">
                <span>วันที่ยื่นสมัคร:</span>
                <span>{formatThaiDateTime(existingRecord.submittedAt)}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="rounded-lg border border-[#fde68a] bg-[#fffdf5] p-3 text-[11.5px] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#92400e]">
                    1. หลักสูตรที่ท่านสมัครไว้แล้ว ({existingRecord.ref})
                  </span>
                  <StatusBadge
                    status={existingRecord.status}
                    reserveOrder={existingRecord.reserveOrder}
                  />
                </div>
                <p className="font-medium text-[#1f2937]">
                  {conflictingCourse?.title ?? existingRecord.courseTitle}
                </p>
                <p className="text-[#b45309] font-medium text-[11px]">
                  📅 ช่วงวันที่จัดอบรม: {conflictingCourse?.date ?? "ไม่ระบุ"}
                </p>
              </div>

              <div className="flex justify-center text-[#9ca3af]">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              </div>

              <div className="rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-3 text-[11.5px] space-y-1.5 opacity-90">
                <span className="font-semibold text-[#4b5563]">
                  2. หลักสูตรใหม่ที่กำลังจะสมัคร
                </span>
                <p className="font-medium text-[#111827]">
                  {targetCourse.title}
                </p>
                <p className="text-[#dc2626] font-medium text-[11px]">
                  📅 ช่วงวันที่จัดอบรม: {targetCourse.date} (วันเวลาทับซ้อนกัน)
                </p>
              </div>
            </div>
          )}

          <p className="text-[11px] leading-relaxed text-[#6b7280]">
            {isDuplicate
              ? "💡 ท่านไม่ต้องยื่นสมัครซ้ำ สามารถติดตามผลการคัดเลือก หรือพิมพ์เอกสารยืนยันการสมัครได้ที่หน้าระบบตรวจสอบสถานะ"
              : "💡 กกท. อนุญาตให้ผู้สมัครลงทะเบียนได้หลายหลักสูตร แต่ช่วงเวลาการอบรมต้องไม่ซ้อนทับกัน เพื่อให้สามารถเข้ารับการอบรมได้ครบถ้วนตามเกณฑ์"}
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col gap-2 border-t border-[#e5e7eb] bg-[#f9fafb] px-5 py-3.5 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-[5px] border border-[#d1d5db] bg-white px-3.5 text-[11.5px] font-medium text-[#374151] transition-colors hover:bg-[#f3f4f6]"
          >
            ปิดหน้าต่าง
          </button>
          <Link
            href="/"
            className="inline-flex h-9 items-center justify-center rounded-[5px] border border-[#c7d7ea] bg-white px-3.5 text-[11.5px] font-semibold text-[#1e3a8a] transition-colors hover:bg-[#eff6ff]"
          >
            เลือกหลักสูตรอื่น
          </Link>
          <Link
            href={`/status?id=${encodeURIComponent(existingRecord.idCard)}`}
            className="inline-flex h-9 items-center justify-center rounded-[5px] bg-[#1e3a8a] px-4 text-[11.5px] font-semibold text-white shadow-sm transition-colors hover:bg-[#1e40af]"
          >
            ตรวจสอบสถานะการสมัคร
          </Link>
        </div>
      </div>
    </div>
  );
}
