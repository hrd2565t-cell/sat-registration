"use client";

import { useEffect, useRef, useState } from "react";
import {
  WORKFLOW_LIVE_METRIC_OPTIONS,
  WORKFLOW_PHASES,
  type WorkflowLiveMetricKey,
  type WorkflowPhaseId,
  type WorkflowStep,
} from "@/lib/workflow";

interface AddStepModalProps {
  mode: "step" | "year";
  existingYears: string[];
  activeYearBE: string;
  onClose: () => void;
  onCreateStep: (step: WorkflowStep) => Promise<void>;
  onCreateYear: (yearBE: string, copyFromCurrent: boolean) => Promise<void>;
}

export function WorkflowAddDialog({
  mode,
  existingYears,
  activeYearBE,
  onClose,
  onCreateStep,
  onCreateYear,
}: AddStepModalProps) {
  const [phase, setPhase] = useState<WorkflowPhaseId>("prepare");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [liveMetricKey, setLiveMetricKey] = useState<
    WorkflowLiveMetricKey | ""
  >("");
  const [actionHref, setActionHref] = useState("");
  const [actionLabel, setActionLabel] = useState("");

  const suggestedYear = String(
    Math.max(...existingYears.map((y) => Number(y) || 2569), 2569) + 1
  );
  const [yearInput, setYearInput] = useState(suggestedYear);
  const [copyFromCurrent, setCopyFromCurrent] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitLockRef.current) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current) return;
    setErrorMsg(null);

    if (mode === "step") {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        setErrorMsg("กรุณาระบุชื่อขั้นตอนการดำเนินงาน");
        return;
      }

      submitLockRef.current = true;
      setIsSubmitting(true);
      try {
        const nowIso = new Date().toISOString();
        const newStep: WorkflowStep = {
          id: `step-custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          phase,
          order: 999,
          title: trimmedTitle,
          description: description.trim(),
          status: "pending",
          assignee: assignee.trim() || "เจ้าหน้าที่ผู้รับผิดชอบ",
          dueDate,
          completedAt: "",
          notes: "",
          checklist: [],
          ...(liveMetricKey ? { liveMetricKey } : {}),
          ...(actionHref.trim().startsWith("/")
            ? {
                actionHref: actionHref.trim(),
                actionLabel: actionLabel.trim() || "เปิดหน้าจัดการ",
              }
            : {}),
          updatedAt: nowIso,
        };
        await onCreateStep(newStep);
        onClose();
      } catch (err) {
        setErrorMsg(
          err instanceof Error ? err.message : "เพิ่มขั้นตอนไม่สำเร็จ"
        );
      } finally {
        submitLockRef.current = false;
        setIsSubmitting(false);
      }
      return;
    }

    const cleanYear = yearInput.replace(/\D/g, "");
    const yearNum = Number(cleanYear);
    if (!Number.isFinite(yearNum) || yearNum < 2560 || yearNum > 2620) {
      setErrorMsg("กรุณาระบุปีงบประมาณ พ.ศ. 4 หลัก (2560–2620)");
      return;
    }
    if (existingYears.includes(cleanYear)) {
      setErrorMsg(`มีผังของปีงบประมาณ พ.ศ. ${cleanYear} อยู่ในระบบแล้ว`);
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);
    try {
      await onCreateYear(cleanYear, copyFromCurrent);
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "สร้างปีงบประมาณไม่สำเร็จ"
      );
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-[1px]"
      onClick={() => {
        if (!submitLockRef.current) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={
          mode === "step" ? "เพิ่มขั้นตอนการดำเนินงาน" : "เพิ่มปีงบประมาณใหม่"
        }
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-[#16265E] px-5 py-3.5 text-white">
          <div>
            <h2 className="text-sm font-bold">
              {mode === "step"
                ? "+ เพิ่มขั้นตอนใหม่ในผังการดำเนินงาน"
                : "+ เพิ่มผังประจำปีงบประมาณใหม่"}
            </h2>
            <p className="text-[11px] text-white/75 mt-0.5">
              {mode === "step"
                ? `บันทึกเข้าสู่ผังปีงบประมาณ พ.ศ. ${activeYearBE}`
                : "สร้างผังแยกเฉพาะปีงบประมาณโดยไม่ทับข้อมูลปีเดิม"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="ปิดหน้าต่าง"
            className="rounded-md p-1.5 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5 text-xs">
          {errorMsg && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700 font-medium">
              {errorMsg}
            </div>
          )}

          {mode === "step" ? (
            <>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ระยะการดำเนินงาน *
                </label>
                <select
                  value={phase}
                  onChange={(e) => setPhase(e.target.value as WorkflowPhaseId)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#2386D3] focus:outline-none"
                >
                  {WORKFLOW_PHASES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.shortTitle}: {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ชื่อขั้นตอน *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={160}
                  placeholder="เช่น เสนอลงนามคำสั่งแต่งตั้งคณะกรรมการดำเนินงาน"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#2386D3] focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  คำอธิบาย / ขอบเขตงาน
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={400}
                  placeholder="รายละเอียดสำคัญของขั้นตอนนี้"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#2386D3] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ผู้รับผิดชอบ
                  </label>
                  <input
                    type="text"
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                    maxLength={100}
                    placeholder="เช่น กลุ่มพัฒนากีฬาฯ"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#2386D3] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    วันที่กำหนดเสร็จ
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#2386D3] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  เชื่อมตัวเลขสดจากระบบ (ถ้ามี)
                </label>
                <select
                  value={liveMetricKey}
                  onChange={(e) =>
                    setLiveMetricKey(
                      e.target.value as WorkflowLiveMetricKey | ""
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#2386D3] focus:outline-none"
                >
                  {WORKFLOW_LIVE_METRIC_OPTIONS.map((opt) => (
                    <option key={opt.value || "none"} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ลิงก์ปุ่มลัดภายในระบบ (ไม่บังคับ)
                  </label>
                  <select
                    value={actionHref}
                    onChange={(e) => setActionHref(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#2386D3] focus:outline-none"
                  >
                    <option value="">ไม่มีปุ่มลัด</option>
                    <option value="/admin">/admin (แดชบอร์ด)</option>
                    <option value="/admin/courses">
                      /admin/courses (จัดการหลักสูตร)
                    </option>
                    <option value="/admin/review">
                      /admin/review (ตรวจสอบคุณสมบัติ)
                    </option>
                    <option value="/admin/claims">
                      /admin/claims (ยืนยันตัวตน)
                    </option>
                    <option value="/alumni">/alumni (ทำเนียบ & ประเมิน)</option>
                    <option value="/admin/settings">
                      /admin/settings (ตั้งค่า & Drive)
                    </option>
                  </select>
                </div>
                {actionHref && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      ข้อความบนปุ่มลัด
                    </label>
                    <input
                      type="text"
                      value={actionLabel}
                      onChange={(e) => setActionLabel(e.target.value)}
                      maxLength={60}
                      placeholder="เปิดหน้าจัดการ"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#2386D3] focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ปีงบประมาณ พ.ศ. *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={yearInput}
                  onChange={(e) =>
                    setYearInput(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="เช่น 2570"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-[#16265E] focus:border-[#2386D3] focus:outline-none"
                  autoFocus
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  ปีที่มีอยู่แล้ว: {existingYears.join(", ")}
                </p>
              </div>

              <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="font-semibold text-slate-700">
                  รูปแบบขั้นตอนเริ่มต้น
                </p>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="yearTemplate"
                    checked={!copyFromCurrent}
                    onChange={() => setCopyFromCurrent(false)}
                    className="mt-0.5"
                  />
                  <span>
                    <strong className="text-slate-800">
                      ใช้ผังมาตรฐาน 4 ระยะ (12 ขั้นตอน)
                    </strong>
                    <span className="block text-[11px] text-slate-500">
                      เริ่มด้วยขั้นตอนมาตรฐานใหม่ทั้งหมดของระบบ
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="yearTemplate"
                    checked={copyFromCurrent}
                    onChange={() => setCopyFromCurrent(true)}
                    className="mt-0.5"
                  />
                  <span>
                    <strong className="text-slate-800">
                      คัดลอกโครงสร้างขั้นตอนจากปี พ.ศ. {activeYearBE}
                    </strong>
                    <span className="block text-[11px] text-slate-500">
                      นำชื่อขั้นตอนและรายการย่อยที่คุณปรับแต่งไว้มาใช้ต่อ (รีเซ็ตสถานะเป็นรอดำเนินการ)
                    </span>
                  </span>
                </label>
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-[#16265E] px-4 py-2 text-xs font-bold text-white hover:bg-[#1e347e] disabled:opacity-60"
            >
              {isSubmitting
                ? "กำลังบันทึก..."
                : mode === "step"
                  ? "เพิ่มขั้นตอน"
                  : "สร้างผังปีใหม่"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
