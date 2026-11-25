"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ApplicantDocumentKind } from "@/lib/applications-store";

export type ReviewDecision = "approved" | "reserve" | "rejected" | "action_required";

export interface ApplicableDocOption {
  key: ApplicantDocumentKind;
  label: string;
  isAttached?: boolean;
}

const DEFAULT_DOC_OPTIONS: ApplicableDocOption[] = [
  { key: "photo", label: "รูปถ่ายหน้าตรง ถ่ายไม่เกิน 6 เดือน" },
  { key: "cover", label: "หนังสือนำส่งจากต้นสังกัดหรือสมาคมกีฬา" },
  { key: "idcard", label: "สำเนาบัตรประจำตัวประชาชน พร้อมลงนามรับรองสำเนาถูกต้อง" },
  { key: "certificate", label: "หนังสือรับรองการปฏิบัติหน้าที่ให้กับสมาคม/หน่วยงาน" },
  { key: "saka", label: "สำเนาใบ ส.ฬ. 8" },
];

const QUICK_ACTION_REASONS: {
  text: string;
  docKind: ApplicantDocumentKind;
}[] = [
  {
    text: "สำเนาบัตรประชาชนไม่ชัดเจน หรือยังไม่ได้ลงนามรับรองสำเนาถูกต้อง",
    docKind: "idcard",
  },
  {
    text: "หนังสือนำส่งไม่สมบูรณ์ หรือขาดตราประทับ/ลายมือชื่อผู้มีอำนาจ",
    docKind: "cover",
  },
  {
    text: "รูปถ่ายหน้าตรงไม่ตรงตามระเบียบ (กรุณาแนบรูปถ่ายหน้าตรงถ่ายไม่เกิน 6 เดือน)",
    docKind: "photo",
  },
  {
    text: "ขาดหนังสือรับรองการปฏิบัติหน้าที่ให้กับสมาคม/หน่วยงาน",
    docKind: "certificate",
  },
  {
    text: "ขาดสำเนาใบ ส.ฬ. 8",
    docKind: "saka",
  },
];

export function ReviewDecisionDialog({
  open,
  decision,
  applicantName,
  defaultReason = "",
  applicableDocOptions,
  defaultRequestedDocKinds,
  onClose,
  onConfirm,
}: {
  open: boolean;
  decision: ReviewDecision;
  applicantName: string;
  defaultReason?: string;
  applicableDocOptions?: ApplicableDocOption[];
  defaultRequestedDocKinds?: ApplicantDocumentKind[];
  onClose: () => void;
  onConfirm: (reason: string, requestedDocKinds?: ApplicantDocumentKind[]) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [reason, setReason] = useState(defaultReason);
  const [selectedDocKinds, setSelectedDocKinds] = useState<
    ApplicantDocumentKind[]
  >(defaultRequestedDocKinds ?? []);
  const [error, setError] = useState("");

  const docOptions = useMemo(
    () =>
      applicableDocOptions && applicableDocOptions.length > 0
        ? applicableDocOptions
        : DEFAULT_DOC_OPTIONS,
    [applicableDocOptions]
  );

  const visibleQuickReasons = useMemo(() => {
    const allowedSet = new Set(docOptions.map((d) => d.key));
    return QUICK_ACTION_REASONS.filter((q) => allowedSet.has(q.docKind));
  }, [docOptions]);

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

  const buildReasonFromDocKinds = (kinds: ApplicantDocumentKind[]): string => {
    if (kinds.length === 0) return "";
    const labels = kinds.map(
      (k) => docOptions.find((opt) => opt.key === k)?.label || k
    );
    return `ขอความกรุณาแนบเอกสารเพิ่มเติม: ${labels.join(", ")}`;
  };

  const toggleDocKind = (kind: ApplicantDocumentKind) => {
    const next = selectedDocKinds.includes(kind)
      ? selectedDocKinds.filter((k) => k !== kind)
      : [...selectedDocKinds, kind];
    setSelectedDocKinds(next);
    const trimmed = reason.trim();
    if (!trimmed || trimmed.startsWith("ขอความกรุณาแนบเอกสารเพิ่มเติม:")) {
      setReason(buildReasonFromDocKinds(next));
    }
    if (error) setError("");
  };

  const handleSubmit = () => {
    const trimmed = reason.trim();
    if (rejected && trimmed.length < 3) {
      setError("กรุณาระบุเหตุผลที่ไม่อนุมัติอย่างน้อย 3 ตัวอักษร");
      return;
    }
    if (actionRequired && trimmed.length < 3 && selectedDocKinds.length === 0) {
      setError("กรุณาเลือกเอกสารที่ต้องการขอเพิ่ม หรือระบุเหตุผลอย่างน้อย 3 ตัวอักษร");
      return;
    }
    const finalReason =
      actionRequired && trimmed.length < 3
        ? buildReasonFromDocKinds(selectedDocKinds)
        : trimmed;
    onConfirm(finalReason, actionRequired ? selectedDocKinds : undefined);
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
          <div className="mt-3 space-y-3">
            <div className="rounded-lg border border-[#fed7aa] bg-[#fffaf5] p-3">
              <p className="text-[11.5px] font-semibold text-[#9a3412]">
                เลือกเอกสารที่ต้องการให้ผู้สมัครส่งเพิ่มเติม (ผู้สมัครจะเห็นเฉพาะช่องที่เลือก):
              </p>
              <div className="mt-2 space-y-1.5">
                {docOptions.map((opt) => {
                  const checked = selectedDocKinds.includes(opt.key);
                  return (
                    <label
                      key={opt.key}
                      className={`flex cursor-pointer items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-[11.5px] transition ${
                        checked
                          ? "border-[#ea580c] bg-[#ffedd5]/70 font-semibold text-[#9a3412]"
                          : "border-[#fed7aa]/80 bg-white text-[#374151] hover:bg-[#fff7ed]"
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleDocKind(opt.key)}
                          className="h-3.5 w-3.5 shrink-0 accent-[#ea580c] rounded"
                        />
                        <span className="truncate">{opt.label}</span>
                      </span>
                      {opt.isAttached === false && (
                        <span className="shrink-0 rounded bg-[#fee2e2] px-1.5 py-0.5 text-[9.5px] font-semibold text-[#b91c1c]">
                          ยังไม่ได้แนบ
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
              {selectedDocKinds.length === 0 && (
                <p className="mt-1.5 text-[10.5px] text-[#b45309]">
                  * หากไม่ติ๊กเลือกเอกสาร ระบบจะแสดงรายการเอกสารทั้งหมดให้ผู้สมัครเลือกเอง
                </p>
              )}
            </div>

            <div>
              <p className="text-[11px] font-medium text-[#4b5563]">
                คลิกเพื่อเลือกข้อความด่วน:
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {visibleQuickReasons.map((item) => (
                  <button
                    key={item.text}
                    type="button"
                    onClick={() => {
                      setReason(item.text);
                      if (!selectedDocKinds.includes(item.docKind)) {
                        setSelectedDocKinds((prev) => [...prev, item.docKind]);
                      }
                      if (error) setError("");
                    }}
                    className="rounded-[4px] border border-[#fed7aa] bg-[#fffaf5] px-2 py-1 text-left text-[10.5px] text-[#9a3412] transition hover:bg-[#ffedd5]"
                  >
                    {item.text}
                  </button>
                ))}
              </div>
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
