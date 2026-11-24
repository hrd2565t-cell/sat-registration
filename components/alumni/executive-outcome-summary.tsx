"use client";

import { useMemo, useState } from "react";
import type { EvaluationStats, HistoricalTrainee } from "@/lib/alumni-store";
import { useCourses } from "@/lib/courses-store";
import { sortCoursesChronologically } from "@/lib/courses";

interface ExecutiveOutcomeSummaryProps {
  trainees: HistoricalTrainee[];
  stats: EvaluationStats;
  nationalSummary: {
    participatedCount: number;
    totalMaster: number;
    coveragePercent: number;
  };
  provincialSummary: {
    participatedCount: number;
    totalMaster: number;
    coveragePercent: number;
  };
  onOpenBriefing: () => void;
  onJumpToCoverage: () => void;
  onJumpToKirkpatrick: () => void;
}

export function ExecutiveOutcomeSummary({
  stats,
  nationalSummary,
  provincialSummary,
  onOpenBriefing,
  onJumpToCoverage,
  onJumpToKirkpatrick,
}: ExecutiveOutcomeSummaryProps) {
  const { courses } = useCourses();
  const activeCourses = useMemo(
    () => sortCoursesChronologically(courses.filter((c) => !c.isHistorical)),
    [courses]
  );

  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);

  const selectedCourse = useMemo(() => {
    if (activeCourses.length === 0) return null;
    if (selectedCourseId !== null) {
      const found = activeCourses.find((c) => c.id === selectedCourseId);
      if (found) return found;
    }
    return activeCourses[0];
  }, [activeCourses, selectedCourseId]);

  const topDimensions = useMemo(() => stats.dimensionBreakdown.slice(0, 3), [stats.dimensionBreakdown]);
  const sampleHighlights = useMemo(
    () => stats.qualitativeHighlights.slice(0, 2),
    [stats.qualitativeHighlights]
  );
  const avgCoursesPerPerson =
    stats.uniquePersonnelCount > 0
      ? (stats.totalTrainees / stats.uniquePersonnelCount).toFixed(2)
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
              Output → Outcome → Impact
            </span>
          </div>
          <h3 className="mt-2 text-lg sm:text-xl font-black text-[#16265E]">
            🎯 &ldquo;อบรมแล้วได้อะไร?&rdquo; — สรุปผลสัมฤทธิ์ 3 มิติหลักของ กกท.
          </h3>
          <p className="text-xs text-gray-600 mt-0.5">
            เชื่อมโยงหลักสูตรที่เปิดสอน (ปีงบฯ 2570) กับผลการนำความรู้ไปปฏิบัติหน้าที่จริงและฐานบุคลากรกีฬาแห่งชาติ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onJumpToCoverage}
            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-white px-3.5 py-2 text-xs font-bold text-[#16265E] shadow-2xs hover:bg-blue-50 transition-colors cursor-pointer"
          >
            <span>🏛️</span>
            <span>ดูความครอบคลุมสมาคม ↓</span>
          </button>
          <button
            type="button"
            onClick={onOpenBriefing}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#16265E] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#111e4a] transition-colors cursor-pointer"
          >
            <span>📑</span>
            <span>พิมพ์สรุปผู้บริหาร (A4)</span>
          </button>
        </div>
      </div>

      {/* 3 Pillars Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pillar 1: Output & Competency (Active Courses FY 2570) */}
        <div className="rounded-2xl border border-blue-200 bg-white p-4 sm:p-5 flex flex-col justify-between shadow-2xs space-y-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-[#16265E] border border-blue-100">
                <span>1️⃣</span>
                <span>สมรรถนะตามหลักสูตร (Output)</span>
              </span>
              <span className="text-[11px] font-semibold text-blue-700">
                {activeCourses.length} หลักสูตร ปีงบฯ 2570
              </span>
            </div>

            {activeCourses.length > 0 && selectedCourse ? (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {activeCourses.map((c, idx) => {
                    const active = c.id === selectedCourse.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCourseId(c.id)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer border ${
                          active
                            ? "bg-[#16265E] text-white border-[#16265E]"
                            : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-blue-50"
                        }`}
                        title={c.title}
                      >
                        หลักสูตร {idx + 1}
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-xl border border-blue-100 bg-blue-50/35 p-3 space-y-2">
                  <p className="text-xs font-bold text-[#16265E] leading-snug">
                    {selectedCourse.title}
                  </p>
                  {selectedCourse.courseObjective && (
                    <div className="text-[11px] text-gray-700 leading-relaxed">
                      <span className="font-bold text-blue-900">สิ่งที่ผู้เรียนจะได้รับ: </span>
                      {selectedCourse.courseObjective}
                    </div>
                  )}
                  {Array.isArray(selectedCourse.evaluationCriteria) &&
                    selectedCourse.evaluationCriteria.length > 0 && (
                      <div className="pt-1.5 border-t border-blue-100/80 space-y-1">
                        <p className="text-[10.5px] font-bold text-gray-700">
                          เกณฑ์วัดผลการผ่านการอบรม:
                        </p>
                        <ul className="space-y-0.5 text-[10.5px] text-gray-600 list-disc list-inside">
                          {selectedCourse.evaluationCriteria.slice(0, 3).map((item, i) => (
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
            )}
          </div>

          <p className="text-[10.5px] text-gray-400 pt-1 border-t border-gray-100">
            แหล่งข้อมูล: โครงสร้างหลักสูตรปัจจุบัน (ซิงก์ตรงจากเมนูจัดการหลักสูตร)
          </p>
        </div>

        {/* Pillar 2: Outcome (Kirkpatrick Level 3 Applied Knowledge) */}
        <div className="rounded-2xl border border-emerald-200 bg-white p-4 sm:p-5 flex flex-col justify-between shadow-2xs space-y-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-900 border border-emerald-100">
                <span>2️⃣</span>
                <span>การนำไปใช้จริง (Kirkpatrick L3)</span>
              </span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                ⭐ {stats.averageImpactRating} / 5.0
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl bg-emerald-50/70 border border-emerald-100 p-2.5">
                <p className="text-[10.5px] font-semibold text-emerald-800">ปฏิบัติงานต่อเนื่อง</p>
                <p className="text-xl font-black text-emerald-700 mt-0.5">
                  {stats.activeRatePercent}%
                </p>
              </div>
              <div className="rounded-xl bg-amber-50/70 border border-amber-100 p-2.5">
                <p className="text-[10.5px] font-semibold text-amber-900">ลงสนามปฏิบัติหน้าที่</p>
                <p className="text-xl font-black text-amber-800 mt-0.5">
                  {stats.totalDutiesReported.toLocaleString()}{" "}
                  <span className="text-[11px] font-medium">ครั้ง</span>
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-gray-700">
                มิติองค์ความรู้ที่ศิษย์เก่านำไปใช้สูงสุด:
              </p>
              {topDimensions.map((dim) => (
                <div
                  key={dim.key}
                  className="flex items-center justify-between text-[11px] rounded-lg bg-gray-50 px-2.5 py-1.5 border border-gray-100"
                >
                  <span className="text-gray-800 truncate pr-2">
                    {dim.icon} {dim.label.split(" (")[0]}
                  </span>
                  <span className="font-mono font-bold text-[#16265E] shrink-0">
                    {dim.percent}%
                  </span>
                </div>
              ))}
            </div>

            {sampleHighlights.length > 0 && (
              <div className="rounded-xl bg-emerald-50/40 border border-emerald-100 p-2.5 space-y-1">
                <p className="text-[10.5px] font-bold text-emerald-900">ตัวอย่างเสียงสะท้อนจริง:</p>
                <p className="text-[11px] italic text-gray-700 line-clamp-2">
                  &ldquo;{sampleHighlights[0].text}&rdquo;
                </p>
                <p className="text-[10px] text-gray-500">
                  — {sampleHighlights[0].traineeName} ({sampleHighlights[0].courseTitle})
                </p>
              </div>
            )}
          </div>

          <div className="pt-1 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[10.5px] text-gray-400">
              จากคำตอบจริง {stats.qualitativeHighlights.length} รายการ
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
                <span>การขยายฐานบุคลากรชาติ (Impact)</span>
              </span>
            </div>

            <div className="rounded-xl border border-purple-100 bg-purple-50/35 p-3 space-y-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] font-bold text-purple-900">
                  บุคลากรเดี่ยวที่พัฒนาแล้ว
                </span>
                <span className="text-lg font-black text-[#16265E]">
                  {stats.uniquePersonnelCount.toLocaleString()} คน
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-600">
                <span>จำนวนการอบรมสะสมทั้งหมด</span>
                <span className="font-semibold">
                  {stats.totalTrainees.toLocaleString()} คน-ครั้ง (เฉลี่ย {avgCoursesPerPerson} หลักสูตร/คน)
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-2.5 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-800">สมาคมกีฬาแห่งประเทศไทย</span>
                  <span className="font-mono font-bold text-[#16265E]">
                    {nationalSummary.participatedCount} / {nationalSummary.totalMaster} ({nationalSummary.coveragePercent}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full bg-[#16265E] rounded-full"
                    style={{ width: `${Math.min(100, nationalSummary.coveragePercent)}%` }}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-2.5 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-800">สมาคมกีฬาแห่งจังหวัด</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {provincialSummary.participatedCount} / {provincialSummary.totalMaster} ({provincialSummary.coveragePercent}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full"
                    style={{ width: `${Math.min(100, provincialSummary.coveragePercent)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <p className="text-[10.5px] text-gray-400 pt-1 border-t border-gray-100">
            หมายเหตุ: การวิเคราะห์ต้นทุนงบประมาณต่อคน ดูเพิ่มเติมได้ที่ระบบผู้ดูแลระบบ (Admin)
          </p>
        </div>
      </div>
    </section>
  );
}
