"use client";

import { useMemo, useRef } from "react";
import type { CourseMatrixRow, YearCohortSummary } from "@/lib/alumni-store";

interface MatrixReportPrintModalProps {
  onClose: () => void;
  matrixData: CourseMatrixRow[];
  matrixTotals: {
    "การกีฬาแห่งประเทศไทย": number;
    "กองทุนพัฒนาการกีฬาแห่งชาติ": number;
    "สมาคมกีฬาแห่งประเทศไทย": number;
    "สมาคมกีฬาแห่งจังหวัด": number;
    "หน่วยงานภายนอก": number;
    grandTotal: number;
    grandTarget: number;
  };
  cohortSummary: YearCohortSummary;
  selectedYear: string;
  selectedCategory: string;
  overallAchievementRate: number;
}

export function MatrixReportPrintModal({
  onClose,
  matrixData,
  matrixTotals,
  cohortSummary,
  selectedYear,
  selectedCategory,
  overallAchievementRate,
}: MatrixReportPrintModalProps) {
  const printDocRef = useRef<HTMLDivElement>(null);

  // Format current Thai date
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

  // Isolated Printing: uses a hidden iframe so ONLY the A4 report is printed with zero spillover
  const handlePrint = () => {
    const printElem = printDocRef.current || document.getElementById("matrix-print-document");
    if (!printElem) {
      window.print();
      return;
    }

    try {
      const existingFrame = document.getElementById("sat-matrix-print-iframe");
      if (existingFrame) existingFrame.remove();

      const iframe = document.createElement("iframe");
      iframe.id = "sat-matrix-print-iframe";
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

      // Collect all active styles
      const styles = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))
        .map((el) => el.outerHTML)
        .join("\n");

      frameDoc.open();
      frameDoc.write(`
        <!DOCTYPE html>
        <html lang="th">
        <head>
          <meta charset="utf-8" />
          <title>รายงานผลหลักสูตร แยกจำนวนคนตามกลุ่มหน่วยงาน - กกท.</title>
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
            #matrix-print-document {
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

  const newGovCount = cohortSummary.newByGroup["การกีฬาแห่งประเทศไทย"] || 0;
  const newNsdfCount = cohortSummary.newByGroup["กองทุนพัฒนาการกีฬาแห่งชาติ"] || 0;
  const newSatThaiCount = cohortSummary.newByGroup["สมาคมกีฬาแห่งประเทศไทย"] || 0;
  const newProvCount = cohortSummary.newByGroup["สมาคมกีฬาแห่งจังหวัด"] || 0;
  const newOutCount = cohortSummary.newByGroup["หน่วยงานภายนอก"] || 0;

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
          #matrix-print-document,
          #matrix-print-document * {
            visibility: visible !important;
          }
          #matrix-print-document {
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

      {/* Outer Modal Container (Notice: no 'no-print' here so children can print) */}
      <div className="relative w-full max-w-[1240px] max-h-[96vh] flex flex-col rounded-2xl bg-gray-100 shadow-2xl border border-gray-300 overflow-hidden print:max-h-none print:max-w-none print:w-full print:border-none print:shadow-none print:bg-white print:overflow-visible">
        {/* Top Control Bar (Hidden on print) */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 bg-[#16265E] px-5 py-3.5 text-white shadow-md">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-lg">
              🖨️
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold">
                  ตัวอย่างก่อนพิมพ์ (Print Preview) • รายงานผลหลักสูตร แยกตามกลุ่มหน่วยงาน
                </h3>
                <span className="rounded-md bg-amber-400 px-2 py-0.5 text-[10px] font-black text-[#1e1b4b]">
                  A4 แนวนอน (Landscape)
                </span>
              </div>
              <p className="text-xs text-blue-200">
                ปีงบประมาณ:{" "}
                <span className="font-semibold text-white">
                  {selectedYear === "all" ? "รวมสะสมทุกปีงบประมาณ (2547 - 2569)" : `พ.ศ. ${selectedYear}`}
                </span>{" "}
                • สายวิชาชีพ:{" "}
                <span className="font-semibold text-white">
                  {selectedCategory === "all" ? "ทุกสายวิชาชีพ" : selectedCategory}
                </span>{" "}
                • จำนวน: {matrixData.length} หลักสูตร
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-4 py-2 text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer"
            >
              <span>🖨️</span>
              <span>สั่งพิมพ์ / บันทึก PDF</span>
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex justify-center bg-gray-200/90 print:p-0 print:bg-white print:overflow-visible">
          {/* ========================================================================= */}
          {/* THE EXACT PRINTABLE A4 LANDSCAPE DOCUMENT CONTAINER */}
          {/* ========================================================================= */}
          <div
            id="matrix-print-document"
            ref={printDocRef}
            className="w-full max-w-[1120px] bg-white rounded-lg shadow-xl p-6 sm:p-7 text-gray-900 border border-gray-300 text-[11px] leading-tight space-y-3 print:p-0 print:border-none print:shadow-none"
          >
            {/* 1. Official Header */}
            <div className="border-b-2 border-[#16265E] pb-2.5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  {/* Official Emblem Icon Badge */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#16265E] text-white shadow-sm font-black text-xl border-2 border-amber-400">
                    กกท
                  </div>
                  <div>
                    <h1 className="text-base sm:text-lg font-black tracking-tight text-[#16265E]">
                      การกีฬาแห่งประเทศไทย (Sports Authority of Thailand)
                    </h1>
                    <p className="text-xs font-bold text-gray-700">
                      กองพัฒนาบุคลากรกีฬา ฝ่ายพัฒนากีฬาเป็นเลิศ
                    </p>
                    <p className="text-xs font-semibold text-blue-900 mt-0.5">
                      รายงานผลสัมฤทธิ์หลักสูตรฝึกอบรม แยกจำนวนคนตามกลุ่มหน่วยงาน (Cross-Tabulation Matrix)
                    </p>
                  </div>
                </div>

                <div className="text-right text-[11px] text-gray-600 space-y-0.5 shrink-0">
                  <div className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10.5px] font-bold text-[#16265E] mb-1">
                    <span>ปีงบประมาณ {selectedYear === "all" ? "รวมสะสมทุกปี" : `พ.ศ. ${selectedYear}`}</span>
                  </div>
                  <p>
                    <strong>สายวิชาชีพ:</strong>{" "}
                    {selectedCategory === "all" ? "ทุกสายวิชาชีพ" : selectedCategory}
                  </p>
                  <p className="text-gray-500">
                    <strong>วันที่พิมพ์:</strong> {printedDateThai}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Cohort Summary Metric Strip (Matching On-Screen 4 Cards) */}
            <div className="rounded-lg border border-blue-200 bg-blue-50/30 p-2.5 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="font-black text-[#16265E]">
                    สรุปข้อมูลบุคลากรเดี่ยวแท้จริง {selectedYear === "all" ? "(รวมสะสมทุกปีงบประมาณ)" : `ประจำปีงบประมาณ พ.ศ. ${selectedYear}`}
                  </span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.2 text-[9px] font-bold text-emerald-800 border border-emerald-300">
                    Cohort Analysis
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-gray-600">
                    อัตราการบรรลุเป้าหมายภาพรวม:
                  </span>
                  <span
                    className={`font-black px-1.5 py-0.2 rounded text-[9.5px] ${
                      overallAchievementRate >= 100
                        ? "bg-emerald-600 text-white"
                        : overallAchievementRate >= 80
                        ? "bg-amber-500 text-white"
                        : "bg-rose-600 text-white"
                    }`}
                  >
                    {overallAchievementRate}% ({matrixTotals.grandTotal} / {matrixTotals.grandTarget} คน)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {/* Card 1: Unique Individuals */}
                <div className="rounded-md border border-blue-200 bg-white p-2">
                  <div className="flex items-center justify-between text-[9.5px] font-bold text-gray-500 uppercase">
                    <span>👥 บุคลากรเดี่ยวแท้จริง</span>
                    <span className="rounded bg-blue-100 px-1 py-0.2 text-[8.5px] font-extrabold text-[#16265E]">
                      บุคคลจริง
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-lg font-black text-[#16265E]">
                      {cohortSummary.uniquePersons.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-gray-500">คน</span>
                  </div>
                  <div className="mt-1 text-[9px] text-gray-500 flex items-center justify-between border-t border-gray-100 pt-0.5">
                    <span>จากยอดอบรม {cohortSummary.totalRecords.toLocaleString()} ที่นั่ง</span>
                    <span className={cohortSummary.duplicateEnrollments > 0 ? "font-bold text-amber-600" : "text-gray-400"}>
                      {cohortSummary.duplicateEnrollments > 0 ? `ซ้ำ ${cohortSummary.duplicateEnrollments}` : "ไม่มีซ้ำ"}
                    </span>
                  </div>
                </div>

                {/* Card 2: New Trainees */}
                <div className="rounded-md border border-emerald-300 bg-emerald-50/60 p-2">
                  <div className="flex items-center justify-between text-[9.5px] font-bold text-emerald-900 uppercase">
                    <span>🌱 บุคลากรหน้าใหม่</span>
                    <span className="rounded bg-emerald-600 px-1 py-0.2 text-[8.5px] font-extrabold text-white">
                      {cohortSummary.newPercentage}%
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-lg font-black text-emerald-700">
                      {cohortSummary.newCount.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-emerald-900 font-bold">คน</span>
                  </div>
                  <div className="mt-1 text-[9px] text-emerald-800 border-t border-emerald-200/60 pt-0.5 flex items-center justify-between">
                    <span>เพิ่งเข้าสู่ระบบ กกท. ครั้งแรก</span>
                    <span className="font-extrabold text-emerald-900">+{cohortSummary.newCount}</span>
                  </div>
                </div>

                {/* Card 3: Returning / Upskill Trainees */}
                <div className="rounded-md border border-indigo-200 bg-indigo-50/50 p-2">
                  <div className="flex items-center justify-between text-[9.5px] font-bold text-indigo-900 uppercase">
                    <span>🔄 บุคลากรเดิมพัฒนาต่อ</span>
                    <span className="rounded bg-indigo-600 px-1 py-0.2 text-[8.5px] font-extrabold text-white">
                      {cohortSummary.returningPercentage}%
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-lg font-black text-indigo-800">
                      {cohortSummary.returningCount.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-indigo-900 font-bold">คน</span>
                  </div>
                  <div className="mt-1 text-[9px] text-indigo-700 border-t border-indigo-200/60 pt-0.5 flex items-center justify-between">
                    <span>ศิษย์เก่ากลับมา Upskill</span>
                    <span className="font-bold text-indigo-900">{cohortSummary.returningCount} คน</span>
                  </div>
                </div>

                {/* Card 4: New Trainees Affiliation Breakdown */}
                <div className="rounded-md border border-gray-200 bg-white p-2 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[9.5px] font-bold text-gray-700">
                    <span>🏛️ สังกัดของบุคลากรหน้าใหม่</span>
                    <span className="text-[8.5px] text-gray-500">5 กลุ่มหน่วยงาน</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1 mt-1 text-[8.5px] text-center">
                    <div className="rounded bg-purple-50 p-0.5 border border-purple-100">
                      <div className="text-gray-500 text-[8px] truncate">กกท.</div>
                      <div className="font-bold text-purple-700">{newGovCount}</div>
                    </div>
                    <div className="rounded bg-sky-50 p-0.5 border border-sky-100">
                      <div className="text-gray-500 text-[8px] truncate">กองทุน</div>
                      <div className="font-bold text-sky-700">{newNsdfCount}</div>
                    </div>
                    <div className="rounded bg-blue-50 p-0.5 border border-blue-100">
                      <div className="text-gray-500 text-[8px] truncate">สมาคมฯ</div>
                      <div className="font-bold text-blue-700">{newSatThaiCount}</div>
                    </div>
                    <div className="rounded bg-amber-50 p-0.5 border border-amber-100">
                      <div className="text-gray-500 text-[8px] truncate">จังหวัด</div>
                      <div className="font-bold text-amber-700">{newProvCount}</div>
                    </div>
                    <div className="rounded bg-emerald-50 p-0.5 border border-emerald-100">
                      <div className="text-gray-500 text-[8px] truncate">ภายนอก</div>
                      <div className="font-bold text-emerald-700">{newOutCount}</div>
                    </div>
                  </div>
                  {/* Distribution Bar */}
                  <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden flex mt-1">
                    <div
                      style={{ width: `${cohortSummary.newCount > 0 ? (newGovCount / cohortSummary.newCount) * 100 : 0}%` }}
                      className="bg-purple-600"
                    />
                    <div
                      style={{ width: `${cohortSummary.newCount > 0 ? (newNsdfCount / cohortSummary.newCount) * 100 : 0}%` }}
                      className="bg-sky-500"
                    />
                    <div
                      style={{ width: `${cohortSummary.newCount > 0 ? (newSatThaiCount / cohortSummary.newCount) * 100 : 0}%` }}
                      className="bg-blue-600"
                    />
                    <div
                      style={{ width: `${cohortSummary.newCount > 0 ? (newProvCount / cohortSummary.newCount) * 100 : 0}%` }}
                      className="bg-amber-500"
                    />
                    <div
                      style={{ width: `${cohortSummary.newCount > 0 ? (newOutCount / cohortSummary.newCount) * 100 : 0}%` }}
                      className="bg-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. The Cross-Tabulation Matrix Table (Optimized for 1-page A4 Landscape) */}
            <div className="overflow-hidden rounded-lg border border-gray-300">
              <table className="w-full border-collapse text-[10px]">
                <thead>
                  <tr className="bg-[#16265E] text-white">
                    <th className="py-2 px-1.5 text-center font-bold w-6">#</th>
                    <th className="py-2 px-2 text-left font-bold min-w-[150px]">ชื่อหลักสูตร</th>
                    <th className="py-2 px-2 text-left font-bold min-w-[85px]">ประเภท</th>
                    <th className="py-2 px-1.5 text-center font-bold bg-purple-900 border-l border-blue-900 min-w-[70px]">
                      การกีฬาแห่งประเทศไทย
                    </th>
                    <th className="py-2 px-1.5 text-center font-bold bg-sky-900 border-l border-blue-900 min-w-[75px]">
                      กองทุนพัฒนาการกีฬา
                    </th>
                    <th className="py-2 px-1.5 text-center font-bold bg-blue-900 border-l border-blue-900 min-w-[75px]">
                      สมาคมกีฬาแห่งประเทศไทย
                    </th>
                    <th className="py-2 px-1.5 text-center font-bold bg-amber-900 border-l border-blue-900 min-w-[70px]">
                      สมาคมกีฬาแห่งจังหวัด
                    </th>
                    <th className="py-2 px-1.5 text-center font-bold bg-emerald-900 border-l border-blue-900 min-w-[70px]">
                      หน่วยงานภายนอก
                    </th>
                    <th className="py-2 px-1.5 text-center font-bold bg-indigo-950 border-l border-blue-900 min-w-[65px]">
                      ค่าเป้าหมาย (คน)
                    </th>
                    <th className="py-2 px-1.5 text-center font-black text-amber-300 border-l border-blue-900 min-w-[65px]">
                      ผ่านจริง (คน)
                    </th>
                    <th className="py-2 px-1.5 text-center font-bold bg-sky-950 border-l border-blue-900 min-w-[65px]">
                      % บรรลุเป้า
                    </th>
                    <th className="py-2 px-1.5 text-center font-bold border-l border-blue-900 min-w-[75px]">
                      ผลการประเมิน
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {matrixData.map((row, idx) => {
                    const satGovCount = row.groups["การกีฬาแห่งประเทศไทย"] || 0;
                    const nsdfCount = row.groups["กองทุนพัฒนาการกีฬาแห่งชาติ"] || 0;
                    const satThaiCount = row.groups["สมาคมกีฬาแห่งประเทศไทย"] || 0;
                    const provCount = row.groups["สมาคมกีฬาแห่งจังหวัด"] || 0;
                    const outCount = row.groups["หน่วยงานภายนอก"] || 0;

                    const satGovPct = row.percentByGroup["การกีฬาแห่งประเทศไทย"] || 0;
                    const nsdfPct = row.percentByGroup["กองทุนพัฒนาการกีฬาแห่งชาติ"] || 0;
                    const satThaiPct = row.percentByGroup["สมาคมกีฬาแห่งประเทศไทย"] || 0;
                    const provPct = row.percentByGroup["สมาคมกีฬาแห่งจังหวัด"] || 0;
                    const outPct = row.percentByGroup["หน่วยงานภายนอก"] || 0;

                    return (
                      <tr
                        key={row.courseTitle}
                        className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"}
                      >
                        <td className="py-1.5 px-1.5 text-center text-gray-500 font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-1.5 px-2 font-bold text-[#16265E] truncate max-w-[210px]">
                          {row.courseTitle}
                        </td>
                        <td className="py-1.5 px-2 text-gray-700 truncate max-w-[95px]">
                          {row.category}
                        </td>

                        {/* 5 Agency Columns with counts and percentages */}
                        <td className="py-1.5 px-1.5 text-center border-l border-gray-200">
                          {satGovCount > 0 ? (
                            <span className="font-bold text-purple-900">
                              {satGovCount}{" "}
                              <span className="text-[9px] text-gray-500 font-normal">
                                ({satGovPct}%)
                              </span>
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="py-1.5 px-1.5 text-center border-l border-gray-200">
                          {nsdfCount > 0 ? (
                            <span className="font-bold text-sky-900">
                              {nsdfCount}{" "}
                              <span className="text-[9px] text-gray-500 font-normal">
                                ({nsdfPct}%)
                              </span>
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="py-1.5 px-1.5 text-center border-l border-gray-200">
                          {satThaiCount > 0 ? (
                            <span className="font-bold text-blue-900">
                              {satThaiCount}{" "}
                              <span className="text-[9px] text-gray-500 font-normal">
                                ({satThaiPct}%)
                              </span>
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="py-1.5 px-1.5 text-center border-l border-gray-200">
                          {provCount > 0 ? (
                            <span className="font-bold text-amber-900">
                              {provCount}{" "}
                              <span className="text-[9px] text-gray-500 font-normal">
                                ({provPct}%)
                              </span>
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="py-1.5 px-1.5 text-center border-l border-gray-200">
                          {outCount > 0 ? (
                            <span className="font-bold text-emerald-900">
                              {outCount}{" "}
                              <span className="text-[9px] text-gray-500 font-normal">
                                ({outPct}%)
                              </span>
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>

                        {/* Target, Actual, Rate */}
                        <td className="py-1.5 px-1.5 text-center font-bold text-gray-700 border-l border-gray-200">
                          {row.target}
                        </td>
                        <td className="py-1.5 px-1.5 text-center font-black text-[#16265E] border-l border-gray-200 bg-blue-50/40">
                          {row.total}
                        </td>
                        <td className="py-1.5 px-1.5 text-center font-bold border-l border-gray-200">
                          <span
                            className={
                              row.achievementRate >= 100
                                ? "text-emerald-700"
                                : row.achievementRate >= 80
                                ? "text-amber-700"
                                : "text-rose-700"
                            }
                          >
                            {row.achievementRate}%
                          </span>
                        </td>
                        <td className="py-1.5 px-1.5 text-center border-l border-gray-200">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[8.5px] font-bold ${
                              row.targetStatus === "achieved"
                                ? "bg-emerald-100 text-emerald-800"
                                : row.targetStatus === "near"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {row.targetStatus === "achieved"
                              ? "บรรลุเป้า"
                              : row.targetStatus === "near"
                              ? "ใกล้เคียง"
                              : "ต่ำกว่าเป้า"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Grand Total Footer */}
                <tfoot>
                  <tr className="bg-slate-100 font-black border-t-2 border-[#16265E] text-[10px]">
                    <td colSpan={3} className="py-2 px-3 text-right text-[#16265E] uppercase">
                      รวมทั้งสิ้น ({matrixData.length} หลักสูตร):
                    </td>
                    <td className="py-2 px-1.5 text-center text-purple-950 border-l border-gray-300">
                      {matrixTotals["การกีฬาแห่งประเทศไทย"]} คน
                    </td>
                    <td className="py-2 px-1.5 text-center text-sky-950 border-l border-gray-300">
                      {matrixTotals["กองทุนพัฒนาการกีฬาแห่งชาติ"]} คน
                    </td>
                    <td className="py-2 px-1.5 text-center text-blue-950 border-l border-gray-300">
                      {matrixTotals["สมาคมกีฬาแห่งประเทศไทย"]} คน
                    </td>
                    <td className="py-2 px-1.5 text-center text-amber-950 border-l border-gray-300">
                      {matrixTotals["สมาคมกีฬาแห่งจังหวัด"]} คน
                    </td>
                    <td className="py-2 px-1.5 text-center text-emerald-950 border-l border-gray-300">
                      {matrixTotals["หน่วยงานภายนอก"]} คน
                    </td>
                    <td className="py-2 px-1.5 text-center text-gray-800 border-l border-gray-300">
                      {matrixTotals.grandTarget} คน
                    </td>
                    <td className="py-2 px-1.5 text-center text-[#16265E] border-l border-gray-300 bg-amber-100/60 font-black">
                      {matrixTotals.grandTotal} คน
                    </td>
                    <td className="py-2 px-1.5 text-center text-[#16265E] border-l border-gray-300">
                      {overallAchievementRate}%
                    </td>
                    <td className="py-2 px-1.5 text-center border-l border-gray-300 text-[9px] font-bold text-gray-700">
                      {overallAchievementRate >= 100
                        ? "บรรลุเป้า"
                        : overallAchievementRate >= 80
                        ? "ใกล้เคียง"
                        : "ต่ำกว่าเป้า"}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* 4. Document Footer & Sign-off */}
            <div className="pt-2 border-t border-gray-200 flex items-center justify-between text-[9px] text-gray-500">
              <p>
                <strong>แหล่งข้อมูล:</strong> ระบบฐานข้อมูลทำเนียบบุคลากรกีฬาและประเมินผลโครงการ กองพัฒนาบุคลากรกีฬา ฝ่ายพัฒนากีฬาเป็นเลิศ กกท. (SAT Personnel Directory & Project Evaluation)
              </p>
              <p className="font-semibold text-gray-700">
                เอกสารอย่างเป็นทางการ • หน้า 1 จาก 1 (Page 1 of 1)
              </p>
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Bar (Hidden on print) */}
        <div className="no-print flex items-center justify-between bg-white border-t border-gray-200 px-5 py-3 text-xs">
          <span className="text-gray-500 text-[11px]">
            💡 ระบบตั้งค่า <strong>A4 แนวนอน (Landscape)</strong> ให้โดยอัตโนมัติ • รองรับบันทึกเป็น PDF และสั่งพิมพ์ออกกระดาษ 1 หน้าพอดี
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-3 py-1.5 font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#16265E] hover:bg-[#1e3a8a] text-white px-4 py-1.5 font-bold shadow-xs transition-colors cursor-pointer"
            >
              <span>🖨️</span>
              <span>สั่งพิมพ์ / บันทึก PDF ตอนนี้</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
