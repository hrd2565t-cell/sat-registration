"use client";

import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  PAST_YEARS_BE,
  computeEvaluationStatsForYear,
  type EvaluationStats,
  type HistoricalTrainee,
} from "@/lib/alumni-store";
import { useCourses } from "@/lib/courses-store";
import { TARGET_GROUPS, sortCoursesChronologically } from "@/lib/courses";
import { useNationalAssociationsStore } from "@/lib/associations-store";
import type {
  NationalCoverageResult,
  ProvincialCoverageResult,
} from "@/lib/association-coverage";
import {
  useAnnualOutcomesStore,
  saveAnnualOutcome,
  deleteAnnualOutcome,
} from "@/lib/annual-outcomes-store";
import {
  HISTORICAL_COURSE_COMPETENCIES,
  computeAggregatedAdminMetrics,
  computeAnnualOutcomesMatrix,
} from "@/lib/annual-outcomes";

interface ExecutiveOutcomeSummaryProps {
  trainees: HistoricalTrainee[];
  overallStats: EvaluationStats;
  overallNationalCoverage: NationalCoverageResult;
  overallProvincialCoverage: ProvincialCoverageResult;
  isAdmin?: boolean;
  onOpenBriefingForYear: (year: string) => void;
  onJumpToCoverage: () => void;
  onJumpToKirkpatrick: () => void;
}

export function ExecutiveOutcomeSummary({
  trainees,
  overallStats,
  overallNationalCoverage,
  overallProvincialCoverage,
  isAdmin = false,
  onOpenBriefingForYear,
  onJumpToCoverage,
  onJumpToKirkpatrick,
}: ExecutiveOutcomeSummaryProps) {
  const { courses } = useCourses();
  const { associations: masterAssociations } = useNationalAssociationsStore();
  const { records: annualOutcomeRecords } = useAnnualOutcomesStore();

  const [selectedScope, setSelectedScope] = useState<string>("all");
  const [displayMode, setDisplayMode] = useState<"pillars" | "yoy">("pillars");
  const [showAllYoYYears, setShowAllYoYYears] = useState<boolean>(false);
  const [allModeCourseTab, setAllModeCourseTab] = useState<"fy2570" | "historical17">("fy2570");
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedHistCourseTitle, setSelectedHistCourseTitle] = useState<string | null>(null);

  // Admin Annual Outcome Editor Modal
  const [isOutcomeEditorOpen, setIsOutcomeEditorOpen] = useState<boolean>(false);
  const [editorYearBE, setEditorYearBE] = useState<number>(2569);
  const [editorL1, setEditorL1] = useState<string>("");
  const [editorL2, setEditorL2] = useState<string>("");
  const [editorAchievementsText, setEditorAchievementsText] = useState<string>("");
  const [editorNote, setEditorNote] = useState<string>("");
  const savingOutcomeLockRef = useRef<boolean>(false);

  const activeCourses = useMemo(
    () => sortCoursesChronologically(courses.filter((c) => !c.isHistorical)),
    [courses]
  );

  const annualMatrix = useMemo(
    () =>
      computeAnnualOutcomesMatrix(
        trainees,
        masterAssociations,
        annualOutcomeRecords,
        courses
      ),
    [trainees, masterAssociations, annualOutcomeRecords, courses]
  );

  const aggregatedAdminMetrics = useMemo(
    () => computeAggregatedAdminMetrics(annualOutcomeRecords),
    [annualOutcomeRecords]
  );

  const annualRowByYear = useMemo(() => {
    const map = new Map<number, (typeof annualMatrix)[number]>();
    for (const row of annualMatrix) {
      map.set(row.yearBE, row);
    }
    return map;
  }, [annualMatrix]);

  const historical17Entries = useMemo(
    () => Object.entries(HISTORICAL_COURSE_COMPETENCIES),
    []
  );

  // Active FY 2570 planned metrics (PDPA-safe: targets & capacities only)
  const fy2570PlanSummary = useMemo(() => {
    let totalSeats = 0;
    const quotasSum: Record<string, number> = {
      sat: 0,
      nationalAssoc: 0,
      provincialAssoc: 0,
      nsdf: 0,
      external: 0,
    };
    for (const c of activeCourses) {
      totalSeats += c.capacity || 40;
      if (c.targetQuotas) {
        quotasSum.sat += c.targetQuotas.sat || 0;
        quotasSum.nationalAssoc += c.targetQuotas.nationalAssoc || 0;
        quotasSum.provincialAssoc += c.targetQuotas.provincialAssoc || 0;
        quotasSum.nsdf += c.targetQuotas.nsdf || 0;
        quotasSum.external += c.targetQuotas.external || 0;
      }
    }
    return { totalSeats, quotasSum };
  }, [activeCourses]);

  const selectedActiveCourse = useMemo(() => {
    if (activeCourses.length === 0) return null;
    if (selectedCourseId !== null) {
      const hit = activeCourses.find((c) => c.id === selectedCourseId);
      if (hit) return hit;
    }
    return activeCourses[0];
  }, [activeCourses, selectedCourseId]);

  const currentYearRow = useMemo(() => {
    if (selectedScope === "all" || selectedScope === "2570") return null;
    return annualRowByYear.get(Number(selectedScope)) || null;
  }, [annualRowByYear, selectedScope]);

  const scopedEvalStats = useMemo(() => {
    if (selectedScope === "all" || selectedScope === "2570") return overallStats;
    return computeEvaluationStatsForYear(trainees, Number(selectedScope));
  }, [selectedScope, overallStats, trainees]);

  const currentAdminRecord = useMemo(() => {
    if (selectedScope === "all") return undefined;
    return annualOutcomeRecords[Number(selectedScope)];
  }, [annualOutcomeRecords, selectedScope]);

  const activeHistoricalCourseItem = useMemo(() => {
    if (!currentYearRow || currentYearRow.coursesList.length === 0) return null;
    if (selectedHistCourseTitle) {
      const hit = currentYearRow.coursesList.find(
        (c) => c.courseTitle === selectedHistCourseTitle
      );
      if (hit) return hit;
    }
    return currentYearRow.coursesList[0];
  }, [currentYearRow, selectedHistCourseTitle]);

  const selected17HistoricalCourse = useMemo(() => {
    const key = selectedHistCourseTitle || historical17Entries[0]?.[0];
    return (
      HISTORICAL_COURSE_COMPETENCIES[key] ||
      historical17Entries[0]?.[1] ||
      null
    );
  }, [selectedHistCourseTitle, historical17Entries]);

  const yoyDisplayedRows = useMemo(
    () => (showAllYoYYears ? annualMatrix : annualMatrix.slice(0, 5)),
    [annualMatrix, showAllYoYYears]
  );

  const loadEditorFieldsForYear = (yr: number) => {
    setEditorYearBE(yr);
    const existing = annualOutcomeRecords[yr];
    setEditorL1(
      existing?.reactionSatisfactionPct !== undefined &&
        existing?.reactionSatisfactionPct !== null
        ? String(existing.reactionSatisfactionPct)
        : ""
    );
    setEditorL2(
      existing?.learningPassPct !== undefined && existing?.learningPassPct !== null
        ? String(existing.learningPassPct)
        : ""
    );
    setEditorAchievementsText((existing?.keyAchievements || []).join("\n"));
    setEditorNote(existing?.executiveNote || "");
  };

  const handleOpenOutcomeEditor = (preferredYear?: number) => {
    const targetYr =
      preferredYear ??
      (selectedScope !== "all" ? Number(selectedScope) : 2569);
    loadEditorFieldsForYear(Number.isFinite(targetYr) ? targetYr : 2569);
    setIsOutcomeEditorOpen(true);
  };

  const handleSaveAnnualOutcomeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (savingOutcomeLockRef.current) return;
    savingOutcomeLockRef.current = true;
    try {
      const l1Val = editorL1.trim() ? Number(editorL1) : null;
      const l2Val = editorL2.trim() ? Number(editorL2) : null;
      const achievements = editorAchievementsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      saveAnnualOutcome({
        yearBE: editorYearBE,
        reactionSatisfactionPct:
          l1Val !== null && Number.isFinite(l1Val) ? l1Val : null,
        learningPassPct:
          l2Val !== null && Number.isFinite(l2Val) ? l2Val : null,
        keyAchievements: achievements,
        executiveNote: editorNote.trim() || undefined,
      });
      setIsOutcomeEditorOpen(false);
    } finally {
      savingOutcomeLockRef.current = false;
    }
  };

  const handleDeleteAnnualOutcome = () => {
    if (savingOutcomeLockRef.current) return;
    if (!confirm(`ต้องการล้างข้อมูลผลประเมินและผลสัมฤทธิ์ที่บันทึกไว้สำหรับ พ.ศ. ${editorYearBE} ใช่หรือไม่?`)) {
      return;
    }
    savingOutcomeLockRef.current = true;
    try {
      deleteAnnualOutcome(editorYearBE);
      setIsOutcomeEditorOpen(false);
    } finally {
      savingOutcomeLockRef.current = false;
    }
  };

  const handleExportAnnualOutcomesExcel = () => {
    const wb = XLSX.utils.book_new();

    const yoyRows = annualMatrix.map((row) => ({
      "ปีงบประมาณ (พ.ศ.)": row.yearBE,
      "จำนวนหลักสูตรที่จัด": row.courseCount,
      "รายชื่อหลักสูตร": row.coursesList.map((c) => `${c.courseTitle} (${c.count})`).join(", "),
      "ผู้ผ่านอบรม (คน-ครั้ง)": row.totalRecords,
      "บุคลากรเดี่ยวจริง (คน)": row.uniquePersons,
      "บุคลากรหน้าใหม่ (คน)": row.newTrainees,
      "สัดส่วนหน้าใหม่ (%)": `${row.newPercentage}%`,
      "ศิษย์เก่าต่อยอด (คน)": row.returningTrainees,
      "สมาคมฯ เข้าร่วม (จาก 93)": `${row.nationalParticipated}/${row.nationalTotal} (${row.nationalCoveragePct}%)`,
      "จังหวัด เข้าร่วม (จาก 77)": `${row.provincialParticipated}/${row.provincialTotal} (${row.provincialCoveragePct}%)`,
      "Active Rate (%)": `${row.activeRatePercent}%`,
      "รายงานปฏิบัติหน้าที่ (ครั้ง)": row.dutiesCount,
      "คะแนน L3 เฉลี่ย (/5)":
        row.ratingsCount > 0 && row.averageImpactRating !== null
          ? row.averageImpactRating
          : "รอเก็บข้อมูล",
      "ความพึงพอใจ L1 (%)":
        row.adminRecord?.reactionSatisfactionPct !== undefined &&
        row.adminRecord?.reactionSatisfactionPct !== null
          ? `${row.adminRecord.reactionSatisfactionPct}%`
          : "-",
      "อัตราผ่านเกณฑ์ L2 (%)":
        row.adminRecord?.learningPassPct !== undefined &&
        row.adminRecord?.learningPassPct !== null
          ? `${row.adminRecord.learningPassPct}%`
          : "-",
      "ผลสัมฤทธิ์เด่นประจำปี": row.adminRecord?.keyAchievements?.join(" | ") || "-",
    }));

    const courseDetailRows: Record<string, string | number>[] = [];
    for (const row of annualMatrix) {
      for (const c of row.coursesList) {
        courseDetailRows.push({
          "ปี พ.ศ.": row.yearBE,
          หลักสูตร: c.courseTitle,
          ชื่อเต็ม: c.competency.fullNameTh,
          สายวิชาชีพ: c.category,
          "จำนวนผู้ผ่านอบรม": c.count,
          สมรรถนะหลักที่ได้รับ: c.competency.competencySummary,
        });
      }
    }

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(yoyRows),
      "เทียบผลสัมฤทธิ์รายปี_YoY"
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(courseDetailRows),
      "สมรรถนะรายหลักสูตรและปี"
    );

    XLSX.writeFile(
      wb,
      `SAT_Annual_Outcomes_Comparison_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  const handleSelectScope = (scope: string) => {
    setSelectedScope(scope);
    setDisplayMode("pillars");
    setSelectedHistCourseTitle(null);
  };

  const scopeBadgeText =
    selectedScope === "all"
      ? "ภาพรวมสะสม 23 ปี (พ.ศ. 2547–2569) + แผนปีงบฯ 2570"
      : selectedScope === "2570"
      ? `แผนพัฒนาบุคลากร ปีงบประมาณ พ.ศ. 2570 (${activeCourses.length} หลักสูตรเปิดรับ)`
      : `ผลสัมฤทธิ์ประจำปี พ.ศ. ${selectedScope}`;

  const topDimensions = useMemo(
    () => scopedEvalStats.dimensionBreakdown.slice(0, 3),
    [scopedEvalStats.dimensionBreakdown]
  );

  const sampleHighlights = useMemo(
    () => scopedEvalStats.qualitativeHighlights.slice(0, 2),
    [scopedEvalStats.qualitativeHighlights]
  );

  const avgCoursesPerPerson =
    overallStats.uniquePersonnelCount > 0
      ? (overallStats.totalTrainees / overallStats.uniquePersonnelCount).toFixed(2)
      : "0.00";

  return (
    <section className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-white via-blue-50/35 to-indigo-50/40 p-5 sm:p-6 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-indigo-100 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-[#16265E] px-2.5 py-0.5 text-xs font-bold text-white">
              Executive Summary · คำตอบสำหรับผู้บริหาร
            </span>
            <span className="rounded-md bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900 border border-amber-200">
              {scopeBadgeText}
            </span>
          </div>
          <h3 className="mt-2 text-lg sm:text-xl font-black text-[#16265E]">
            🎯 &ldquo;อบรมแล้วได้อะไร?&rdquo; — สรุปผลสัมฤทธิ์ 3 มิติ (ภาพรวม &amp; แยกรายปี)
          </h3>
          <p className="text-xs text-gray-600 mt-0.5">
            เลือกดูผลสัมฤทธิ์ได้ทั้งแบบภาพรวมสะสม 23 ปี เจาะลึกรายปี พ.ศ. หรือเทียบผลดำเนินงานแบบปีต่อปี (YoY)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportAnnualOutcomesExcel}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 shadow-2xs hover:bg-emerald-100 transition-colors cursor-pointer"
          >
            <span>📊</span>
            <span>ส่งออก Excel รายปี</span>
          </button>
          <button
            type="button"
            onClick={onJumpToCoverage}
            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-[#16265E] shadow-2xs hover:bg-blue-50 transition-colors cursor-pointer"
          >
            <span>🏛️</span>
            <span>ความครอบคลุมสมาคม ↓</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenBriefingForYear(selectedScope)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#16265E] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#111e4a] transition-colors cursor-pointer"
          >
            <span>📑</span>
            <span>พิมพ์สรุปผู้บริหาร (A4)</span>
          </button>
        </div>
      </div>

      {/* Scope & Display Mode Toolbar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-white/85 p-3">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] font-bold text-gray-500 mr-1">ช่วงเวลา:</span>
          {[
            { key: "all", label: "ภาพรวมสะสม (23 ปี)" },
            { key: "2570", label: "แผนปีงบฯ 2570" },
            { key: "2569", label: "พ.ศ. 2569" },
            { key: "2568", label: "พ.ศ. 2568" },
            { key: "2567", label: "พ.ศ. 2567" },
          ].map((btn) => (
            <button
              key={btn.key}
              type="button"
              onClick={() => handleSelectScope(btn.key)}
              className={`rounded-lg px-2.5 py-1.5 font-bold transition-colors cursor-pointer border ${
                displayMode === "pillars" && selectedScope === btn.key
                  ? "bg-[#16265E] text-white border-[#16265E] shadow-2xs"
                  : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-blue-50"
              }`}
            >
              {btn.label}
            </button>
          ))}

          <select
            value={selectedScope === "all" || selectedScope === "2570" ? "" : selectedScope}
            onChange={(e) => {
              if (e.target.value) handleSelectScope(e.target.value);
            }}
            className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 focus:border-[#16265E] focus:outline-hidden"
            aria-label="เลือกปี พ.ศ. ย้อนหลัง"
          >
            <option value="">เลือกปีอื่น (2547–2569)...</option>
            {PAST_YEARS_BE.map((y) => {
              const row = annualRowByYear.get(y);
              return (
                <option key={y} value={String(y)}>
                  พ.ศ. {y} ({row ? `${row.courseCount} หลักสูตร • ${row.totalRecords} คน-ครั้ง` : "ไม่มีข้อมูล"})
                </option>
              );
            })}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setDisplayMode("pillars")}
              className={`rounded-lg px-3 py-1 font-bold transition-colors cursor-pointer ${
                displayMode === "pillars"
                  ? "bg-white text-[#16265E] shadow-2xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              🎯 มุมมอง 3 มิติ
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode("yoy")}
              className={`rounded-lg px-3 py-1 font-bold transition-colors cursor-pointer ${
                displayMode === "yoy"
                  ? "bg-white text-[#16265E] shadow-2xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              📊 เทียบผลสัมฤทธิ์รายปี (YoY)
            </button>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={() => handleOpenOutcomeEditor()}
              className="inline-flex items-center gap-1 rounded-lg border border-purple-300 bg-purple-50 px-3 py-1.5 font-bold text-purple-900 hover:bg-purple-100 transition-colors cursor-pointer"
            >
              <span>✏️</span>
              <span>บันทึกผล L1–L2 / ผลสัมฤทธิ์ประจำปี</span>
            </button>
          )}
        </div>
      </div>

      {/* Mode 1: 3-Pillar View */}
      {displayMode === "pillars" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Pillar 1: Output & Competency */}
          <div className="rounded-2xl border border-blue-200 bg-white p-4 sm:p-5 flex flex-col justify-between shadow-2xs space-y-3">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-[#16265E] border border-blue-100">
                  <span>1️⃣</span>
                  <span>สมรรถนะและหลักสูตร (Output)</span>
                </span>
                <span className="text-[11px] font-semibold text-blue-700">
                  {selectedScope === "2570"
                    ? `${activeCourses.length} หลักสูตร ปีงบฯ 2570`
                    : selectedScope === "all"
                    ? "ปีงบฯ 2570 + 17 หลักสูตรสะสม"
                    : `${currentYearRow?.courseCount ?? 0} หลักสูตร ปี ${selectedScope}`}
                </span>
              </div>

              {selectedScope === "all" && (
                <div className="flex items-center gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setAllModeCourseTab("fy2570")}
                    className={`rounded-lg px-2.5 py-1 font-bold cursor-pointer border ${
                      allModeCourseTab === "fy2570"
                        ? "bg-blue-700 text-white border-blue-700"
                        : "bg-gray-50 text-gray-700 border-gray-200"
                    }`}
                  >
                    ปีงบฯ 2570 ({activeCourses.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllModeCourseTab("historical17")}
                    className={`rounded-lg px-2.5 py-1 font-bold cursor-pointer border ${
                      allModeCourseTab === "historical17"
                        ? "bg-blue-700 text-white border-blue-700"
                        : "bg-gray-50 text-gray-700 border-gray-200"
                    }`}
                  >
                    หลักสูตรสะสม 23 ปี ({historical17Entries.length})
                  </button>
                </div>
              )}

              {/* FY 2570 Active Courses */}
              {(selectedScope === "2570" ||
                (selectedScope === "all" && allModeCourseTab === "fy2570")) &&
                (activeCourses.length > 0 && selectedActiveCourse ? (
                  <>
                    <div className="flex flex-wrap gap-1.5">
                      {activeCourses.map((c, idx) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedCourseId(c.id)}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer border ${
                            c.id === selectedActiveCourse.id
                              ? "bg-[#16265E] text-white border-[#16265E]"
                              : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-blue-50"
                          }`}
                          title={c.title}
                        >
                          หลักสูตร {idx + 1}
                        </button>
                      ))}
                    </div>

                    <div className="rounded-xl border border-blue-100 bg-blue-50/35 p-3 space-y-2">
                      <p className="text-xs font-bold text-[#16265E] leading-snug">
                        {selectedActiveCourse.title}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        📅 {selectedActiveCourse.date} · เป้าหมาย {selectedActiveCourse.capacity || 40} ที่นั่ง
                      </p>
                      {selectedActiveCourse.courseObjective && (
                        <div className="text-[11px] text-gray-700 leading-relaxed">
                          <span className="font-bold text-blue-900">สิ่งที่ผู้เรียนได้รับ: </span>
                          {selectedActiveCourse.courseObjective}
                        </div>
                      )}
                      {Array.isArray(selectedActiveCourse.evaluationCriteria) &&
                        selectedActiveCourse.evaluationCriteria.length > 0 && (
                          <div className="pt-1.5 border-t border-blue-100/80 space-y-1">
                            <p className="text-[10.5px] font-bold text-gray-700">
                              เกณฑ์วัดผลการสำเร็จการอบรม:
                            </p>
                            <ul className="space-y-0.5 text-[10.5px] text-gray-600 list-disc list-inside">
                              {selectedActiveCourse.evaluationCriteria.slice(0, 3).map((item, i) => (
                                <li key={i} className="leading-snug">
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-gray-500">ไม่พบหลักสูตรเปิดรับสมัครในปีงบประมาณปัจจุบัน</p>
                ))}

              {/* All-Years 17 Historical Competency Selector */}
              {selectedScope === "all" && allModeCourseTab === "historical17" && selected17HistoricalCourse && (
                <>
                  <select
                    value={selected17HistoricalCourse.code}
                    onChange={(e) => setSelectedHistCourseTitle(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-800"
                  >
                    {historical17Entries.map(([code, prof]) => (
                      <option key={code} value={code}>
                        {code} — {prof.category}
                      </option>
                    ))}
                  </select>

                  <div className="rounded-xl border border-blue-100 bg-blue-50/35 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded bg-[#16265E] px-2 py-0.5 text-[10px] font-bold text-white">
                        {selected17HistoricalCourse.code}
                      </span>
                      <span className="text-[10.5px] font-semibold text-blue-900">
                        {selected17HistoricalCourse.category}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-[#16265E] leading-snug">
                      {selected17HistoricalCourse.fullNameTh}
                    </p>
                    <p className="text-[11px] text-gray-700 leading-relaxed">
                      {selected17HistoricalCourse.competencySummary}
                    </p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {selected17HistoricalCourse.keySkills.map((sk) => (
                        <span
                          key={sk}
                          className="rounded-md bg-white border border-blue-100 px-2 py-0.5 text-[10px] font-semibold text-[#16265E]"
                        >
                          ✓ {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Specific Historical Year Courses */}
              {selectedScope !== "all" && selectedScope !== "2570" && (
                currentYearRow && currentYearRow.coursesList.length > 0 && activeHistoricalCourseItem ? (
                  <>
                    <div className="flex flex-wrap gap-1.5">
                      {currentYearRow.coursesList.map((c) => {
                        const active = c.courseTitle === activeHistoricalCourseItem.courseTitle;
                        return (
                          <button
                            key={c.courseTitle}
                            type="button"
                            onClick={() => setSelectedHistCourseTitle(c.courseTitle)}
                            className={`rounded-lg px-2 py-1 text-[11px] font-bold transition-colors cursor-pointer border ${
                              active
                                ? "bg-[#16265E] text-white border-[#16265E]"
                                : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-blue-50"
                            }`}
                          >
                            {c.courseTitle.length > 24
                              ? `${c.courseTitle.slice(0, 24)}…`
                              : c.courseTitle}{" "}
                            ({c.count})
                          </button>
                        );
                      })}
                    </div>

                    <div className="rounded-xl border border-blue-100 bg-blue-50/35 p-3 space-y-2">
                      <div className="flex items-center justify-between text-[10.5px]">
                        <span className="font-bold text-blue-900">
                          สายวิชาชีพ: {activeHistoricalCourseItem.category}
                        </span>
                        <span className="font-mono font-bold text-[#16265E]">
                          ผ่านอบรม {activeHistoricalCourseItem.count} คน-ครั้ง
                        </span>
                      </div>
                      <p className="text-xs font-bold text-[#16265E] leading-snug">
                        {activeHistoricalCourseItem.competency.fullNameTh}
                      </p>
                      <p className="text-[11px] text-gray-700 leading-relaxed">
                        {activeHistoricalCourseItem.competency.competencySummary}
                      </p>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {activeHistoricalCourseItem.competency.keySkills.map((sk) => (
                          <span
                            key={sk}
                            className="rounded-md bg-white border border-blue-100 px-2 py-0.5 text-[10px] font-semibold text-[#16265E]"
                          >
                            ✓ {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-gray-500 rounded-xl bg-gray-50 p-3">
                    ไม่พบประวัติการจัดอบรมในปี พ.ศ. {selectedScope}
                  </p>
                )
              )}
            </div>

            <p className="text-[10.5px] text-gray-400 pt-1 border-t border-gray-100">
              {selectedScope === "2570"
                ? "แหล่งข้อมูล: โครงสร้างหลักสูตรปัจจุบัน (ซิงก์จากเมนูจัดการหลักสูตร)"
                : selectedScope === "all"
                ? "ครอบคลุม 4 หลักสูตรปีงบฯ 2570 และ 17 หลักสูตรมาตรฐานในทำเนียบ กกท."
                : `จำแนกสายวิชาชีพปี ${selectedScope}: ${Object.entries(currentYearRow?.byCategory || {})
                    .map(([k, v]) => `${k} ${v} คน`)
                    .join(" · ") || "-"}`}
            </p>
          </div>

          {/* Pillar 2: Outcome (Kirkpatrick L1–L3 + Admin Recorded Annual Highlights) */}
          <div className="rounded-2xl border border-emerald-200 bg-white p-4 sm:p-5 flex flex-col justify-between shadow-2xs space-y-3">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-900 border border-emerald-100">
                  <span>2️⃣</span>
                  <span>ผลลัพธ์ &amp; การนำไปใช้ (Outcome)</span>
                </span>
                {scopedEvalStats.totalRatingsCount > 0 &&
                scopedEvalStats.averageImpactRating !== null ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                    ⭐ {scopedEvalStats.averageImpactRating} / 5.0
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-semibold text-slate-600">
                    L3: รอเก็บข้อมูลติดตามผล
                  </span>
                )}
              </div>

              {selectedScope === "2570" ? (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 space-y-2 text-xs text-gray-700">
                  <p className="font-bold text-emerald-900">
                    อยู่ระหว่างเปิดรับสมัครและดำเนินการอบรม (ปีงบฯ 2570)
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    เมื่อผู้เข้ารับการอบรมสำเร็จหลักสูตรและได้รับการโอนเข้าทำเนียบศิษย์เก่า ระบบจะเริ่มเก็บคะแนนประเมิน L1–L3 และการรายงานการปฏิบัติหน้าที่จริงในปี 2570 โดยอัตโนมัติ
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-xl bg-emerald-50/70 border border-emerald-100 p-2.5">
                    <p className="text-[10.5px] font-semibold text-emerald-800">
                      ปฏิบัติงานต่อเนื่อง
                    </p>
                    <p className="text-xl font-black text-emerald-700 mt-0.5">
                      {scopedEvalStats.activeRatePercent}%
                    </p>
                  </div>
                  <div className="rounded-xl bg-amber-50/70 border border-amber-100 p-2.5">
                    <p className="text-[10.5px] font-semibold text-amber-900">
                      ลงสนามปฏิบัติหน้าที่ (L3)
                    </p>
                    <p className="text-xl font-black text-amber-800 mt-0.5">
                      {scopedEvalStats.totalDutiesReported.toLocaleString()}{" "}
                      <span className="text-[11px] font-medium">ครั้ง</span>
                    </p>
                  </div>
                </div>
              )}

              {/* L1 / L2 Admin Official Metrics */}
              <div className="rounded-xl border border-purple-100 bg-purple-50/35 p-2.5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-purple-950">
                    ผลประเมินโครงการอย่างเป็นทางการ (L1–L2)
                  </span>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleOpenOutcomeEditor()}
                      className="text-[10.5px] font-bold text-purple-700 hover:underline cursor-pointer"
                    >
                      ✏️ แก้ไข
                    </button>
                  )}
                </div>

                {selectedScope === "all" ? (
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded-lg bg-white px-2.5 py-1.5 border border-purple-100">
                      <span className="text-gray-500">ความพึงพอใจ (L1): </span>
                      <strong className="text-[#16265E]">
                        {aggregatedAdminMetrics.avgReactionPct !== null
                          ? `${aggregatedAdminMetrics.avgReactionPct}% (${aggregatedAdminMetrics.reactionCount} ปี)`
                          : "รอการบันทึก"}
                      </strong>
                    </div>
                    <div className="rounded-lg bg-white px-2.5 py-1.5 border border-purple-100">
                      <span className="text-gray-500">ผ่านเกณฑ์ (L2): </span>
                      <strong className="text-[#16265E]">
                        {aggregatedAdminMetrics.avgLearningPct !== null
                          ? `${aggregatedAdminMetrics.avgLearningPct}% (${aggregatedAdminMetrics.learningCount} ปี)`
                          : "รอการบันทึก"}
                      </strong>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded-lg bg-white px-2.5 py-1.5 border border-purple-100">
                      <span className="text-gray-500">ความพึงพอใจ (L1): </span>
                      <strong className="text-[#16265E]">
                        {currentAdminRecord?.reactionSatisfactionPct !== undefined &&
                        currentAdminRecord?.reactionSatisfactionPct !== null
                          ? `${currentAdminRecord.reactionSatisfactionPct}%`
                          : "รอการบันทึก"}
                      </strong>
                    </div>
                    <div className="rounded-lg bg-white px-2.5 py-1.5 border border-purple-100">
                      <span className="text-gray-500">ผ่านเกณฑ์ (L2): </span>
                      <strong className="text-[#16265E]">
                        {currentAdminRecord?.learningPassPct !== undefined &&
                        currentAdminRecord?.learningPassPct !== null
                          ? `${currentAdminRecord.learningPassPct}%`
                          : "รอการบันทึก"}
                      </strong>
                    </div>
                  </div>
                )}

                {/* Recorded Key Achievements */}
                {selectedScope === "all" ? (
                  aggregatedAdminMetrics.recentHighlights.length > 0 ? (
                    <ul className="space-y-0.5 text-[11px] text-gray-700 pt-1">
                      {aggregatedAdminMetrics.recentHighlights.slice(0, 2).map((h, i) => (
                        <li key={i} className="leading-snug">
                          • <strong className="text-[#16265E]">[{h.yearBE}]</strong> {h.text}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[10.5px] text-gray-500">
                      ยังไม่มีผลสัมฤทธิ์เด่นรายปีที่บันทึก (แอดมินกดบันทึกเพิ่มได้)
                    </p>
                  )
                ) : currentAdminRecord?.keyAchievements?.length ? (
                  <ul className="space-y-0.5 text-[11px] text-gray-700 pt-1">
                    {currentAdminRecord.keyAchievements.slice(0, 3).map((txt, i) => (
                      <li key={i} className="leading-snug">
                        • {txt}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[10.5px] text-gray-500">
                    ยังไม่มีบันทึกผลสัมฤทธิ์เด่นเฉพาะปี พ.ศ. {selectedScope}
                  </p>
                )}
              </div>

              {/* Kirkpatrick Dimensions or Quotes */}
              {selectedScope !== "2570" &&
                (scopedEvalStats.totalDutiesReported > 0 ? (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-gray-700">
                      มิติองค์ความรู้ที่นำไปใช้จริง:
                    </p>
                    {topDimensions.map((dim) => (
                      <div
                        key={dim.key}
                        className="flex items-center justify-between text-[11px] rounded-lg bg-gray-50 px-2.5 py-1 border border-gray-100"
                      >
                        <span className="text-gray-800 truncate pr-2">
                          {dim.icon} {dim.label.split(" (")[0]}
                        </span>
                        <span className="font-mono font-bold text-[#16265E] shrink-0">
                          {dim.percent}%
                        </span>
                      </div>
                    ))}
                    {sampleHighlights.length > 0 && (
                      <p className="text-[10.5px] italic text-gray-600 line-clamp-2 pt-0.5">
                        &ldquo;{sampleHighlights[0].text}&rdquo; — {sampleHighlights[0].traineeName}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-600 rounded-lg bg-slate-50 px-2.5 py-2 border border-slate-200">
                    ℹ️ ข้อมูลย้อนหลังยังไม่มีรายงานติดตามการปฏิบัติหน้าที่รายบุคคล (0 รายงาน) — สามารถเพิ่มได้ผ่านปุ่มรายงานการปฏิบัติหน้าที่
                  </p>
                ))}
            </div>

            <div className="pt-1 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[10.5px] text-gray-400">
                รายงานประเมินผล L3: {scopedEvalStats.totalRatingsCount} รายการ
              </span>
              <button
                type="button"
                onClick={onJumpToKirkpatrick}
                className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
              >
                ดูผลประเมินเต็ม ↓
              </button>
            </div>
          </div>

          {/* Pillar 3: Impact & Reach */}
          <div className="rounded-2xl border border-purple-200 bg-white p-4 sm:p-5 flex flex-col justify-between shadow-2xs space-y-3">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 px-2.5 py-1 text-[11px] font-bold text-purple-900 border border-purple-100">
                  <span>3️⃣</span>
                  <span>การขยายฐานและความครอบคลุม (Impact)</span>
                </span>
              </div>

              {selectedScope === "2570" ? (
                <>
                  <div className="rounded-xl border border-purple-100 bg-purple-50/35 p-3 space-y-1">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[11px] font-bold text-purple-900">
                        เป้าหมายที่นั่งอบรม ปีงบฯ 2570
                      </span>
                      <span className="text-lg font-black text-[#16265E]">
                        {fy2570PlanSummary.totalSeats.toLocaleString()} คน
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600">
                      กระจายสู่ 5 กลุ่มเป้าหมายหลักของ กกท. ({activeCourses.length} หลักสูตร)
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    {TARGET_GROUPS.map((g) => (
                      <div
                        key={g.key}
                        className="flex items-center justify-between rounded-lg bg-gray-50 px-2.5 py-1.5 text-[11px] border border-gray-100"
                      >
                        <span className="text-gray-700 font-medium">{g.label}</span>
                        <span className="font-mono font-bold text-[#16265E]">
                          {fy2570PlanSummary.quotasSum[g.key] || 0} ที่นั่ง
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : selectedScope === "all" ? (
                <>
                  <div className="rounded-xl border border-purple-100 bg-purple-50/35 p-3 space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[11px] font-bold text-purple-900">
                        บุคลากรเดี่ยวที่พัฒนาแล้ว (สะสม)
                      </span>
                      <span className="text-lg font-black text-[#16265E]">
                        {overallStats.uniquePersonnelCount.toLocaleString()} คน
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-600">
                      <span>การอบรมสะสมทั้งหมด</span>
                      <span className="font-semibold">
                        {overallStats.totalTrainees.toLocaleString()} คน-ครั้ง (เฉลี่ย{" "}
                        {avgCoursesPerPerson} หลักสูตร/คน)
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-2.5 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-gray-800">สมาคมกีฬาแห่งประเทศไทย</span>
                        <span className="font-mono font-bold text-[#16265E]">
                          {overallNationalCoverage.summary.participatedCount} /{" "}
                          {overallNationalCoverage.summary.totalMaster} (
                          {overallNationalCoverage.summary.coveragePercent}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className="h-full bg-[#16265E] rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              overallNationalCoverage.summary.coveragePercent
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-2.5 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-gray-800">สมาคมกีฬาแห่งจังหวัด</span>
                        <span className="font-mono font-bold text-emerald-700">
                          {overallProvincialCoverage.summary.participatedCount} /{" "}
                          {overallProvincialCoverage.summary.totalMaster} (
                          {overallProvincialCoverage.summary.coveragePercent}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              overallProvincialCoverage.summary.coveragePercent
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-xl border border-purple-100 bg-purple-50/35 p-3 space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[11px] font-bold text-purple-900">
                        บุคลากรที่พัฒนาในปี {selectedScope}
                      </span>
                      <span className="text-lg font-black text-[#16265E]">
                        {currentYearRow?.uniquePersons.toLocaleString() ?? 0} คน
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-600">
                      <span>ที่นั่งอบรมรวมในปีนี้</span>
                      <span className="font-semibold">
                        {currentYearRow?.totalRecords.toLocaleString() ?? 0} คน-ครั้ง
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10.5px]">
                      <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-1 text-emerald-900 font-bold">
                        🌱 หน้าใหม่: {currentYearRow?.newTrainees ?? 0} (
                        {currentYearRow?.newPercentage ?? 0}%)
                      </div>
                      <div className="rounded-lg bg-indigo-50 border border-indigo-200 px-2 py-1 text-indigo-900 font-bold">
                        🔄 ต่อยอด: {currentYearRow?.returningTrainees ?? 0} (
                        {currentYearRow?.returningPercentage ?? 0}%)
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-2.5 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-gray-800">
                          สมาคมกีฬาฯ ที่ส่งคนในปี {selectedScope}
                        </span>
                        <span className="font-mono font-bold text-[#16265E]">
                          {currentYearRow?.nationalParticipated ?? 0} /{" "}
                          {currentYearRow?.nationalTotal ??
                            overallNationalCoverage.summary.totalMaster}{" "}
                          ({currentYearRow?.nationalCoveragePct ?? 0}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className="h-full bg-[#16265E] rounded-full"
                          style={{
                            width: `${Math.min(100, currentYearRow?.nationalCoveragePct ?? 0)}%`,
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-gray-400">
                        เทียบสะสม 23 ปี: {overallNationalCoverage.summary.participatedCount}/
                        {overallNationalCoverage.summary.totalMaster} (
                        {overallNationalCoverage.summary.coveragePercent}%)
                      </p>
                    </div>

                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-2.5 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-gray-800">
                          สมาคมจังหวัดที่ส่งคนในปี {selectedScope}
                        </span>
                        <span className="font-mono font-bold text-emerald-700">
                          {currentYearRow?.provincialParticipated ?? 0} / 77 (
                          {currentYearRow?.provincialCoveragePct ?? 0}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 rounded-full"
                          style={{
                            width: `${Math.min(100, currentYearRow?.provincialCoveragePct ?? 0)}%`,
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-gray-400">
                        เทียบสะสม 23 ปี: {overallProvincialCoverage.summary.participatedCount}/77 (
                        {overallProvincialCoverage.summary.coveragePercent}%)
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <p className="text-[10.5px] text-gray-400 pt-1 border-t border-gray-100">
              {selectedScope === "2570"
                ? "แผนจัดสรรโควตาปีงบฯ 2570 (ดูยอดสมัครจริงและงบประมาณได้ในเมนู Admin)"
                : "การวิเคราะห์ต้นทุนงบประมาณต่อคน ดูเพิ่มเติมได้ที่ระบบผู้ดูแลระบบ (Admin)"}
            </p>
          </div>
        </div>
      )}

      {/* Mode 2: Year-over-Year (YoY) Multi-Year Comparison Table */}
      {displayMode === "yoy" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
            <p>
              เปรียบเทียบผลสัมฤทธิ์รายปีตั้งแต่การจัดหลักสูตร ความครอบคลุมสมาคม และผลการประเมิน L1–L3 (คลิก &ldquo;เจาะลึก&rdquo; เพื่อดูรายละเอียดของปีนั้น)
            </p>
            {annualMatrix.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAllYoYYears((prev) => !prev)}
                className="rounded-lg border border-blue-200 bg-white px-3 py-1 font-bold text-[#16265E] hover:bg-blue-50 cursor-pointer"
              >
                {showAllYoYYears
                  ? "แสดงเฉพาะ 5 ปีล่าสุด"
                  : `แสดงครบทั้ง ${annualMatrix.length} ปี (2547–2569)`}
              </button>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#16265E] text-white">
                <tr>
                  <th className="py-2.5 px-3 font-bold w-24">ปี พ.ศ.</th>
                  <th className="py-2.5 px-3 font-bold">หลักสูตรที่จัด</th>
                  <th className="py-2.5 px-3 text-center font-bold">ผ่านอบรม (ครั้ง / คน)</th>
                  <th className="py-2.5 px-3 text-center font-bold">คนหน้าใหม่</th>
                  <th className="py-2.5 px-3 text-center font-bold">สมาคมฯ (/93)</th>
                  <th className="py-2.5 px-3 text-center font-bold">จังหวัด (/77)</th>
                  <th className="py-2.5 px-3 text-center font-bold">Active / L3</th>
                  <th className="py-2.5 px-3 font-bold">L1–L2 &amp; ผลสัมฤทธิ์เด่น</th>
                  <th className="py-2.5 px-3 text-center font-bold w-28">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {yoyDisplayedRows.map((row) => (
                  <tr key={row.yearBE} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-[#16265E] whitespace-nowrap">
                      พ.ศ. {row.yearBE}
                    </td>
                    <td className="py-2.5 px-3">
                      <p className="font-semibold text-gray-800">{row.courseCount} หลักสูตร</p>
                      <p className="text-[10.5px] text-gray-500 line-clamp-1">
                        {row.coursesList.map((c) => c.courseTitle).join(", ")}
                      </p>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">
                      <span className="font-bold text-[#16265E]">{row.totalRecords}</span>{" "}
                      <span className="text-gray-500">({row.uniquePersons} คน)</span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-emerald-700 font-bold">
                      {row.newTrainees} ({row.newPercentage}%)
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">
                      <span className="font-bold text-[#16265E]">{row.nationalParticipated}</span>/
                      {row.nationalTotal} ({row.nationalCoveragePct}%)
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">
                      <span className="font-bold text-emerald-700">{row.provincialParticipated}</span>
                      /{row.provincialTotal} ({row.provincialCoveragePct}%)
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10.5px] font-bold text-emerald-800">
                        {row.activeRatePercent}%
                      </span>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {row.dutiesCount > 0 ? `${row.dutiesCount} งาน` : "รอรายงาน L3"}
                      </p>
                    </td>
                    <td className="py-2.5 px-3">
                      {row.adminRecord ? (
                        <div className="space-y-0.5 text-[10.5px]">
                          <p className="font-semibold text-purple-900">
                            {row.adminRecord.reactionSatisfactionPct !== null &&
                            row.adminRecord.reactionSatisfactionPct !== undefined
                              ? `L1: ${row.adminRecord.reactionSatisfactionPct}%`
                              : "L1: -"}{" "}
                            ·{" "}
                            {row.adminRecord.learningPassPct !== null &&
                            row.adminRecord.learningPassPct !== undefined
                              ? `L2: ${row.adminRecord.learningPassPct}%`
                              : "L2: -"}
                          </p>
                          {row.adminRecord.keyAchievements[0] && (
                            <p className="text-gray-600 line-clamp-1">
                              • {row.adminRecord.keyAchievements[0]}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10.5px] text-gray-400">รอการบันทึก</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleSelectScope(String(row.yearBE))}
                          className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-bold text-[#16265E] hover:bg-blue-100 cursor-pointer"
                        >
                          เจาะลึก
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleOpenOutcomeEditor(row.yearBE)}
                            className="rounded-lg border border-purple-200 bg-purple-50 px-2 py-1 text-[11px] font-bold text-purple-900 hover:bg-purple-100 cursor-pointer"
                            title="บันทึกผล L1-L2 และผลสัมฤทธิ์ปีนี้"
                          >
                            ✏️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Admin Annual Outcomes & L1-L2 Editor Modal */}
      {isAdmin && isOutcomeEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
            <div className="bg-[#16265E] text-white p-4 sm:p-5 flex items-center justify-between">
              <div>
                <h4 className="text-base font-bold">
                  ✏️ บันทึกผลประเมินและผลสัมฤทธิ์เด่นประจำปี (Admin)
                </h4>
                <p className="text-xs text-blue-200 mt-0.5">
                  ข้อมูลซิงก์ขึ้น Supabase Cloud และแสดงบนรายงานผู้บริหารอัตโนมัติ
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOutcomeEditorOpen(false)}
                className="rounded-lg p-1.5 text-blue-200 hover:bg-white/10 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAnnualOutcomeSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  เลือกปี พ.ศ. ที่ต้องการบันทึกผล
                </label>
                <select
                  value={editorYearBE}
                  onChange={(e) => loadEditorFieldsForYear(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-800 focus:border-[#16265E] focus:outline-hidden"
                >
                  <option value={2570}>ปีงบประมาณ พ.ศ. 2570</option>
                  {PAST_YEARS_BE.map((yr) => (
                    <option key={yr} value={yr}>
                      พ.ศ. {yr}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    ความพึงพอใจหลังอบรม (L1: % 0–100)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="เช่น 94.5 (เว้นว่างถ้ายังไม่มีผล)"
                    value={editorL1}
                    onChange={(e) => setEditorL1(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:border-[#16265E] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    อัตราผ่านการวัดผลความรู้ (L2: % 0–100)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="เช่น 96.0 (เว้นว่างถ้ายังไม่มีผล)"
                    value={editorL2}
                    onChange={(e) => setEditorL2(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:border-[#16265E] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  ผลสัมฤทธิ์เด่นประจำปี (1 รายการต่อ 1 บรรทัด)
                </label>
                <textarea
                  rows={4}
                  placeholder={
                    "ตัวอย่าง:\nผลิตผู้จัดระดับความพิการทางการกีฬาระดับชาติ (National Classifier) 18 คน รองรับกีฬาคนพิการแห่งชาติ\nสมาคมกีฬาแห่งจังหวัดเข้าร่วมอบรมธรรมาภิบาลเพิ่มขึ้น"
                  }
                  value={editorAchievementsText}
                  onChange={(e) => setEditorAchievementsText(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 leading-relaxed focus:border-[#16265E] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  หมายเหตุ/ข้อเสนอแนะสำหรับผู้บริหาร (ถ้ามี)
                </label>
                <input
                  type="text"
                  placeholder="สรุปประเด็นสำคัญประจำปี..."
                  value={editorNote}
                  onChange={(e) => setEditorNote(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:border-[#16265E] focus:outline-hidden"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
                {annualOutcomeRecords[editorYearBE] ? (
                  <button
                    type="button"
                    onClick={handleDeleteAnnualOutcome}
                    className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
                  >
                    🗑️ ล้างข้อมูลปีนี้
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsOutcomeEditorOpen(false)}
                    className="rounded-xl border border-gray-300 px-4 py-2 font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-[#16265E] px-4 py-2 font-bold text-white hover:bg-[#111e4a] cursor-pointer"
                  >
                    💾 บันทึกขึ้น Cloud
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
