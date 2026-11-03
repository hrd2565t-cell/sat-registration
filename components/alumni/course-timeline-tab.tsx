"use client";

import { useState, useMemo } from "react";
import type { HistoricalTrainee } from "@/lib/alumni-store";
import {
  computeCourseTimelineData,
  type CourseTimelineItem,
  PAST_YEARS_BE,
  AFFILIATION_GROUPS,
} from "@/lib/alumni-store";

interface CourseTimelineTabProps {
  trainees: HistoricalTrainee[];
  onOpenPassport: (idCard: string) => void;
}

export function CourseTimelineTab({ trainees, onOpenPassport }: CourseTimelineTabProps) {
  const timelineData = useMemo(() => computeCourseTimelineData(trainees), [trainees]);

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchCourse, setSearchCourse] = useState<string>("");
  const [selectedCourse, setSelectedCourse] = useState<CourseTimelineItem | null>(null);
  const [viewMode, setViewMode] = useState<"timeline" | "cards">("timeline");
  const [rosterSearch, setRosterSearch] = useState<string>("");

  // Chronological years (2547 to 2569)
  const yearsAsc = useMemo(() => [...PAST_YEARS_BE].reverse(), []);

  const filteredCourses = useMemo(() => {
    return timelineData.filter((item) => {
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }
      if (searchCourse.trim()) {
        const q = searchCourse.trim().toLowerCase();
        if (!item.courseTitle.toLowerCase().includes(q) && !item.category.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [timelineData, selectedCategory, searchCourse]);

  // Overall KPI statistics
  const stats = useMemo(() => {
    const totalCourses = timelineData.length;
    const activeRecentCourses = timelineData.filter((c) => c.isActiveRecent).length;
    const maxYearsCourse = [...timelineData].sort((a, b) => b.totalYearsCount - a.totalYearsCount)[0];
    const totalTrainedAcrossCourses = timelineData.reduce((acc, c) => acc + c.totalTrainees, 0);

    return {
      totalCourses,
      activeRecentCourses,
      maxYearsCourse,
      totalTrainedAcrossCourses,
    };
  }, [timelineData]);

  const getCategoryTheme = (cat: string) => {
    switch (cat) {
      case "ผู้บริหารกีฬา":
        return {
          badge: "bg-purple-100 text-purple-900 border-purple-200",
          pill: "bg-purple-600 text-white hover:bg-purple-700",
          border: "border-purple-200",
          bgLight: "bg-purple-50/60",
        };
      case "ผู้ฝึกสอนกีฬา":
        return {
          badge: "bg-blue-100 text-blue-900 border-blue-200",
          pill: "bg-blue-600 text-white hover:bg-blue-700",
          border: "border-blue-200",
          bgLight: "bg-blue-50/60",
        };
      default:
        return {
          badge: "bg-amber-100 text-amber-900 border-amber-200",
          pill: "bg-amber-600 text-white hover:bg-amber-700",
          border: "border-amber-200",
          bgLight: "bg-amber-50/60",
        };
    }
  };

  const filteredRoster = useMemo(() => {
    if (!selectedCourse) return [];
    if (!rosterSearch.trim()) return selectedCourse.trainees;
    const q = rosterSearch.trim().toLowerCase();
    return selectedCourse.trainees.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.affiliation && t.affiliation.toLowerCase().includes(q)) ||
        (t.personnelId && t.personnelId.toLowerCase().includes(q)) ||
        String(t.yearBE).includes(q)
    );
  }, [selectedCourse, rosterSearch]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#16265E] via-[#1e3a8a] to-[#2563eb] p-6 sm:p-7 text-white shadow-md relative overflow-hidden">
        <div className="pointer-events-none absolute -right-10 -bottom-10 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute right-40 top-0 h-32 w-32 rounded-full bg-amber-400/15 blur-xl" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-[#f59e0b] px-2.5 py-0.5 text-xs font-bold text-[#1e1b4b]">
                แผนภูมิวิเคราะห์ความต่อเนื่อง
              </span>
              <span className="rounded-md bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-blue-100">
                ประวัติศาสตร์ 23 ปี (พ.ศ. 2547 – 2569)
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Timeline ความต่อเนื่องของการพัฒนาหลักสูตร กกท.
            </h2>
            <p className="text-xs sm:text-sm text-blue-100/85 max-w-2xl">
              ติดตามเส้นทางการจัดฝึกอบรมทั้ง 17 หลักสูตร เปรียบเทียบความต่อเนื่องของแต่ละปีงบประมาณ และวิเคราะห์การกระจายตัวของบุคลากร
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-black/20 p-3 rounded-2xl border border-white/10 text-xs backdrop-blur-xs shrink-0">
            <div className="text-center px-2">
              <p className="text-blue-200 text-[11px]">หลักสูตรทั้งหมด</p>
              <p className="text-lg font-black text-white">{stats.totalCourses} หลักสูตร</p>
            </div>
            <div className="text-center px-2 border-l border-white/15">
              <p className="text-blue-200 text-[11px]">จัดต่อเนื่องล่าสุด</p>
              <p className="text-lg font-black text-amber-300">{stats.activeRecentCourses} หลักสูตร</p>
            </div>
            <div className="text-center px-2 border-l border-white/15 col-span-2 sm:col-span-1">
              <p className="text-blue-200 text-[11px]">จัดต่อเนื่องยาวนานสุด</p>
              <p className="text-xs font-bold text-emerald-300 mt-1">
                {stats.maxYearsCourse?.courseTitle} ({stats.maxYearsCourse?.totalYearsCount} ปี)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`rounded-xl px-3 py-1.5 font-bold transition-all cursor-pointer ${
              selectedCategory === "all"
                ? "bg-[#16265E] text-white shadow-xs"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            ทุกสายวิชาชีพ ({timelineData.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory("ผู้บริหารกีฬา")}
            className={`rounded-xl px-3 py-1.5 font-bold transition-all cursor-pointer ${
              selectedCategory === "ผู้บริหารกีฬา"
                ? "bg-purple-700 text-white shadow-xs"
                : "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
            }`}
          >
            ผู้บริหารกีฬา ({timelineData.filter((c) => c.category === "ผู้บริหารกีฬา").length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory("ผู้ฝึกสอนกีฬา")}
            className={`rounded-xl px-3 py-1.5 font-bold transition-all cursor-pointer ${
              selectedCategory === "ผู้ฝึกสอนกีฬา"
                ? "bg-blue-700 text-white shadow-xs"
                : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
            }`}
          >
            ผู้ฝึกสอนกีฬา ({timelineData.filter((c) => c.category === "ผู้ฝึกสอนกีฬา").length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory("อื่นๆ")}
            className={`rounded-xl px-3 py-1.5 font-bold transition-all cursor-pointer ${
              selectedCategory === "อื่นๆ"
                ? "bg-amber-700 text-white shadow-xs"
                : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
            }`}
          >
            อื่นๆ ({timelineData.filter((c) => c.category === "อื่นๆ").length})
          </button>
        </div>

        {/* Search & View Switcher */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 text-xs">
              🔍
            </span>
            <input
              type="text"
              placeholder="ค้นหาชื่อหลักสูตร..."
              value={searchCourse}
              onChange={(e) => setSearchCourse(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-gray-50/70 py-1.5 pl-8 pr-3 text-xs focus:border-[#16265E] focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="flex rounded-xl bg-gray-100 p-0.5 text-xs font-semibold border border-gray-200 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("timeline")}
              className={`rounded-lg px-2.5 py-1 transition-colors cursor-pointer ${
                viewMode === "timeline" ? "bg-white text-[#16265E] shadow-2xs" : "text-gray-600 hover:text-gray-900"
              }`}
              title="มุมมองตารางไทม์ไลน์ 23 ปี"
            >
              📊 ตารางไทม์ไลน์
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`rounded-lg px-2.5 py-1 transition-colors cursor-pointer ${
                viewMode === "cards" ? "bg-white text-[#16265E] shadow-2xs" : "text-gray-600 hover:text-gray-900"
              }`}
              title="มุมมองการ์ดสรุปความต่อเนื่อง"
            >
              🗂️ การ์ดสรุป
            </button>
          </div>
        </div>
      </div>

      {/* ================= VIEW 1: 23-YEAR GANTT TIMELINE MATRIX ================= */}
      {viewMode === "timeline" ? (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
              <thead className="bg-[#16265E] text-white select-none">
                <tr>
                  <th className="py-3 px-3.5 font-bold sticky left-0 z-20 bg-[#16265E] min-w-[200px] border-r border-blue-900/50">
                    หลักสูตร / สายวิชาชีพ
                  </th>
                  <th className="py-3 px-2 text-center font-bold text-[11px] text-amber-300 w-16">
                    จำนวนปี
                  </th>
                  {yearsAsc.map((yr) => (
                    <th
                      key={yr}
                      className="py-3 px-1.5 text-center font-mono text-[10.5px] border-l border-blue-900/40 min-w-[34px]"
                      title={`ปีงบประมาณ พ.ศ. ${yr}`}
                    >
                      '{String(yr).slice(2)}
                    </th>
                  ))}
                  <th className="py-3 px-3 text-center font-bold text-emerald-300 min-w-[70px] border-l border-blue-900/50">
                    ยอดรวม
                  </th>
                  <th className="py-3 px-3 text-center font-bold min-w-[70px]">
                    เจาะลึก
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCourses.map((c) => {
                  const theme = getCategoryTheme(c.category);
                  const isSelected = selectedCourse?.courseTitle === c.courseTitle;

                  return (
                    <tr
                      key={c.courseTitle}
                      className={`transition-colors ${
                        isSelected ? "bg-blue-50/70" : "hover:bg-gray-50/80"
                      }`}
                    >
                      {/* Fixed Left Header Column */}
                      <td className="py-2.5 px-3.5 sticky left-0 z-10 bg-white group-hover:bg-gray-50 border-r border-gray-200 shadow-xs">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedCourse(c)}
                            className="font-bold text-[#16265E] hover:underline text-left cursor-pointer truncate max-w-[160px]"
                            title={c.courseTitle}
                          >
                            {c.courseTitle}
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`rounded-md px-1.5 py-0.2 text-[9.5px] font-semibold border ${theme.badge}`}
                          >
                            {c.category}
                          </span>
                          {c.isActiveRecent && (
                            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500" title="จัดต่อเนื่องในปีล่าสุด" />
                          )}
                        </div>
                      </td>

                      {/* Total Years Conducted */}
                      <td className="py-2.5 px-2 text-center font-bold text-gray-700 bg-gray-50/50">
                        <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-extrabold text-amber-900 border border-amber-200">
                          {c.totalYearsCount} ปี
                        </span>
                      </td>

                      {/* 23 Year Grid Cells */}
                      {yearsAsc.map((yr) => {
                        const count = c.traineesByYear[yr] || 0;
                        const hasYear = count > 0;

                        return (
                          <td
                            key={yr}
                            className={`py-2 px-1 text-center border-l border-gray-100 transition-colors ${
                              hasYear ? theme.bgLight : "bg-transparent"
                            }`}
                          >
                            {hasYear ? (
                              <button
                                type="button"
                                onClick={() => setSelectedCourse(c)}
                                className={`inline-flex h-6 min-w-[24px] items-center justify-center rounded-md px-1 text-[10px] font-black shadow-2xs cursor-pointer transition-transform hover:scale-110 ${theme.pill}`}
                                title={`${c.courseTitle} (พ.ศ. ${yr}): ผู้สำเร็จการอบรม ${count} คน (คลิกดูรายละเอียด)`}
                              >
                                {count}
                              </button>
                            ) : (
                              <span className="inline-block h-1 w-1 rounded-full bg-gray-200" />
                            )}
                          </td>
                        );
                      })}

                      {/* Total Trainees Column */}
                      <td className="py-2.5 px-3 text-center border-l border-gray-200 font-black text-[#16265E]">
                        {c.totalTrainees.toLocaleString()}
                      </td>

                      {/* Action Button */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedCourse(c)}
                          className="rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-[#16265E] hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
                        >
                          🔍 เจาะลึก
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-100 p-3 bg-gray-50/80 flex flex-wrap items-center justify-between text-xs text-gray-500 gap-2">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-purple-600" />
                <span>สายผู้บริหารกีฬา</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-blue-600" />
                <span>สายผู้ฝึกสอนกีฬา</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-amber-600" />
                <span>สายวิชาชีพอื่นๆ</span>
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              * ตัวเลขในแต่ละช่องหมายถึงจำนวนบุคลากรที่สำเร็จการอบรมในรุ่นปีงบประมาณนั้นๆ
            </p>
          </div>
        </div>
      ) : (
        /* ================= VIEW 2: COURSE CONTINUITY CARDS ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCourses.map((c) => {
            const theme = getCategoryTheme(c.category);

            return (
              <div
                key={c.courseTitle}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs hover:border-blue-400 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className={`rounded-md px-2 py-0.5 text-[10.5px] font-bold border ${theme.badge}`}>
                        {c.category}
                      </span>
                      <h3 className="mt-1.5 text-base font-black text-gray-900 group-hover:text-[#16265E] transition-colors">
                        {c.courseTitle}
                      </h3>
                    </div>
                    {c.isActiveRecent ? (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 shrink-0">
                        🟢 ต่อเนื่อง
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-medium text-gray-500 shrink-0">
                        ⚪ หลักสูตรเฉพาะกิจ
                      </span>
                    )}
                  </div>

                  {/* Continuity Span Details */}
                  <div className="mt-3.5 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-gray-50 p-2.5 border border-gray-100">
                      <p className="text-[10px] text-gray-400">ช่วงปีที่เปิดจัดอบรม</p>
                      <p className="font-bold text-gray-800">
                        พ.ศ. {c.firstYear} - {c.lastYear}
                      </p>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-2.5 border border-gray-100">
                      <p className="text-[10px] text-gray-400">จัดสะสมทั้งหมด</p>
                      <p className="font-bold text-[#16265E]">
                        {c.totalYearsCount} ปี ({c.totalTrainees} คน)
                      </p>
                    </div>
                  </div>

                  {/* Mini year dots indicator */}
                  <div className="mt-3.5 space-y-1">
                    <p className="text-[10px] font-semibold text-gray-400">
                      เส้นเวลาการจัดอบรม (พ.ศ. 2547 - 2569)
                    </p>
                    <div className="flex items-center gap-1 flex-wrap">
                      {yearsAsc.map((yr) => {
                        const hasYear = (c.traineesByYear[yr] || 0) > 0;
                        return (
                          <span
                            key={yr}
                            className={`h-2 rounded-xs transition-all ${
                              hasYear ? "w-3 bg-[#16265E]" : "w-1 bg-gray-200"
                            }`}
                            title={`พ.ศ. ${yr}: ${c.traineesByYear[yr] || 0} คน`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[11px] text-gray-500 font-medium">
                    ผู้ผ่านการอบรมสะสม: <strong className="text-gray-900">{c.totalTrainees}</strong> คน
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedCourse(c)}
                    className="rounded-xl bg-[#16265E] px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#1e3a8a] transition-colors cursor-pointer"
                  >
                    ดูรายละเอียด ›
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= COURSE DETAILS MODAL / DRAWER ================= */}
      {selectedCourse && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-5 backdrop-blur-xs animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedCourse(null);
          }}
        >
          <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/10 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="relative bg-gradient-to-r from-[#0d1b3e] via-[#16265E] to-[#1e3a8a] p-5 sm:p-6 text-white">
              <button
                type="button"
                onClick={() => setSelectedCourse(null)}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 transition-colors cursor-pointer"
                title="ปิด (Esc)"
              >
                ✕
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-[#f59e0b] px-2 py-0.5 text-[11px] font-bold text-[#1e1b4b]">
                  เจาะลึกความต่อเนื่องหลักสูตร
                </span>
                <span className="rounded-md bg-white/20 px-2 py-0.5 text-[11px] font-semibold text-white">
                  {selectedCourse.category}
                </span>
                {selectedCourse.isActiveRecent && (
                  <span className="rounded-md bg-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-200 border border-emerald-400/40">
                    🟢 ดำเนินการต่อเนื่องในปีล่าสุด
                  </span>
                )}
              </div>

              <h2 className="mt-2 text-2xl font-black text-white tracking-tight">
                {selectedCourse.courseTitle}
              </h2>

              <p className="mt-1 text-xs text-blue-100/80">
                เปิดจัดอบรมตั้งแต่ปี <strong>พ.ศ. {selectedCourse.firstYear}</strong> ถึงปี <strong>พ.ศ. {selectedCourse.lastYear}</strong> (จัดไปแล้วทั้งหมด {selectedCourse.totalYearsCount} ปีงบประมาณ)
              </p>

              {/* 3 Metric Pills Header */}
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs bg-black/25 p-2.5 rounded-xl border border-white/10">
                <div>
                  <p className="text-white/60 text-[11px]">ผู้ผ่านการอบรมสะสม</p>
                  <p className="text-lg font-black text-[#facc15]">{selectedCourse.totalTrainees} คน</p>
                </div>
                <div className="border-x border-white/10">
                  <p className="text-white/60 text-[11px]">ปีที่เปิดสอน</p>
                  <p className="text-lg font-black text-white">{selectedCourse.totalYearsCount} ปี</p>
                </div>
                <div>
                  <p className="text-white/60 text-[11px]">ปีแรกที่เปิดจัด</p>
                  <p className="text-lg font-black text-emerald-300">พ.ศ. {selectedCourse.firstYear}</p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* 1. Affiliation Group Breakdown */}
              <div className="space-y-3">
                <h4 className="font-bold text-[#16265E] text-sm flex items-center gap-1.5">
                  <span>🏛️</span>
                  <span>สัดส่วนผู้เข้ารับการอบรมจำแนกตาม 4 กลุ่มหน่วยงาน</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {AFFILIATION_GROUPS.map((g) => {
                    const count = selectedCourse.byGroup[g] || 0;
                    const percent = selectedCourse.totalTrainees > 0 ? Math.round((count / selectedCourse.totalTrainees) * 100) : 0;

                    return (
                      <div
                        key={g}
                        className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-gray-800">{g}</span>
                          <span className="font-mono font-bold text-[#16265E]">
                            {count} คน ({percent}%)
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#16265E] to-[#2563eb] rounded-full"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Annual Breakdown */}
              <div className="space-y-3">
                <h4 className="font-bold text-[#16265E] text-sm flex items-center gap-1.5">
                  <span>📅</span>
                  <span>ประวัติจำนวนผู้ผ่านการอบรมในแต่ละปีงบประมาณ</span>
                </h4>

                <div className="flex flex-wrap items-center gap-2">
                  {selectedCourse.years.map((yr) => (
                    <div
                      key={yr}
                      className="rounded-xl border border-blue-200 bg-blue-50/60 px-3 py-1.5 text-center shadow-2xs"
                    >
                      <p className="text-[10px] text-gray-500 font-semibold">พ.ศ. {yr}</p>
                      <p className="text-xs font-black text-[#16265E]">
                        {selectedCourse.traineesByYear[yr]} คน
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Trainees Roster List */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-[#16265E] text-sm flex items-center gap-1.5">
                      <span>👥</span>
                      <span>รายชื่อผู้สำเร็จการอบรมหลักสูตรนี้ ({selectedCourse.trainees.length} คน)</span>
                    </h4>
                    <p className="text-[11px] text-gray-500">
                      คลิกปุ่มพาสปอร์ตเพื่อดูประวัติการอบรมและผลงานการปฏิบัติหน้าที่รายบุคคล
                    </p>
                  </div>

                  <input
                    type="text"
                    placeholder="ค้นหาชื่อ, สังกัด, หรือปี..."
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                    className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:border-[#16265E] focus:outline-hidden w-full sm:w-56"
                  />
                </div>

                <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100 bg-white">
                  {filteredRoster.length === 0 ? (
                    <div className="py-8 text-center text-gray-400 text-xs">
                      ไม่พบรายชื่อที่ตรงกับคำค้นหา
                    </div>
                  ) : (
                    filteredRoster.map((t, idx) => (
                      <div
                        key={t.id || idx}
                        className="flex items-center justify-between gap-3 p-3 hover:bg-blue-50/50 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 truncate">{t.name}</p>
                          <p className="text-[11px] text-gray-500 truncate">
                            {t.affiliation} {t.affiliationGroup ? `(${t.affiliationGroup})` : ""}
                          </p>
                          <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                            {t.personnelId ? `รหัส ${t.personnelId} · ` : ""}รุ่นปี พ.ศ. {t.yearBE}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCourse(null);
                            onOpenPassport(t.personnelId || t.idCard);
                          }}
                          className="shrink-0 rounded-lg bg-[#16265E] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#1e3a8a] transition-colors cursor-pointer"
                        >
                          🪪 พาสปอร์ต
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCourse(null)}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
