"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { type Course, getCourseFiscalYear } from "@/lib/courses";
import type { ApplicantRecord } from "@/lib/applications-store";
import { updateCourse } from "@/lib/courses-store";
import { CourseEditDialog } from "@/components/admin/course-edit-dialog";
import { HistoricalCourseDialog } from "@/components/admin/historical-course-dialog";

interface BudgetAnalyticsTabProps {
  courses: Course[];
  applications: ApplicantRecord[];
}

export function BudgetAnalyticsTab({ courses, applications }: BudgetAnalyticsTabProps) {
  // ตัวกรองช่วงปีงบประมาณ: "all" (ทุกปี) | "single" (ปีเดียว) | "range" (ช่วงปี เช่น 2568-2570)
  const [yearFilterMode, setYearFilterMode] = useState<"all" | "single" | "range">("all");
  const [selectedSingleYear, setSelectedSingleYear] = useState<string>("2570");
  const [rangeStartYear, setRangeStartYear] = useState<string>("2568");
  const [rangeEndYear, setRangeEndYear] = useState<string>("2570");

  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingHistoricalCourse, setEditingHistoricalCourse] = useState<Course | null>(null);
  const [isHistoricalDialogOpen, setIsHistoricalDialogOpen] = useState(false);
  const [inlineBudgets, setInlineBudgets] = useState<Record<number, string>>(() => {
    const map: Record<number, string> = {};
    courses.forEach((c) => {
      map[c.id] = c.budget !== undefined ? String(c.budget) : "";
    });
    return map;
  });
  const [savedNotices, setSavedNotices] = useState<Record<number, boolean>>({});
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // คำนวณรายชื่อปีงบประมาณที่มีทั้งหมดในระบบ (เรียงจากปีล่าสุดไปอดีต)
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    courses.forEach((c) => {
      yearsSet.add(getCourseFiscalYear(c));
    });
    // ให้มั่นใจว่ามี 2570, 2569, 2568, 2567 เป็นตัวเลือกพื้นฐาน
    yearsSet.add("2570");
    yearsSet.add("2569");
    yearsSet.add("2568");
    yearsSet.add("2567");
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [courses]);

  const isYearIncluded = (yr: string) => {
    if (yearFilterMode === "all") return true;
    if (yearFilterMode === "single") return yr === selectedSingleYear;
    if (yearFilterMode === "range") {
      const num = Number(yr);
      const min = Math.min(Number(rangeStartYear), Number(rangeEndYear));
      const max = Math.max(Number(rangeStartYear), Number(rangeEndYear));
      return num >= min && num <= max;
    }
    return true;
  };

  const yearFilterLabel = useMemo(() => {
    if (yearFilterMode === "all") return "ทุกปีงบประมาณ";
    if (yearFilterMode === "single") return `ปีงบประมาณ พ.ศ. ${selectedSingleYear}`;
    const min = Math.min(Number(rangeStartYear), Number(rangeEndYear));
    const max = Math.max(Number(rangeStartYear), Number(rangeEndYear));
    if (min === max) return `ปีงบประมาณ พ.ศ. ${min}`;
    return `ช่วงปีงบประมาณ พ.ศ. ${min} – ${max}`;
  }, [yearFilterMode, selectedSingleYear, rangeStartYear, rangeEndYear]);

  // สรุปสถิติเปรียบเทียบเชิงแนวโน้มข้ามปีงบประมาณ (Year-over-Year Trend Analysis)
  const yoySummary = useMemo(() => {
    return availableYears.map((yr) => {
      const yrCourses = courses.filter((c) => getCourseFiscalYear(c) === yr);
      let yrBudget = 0;
      let yrCapacity = 0;
      let yrTrainees = 0;
      let yrApplicants = 0;

      yrCourses.forEach((c) => {
        const bVal = c.budget !== undefined ? c.budget : (Number(inlineBudgets[c.id]) || 0);
        yrBudget += bVal;
        yrCapacity += c.capacity || 40;

        if (c.isHistorical) {
          yrTrainees += c.historicalCompleted ?? c.capacity ?? 40;
          yrApplicants += c.historicalApplicants ?? c.capacity ?? 40;
        } else {
          const courseApps = applications.filter((a) => a.courseId === c.id && a.status !== "rejected");
          const approved = courseApps.filter((a) => a.status === "approved").length;
          yrTrainees += approved > 0 ? approved : c.capacity;
          yrApplicants += courseApps.length;
        }
      });

      const avgCostPerTrainee = yrTrainees > 0 && yrBudget > 0 ? Math.round(yrBudget / yrTrainees) : 0;

      return {
        year: yr,
        courseCount: yrCourses.length,
        budget: yrBudget,
        capacity: yrCapacity,
        trainees: yrTrainees,
        applicants: yrApplicants,
        avgCostPerTrainee,
      };
    });
  }, [availableYears, courses, applications, inlineBudgets]);

  // คำนวณสถิติภาพรวมงบประมาณตามปีที่เลือก (หรือช่วงปี)
  const stats = useMemo(() => {
    const filtered = courses.filter((c) => isYearIncluded(getCourseFiscalYear(c)));

    let totalBudget = 0;
    let coursesWithBudgetCount = 0;
    let totalCapacity = 0;
    let totalApproved = 0;
    let totalApplicants = 0;

    // ยอดจัดสรรงบประมาณแยกตาม 5 กลุ่มเป้าหมาย กกท. (บาท)
    const targetGroupInvestments = {
      sat: 0,
      nsdf: 0,
      nationalAssoc: 0,
      provincialAssoc: 0,
      external: 0,
    };

    const courseMetrics = filtered.map((course) => {
      const cap = course.capacity || 40;
      const budgetVal = course.budget !== undefined ? course.budget : (Number(inlineBudgets[course.id]) || 0);

      let approvedCount = 0;
      let applicantCount = 0;

      if (course.isHistorical) {
        approvedCount = course.historicalCompleted ?? cap;
        applicantCount = course.historicalApplicants ?? cap;
      } else {
        const courseApps = applications.filter((a) => a.courseId === course.id && a.status !== "rejected");
        const approvedApps = courseApps.filter((a) => a.status === "approved");
        approvedCount = approvedApps.length;
        applicantCount = courseApps.length;
      }

      if (budgetVal > 0) {
        totalBudget += budgetVal;
        coursesWithBudgetCount++;
      }
      totalCapacity += cap;
      totalApproved += approvedCount;
      totalApplicants += applicantCount;

      // ต้นทุนต่อหัว: หากมีผู้อนุมัติตัวจริงแล้วคิดจากตัวจริง หากยังไม่มีคิดจากความจุเป้าหมาย
      const effectiveHeads = approvedCount > 0 ? approvedCount : cap;
      const costPerHead = budgetVal > 0 && effectiveHeads > 0 ? Math.round(budgetVal / effectiveHeads) : 0;
      const costPerApplicant = budgetVal > 0 && applicantCount > 0 ? Math.round(budgetVal / applicantCount) : 0;

      // จัดสรรงบสู่ 5 กลุ่มเป้าหมายตามสัดส่วนโควตาของหลักสูตรนี้
      const quotas = course.targetQuotas || { sat: 5, nationalAssoc: 15, provincialAssoc: 15, nsdf: 0, external: 5 };
      const quotaSum = (quotas.sat || 0) + (quotas.nsdf || 0) + (quotas.nationalAssoc || 0) + (quotas.provincialAssoc || 0) + (quotas.external || 0) || cap;
      
      if (budgetVal > 0 && quotaSum > 0) {
        targetGroupInvestments.sat += (budgetVal * (quotas.sat || 0)) / quotaSum;
        targetGroupInvestments.nsdf += (budgetVal * (quotas.nsdf || 0)) / quotaSum;
        targetGroupInvestments.nationalAssoc += (budgetVal * (quotas.nationalAssoc || 0)) / quotaSum;
        targetGroupInvestments.provincialAssoc += (budgetVal * (quotas.provincialAssoc || 0)) / quotaSum;
        targetGroupInvestments.external += (budgetVal * (quotas.external || 0)) / quotaSum;
      }

      return {
        ...course,
        fiscalYear: getCourseFiscalYear(course),
        applicantCount,
        approvedCount,
        budgetVal,
        costPerHead,
        costPerApplicant,
      };
    });

    const averageCostPerTrainee = totalApproved > 0 && totalBudget > 0
      ? Math.round(totalBudget / totalApproved)
      : totalCapacity > 0 && totalBudget > 0
      ? Math.round(totalBudget / totalCapacity)
      : 0;

    const averageCostPerApplicant = totalApplicants > 0 && totalBudget > 0
      ? Math.round(totalBudget / totalApplicants)
      : 0;

    return {
      filteredCourses: filtered,
      totalBudget,
      coursesWithBudgetCount,
      totalCapacity,
      totalApproved,
      totalApplicants,
      averageCostPerTrainee,
      averageCostPerApplicant,
      courseMetrics,
      targetGroupInvestments,
    };
  }, [courses, applications, inlineBudgets, yearFilterMode, selectedSingleYear, rangeStartYear, rangeEndYear]);

  // จัดการบันทึกงบประมาณแบบรวดเร็วผ่านตาราง (Quick Inline Edit)
  const handleInlineBudgetChange = (courseId: number, val: string) => {
    setInlineBudgets((prev) => ({ ...prev, [courseId]: val }));
  };

  const handleSaveInlineBudget = (courseId: number) => {
    const raw = inlineBudgets[courseId];
    const num = raw.trim() ? Number(raw.replace(/,/g, "")) : undefined;
    updateCourse(courseId, { budget: num });
    setSavedNotices((prev) => ({ ...prev, [courseId]: true }));
    setTimeout(() => {
      setSavedNotices((prev) => ({ ...prev, [courseId]: false }));
    }, 3000);
  };

  // ส่งออกข้อมูลเป็นไฟล์ Excel (CSV)
  const handleExportCsv = () => {
    const headers = [
      "ปีงบประมาณ",
      "สถานะข้อมูล",
      "รหัสหลักสูตร",
      "ชื่อหลักสูตร",
      "จังหวัดที่จัด",
      "กำหนดการจัดอบรม",
      "ความจุเป้าหมาย (คน)",
      "ผู้สมัคร (คน)",
      "ผู้ผ่านการอบรม/ตัวจริง (คน)",
      "งบประมาณจัดสรร (บาท)",
      "ต้นทุนเฉลี่ยต่อผู้ผ่านการอบรม (บาท/คน)",
      "ต้นทุนเฉลี่ยต่อผู้สมัคร (บาท/คน)",
    ];

    const rows = stats.courseMetrics.map((m) => [
      `"${m.fiscalYear}"`,
      `"${m.isHistorical ? "ข้อมูลประวัติย้อนหลัง" : "หลักสูตรปัจจุบัน"}"`,
      `#${m.id}`,
      `"${m.title.replace(/"/g, '""')}"`,
      `"${(m.province || "-").replace(/"/g, '""')}"`,
      `"${(m.date || "-").replace(/"/g, '""')}"`,
      m.capacity,
      m.applicantCount,
      m.approvedCount,
      m.budgetVal,
      m.costPerHead,
      m.costPerApplicant,
    ]);

    // บรรทัดสรุปผลรวม
    rows.push([
      `"รวม ${yearFilterLabel}"`,
      "-",
      "-",
      `"รวม ${stats.filteredCourses.length} หลักสูตร"`,
      "-",
      "-",
      stats.totalCapacity,
      stats.totalApplicants,
      stats.totalApproved,
      stats.totalBudget,
      stats.averageCostPerTrainee,
      stats.averageCostPerApplicant,
    ]);

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const cleanLabel = yearFilterLabel.replace(/[^0-9a-zA-Zก-๙]/g, "_");
    link.setAttribute("download", `SAT_Budget_Analytics_${cleanLabel}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const printedDateThai = useMemo(() => {
    const now = new Date();
    const monthsThai = [
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
      "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
    ];
    return `${now.getDate()} ${monthsThai[now.getMonth()]} พ.ศ. ${now.getFullYear() + 543}`;
  }, []);

  return (
    <div className="space-y-4">
      {/* Top Action Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-[#16265E] sm:text-lg flex items-center gap-2">
            <span>💰</span>
            <span>วิเคราะห์ความคุ้มค่าของงบประมาณ (Budget Value & Multi-Year ROI Analytics)</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            เปรียบเทียบแนวโน้มต้นทุนต่อหัว (Cost per Trainee) ประสิทธิภาพการใช้งบประมาณรายปี และสัดส่วนการลงทุนบุคลากรกีฬา กกท.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditingHistoricalCourse(null);
              setIsHistoricalDialogOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-300 bg-blue-50 px-3.5 py-2 text-xs font-bold text-[#16265E] shadow-2xs hover:bg-blue-100 transition active:scale-95 cursor-pointer"
          >
            <span>➕</span>
            <span>บันทึกหลักสูตรย้อนหลัง</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-900 shadow-2xs hover:bg-emerald-100 transition active:scale-95 cursor-pointer"
          >
            <span>📥</span>
            <span>ส่งออก Excel (CSV)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPrintModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#16265E] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#111e4a] transition active:scale-95 cursor-pointer"
          >
            <span>🖨️</span>
            <span>พิมพ์รายงานเสนอผู้บริหาร (PDF)</span>
          </button>
        </div>
      </div>

      {/* Year Range Filter Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-[#16265E] font-bold text-sm">
              📅
            </span>
            <div>
              <span className="text-xs font-bold text-gray-800">ตัวกรองช่วงปีงบประมาณ</span>
              <p className="text-[11px] text-gray-500">เลือกดูรายปีเดี่ยว หรือกำหนดช่วงปีย้อนหลังเพื่อวิเคราะห์เปรียบเทียบภาพรวม</p>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setYearFilterMode("all")}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                yearFilterMode === "all"
                  ? "bg-white text-[#16265E] shadow-2xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              ทั้งหมด (ทุกปี)
            </button>

            <button
              type="button"
              onClick={() => {
                setYearFilterMode("single");
                setSelectedSingleYear("2570");
              }}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                yearFilterMode === "single" && selectedSingleYear === "2570"
                  ? "bg-white text-[#16265E] shadow-2xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              ⭐️ ปี 2570 (ล่าสุด)
            </button>

            <button
              type="button"
              onClick={() => {
                setYearFilterMode("single");
                setSelectedSingleYear("2569");
              }}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                yearFilterMode === "single" && selectedSingleYear === "2569"
                  ? "bg-white text-[#16265E] shadow-2xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              ปี 2569
            </button>

            <button
              type="button"
              onClick={() => {
                setYearFilterMode("range");
                setRangeStartYear("2568");
                setRangeEndYear("2570");
              }}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                yearFilterMode === "range" && rangeStartYear === "2568" && rangeEndYear === "2570"
                  ? "bg-white text-[#16265E] shadow-2xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              3 ปีย้อนหลัง (2568–2570)
            </button>

            <button
              type="button"
              onClick={() => {
                setYearFilterMode("range");
                setRangeStartYear("2567");
                setRangeEndYear("2570");
              }}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                yearFilterMode === "range" && rangeStartYear === "2567" && rangeEndYear === "2570"
                  ? "bg-white text-[#16265E] shadow-2xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              ย้อนหลังถึง 2567
            </button>
          </div>
        </div>

        {/* Interactive Year & Range Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-3">
            {/* Single Year Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-gray-500">เลือกปีเดี่ยว:</span>
              {availableYears.map((yr) => {
                const countInYear = courses.filter((c) => getCourseFiscalYear(c) === yr).length;
                const isSelected = yearFilterMode === "single" && selectedSingleYear === yr;
                return (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => {
                      setYearFilterMode("single");
                      setSelectedSingleYear(yr);
                    }}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? "bg-[#16265E] text-white shadow-xs"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <span>ปี {yr}</span>
                    <span className={`text-[10px] px-1 rounded-full ${isSelected ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600"}`}>
                      {countInYear}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom Range Dropdowns */}
            <div className="flex items-center gap-2 rounded-xl bg-blue-50/70 border border-blue-200/80 px-3 py-1 text-xs">
              <span className="font-bold text-[#16265E] flex items-center gap-1">
                <span>🗓️</span>
                <span>กำหนดช่วงปี:</span>
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-600 text-[11px]">ตั้งแต่ปี</span>
                <select
                  value={rangeStartYear}
                  onChange={(e) => {
                    setRangeStartYear(e.target.value);
                    setYearFilterMode("range");
                  }}
                  className="rounded-md border border-gray-300 bg-white px-2 py-0.5 text-xs font-bold text-[#16265E] focus:outline-hidden focus:ring-1 focus:ring-[#16265E]"
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y}>พ.ศ. {y}</option>
                  ))}
                </select>
                <span className="text-gray-400 font-bold">➔</span>
                <span className="text-gray-600 text-[11px]">ถึงปี</span>
                <select
                  value={rangeEndYear}
                  onChange={(e) => {
                    setRangeEndYear(e.target.value);
                    setYearFilterMode("range");
                  }}
                  className="rounded-md border border-gray-300 bg-white px-2 py-0.5 text-xs font-bold text-[#16265E] focus:outline-hidden focus:ring-1 focus:ring-[#16265E]"
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y}>พ.ศ. {y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Current Active Filter Indicator */}
          <div className="text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>แสดงผล: <strong className="text-[#16265E]">{yearFilterLabel}</strong> ({stats.filteredCourses.length} หลักสูตร)</span>
          </div>
        </div>
      </div>

      {/* Strategic KPI Metric Cards (4 Cards) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Budget */}
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/80 to-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900 uppercase">งบประมาณจัดสรรรวม</span>
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
              {stats.coursesWithBudgetCount}/{stats.filteredCourses.length} หลักสูตร
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-[#16265E]">
            ฿{stats.totalBudget.toLocaleString("th-TH")}
          </p>
          <p className="mt-1 text-[11px] text-gray-600">
            เฉลี่ย <strong>฿{stats.filteredCourses.length > 0 ? Math.round(stats.totalBudget / stats.filteredCourses.length).toLocaleString("th-TH") : 0}</strong> ต่อหลักสูตร
          </p>
        </div>

        {/* Card 2: Cost per Approved Trainee */}
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 uppercase">ต้นทุนต่อผู้ผ่านการอบรม</span>
            <span className="text-lg">🎯</span>
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-900">
            ฿{stats.averageCostPerTrainee.toLocaleString("th-TH")}
            <span className="text-xs font-normal text-emerald-700"> /คน</span>
          </p>
          <p className="mt-1 text-[11px] text-gray-600">
            คำนวณจากผู้ผ่านการอบรมจริง <strong>{stats.totalApproved.toLocaleString()}</strong> คน (เป้าหมาย {stats.totalCapacity.toLocaleString()} ที่นั่ง)
          </p>
        </div>

        {/* Card 3: Cost per Applicant */}
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/80 to-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 uppercase">ต้นทุนต่อผู้สมัครรับการอบรม</span>
            <span className="text-lg">👥</span>
          </div>
          <p className="mt-2 text-2xl font-black text-amber-900">
            ฿{stats.averageCostPerApplicant.toLocaleString("th-TH")}
            <span className="text-xs font-normal text-amber-700"> /คน</span>
          </p>
          <p className="mt-1 text-[11px] text-gray-600">
            คำนวณจากผู้ยื่นสมัครทั้งหมด <strong>{stats.totalApplicants.toLocaleString()}</strong> คน
          </p>
        </div>

        {/* Card 4: Top Target Group Investment */}
        <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50/80 to-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-900 uppercase">สมาคมกีฬา (เป้าหมายหลัก)</span>
            <span className="text-lg">🏅</span>
          </div>
          <p className="mt-2 text-2xl font-black text-purple-900">
            ฿{Math.round(stats.targetGroupInvestments.nationalAssoc + stats.targetGroupInvestments.provincialAssoc).toLocaleString("th-TH")}
          </p>
          <p className="mt-1 text-[11px] text-gray-600">
            สัดส่วน <strong>{stats.totalBudget > 0 ? Math.round(((stats.targetGroupInvestments.nationalAssoc + stats.targetGroupInvestments.provincialAssoc) / stats.totalBudget) * 100) : 0}%</strong> ของงบรวมทั้งหมด
          </p>
        </div>
      </div>

      {/* Multi-Year Trend YoY Comparison Table (แสดงเมื่อเลือก "ทุกปีงบประมาณ" หรือเพื่อเปรียบเทียบ) */}
      {(yearFilterMode === "all" || yearFilterMode === "range") && (
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-b from-blue-50/40 to-white p-4 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-100 pb-2.5">
            <h3 className="text-sm font-bold text-[#16265E] flex items-center gap-2">
              <span>📈</span>
              <span>ตารางเปรียบเทียบเชิงแนวโน้มข้ามปีงบประมาณ (Multi-Year Fiscal Benchmarking)</span>
            </h3>
            <span className="text-xs text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-full font-medium">
              สถิติย้อนหลัง {yoySummary.length} ปีงบประมาณ
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-blue-50/70 text-gray-700">
                <tr>
                  <th className="py-2.5 px-3 font-bold">ปีงบประมาณ</th>
                  <th className="py-2.5 px-3 font-bold text-center">จำนวนหลักสูตร</th>
                  <th className="py-2.5 px-3 font-bold text-right">งบประมาณจัดสรรรวม (บาท)</th>
                  <th className="py-2.5 px-3 font-bold text-center">ผู้ผ่านการอบรมจริง (คน)</th>
                  <th className="py-2.5 px-3 font-bold text-right">ต้นทุนเฉลี่ยต่อหัว (บาท/คน)</th>
                  <th className="py-2.5 px-3 font-bold text-center">สัดส่วนงบทั้งหมด</th>
                  <th className="py-2.5 px-3 font-bold text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {yoySummary.map((item) => {
                  const pct = stats.totalBudget > 0 ? ((item.budget / stats.totalBudget) * 100).toFixed(1) : "0.0";
                  const isCur = item.year === "2570";
                  return (
                    <tr key={item.year} className="hover:bg-blue-50/30 transition">
                      <td className="py-2.5 px-3 font-bold text-[#16265E] flex items-center gap-1.5">
                        {isCur ? "⭐️ " : "📅 "}
                        <span>ปี {item.year}</span>
                        {isCur && <span className="text-[10px] bg-green-100 text-green-800 px-1.5 py-0.2 rounded font-normal">ปัจจุบัน</span>}
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold text-gray-800">{item.courseCount} หลักสูตร</td>
                      <td className="py-2.5 px-3 text-right font-bold text-[#16265E]">฿{item.budget.toLocaleString("th-TH")}</td>
                      <td className="py-2.5 px-3 text-center font-semibold text-green-700">{item.trainees} คน</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-800">฿{item.avgCostPerTrainee.toLocaleString("th-TH")}</td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="w-16 bg-gray-200 h-2 rounded-full overflow-hidden">
                            <div className="bg-[#16265E] h-full rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="font-semibold text-gray-700 text-[11px]">{pct}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setYearFilterMode("single");
                            setSelectedSingleYear(item.year);
                          }}
                          className="text-[11px] font-bold text-[#16265E] hover:underline cursor-pointer"
                        >
                          กรองดูปีนี้ →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Target Group Investment Allocation Card (5 Groups) */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span>🏛️</span>
            <span>การกระจายงบประมาณสู่ 5 กลุ่มเป้าหมาย กกท. ({yearFilterLabel})</span>
          </span>
          <span className="text-[11px] font-normal text-gray-500">
            คำนวณตามสัดส่วนโควตาการพัฒนาบุคลากร
          </span>
        </h3>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-5">
          {/* 1. SAT */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
            <span className="text-[11px] font-semibold text-blue-900 block truncate">การกีฬาแห่งประเทศไทย</span>
            <p className="mt-1 text-base font-bold text-[#16265E]">
              ฿{Math.round(stats.targetGroupInvestments.sat).toLocaleString("th-TH")}
            </p>
            <span className="text-[10px] text-gray-500">
              {stats.totalBudget > 0 ? Math.round((stats.targetGroupInvestments.sat / stats.totalBudget) * 100) : 0}% ของงบรวม
            </span>
          </div>

          {/* 2. NSDF */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
            <span className="text-[11px] font-semibold text-indigo-900 block truncate">กองทุนพัฒนาการกีฬาฯ</span>
            <p className="mt-1 text-base font-bold text-[#16265E]">
              ฿{Math.round(stats.targetGroupInvestments.nsdf).toLocaleString("th-TH")}
            </p>
            <span className="text-[10px] text-gray-500">
              {stats.totalBudget > 0 ? Math.round((stats.targetGroupInvestments.nsdf / stats.totalBudget) * 100) : 0}% ของงบรวม
            </span>
          </div>

          {/* 3. National Assoc */}
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
            <span className="text-[11px] font-semibold text-emerald-900 block truncate">สมาคมกีฬาแห่งประเทศไทย</span>
            <p className="mt-1 text-base font-bold text-emerald-950">
              ฿{Math.round(stats.targetGroupInvestments.nationalAssoc).toLocaleString("th-TH")}
            </p>
            <span className="text-[10px] text-gray-500">
              {stats.totalBudget > 0 ? Math.round((stats.targetGroupInvestments.nationalAssoc / stats.totalBudget) * 100) : 0}% ของงบรวม
            </span>
          </div>

          {/* 4. Provincial Assoc */}
          <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-3">
            <span className="text-[11px] font-semibold text-teal-900 block truncate">สมาคมกีฬาแห่งจังหวัด</span>
            <p className="mt-1 text-base font-bold text-teal-950">
              ฿{Math.round(stats.targetGroupInvestments.provincialAssoc).toLocaleString("th-TH")}
            </p>
            <span className="text-[10px] text-gray-500">
              {stats.totalBudget > 0 ? Math.round((stats.targetGroupInvestments.provincialAssoc / stats.totalBudget) * 100) : 0}% ของงบรวม
            </span>
          </div>

          {/* 5. External */}
          <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3">
            <span className="text-[11px] font-semibold text-gray-700 block truncate">หน่วยงานภายนอก</span>
            <p className="mt-1 text-base font-bold text-gray-900">
              ฿{Math.round(stats.targetGroupInvestments.external).toLocaleString("th-TH")}
            </p>
            <span className="text-[10px] text-gray-500">
              {stats.totalBudget > 0 ? Math.round((stats.targetGroupInvestments.external / stats.totalBudget) * 100) : 0}% ของงบรวม
            </span>
          </div>
        </div>
      </div>

      {/* Main Budget & Course Analytics Table */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3 mb-3">
          <div>
            <h3 className="text-sm font-bold text-[#16265E] flex items-center gap-1.5">
              <span>📋</span>
              <span>ตารางบันทึกและวิเคราะห์งบประมาณรายหลักสูตร</span>
            </h3>
            <p className="text-[11px] text-gray-500">
              💡 สามารถพิมพ์ตัวเลขงบประมาณในช่อง <strong>&quot;งบประมาณจัดสรร (บาท)&quot;</strong> เพื่อแก้ไขและบันทึกขึ้น Cloud ได้ทันที
            </p>
          </div>
          <div className="text-xs font-semibold text-gray-500">
            ทั้งหมด {stats.filteredCourses.length} หลักสูตร
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3 font-bold text-center w-12">#</th>
                <th className="py-3 px-3 font-bold text-center w-24">ปีงบประมาณ</th>
                <th className="py-3 px-3 font-bold min-w-[240px]">ชื่อหลักสูตรการฝึกอบรม</th>
                <th className="py-3 px-3 font-bold text-center min-w-[110px]">จังหวัดที่จัด</th>
                <th className="py-3 px-3 font-bold text-center min-w-[130px]">ผู้สมัคร / ตัวจริง / ที่นั่ง</th>
                <th className="py-3 px-3 font-bold text-center min-w-[160px]">งบประมาณจัดสรร (บาท)</th>
                <th className="py-3 px-3 font-bold text-right min-w-[120px]">ต้นทุนต่อหัว (บาท/คน)</th>
                <th className="py-3 px-3 font-bold text-center min-w-[110px]">ความคุ้มค่า</th>
                <th className="py-3 px-3 font-bold text-center min-w-[80px]">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stats.courseMetrics.map((course, idx) => {
                const isOverBudget = course.costPerHead > stats.averageCostPerTrainee * 1.3 && stats.averageCostPerTrainee > 0;
                const isCostEfficient = course.costPerHead > 0 && course.costPerHead <= stats.averageCostPerTrainee;
                const isNotice = savedNotices[course.id];

                return (
                  <tr key={course.id} className="hover:bg-gray-50/80 transition">
                    {/* Index */}
                    <td className="py-3 px-3 text-center text-gray-500 font-semibold">{idx + 1}</td>

                    {/* Fiscal Year Badge */}
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${
                        course.fiscalYear === "2570"
                          ? "bg-blue-100 text-[#16265E]"
                          : course.fiscalYear === "2569"
                          ? "bg-purple-100 text-purple-900"
                          : "bg-amber-100 text-amber-900"
                      }`}>
                        ปี {course.fiscalYear}
                      </span>
                      {course.isHistorical && (
                        <div className="mt-0.5 text-[9px] text-gray-500 font-medium">
                          (ประวัติย้อนหลัง)
                        </div>
                      )}
                    </td>

                    {/* Course Title & Date */}
                    <td className="py-3 px-3">
                      <div className="font-bold text-gray-900 leading-snug">{course.title}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                        <span>🗓️ {course.date || "ไม่ระบุ"}</span>
                        <span>•</span>
                        <span>📍 {course.location || "ต่างจังหวัด"}</span>
                      </div>
                    </td>

                    {/* Host Province */}
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center rounded-lg bg-gray-100 px-2 py-1 text-[11px] font-bold text-gray-700">
                        {course.province || "กรุงเทพมหานคร"}
                      </span>
                    </td>

                    {/* Applicants / Approved / Capacity */}
                    <td className="py-3 px-3 text-center font-semibold text-gray-700">
                      <span className="text-gray-900">{course.applicantCount}</span>
                      <span className="text-gray-400"> / </span>
                      <span className="text-green-700 font-bold">{course.approvedCount}</span>
                      <span className="text-gray-400"> / </span>
                      <span className="text-gray-500">{course.capacity}</span>
                    </td>

                    {/* Budget Quick Inline Edit */}
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        <input
                          type="number"
                          value={inlineBudgets[course.id] ?? (course.budget !== undefined ? String(course.budget) : "")}
                          onChange={(e) => handleInlineBudgetChange(course.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveInlineBudget(course.id);
                          }}
                          placeholder="ใส่งบ..."
                          className="w-28 rounded-lg border border-gray-300 px-2.5 py-1 text-center font-bold text-gray-900 shadow-2xs focus:border-[#16265E] focus:outline-none focus:ring-1 focus:ring-[#16265E]"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveInlineBudget(course.id)}
                          title="บันทึกงบประมาณขึ้น Cloud"
                          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-[#16265E] transition cursor-pointer"
                        >
                          {isNotice ? (
                            <span className="text-green-600 font-bold">✓</span>
                          ) : (
                            <span>💾</span>
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Cost per Head */}
                    <td className="py-3 px-3 text-right font-bold text-[#16265E]">
                      {course.costPerHead > 0 ? (
                        <span>฿{course.costPerHead.toLocaleString("th-TH")}</span>
                      ) : (
                        <span className="text-gray-400 font-normal">-</span>
                      )}
                    </td>

                    {/* Cost Efficiency Evaluation */}
                    <td className="py-3 px-3 text-center">
                      {course.budgetVal === 0 ? (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                          ยังไม่ระบุงบ
                        </span>
                      ) : isCostEfficient ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-800">
                          ✓ ประหยัด/คุ้มค่าสูง
                        </span>
                      ) : isOverBudget ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                          ⚠️ สูงกว่าเฉลี่ย
                        </span>
                      ) : (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                          ปานกลาง/ตามเกณฑ์
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3 text-center">
                      {course.isHistorical ? (
                        <button
                          type="button"
                          onClick={() => setEditingHistoricalCourse(course)}
                          className="rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-[11px] font-bold text-purple-800 hover:bg-purple-100 transition cursor-pointer"
                        >
                          แก้ไขประวัติ
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingCourse(course)}
                          className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                        >
                          แก้ไข
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Total Summary Footer Row */}
            <tfoot className="border-t-2 border-gray-300 bg-gray-50 font-bold text-gray-900">
              <tr>
                <td colSpan={4} className="py-3 px-3">
                  รวมงบประมาณทั้งสิ้น ({stats.filteredCourses.length} หลักสูตร · {yearFilterLabel})
                </td>
                <td className="py-3 px-3 text-center text-gray-800">
                  {stats.totalApplicants} / {stats.totalApproved} / {stats.totalCapacity}
                </td>
                <td className="py-3 px-3 text-center text-[#16265E] font-black text-sm">
                  ฿{stats.totalBudget.toLocaleString("th-TH")}
                </td>
                <td className="py-3 px-3 text-right text-emerald-900 font-black">
                  ฿{stats.averageCostPerTrainee.toLocaleString("th-TH")}
                </td>
                <td colSpan={2} className="py-3 px-3 text-center text-[11px] text-gray-500 font-normal">
                  เฉลี่ยทั้งโครงการ
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Edit Course Dialog (สำหรับหลักสูตรปกติ) */}
      {editingCourse && (
        <CourseEditDialog
          course={editingCourse}
          onClose={() => setEditingCourse(null)}
          onSave={(patch) => {
            const res = updateCourse(editingCourse.id, patch);
            return Boolean(res);
          }}
        />
      )}

      {/* Historical Course Dialog (สำหรับบันทึกหรือแก้ไขประวัติย้อนหลัง) */}
      <HistoricalCourseDialog
        isOpen={isHistoricalDialogOpen || Boolean(editingHistoricalCourse)}
        courseToEdit={editingHistoricalCourse}
        defaultFiscalYear={yearFilterMode === "single" ? selectedSingleYear : "2569"}
        onClose={() => {
          setIsHistoricalDialogOpen(false);
          setEditingHistoricalCourse(null);
        }}
        onSuccess={() => {
          setIsHistoricalDialogOpen(false);
          setEditingHistoricalCourse(null);
        }}
      />

      {/* Executive Print Report Modal (PDF A4 Landscape Format) */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-h-[95vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {/* Modal Actions Bar */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-3">
              <span className="text-xs font-bold text-gray-700">
                ตัวอย่างรายงานผู้บริหาร (A4 แนวนอน) - {yearFilterLabel}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-xl bg-[#16265E] px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#111e4a] transition cursor-pointer"
                >
                  🖨️ พิมพ์ออกเครื่องพิมพ์ / บันทึก PDF
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                >
                  ปิด
                </button>
              </div>
            </div>

            {/* Printable Paper Canvas */}
            <div className="p-8 text-black print:p-0 print:m-0" id="executive-budget-report">
              {/* Official Header with SAT Branding */}
              <div className="flex items-center justify-between border-b-2 border-[#16265E] pb-4">
                <div className="flex items-center gap-4">
                  <div className="relative h-14 w-14 shrink-0">
                    <Image
                      src="/assets/sat-logo.png"
                      alt="กกท. การกีฬาแห่งประเทศไทย"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <h1 className="text-base font-black text-[#16265E]">
                      รายงานวิเคราะห์ความคุ้มค่าของงบประมาณและต้นทุนรายหลักสูตร ({yearFilterLabel})
                    </h1>
                    <p className="text-xs font-semibold text-gray-800">
                      กองพัฒนาบุคลากรกีฬา ฝ่ายพัฒนากีฬาเป็นเลิศ การกีฬาแห่งประเทศไทย
                    </p>
                  </div>
                </div>
                <div className="text-right text-[11px] text-gray-600">
                  <p>วันที่พิมพ์รายงาน: <strong>{printedDateThai}</strong></p>
                  <p>ระบบรับสมัครและสารสนเทศบุคลากรกีฬา กกท.</p>
                </div>
              </div>

              {/* Executive Summary Cards in Print */}
              <div className="my-5 grid grid-cols-4 gap-3 text-xs">
                <div className="border border-gray-300 rounded-lg p-2.5 bg-gray-50/50">
                  <span className="text-gray-600 block">งบประมาณจัดสรรรวม</span>
                  <span className="text-sm font-bold text-[#16265E]">฿{stats.totalBudget.toLocaleString("th-TH")}</span>
                </div>
                <div className="border border-gray-300 rounded-lg p-2.5 bg-gray-50/50">
                  <span className="text-gray-600 block">ผู้ผ่านการอบรมรวม</span>
                  <span className="text-sm font-bold text-green-800">{stats.totalApproved.toLocaleString()} คน</span>
                </div>
                <div className="border border-gray-300 rounded-lg p-2.5 bg-gray-50/50">
                  <span className="text-gray-600 block">ต้นทุนเฉลี่ยต่อผู้ผ่านการอบรม</span>
                  <span className="text-sm font-bold text-emerald-900">฿{stats.averageCostPerTrainee.toLocaleString("th-TH")}/คน</span>
                </div>
                <div className="border border-gray-300 rounded-lg p-2.5 bg-gray-50/50">
                  <span className="text-gray-600 block">สัดส่วนสมาคมกีฬา</span>
                  <span className="text-sm font-bold text-purple-900">
                    ฿{Math.round(stats.targetGroupInvestments.nationalAssoc + stats.targetGroupInvestments.provincialAssoc).toLocaleString("th-TH")}
                  </span>
                </div>
              </div>

              {/* Print Table */}
              <table className="w-full border-collapse border border-gray-300 text-[11px]">
                <thead>
                  <tr className="bg-gray-100 text-gray-900">
                    <th className="border border-gray-300 py-2 px-2 text-center w-8">#</th>
                    <th className="border border-gray-300 py-2 px-2 text-center w-16">ปีงบฯ</th>
                    <th className="border border-gray-300 py-2 px-2 text-left">ชื่อหลักสูตรการฝึกอบรม</th>
                    <th className="border border-gray-300 py-2 px-2 text-center w-24">จังหวัดที่จัด</th>
                    <th className="border border-gray-300 py-2 px-2 text-center w-24">สมัคร/ตัวจริง/เป้า</th>
                    <th className="border border-gray-300 py-2 px-2 text-right w-28">งบประมาณ (บาท)</th>
                    <th className="border border-gray-300 py-2 px-2 text-right w-24">ต้นทุน/คน</th>
                    <th className="border border-gray-300 py-2 px-2 text-center w-24">ประเมินความคุ้มค่า</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.courseMetrics.map((c, i) => (
                    <tr key={c.id}>
                      <td className="border border-gray-300 py-1.5 px-2 text-center">{i + 1}</td>
                      <td className="border border-gray-300 py-1.5 px-2 text-center font-semibold">
                        {c.fiscalYear}
                      </td>
                      <td className="border border-gray-300 py-1.5 px-2 font-medium">
                        {c.title}
                        {c.isHistorical && <span className="ml-1 text-[9px] text-gray-500 font-normal">(ประวัติ)</span>}
                      </td>
                      <td className="border border-gray-300 py-1.5 px-2 text-center">{c.province || "-"}</td>
                      <td className="border border-gray-300 py-1.5 px-2 text-center">
                        {c.applicantCount} / {c.approvedCount} / {c.capacity}
                      </td>
                      <td className="border border-gray-300 py-1.5 px-2 text-right font-bold">
                        {c.budgetVal > 0 ? `฿${c.budgetVal.toLocaleString("th-TH")}` : "-"}
                      </td>
                      <td className="border border-gray-300 py-1.5 px-2 text-right font-semibold">
                        {c.costPerHead > 0 ? `฿${c.costPerHead.toLocaleString("th-TH")}` : "-"}
                      </td>
                      <td className="border border-gray-300 py-1.5 px-2 text-center">
                        {c.costPerHead > 0 && c.costPerHead <= stats.averageCostPerTrainee
                          ? "คุ้มค่าสูง"
                          : c.costPerHead > stats.averageCostPerTrainee * 1.3
                          ? "สูงกว่าเฉลี่ย"
                          : "ตามเกณฑ์"}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 font-bold">
                    <td colSpan={4} className="border border-gray-300 py-2 px-2 text-left">
                      รวมทั้งสิ้น ({stats.filteredCourses.length} หลักสูตร)
                    </td>
                    <td className="border border-gray-300 py-2 px-2 text-center">
                      {stats.totalApplicants} / {stats.totalApproved} / {stats.totalCapacity}
                    </td>
                    <td className="border border-gray-300 py-2 px-2 text-right text-[#16265E]">
                      ฿{stats.totalBudget.toLocaleString("th-TH")}
                    </td>
                    <td className="border border-gray-300 py-2 px-2 text-right text-emerald-900">
                      ฿{stats.averageCostPerTrainee.toLocaleString("th-TH")}
                    </td>
                    <td className="border border-gray-300 py-2 px-2 text-center">
                      เฉลี่ยทั้งโครงการ
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Executive Sign-off Block */}
              <div className="mt-10 grid grid-cols-2 gap-8 text-xs">
                <div className="text-center space-y-8">
                  <p>ผู้จัดทำรายงาน / เจ้าหน้าที่วิเคราะห์งบประมาณ</p>
                  <p className="border-b border-dotted border-gray-400 w-48 mx-auto" />
                  <p>(......................................................................)</p>
                  <p>ตำแหน่ง ..............................................................</p>
                </div>
                <div className="text-center space-y-8">
                  <p>ผู้อนุมัติ / ผู้อำนวยการกองพัฒนาบุคลากรกีฬา</p>
                  <p className="border-b border-dotted border-gray-400 w-48 mx-auto" />
                  <p>(......................................................................)</p>
                  <p>วันที่ .......... / .......... / ................</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
