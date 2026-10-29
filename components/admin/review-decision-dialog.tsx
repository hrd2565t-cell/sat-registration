"use client";

import { useEffect, useRef, useState } from "react";

export type ReviewDecision = "approved" | "reserve" | "rejected" | "action_required";

const QUICK_ACTION_REASONS = [
  "สำเนาบัตรประชาชนไม่ชัดเจน หรือยังไม่ได้ลงนามรับรองสำเนาถูกต้อง",
  "หนังสือนำส่งไม่สมบูรณ์ หรือขาดตราประทับ/ลายมือชื่อผู้มีอำนาจ",
  "รูปถ่ายหน้าตรงไม่ตรงตามระเบียบ (กรุณาแนบรูปถ่ายหน้าตรงถ่ายไม่เกิน 6 เดือน)",
  "ขาดหนังสือรับรองการปฏิบัติหน้าที่ให้กับสมาคม/หน่วยงาน",
  "ขาดสำเนาใบ ส.ฬ. 8",
];

export function ReviewDecisionDialog({
  open,
  decision,
  applicantName,
  onClose,
  onConfirm,
}: {
  open: boolean;
  decision: ReviewDecision;
  applicantName: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 60);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const approved = decision === "approved";
  const reserve = decision === "reserve";
  const rejected = decision === "rejected";
  const actionRequired = decision === "action_required";

  const handleSubmit = () => {
    const trimmed = reason.trim();
    if (rejected && trimmed.length < 3) {
      setError("กรุณาระบุเหตุผลที่ไม่อนุมัติอย่างน้อย 3 ตัวอักษร");
      return;
    }
    if (actionRequired && trimmed.length < 3) {
      setError("กรุณาระบุเอกสารที่ต้องการให้ผู้สมัครแนบเพิ่มเติม");
      return;
    }
    onConfirm(trimmed);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="ปิดหน้าต่างยืนยัน"
        onClick={onClose}
        className="absolute inset-0 bg-[#0f172a]/55 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="decision-dialog-title"
        className="relative w-full max-w-[500px] rounded-t-xl border border-[#e5e7eb] bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-xl sm:p-5"
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              approved
                ? "bg-[#e8f8ee] text-[#176c3a]"
                : reserve
                  ? "bg-[#eff6ff] text-[#1e3a8a]"
                  : actionRequired
                    ? "bg-[#ffedd5] text-[#c2410c]"
                    : "bg-[#fce8e9] text-[#9e2a30]"
            }`}
          >
            {approved && (
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.2"
                  d="M5 12.5l4.2 4.2L19 7"
                />
              </svg>
            )}
            {reserve && (
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" strokeWidth="2" />
                <path strokeLinecap="round" strokeWidth="2" d="M12 7v5l3 3" />
              </svg>
            )}
            {actionRequired && (
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            )}
            {rejected && (
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.2"
                  d="M6 6l12 12M18 6L6 18"
                />
              </svg>
            )}
          </span>
          <div className="min-w-0">
            <h2
              id="decision-dialog-title"
              className="text-[16px] font-semibold text-[#111827]"
            >
              {approved
                ? "ยืนยันการอนุมัติ (ตัวจริง)"
                : reserve
                  ? "ยืนยันจัดเข้าบัญชีสำรอง"
                  : actionRequired
                    ? "แจ้งขอเอกสารเพิ่มเติม"
                    : "ยืนยันการไม่อนุมัติ"}
            </h2>
            <p className="mt-1 text-[12px] leading-relaxed text-[#4b5563]">
              {approved
                ? `อนุมัติคุณสมบัติของ ${applicantName} และเปิดให้พิมพ์บัตรเข้าร่วมอบรม`
                : reserve
                  ? `จัด ${applicantName} เข้าสู่บัญชีรายชื่อสำรอง (ระบบจะรันลำดับสำรองให้อัตโนมัติ)`
                  : actionRequired
                    ? `ระบบจะแจ้งให้ ${applicantName} ทราบในหน้าตรวจสอบสถานะ เพื่อให้แนบเอกสารที่ขาดส่งเข้ามาใหม่ได้ทันที`
                    : `ผู้สมัคร ${applicantName} จะเห็นสถานะไม่ผ่านและเหตุผลที่ระบุ`}
            </p>
          </div>
        </div>

        {actionRequired && (
          <div className="mt-3">
            <p className="text-[11px] font-medium text-[#4b5563]">
              คลิกเพื่อเลือกข้อความด่วน:
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {QUICK_ACTION_REASONS.map((txt) => (
                <button
                  key={txt}
                  type="button"
                  onClick={() => setReason(txt)}
                  className="rounded-[4px] border border-[#fed7aa] bg-[#fffaf5] px-2 py-1 text-left text-[10.5px] text-[#9a3412] transition hover:bg-[#ffedd5]"
                >
                  {txt}
                </button>
              ))}
            </div>
          </div>
        )}

        <label
          htmlFor="review-reason"
          className="mt-3.5 block text-[12px] font-medium text-[#1f2937]"
        >
          {rejected
            ? "เหตุผลที่ไม่อนุมัติ *"
            : actionRequired
              ? "ระบุเอกสารที่ต้องการให้ผู้สมัครแนบเพิ่มเติม *"
              : "หมายเหตุการพิจารณา (ไม่บังคับ)"}
        </label>
        <textarea
          id="review-reason"
          ref={textareaRef}
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            if (error) setError("");
          }}
          rows={3}
          placeholder={
            approved
              ? "เช่น เอกสารครบถ้วน ผ่านเกณฑ์คุณสมบัติตัวจริง"
              : reserve
                ? "เช่น ผ่านคุณสมบัติ จัดให้อยู่ในบัญชีสำรองเพื่อรอเรียกตัว"
                : actionRequired
                  ? "เช่น สำเนาบัตรประชาชนไม่ชัดเจน หรือลืมเซ็นรับรองสำเนาถูกต้อง"
                  : "เช่น ขาดเอกสาร ส.ฬ.8 หรือหนังสือนำส่งไม่ชัดเจน"
          }
          className="mt-1.5 w-full resize-y rounded-[6px] border border-[#d1d5db] bg-white px-3 py-2 text-[13px] leading-relaxed text-[#1f2937] outline-none transition focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20"
        />
        {error && (
          <p role="alert" className="mt-1.5 text-[11px] text-[#dc2626]">
            {error}
          </p>
        )}

        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-[6px] border border-[#d1d5db] bg-white px-4 text-[12px] font-medium text-[#374151] transition-colors hover:bg-[#f8fafc] sm:h-9"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className={`inline-flex h-10 items-center justify-center rounded-[6px] px-4 text-[12px] font-semibold text-white transition-colors sm:h-9 ${
              approved
                ? "bg-[#078A43] hover:bg-[#067537]"
                : reserve
                  ? "bg-[#1e3a8a] hover:bg-[#1e40af]"
                  : actionRequired
                    ? "bg-[#ea580c] hover:bg-[#c2410c]"
                    : "bg-[#c2242c] hover:bg-[#a91d24]"
            }`}
          >
            {approved
              ? "ยืนยันอนุมัติตัวจริง"
              : reserve
                ? "ยืนยันเข้าบัญชีสำรอง"
                : actionRequired
                  ? "ส่งคำขอเอกสารเพิ่มเติม"
                  : "ยืนยันไม่อนุมัติ"}
          </button>
        </div>
      </div>
    </div>
  );
}
