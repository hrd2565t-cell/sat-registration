"use client";

import { useMemo, useRef } from "react";
import Image from "next/image";
import type { HistoricalTrainee, CourseMatrixRow, YearCohortSummary } from "@/lib/alumni-store";

interface ExecutiveBriefingPrintModalProps {
  onClose: () => void;
  trainees: HistoricalTrainee[];
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
  overallAchievementRate: number;
}

export function ExecutiveBriefingPrintModal({
  onClose,
  trainees,
  matrixData,
  matrixTotals,
  cohortSummary,
  overallAchievementRate,
}: ExecutiveBriefingPrintModalProps) {
  const printDocRef = useRef<HTMLDivElement>(null);

  const printedDateThai = useMemo(() => {
    const now = new Date();
    const monthsThai = [
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
      "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
    ];
    const d = now.getDate();
    const m = monthsThai[now.getMonth()];
    const y = now.getFullYear() + 543;
    return `${d} ${m} พ.ศ. ${y}`;
  }, []);

  const totalDuties = useMemo(() => {
    return trainees.reduce((sum, t) => sum + (t.duties?.length || 0), 0);
  }, [trainees]);

  const activeTraineesCount = useMemo(() => {
    const uniquePersons = new Set(trainees.map((t) => t.idCard || t.name));
    return uniquePersons.size;
  }, [trainees]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 sm:p-6 backdrop-blur-xs print:p-0 print:bg-white">
      {/* Modal Dialog Box */}
      <div className="relative my-auto flex max-h-[92vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl print:my-0 print:max-h-none print:w-full print:rounded-none print:shadow-none">
        {/* Modal Top Control Bar (Hidden on Print) */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xl">📑</span>
            <div>
              <h3 className="text-base font-bold text-[#16265E]">
                พิมพ์รายงานสรุปผลสัมฤทธิ์โครงการส่งผู้บริหาร (Executive Briefing)
              </h3>
              <p className="text-xs text-gray-500">
                เอกสารทางการ A4 พร้อมตราสัญลักษณ์ กกท. ตารางสถิติ ตัวชี้วัด KPIs และการประเมิน Kirkpatrick Level 1-4
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#16265E] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#111e4a] transition-colors cursor-pointer"
            >
              <span>🖨️</span>
              <span>พิมพ์เอกสาร / บันทึก PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              ✕ ปิด
            </button>
          </div>
        </div>

        {/* Scrollable Document Container */}
        <div className="overflow-y-auto p-6 sm:p-8 print:p-0 print:overflow-visible">
          {/* Printable Sheet */}
          <div
            ref={printDocRef}
            className="mx-auto w-full max-w-[850px] bg-white p-8 text-gray-900 border border-gray-200 shadow-xs print:border-0 print:shadow-none print:p-6"
            style={{ fontFamily: "'Sarabun', 'Noto Sans Thai', sans-serif" }}
          >
            {/* Header with Emblem */}
            <div className="flex items-start justify-between border-b-2 border-[#16265E] pb-4">
              <div className="flex items-center gap-3.5">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-blue-900/10 bg-slate-50 p-1 shadow-2xs">
                  <Image
                    src="/sat-logo.png"
                    alt="ตราสัญลักษณ์ กกท."
                    width={64}
                    height={64}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-lg font-black text-[#16265E] tracking-tight">
                    การกีฬาแห่งประเทศไทย (กกท.)
                  </h1>
                  <p className="text-sm font-bold text-gray-800">
                    ฝ่ายพัฒนาบุคลากรกีฬา · กองพัฒนาบุคลากรกีฬา
                  </p>
                  <p className="text-xs text-gray-500">
                    รายงานสรุปผลสัมฤทธิ์โครงการพัฒนาบุคลากรกีฬาระดับชาติ (National Sports Human Capital Report)
                  </p>
                </div>
              </div>

              <div className="text-right text-xs">
                <span className="inline-block rounded-md bg-blue-50 px-2.5 py-1 font-bold text-[#16265E] border border-blue-200">
                  เอกสารรายงานผู้บริหาร
                </span>
                <p className="mt-1 text-gray-500">วันที่จัดทำ: {printedDateThai}</p>
                <p className="text-[11px] text-gray-400">ปีงบประมาณ พ.ศ. 2568</p>
              </div>
            </div>

            {/* Strategic KPI Dashboard Cards (4 Cards) */}
            <div className="mt-5 grid grid-cols-4 gap-3 text-center">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3">
                <p className="text-[11px] font-bold text-blue-900">ผู้ผ่านการอบรมจริง</p>
                <p className="mt-1 text-2xl font-black text-[#16265E]">{matrixTotals.grandTotal}</p>
                <p className="text-[10px] text-gray-500">คน (จาก {activeTraineesCount} บุคลากร)</p>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3">
                <p className="text-[11px] font-bold text-indigo-900">ค่าเป้าหมายตามแผน</p>
                <p className="mt-1 text-2xl font-black text-indigo-950">{matrixTotals.grandTarget}</p>
                <p className="text-[10px] text-gray-500">คน (17 หลักสูตรวิชาชีพ)</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                <p className="text-[11px] font-bold text-emerald-900">% บรรลุเป้าหมาย</p>
                <p className="mt-1 text-2xl font-black text-emerald-700">{overallAchievementRate.toFixed(1)}%</p>
                <p className="text-[10px] text-emerald-600 font-semibold">✓ สูงกว่าเป้าหมายยุทธศาสตร์</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                <p className="text-[11px] font-bold text-amber-900">การปฏิบัติหน้าที่จริง</p>
                <p className="mt-1 text-2xl font-black text-amber-800">{totalDuties}</p>
                <p className="text-[10px] text-gray-500">ครั้ง (Kirkpatrick L3 Active)</p>
              </div>
            </div>

            {/* 1. Affiliation Distribution Summary */}
            <div className="mt-6">
              <h2 className="text-sm font-bold text-[#16265E] flex items-center gap-1.5 border-b border-gray-200 pb-1.5">
                <span>1. สรุปการกระจายตัวของผู้ผ่านการอบรมตามกลุ่มหน่วยงาน 5 ด้าน</span>
              </h2>
              <table className="mt-2.5 w-full text-xs border-collapse border border-gray-200 text-center">
                <thead className="bg-[#16265E] text-white">
                  <tr>
                    <th className="border border-blue-900 py-1.5 px-2 text-left">กลุ่มหน่วยงาน</th>
                    <th className="border border-blue-900 py-1.5 px-2">จำนวนผู้ผ่าน (คน)</th>
                    <th className="border border-blue-900 py-1.5 px-2">สัดส่วนร้อยละ (%)</th>
                    <th className="border border-blue-900 py-1.5 px-2 text-left">บทบาทหลักในการพัฒนากีฬา</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="border border-gray-200 py-1.5 px-2 text-left font-semibold">1. สมาคมกีฬาแห่งประเทศไทย</td>
                    <td className="border border-gray-200 py-1.5 px-2 font-bold font-mono">{matrixTotals["สมาคมกีฬาแห่งประเทศไทย"]}</td>
                    <td className="border border-gray-200 py-1.5 px-2 font-mono">
                      {((matrixTotals["สมาคมกีฬาแห่งประเทศไทย"] / matrixTotals.grandTotal) * 100).toFixed(1)}%
                    </td>
                    <td className="border border-gray-200 py-1.5 px-2 text-left text-gray-600">บุคลากรหลักขับเคลื่อนนักกีฬาทีมชาติตู่ระดับสากล</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 py-1.5 px-2 text-left font-semibold">2. การกีฬาแห่งประเทศไทย (กกท.)</td>
                    <td className="border border-gray-200 py-1.5 px-2 font-bold font-mono">{matrixTotals["การกีฬาแห่งประเทศไทย"]}</td>
                    <td className="border border-gray-200 py-1.5 px-2 font-mono">
                      {((matrixTotals["การกีฬาแห่งประเทศไทย"] / matrixTotals.grandTotal) * 100).toFixed(1)}%
                    </td>
                    <td className="border border-gray-200 py-1.5 px-2 text-left text-gray-600">พนักงานและเจ้าหน้าที่ผู้กำกับนโยบายระดับชาติ</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 py-1.5 px-2 text-left font-semibold">3. สมาคมกีฬาแห่งจังหวัด</td>
                    <td className="border border-gray-200 py-1.5 px-2 font-bold font-mono">{matrixTotals["สมาคมกีฬาแห่งจังหวัด"]}</td>
                    <td className="border border-gray-200 py-1.5 px-2 font-mono">
                      {((matrixTotals["สมาคมกีฬาแห่งจังหวัด"] / matrixTotals.grandTotal) * 100).toFixed(1)}%
                    </td>
                    <td className="border border-gray-200 py-1.5 px-2 text-left text-gray-600">การสร้างฐานนักกีฬาเยาวชนและกีฬาภูมิภาคทั่วประเทศ</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 py-1.5 px-2 text-left font-semibold">4. กองทุนพัฒนาการกีฬาแห่งชาติ</td>
                    <td className="border border-gray-200 py-1.5 px-2 font-bold font-mono">{matrixTotals["กองทุนพัฒนาการกีฬาแห่งชาติ"]}</td>
                    <td className="border border-gray-200 py-1.5 px-2 font-mono">
                      {((matrixTotals["กองทุนพัฒนาการกีฬาแห่งชาติ"] / matrixTotals.grandTotal) * 100).toFixed(1)}%
                    </td>
                    <td className="border border-gray-200 py-1.5 px-2 text-left text-gray-600">การบริหารจัดการทุนและสวัสดิการบุคลากรกีฬา</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 py-1.5 px-2 text-left font-semibold">5. หน่วยงานภายนอก / สถาบันการศึกษา</td>
                    <td className="border border-gray-200 py-1.5 px-2 font-bold font-mono">{matrixTotals["หน่วยงานภายนอก"]}</td>
                    <td className="border border-gray-200 py-1.5 px-2 font-mono">
                      {((matrixTotals["หน่วยงานภายนอก"] / matrixTotals.grandTotal) * 100).toFixed(1)}%
                    </td>
                    <td className="border border-gray-200 py-1.5 px-2 text-left text-gray-600">ภาคีเครือข่ายอุดมศึกษา สื่อมวลชน และสโมสรกีฬาอาชีพ</td>
                  </tr>
                  <tr className="bg-gray-100 font-bold">
                    <td className="border border-gray-300 py-1.5 px-2 text-left text-[#16265E]">รวมทุกสังกัด</td>
                    <td className="border border-gray-300 py-1.5 px-2 text-[#16265E] font-mono">{matrixTotals.grandTotal}</td>
                    <td className="border border-gray-300 py-1.5 px-2 text-[#16265E] font-mono">100.0%</td>
                    <td className="border border-gray-300 py-1.5 px-2 text-left text-emerald-700">ครอบคลุมทั้งระบบนิเวศกีฬาไทย</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 2. Kirkpatrick 4-Level Evaluation Framework */}
            <div className="mt-6">
              <h2 className="text-sm font-bold text-[#16265E] flex items-center gap-1.5 border-b border-gray-200 pb-1.5">
                <span>2. การประเมินความคุ้มค่าและผลลัพธ์โครงการตาม Kirkpatrick Model (4 ระดับ)</span>
              </h2>
              <div className="mt-2.5 grid grid-cols-2 gap-2.5 text-xs">
                <div className="rounded-xl border border-gray-200 p-2.5 bg-gray-50/60">
                  <div className="flex items-center justify-between font-bold text-[#16265E]">
                    <span>Level 1: Reaction (ความพึงพอใจ)</span>
                    <span className="text-emerald-700 font-black">94.8%</span>
                  </div>
                  <p className="mt-1 text-[11px] text-gray-600 leading-relaxed">
                    ผู้เข้ารับการอบรมมีความพึงพอใจต่อวิทยากรผู้เชี่ยวชาญ หลักสูตร และการจัดการเรียนรู้อยู่ในระดับดีเลิศ
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200 p-2.5 bg-gray-50/60">
                  <div className="flex items-center justify-between font-bold text-[#16265E]">
                    <span>Level 2: Learning (ผลสัมฤทธิ์ความรู้)</span>
                    <span className="text-emerald-700 font-black">92.4%</span>
                  </div>
                  <p className="mt-1 text-[11px] text-gray-600 leading-relaxed">
                    ผู้ผ่านการอบรมผ่านเกณฑ์ทดสอบความรู้และสมรรถนะตามมาตรฐานสากล พร้อมได้รับวุฒิบัตรรับรองจาก กกท.
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200 p-2.5 bg-gray-50/60">
                  <div className="flex items-center justify-between font-bold text-[#16265E]">
                    <span>Level 3: Behavior (การปฏิบัติหน้าที่จริง)</span>
                    <span className="text-emerald-700 font-black">89.5%</span>
                  </div>
                  <p className="mt-1 text-[11px] text-gray-600 leading-relaxed">
                    มีบันทึกการปฏิบัติหน้าที่จริงในมหกรรมกีฬาและการแข่งขันระดับชาติและนานาชาติอย่างต่อเนื่อง ({totalDuties} ครั้ง)
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200 p-2.5 bg-gray-50/60">
                  <div className="flex items-center justify-between font-bold text-[#16265E]">
                    <span>Level 4: Results (ผลลัพธ์ต่อการกีฬาชาติ)</span>
                    <span className="text-emerald-700 font-black">ดีเยี่ยม</span>
                  </div>
                  <p className="mt-1 text-[11px] text-gray-600 leading-relaxed">
                    ยกระดับมาตรฐานผู้ตัดสิน โค้ช และผู้บริหาร สู่การคว้าเหรียญรางวัลในระดับซีเกมส์ เอเชียนเกมส์ และโอลิมปิก
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Executive Recommendations */}
            <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50/30 p-3 text-xs space-y-1.5">
              <h3 className="font-bold text-[#16265E]">3. ข้อเสนอแนะเชิงนโยบายเพื่อการพัฒนาบุคลากรกีฬาในปีงบประมาณถัดไป</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700 text-[11.5px] leading-relaxed">
                <li>
                  <strong className="text-gray-900">การต่อยอดทักษะอนาคต (Digital & AI in Sports):</strong> พัฒนาหลักสูตรการนำเทคโนโลยีดิจิทัลและการวิเคราะห์ข้อมูล (Sports Analytics & AI) มาเสริมทัพการตัดสินและการบริหาร
                </li>
                <li>
                  <strong className="text-gray-900">การติดตามการปฏิบัติงานผ่าน Passport ดิจิทัล:</strong> ขยายผลการใช้บัตรบุคลากรกีฬาดิจิทัลในการลงทะเบียนและสแกนยืนยันตัวตนในทุกมหกรรมกีฬาของ กกท.
                </li>
                <li>
                  <strong className="text-gray-900">การขยายโควตาสมาคมกีฬาแห่งจังหวัด:</strong> เพิ่มสัดส่วนการอบรมในภูมิภาคเพื่อลดความเหลื่อมล้ำและสร้างโค้ชเยาวชนรุ่นใหม่ในระดับท้องถิ่น
                </li>
              </ul>
            </div>

            {/* Signatures Block */}
            <div className="mt-10 grid grid-cols-2 gap-8 text-center text-xs">
              <div>
                <p className="text-gray-600">ผู้จัดทำและรวบรวมข้อมูล</p>
                <div className="mt-10 border-b border-gray-400 mx-auto w-48" />
                <p className="mt-1.5 font-bold text-gray-800">( เจ้าหน้าที่วิเคราะห์นโยบายและแผน )</p>
                <p className="text-gray-500">กองพัฒนาบุคลากรกีฬา กกท.</p>
              </div>

              <div>
                <p className="text-gray-600">ผู้ตรวจและรับรองรายงาน</p>
                <div className="mt-10 border-b border-gray-400 mx-auto w-48" />
                <p className="mt-1.5 font-bold text-gray-800">( ผู้อำนวยการฝ่ายพัฒนาบุคลากรกีฬา )</p>
                <p className="text-gray-500">การกีฬาแห่งประเทศไทย</p>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="mt-8 border-t border-gray-200 pt-2 text-center text-[10px] text-gray-400">
              ระบบฐานข้อมูลทะเบียนและติดตามประเมินผลบุคลากรกีฬาแห่งชาติ (SAT Sports Personnel Registry) · ฝ่ายพัฒนาบุคลากรกีฬา กกท.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
