"use client";

import { useMemo, useRef, useState } from "react";
import type {
  NationalCoverageResult,
  ProvincialCoverageResult,
} from "@/lib/association-coverage";

interface AssociationCoveragePrintModalProps {
  onClose: () => void;
  nationalResult: NationalCoverageResult;
  provincialResult: ProvincialCoverageResult;
  selectedYear: string;
  initialScope?: "national" | "provincial" | "both";
}

export function AssociationCoveragePrintModal({
  onClose,
  nationalResult,
  provincialResult,
  selectedYear,
  initialScope = "both",
}: AssociationCoveragePrintModalProps) {
  const printDocRef = useRef<HTMLDivElement>(null);
  const [scope, setScope] = useState<"both" | "national" | "provincial">(initialScope);
  const [onlyFocusZeroAndTop, setOnlyFocusZeroAndTop] = useState<boolean>(false);

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

  const yearLabel =
    selectedYear === "all"
      ? "รวมสะสมทุกปีงบประมาณ (พ.ศ. 2547 – 2569)"
      : `ประจำปี พ.ศ. ${selectedYear}`;

  const sortedNationalForPrint = useMemo(() => {
    const list = [...nationalResult.items].sort(
      (a, b) => a.recordCount - b.recordCount || a.orderNo - b.orderNo
    );
    if (!onlyFocusZeroAndTop) return list;
    const zeros = list.filter((i) => i.recordCount === 0);
    const topActive = [...nationalResult.items]
      .filter((i) => i.recordCount > 0)
      .sort((a, b) => b.recordCount - a.recordCount)
      .slice(0, 20);
    return [...zeros, ...topActive];
  }, [nationalResult.items, onlyFocusZeroAndTop]);

  const sortedProvincialForPrint = useMemo(() => {
    const list = [...provincialResult.items].sort(
      (a, b) => a.recordCount - b.recordCount || a.provinceName.localeCompare(b.provinceName, "th")
    );
    if (!onlyFocusZeroAndTop) return list;
    const zeros = list.filter((i) => i.recordCount === 0);
    const topActive = [...provincialResult.items]
      .filter((i) => i.recordCount > 0)
      .sort((a, b) => b.recordCount - a.recordCount)
      .slice(0, 20);
    return [...zeros, ...topActive];
  }, [provincialResult.items, onlyFocusZeroAndTop]);

  const handlePrint = () => {
    const printElem =
      printDocRef.current || document.getElementById("association-coverage-print-doc");
    if (!printElem) {
      window.print();
      return;
    }

    try {
      const existingFrame = document.getElementById("sat-association-print-iframe");
      if (existingFrame) existingFrame.remove();

      const iframe = document.createElement("iframe");
      iframe.id = "sat-association-print-iframe";
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
          <title>รายงานความครอบคลุมสมาคมกีฬาแห่งประเทศไทยและสมาคมกีฬาแห่งจังหวัด - กกท.</title>
          ${styles}
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm 10mm;
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
            }
            #association-coverage-print-doc {
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
            tr {
              page-break-inside: avoid;
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white">
      <div className="relative w-full max-w-[1060px] max-h-[95vh] flex flex-col rounded-2xl bg-gray-100 shadow-2xl border border-gray-300 overflow-hidden print:max-h-none print:max-w-none print:w-full print:border-none print:shadow-none print:bg-white">
        {/* Control Bar */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 bg-[#16265E] px-5 py-3.5 text-white">
          <div>
            <h3 className="text-sm sm:text-base font-bold">
              🖨️ ตัวอย่างก่อนพิมพ์ • รายงานความครอบคลุมสมาคมกีฬาฯ และสมาคมกีฬาแห่งจังหวัด (A4)
            </h3>
            <p className="text-xs text-blue-200 mt-0.5">{yearLabel}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as "both" | "national" | "provincial")}
              className="rounded-lg bg-white/10 border border-white/25 px-2.5 py-1.5 text-xs font-semibold text-white focus:outline-hidden"
            >
              <option value="both" className="text-gray-900">
                ทั้ง 93 สมาคมฯ + 77 จังหวัด
              </option>
              <option value="national" className="text-gray-900">
                เฉพาะสมาคมกีฬาแห่งประเทศไทย ({nationalResult.summary.totalMaster})
              </option>
              <option value="provincial" className="text-gray-900">
                เฉพาะสมาคมกีฬาแห่งจังหวัด (77)
              </option>
            </select>

            <label className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 border border-white/20 px-2.5 py-1.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={onlyFocusZeroAndTop}
                onChange={(e) => setOnlyFocusZeroAndTop(e.target.checked)}
                className="rounded"
              />
              <span>เน้นกลุ่ม 0 คน + Top 20</span>
            </label>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-1.5 text-xs font-black text-[#1e1b4b] hover:bg-amber-300 transition-colors cursor-pointer"
            >
              <span>🖨️</span>
              <span>พิมพ์ / บันทึก PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/25 transition-colors cursor-pointer"
            >
              ✕ ปิด
            </button>
          </div>
        </div>

        {/* Printable Document */}
        <div className="overflow-y-auto p-4 sm:p-6 bg-gray-200/70">
          <div
            id="association-coverage-print-doc"
            ref={printDocRef}
            className="mx-auto w-full max-w-[820px] bg-white p-7 text-gray-900 border border-gray-200 shadow-sm space-y-5"
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-[#16265E] pb-3.5 gap-4">
              <div className="flex items-center gap-3">
                <img
                  src="/sat-logo.png"
                  alt="ตราสัญลักษณ์ กกท."
                  className="h-14 w-14 object-contain rounded-lg border border-blue-900/10 p-1 bg-slate-50"
                />
                <div>
                  <h1 className="text-base font-black text-[#16265E]">
                    รายงานวิเคราะห์ความครอบคลุมการส่งบุคลากรเข้าอบรม
                  </h1>
                  <p className="text-xs font-bold text-gray-800">
                    กองพัฒนาบุคลากรกีฬา ฝ่ายพัฒนากีฬาเป็นเลิศ การกีฬาแห่งประเทศไทย
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{yearLabel}</p>
                </div>
              </div>
              <div className="text-right text-[11px] text-gray-500 shrink-0">
                <span className="inline-block rounded bg-blue-50 px-2 py-0.5 font-bold text-[#16265E] border border-blue-200">
                  เอกสารสรุปผู้บริหาร (A4)
                </span>
                <p className="mt-1">วันที่พิมพ์: {printedDateThai}</p>
              </div>
            </div>

            {/* KPI Summary Row */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3 space-y-1">
                <p className="font-bold text-[#16265E]">
                  1. สมาคมกีฬาแห่งประเทศไทย (ทะเบียน {nationalResult.summary.totalMaster} สมาคม)
                </p>
                <p className="text-gray-700">
                  เคยส่งเข้าอบรมแล้ว:{" "}
                  <strong className="text-emerald-700">
                    {nationalResult.summary.participatedCount} สมาคม (
                    {nationalResult.summary.coveragePercent}%)
                  </strong>{" "}
                  | ยังไม่มีประวัติ:{" "}
                  <strong className="text-amber-800">
                    {nationalResult.summary.neverSentCount} สมาคม
                  </strong>
                </p>
                <p className="text-[11px] text-gray-500">
                  จำนวนอบรมรวม {nationalResult.summary.totalRecords.toLocaleString()} คน-ครั้ง (
                  {nationalResult.summary.totalUniquePeople.toLocaleString()} บุคลากรเดี่ยว)
                </p>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 space-y-1">
                <p className="font-bold text-emerald-900">
                  2. สมาคมกีฬาแห่งจังหวัด (77 จังหวัดทั่วประเทศ)
                </p>
                <p className="text-gray-700">
                  เคยส่งเข้าอบรมแล้ว:{" "}
                  <strong className="text-emerald-700">
                    {provincialResult.summary.participatedCount} จังหวัด (
                    {provincialResult.summary.coveragePercent}%)
                  </strong>{" "}
                  | ยังไม่มีประวัติ:{" "}
                  <strong className="text-amber-800">
                    {provincialResult.summary.neverSentCount} จังหวัด
                  </strong>
                </p>
                <p className="text-[11px] text-gray-500">
                  จำนวนอบรมรวม {provincialResult.summary.totalRecords.toLocaleString()} คน-ครั้ง (
                  {provincialResult.summary.totalUniquePeople.toLocaleString()} บุคลากรเดี่ยว)
                </p>
              </div>
            </div>

            {/* National Section */}
            {(scope === "both" || scope === "national") && (
              <div className="space-y-2.5">
                <h2 className="text-xs font-black text-[#16265E] border-b border-gray-200 pb-1">
                  ส่วนที่ 1: สมาคมกีฬาแห่งประเทศไทย ({nationalResult.summary.totalMaster} สมาคม)
                </h2>

                <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-2.5 text-[11px]">
                  <p className="font-bold text-amber-900">
                    สมาคมกีฬาแห่งประเทศไทยที่ยังไม่มีประวัติการอบรมในระบบ ({nationalResult.neverSentItems.length} สมาคม):
                  </p>
                  {nationalResult.neverSentItems.length === 0 ? (
                    <p className="text-emerald-700 mt-0.5">ครบ 100% ทุกสมาคมในปีที่เลือก</p>
                  ) : (
                    <p className="text-gray-800 mt-1 leading-relaxed">
                      {nationalResult.neverSentItems
                        .map((item, idx) => `${idx + 1}. ${item.officialName}`)
                        .join("  •  ")}
                    </p>
                  )}
                </div>

                <table className="w-full text-[10.5px] border-collapse border border-gray-300">
                  <thead className="bg-[#16265E] text-white">
                    <tr>
                      <th className="border border-blue-900 py-1.5 px-2 text-center w-10">#</th>
                      <th className="border border-blue-900 py-1.5 px-2 text-left">
                        ชื่อสมาคมกีฬาแห่งประเทศไทย
                      </th>
                      <th className="border border-blue-900 py-1.5 px-2 text-center w-20">
                        คน-ครั้ง
                      </th>
                      <th className="border border-blue-900 py-1.5 px-2 text-center w-16">
                        คนจริง
                      </th>
                      <th className="border border-blue-900 py-1.5 px-2 text-center w-20">
                        ปีล่าสุด
                      </th>
                      <th className="border border-blue-900 py-1.5 px-2 text-left w-36">
                        สถานะ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedNationalForPrint.map((item) => (
                      <tr
                        key={item.id}
                        className={item.recordCount === 0 ? "bg-amber-50/40" : "bg-white"}
                      >
                        <td className="border border-gray-200 py-1 px-2 text-center font-mono">
                          {item.orderNo}
                        </td>
                        <td className="border border-gray-200 py-1 px-2 font-medium">
                          {item.officialName}
                        </td>
                        <td className="border border-gray-200 py-1 px-2 text-center font-mono font-bold">
                          {item.recordCount}
                        </td>
                        <td className="border border-gray-200 py-1 px-2 text-center font-mono">
                          {item.uniquePeopleCount}
                        </td>
                        <td className="border border-gray-200 py-1 px-2 text-center font-mono">
                          {item.latestYearBE ? `พ.ศ. ${item.latestYearBE}` : "-"}
                        </td>
                        <td className="border border-gray-200 py-1 px-2">
                          {item.recordCount === 0
                            ? "ยังไม่มีประวัติ (กลุ่มเป้าหมาย)"
                            : item.recordCount <= 5
                            ? "ส่งน้อย (1–5 ครั้ง)"
                            : "ส่งต่อเนื่อง"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Provincial Section */}
            {(scope === "both" || scope === "provincial") && (
              <div className="space-y-2.5 pt-2">
                <h2 className="text-xs font-black text-emerald-900 border-b border-gray-200 pb-1">
                  ส่วนที่ 2: สมาคมกีฬาแห่งจังหวัด (77 จังหวัด)
                </h2>

                <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-2.5 text-[11px]">
                  <p className="font-bold text-amber-900">
                    สมาคมกีฬาแห่งจังหวัดที่ยังไม่มีประวัติการอบรมในระบบ ({provincialResult.neverSentItems.length} จังหวัด):
                  </p>
                  {provincialResult.neverSentItems.length === 0 ? (
                    <p className="text-emerald-700 mt-0.5">ครบ 77 จังหวัดในรอบปีที่เลือก</p>
                  ) : (
                    <p className="text-gray-800 mt-1 leading-relaxed">
                      {provincialResult.neverSentItems
                        .map((item, idx) => `${idx + 1}. ${item.officialName} (${item.regionNameTh})`)
                        .join("  •  ")}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-5 gap-1.5 text-[10px]">
                  {provincialResult.regionSummary.map((r) => (
                    <div key={r.region} className="rounded border border-gray-200 bg-gray-50 p-1.5 text-center">
                      <p className="font-bold text-[#16265E]">{r.regionNameTh}</p>
                      <p className="font-mono mt-0.5">
                        {r.participatedProvinces}/{r.totalProvinces} จ. ({r.coveragePercent}%)
                      </p>
                    </div>
                  ))}
                </div>

                <table className="w-full text-[10.5px] border-collapse border border-gray-300">
                  <thead className="bg-emerald-900 text-white">
                    <tr>
                      <th className="border border-emerald-950 py-1.5 px-2 text-center w-10">#</th>
                      <th className="border border-emerald-950 py-1.5 px-2 text-left">
                        สมาคมกีฬาแห่งจังหวัด
                      </th>
                      <th className="border border-emerald-950 py-1.5 px-2 text-left w-32">ภูมิภาค</th>
                      <th className="border border-emerald-950 py-1.5 px-2 text-center w-20">
                        คน-ครั้ง
                      </th>
                      <th className="border border-emerald-950 py-1.5 px-2 text-center w-16">
                        คนจริง
                      </th>
                      <th className="border border-emerald-950 py-1.5 px-2 text-center w-20">
                        ปีล่าสุด
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedProvincialForPrint.map((item, idx) => (
                      <tr
                        key={item.provinceId}
                        className={item.recordCount === 0 ? "bg-amber-50/40" : "bg-white"}
                      >
                        <td className="border border-gray-200 py-1 px-2 text-center font-mono">
                          {idx + 1}
                        </td>
                        <td className="border border-gray-200 py-1 px-2 font-medium">
                          {item.officialName}
                        </td>
                        <td className="border border-gray-200 py-1 px-2 text-gray-600">
                          {item.regionNameTh}
                        </td>
                        <td className="border border-gray-200 py-1 px-2 text-center font-mono font-bold">
                          {item.recordCount}
                        </td>
                        <td className="border border-gray-200 py-1 px-2 text-center font-mono">
                          {item.uniquePeopleCount}
                        </td>
                        <td className="border border-gray-200 py-1 px-2 text-center font-mono">
                          {item.latestYearBE ? `พ.ศ. ${item.latestYearBE}` : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer Notes & Signature */}
            <div className="pt-3 border-t border-gray-200 text-[10px] text-gray-500 space-y-1">
              <p>
                หมายเหตุขอบเขตข้อมูล: สมาคมกีฬาแห่งประเทศไทยอ้างอิงทะเบียน {nationalResult.summary.totalMaster} สมาคม
                (ไม่รวมสมาคมกีฬาอาชีพ และแยก &ldquo;สมาคมเพาะกาย กกท.&rdquo; ออกตามสังกัดจริง) •
                สมาคมกีฬาแห่งจังหวัดอ้างอิง 77 จังหวัด (แยก &ldquo;สมาคมกีฬาคนพิการจังหวัด&rdquo; ออกตามสังกัดจริง)
              </p>
              <p>
                จัดทำโดยระบบฐานข้อมูลพัฒนาบุคลากรกีฬา · กองพัฒนาบุคลากรกีฬา ฝ่ายพัฒนากีฬาเป็นเลิศ การกีฬาแห่งประเทศไทย
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
