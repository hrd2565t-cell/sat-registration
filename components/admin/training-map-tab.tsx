"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import type { Course } from "@/lib/courses";
import { getCourseFiscalYear } from "@/lib/courses";
import type { ApplicantRecord } from "@/lib/applications-store";
import {
  THAI_PROVINCES,
  THAI_REGIONS,
  type ThaiRegionKey,
  type ProvinceInfo,
} from "@/lib/provinces";

interface TrainingMapTabProps {
  courses: Course[];
  applications: ApplicantRecord[];
}

export function TrainingMapTab({ courses, applications }: TrainingMapTabProps) {
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedRegion, setSelectedRegion] = useState<ThaiRegionKey | "all">("all");
  const [selectedProvince, setSelectedProvince] = useState<ProvinceInfo | null>(null);
  const [hoveredProvince, setHoveredProvince] = useState<ProvinceInfo | null>(null);
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
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [courses]);

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

    const filteredCourses = courses.filter(
      (c) => selectedYear === "all" || getCourseFiscalYear(c) === selectedYear
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
  }, [courses, applications, selectedYear]);

  // จังหวัดที่ผ่านการกรองตามภูมิภาค
  const filteredProvinces = useMemo(() => {
    if (selectedRegion === "all") return THAI_PROVINCES;
    return THAI_PROVINCES.filter((p) => p.region === selectedRegion);
  }, [selectedRegion]);

  // ฟังก์ชันสีกราฟตามความถี่ (Heatmap Scale)
  const getProvinceColor = (count: number) => {
    if (count === 0) return "#e2e8f0"; // สีเทาอ่อน
    if (count === 1) return "#38bdf8"; // สีฟ้าสดใส
    if (count === 2) return "#2563eb"; // สีน้ำเงินมาตรฐาน
    return "#16265E"; // สีกรมท่า กกท. เข้มข้น
  };

  // ส่งออกข้อมูลเป็นไฟล์ Excel (CSV)
  const handleExportCsv = () => {
    const headers = [
      "รหัสจังหวัด",
      "ชื่อจังหวัด",
      "ชื่อภาษาอังกฤษ",
      "ภูมิภาค",
      "จำนวนหลักสูตรที่จัด (ครั้ง)",
      "งบประมาณรวมในจังหวัด (บาท)",
      "ผู้สมัครจริง (คน)",
      "อนุมัติตัวจริง (คน)",
    ];

    const rows = THAI_PROVINCES.map((p) => {
      const data = provinceStats.freqMap[p.nameTh];
      return [
        p.id,
        `"${p.nameTh}"`,
        `"${p.nameEn}"`,
        `"${p.regionNameTh}"`,
        data.courses.length,
        data.totalBudget,
        data.applicantCount,
        data.approvedCount,
      ];
    });

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `SAT_Training_Frequency_Map_${Date.now()}.csv`);
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
            ติดตามการกระจายตัวของหลักสูตรพัฒนาบุคลากรกีฬาทั่วประเทศไทย เพื่อเป็นข้อมูลเชิงยุทธศาสตร์เสนอผู้บริหาร
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

      {/* Year Filter Pills Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-gray-500 flex items-center gap-1.5 mr-1">
            <span>📅</span>
            <span>ตัวกรองปีงบประมาณ:</span>
          </span>

          <button
            type="button"
            onClick={() => setSelectedYear("all")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              selectedYear === "all"
                ? "bg-[#16265E] text-white shadow-xs"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            ทุกปีงบประมาณ ({courses.length})
          </button>

          {availableYears.map((yr) => {
            const countInYear = courses.filter((c) => getCourseFiscalYear(c) === yr).length;
            const isCurrentYear = yr === "2570";
            return (
              <button
                key={yr}
                type="button"
                onClick={() => setSelectedYear(yr)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  selectedYear === yr
                    ? "bg-[#16265E] text-white shadow-xs"
                    : isCurrentYear
                    ? "bg-blue-50 text-[#16265E] border border-blue-200 hover:bg-blue-100"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {isCurrentYear && <span>⭐️</span>}
                <span>ปี {yr}</span>
                {isCurrentYear && <span className="text-[10px] font-normal opacity-90">(ปัจจุบัน)</span>}
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedYear === yr ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"}`}>
                  {countInYear}
                </span>
              </button>
            );
          })}
        </div>

        <div className="text-xs text-gray-500">
          แสดงความถี่: <strong className="text-[#16265E]">{selectedYear === "all" ? "สะสมทุกปีงบประมาณ" : `ประจำปีงบประมาณ ${selectedYear}`}</strong>
        </div>
      </div>

      {/* Strategic Regional Metric Cards (4 Cards) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Provinces Covered */}
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/80 to-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900 uppercase">จังหวัดที่จัดอบรม</span>
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
              ครอบคลุมพื้นที่
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
        {/* Left: Interactive Thailand Heatmap SVG (7 Cols) */}
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

            {/* Heatmap Legend */}
            <div className="flex items-center gap-2 text-[10px] text-gray-600">
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded-full bg-[#e2e8f0] border border-gray-300" />
                <span>0 ครั้ง</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded-full bg-[#38bdf8]" />
                <span>1 ครั้ง</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded-full bg-[#2563eb]" />
                <span>2 ครั้ง</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded-full bg-[#16265E]" />
                <span>3+ ครั้ง</span>
              </span>
            </div>
          </div>

          {/* Region Filter Buttons */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
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

          {/* SVG Map Container */}
          <div className="relative mt-4 flex-1 min-h-[460px] flex items-center justify-center bg-gradient-to-b from-blue-50/20 to-gray-50/50 rounded-xl border border-gray-200 p-2 overflow-hidden">
            <svg
              viewBox="100 40 400 780"
              className="w-full h-full max-h-[520px] drop-shadow-xs"
            >
              {/* Regional Geographic Background Boundaries */}
              <g opacity="0.15">
                {/* North */}
                <path d="M 130 90 L 220 50 L 270 90 L 250 240 L 150 220 Z" fill="#10b981" />
                {/* Northeast */}
                <path d="M 270 160 L 410 140 L 485 320 L 310 350 Z" fill="#f59e0b" />
                {/* Central */}
                <path d="M 180 280 L 300 270 L 300 420 L 200 450 Z" fill="#3b82f6" />
                {/* East */}
                <path d="M 290 380 L 380 370 L 380 480 L 290 440 Z" fill="#a855f7" />
                {/* South */}
                <path d="M 210 500 L 230 460 L 260 670 L 305 780 L 210 740 L 170 630 Z" fill="#f43f5e" />
              </g>

              {/* Province Nodes & Interactive Markers */}
              {THAI_PROVINCES.map((p) => {
                const count = provinceStats.freqMap[p.nameTh]?.courses.length || 0;
                const color = getProvinceColor(count);
                const isSelected = selectedProvince?.id === p.id;
                const isHovered = hoveredProvince?.id === p.id;
                const isDimmed = selectedRegion !== "all" && p.region !== selectedRegion;
                const radius = count > 0 ? 8 : 4.5;

                return (
                  <g
                    key={p.id}
                    className="cursor-pointer transition-transform duration-200"
                    opacity={isDimmed ? 0.25 : 1}
                    onClick={() => setSelectedProvince(p)}
                    onMouseEnter={() => setHoveredProvince(p)}
                    onMouseLeave={() => setHoveredProvince(null)}
                  >
                    {/* Pulsing ring for provinces with courses */}
                    {count > 0 && (
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={radius + 4}
                        fill={color}
                        opacity={0.25}
                        className="animate-ping"
                      />
                    )}

                    {/* Main Node Circle */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={radius}
                      fill={color}
                      stroke={isSelected || isHovered ? "#ffffff" : "#64748b"}
                      strokeWidth={isSelected || isHovered ? 2.5 : 0.8}
                      className="transition-all"
                    />

                    {/* Province Name Label for Active/Selected Provinces */}
                    {(count > 0 || isHovered || isSelected) && (
                      <text
                        x={p.x + 9}
                        y={p.y + 3.5}
                        fontSize="9.5"
                        fontWeight={count > 0 ? "bold" : "normal"}
                        fill={count > 0 ? "#16265E" : "#475569"}
                        className="pointer-events-none select-none"
                      >
                        {p.nameTh} {count > 0 ? `(${count})` : ""}
                      </text>
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
                  className="py-2.5 flex items-center justify-between text-xs hover:bg-blue-50/40 px-2 rounded-lg cursor-pointer transition"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 font-bold text-[#16265E] text-[10px]">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-gray-900">{p.nameTh}</p>
                      <p className="text-[10.5px] text-gray-500">{p.regionNameTh}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block rounded-md bg-[#16265E] text-white px-2 py-0.5 text-[10px] font-bold">
                      {p.metrics.courses.length} หลักสูตร
                    </span>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {p.metrics.approvedCount} คน · ฿{p.metrics.totalBudget.toLocaleString("th-TH")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Regional Summary Distribution (5 Regions) */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
            <h3 className="text-sm font-bold text-[#16265E]">
              📊 การกระจายตัวตาม 5 ภูมิภาค กกท.
            </h3>
            <div className="mt-3 space-y-2.5">
              {Object.values(THAI_REGIONS).map((reg) => {
                const metric = provinceStats.regionMetrics[reg.key];
                const pct = courses.length > 0 ? Math.round((metric.courseCount / courses.length) * 100) : 0;

                return (
                  <div
                    key={reg.key}
                    onClick={() => setSelectedRegion(selectedRegion === reg.key ? "all" : reg.key)}
                    className="p-2.5 rounded-xl border border-gray-200 hover:border-blue-300 transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-gray-900">{reg.nameTh}</span>
                      <span className="font-bold text-[#16265E]">
                        {metric.courseCount} หลักสูตร ({pct}%)
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="mt-1.5 h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${pct}%`, backgroundColor: reg.barColor }}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10.5px] text-gray-500">
                      <span>ครอบคลุม {metric.provincesCovered}/{metric.totalProvinces} จังหวัด</span>
                      <span>งบรวม ฿{metric.totalBudget.toLocaleString("th-TH")}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Selected Province Details Modal / Drawer */}
      {selectedProvince && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-200 bg-[#16265E] px-6 py-4 text-white">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <span>📍</span>
                  <span>จังหวัด{selectedProvince.nameTh} ({selectedProvince.nameEn})</span>
                </h3>
                <p className="text-xs text-blue-200">
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
          </div>
        </div>
      )}

      {/* Printable Executive Modal Dialog */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-2 sm:p-4 backdrop-blur-xs print:static print:inset-auto print:block print:bg-white print:p-0">
          <style
            dangerouslySetInnerHTML={{
              __html: `
                @media print {
                  @page {
                    size: A4 landscape;
                    margin: 8mm 8mm 8mm 8mm;
                  }
                  body * {
                    visibility: hidden;
                  }
                  .map-print-container, .map-print-container * {
                    visibility: visible;
                  }
                  .map-print-container {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    background: white !important;
                  }
                }
              `,
            }}
          />

          <div className="relative my-auto flex max-h-[96vh] w-full max-w-[1240px] flex-col rounded-2xl bg-white shadow-2xl print:my-0 print:max-h-none print:w-full print:rounded-none print:shadow-none">
            {/* Top Toolbar */}
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
