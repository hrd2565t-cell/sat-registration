"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useAlumniStore } from "@/lib/alumni-store";
import { useApplications } from "@/lib/applications-store";
import { useCourses } from "@/lib/courses-store";
import {
  WORKFLOW_PHASES,
  WORKFLOW_STATUS_META,
  computeLiveMetricForStep,
  computeWorkflowSummary,
  formatThaiShortDate,
  isStepOverdue,
  moveWorkflowStep,
  normalizeStepsOrder,
  type WorkflowLiveMetricDisplay,
  type WorkflowStep,
  type WorkflowStepStatus,
} from "@/lib/workflow";
import {
  createWorkflowFiscalYear,
  refreshWorkflowFromCloud,
  resetWorkflowFiscalYearToDefault,
  switchWorkflowFiscalYear,
  updateWorkflowPayload,
  useWorkflowCloudLoaded,
  useWorkflowStore,
  useWorkflowSyncState,
} from "@/lib/workflow-store";
import { WorkflowAddDialog } from "./workflow-add-dialog";
import { WorkflowStepDrawer } from "./workflow-step-drawer";

type ViewMode = "flowchart" | "table";
type StatusFilter = "all" | WorkflowStepStatus;

export function WorkflowBoard() {
  const workflowPayload = useWorkflowStore();
  const cloudLoaded = useWorkflowCloudLoaded();
  const { isSaving, error: syncError } = useWorkflowSyncState();
  const { courses } = useCourses();
  const { applications } = useApplications();
  const { trainees } = useAlumniStore();

  const [viewMode, setViewMode] = useState<ViewMode>("flowchart");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<"step" | "year" | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const mutationLockRef = useRef(false);

  const fiscalYearKeys = useMemo(
    () =>
      Object.keys(workflowPayload.years).sort((a, b) => Number(b) - Number(a)),
    [workflowPayload.years]
  );

  const activeYearBE = workflowPayload.years[workflowPayload.activeFiscalYearBE]
    ? workflowPayload.activeFiscalYearBE
    : fiscalYearKeys[0];

  const activeWorkflow = workflowPayload.years[activeYearBE];

  const orderedSteps = useMemo(
    () => (activeWorkflow ? normalizeStepsOrder(activeWorkflow.steps) : []),
    [activeWorkflow]
  );

  const summary = useMemo(
    () => computeWorkflowSummary(orderedSteps),
    [orderedSteps]
  );

  const liveMetricMap = useMemo(() => {
    const map = new Map<string, WorkflowLiveMetricDisplay>();
    for (const step of orderedSteps) {
      if (!step.liveMetricKey) continue;
      map.set(
        step.id,
        computeLiveMetricForStep(step.liveMetricKey, {
          courses,
          applications,
          trainees,
          fiscalYearBE: activeYearBE,
        })
      );
    }
    return map;
  }, [orderedSteps, courses, applications, trainees, activeYearBE]);

  const selectedStep = useMemo(
    () => orderedSteps.find((s) => s.id === selectedStepId) ?? null,
    [orderedSteps, selectedStepId]
  );

  const selectedPhasePosition = useMemo(() => {
    if (!selectedStep) return { canMoveUp: false, canMoveDown: false };
    const samePhase = orderedSteps.filter(
      (s) => s.phase === selectedStep.phase
    );
    const idx = samePhase.findIndex((s) => s.id === selectedStep.id);
    return {
      canMoveUp: idx > 0,
      canMoveDown: idx >= 0 && idx < samePhase.length - 1,
    };
  }, [orderedSteps, selectedStep]);

  const filteredTableSteps = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orderedSteps.filter((step) => {
      if (statusFilter !== "all" && step.status !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        step.title.toLowerCase().includes(q) ||
        step.description.toLowerCase().includes(q) ||
        step.assignee.toLowerCase().includes(q) ||
        step.notes.toLowerCase().includes(q)
      );
    });
  }, [orderedSteps, statusFilter, searchQuery]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const handleSaveStep = async (updatedStep: WorkflowStep) => {
    const res = await updateWorkflowPayload((current) => {
      const fy = current.years[activeYearBE];
      if (!fy) return current;
      const nextSteps = normalizeStepsOrder(
        fy.steps.map((s) => (s.id === updatedStep.id ? updatedStep : s))
      );
      return {
        ...current,
        years: {
          ...current.years,
          [activeYearBE]: {
            ...fy,
            steps: nextSteps,
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
    if (!res.ok) {
      throw new Error(res.error || "บันทึกข้อมูลไม่สำเร็จ");
    }
    showToast("บันทึกความคืบหน้าขึ้นคลาวด์แล้ว");
  };

  const handleQuickStatusCycle = async (
    e: React.MouseEvent,
    step: WorkflowStep
  ) => {
    e.stopPropagation();
    if (mutationLockRef.current) return;
    mutationLockRef.current = true;
    try {
      const nextStatus: WorkflowStepStatus =
        step.status === "pending"
          ? "in_progress"
          : step.status === "in_progress"
            ? "completed"
            : step.status === "completed"
              ? "pending"
              : "in_progress";
      const nowIso = new Date().toISOString();
      await handleSaveStep({
        ...step,
        status: nextStatus,
        completedAt: nextStatus === "completed" ? nowIso : "",
        updatedAt: nowIso,
      });
    } finally {
      mutationLockRef.current = false;
    }
  };

  const handleMoveStep = async (stepId: string, direction: "up" | "down") => {
    const res = await updateWorkflowPayload((current) => {
      const fy = current.years[activeYearBE];
      if (!fy) return current;
      return {
        ...current,
        years: {
          ...current.years,
          [activeYearBE]: {
            ...fy,
            steps: moveWorkflowStep(fy.steps, stepId, direction),
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
    if (!res.ok) {
      showToast(res.error || "จัดลำดับไม่สำเร็จ");
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    const res = await updateWorkflowPayload((current) => {
      const fy = current.years[activeYearBE];
      if (!fy) return current;
      if (fy.steps.length <= 1) {
        return current;
      }
      return {
        ...current,
        years: {
          ...current.years,
          [activeYearBE]: {
            ...fy,
            steps: normalizeStepsOrder(
              fy.steps.filter((s) => s.id !== stepId)
            ),
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
    if (!res.ok) {
      throw new Error(res.error || "ลบขั้นตอนไม่สำเร็จ");
    }
    setSelectedStepId(null);
    showToast("ลบขั้นตอนออกจากผังแล้ว");
  };

  const handleCreateStep = async (newStep: WorkflowStep) => {
    const res = await updateWorkflowPayload((current) => {
      const fy = current.years[activeYearBE];
      if (!fy) return current;
      return {
        ...current,
        years: {
          ...current.years,
          [activeYearBE]: {
            ...fy,
            steps: normalizeStepsOrder([...fy.steps, newStep]),
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
    if (!res.ok) {
      throw new Error(res.error || "เพิ่มขั้นตอนไม่สำเร็จ");
    }
    showToast("เพิ่มขั้นตอนใหม่เรียบร้อย");
  };

  const handleCreateYear = async (yearBE: string, copyFromCurrent: boolean) => {
    const res = await createWorkflowFiscalYear(
      yearBE,
      copyFromCurrent ? activeYearBE : undefined
    );
    if (!res.ok) {
      throw new Error(res.error || "สร้างปีงบประมาณไม่สำเร็จ");
    }
    showToast(`สร้างผังปีงบประมาณ พ.ศ. ${yearBE} แล้ว`);
  };

  const handleResetToDefault = async () => {
    if (mutationLockRef.current) return;
    mutationLockRef.current = true;
    try {
      const res = await resetWorkflowFiscalYearToDefault(activeYearBE);
      setConfirmResetOpen(false);
      if (res.ok) {
        showToast(`รีเซ็ตผังปี พ.ศ. ${activeYearBE} กลับเป็นผังมาตรฐานแล้ว`);
      } else {
        showToast(res.error || "รีเซ็ตผังไม่สำเร็จ");
      }
    } finally {
      mutationLockRef.current = false;
    }
  };

  const currentPhaseMeta = summary.currentStep
    ? WORKFLOW_PHASES.find((p) => p.id === summary.currentStep?.phase)
    : null;

  return (
    <div className="space-y-4">
      {/* Screen Header & Toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm print:hidden">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base sm:text-lg font-extrabold text-[#16265E]">
                ผังขั้นตอนการดำเนินงานโครงการ (Operational Flowchart)
              </h1>
              {!cloudLoaded ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400" />
                  กำลังโหลดจาก Cloud...
                </span>
              ) : isSaving ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-[#2386D3]">
                  <span className="h-1.5 w-1.5 animate-ping rounded-full bg-[#2386D3]" />
                  กำลังบันทึกขึ้น Cloud...
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                  ● ซิงค์ Cloud แยกอิสระ (เข้ารหัส)
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              ติดตามภาพรวมความคืบหน้าโครงการทั้งปีงบประมาณในผังเดียว เชื่อมตัวเลขสดจากระบบรับสมัครโดยไม่กระทบข้อมูลหลัก
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="เลือกปีงบประมาณ"
              value={activeYearBE}
              onChange={(e) => void switchWorkflowFiscalYear(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-[#16265E] focus:border-[#2386D3] focus:outline-none"
            >
              {fiscalYearKeys.map((y) => (
                <option key={y} value={y}>
                  ปีงบประมาณ พ.ศ. {y}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setDialogMode("year")}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              + เพิ่มปี
            </button>

            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("flowchart")}
                className={`rounded-md px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "flowchart"
                    ? "bg-white text-[#16265E] shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                ผัง Flowchart
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`rounded-md px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "table"
                    ? "bg-white text-[#16265E] shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                ตารางติดตามงาน
              </button>
            </div>

            <button
              type="button"
              onClick={() => setDialogMode("step")}
              className="rounded-lg bg-[#2386D3] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1b73b8] transition-colors cursor-pointer"
            >
              + เพิ่มขั้นตอน
            </button>

            <button
              type="button"
              onClick={() => void refreshWorkflowFromCloud()}
              title="ดึงข้อมูลล่าสุดจากคลาวด์"
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              รีเฟรช
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg bg-[#16265E] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1e347e] transition-colors cursor-pointer"
            >
              พิมพ์รายงาน A4
            </button>
          </div>
        </div>

        {/* Notifications */}
        {(syncError || toastMsg) && (
          <div
            className={`mt-3 rounded-lg border px-3 py-2 text-xs font-semibold ${
              syncError
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {syncError || toastMsg}
          </div>
        )}
      </div>

      {/* KPI Ribbon + Current Stage Banner (Screen) */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 print:hidden">
        {/* Progress Summary */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">
              ความคืบหน้าโครงการรวม (พ.ศ. {activeYearBE})
            </span>
            <span className="text-xl font-extrabold text-[#16265E]">
              {summary.percent}%
            </span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#2386D3] to-emerald-500 transition-all duration-500"
              style={{ width: `${summary.percent}%` }}
            />
          </div>
          <div className="mt-3 grid grid-cols-4 gap-1.5 text-center text-[11px]">
            <div className="rounded-lg bg-emerald-50 py-1.5">
              <div className="font-extrabold text-emerald-700">
                {summary.completed}
              </div>
              <div className="text-[10px] text-emerald-600">เสร็จสิ้น</div>
            </div>
            <div className="rounded-lg bg-blue-50 py-1.5">
              <div className="font-extrabold text-[#2386D3]">
                {summary.inProgress}
              </div>
              <div className="text-[10px] text-[#16265E]">กำลังทำ</div>
            </div>
            <div className="rounded-lg bg-red-50 py-1.5">
              <div className="font-extrabold text-red-600">
                {summary.blocked}
              </div>
              <div className="text-[10px] text-red-600">ติดปัญหา</div>
            </div>
            <div className="rounded-lg bg-slate-100 py-1.5">
              <div className="font-extrabold text-slate-700">
                {summary.pending}
              </div>
              <div className="text-[10px] text-slate-500">รอทำ</div>
            </div>
          </div>
        </div>

        {/* Active Stage Highlight */}
        <div className="lg:col-span-2 rounded-xl border border-blue-200 bg-gradient-to-br from-[#16265E] to-[#1f3b8f] p-4 text-white shadow-sm flex flex-col justify-between">
          {summary.currentStep ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-bold">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      summary.currentStep.status === "blocked"
                        ? "bg-red-400 animate-ping"
                        : "bg-sky-300 animate-pulse"
                    }`}
                  />
                  {summary.currentStep.status === "blocked"
                    ? "ขั้นตอนที่ติดปัญหาและต้องเร่งแก้ไข"
                    : summary.completed === summary.total && summary.total > 0
                      ? "ดำเนินงานครบทุกขั้นตอนแล้ว"
                      : "ขั้นตอนปัจจุบันที่กำลังดำเนินการ"}
                </span>
                {summary.overdueCount > 0 && (
                  <span className="rounded-full bg-red-500/90 px-2.5 py-0.5 text-[10px] font-bold">
                    เลยกำหนด {summary.overdueCount} ขั้นตอน
                  </span>
                )}
              </div>

              <div className="mt-2">
                <p className="text-[11px] text-white/75">
                  {currentPhaseMeta
                    ? `${currentPhaseMeta.shortTitle}: ${currentPhaseMeta.title}`
                    : ""}{" "}
                  · ขั้นตอนที่ {summary.currentStep.order} จาก {summary.total}
                </p>
                <h2 className="mt-0.5 text-sm sm:text-base font-extrabold">
                  {summary.currentStep.title}
                </h2>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-white/85">
                  <span>
                    ผู้รับผิดชอบ:{" "}
                    <strong>{summary.currentStep.assignee || "-"}</strong>
                  </span>
                  {summary.currentStep.dueDate && (
                    <span>
                      กำหนดเสร็จ:{" "}
                      <strong>
                        {formatThaiShortDate(summary.currentStep.dueDate)}
                      </strong>
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedStepId(summary.currentStep?.id ?? null)
                  }
                  className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-[#16265E] hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  เปิดอัปเดตขั้นตอนนี้
                </button>
                {summary.currentStep.actionHref && (
                  <Link
                    href={summary.currentStep.actionHref}
                    className="rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
                  >
                    {summary.currentStep.actionLabel || "ไปหน้างานที่เกี่ยวข้อง"}{" "}
                    →
                  </Link>
                )}
              </div>
            </>
          ) : (
            <p className="text-xs text-white/80">ยังไม่มีขั้นตอนในผังงาน</p>
          )}
        </div>
      </div>

      {/* View 1: Flowchart */}
      {viewMode === "flowchart" && (
        <div className="space-y-2 print:hidden">
          {WORKFLOW_PHASES.map((phaseMeta, phaseIdx) => {
            const phaseSteps = orderedSteps.filter(
              (s) => s.phase === phaseMeta.id
            );
            const stats = summary.phaseStats[phaseMeta.id];
            const phasePercent =
              stats.total > 0
                ? Math.round((stats.completed / stats.total) * 100)
                : 0;

            return (
              <div key={phaseMeta.id}>
                {/* Phase Swimlane Card */}
                <section
                  className={`rounded-xl border ${phaseMeta.headerBorder} bg-white shadow-sm overflow-hidden`}
                >
                  {/* Phase Banner */}
                  <div
                    className={`flex flex-wrap items-center justify-between gap-2 border-b ${phaseMeta.headerBorder} ${phaseMeta.headerBg} px-4 py-3`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`rounded-md px-2.5 py-1 text-[11px] font-extrabold ${phaseMeta.badgeBg} ${phaseMeta.badgeText}`}
                      >
                        {phaseMeta.shortTitle}
                      </span>
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900">
                          {phaseMeta.title}
                        </h3>
                        <p className="text-[11px] text-slate-600">
                          {phaseMeta.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-xs font-extrabold text-slate-800">
                          เสร็จแล้ว {stats.completed}/{stats.total} ขั้น
                        </span>
                        <span className="block text-[10px] text-slate-500">
                          ({phasePercent}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Connected Nodes Flow inside Phase */}
                  <div className="p-4">
                    {phaseSteps.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 py-6 text-center text-xs text-slate-500">
                        ยังไม่มีขั้นตอนในระยะนี้ — กดปุ่ม &quot;+ เพิ่มขั้นตอน&quot; ด้านบนเพื่อเพิ่ม
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                        {phaseSteps.map((step, stepIdx) => {
                          const statusMeta = WORKFLOW_STATUS_META[step.status];
                          const metric = liveMetricMap.get(step.id);
                          const overdue = isStepOverdue(step);
                          const doneChecklist = step.checklist.filter(
                            (c) => c.done
                          ).length;
                          const isLastInPhase =
                            stepIdx === phaseSteps.length - 1;

                          return (
                            <div
                              key={step.id}
                              className="relative flex flex-col xl:flex-row xl:items-stretch"
                            >
                              {/* Clickable Node Card */}
                              <div
                                role="button"
                                tabIndex={0}
                                onClick={() => setSelectedStepId(step.id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    setSelectedStepId(step.id);
                                  }
                                }}
                                className={`group relative flex flex-1 flex-col justify-between rounded-xl border-2 p-3.5 text-left transition-all cursor-pointer ${statusMeta.nodeClass}`}
                              >
                                {/* Top Accent Strip */}
                                <div
                                  className={`absolute inset-x-0 top-0 h-1 rounded-t-[10px] ${statusMeta.accentBarClass}`}
                                />

                                <div>
                                  {/* Node Top Row: Order + Status Pill */}
                                  <div className="flex items-center justify-between gap-2 pt-0.5">
                                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-slate-100 px-1.5 text-[11px] font-extrabold text-[#16265E]">
                                      #{step.order}
                                    </span>

                                    <button
                                      type="button"
                                      onClick={(e) =>
                                        void handleQuickStatusCycle(e, step)
                                      }
                                      title="คลิกเพื่อสลับสถานะด่วน"
                                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold transition-transform hover:scale-105 cursor-pointer ${statusMeta.badgeClass}`}
                                    >
                                      <span
                                        className={`h-1.5 w-1.5 rounded-full ${statusMeta.dotClass} ${
                                          step.status === "in_progress"
                                            ? "animate-pulse"
                                            : ""
                                        }`}
                                      />
                                      {statusMeta.shortLabel}
                                    </button>
                                  </div>

                                  {/* Node Title */}
                                  <h4 className="mt-2 text-xs font-extrabold leading-snug text-slate-900 group-hover:text-[#16265E]">
                                    {step.title}
                                  </h4>

                                  {/* Live Metric Pill */}
                                  {metric && (
                                    <div
                                      className={`mt-2 rounded-md border px-2 py-1 text-[10px] font-bold ${
                                        metric.tone === "success"
                                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                          : metric.tone === "warning"
                                            ? "border-amber-200 bg-amber-50 text-amber-800"
                                            : metric.tone === "info"
                                              ? "border-blue-200 bg-blue-50 text-[#16265E]"
                                              : "border-slate-200 bg-slate-50 text-slate-600"
                                      }`}
                                    >
                                      {metric.badge}
                                    </div>
                                  )}
                                </div>

                                {/* Bottom Metadata */}
                                <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-2 text-[10px] text-slate-500">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="truncate">
                                      {step.assignee || "ยังไม่ระบุผู้รับผิดชอบ"}
                                    </span>
                                    {step.checklist.length > 0 && (
                                      <span className="shrink-0 font-bold text-slate-700">
                                        ✓ {doneChecklist}/
                                        {step.checklist.length}
                                      </span>
                                    )}
                                  </div>

                                  {(step.dueDate || step.actionHref) && (
                                    <div className="flex items-center justify-between gap-2">
                                      {step.dueDate ? (
                                        <span
                                          className={
                                            overdue
                                              ? "font-bold text-red-600"
                                              : "text-slate-500"
                                          }
                                        >
                                          กำหนด:{" "}
                                          {formatThaiShortDate(step.dueDate)}
                                          {overdue ? " (เลยกำหนด)" : ""}
                                        </span>
                                      ) : (
                                        <span />
                                      )}

                                      {step.actionHref && (
                                        <Link
                                          href={step.actionHref}
                                          onClick={(e) => e.stopPropagation()}
                                          className="font-bold text-[#2386D3] hover:underline"
                                        >
                                          เปิดหน้างาน →
                                        </Link>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Step Connector Arrow */}
                              {!isLastInPhase && (
                                <div
                                  aria-hidden="true"
                                  className="flex items-center justify-center py-1 xl:py-0 xl:pl-2 xl:pr-0 text-slate-300"
                                >
                                  <span className="xl:hidden text-base font-bold leading-none">
                                    ↓
                                  </span>
                                  <span className="hidden xl:inline text-lg font-bold leading-none">
                                    →
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </section>

                {/* Phase-to-Phase Connector Arrow */}
                {phaseIdx < WORKFLOW_PHASES.length - 1 && (
                  <div
                    aria-hidden="true"
                    className="flex flex-col items-center py-1"
                  >
                    <div className="h-3 w-0.5 bg-slate-300" />
                    <div className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[10px] font-bold text-slate-500 shadow-xs">
                      ↓ ต่อไปยัง {WORKFLOW_PHASES[phaseIdx + 1].shortTitle}
                    </div>
                    <div className="h-2 w-0.5 bg-slate-300" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* View 2: Tracking Table */}
      {viewMode === "table" && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { key: "all", label: `ทั้งหมด (${orderedSteps.length})` },
                  {
                    key: "in_progress",
                    label: `กำลังทำ (${summary.inProgress})`,
                  },
                  { key: "blocked", label: `ติดปัญหา (${summary.blocked})` },
                  { key: "pending", label: `รอทำ (${summary.pending})` },
                  { key: "completed", label: `เสร็จแล้ว (${summary.completed})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition-colors cursor-pointer ${
                    statusFilter === tab.key
                      ? "bg-[#16265E] text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อขั้นตอน ผู้รับผิดชอบ หมายเหตุ..."
              className="w-full sm:w-64 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs focus:border-[#2386D3] focus:outline-none"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600">
                <tr>
                  <th className="px-3 py-2.5 w-12 text-center">#</th>
                  <th className="px-3 py-2.5 w-24">ระยะ</th>
                  <th className="px-3 py-2.5">ขั้นตอนการดำเนินงาน</th>
                  <th className="px-3 py-2.5 w-28">สถานะ</th>
                  <th className="px-3 py-2.5 w-36">ผู้รับผิดชอบ</th>
                  <th className="px-3 py-2.5 w-28">กำหนดเสร็จ</th>
                  <th className="px-3 py-2.5 w-24 text-center">รายการย่อย</th>
                  <th className="px-3 py-2.5 w-44">ข้อมูลสด / หมายเหตุ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTableSteps.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      ไม่พบขั้นตอนที่ตรงกับเงื่อนไขการค้นหา
                    </td>
                  </tr>
                ) : (
                  filteredTableSteps.map((step) => {
                    const phaseMeta = WORKFLOW_PHASES.find(
                      (p) => p.id === step.phase
                    );
                    const statusMeta = WORKFLOW_STATUS_META[step.status];
                    const metric = liveMetricMap.get(step.id);
                    const overdue = isStepOverdue(step);
                    const doneChecklist = step.checklist.filter(
                      (c) => c.done
                    ).length;

                    return (
                      <tr
                        key={step.id}
                        onClick={() => setSelectedStepId(step.id)}
                        className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                      >
                        <td className="px-3 py-2.5 text-center font-extrabold text-[#16265E]">
                          {step.order}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                            {phaseMeta?.shortTitle}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-bold text-slate-900">
                            {step.title}
                          </div>
                          {step.description && (
                            <div className="text-[11px] text-slate-500 line-clamp-1">
                              {step.description}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <button
                            type="button"
                            onClick={(e) =>
                              void handleQuickStatusCycle(e, step)
                            }
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusMeta.badgeClass}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${statusMeta.dotClass}`}
                            />
                            {statusMeta.shortLabel}
                          </button>
                        </td>
                        <td className="px-3 py-2.5 text-slate-700">
                          {step.assignee || "-"}
                        </td>
                        <td className="px-3 py-2.5">
                          {step.dueDate ? (
                            <span
                              className={
                                overdue
                                  ? "font-bold text-red-600"
                                  : "text-slate-700"
                              }
                            >
                              {formatThaiShortDate(step.dueDate)}
                              {overdue ? " !" : ""}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center font-bold text-slate-700">
                          {step.checklist.length > 0
                            ? `${doneChecklist}/${step.checklist.length}`
                            : "-"}
                        </td>
                        <td className="px-3 py-2.5 text-[11px]">
                          {metric && (
                            <div className="font-semibold text-[#16265E]">
                              {metric.badge}
                            </div>
                          )}
                          {step.notes && (
                            <div className="text-slate-500 line-clamp-1">
                              {step.notes}
                            </div>
                          )}
                          {!metric && !step.notes && (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer Utilities (Reset Template) */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 print:hidden">
        <span>
          คำแนะนำ: คลิกที่กล่องขั้นตอนเพื่อแก้ไขรายละเอียด Checklist
          หรือคลิกป้ายสถานะเพื่อสลับสถานะด่วน
        </span>

        {!confirmResetOpen ? (
          <button
            type="button"
            onClick={() => setConfirmResetOpen(true)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            รีเซ็ตปี พ.ศ. {activeYearBE} กลับผังมาตรฐาน 12 ขั้นตอน
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-red-600">
              ยืนยันรีเซ็ตผังปี {activeYearBE}?
            </span>
            <button
              type="button"
              onClick={() => void handleResetToDefault()}
              className="rounded bg-red-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-red-700 cursor-pointer"
            >
              ยืนยันรีเซ็ต
            </button>
            <button
              type="button"
              onClick={() => setConfirmResetOpen(false)}
              className="rounded border border-slate-300 bg-white px-2.5 py-1 text-[11px] text-slate-600 cursor-pointer"
            >
              ยกเลิก
            </button>
          </div>
        )}
      </div>

      {/* Print-Only A4 Executive Report */}
      <div className="hidden print:block text-black text-[11px] leading-relaxed">
        <div className="border-b-2 border-black pb-3 mb-4 text-center">
          <p className="text-xs font-bold">
            กองพัฒนาบุคลากรกีฬา ฝ่ายพัฒนากีฬาเป็นเลิศ การกีฬาแห่งประเทศไทย
          </p>
          <h1 className="mt-1 text-base font-extrabold">
            รายงานความคืบหน้าผังขั้นตอนการดำเนินงาน ประจำปีงบประมาณ พ.ศ.{" "}
            {activeYearBE}
          </h1>
          <p className="text-[10px] text-gray-700 mt-0.5">
            พิมพ์รายงาน ณ วันที่{" "}
            {new Date().toLocaleDateString("th-TH", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}{" "}
            · ความคืบหน้าภาพรวม {summary.percent}% (เสร็จสิ้น{" "}
            {summary.completed}/{summary.total} ขั้นตอน)
          </p>
        </div>

        <table className="w-full border-collapse border border-black text-[10px]">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black px-2 py-1.5 w-10 text-center">
                ลำดับ
              </th>
              <th className="border border-black px-2 py-1.5 w-24">ระยะ</th>
              <th className="border border-black px-2 py-1.5">
                ขั้นตอนการดำเนินงาน
              </th>
              <th className="border border-black px-2 py-1.5 w-24 text-center">
                สถานะ
              </th>
              <th className="border border-black px-2 py-1.5 w-28">
                ผู้รับผิดชอบ
              </th>
              <th className="border border-black px-2 py-1.5 w-20 text-center">
                กำหนดเสร็จ
              </th>
              <th className="border border-black px-2 py-1.5 w-16 text-center">
                ย่อย
              </th>
              <th className="border border-black px-2 py-1.5 w-44">
                ข้อมูลระบบ / หมายเหตุ
              </th>
            </tr>
          </thead>
          <tbody>
            {orderedSteps.map((step) => {
              const phaseMeta = WORKFLOW_PHASES.find(
                (p) => p.id === step.phase
              );
              const statusMeta = WORKFLOW_STATUS_META[step.status];
              const metric = liveMetricMap.get(step.id);
              const doneChecklist = step.checklist.filter((c) => c.done).length;
              return (
                <tr key={step.id}>
                  <td className="border border-black px-2 py-1.5 text-center font-bold">
                    {step.order}
                  </td>
                  <td className="border border-black px-2 py-1.5">
                    {phaseMeta?.shortTitle}
                  </td>
                  <td className="border border-black px-2 py-1.5">
                    <div className="font-bold">{step.title}</div>
                  </td>
                  <td className="border border-black px-2 py-1.5 text-center font-bold">
                    {statusMeta.label}
                  </td>
                  <td className="border border-black px-2 py-1.5">
                    {step.assignee || "-"}
                  </td>
                  <td className="border border-black px-2 py-1.5 text-center">
                    {step.dueDate ? formatThaiShortDate(step.dueDate) : "-"}
                  </td>
                  <td className="border border-black px-2 py-1.5 text-center">
                    {step.checklist.length > 0
                      ? `${doneChecklist}/${step.checklist.length}`
                      : "-"}
                  </td>
                  <td className="border border-black px-2 py-1.5">
                    {metric ? `[${metric.badge}] ` : ""}
                    {step.notes || (metric ? "" : "-")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-8 grid grid-cols-2 gap-8 text-center text-[11px]">
          <div>
            <p className="mt-8">ลงชื่อ ................................................. ผู้จัดทำรายงาน</p>
            <p className="mt-1">( ................................................. )</p>
            <p>ตำแหน่ง .................................................</p>
          </div>
          <div>
            <p className="mt-8">ลงชื่อ ................................................. ผู้รับทราบ/อนุมัติ</p>
            <p className="mt-1">( ................................................. )</p>
            <p>ตำแหน่ง .................................................</p>
          </div>
        </div>
      </div>

      {/* Modals & Drawers */}
      {selectedStep && (
        <WorkflowStepDrawer
          key={`${selectedStep.id}-${selectedStep.updatedAt}`}
          step={selectedStep}
          liveMetric={liveMetricMap.get(selectedStep.id) ?? null}
          canMoveUp={selectedPhasePosition.canMoveUp}
          canMoveDown={selectedPhasePosition.canMoveDown}
          onClose={() => setSelectedStepId(null)}
          onSaveStep={handleSaveStep}
          onMoveStep={handleMoveStep}
          onDeleteStep={handleDeleteStep}
        />
      )}

      {dialogMode && (
        <WorkflowAddDialog
          key={dialogMode}
          mode={dialogMode}
          existingYears={fiscalYearKeys}
          activeYearBE={activeYearBE}
          onClose={() => setDialogMode(null)}
          onCreateStep={handleCreateStep}
          onCreateYear={handleCreateYear}
        />
      )}
    </div>
  );
}
