"use client";

import { useMemo, useState, useRef } from "react";
import type { UniquePersonTrainee } from "@/lib/alumni-store";

interface TopTraineesModalProps {
  onClose: () => void;
  uniquePersons: UniquePersonTrainee[];
  onOpenPassport: (idCard: string) => void;
  onOpenDigitalPass: (idCard: string) => void;
}

export function TopTraineesModal({
  onClose,
  uniquePersons,
  onOpenPassport,
  onOpenDigitalPass,
}: TopTraineesModalProps) {
  const printDocRef = useRef<HTMLDivElement>(null);

  // Filter & Search states
  const [filterTier, setFilterTier] = useState<"all" | "top" | "tier6" | "tier4">("all");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Thai Date Formatter
  const printedDateThai = useMemo(() => {
    const now = new Date();
    const monthsThai = [
      "มกราคม",
      "กุมภาพันธ์",
      "มีนาคม",
      "เมษายน",
      "พฤษภาคม",
      "มิถุนายน",
      "กรกฎาคม",
      "สิงหาคม",
      "กันยายน",
      "ตุลาคม",
      "พฤศจิกายน",
      "ธันวาคม",
    ];
    const day = now.getDate();
    const month = monthsThai[now.getMonth()];
    const yearBE = now.getFullYear() + 543;
    const time = now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
    return `${day} ${month} พ.ศ. ${yearBE} เวลา ${time} น.`;
  }, []);

  // Sorted list of all unique persons by totalCourses descending
  const rankedPersons = useMemo(() => {
    const sorted = [...uniquePersons].sort((a, b) => {
      if (b.totalCourses !== a.totalCourses) {
        return b.totalCourses - a.totalCourses;
      }
      return b.latestYearBE - a.latestYearBE;
    });
    return sorted;
  }, [uniquePersons]);

  // Executive Tier Statistics
  const executiveStats = useMemo(() => {
    const maxCoursePerson = rankedPersons[0];
    const tier6Plus = rankedPersons.filter((p) => p.totalCourses >= 6);
    const tier4Plus = rankedPersons.filter((p) => p.totalCourses >= 4);
    const tier2Plus = rankedPersons.filter((p) => p.totalCourses >= 2);

    return {
      maxCourses: maxCoursePerson ? maxCoursePerson.totalCourses : 0,
      maxPersonName: maxCoursePerson ? maxCoursePerson.name : "-",
      maxPersonAffil: maxCoursePerson ? maxCoursePerson.affiliation : "-",
      tier6Count: tier6Plus.length,
      tier4Count: tier4Plus.length,
      tier2Count: tier2Plus.length,
      totalUniquePersonnel: rankedPersons.length,
    };
  }, [rankedPersons]);

  // Filtered list based on user selections
  const filteredRanked = useMemo(() => {
    return rankedPersons.filter((p) => {
      // Tier filter
      if (filterTier === "top" && p.totalCourses < 7) return false;
      if (filterTier === "tier6" && p.totalCourses < 6) return false;
      if (filterTier === "tier4" && p.totalCourses < 4) return false;

      // Group filter
      if (selectedGroup !== "all" && p.affiliationGroup !== selectedGroup) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchAffil = p.affiliation.toLowerCase().includes(q);
        const matchId = p.personnelId.toLowerCase().includes(q);
        const matchCourse = p.courses.some((c) => c.courseTitle.toLowerCase().includes(q));
        if (!matchName && !matchAffil && !matchId && !matchCourse) return false;
      }

      return true;
    });
  }, [rankedPersons, filterTier, selectedGroup, searchQuery]);

  // Isolated Printing: uses a hidden iframe so ONLY the Executive Report is printed on A4 Landscape
  const handlePrint = () => {
    const printElem = printDocRef.current || document.getElementById("top-trainees-print-document");
    if (!printElem) {
      window.print();
      return;
    }

    try {
      const existingFrame = document.getElementById("sat-top-trainees-print-iframe");
      if (existingFrame) existingFrame.remove();

      const iframe = document.createElement("iframe");
      iframe.id = "sat-top-trainees-print-iframe";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.style.visibility = "hidden";
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow?.document;
      if (!frameDoc) {
        window.print();
        return;
      }

      const styles = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))
        .map((el) => el.outerHTML)
        .join("\n");

      frameDoc.open();
      frameDoc.write(`
        <!DOCTYPE html>
        <html lang="th">
        <head>
          <meta charset="utf-8" />
          <title>ทำเนียบผู้ผ่านการอบรมสะสมสูงสุด - กกท.</title>
          ${styles}
          <style>
            @page {
              size: A4 landscape;
              margin: 6mm 8mm;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #fff !important;
              color: #0f172a !important;
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            }
            #top-trainees-print-document {
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
              box-shadow: none !important;
            }
            .no-print {
              display: none !important;
            }
          </style>
        </head>
        <body>
          <div style="width: 100%; padding: 4px;">
            ${printElem.outerHTML}
          </div>
        </body>
        </html>
      `);
      frameDoc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          window.print();
        }
      }, 300);
    } catch {
      window.print();
    }
  };

  // Helper for Rank Badge Styling
  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-400 text-amber-950 font-black text-xs shadow-xs border border-amber-300">
          🥇
        </span>
      );
    }
    if (rank === 2 || rank === 3) {
      return (
        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-300 text-slate-800 font-black text-xs shadow-xs border border-slate-400">
          🥈
        </span>
      );
    }
    if (rank <= 10) {
      return (
        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-700/20 text-amber-900 font-black text-xs shadow-xs border border-amber-600/30">
          🥉
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-gray-100 text-gray-700 font-mono font-bold text-[11px] border border-gray-200">
        {rank}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible">
      {/* Global Print Fallback Styles */}
      <style>{`
        @page {
          size: A4 landscape;
          margin: 6mm 8mm;
        }
        @media print {
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          #top-trainees-print-document,
          #top-trainees-print-document * {
            visibility: visible !important;
          }
          #top-trainees-print-document {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Outer Modal Container */}
      <div className="relative w-full max-w-[1240px] max-h-[96vh] flex flex-col rounded-2xl bg-gray-100 shadow-2xl border border-gray-300 overflow-hidden print:max-h-none print:max-w-none print:w-full print:border-none print:shadow-none print:bg-white print:overflow-visible">
        {/* Top Control Bar */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 bg-[#16265E] px-5 py-3.5 text-white shadow-md">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 text-xl shadow-xs">
              🏆
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white">
                  ทำเนียบผู้ผ่านการอบรมสะสมสูงสุด (Executive Hall of Fame)
                </h3>
                <span className="rounded-md bg-amber-400 px-2 py-0.5 text-[10px] font-black text-[#1e1b4b]">
                  รายงานสำหรับผู้บริหาร
                </span>
              </div>
              <p className="text-xs text-blue-200">
                บุคลากรเดี่ยวสะสม 1,943 คน • จัดอันดับผู้ที่ผ่านการอบรม Upskill / Reskill ต่อเนื่องมากที่สุด
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-[#1e1b4b] px-4 py-2 text-xs sm:text-sm font-black shadow-md transition-all cursor-pointer"
            >
              <span>🖨️</span>
              <span>พิมพ์รายงานผู้บริหาร (PDF)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer"
            >
              ✕ ปิด
            </button>
          </div>
        </div>

        {/* Modal Scrollable Workspace */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center bg-gray-200/90 print:p-0 print:bg-white print:overflow-visible space-y-4">
          {/* On-screen Filter Toolbar (no-print) */}
          <div className="no-print w-full max-w-[1120px] rounded-xl border border-gray-200 bg-white p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Tier Filters */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-gray-700 mr-1">เกณฑ์แสดงผล:</span>
              <button
                type="button"
                onClick={() => setFilterTier("all")}
                className={`rounded-lg px-2.5 py-1 font-semibold transition-colors cursor-pointer ${
                  filterTier === "all"
                    ? "bg-[#16265E] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                ทั้งหมด (Top {rankedPersons.filter((p) => p.totalCourses >= 2).length} คน)
              </button>
              <button
                type="button"
                onClick={() => setFilterTier("top")}
                className={`rounded-lg px-2.5 py-1 font-semibold transition-colors cursor-pointer ${
                  filterTier === "top"
                    ? "bg-amber-500 text-amber-950 font-black"
                    : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
                }`}
              >
                🥇 ระดับสูงสุด (≥ 7 หลักสูตร: 3 คน)
              </button>
              <button
                type="button"
                onClick={() => setFilterTier("tier6")}
                className={`rounded-lg px-2.5 py-1 font-semibold transition-colors cursor-pointer ${
                  filterTier === "tier6"
                    ? "bg-purple-700 text-white font-bold"
                    : "bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200"
                }`}
              >
                🥈 ระดับเชี่ยวชาญ (≥ 6 หลักสูตร: 16 คน)
              </button>
              <button
                type="button"
                onClick={() => setFilterTier("tier4")}
                className={`rounded-lg px-2.5 py-1 font-semibold transition-colors cursor-pointer ${
                  filterTier === "tier4"
                    ? "bg-blue-700 text-white font-bold"
                    : "bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200"
                }`}
              >
                🥉 ระดับพัฒนาสูง (≥ 4 หลักสูตร: 78 คน)
              </button>
            </div>

            {/* Search within Top Trainees */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="ค้นหาชื่อ, สังกัด หรือหลักสูตร..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-1 text-xs text-gray-800 focus:border-[#16265E] focus:bg-white focus:outline-hidden w-48 sm:w-56"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-gray-400 hover:text-gray-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* THE EXACT PRINTABLE A4 LANDSCAPE EXECUTIVE DOCUMENT CONTAINER */}
          {/* ========================================================================= */}
          <div
            id="top-trainees-print-document"
            ref={printDocRef}
            className="w-full max-w-[1120px] bg-white rounded-lg shadow-xl p-6 sm:p-7 text-gray-900 border border-gray-300 text-[11px] leading-tight space-y-3 print:p-0 print:border-none print:shadow-none"
          >
            {/* 1. Official SAT Header */}
            <div className="border-b-2 border-[#16265E] pb-2.5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#16265E] text-white shadow-sm font-black text-xl border-2 border-amber-400">
                    กกท
                  </div>
                  <div>
                    <h1 className="text-base sm:text-lg font-black tracking-tight text-[#16265E]">
                      การกีฬาแห่งประเทศไทย (Sports Authority of Thailand)
                    </h1>
                    <p className="text-xs font-bold text-gray-700">
                      ฝ่ายพัฒนาบุคลากรกีฬา • กองพัฒนาบุคลากรกีฬา
                    </p>
                    <p className="text-xs font-semibold text-blue-900 mt-0.5">
                      รายงานทำเนียบบุคลากรกีฬาที่ผ่านการฝึกอบรมสะสมสูงสุด (Executive Briefing: Top Trained Personnel พ.ศ. 2547 – 2569)
                    </p>
                  </div>
                </div>

                <div className="text-right text-[11px] text-gray-600 space-y-0.5 shrink-0">
                  <div className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 border border-amber-300 px-2 py-0.5 text-[10.5px] font-bold text-amber-900 mb-1">
                    <span>ทำเนียบเกียรติยศ (Hall of Fame)</span>
                  </div>
                  <p>
                    <strong>บุคลากรเดี่ยวสะสม:</strong> 1,943 คน
                  </p>
                  <p className="text-gray-500">
                    <strong>วันที่พิมพ์:</strong> {printedDateThai}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Executive KPI Summary Strip (4 Cards) */}
            <div className="grid grid-cols-4 gap-2.5">
              {/* Card 1: Record Holder */}
              <div className="rounded-lg border border-amber-300 bg-amber-50/70 p-2.5">
                <div className="flex items-center justify-between text-[10px] text-amber-900 font-bold uppercase">
                  <span>🥇 ผ่านการอบรมสูงสุด</span>
                  <span className="bg-amber-400 text-amber-950 px-1.5 py-0.2 rounded font-black text-[9px]">
                    อันดับ 1
                  </span>
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl font-black text-amber-900">
                    {executiveStats.maxCourses}
                  </span>
                  <span className="text-[10px] text-amber-950 font-bold">หลักสูตร</span>
                </div>
                <p className="text-[9.5px] text-amber-900 mt-0.5 border-t border-amber-200 pt-1 truncate">
                  {executiveStats.maxPersonName}
                </p>
              </div>

              {/* Card 2: Tier 6+ Courses */}
              <div className="rounded-lg border border-purple-200 bg-purple-50/60 p-2.5">
                <div className="flex items-center justify-between text-[10px] text-purple-900 font-bold uppercase">
                  <span>🥈 ระดับเชี่ยวชาญพิเศษ</span>
                  <span className="bg-purple-600 text-white px-1.5 py-0.2 rounded font-black text-[9px]">
                    ≥ 6 หลักสูตร
                  </span>
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl font-black text-purple-900">
                    {executiveStats.tier6Count}
                  </span>
                  <span className="text-[10px] text-purple-950 font-bold">คน</span>
                </div>
                <p className="text-[9.5px] text-purple-800 mt-0.5 border-t border-purple-200/60 pt-1">
                  กลุ่มผู้นำด้านการบริหารและวิชาการกีฬา
                </p>
              </div>

              {/* Card 3: Tier 4+ Courses */}
              <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-2.5">
                <div className="flex items-center justify-between text-[10px] text-blue-900 font-bold uppercase">
                  <span>🥉 ระดับพัฒนาต่อเนื่องสูง</span>
                  <span className="bg-blue-600 text-white px-1.5 py-0.2 rounded font-black text-[9px]">
                    ≥ 4 หลักสูตร
                  </span>
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl font-black text-[#16265E]">
                    {executiveStats.tier4Count}
                  </span>
                  <span className="text-[10px] text-gray-600 font-semibold">คน</span>
                </div>
                <p className="text-[9.5px] text-gray-500 mt-0.5 border-t border-blue-200/60 pt-1">
                  Upskill / Reskill ข้ามสายวิชาชีพ
                </p>
              </div>

              {/* Card 4: Returning Cohort */}
              <div className="rounded-lg border border-emerald-300 bg-emerald-50/70 p-2.5">
                <div className="flex items-center justify-between text-[10px] text-emerald-900 font-bold uppercase">
                  <span>🔄 ศิษย์เก่าต่อยอดรวม</span>
                  <span className="bg-emerald-600 text-white px-1.5 py-0.2 rounded font-black text-[9px]">
                    ≥ 2 หลักสูตร
                  </span>
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl font-black text-emerald-700">
                    {executiveStats.tier2Count}
                  </span>
                  <span className="text-[10px] text-emerald-900 font-semibold">
                    / {executiveStats.totalUniquePersonnel} คน
                  </span>
                </div>
                <p className="text-[9.5px] text-emerald-800 mt-0.5 border-t border-emerald-200 pt-1">
                  คิดเป็น {Math.round((executiveStats.tier2Count / executiveStats.totalUniquePersonnel) * 100)}% ของบุคลากรทั้งหมด
                </p>
              </div>
            </div>

            {/* 3. The Top Trainees Ranking Table */}
            <div className="overflow-hidden rounded-lg border border-gray-300">
              <table className="w-full border-collapse text-[10px]">
                <thead>
                  <tr className="bg-[#16265E] text-white">
                    <th className="py-2 px-1.5 text-center font-bold w-10">อันดับ</th>
                    <th className="py-2 px-2.5 text-left font-bold min-w-[140px]">ชื่อ - สกุล</th>
                    <th className="py-2 px-2.5 text-left font-bold min-w-[170px]">หน่วยงาน / สมาคมกีฬา</th>
                    <th className="py-2 px-2 text-left font-bold min-w-[95px]">กลุ่มสังกัด</th>
                    <th className="py-2 px-2 text-center font-black bg-amber-500 text-amber-950 w-20">
                      จำนวนหลักสูตร
                    </th>
                    <th className="py-2 px-2 text-center font-bold min-w-[70px]">ช่วงปีที่อบรม</th>
                    <th className="py-2 px-2.5 text-left font-bold min-w-[240px]">
                      หลักสูตรที่สำเร็จการอบรม (ปี พ.ศ.)
                    </th>
                    <th className="py-2 px-2 text-center font-bold w-16 no-print">การทำงาน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRanked.slice(0, 30).map((person, idx) => {
                    const isTop1 = idx === 0;
                    return (
                      <tr
                        key={person.personnelId || idx}
                        className={
                          isTop1
                            ? "bg-amber-50/80 font-semibold"
                            : idx < 3
                            ? "bg-slate-50/80"
                            : idx % 2 === 0
                            ? "bg-white"
                            : "bg-slate-50/50"
                        }
                      >
                        {/* Rank */}
                        <td className="py-1.5 px-1.5 text-center">
                          {getRankBadge(idx + 1)}
                        </td>

                        {/* Name */}
                        <td className="py-1.5 px-2.5 font-bold text-[#16265E] whitespace-nowrap">
                          {person.name}
                        </td>

                        {/* Affiliation */}
                        <td className="py-1.5 px-2.5 text-gray-700 truncate max-w-[200px]" title={person.affiliation}>
                          {person.affiliation}
                        </td>

                        {/* Affiliation Group */}
                        <td className="py-1.5 px-2">
                          <span className="rounded bg-blue-50 px-1.5 py-0.2 text-[9px] font-semibold text-blue-900 border border-blue-200 whitespace-nowrap">
                            {person.affiliationGroup || "หน่วยงานภายนอก"}
                          </span>
                        </td>

                        {/* Total Courses */}
                        <td className="py-1.5 px-2 text-center font-black">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${
                              person.totalCourses >= 7
                                ? "bg-amber-400 text-amber-950 shadow-2xs"
                                : person.totalCourses >= 6
                                ? "bg-purple-100 text-purple-900 border border-purple-300"
                                : person.totalCourses >= 4
                                ? "bg-blue-100 text-blue-900 border border-blue-200"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {person.totalCourses} หลักสูตร
                          </span>
                        </td>

                        {/* Years Span */}
                        <td className="py-1.5 px-2 text-center text-gray-600 font-mono text-[9.5px] whitespace-nowrap">
                          {person.firstYearBE === person.latestYearBE
                            ? `พ.ศ. ${person.latestYearBE}`
                            : `${person.firstYearBE} - ${person.latestYearBE}`}
                        </td>

                        {/* Courses list */}
                        <td className="py-1.5 px-2.5 text-gray-700">
                          <div className="flex flex-wrap gap-1">
                            {person.courses.map((c, cIdx) => (
                              <span
                                key={cIdx}
                                className="rounded bg-gray-100 px-1.5 py-0.2 text-[8.5px] text-gray-800 border border-gray-200"
                              >
                                {c.courseTitle} &apos;{String(c.yearBE).slice(2)}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Actions (Screen only) */}
                        <td className="py-1.5 px-2 text-center no-print">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onOpenPassport(person.personnelId);
                              }}
                              className="rounded bg-[#16265E] px-1.5 py-0.5 text-[9px] font-bold text-white hover:bg-[#1e3a8a] transition-colors cursor-pointer"
                              title="เปิดพาสปอร์ตบุคลากร"
                            >
                              🪪 พาสปอร์ต
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onOpenDigitalPass(person.personnelId);
                              }}
                              className="rounded bg-amber-400 px-1.5 py-0.5 text-[9px] font-bold text-amber-950 hover:bg-amber-500 transition-colors cursor-pointer"
                              title="เปิดบัตรดิจิทัล"
                            >
                              📱 บัตร
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 4. Document Footer */}
            <div className="pt-2 border-t border-gray-200 flex items-center justify-between text-[9px] text-gray-500">
              <p>
                <strong>แหล่งข้อมูล:</strong> ระบบฐานข้อมูลทำเนียบบุคลากรกีฬาและประเมินผลโครงการ ฝ่ายพัฒนาบุคลากรกีฬา กกท. (SAT Personnel Directory & Continuity System)
              </p>
              <p className="font-semibold text-gray-700">
                เอกสารสำหรับรายงานผู้บริหาร • หน้า 1 จาก 1 (Page 1 of 1)
              </p>
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="no-print flex items-center justify-between bg-white border-t border-gray-200 px-5 py-3 text-xs">
          <span className="text-gray-500 text-[11px]">
            💡 แสดงข้อมูลเรียงจากผู้ที่ผ่านการอบรมมากที่สุดไปยังน้อยที่สุด • สามารถคลิกดูพาสปอร์ตหรือบัตรดิจิทัลของแต่ละท่านได้
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-3 py-1.5 font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#16265E] hover:bg-[#1e3a8a] text-white px-4 py-1.5 font-bold shadow-xs transition-colors cursor-pointer"
            >
              <span>🖨️</span>
              <span>สั่งพิมพ์รายงานผู้บริหาร (PDF)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
