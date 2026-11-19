"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import type { Course } from "@/lib/courses";
import { getCourseFiscalYear } from "@/lib/courses";
import type { ApplicantRecord } from "@/lib/applications-store";
import {
  THAI_PROVINCES,
  THAI_REGIONS,
  THAILAND_MAP_PATHS,
  type ThaiRegionKey,
  type ProvinceInfo,
} from "@/lib/provinces";
import { RealLeafletMap } from "@/components/admin/real-leaflet-map";

interface TrainingMapTabProps {
  courses: Course[];
  applications: ApplicantRecord[];
}

export function TrainingMapTab({ courses, applications }: TrainingMapTabProps) {
  // ตัวกรองช่วงปีงบประมาณ: "all" (ทุกปี) | "single" (ปีเดียว) | "range" (ช่วงปี เช่น 2568-2570)
  const [yearFilterMode, setYearFilterMode] = useState<"all" | "single" | "range">("all");
  const [selectedSingleYear, setSelectedSingleYear] = useState<string>("2570");
  const [rangeStartYear, setRangeStartYear] = useState<string>("2568");
  const [rangeEndYear, setRangeEndYear] = useState<string>("2570");

  const [selectedRegion, setSelectedRegion] = useState<ThaiRegionKey | "all">("all");
  const [selectedProvince, setSelectedProvince] = useState<ProvinceInfo | null>(null);
  const [hoveredProvince, setHoveredProvince] = useState<ProvinceInfo | null>(null);
  const [viewMode, setViewMode] = useState<"strategic" | "real">("real");
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // คำนวณรายชื่อปีงบประมาณที่มีทั้งหมดในระบบ (เรียงจากปีล่าสุดไปอดีต)
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    courses.forEach((c) => {
      yearsSet.add(getCourseFiscalYear(c));
    });
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

  // คำนวณความถี่และสถิติรายจังหวัด
  const provinceStats = useMemo(() => {
    const freqMap: Record<
      string,
      {
        courses: Course[];
        applicantCount: number;
        approvedCount: number;
        totalBudget: number;
      }
    > = {};

    // กำหนดค่าเริ่มต้นทุก 77 จังหวัด
    THAI_PROVINCES.forEach((p) => {
      freqMap[p.nameTh] = {
        courses: [],
        applicantCount: 0,
        approvedCount: 0,
        totalBudget: 0,
      };
    });

    const filteredCourses = courses.filter((c) =>
      isYearIncluded(getCourseFiscalYear(c))
    );

    filteredCourses.forEach((course) => {
      const provName = course.province || "กรุงเทพมหานคร";
      const target = freqMap[provName] || {
        courses: [],
        applicantCount: 0,
        approvedCount: 0,
        totalBudget: 0,
      };

      const bVal = course.budget || 0;
      let appCount = 0;
      let appApproved = 0;

      if (course.isHistorical) {
        appApproved = course.historicalCompleted ?? course.capacity ?? 40;
        appCount = course.historicalApplicants ?? course.capacity ?? 40;
      } else {
        const courseApps = applications.filter((a) => a.courseId === course.id && a.status !== "rejected");
        const approvedApps = courseApps.filter((a) => a.status === "approved");
        appCount = courseApps.length;
        appApproved = approvedApps.length;
      }

      target.courses.push(course);
      target.applicantCount += appCount;
      target.approvedCount += appApproved;
      target.totalBudget += bVal;
      freqMap[provName] = target;
    });

    // สถิติแยกตาม 5 ภูมิภาค
    const regionMetrics: Record<
      ThaiRegionKey,
      {
        courseCount: number;
        provincesCovered: number;
        totalProvinces: number;
        totalBudget: number;
        totalApplicants: number;
        totalApproved: number;
      }
    > = {
      central: { courseCount: 0, provincesCovered: 0, totalProvinces: 0, totalBudget: 0, totalApplicants: 0, totalApproved: 0 },
      north: { courseCount: 0, provincesCovered: 0, totalProvinces: 0, totalBudget: 0, totalApplicants: 0, totalApproved: 0 },
      northeast: { courseCount: 0, provincesCovered: 0, totalProvinces: 0, totalBudget: 0, totalApplicants: 0, totalApproved: 0 },
      east: { courseCount: 0, provincesCovered: 0, totalProvinces: 0, totalBudget: 0, totalApplicants: 0, totalApproved: 0 },
      south: { courseCount: 0, provincesCovered: 0, totalProvinces: 0, totalBudget: 0, totalApplicants: 0, totalApproved: 0 },
    };

    let totalCoveredProvinces = 0;

    THAI_PROVINCES.forEach((p) => {
      const reg = p.region;
      regionMetrics[reg].totalProvinces++;
      const data = freqMap[p.nameTh];
      if (data && data.courses.length > 0) {
        regionMetrics[reg].courseCount += data.courses.length;
        regionMetrics[reg].provincesCovered++;
        regionMetrics[reg].totalBudget += data.totalBudget;
        regionMetrics[reg].totalApplicants += data.applicantCount;
        regionMetrics[reg].totalApproved += data.approvedCount;
        totalCoveredProvinces++;
      }
    });

    // จัดอันดับจังหวัดที่มีการจัดบ่อยที่สุด (Top Hosts)
    const rankedProvinces = THAI_PROVINCES.map((p) => ({
      ...p,
      metrics: freqMap[p.nameTh],
    })).sort((a, b) => b.metrics.courses.length - a.metrics.courses.length);

    const topHosts = rankedProvinces.filter((p) => p.metrics.courses.length > 0);
    const blindSpots = rankedProvinces.filter((p) => p.metrics.courses.length === 0);

    return {
      freqMap,
      regionMetrics,
      totalCoveredProvinces,
      rankedProvinces,
      topHosts,
      blindSpots,
    };
  }, [courses, applications, yearFilterMode, selectedSingleYear, rangeStartYear, rangeEndYear]);

  // จังหวัดที่ผ่านการกรองตามภูมิภาค
  const filteredProvinces = useMemo(() => {
    if (selectedRegion === "all") return THAI_PROVINCES;
    return THAI_PROVINCES.filter((p) => p.region === selectedRegion);
  }, [selectedRegion]);

  // ฟังก์ชันสีกราฟตามความถี่ (Heatmap Scale)
  const getProvinceColor = (count: number) => {
    if (count === 0) return "#94a3b8"; // สีเทาหมอกคมชัด
    if (count === 1) return "#0284c7"; // สีฟ้าสดใส
    if (count === 2) return "#2563eb"; // สีน้ำเงินมาตรฐาน
    return "#16265E"; // สีกรมท่า กกท. เข้มข้น
  };

  // ตำแหน่งป้ายชื่อแบบชาญฉลาดไม่ให้ซ้อนทับกัน (Anti-Collision Label Positioning)
  const getLabelPosition = (p: ProvinceInfo) => {
    if (p.id === "AYA") {
      // พระนครศรีอยุธยา: ลอยขึ้นด้านบน
      return { x: p.x, y: p.y - 12, anchor: "middle" as const };
    }
    if (p.id === "BKK") {
      // กรุงเทพฯ: เยื้องไปทางซ้าย
      return { x: p.x - 12, y: p.y + 4, anchor: "end" as const };
    }
    if (p.id === "NON" || p.id === "PTE") {
      // นนทบุรี / ปทุมธานี: เยื้องตะวันตกเฉียงเหนือ
      return { x: p.x - 10, y: p.y - 8, anchor: "end" as const };
    }
    if (p.id === "CBI") {
      // ชลบุรี: เยื้องตะวันออกเฉียงใต้
      return { x: p.x + 12, y: p.y + 10, anchor: "start" as const };
    }
    if (p.id === "SPK") {
      // สมุทรปราการ: เยื้องตะวันออกเฉียงใต้
      return { x: p.x + 10, y: p.y + 8, anchor: "start" as const };
    }
    return { x: p.x + 10, y: p.y + 3.5, anchor: "start" as const };
  };

  // ส่งออกข้อมูลเป็นไฟล์ Excel (CSV)
  const handleExportCsv = () => {
    const headers = [
      "รหัสจังหวัด",
      "ชื่อจังหวัด (ไทย)",
      "ชื่อจังหวัด (อังกฤษ)",
      "ภูมิภาค",
      "จำนวนครั้งที่จัดอบรม",
      "รายชื่อหลักสูตรที่จัด",
      "จำนวนผู้สมัคร (คน)",
      "ผู้ผ่านการอบรมจริง (คน)",
      "งบประมาณรวม (บาท)",
    ];

    const rows = provinceStats.rankedProvinces.map((p) => [
      p.id,
      `"${p.nameTh}"`,
      `"${p.nameEn}"`,
      `"${p.regionNameTh}"`,
      p.metrics.courses.length,
      `"${p.metrics.courses.map((c) => c.title).join("; ")}"`,
      p.metrics.applicantCount,
      p.metrics.approvedCount,
      p.metrics.totalBudget,
    ]);

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const cleanLabel = yearFilterLabel.replace(/[^0-9a-zA-Zก-๙]/g, "_");
    link.setAttribute("download", `SAT_Training_Frequency_Provinces_${cleanLabel}_${Date.now()}.csv`);
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
            <span>🗺️</span>
            <span>แผนที่ความถี่ของการจัดอบรม (Training Geographic Map & Regional Distribution)</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            ติดตามการกระจายตัวของหลักสูตรพัฒนาบุคลากรกีฬาทั่วประเทศไทยตามภูมิศาสตร์จริง เพื่อเป็นข้อมูลเชิงยุทธศาสตร์เสนอผู้บริหาร
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-900 shadow-2xs hover:bg-emerald-100 transition active:scale-95 cursor-pointer"
          >
            <span>📥</span>
            <span>ส่งออกข้อมูลรายจังหวัด (CSV)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPrintModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#16265E] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#111e4a] transition active:scale-95 cursor-pointer"
          >
            <span>🖨️</span>
            <span>พิมพ์รายงานแผนที่เสนอผู้บริหาร (PDF)</span>
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
              <p className="text-[11px] text-gray-500">เลือกดูรายปีเดี่ยว หรือกำหนดช่วงปีย้อนหลังเพื่อวิเคราะห์การกระจายตัวของแผนที่</p>
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
            <span>แสดงความถี่: <strong className="text-[#16265E]">{yearFilterLabel}</strong> ({provinceStats.totalCoveredProvinces} / 77 จังหวัด)</span>
          </div>
        </div>
      </div>

      {/* Strategic Regional Metric Cards (4 Cards) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Provinces Covered */}
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/80 to-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900 uppercase">จังหวัดที่จัดอบรม</span>
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
              ครอบคลุม
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-[#16265E]">{provinceStats.totalCoveredProvinces}</span>
            <span className="text-xs text-gray-500 font-semibold">/ 77 จังหวัด</span>
          </div>
          <p className="mt-1 text-[11px] text-gray-600">
            คิดเป็น <strong>{Math.round((provinceStats.totalCoveredProvinces / 77) * 100)}%</strong> ของจังหวัดทั่วประเทศ
          </p>
        </div>

        {/* Card 2: Top Hosting Province */}
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 uppercase">จังหวัดที่มีการจัดสูงสุด</span>
            <span className="text-lg">🏆</span>
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-950 line-clamp-1">
            {provinceStats.topHosts[0]?.nameTh || "-"}
          </p>
          <p className="mt-1 text-[11px] text-gray-600">
            จัดไปแล้ว <strong>{provinceStats.topHosts[0]?.metrics.courses.length || 0}</strong> หลักสูตร ({provinceStats.topHosts[0]?.metrics.approvedCount || 0} คน)
          </p>
        </div>

        {/* Card 3: Blind Spots (Unreached Provinces) */}
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/80 to-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 uppercase">จังหวัดที่ยังไม่มีการจัด</span>
            <span className="text-lg">📍</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-amber-950">{provinceStats.blindSpots.length}</span>
            <span className="text-xs text-gray-500 font-semibold">จังหวัด</span>
          </div>
          <p className="mt-1 text-[11px] text-gray-600">
            โอกาสขยายพื้นที่จัดอบรมในแผนปีงบประมาณถัดไป
          </p>
        </div>

        {/* Card 4: Most Active Region */}
        <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50/80 to-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-900 uppercase">ภูมิภาคศูนย์กลางการอบรม</span>
            <span className="text-lg">🏛️</span>
          </div>
          <p className="mt-2 text-xl font-black text-purple-900">
            ภาคกลาง
          </p>
          <p className="mt-1 text-[11px] text-gray-600">
            {provinceStats.regionMetrics.central.courseCount} หลักสูตร (ครอบคลุม {provinceStats.regionMetrics.central.provincesCovered} จังหวัด)
          </p>
        </div>
      </div>

      {/* Main Interactive Map & Regional Distribution Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Interactive Thailand Heatmap (7 Cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-gray-200 bg-white p-5 shadow-xs flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#16265E] flex items-center gap-1.5">
                <span>🇹🇭</span>
                <span>แผนที่ประเทศไทยจำแนกความถี่การจัดอบรม</span>
              </h3>
              <p className="text-[11px] text-gray-500">
                คลิกที่หมุดจังหวัดเพื่อดูรายละเอียดหลักสูตรและงบประมาณ
              </p>
            </div>

            {/* View Mode Switcher (2-in-1 Dual View) */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode("real")}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1 ${
                  viewMode === "real"
                    ? "bg-white text-[#16265E] shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <span>🛰️</span>
                <span>แผนที่ระบายสี 77 จังหวัด (Esri)</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("strategic")}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1 ${
                  viewMode === "strategic"
                    ? "bg-white text-[#16265E] shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <span>🗺️</span>
                <span>แผนที่ยุทธศาสตร์ขวานทอง</span>
              </button>
            </div>
          </div>

          {/* Region Filter Buttons */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedRegion("all")}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                  selectedRegion === "all"
                    ? "bg-[#16265E] text-white shadow-2xs"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                ทั้งหมด (77 จังหวัด)
              </button>
              {Object.values(THAI_REGIONS).map((reg) => (
                <button
                  key={reg.key}
                  type="button"
                  onClick={() => setSelectedRegion(reg.key)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                    selectedRegion === reg.key
                      ? "bg-[#16265E] text-white shadow-2xs"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {reg.nameTh} ({provinceStats.regionMetrics[reg.key].courseCount} ครั้ง)
                </button>
              ))}
            </div>

            {/* Heatmap Legend */}
            <div className="flex items-center gap-2 text-[10px] text-gray-600">
              <span className="flex items-center gap-1">
                <span className={`h-2.5 w-2.5 rounded-full ${viewMode === "real" ? "bg-white border border-gray-400" : "bg-[#94a3b8]"}`} />
                <span>0</span>
              </span>
              <span className="flex items-center gap-1">
                <span className={`h-2.5 w-2.5 rounded-full ${viewMode === "real" ? "bg-[#fde047] border border-amber-500" : "bg-[#0284c7]"}`} />
                <span>1 ครั้ง</span>
              </span>
              <span className="flex items-center gap-1">
                <span className={`h-2.5 w-2.5 rounded-full ${viewMode === "real" ? "bg-[#f97316] border border-orange-500" : "bg-[#2563eb]"}`} />
                <span>2 ครั้ง</span>
              </span>
              <span className="flex items-center gap-1">
                <span className={`h-2.5 w-2.5 rounded-full ${viewMode === "real" ? "bg-[#b91c1c] border border-red-800" : "bg-[#16265E]"}`} />
                <span>3+ ครั้ง</span>
              </span>
            </div>
          </div>

          {/* Map Display: Mode 1 (Strategic Vector) vs Mode 2 (Real Map) */}
          <div className="mt-3 flex-1 flex flex-col justify-center">
            {viewMode === "real" ? (
              <RealLeafletMap
                provinces={filteredProvinces}
                freqMap={provinceStats.freqMap}
                onSelectProvince={(p) => setSelectedProvince(p)}
                selectedYear={yearFilterLabel}
              />
            ) : (
              <div className="relative w-full min-h-[480px] flex items-center justify-center rounded-xl border border-gray-200 p-2 overflow-hidden bg-slate-50">
                <svg
                  viewBox="90 30 420 780"
                  className="w-full h-full max-h-[560px] drop-shadow-sm select-none"
                >
                  <defs>
                    {/* Ocean subtle gradient */}
                    <linearGradient id="oceanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f8fafc" />
                      <stop offset="100%" stopColor="#eff6ff" />
                    </linearGradient>

                    {/* Regional soft glow filter */}
                    <filter id="mapGlow" x="-10%" y="-10%" width="120%" height="120%">
                      <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0f172a" floodOpacity="0.08" />
                    </filter>

                    <filter id="activePinGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#16265E" floodOpacity="0.35" />
                    </filter>
                  </defs>

                  {/* Ocean Plate with subtle border */}
                  <rect x="90" y="30" width="420" height="780" rx="14" fill="url(#oceanGrad)" />

                  {/* Subtle Cartographic Grid Lines (Lat/Long) */}
                  <g stroke="#cbd5e1" strokeWidth="0.5" strokeDasharray="3 4" opacity="0.45">
                    <line x1="90" y1="100" x2="510" y2="100" />
                    <line x1="90" y1="250" x2="510" y2="250" />
                    <line x1="90" y1="400" x2="510" y2="400" />
                    <line x1="90" y1="550" x2="510" y2="550" />
                    <line x1="90" y1="700" x2="510" y2="700" />
                    <line x1="170" y1="30" x2="170" y2="810" />
                    <line x1="260" y1="30" x2="260" y2="810" />
                    <line x1="360" y1="30" x2="360" y2="810" />
                    <line x1="450" y1="30" x2="450" y2="810" />
                  </g>

                  {/* Latitude & Longitude Micro Labels */}
                  <g fontSize="7.5" fill="#94a3b8" fontFamily="sans-serif">
                    <text x="96" y="96">20°N</text>
                    <text x="96" y="246">16°N</text>
                    <text x="96" y="396">13°N</text>
                    <text x="96" y="546">10°N</text>
                    <text x="96" y="696">7°N</text>
                    <text x="174" y="42">98°E</text>
                    <text x="264" y="42">100°E</text>
                    <text x="364" y="42">102°E</text>
                    <text x="454" y="42">104°E</text>
                  </g>

                  {/* Seas & International Boundaries Text (Watermarks) */}
                  <g fill="#1e3a8a" opacity="0.22" fontWeight="bold" fontFamily="sans-serif">
                    <text x="265" y="480" fontSize="11" letterSpacing="2">อ่าวไทย</text>
                    <text x="265" y="494" fontSize="7.5" letterSpacing="1">GULF OF THAILAND</text>
                    <text x="100" y="660" fontSize="10" letterSpacing="1.5">ทะเลอันดามัน</text>
                    <text x="100" y="673" fontSize="7" letterSpacing="0.8">ANDAMAN SEA</text>
                  </g>

                  <g fill="#64748b" opacity="0.25" fontSize="8.5" fontWeight="bold" fontFamily="sans-serif">
                    <text x="355" y="115">สปป. ลาว (LAOS)</text>
                    <text x="105" y="180">เมียนมา (MYANMAR)</text>
                    <text x="400" y="420">กัมพูชา (CAMBODIA)</text>
                    <text x="225" y="800">มาเลเซีย (MALAYSIA)</text>
                  </g>

                  {/* Compass Rose / North Indicator */}
                  <g transform="translate(115, 65)">
                    <circle cx="0" cy="0" r="13" fill="white" stroke="#94a3b8" strokeWidth="0.8" opacity="0.9" />
                    <path d="M 0 -10 L 3.5 0 L 0 2 L -3.5 0 Z" fill="#16265E" />
                    <path d="M 0 10 L 3.5 0 L 0 -2 L -3.5 0 Z" fill="#94a3b8" />
                    <text x="-3" y="-12" fontSize="7.5" fontWeight="bold" fill="#16265E">N</text>
                  </g>

                  {/* 5 Real Regional Geographic Territorials (Realistic Golden Axe Contours) */}
                  <g filter="url(#mapGlow)">
                    {/* 1. North */}
                    <path
                      d={THAILAND_MAP_PATHS.north}
                      fill={selectedRegion === "north" || selectedRegion === "all" ? "#10b981" : "#94a3b8"}
                      fillOpacity={selectedRegion === "north" ? 0.45 : selectedRegion === "all" ? 0.22 : 0.08}
                      stroke="#059669"
                      strokeWidth={selectedRegion === "north" ? 2 : 1}
                      strokeLinejoin="round"
                      className="transition-all duration-300"
                    />

                    {/* 2. Northeast */}
                    <path
                      d={THAILAND_MAP_PATHS.northeast}
                      fill={selectedRegion === "northeast" || selectedRegion === "all" ? "#f59e0b" : "#94a3b8"}
                      fillOpacity={selectedRegion === "northeast" ? 0.45 : selectedRegion === "all" ? 0.22 : 0.08}
                      stroke="#d97706"
                      strokeWidth={selectedRegion === "northeast" ? 2 : 1}
                      strokeLinejoin="round"
                      className="transition-all duration-300"
                    />

                    {/* 3. Central */}
                    <path
                      d={THAILAND_MAP_PATHS.central}
                      fill={selectedRegion === "central" || selectedRegion === "all" ? "#3b82f6" : "#94a3b8"}
                      fillOpacity={selectedRegion === "central" ? 0.45 : selectedRegion === "all" ? 0.22 : 0.08}
                      stroke="#2563eb"
                      strokeWidth={selectedRegion === "central" ? 2 : 1}
                      strokeLinejoin="round"
                      className="transition-all duration-300"
                    />

                    {/* 4. East */}
                    <path
                      d={THAILAND_MAP_PATHS.east}
                      fill={selectedRegion === "east" || selectedRegion === "all" ? "#8b5cf6" : "#94a3b8"}
                      fillOpacity={selectedRegion === "east" ? 0.45 : selectedRegion === "all" ? 0.22 : 0.08}
                      stroke="#7c3aed"
                      strokeWidth={selectedRegion === "east" ? 2 : 1}
                      strokeLinejoin="round"
                      className="transition-all duration-300"
                    />

                    {/* 5. South */}
                    <path
                      d={THAILAND_MAP_PATHS.south}
                      fill={selectedRegion === "south" || selectedRegion === "all" ? "#f43f5e" : "#94a3b8"}
                      fillOpacity={selectedRegion === "south" ? 0.45 : selectedRegion === "all" ? 0.22 : 0.08}
                      stroke="#e11d48"
                      strokeWidth={selectedRegion === "south" ? 2 : 1}
                      strokeLinejoin="round"
                      className="transition-all duration-300"
                    />

                    {/* Strategic Islands (Phuket, Samui, Koh Chang...) */}
                    {THAILAND_MAP_PATHS.islands.map((isl) => (
                      <path
                        key={isl.nameTh}
                        d={isl.path}
                        fill="#16265E"
                        fillOpacity={0.4}
                        stroke="#16265E"
                        strokeWidth="1"
                        className="transition-all duration-200"
                      />
                    ))}
                  </g>

                  {/* Province Nodes & Interactive Markers */}
                  {THAI_PROVINCES.map((p) => {
                    const count = provinceStats.freqMap[p.nameTh]?.courses.length || 0;
                    const color = getProvinceColor(count);
                    const isSelected = selectedProvince?.id === p.id;
                    const isHovered = hoveredProvince?.id === p.id;
                    const isDimmed = selectedRegion !== "all" && p.region !== selectedRegion;
                    const hasCourses = count > 0;
                    const labelPos = getLabelPosition(p);

                    return (
                      <g
                        key={p.id}
                        className="cursor-pointer transition-transform duration-200"
                        opacity={isDimmed ? 0.2 : 1}
                        onClick={() => setSelectedProvince(p)}
                        onMouseEnter={() => setHoveredProvince(p)}
                        onMouseLeave={() => setHoveredProvince(null)}
                      >
                        {/* Pulsing Radar Ring for provinces with courses */}
                        {hasCourses && (
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={count >= 3 ? 16 : count === 2 ? 13 : 11}
                            fill={color}
                            opacity={0.3}
                            className="animate-ping"
                          />
                        )}

                        {/* Outer Halo for active or selected provinces */}
                        {(hasCourses || isSelected || isHovered) && (
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={hasCourses ? 9 : 6}
                            fill={color}
                            opacity={0.25}
                          />
                        )}

                        {/* Core Node Circle */}
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={hasCourses ? 6 : 3.5}
                          fill={hasCourses ? color : "#94a3b8"}
                          stroke="#ffffff"
                          strokeWidth={hasCourses ? 2 : 1}
                          filter={hasCourses ? "url(#activePinGlow)" : undefined}
                          className="transition-all duration-200"
                        />

                        {/* Province Name Label with Smart Anti-Collision Pill */}
                        {(hasCourses || isHovered || isSelected) && (
                          <g className="pointer-events-none select-none">
                            {/* Pill Background Badge */}
                            <rect
                              x={
                                labelPos.anchor === "end"
                                  ? labelPos.x - (p.nameTh.length * 5.8 + (hasCourses ? 16 : 8))
                                  : labelPos.anchor === "middle"
                                  ? labelPos.x - (p.nameTh.length * 5.8 + (hasCourses ? 16 : 8)) / 2
                                  : labelPos.x - 2
                              }
                              y={labelPos.y - 8.5}
                              width={p.nameTh.length * 5.8 + (hasCourses ? 18 : 8)}
                              height={14}
                              rx={4}
                              fill={hasCourses ? "#16265E" : "white"}
                              stroke={hasCourses ? "#ffffff" : "#cbd5e1"}
                              strokeWidth={0.8}
                              opacity={0.95}
                              filter="drop-shadow(0 1px 2px rgba(0,0,0,0.1))"
                            />
                            <text
                              x={
                                labelPos.anchor === "middle"
                                  ? labelPos.x
                                  : labelPos.anchor === "end"
                                  ? labelPos.x - 4
                                  : labelPos.x + 2
                              }
                              y={labelPos.y + 2}
                              textAnchor={labelPos.anchor}
                              fontSize="8.5"
                              fontWeight={hasCourses ? "bold" : "semibold"}
                              fill={hasCourses ? "#ffffff" : "#1e293b"}
                              className="tracking-tight"
                            >
                              {p.nameTh} {hasCourses ? `(${count})` : ""}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* Hover Tooltip Overlay */}
                {hoveredProvince && (
                  <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs border border-gray-300 rounded-xl p-3 shadow-lg text-xs max-w-xs pointer-events-none animate-in fade-in">
                    <div className="flex items-center justify-between gap-3 border-b border-gray-200 pb-1.5">
                      <span className="font-bold text-[#16265E] text-sm">{hoveredProvince.nameTh}</span>
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9.5px] font-semibold text-gray-600">
                        {hoveredProvince.regionNameTh}
                      </span>
                    </div>
                    <div className="mt-1.5 space-y-1 text-[11px] text-gray-700">
                      <div className="flex justify-between">
                        <span>จัดอบรม:</span>
                        <strong>{provinceStats.freqMap[hoveredProvince.nameTh]?.courses.length || 0} หลักสูตร</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>ผู้สมัครจริง:</span>
                        <strong>{provinceStats.freqMap[hoveredProvince.nameTh]?.applicantCount || 0} คน</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>งบประมาณรวม:</span>
                        <strong className="text-emerald-800">
                          ฿{(provinceStats.freqMap[hoveredProvince.nameTh]?.totalBudget || 0).toLocaleString("th-TH")}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Regional Breakdown & Province Drilldown (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Top Hosting Provinces List */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
            <h3 className="text-sm font-bold text-[#16265E] flex items-center justify-between">
              <span>🏆 จังหวัดที่จัดอบรมบ่อยที่สุด (Top Hosts)</span>
              <span className="text-[11px] text-gray-500 font-normal">
                {provinceStats.topHosts.length} จังหวัด
              </span>
            </h3>

            <div className="mt-3 divide-y divide-gray-100">
              {provinceStats.topHosts.slice(0, 5).map((p, idx) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedProvince(p)}
                  className="py-2.5 flex items-center justify-between hover:bg-gray-50 rounded-lg px-2 cursor-pointer transition"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-[#16265E]">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-gray-900 text-xs">{p.nameTh}</p>
                      <p className="text-[10px] text-gray-500">{p.regionNameTh}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#16265E] text-xs">
                      {p.metrics.courses.length} หลักสูตร
                    </p>
                    <p className="text-[10px] text-emerald-800 font-semibold">
                      ฿{p.metrics.totalBudget.toLocaleString("th-TH")}
                    </p>
                  </div>
                </div>
              ))}

              {provinceStats.topHosts.length === 0 && (
                <div className="py-6 text-center text-xs text-gray-400">
                  ยังไม่มีข้อมูลการจัดอบรมในปีงบประมาณที่เลือก
                </div>
              )}
            </div>
          </div>

          {/* Regional Summary Cards (5 Regions) */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
            <h3 className="text-sm font-bold text-[#16265E] mb-3">
              🏛️ สรุปการกระจายตัว 5 ภูมิภาค ({yearFilterLabel})
            </h3>

            <div className="space-y-2">
              {Object.values(THAI_REGIONS).map((reg) => {
                const metrics = provinceStats.regionMetrics[reg.key];
                const pct = metrics.totalProvinces > 0
                  ? Math.round((metrics.provincesCovered / metrics.totalProvinces) * 100)
                  : 0;

                return (
                  <div
                    key={reg.key}
                    onClick={() => setSelectedRegion(selectedRegion === reg.key ? "all" : reg.key)}
                    className={`p-3 rounded-xl border transition cursor-pointer ${
                      selectedRegion === reg.key
                        ? "border-[#16265E] bg-blue-50/50 shadow-2xs"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{reg.nameTh}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-md border font-semibold ${reg.badgeClass}`}>
                          {metrics.courseCount} ครั้ง
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-500">
                        {metrics.provincesCovered}/{metrics.totalProvinces} จ. ({pct}%)
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-2 w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: reg.barColor,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Province Drilldown Dialog */}
      {selectedProvince && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="bg-[#16265E] px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <span>📍</span>
                  <span>จังหวัด{selectedProvince.nameTh} ({selectedProvince.nameEn})</span>
                </h3>
                <p className="text-xs text-white/70">
                  {selectedProvince.regionNameTh} · ข้อมูลการจัดอบรมและงบประมาณ
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProvince(null)}
                className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition cursor-pointer"
              >
                ✕ ปิด
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Quick Province Metrics */}
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-2.5">
                  <p className="text-[10px] text-gray-500 uppercase">หลักสูตรที่จัด</p>
                  <p className="text-lg font-black text-[#16265E]">
                    {provinceStats.freqMap[selectedProvince.nameTh]?.courses.length || 0}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-2.5">
                  <p className="text-[10px] text-gray-500 uppercase">ตัวจริง (คน)</p>
                  <p className="text-lg font-black text-emerald-800">
                    {provinceStats.freqMap[selectedProvince.nameTh]?.approvedCount || 0}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-2.5">
                  <p className="text-[10px] text-gray-500 uppercase">งบประมาณรวม</p>
                  <p className="text-base font-black text-purple-900">
                    ฿{(provinceStats.freqMap[selectedProvince.nameTh]?.totalBudget || 0).toLocaleString("th-TH")}
                  </p>
                </div>
              </div>

              {/* Course List in this Province */}
              <div>
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                  รายชื่อหลักสูตรที่จัดในจังหวัดนี้
                </h4>
                {provinceStats.freqMap[selectedProvince.nameTh]?.courses.length ? (
                  <div className="mt-2 space-y-2">
                    {provinceStats.freqMap[selectedProvince.nameTh]?.courses.map((c) => (
                      <div
                        key={c.id}
                        className="rounded-xl border border-gray-200 bg-gray-50/70 p-3 text-xs"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            getCourseFiscalYear(c) === "2570"
                              ? "bg-blue-100 text-[#16265E]"
                              : "bg-purple-100 text-purple-900"
                          }`}>
                            ปี {getCourseFiscalYear(c)}
                          </span>
                          {c.isHistorical && (
                            <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[9px] text-gray-600 font-medium">
                              ประวัติย้อนหลัง
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-[#16265E]">{c.title}</p>
                        <p className="text-[11px] text-gray-600 mt-1">
                          🗓️ วันที่: <strong>{c.date}</strong> · 📍 สถานที่: {c.location}
                        </p>
                        <div className="mt-2 flex items-center justify-between text-[11px]">
                          <span className="text-gray-500">
                            ความจุ: <strong>{c.capacity || 40} คน</strong>
                          </span>
                          <span className="font-bold text-emerald-800">
                            งบประมาณ: ฿{(c.budget || 0).toLocaleString("th-TH")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl border border-dashed border-gray-300 p-8 text-center text-xs text-gray-500">
                    ยังไม่มีการจัดอบรมในจังหวัดนี้ (อยู่ในกลุ่มพื้นที่โอกาสขยายผล)
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedProvince(null)}
                className="rounded-xl bg-gray-200 px-4 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-300 transition cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Executive Print Report Modal (PDF A4 Landscape Format) */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in print:p-0 print:bg-white print:static">
          <div className="max-h-[90vh] w-full max-w-4xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col print:max-h-none print:shadow-none print:rounded-none">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-3.5 print:hidden">
              <div className="flex items-center gap-2">
                <span className="text-xl">🖨️</span>
                <span className="font-bold text-[#16265E] text-sm">
                  รายงานสรุปการกระจายตัวและความถี่ของการจัดอบรมเชิงพื้นที่ (เสนอผู้บริหาร)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition cursor-pointer"
                >
                  พิมพ์เอกสาร / บันทึก PDF
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                >
                  ✕ ปิด
                </button>
              </div>
            </div>

            {/* Document Body */}
            <div className="overflow-y-auto p-6 print:p-0 print:overflow-visible">
              <div
                className="map-print-container mx-auto w-full max-w-[1140px] bg-white p-6 text-gray-900 border border-gray-200 shadow-xs print:border-0 print:shadow-none print:p-0"
                style={{ fontFamily: "'Sarabun', 'Noto Sans Thai', sans-serif" }}
              >
                {/* Header: Official SAT Branding */}
                <div className="flex items-start justify-between border-b-2 border-[#16265E] pb-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-14 w-14 shrink-0">
                      <Image
                        src="/assets/logo-sat-header.png"
                        alt="ตราสัญลักษณ์ กกท."
                        width={56}
                        height={56}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div>
                      <h1 className="text-base font-black text-[#16265E] sm:text-lg">
                        การกีฬาแห่งประเทศไทย (กกท.)
                      </h1>
                      <p className="text-xs font-bold text-gray-800 sm:text-sm">
                        กองพัฒนาบุคลากรกีฬา ฝ่ายพัฒนากีฬาเป็นเลิศ
                      </p>
                      <p className="text-[11px] font-semibold text-[#1e3a8a]">
                        รายงานการกระจายตัวและความถี่ของการจัดอบรมบุคลากรกีฬาเชิงพื้นที่ (Geographic Distribution Report)
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-[11px]">
                    <span className="inline-block rounded bg-blue-50 px-2 py-0.5 font-bold text-[#16265E] border border-blue-200">
                      เอกสารเสนอผู้บริหาร
                    </span>
                    <p className="mt-1 text-gray-600">
                      วันที่พิมพ์รายงาน: <strong>{printedDateThai}</strong>
                    </p>
                  </div>
                </div>

                {/* 5 Regions Summary Cards */}
                <div className="mt-3 grid grid-cols-5 gap-2 text-xs">
                  {Object.values(THAI_REGIONS).map((reg) => {
                    const m = provinceStats.regionMetrics[reg.key];
                    return (
                      <div key={reg.key} className="rounded-lg border border-gray-200 bg-gray-50/70 p-2 text-center">
                        <p className="text-[10px] text-gray-500 font-bold uppercase">{reg.nameTh}</p>
                        <p className="text-base font-black text-[#16265E] mt-0.5">{m.courseCount} หลักสูตร</p>
                        <p className="text-[9.5px] text-gray-500">{m.provincesCovered}/{m.totalProvinces} จังหวัด</p>
                      </div>
                    );
                  })}
                </div>

                {/* Training Location Frequency Table */}
                <div className="mt-4 overflow-hidden rounded-lg border border-gray-300">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-gray-300 bg-gray-100 text-[10.5px] font-bold text-gray-900">
                        <th className="py-2 px-2 text-center w-10">ลำดับ</th>
                        <th className="py-2 px-2">จังหวัดที่จัดอบรม</th>
                        <th className="py-2 px-2 text-center">ภูมิภาค</th>
                        <th className="py-2 px-2 text-center">จำนวนครั้งที่จัด</th>
                        <th className="py-2 px-2">หลักสูตรที่จัด</th>
                        <th className="py-2 px-2 text-center">ตัวจริง (คน)</th>
                        <th className="py-2 px-2 text-right">งบประมาณรวม (บาท)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {provinceStats.topHosts.map((p, idx) => (
                        <tr key={p.id} className="text-[10px]">
                          <td className="py-2 px-2 text-center font-bold text-gray-500">{idx + 1}</td>
                          <td className="py-2 px-2 font-bold text-gray-900">{p.nameTh}</td>
                          <td className="py-2 px-2 text-center text-gray-600">{p.regionNameTh}</td>
                          <td className="py-2 px-2 text-center font-bold text-[#16265E]">
                            {p.metrics.courses.length} หลักสูตร
                          </td>
                          <td className="py-2 px-2 text-gray-700">
                            {p.metrics.courses.map((c) => c.title).join(", ")}
                          </td>
                          <td className="py-2 px-2 text-center font-bold text-emerald-800">
                            {p.metrics.approvedCount}
                          </td>
                          <td className="py-2 px-2 text-right font-mono font-bold">
                            ฿{p.metrics.totalBudget.toLocaleString("th-TH")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Sign-off Section */}
                <div className="mt-8 grid grid-cols-2 gap-8 text-xs">
                  <div className="rounded-lg border border-gray-200 p-4 text-center">
                    <p className="font-bold text-gray-800">ผู้รายงาน / เจ้าหน้าที่ประสานงานหลักสูตร</p>
                    <div className="mx-auto mt-12 w-48 border-b border-gray-400 border-dashed" />
                    <p className="mt-2 text-gray-700">( ............................................................ )</p>
                    <p className="text-[10px] text-gray-500 mt-1">วันที่ ........ / ........ / ................</p>
                  </div>
                  <div className="rounded-lg border border-blue-200 bg-blue-50/30 p-4 text-center">
                    <p className="font-bold text-[#16265E]">ผู้อำนวยการกองพัฒนาบุคลากรกีฬา</p>
                    <div className="mx-auto mt-12 w-48 border-b border-gray-400 border-dashed" />
                    <p className="mt-2 text-gray-700">( ............................................................ )</p>
                    <p className="text-[10px] text-gray-500 mt-1">วันที่ ........ / ........ / ................</p>
                  </div>
                </div>

                {/* Footer Note */}
                <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-2 text-[9.5px] text-gray-500">
                  <span>กองพัฒนาบุคลากรกีฬา ฝ่ายพัฒนากีฬาเป็นเลิศ การกีฬาแห่งประเทศไทย</span>
                  <span>ระบบรับสมัครและฐานข้อมูลบุคลากรกีฬาออนไลน์</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
