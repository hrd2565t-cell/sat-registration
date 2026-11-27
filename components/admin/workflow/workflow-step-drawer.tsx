"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  WORKFLOW_PHASES,
  WORKFLOW_STATUS_META,
  formatThaiShortDate,
  isStepOverdue,
  type WorkflowChecklistItem,
  type WorkflowLiveMetricDisplay,
  type WorkflowPhaseId,
  type WorkflowStep,
  type WorkflowStepStatus,
} from "@/lib/workflow";

interface WorkflowStepDrawerProps {
  step: WorkflowStep;
  liveMetric?: WorkflowLiveMetricDisplay | null;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onClose: () => void;
  onSaveStep: (updated: WorkflowStep) => Promise<void>;
  onMoveStep: (stepId: string, direction: "up" | "down") => Promise<void>;
  onDeleteStep: (stepId: string) => Promise<void>;
}

const STATUS_OPTIONS: WorkflowStepStatus[] = [
  "pending",
  "in_progress",
  "blocked",
  "completed",
];

export function WorkflowStepDrawer({
  step,
  liveMetric,
  canMoveUp,
  canMoveDown,
  onClose,
  onSaveStep,
  onMoveStep,
  onDeleteStep,
}: WorkflowStepDrawerProps) {
  const [title, setTitle] = useState(step.title);
  const [description, setDescription] = useState(step.description);
  const [phase, setPhase] = useState<WorkflowPhaseId>(step.phase);
  const [status, setStatus] = useState<WorkflowStepStatus>(step.status);
  const [assignee, setAssignee] = useState(step.assignee);
  const [dueDate, setDueDate] = useState(step.dueDate);
  const [notes, setNotes] = useState(step.notes);
  const [checklist, setChecklist] = useState<WorkflowChecklistItem[]>(
    step.checklist
  );
  const [newCheckItem, setNewCheckItem] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const saveLockRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saveLockRef.current) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const checklistDoneCount = checklist.filter((c) => c.done).length;
  const overdue = isStepOverdue({ dueDate, status });

  const handleAddChecklistItem = () => {
    const text = newCheckItem.trim();
    if (!text) return;
    setChecklist((prev) => [
      ...prev,
      {
        id: `chk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        text,
        done: false,
      },
    ]);
    setNewCheckItem("");
  };

  const handleToggleChecklistItem = (itemId: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, done: !item.done } : item
      )
    );
  };

  const handleRemoveChecklistItem = (itemId: string) => {
    setChecklist((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleSave = async () => {
    if (saveLockRef.current) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMsg("กรุณาระบุชื่อขั้นตอน");
      return;
    }

    saveLockRef.current = true;
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const nowIso = new Date().toISOString();
      const nextCompletedAt =
        status === "completed" ? step.completedAt || nowIso : "";
      await onSaveStep({
        ...step,
        phase,
        title: trimmedTitle,
        description: description.trim(),
        status,
        assignee: assignee.trim(),
        dueDate,
        completedAt: nextCompletedAt,
        notes: notes.trim(),
        checklist,
        updatedAt: nowIso,
      });
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "บันทึกข้อมูลขั้นตอนไม่สำเร็จ"
      );
    } finally {
      saveLockRef.current = false;
      setIsSaving(false);
    }
  };

  const handleMove = async (direction: "up" | "down") => {
    if (saveLockRef.current) return;
    saveLockRef.current = true;
    setIsSaving(true);
    try {
      await onMoveStep(step.id, direction);
    } finally {
      saveLockRef.current = false;
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (saveLockRef.current) return;
    saveLockRef.current = true;
    setIsSaving(true);
    try {
      await onDeleteStep(step.id);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "ลบขั้นตอนไม่สำเร็จ");
      saveLockRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-[1px]"
      onClick={() => {
        if (!saveLockRef.current) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`รายละเอียดขั้นตอน: ${step.title}`}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl border-l border-slate-200 animate-in slide-in-from-right duration-200"
      >
        {/* Drawer Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-[#16265E] px-5 py-4 text-white">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] text-white/80">
              <span className="rounded bg-white/15 px-2 py-0.5 font-bold">
                ขั้นตอนที่ {step.order}
              </span>
              {step.completedAt && status === "completed" && (
                <span>เสร็จเมื่อ {formatThaiShortDate(step.completedAt)}</span>
              )}
              {overdue && (
                <span className="rounded bg-red-500 px-2 py-0.5 font-bold text-white">
                  เลยกำหนด
                </span>
              )}
            </div>
            <h2 className="mt-1.5 text-sm sm:text-base font-bold leading-snug">
              {title || step.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="ปิดแผงรายละเอียด"
            className="rounded-md p-1.5 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {errorMsg && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700 font-medium">
              {errorMsg}
            </div>
          )}

          {/* Quick Status Selector */}
          <div>
            <label className="block font-bold text-slate-700 mb-2">
              สถานะการดำเนินงาน
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {STATUS_OPTIONS.map((opt) => {
                const meta = WORKFLOW_STATUS_META[opt];
                const selected = status === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setStatus(opt)}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 font-bold transition-all cursor-pointer ${
                      selected
                        ? `${meta.badgeClass} ring-2 ring-[#16265E]/25 shadow-sm`
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${meta.dotClass}`}
                    />
                    <span>{meta.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live System Metric Card (Read-only) */}
          {liveMetric && (
            <div
              className={`rounded-xl border p-3.5 ${
                liveMetric.tone === "success"
                  ? "border-emerald-200 bg-emerald-50/60"
                  : liveMetric.tone === "warning"
                    ? "border-amber-200 bg-amber-50/70"
                    : liveMetric.tone === "info"
                      ? "border-blue-200 bg-blue-50/60"
                      : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    ข้อมูลสดจากฐานข้อมูลระบบ (Read-only)
                  </span>
                  <p className="mt-0.5 text-sm font-bold text-slate-900">
                    {liveMetric.headline}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-600">
                    {liveMetric.detail}
                  </p>
                </div>
                {step.actionHref && (
                  <Link
                    href={step.actionHref}
                    className="shrink-0 rounded-lg bg-[#16265E] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#1e347e] transition-colors"
                  >
                    {step.actionLabel || "ไปหน้าจัดการ"} →
                  </Link>
                )}
              </div>
            </div>
          )}

          {!liveMetric && step.actionHref && (
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5">
              <span className="text-slate-600 font-medium">
                เมนูลัดไปยังหน้างานที่เกี่ยวข้อง
              </span>
              <Link
                href={step.actionHref}
                className="rounded-md bg-[#2386D3] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#1b73b8]"
              >
                {step.actionLabel || "ไปหน้าจัดการ"} →
              </Link>
            </div>
          )}

          {/* Checklist Section */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800">
                รายการย่อย (Checklist)
              </h3>
              <span className="rounded-full bg-white border border-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                {checklistDoneCount}/{checklist.length} รายการ
              </span>
            </div>

            {checklist.length > 0 && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{
                    width: `${
                      checklist.length > 0
                        ? Math.round(
                            (checklistDoneCount / checklist.length) * 100
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            )}

            <div className="space-y-1.5">
              {checklist.length === 0 ? (
                <p className="text-[11px] text-slate-400 py-1">
                  ยังไม่มีรายการย่อย — สามารถเพิ่มด้านล่างได้
                </p>
              ) : (
                checklist.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5"
                  >
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => handleToggleChecklistItem(item.id)}
                      className="h-3.5 w-3.5 accent-emerald-600 cursor-pointer"
                    />
                    <span
                      onClick={() => handleToggleChecklistItem(item.id)}
                      className={`flex-1 cursor-pointer ${
                        item.done
                          ? "line-through text-slate-400"
                          : "text-slate-800"
                      }`}
                    >
                      {item.text}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveChecklistItem(item.id)}
                      aria-label={`ลบรายการ ${item.text}`}
                      className="text-slate-400 hover:text-red-600 px-1"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={newCheckItem}
                onChange={(e) => setNewCheckItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddChecklistItem();
                  }
                }}
                maxLength={200}
                placeholder="เพิ่มรายการย่อยใหม่..."
                className="flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:border-[#2386D3] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddChecklistItem}
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-700"
              >
                + เพิ่ม
              </button>
            </div>
          </div>

          {/* Step Details Form */}
          <div className="space-y-3 border-t border-slate-200 pt-4">
            <h3 className="font-bold text-slate-800">รายละเอียดขั้นตอน</h3>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                ชื่อขั้นตอน *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={160}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#2386D3] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                ระยะในผังงาน
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
                คำอธิบายขั้นตอน
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={400}
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
                  placeholder="ระบุชื่อฝ่ายหรือเจ้าหน้าที่"
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
                หมายเหตุ / ปัญหาที่พบ / เลขที่หนังสืออ้างอิง
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={1200}
                placeholder="บันทึกความคืบหน้า เลขที่หนังสือขออนุมัติ หรือสาเหตุที่ติดขัด..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#2386D3] focus:outline-none"
              />
            </div>
          </div>

          {/* Reorder & Delete */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-600 mr-1">
                ลำดับในระยะ:
              </span>
              <button
                type="button"
                onClick={() => handleMove("up")}
                disabled={!canMoveUp || isSaving}
                className="rounded border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
              >
                ↑ เลื่อนขึ้น
              </button>
              <button
                type="button"
                onClick={() => handleMove("down")}
                disabled={!canMoveDown || isSaving}
                className="rounded border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
              >
                ↓ เลื่อนลง
              </button>
            </div>

            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={isSaving}
                className="rounded border border-red-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50"
              >
                ลบขั้นตอนนี้
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSaving}
                  className="rounded bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-red-700"
                >
                  ยืนยันลบ
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={isSaving}
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-600"
                >
                  ยกเลิก
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            ปิด
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-lg bg-[#16265E] px-5 py-2 text-xs font-bold text-white hover:bg-[#1e347e] disabled:opacity-60"
          >
            {isSaving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
          </button>
        </div>
      </div>
    </div>
  );
}
