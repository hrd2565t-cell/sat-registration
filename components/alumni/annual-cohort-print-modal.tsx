"use client";

import { useMemo, useRef } from "react";
import type { AnnualCohortStats } from "@/lib/alumni-store";

interface AnnualCohortPrintModalProps {
  onClose: () => void;
  annualCohorts: AnnualCohortStats[];
  stats: {
    totalTrainees: number;
    uniquePersonnelCount: number;
  };
}

export function AnnualCohortPrintModal({
  onClose,
  annualCohorts,
  stats,
}: AnnualCohortPrintModalProps) {
  const printDocRef = useRef<HTMLDivElement>(null);

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

  // Isolated Printing: uses a hidden iframe so ONLY the A4 report is printed with zero spillover
  const handlePrint = () => {
    const printElem = printDocRef.current || document.getElementById("annual-cohort-print-document");
    if (!printElem) {
      window.print();
      return;
    }

    try {
      const existingFrame = document.getElementById("sat-annual-print-iframe");
      if (existingFrame) existingFrame.remove();

      const iframe = document.createElement("iframe");
      iframe.id = "sat-annual-print-iframe";
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
          <title>รายงานแนวโน้มการเติบโตของบุคลากรรายปี - กกท.</title>
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
            #annual-cohort-print-document {
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

  // Compute grand sums
  const totalSeats = useMemo(() => {
    return annualCohorts.reduce((acc, c) => acc + c.totalRecords, 0);
  }, [annualCohorts]);

  const totalNewTrainees = useMemo(() => {
    return annualCohorts.reduce((acc, c) => acc + c.newTrainees, 0);
  }, [annualCohorts]);

  const totalReturning = useMemo(() => {
    return annualCohorts.reduce((acc, c) => acc + c.returningTrainees, 0);
  }, [annualCohorts]);

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
          #annual-cohort-print-document,
          #annual-cohort-print-document * {
            visibility: visible !important;
          }
          #annual-cohort-print-document {
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
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-lg">
              📈
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold">
                  ตัวอย่างก่อนพิมพ์ (Print Preview) • รายงานแนวโน้มการเติบโตของบุคลากรรายปี
                </h3>
                <span className="rounded-md bg-amber-400 px-2 py-0.5 text-[10px] font-black text-[#1e1b4b]">
                  A4 แนวนอน (Landscape)
                </span>
              </div>
              <p className="text-xs text-blue-200">
                ข้อมูลย้อนหลัง:{" "}
                <span className="font-semibold text-white">
                  พ.ศ. 2547 - 2569 ({annualCohorts.length} ปีงบประมาณ)
                </span>{" "}
                • บุคลากรเดี่ยวสะสม: {stats.uniquePersonnelCount.toLocaleString()} คน
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
          {/* PRINTABLE A4 LANDSCAPE DOCUMENT CONTAINER */}
          {/* ========================================================================= */}
          <div
            id="annual-cohort-print-document"
            ref={printDocRef}
            className="w-full max-w-[1120px] bg-white rounded-lg shadow-xl p-6 sm:p-7 text-gray-900 border border-gray-300 text-[11px] leading-tight space-y-3 print:p-0 print:border-none print:shadow-none"
          >
            {/* 1. Official Header */}
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
                      รายงานสรุปภาพรวมและแนวโน้มการเติบโตของบุคลากรรายปี (Annual Cohort Growth Analytics)
                    </p>
                  </div>
                </div>

                <div className="text-right text-[11px] text-gray-600 space-y-0.5 shrink-0">
                  <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10.5px] font-bold text-emerald-800 mb-1">
                    <span>ข้อมูลสะสมทุกปีงบประมาณ</span>
                  </div>
                  <p className="text-gray-500">
                    <strong>วันที่พิมพ์:</strong> {printedDateThai}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Executive Stat Strips */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-2.5">
                <div className="text-[10px] font-bold text-blue-900 uppercase">👥 บุคลากรเดี่ยวสะสมทั้งระบบ</div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl font-black text-[#16265E]">
                    {stats.uniquePersonnelCount.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-gray-500">คน</span>
                </div>
                <div className="text-[9.5px] text-gray-500 mt-0.5 border-t border-blue-200/60 pt-1">
                  จากยอดอบรมทั้งหมด {stats.totalTrainees.toLocaleString()} คน-ครั้ง
                </div>
              </div>

              <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-2.5">
                <div className="text-[10px] font-bold text-emerald-900 uppercase">🌱 บุคลากรหน้าใหม่สะสม</div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl font-black text-emerald-700">
                    {totalNewTrainees.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-emerald-900 font-bold">คน</span>
                </div>
                <div className="text-[9.5px] text-emerald-800 mt-0.5 border-t border-emerald-200 pt-1">
                  คิดเป็น 100% ของบุคลากรเดี่ยวจริงทั้งหมด
                </div>
              </div>

              <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-2.5">
                <div className="text-[10px] font-bold text-indigo-900 uppercase">🔄 การอบรมต่อยอดสะสม (Upskill)</div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl font-black text-indigo-800">
                    {totalReturning.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-indigo-900 font-bold">ที่นั่ง</span>
                </div>
                <div className="text-[9.5px] text-indigo-700 mt-0.5 border-t border-indigo-200/60 pt-1">
                  สะท้อนการกลับมาต่อยอดอย่างต่อเนื่อง
                </div>
              </div>
            </div>

            {/* 3. Annual Cohort Table */}
            <div className="overflow-hidden rounded-lg border border-gray-300">
              <table className="w-full border-collapse text-[10px]">
                <thead>
                  <tr className="bg-[#16265E] text-white">
                    <th className="py-2 px-2 text-left font-bold min-w-[70px]">ปีงบประมาณ</th>
                    <th className="py-2 px-2 text-center font-bold min-w-[85px]">ที่นั่งอบรมรวม</th>
                    <th className="py-2 px-2 text-center font-bold bg-blue-900 border-l border-blue-800 min-w-[85px]">
                      👥 บุคลากรเดี่ยวจริง
                    </th>
                    <th className="py-2 px-2 text-center font-black bg-emerald-800 text-white border-l border-blue-800 min-w-[85px]">
                      🌱 บุคลากรหน้าใหม่
                    </th>
                    <th className="py-2 px-2 text-center font-bold bg-emerald-900 border-l border-blue-800 min-w-[65px]">
                      % หน้าใหม่
                    </th>
                    <th className="py-2 px-2 text-center font-black bg-indigo-900 text-white border-l border-blue-800 min-w-[85px]">
                      🔄 ศิษย์เก่าต่อยอด
                    </th>
                    <th className="py-2 px-2 text-center font-bold bg-indigo-950 border-l border-blue-800 min-w-[65px]">
                      % ศิษย์เก่า
                    </th>
                    <th className="py-2 px-2 text-center font-bold min-w-[120px] border-l border-blue-800">
                      สัดส่วน (🟢 ใหม่ vs 🟣 เดิม)
                    </th>
                    <th className="py-2 px-2 text-center font-bold min-w-[180px] border-l border-blue-800">
                      สังกัดคนหน้าใหม่ (กกท / กองทุน / สมาคม / จ. / ภายนอก)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {annualCohorts.map((cohort, idx) => (
                    <tr
                      key={cohort.yearBE}
                      className={cohort.yearBE === 2569 ? "bg-amber-50/70 font-semibold" : idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"}
                    >
                      <td className="py-1.5 px-2 font-bold text-[#16265E]">
                        พ.ศ. {cohort.yearBE}
                        {cohort.yearBE === 2569 && (
                          <span className="ml-1 rounded bg-amber-400 text-amber-950 px-1 py-0.2 text-[8px] font-black">
                            ล่าสุด
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-center font-mono text-gray-700">
                        {cohort.totalRecords.toLocaleString()} คน-ครั้ง
                      </td>
                      <td className="py-1.5 px-2 text-center border-l border-gray-200 font-mono font-bold text-blue-900 bg-blue-50/30">
                        {cohort.uniquePersons.toLocaleString()} คน
                      </td>
                      <td className="py-1.5 px-2 text-center border-l border-gray-200 font-mono font-black text-emerald-700 bg-emerald-50/40">
                        {cohort.newTrainees.toLocaleString()}
                      </td>
                      <td className="py-1.5 px-2 text-center border-l border-gray-200 font-mono text-emerald-800 bg-emerald-50/20 font-bold">
                        {cohort.newPercentage}%
                      </td>
                      <td className="py-1.5 px-2 text-center border-l border-gray-200 font-mono font-black text-indigo-800 bg-indigo-50/40">
                        {cohort.returningTrainees.toLocaleString()}
                      </td>
                      <td className="py-1.5 px-2 text-center border-l border-gray-200 font-mono text-indigo-900 bg-indigo-50/20 font-bold">
                        {cohort.returningPercentage}%
                      </td>

                      {/* Progress Bar */}
                      <td className="py-1.5 px-2 border-l border-gray-200">
                        <div className="h-2.5 w-full rounded-full bg-gray-200 overflow-hidden flex">
                          <div
                            style={{ width: `${cohort.newPercentage}%` }}
                            className="bg-emerald-500 h-full"
                          />
                          <div
                            style={{ width: `${cohort.returningPercentage}%` }}
                            className="bg-indigo-600 h-full"
                          />
                        </div>
                      </td>

                      {/* Affiliation Badges */}
                      <td className="py-1.5 px-2 border-l border-gray-200 text-center">
                        <div className="flex items-center justify-center gap-1 text-[8.5px]">
                          <span className="rounded bg-purple-50 px-1 py-0.2 text-purple-700 border border-purple-200">
                            กกท.{cohort.newByGroup["การกีฬาแห่งประเทศไทย"] || 0}
                          </span>
                          <span className="rounded bg-sky-50 px-1 py-0.2 text-sky-700 border border-sky-200">
                            กองทุน.{cohort.newByGroup["กองทุนพัฒนาการกีฬาแห่งชาติ"] || 0}
                          </span>
                          <span className="rounded bg-blue-50 px-1 py-0.2 text-blue-700 border border-blue-200">
                            ส.{cohort.newByGroup["สมาคมกีฬาแห่งประเทศไทย"] || 0}
                          </span>
                          <span className="rounded bg-amber-50 px-1 py-0.2 text-amber-700 border border-amber-200">
                            จ.{cohort.newByGroup["สมาคมกีฬาแห่งจังหวัด"] || 0}
                          </span>
                          <span className="rounded bg-emerald-50 px-1 py-0.2 text-emerald-700 border border-emerald-200">
                            ภ.{cohort.newByGroup["หน่วยงานภายนอก"] || 0}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* Grand Total */}
                <tfoot>
                  <tr className="bg-slate-100 font-black border-t-2 border-[#16265E] text-[10px]">
                    <td className="py-2 px-2 text-left text-[#16265E] uppercase">
                      รวมสะสม:
                    </td>
                    <td className="py-2 px-2 text-center text-gray-800 font-mono">
                      {totalSeats.toLocaleString()} คน-ครั้ง
                    </td>
                    <td className="py-2 px-2 text-center text-[#16265E] border-l border-gray-300 font-mono bg-blue-100/50">
                      {stats.uniquePersonnelCount.toLocaleString()} คน
                    </td>
                    <td className="py-2 px-2 text-center text-emerald-800 border-l border-gray-300 font-mono bg-emerald-100/60">
                      {totalNewTrainees.toLocaleString()}
                    </td>
                    <td className="py-2 px-2 text-center text-emerald-900 border-l border-gray-300 font-mono">
                      -
                    </td>
                    <td className="py-2 px-2 text-center text-indigo-900 border-l border-gray-300 font-mono bg-indigo-100/60">
                      {totalReturning.toLocaleString()}
                    </td>
                    <td className="py-2 px-2 text-center text-indigo-900 border-l border-gray-300 font-mono">
                      -
                    </td>
                    <td colSpan={2} className="py-2 px-2 text-center border-l border-gray-300 text-[9px] text-gray-500 font-normal">
                      ข้อมูลเปรียบเทียบต่อเนื่อง {annualCohorts.length} ปีงบประมาณ
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* 4. Document Footer */}
            <div className="pt-2 border-t border-gray-200 flex items-center justify-between text-[9px] text-gray-500">
              <p>
                <strong>แหล่งข้อมูล:</strong> ระบบฐานข้อมูลทำเนียบบุคลากรกีฬาและประเมินผลโครงการ ฝ่ายพัฒนาบุคลากรกีฬา กกท. (SAT Personnel Directory & Project Evaluation)
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
