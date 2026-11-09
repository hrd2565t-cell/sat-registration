"use client";

import { useMemo, useRef } from "react";
import type { CourseTimelineItem } from "@/lib/alumni-store";

interface CourseTimelinePrintModalProps {
  onClose: () => void;
  timelineData: CourseTimelineItem[];
  yearsAsc: number[];
  selectedCategory: string;
  stats: {
    totalCourses: number;
    activeRecentCourses: number;
    maxYearsCourse?: CourseTimelineItem;
    totalTrainedAcrossCourses: number;
  };
}

export function CourseTimelinePrintModal({
  onClose,
  timelineData,
  yearsAsc,
  selectedCategory,
  stats,
}: CourseTimelinePrintModalProps) {
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

  // Compute yearly totals across displayed courses
  const yearlyTotals = useMemo(() => {
    const map: Record<number, number> = {};
    for (const yr of yearsAsc) {
      map[yr] = timelineData.reduce((acc, c) => acc + (c.traineesByYear[yr] || 0), 0);
    }
    return map;
  }, [timelineData, yearsAsc]);

  // Grand total trainees across displayed courses
  const grandTotalTrainees = useMemo(() => {
    return timelineData.reduce((acc, c) => acc + c.totalTrainees, 0);
  }, [timelineData]);

  // Isolated Printing: uses a hidden iframe so ONLY the A4 report is printed with zero spillover
  const handlePrint = () => {
    const printElem = printDocRef.current || document.getElementById("timeline-print-document");
    if (!printElem) {
      window.print();
      return;
    }

    try {
      const existingFrame = document.getElementById("sat-timeline-print-iframe");
      if (existingFrame) existingFrame.remove();

      const iframe = document.createElement("iframe");
      iframe.id = "sat-timeline-print-iframe";
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
          <title>Timeline ความต่อเนื่องของการพัฒนาหลักสูตร กกท. (พ.ศ. 2547 - 2569)</title>
          ${styles}
          <style>
            @page {
              size: A4 landscape;
              margin: 5mm 7mm;
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
            #timeline-print-document {
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
          <div style="width: 100%; padding: 2px;">
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

  const getCategoryStyle = (cat: string) => {
    switch (cat) {
      case "ผู้บริหารกีฬา":
        return {
          badge: "bg-purple-100 text-purple-900 border-purple-200",
          cell: "bg-purple-600 text-white font-bold",
          rowLight: "bg-purple-50/30",
        };
      case "ผู้ฝึกสอนกีฬา":
        return {
          badge: "bg-blue-100 text-blue-900 border-blue-200",
          cell: "bg-blue-600 text-white font-bold",
          rowLight: "bg-blue-50/30",
        };
      default:
        return {
          badge: "bg-amber-100 text-amber-900 border-amber-200",
          cell: "bg-amber-600 text-white font-bold",
          rowLight: "bg-amber-50/30",
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible">
      {/* Global Print Fallback Styles */}
      <style>{`
        @page {
          size: A4 landscape;
          margin: 5mm 7mm;
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
          #timeline-print-document,
          #timeline-print-document * {
            visibility: visible !important;
          }
          #timeline-print-document {
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
      <div className="relative w-full max-w-[1280px] max-h-[96vh] flex flex-col rounded-2xl bg-gray-100 shadow-2xl border border-gray-300 overflow-hidden print:max-h-none print:max-w-none print:w-full print:border-none print:shadow-none print:bg-white print:overflow-visible">
        {/* Top Control Bar */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 bg-[#16265E] px-5 py-3.5 text-white shadow-md">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-lg">
              📈
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold">
                  ตัวอย่างก่อนพิมพ์ (Print Preview) • Timeline ความต่อเนื่องของการพัฒนาหลักสูตร กกท.
                </h3>
                <span className="rounded-md bg-amber-400 px-2 py-0.5 text-[10px] font-black text-[#1e1b4b]">
                  A4 แนวนอน (Landscape)
                </span>
              </div>
              <p className="text-xs text-blue-200">
                ข้อมูลประวัติศาสตร์ 23 ปี (พ.ศ. 2547 - 2569) • สายวิชาชีพ:{" "}
                <span className="font-semibold text-white">
                  {selectedCategory === "all" ? "ทุกสายวิชาชีพ" : selectedCategory}
                </span>{" "}
                • แสดง {timelineData.length} หลักสูตร ({grandTotalTrainees.toLocaleString()} คน-ครั้ง)
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
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 flex justify-center bg-gray-200/90 print:p-0 print:bg-white print:overflow-visible">
          {/* ========================================================================= */}
          {/* THE EXACT PRINTABLE A4 LANDSCAPE DOCUMENT CONTAINER */}
          {/* ========================================================================= */}
          <div
            id="timeline-print-document"
            ref={printDocRef}
            className="w-full max-w-[1180px] bg-white rounded-lg shadow-xl p-5 sm:p-6 text-gray-900 border border-gray-300 text-[10px] leading-tight space-y-2.5 print:p-0 print:border-none print:shadow-none"
          >
            {/* 1. Official SAT Header */}
            <div className="border-b-2 border-[#16265E] pb-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#16265E] text-white shadow-sm font-black text-lg border-2 border-amber-400">
                    กกท
                  </div>
                  <div>
                    <h1 className="text-base sm:text-lg font-black tracking-tight text-[#16265E]">
                      การกีฬาแห่งประเทศไทย (Sports Authority of Thailand)
                    </h1>
                    <p className="text-[11px] font-bold text-gray-700">
                      กองพัฒนาบุคลากรกีฬา ฝ่ายพัฒนากีฬาเป็นเลิศ
                    </p>
                    <p className="text-[11px] font-semibold text-blue-900 mt-0.5">
                      รายงานแผนภูมิความต่อเนื่องของการพัฒนาหลักสูตรฝึกอบรม (Course Continuity Timeline Matrix พ.ศ. 2547 – 2569)
                    </p>
                  </div>
                </div>

                <div className="text-right text-[10px] text-gray-600 space-y-0.5 shrink-0">
                  <div className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[9.5px] font-bold text-[#16265E] mb-0.5">
                    <span>ประวัติศาสตร์ 23 ปี (พ.ศ. 2547 – 2569)</span>
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

            {/* 2. Executive KPI Metrics Strip (4 Cards in Landscape) */}
            <div className="grid grid-cols-4 gap-2">
              <div className="rounded-md border border-blue-200 bg-blue-50/60 p-2">
                <div className="text-[9px] font-bold text-gray-600 uppercase">📚 หลักสูตรในรายงาน</div>
                <div className="mt-0.5 flex items-baseline gap-1">
                  <span className="text-lg font-black text-[#16265E]">
                    {timelineData.length}
                  </span>
                  <span className="text-[9.5px] text-gray-500 font-semibold">หลักสูตร</span>
                </div>
                <div className="text-[8.5px] text-gray-500 mt-0.5 border-t border-blue-200/60 pt-0.5">
                  จากหลักสูตรสะสมทั้งหมด {stats.totalCourses} หลักสูตร
                </div>
              </div>

              <div className="rounded-md border border-emerald-300 bg-emerald-50/60 p-2">
                <div className="text-[9px] font-bold text-emerald-900 uppercase">🟢 จัดต่อเนื่องล่าสุด (พ.ศ. 2569)</div>
                <div className="mt-0.5 flex items-baseline gap-1">
                  <span className="text-lg font-black text-emerald-700">
                    {stats.activeRecentCourses}
                  </span>
                  <span className="text-[9.5px] text-emerald-900 font-bold">หลักสูตร</span>
                </div>
                <div className="text-[8.5px] text-emerald-800 mt-0.5 border-t border-emerald-200 pt-0.5">
                  คิดเป็น {Math.round((stats.activeRecentCourses / stats.totalCourses) * 100)}% ของหลักสูตรทั้งหมด
                </div>
              </div>

              <div className="rounded-md border border-amber-300 bg-amber-50/60 p-2">
                <div className="text-[9px] font-bold text-amber-900 uppercase">🏆 จัดต่อเนื่องยาวนานที่สุด</div>
                <div className="mt-0.5 flex items-baseline gap-1 truncate">
                  <span className="text-sm font-black text-amber-900 truncate">
                    {stats.maxYearsCourse?.courseTitle}
                  </span>
                </div>
                <div className="text-[8.5px] text-amber-800 mt-0.5 border-t border-amber-200 pt-0.5">
                  จัดต่อเนื่องยาวนาน {stats.maxYearsCourse?.totalYearsCount} ปี ({stats.maxYearsCourse?.firstYear} - {stats.maxYearsCourse?.lastYear})
                </div>
              </div>

              <div className="rounded-md border border-indigo-200 bg-indigo-50/60 p-2">
                <div className="text-[9px] font-bold text-indigo-900 uppercase">👥 ยอดผู้ผ่านการอบรมสะสม</div>
                <div className="mt-0.5 flex items-baseline gap-1">
                  <span className="text-lg font-black text-indigo-800">
                    {grandTotalTrainees.toLocaleString()}
                  </span>
                  <span className="text-[9.5px] text-indigo-900 font-bold">คน-ครั้ง</span>
                </div>
                <div className="text-[8.5px] text-indigo-700 mt-0.5 border-t border-indigo-200/60 pt-0.5">
                  ตลอดประวัติศาสตร์ 23 ปีงบประมาณ
                </div>
              </div>
            </div>

            {/* 3. The 23-Year Gantt Timeline Matrix Table */}
            <div className="overflow-hidden rounded-md border border-gray-300">
              <table className="w-full border-collapse text-[9.5px]">
                <thead>
                  <tr className="bg-[#16265E] text-white">
                    <th className="py-1.5 px-1 text-center font-bold w-5 border-r border-blue-900/60">#</th>
                    <th className="py-1.5 px-2 text-left font-bold min-w-[130px] border-r border-blue-900/60">
                      ชื่อหลักสูตร
                    </th>
                    <th className="py-1.5 px-1.5 text-left font-bold min-w-[70px] border-r border-blue-900/60">
                      สายวิชาชีพ
                    </th>
                    <th className="py-1.5 px-1 text-center font-bold text-amber-300 w-11 border-r border-blue-900/60">
                      จำนวนปี
                    </th>

                    {/* 23 Year Columns */}
                    {yearsAsc.map((yr) => (
                      <th
                        key={yr}
                        className="py-1.5 px-0.5 text-center font-mono text-[9px] border-r border-blue-900/40 min-w-[23px]"
                        title={`ปีงบประมาณ พ.ศ. ${yr}`}
                      >
                        &apos;{String(yr).slice(2)}
                      </th>
                    ))}

                    <th className="py-1.5 px-1.5 text-center font-black bg-indigo-950 text-amber-300 min-w-[50px]">
                      ยอดรวม
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {timelineData.map((c, idx) => {
                    const theme = getCategoryStyle(c.category);
                    return (
                      <tr
                        key={c.courseTitle}
                        className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}
                      >
                        {/* # */}
                        <td className="py-1 px-1 text-center text-gray-500 font-mono border-r border-gray-200">
                          {idx + 1}
                        </td>

                        {/* Course Title */}
                        <td className="py-1 px-2 font-bold text-[#16265E] truncate max-w-[140px] border-r border-gray-200">
                          <span title={c.courseTitle}>{c.courseTitle}</span>
                        </td>

                        {/* Category */}
                        <td className="py-1 px-1.5 border-r border-gray-200">
                          <span
                            className={`inline-block px-1 py-0.2 rounded text-[8px] font-semibold border ${theme.badge} truncate max-w-[70px]`}
                          >
                            {c.category}
                          </span>
                        </td>

                        {/* Total Years Conducted */}
                        <td className="py-1 px-1 text-center font-bold border-r border-gray-200">
                          <span className="rounded bg-amber-50 px-1 py-0.2 text-[8.5px] font-extrabold text-amber-900 border border-amber-200">
                            {c.totalYearsCount} ปี
                          </span>
                        </td>

                        {/* 23 Year Grid Cells */}
                        {yearsAsc.map((yr) => {
                          const count = c.traineesByYear[yr] || 0;
                          return (
                            <td
                              key={yr}
                              className={`py-0.5 px-0.5 text-center border-r border-gray-200 ${
                                count > 0 ? theme.rowLight : ""
                              }`}
                            >
                              {count > 0 ? (
                                <span
                                  className={`inline-flex items-center justify-center rounded px-0.5 min-w-[18px] text-[8px] font-black ${theme.cell}`}
                                  title={`${c.courseTitle} (${yr}): ${count} คน`}
                                >
                                  {count}
                                </span>
                              ) : (
                                <span className="text-gray-300 text-[8px]">·</span>
                              )}
                            </td>
                          );
                        })}

                        {/* Total Trainees */}
                        <td className="py-1 px-1.5 text-center font-black text-[#16265E] bg-blue-50/50">
                          {c.totalTrainees.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Grand Total Footer */}
                <tfoot>
                  <tr className="bg-slate-100 font-black border-t-2 border-[#16265E] text-[9.5px]">
                    <td
                      colSpan={4}
                      className="py-1.5 px-2 text-right text-[#16265E] uppercase border-r border-gray-300"
                    >
                      รวมผู้สำเร็จการอบรมในแต่ละปี (คน):
                    </td>

                    {/* Per-Year Sum */}
                    {yearsAsc.map((yr) => {
                      const yrTotal = yearlyTotals[yr] || 0;
                      return (
                        <td
                          key={yr}
                          className="py-1.5 px-0.5 text-center font-mono text-[8.5px] border-r border-gray-300 text-gray-800"
                        >
                          {yrTotal > 0 ? (
                            <span className="font-bold text-[#16265E]">{yrTotal}</span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Grand Total */}
                    <td className="py-1.5 px-1.5 text-center text-[#16265E] bg-amber-100/70 font-black">
                      {grandTotalTrainees.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* 4. Legend & Footnote */}
            <div className="pt-1.5 border-t border-gray-200 flex flex-wrap items-center justify-between text-[8.5px] text-gray-600 gap-2">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-xs bg-purple-600" />
                  <span>สายผู้บริหารกีฬา</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-xs bg-blue-600" />
                  <span>สายผู้ฝึกสอนกีฬา</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-xs bg-amber-600" />
                  <span>สายวิชาชีพอื่นๆ</span>
                </span>
              </div>
              <p className="text-gray-400">
                * ตัวเลขในแต่ละช่องแสดงจำนวนบุคลากรที่สำเร็จการอบรมในรุ่นปีงบประมาณนั้นๆ
              </p>
            </div>

            {/* 5. Document Footer & Sign-off */}
            <div className="pt-1.5 border-t border-gray-200 flex items-center justify-between text-[8.5px] text-gray-500">
              <p>
                <strong>แหล่งข้อมูล:</strong> ระบบฐานข้อมูลทำเนียบบุคลากรกีฬาและประเมินผลโครงการ กองพัฒนาบุคลากรกีฬา ฝ่ายพัฒนากีฬาเป็นเลิศ กกท. (SAT Personnel Directory & Continuity System)
              </p>
              <p className="font-semibold text-gray-700">
                เอกสารอย่างเป็นทางการ • หน้า 1 จาก 1 (Page 1 of 1)
              </p>
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Bar */}
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
